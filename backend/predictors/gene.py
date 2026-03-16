# ============================================================
# GENE EXPRESSION PREDICTOR
# Handles: CSV parsing, eigengene computation via PCA,
# scaling, XGBoost prediction, Platt calibration,
# percentile-rank normalisation for fusion
# ============================================================

import json
import numpy as np
import pandas as pd
import xgboost as xgb
import shap
from sklearn.decomposition import PCA
import os
import warnings

# ── Load all gene artefacts once at startup ──────────────────
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

def _path(filename):
    return os.path.join(MODELS_DIR, filename)

# Load scaler parameters
with open(_path("final_xgb_scaler_params.json")) as f:
    _scaler_params = json.load(f)

# Load Platt calibration parameters
with open(_path("platt_calibration_params.json")) as f:
    _platt = json.load(f)

# Load normalisation reference
with open(_path("normalisation_params.json")) as f:
    _norm_params = json.load(f)
_gene_reference = np.array(_norm_params["gene_reference"])

# Load gene module assignments
_module_assignments = pd.read_csv(_path("gene_module_assignments.csv"))
# Ensure correct column names
assert "Gene" in _module_assignments.columns or "gene_id" in _module_assignments.columns, \
    "gene_module_assignments.csv must have 'Gene' or 'gene_id' column"

# Normalise column names
if "Gene" in _module_assignments.columns:
    _module_assignments = _module_assignments.rename(
        columns={"Gene": "gene_id", "Module": "module_color"}
    )

# Load XGBoost model
_xgb_model = xgb.Booster()
_xgb_model.load_model(_path("final_xgb_model.json"))


# Feature order and scaling params
_feature_order = _scaler_params["feature_order"]
_means = np.array([_scaler_params["means"][me] for me in _feature_order])
_sds   = np.array([_scaler_params["sds"][me]   for me in _feature_order])
_shap_explainer_gene = shap.TreeExplainer(_xgb_model)

# ── Compute eigengene for one module ─────────────────────────
def _compute_eigengene(user_expr: pd.Series,
                       module_genes: list,
                       min_coverage: float = 0.70) -> tuple:
    """
    Returns (eigengene_value, coverage_fraction, warning_string_or_None)
    user_expr: pandas Series indexed by gene names, values = expression
    """
    present = [g for g in module_genes if g in user_expr.index]
    coverage = len(present) / len(module_genes) if module_genes else 0.0
    warning = None

    if coverage < min_coverage:
        warning = (f"Only {coverage*100:.0f}% of module genes present "
                   f"({len(present)}/{len(module_genes)})")
        if present:
            eigengene = float(user_expr.loc[present].mean())
        else:
            eigengene = 0.0
        return eigengene, coverage, warning

    # Enough genes present — compute first principal component
    expr_matrix = user_expr.loc[present].values.reshape(1, -1)  # (1, n_genes)

    if expr_matrix.shape[1] == 1:
        eigengene = float(expr_matrix[0, 0])
    else:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            pca = PCA(n_components=1)
            me_val = float(pca.fit_transform(expr_matrix.T)[0, 0])

        # Sign alignment: ME should correlate positively with mean expression
        mean_expr = float(user_expr.loc[present].mean())
        if me_val * mean_expr < 0:
            me_val *= -1
        eigengene = me_val

    return eigengene, coverage, warning

# ── Main prediction function ──────────────────────────────────
def predict_gene(
    uploaded_file_path: str,
    min_coverage: float = 0.70
) -> dict:
    """
    Full pipeline: gene expression CSV file → p_gene ready for fusion.

    Parameters
    ----------
    uploaded_file_path : path to user's CSV (rows=genes, col=sample)
    min_coverage       : minimum fraction of module genes required

    Returns
    -------
    dict with keys:
        p_gene          : Platt-calibrated probability (shown to user)
        p_gene_raw      : raw XGBoost output (uncalibrated)
        p_gene_norm     : percentile-normalised (fusion input only)
        coverage_report : dict of {module: coverage_fraction}
        coverage_warnings : list of warning strings
        error           : None or error message string
    """

    # ── Step 1: Load and validate CSV ────────────────────────
    try:
        user_expr_df = pd.read_csv(uploaded_file_path, index_col=0)
    except Exception as e:
        return {"error": f"Could not read CSV file: {str(e)}"}

    if user_expr_df.shape[1] == 0:
        return {"error": "CSV file has no sample columns after reading gene names as index."}

    # Take first sample column if multiple
    if user_expr_df.shape[1] > 1:
        user_expr_df = user_expr_df.iloc[:, [0]]

    # Convert to Series (gene -> expression value)
    user_expr = user_expr_df.iloc[:, 0].astype(float)

    if len(user_expr) < 10:
        return {"error": f"Only {len(user_expr)} genes found. File may not be formatted correctly."}

    # ── Step 2: Compute eigengenes for all 8 modules ─────────
    eigengenes       = {}
    coverage_report  = {}
    coverage_warnings = []

    for me_name in _feature_order:
        color = me_name.replace("ME", "")

        member_genes = _module_assignments[
            _module_assignments["module_color"] == color
        ]["gene_id"].tolist()

        if not member_genes:
            eigengenes[me_name]      = 0.0
            coverage_report[me_name] = 0.0
            coverage_warnings.append(f"{me_name}: no genes found in module assignments")
            continue

        eigengene, coverage, warning = _compute_eigengene(
            user_expr, member_genes, min_coverage
        )

        eigengenes[me_name]      = eigengene
        coverage_report[me_name] = round(coverage, 4)

        if warning:
            coverage_warnings.append(f"{me_name}: {warning}")

    # ── Step 3: Scale eigengenes ──────────────────────────────
    me_vector = np.array([eigengenes[me] for me in _feature_order])
    me_scaled = (me_vector - _means) / _sds

    # ── Step 4: XGBoost prediction ────────────────────────────
    dmat     = xgb.DMatrix(
        me_scaled.reshape(1, -1),
        feature_names=_feature_order
    )
    p_gene_raw = float(_xgb_model.predict(dmat)[0])

    # ── Step 5: Platt calibration ─────────────────────────────
    logit_cal = _platt["intercept"] + _platt["slope"] * p_gene_raw
    p_gene    = float(1.0 / (1.0 + np.exp(-logit_cal)))
    p_gene    = float(np.clip(p_gene, 0.0, 1.0))

    # ── Step 6: Percentile-rank normalise for fusion ──────────
    # ONLY used internally for fusion — never displayed to user
    p_gene_norm = float(np.mean(_gene_reference <= p_gene))

    # ── Step 7: SHAP values (all 8 eigengenes) ────────────────
    sv       = _shap_explainer_gene.shap_values(dmat)  # shape (1, 8)
    shap_row = sv[0]
    shap_values = dict(
        sorted(
            zip(_feature_order, [round(float(v), 4) for v in shap_row]),
            key=lambda x: abs(x[1]), reverse=True
        )
    )

    return {
        "p_gene":             p_gene,
        "p_gene_raw":         p_gene_raw,
        "p_gene_norm":        p_gene_norm,
        "shap_values":        shap_values,
        "coverage_report":    coverage_report,
        "coverage_warnings":  coverage_warnings,
        "error":              None,
    }
