# ============================================================
# FUSION PREDICTOR
# Handles: variant selection, percentile-rank normalisation,
# meta-model prediction, risk categorisation
# ============================================================

import json
import numpy as np
import joblib
import os
import warnings

# ── Load fusion artefacts once at startup ────────────────────
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

def _path(filename):
    return os.path.join(MODELS_DIR, filename)

# Load config
with open(_path("fusion_config.json")) as f:
    _config = json.load(f)

# Load normalisation reference distributions
with open(_path("normalisation_params.json")) as f:
    _norm_params = json.load(f)

_clinical_reference  = np.array(_norm_params["clinical_reference"])
_lifestyle_reference = np.array(_norm_params["lifestyle_reference"])
_gene_reference      = np.array(_norm_params["gene_reference"])

# Load both fusion meta-models
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    _fusion_all3      = joblib.load(_path("fusion_all3.joblib"))
    _fusion_clin_life = joblib.load(_path("fusion_clin_life.joblib"))

# ── Percentile-rank normalisation ────────────────────────────
def _normalise(p: float, reference: np.ndarray) -> float:
    """Replace p with its percentile rank in the reference distribution."""
    return float(np.mean(reference <= p))

# ── Risk category ─────────────────────────────────────────────
def _get_risk_category(p_final: float) -> str:
    thresholds = _config["risk_thresholds"]
    if p_final < thresholds["moderate"][0]:
        return "LOW"
    elif p_final < thresholds["high"][0]:
        return "MODERATE"
    else:
        return "HIGH"

# ── Main fusion function ──────────────────────────────────────
def predict_fusion(
    p_clinical:  float = None,
    p_lifestyle: float = None,
    p_gene:      float = None,
    p_gene_norm: float = None,   # pre-computed in gene predictor
) -> dict:
    """
    Selects the correct fusion variant based on available modalities
    and returns the final fused risk score.

    Parameters
    ----------
    p_clinical   : calibrated clinical probability (or None)
    p_lifestyle  : calibrated lifestyle probability (or None)
    p_gene       : calibrated gene probability (or None)
    p_gene_norm  : pre-computed percentile-rank normalised gene prob

    Returns
    -------
    dict with keys:
        p_final          : final fused probability
        risk_category    : 'LOW', 'MODERATE', or 'HIGH'
        variant_used     : which fusion variant was selected
        modalities_used  : list of modality names used
        individual_scores: dict of modality -> calibrated probability
        normalised_scores: dict of modality -> normalised probability
                           (internal use, for transparency only)
        error            : None or error message
    """

    # ── Step 1: Determine which modalities are available ─────
    has_clinical  = p_clinical  is not None
    has_lifestyle = p_lifestyle is not None
    has_gene      = p_gene      is not None

    if not has_clinical and not has_lifestyle and not has_gene:
        return {"error": "No modality data provided. At least one is required."}

    # ── Step 2: Select fusion variant ────────────────────────
    selection = _config["selection_logic"]

    if has_clinical and has_lifestyle and has_gene:
        variant_key = "clinical+lifestyle+gene"
    elif has_clinical and has_lifestyle:
        variant_key = "clinical+lifestyle"
    elif has_clinical:
        variant_key = "clinical_only"
    else:
        variant_key = "lifestyle_only"

    variant_name = selection[variant_key]
    variant      = _config["variants"][variant_name]

    modalities_used = variant["modalities"]

    # ── Step 3: Individual scores (for display) ───────────────
    individual_scores = {}
    if has_clinical:
        individual_scores["clinical"]  = round(p_clinical,  4)
    if has_lifestyle:
        individual_scores["lifestyle"] = round(p_lifestyle, 4)
    if has_gene:
        individual_scores["gene"]      = round(p_gene,      4)

    # ── Step 4: Execute fusion variant ───────────────────────
    normalised_scores = {}

    if variant["type"] == "passthrough":
        # Return calibrated probability directly — NO normalisation
        if variant["passthrough_key"] == "p_clinical":
            p_final = float(p_clinical)
        else:
            p_final = float(p_lifestyle)

    elif variant["type"] == "meta_model":
        # Normalise each available probability
        if has_clinical:
            p_clin_norm = _normalise(p_clinical, _clinical_reference)
            normalised_scores["p_clinical_norm"] = round(p_clin_norm, 4)

        if has_lifestyle:
            p_life_norm = _normalise(p_lifestyle, _lifestyle_reference)
            normalised_scores["p_lifestyle_norm"] = round(p_life_norm, 4)

        if has_gene:
            # p_gene_norm already computed in gene predictor — reuse it
            if p_gene_norm is not None:
                p_gene_norm_val = p_gene_norm
            else:
                p_gene_norm_val = _normalise(p_gene, _gene_reference)
            normalised_scores["p_gene_norm"] = round(p_gene_norm_val, 4)

        # Assemble features in exact order the model expects
        feature_order = variant["feature_order"]
        features = []
        for feat in feature_order:
            if feat == "p_clinical_norm":
                features.append(p_clin_norm)
            elif feat == "p_lifestyle_norm":
                features.append(p_life_norm)
            elif feat == "p_gene_norm":
                features.append(p_gene_norm_val)

        # Select correct model
        if variant_name == "all_three":
            model = _fusion_all3
        else:
            model = _fusion_clin_life

        p_final = float(model.predict_proba([features])[0, 1])

    else:
        return {"error": f"Unknown variant type: {variant['type']}"}

    # Clip for safety
    p_final = float(np.clip(p_final, 0.0, 1.0))

    return {
        "p_final":           round(p_final, 4),
        "risk_category":     _get_risk_category(p_final),
        "variant_used":      variant_name,
        "modalities_used":   modalities_used,
        "individual_scores": individual_scores,
        "normalised_scores": normalised_scores,
        "error":             None,
    }
