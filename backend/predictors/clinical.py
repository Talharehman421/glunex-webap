# ============================================================
# CLINICAL MODEL PREDICTOR
# Handles all clinical inference: feature engineering,
# text processing, scaling, XGBoost prediction, calibration
# ============================================================

import re
import json
import numpy as np
import joblib
import nltk
import shap
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# ── Load all clinical artefacts once at startup ──────────────
import os
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

def _path(filename):
    return os.path.join(MODELS_DIR, filename)

# Load models
_xgb_model      = joblib.load(_path("clinical_xgb_model.joblib"))
_iso_calibrator = joblib.load(_path("clinical_iso_calibrator.joblib"))
_tfidf          = joblib.load(_path("clinical_tfidf.joblib"))
_svd            = joblib.load(_path("clinical_svd.joblib"))
_scaler         = joblib.load(_path("clinical_scaler.joblib"))
_shap_explainer_clin = shap.TreeExplainer(_xgb_model)
# Load parameters
with open(_path("clinical_norm_params.json")) as f:
    _norm_params = json.load(f)

with open(_path("clinical_feature_order.json")) as f:
    _feature_order = json.load(f)

with open(_path("clinical_numerical_cols.json")) as f:
    _numerical_cols = json.load(f)

# NLTK setup
_lemmatizer = WordNetLemmatizer()
_stop_words = set(stopwords.words("english"))

# ── Text preprocessing (must match training exactly) ─────────
def _preprocess_text(text: str) -> str:
    text = text.lower()
    text = text.replace("htn", "hypertension")
    text = text.replace(" dm ", " diabetes mellitus ")
    text = text.replace("hba1c", "hbA1c")
    text = re.sub(r"[^a-zA-Z\s]", "", text)
    tokens = text.split()
    tokens = [_lemmatizer.lemmatize(t) for t in tokens
              if t not in _stop_words]
    return " ".join(tokens)

# ── Metabolic index (must match training exactly) ─────────────
def _compute_metabolic_index(hba1c: float, glucose: float) -> float:
    hba1c_min   = _norm_params["hba1c_min"]
    hba1c_max   = _norm_params["hba1c_max"]
    glucose_min = _norm_params["glucose_min"]
    glucose_max = _norm_params["glucose_max"]

    hba1c_norm   = (hba1c   - hba1c_min)   / (hba1c_max   - hba1c_min)
    glucose_norm = (glucose - glucose_min)  / (glucose_max - glucose_min)

    # Clip to [0,1] for safety (user values may be outside training range)
    hba1c_norm   = float(np.clip(hba1c_norm,   0.0, 1.0))
    glucose_norm = float(np.clip(glucose_norm, 0.0, 1.0))

    return 0.5 * hba1c_norm + 0.5 * glucose_norm

# ── BMI winsorisation (must match training exactly) ───────────
def _winsorise_bmi(bmi: float) -> float:
    return float(np.clip(bmi,
                         _norm_params["bmi_lower"],
                         _norm_params["bmi_upper"]))

def _winsorise_glucose(glucose: float) -> float:
    return float(np.clip(glucose,
                         _norm_params["glucose_lower"],
                         _norm_params["glucose_upper"]))

