# ============================================================
# LIFESTYLE MODEL PREDICTOR
# Handles all lifestyle inference: feature engineering,
# pipeline prediction, isotonic calibration
# ============================================================

import json
import numpy as np
import joblib
import shap
import os

# ── Load all lifestyle artefacts once at startup ─────────────
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

def _path(filename):
    return os.path.join(MODELS_DIR, filename)
_pipeline       = joblib.load(_path("best_model_inference.joblib"))
_iso_calibrator = joblib.load(_path("iso_calibrator.joblib"))

with open(_path("clean_features.json")) as f:
    _clean_features = json.load(f)

with open(_path("normalisation_params.json")) as f:          # ← ADD
    _norm_params = json.load(f)                               # ← ADD
_life_ref = np.array(_norm_params["lifestyle_reference"],
                     dtype=float)

_shap_explainer = shap.TreeExplainer(_pipeline.named_steps["model"])                           # ← ADD
# ── Main prediction function ──────────────────────────────────
def predict_lifestyle(
    general_health: int,        # 1=Excellent, 2=Very Good, 3=Good,
                                # 4=Fair, 5=Poor
    bmi: float,
    high_bp: int,
    chol_check:     int,               # 0 or 1
    high_chol: int,            # 0 or 1
    smoker: int,                # 0 or 1
    phys_activity: int,         # 0 or 1
    fruits: float,              # servings per day
    veggies: float,             # servings per day
    hvy_alcohol: int,           # 0 or 1
    ment_hlth: int,             # days per month (0-30)
    phys_hlth: int,             # days per month (0-30)
    diff_walk: int,             # 0 or 1
    any_healthcare: int,        # 0 or 1
    no_doc_cost: int,           # 0 or 1
    heart_disease: int,         # 0 or 1
    stroke: int,                # 0 or 1
    sex: int,                   # 0=Female, 1=Male
    age: int,                   # age category 1-13 (CDC scale)
    education: int,             # 1-6
    income: int,                # 1-8
) -> dict:
    """
    Returns dict with:
        p_lifestyle     : calibrated probability (shown to user)
        feature_values  : dict of feature name -> value (for SHAP display)
        warnings        : list of warning strings
    """
    import pandas as pd
    warnings = []

    # ── Step 1: Compute engineered features ──────────────────
    # These must match training exactly
    health_behavior_score = float(fruits) + float(veggies) + float(phys_activity)
    comorbidity_count     = int(high_bp) + int(high_chol) + int(heart_disease) + int(stroke)
    stress_index          = int(ment_hlth) + int(phys_hlth)
    access_to_care_score  = int(any_healthcare) - int(no_doc_cost)
    inactive              = int(phys_activity == 0)
    lifestyle_risk_index  = int(hvy_alcohol) + int(smoker) + inactive

    # BMI category (cut at -1, 18.5, 25, 30, 1e6 → labels 0,1,2,3)
    if bmi <= 18.5:
        bmi_category = 0
    elif bmi <= 25:
        bmi_category = 1
    elif bmi <= 30:
        bmi_category = 2
    else:
        bmi_category = 3

    age_bmi_interaction  = float(age) * float(bmi)
    health_status_score  = (6 - int(general_health)) + int(phys_activity) + (1 - int(diff_walk))

    # ── Step 2: Build raw feature dict (before dropping redundant) ──
    raw_features = {
        "GenHlth":              general_health,
        "BMI":                  bmi,
        "HighBP":               high_bp,
        "HighChol":             high_chol,
        "Smoker":               smoker,
        "PhysActivity":         phys_activity,
        "Fruits":               fruits,
        "Veggies":              veggies,
        "HvyAlcoholConsump":    hvy_alcohol,
        "MentHlth":             ment_hlth,
        "PhysHlth":             phys_hlth,
        "DiffWalk":             diff_walk,
        "AnyHealthcare":        any_healthcare,
        "NoDocbcCost":          no_doc_cost,
        "HeartDiseaseorAttack": heart_disease,
        "Stroke":               stroke,
        "Sex":                  sex,
        "Age":                  age,
        "Education":            education,
        "Income":               income,
        # Engineered features
        "Health_Behavior_Score": health_behavior_score,
        "Comorbidity_Count":     comorbidity_count,
        "Stress_Index":          stress_index,
        "Access_to_Care_Score":  access_to_care_score,
        "Inactive":              inactive,
        "Lifestyle_Risk_Index":  lifestyle_risk_index,
        "BMI_Category":          bmi_category,
        "Age_BMI_Interaction":   age_bmi_interaction,
        "Health_Status_Score":   health_status_score,
        # CholCheck and other columns that may be in clean_features
        "CholCheck":              chol_check,   # assume checked (safe default)
    }

    # ── Step 3: Build DataFrame with exactly clean_features columns ──
    row = {}
    for feat in _clean_features:
        if feat in raw_features:
            row[feat] = raw_features[feat]
        else:
            row[feat] = 0
            warnings.append(f"Feature '{feat}' not supplied, defaulted to 0")

    df = pd.DataFrame([row])[_clean_features]

    # ── Step 4: Pipeline prediction (includes scaler + model) ────
    raw_prob   = float(_pipeline.predict_proba(df)[0, 1])

    # ── Step 5: Isotonic calibration ─────────────────────────
    p_lifestyle = float(_iso_calibrator.predict([raw_prob])[0])
    p_lifestyle = float(np.clip(p_lifestyle, 0.0, 1.0))

    # ── Step 6: Percentile-rank normalisation (fusion input only) ─
    # p_lifestyle_norm is NEVER shown to user — only used by fusion.py
    p_lifestyle_norm = float(np.mean(_life_ref <= p_lifestyle))

    # ── Step 7: SHAP values ───────────────────────────────────────
    sv       = _shap_explainer.shap_values(df)   # shape (1, 19)
    shap_row = sv[0]
    pairs    = sorted(zip(_clean_features, shap_row),
                      key=lambda x: abs(x[1]), reverse=True)[:10]
    shap_values = {feat: round(float(val), 4) for feat, val in pairs}
    # Feature values for SHAP display (clean, human-readable)
    feature_values = {
        "General Health":        general_health,
        "BMI":                   bmi,
        "High Blood Pressure":   high_bp,
        "High Cholesterol":      high_chol,
        "Smoker":                smoker,
        "Physical Activity":     phys_activity,
        "Fruit Intake":          fruits,
        "Vegetable Intake":      veggies,
        "Heavy Alcohol":         hvy_alcohol,
        "Mental Health Days":    ment_hlth,
        "Physical Health Days":  phys_hlth,
        "Difficulty Walking":    diff_walk,
        "Healthcare Access":     any_healthcare,
        "Cost Barrier to Care":  no_doc_cost,
        "Heart Disease":         heart_disease,
        "Stroke":                stroke,
        "Health Behavior Score": health_behavior_score,
        "Comorbidity Count":     comorbidity_count,
        "Lifestyle Risk Index":  lifestyle_risk_index,
    }

    return {
        "p_lifestyle":      p_lifestyle,
        "p_lifestyle_raw":  raw_prob,
        "p_lifestyle_norm": p_lifestyle_norm,
        "shap_values":      shap_values,
        "feature_values":   feature_values,
        "warnings":         warnings,
    }