# ── Main prediction function ──────────────────────────────────
def predict_clinical(
    age: float,
    sex: str,               # 'Male', 'Female', 'Other'
    bmi: float,
    hba1c: float,
    blood_glucose: float,
    hypertension: int,      # 0 or 1
    heart_disease: int,     # 0 or 1
    smoking_history: str,   # 'never','former','current','ever',
                            # 'not current','No Info'
    clinical_notes: str = ""
) -> dict:
    """
    Returns dict with:
        p_clinical      : calibrated probability (shown to user)
        feature_values  : dict of feature name -> value (for SHAP display)
        warnings        : list of warning strings
    """
    warnings = []

    # ── Step 1: Winsorise ─────────────────────────────────────
    bmi           = _winsorise_bmi(bmi)
    blood_glucose = _winsorise_glucose(blood_glucose)

    # ── Step 2: Engineered features ──────────────────────────
    # Age group
    if age < 30:
        age_group = "young"
    elif age < 50:
        age_group = "middle"
    else:
        age_group = "senior"

    # BMI category
    if bmi < 18.5:
        bmi_cat = "underweight"
    elif bmi < 25:
        bmi_cat = "normal"
    elif bmi < 30:
        bmi_cat = "overweight"
    else:
        bmi_cat = "obese"

    comorbidity_count = int(hypertension) + int(heart_disease)
    metabolic_index   = _compute_metabolic_index(hba1c, blood_glucose)

    # ── Step 3: Build structured feature vector ───────────────
    structured = {
        "age":                   age,
        "bmi":                   bmi,
        "hbA1c_level":           hba1c,
        "blood_glucose_level":   blood_glucose,
        "hypertension":          int(hypertension),
        "heart_disease":         int(heart_disease),
        "comorbidity_count":     comorbidity_count,
        "metabolic_index":       metabolic_index,
        # Gender dummies
        "gender_Female":         int(sex == "Female"),
        "gender_Male":           int(sex == "Male"),
        "gender_Other":          int(sex == "Other"),
        # Smoking dummies
        "smoking_No Info":       int(smoking_history == "No Info"),
        "smoking_current":       int(smoking_history == "current"),
        "smoking_ever":          int(smoking_history == "ever"),
        "smoking_former":        int(smoking_history == "former"),
        "smoking_never":         int(smoking_history == "never"),
        "smoking_not current":   int(smoking_history == "not current"),
        # Age group dummies
        "age_group_young":       int(age_group == "young"),
        "age_group_middle":      int(age_group == "middle"),
        "age_group_senior":      int(age_group == "senior"),
        # BMI category dummies
        "bmi_cat_underweight":   int(bmi_cat == "underweight"),
        "bmi_cat_normal":        int(bmi_cat == "normal"),
        "bmi_cat_overweight":    int(bmi_cat == "overweight"),
        "bmi_cat_obese":         int(bmi_cat == "obese"),
    }

    # ── Step 4: Scale numerical features ─────────────────────
    import pandas as pd
    df_structured = pd.DataFrame([structured]).astype(float)

    # Scale only the numerical columns
    num_indices = [list(df_structured.columns).index(c)
                   for c in _numerical_cols
                   if c in df_structured.columns]
    scaled = _scaler.transform(df_structured.iloc[:, num_indices])
    df_structured.iloc[:, num_indices] = scaled

    # ── Step 5: Process clinical notes ───────────────────────
    notes_clean  = _preprocess_text(clinical_notes if clinical_notes else "")
    tfidf_matrix = _tfidf.transform([notes_clean])
    svd_features = _svd.transform(tfidf_matrix)

    svd_cols = [f"text_svd_{i}" for i in range(svd_features.shape[1])]
    df_svd   = pd.DataFrame(svd_features, columns=svd_cols)

    # ── Step 6: Combine and reorder to match training ─────────
    df_combined = pd.concat(
        [df_structured.reset_index(drop=True),
         df_svd.reset_index(drop=True)],
        axis=1
    )

    # Reorder columns exactly as training
    missing_cols = [c for c in _feature_order
                    if c not in df_combined.columns]
    if missing_cols:
        warnings.append(f"Missing features filled with 0: {missing_cols}")
        for c in missing_cols:
            df_combined[c] = 0.0

    df_final = df_combined[_feature_order]

    # ── Step 7: XGBoost prediction ────────────────────────────
    raw_prob = float(_xgb_model.predict_proba(df_final)[0, 1])

    # ── Step 8: Isotonic calibration ─────────────────────────
    p_clinical = float(_iso_calibrator.predict([raw_prob])[0])
    p_clinical = float(np.clip(p_clinical, 0.0, 1.0))

    # ── Step 9: SHAP values ───────────────────────────────────
    sv       = _shap_explainer_clin.shap_values(df_final)  # shape (1, 54)
    shap_row = sv[0]

    # Split into structured features and text_svd features
    text_cols  = [c for c in _feature_order if c.startswith("text_svd_")]
    other_cols = [c for c in _feature_order if not c.startswith("text_svd_")]

    # Map each structured feature to its SHAP value
    shap_dict = {}
    for feat in other_cols:
        idx = _feature_order.index(feat)
        shap_dict[feat] = round(float(shap_row[idx]), 4)

    # Sum all 30 text_svd SHAP values into one "Clinical Notes" bar
    text_indices = [_feature_order.index(c) for c in text_cols]
    shap_dict["Clinical Notes"] = round(
        float(sum(shap_row[i] for i in text_indices)), 4
    )

    # Return top 10 by absolute SHAP value
    shap_values = dict(
        sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)[:10]
    )

    return {
        "p_clinical":     p_clinical,
        "p_clinical_raw": raw_prob,
        "shap_values":    shap_values,
        "feature_values": structured,
        "warnings":       warnings,
    }





