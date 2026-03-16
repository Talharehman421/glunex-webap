# ============================================================
# MAIN FASTAPI APPLICATION
# T2D Risk Prediction API
# ============================================================

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import tempfile
import os

from predictors.clinical  import predict_clinical
from predictors.lifestyle import predict_lifestyle
from predictors.gene      import predict_gene
from predictors.fusion    import predict_fusion

app = FastAPI(
    title       = "T2D Risk Prediction API",
    description = "Multimodal Type 2 Diabetes risk prediction using late fusion",
    version     = "1.0.0"
)

# Allow React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:3000"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Input schemas ─────────────────────────────────────────────

class ClinicalInput(BaseModel):
    age             : float = Field(..., ge=0, le=120)
    sex             : str
    bmi             : float = Field(..., ge=10, le=80)
    hba1c           : float = Field(..., ge=3, le=20)
    blood_glucose   : float = Field(..., ge=50, le=500)
    hypertension    : int   = Field(..., ge=0, le=1)
    heart_disease   : int   = Field(..., ge=0, le=1)
    smoking_history : str
    clinical_notes  : Optional[str] = ""

class LifestyleInput(BaseModel):
    chol_check     : int   = Field(..., ge=0, le=1)
    general_health : int   = Field(..., ge=1, le=5)
    bmi            : float = Field(..., ge=10, le=80)
    high_bp        : int   = Field(..., ge=0, le=1)
    high_chol      : int   = Field(..., ge=0, le=1)
    smoker         : int   = Field(..., ge=0, le=1)
    phys_activity  : int   = Field(..., ge=0, le=1)
    fruits         : float = Field(..., ge=0, le=1)
    veggies        : float = Field(..., ge=0, le=1)
    hvy_alcohol    : int   = Field(..., ge=0, le=1)
    ment_hlth      : int   = Field(..., ge=0, le=30)
    phys_hlth      : int   = Field(..., ge=0, le=30)
    diff_walk      : int   = Field(..., ge=0, le=1)
    any_healthcare : int   = Field(..., ge=0, le=1)
    no_doc_cost    : int   = Field(..., ge=0, le=1)
    heart_disease  : int   = Field(..., ge=0, le=1)
    stroke         : int   = Field(..., ge=0, le=1)
    sex            : int   = Field(..., ge=0, le=1)
    age            : int   = Field(..., ge=1, le=13)
    education      : int   = Field(..., ge=1, le=6)
    income         : int   = Field(..., ge=1, le=8)

class PredictRequest(BaseModel):
    clinical  : Optional[ClinicalInput]  = None
    lifestyle : Optional[LifestyleInput] = None

# ── Health check ──────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "T2D Risk Prediction API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}

# ── Main prediction endpoint (clinical + lifestyle) ───────────

@app.post("/predict")
def predict(req: PredictRequest):
    if req.clinical is None and req.lifestyle is None:
        raise HTTPException(
            status_code = 400,
            detail      = "At least one of clinical or lifestyle data must be provided."
        )

    p_clinical  = None
    p_lifestyle = None
    clinical_details  = None
    lifestyle_details = None

    if req.clinical is not None:
        c = req.clinical
        result = predict_clinical(
            age             = c.age,
            sex             = c.sex,
            bmi             = c.bmi,
            hba1c           = c.hba1c,
            blood_glucose   = c.blood_glucose,
            hypertension    = c.hypertension,
            heart_disease   = c.heart_disease,
            smoking_history = c.smoking_history,
            clinical_notes  = c.clinical_notes or "",
        )
        p_clinical       = result["p_clinical"]
        clinical_details = result

    if req.lifestyle is not None:
        l = req.lifestyle
        result = predict_lifestyle(
            chol_check     = l.chol_check,
            general_health = l.general_health,
            bmi            = l.bmi,
            high_bp        = l.high_bp,
            high_chol      = l.high_chol,
            smoker         = l.smoker,
            phys_activity  = l.phys_activity,
            fruits         = l.fruits,
            veggies        = l.veggies,
            hvy_alcohol    = l.hvy_alcohol,
            ment_hlth      = l.ment_hlth,
            phys_hlth      = l.phys_hlth,
            diff_walk      = l.diff_walk,
            any_healthcare = l.any_healthcare,
            no_doc_cost    = l.no_doc_cost,
            heart_disease  = l.heart_disease,
            stroke         = l.stroke,
            sex            = l.sex,
            age            = l.age,
            education      = l.education,
            income         = l.income,
        )
        p_lifestyle       = result["p_lifestyle"]        # calibrated → fusion normalises internally   # norm value → fusion input
        lifestyle_details = result                        # keeps p_lifestyle for display

    fusion_result = predict_fusion(
        p_clinical  = p_clinical,
        p_lifestyle = p_lifestyle,
    )

    return {
        "p_final"          : fusion_result["p_final"],
        "risk_category"    : fusion_result["risk_category"],
        "variant_used"     : fusion_result["variant_used"],
        "normalised_scores": fusion_result["normalised_scores"],
        "clinical"         : clinical_details,
        "lifestyle"        : lifestyle_details,
        "gene"             : None,
    }

# ── Gene upload endpoint ──────────────────────────────────────

@app.post("/predict/gene")
async def predict_with_gene(
    file      : UploadFile = File(...),
    clinical  : Optional[str] = Form(None),
    lifestyle : Optional[str] = Form(None),
):
    # Validate file type
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code = 400,
            detail      = "Gene expression file must be a CSV."
        )

    # Save uploaded file to a temp location
    with tempfile.NamedTemporaryFile(
        delete = False,
        suffix = ".csv",
        mode   = "wb"
    ) as tmp:
        contents = await file.read()
        if len(contents) > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(
                status_code = 400,
                detail      = "File too large. Maximum size is 50MB."
            )
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        gene_result = predict_gene(tmp_path)
    finally:
        os.unlink(tmp_path)

    if gene_result["error"]:
        raise HTTPException(
            status_code = 400,
            detail      = gene_result["error"]
        )

    # Parse optional clinical/lifestyle JSON strings
    import json
    p_clinical        = None
    p_lifestyle       = None
    clinical_details  = None
    lifestyle_details = None

    if clinical:
        c = ClinicalInput(**json.loads(clinical))
        result = predict_clinical(
            age             = c.age,
            sex             = c.sex,
            bmi             = c.bmi,
            hba1c           = c.hba1c,
            blood_glucose   = c.blood_glucose,
            hypertension    = c.hypertension,
            heart_disease   = c.heart_disease,
            smoking_history = c.smoking_history,
            clinical_notes  = c.clinical_notes or "",
        )
        p_clinical       = result["p_clinical"]
        clinical_details = result

    if lifestyle:
        l = LifestyleInput(**json.loads(lifestyle))
        result = predict_lifestyle(
            chol_check     = l.chol_check,
            general_health = l.general_health,
            bmi            = l.bmi,
            high_bp        = l.high_bp,
            high_chol      = l.high_chol,
            smoker         = l.smoker,
            phys_activity  = l.phys_activity,
            fruits         = l.fruits,
            veggies        = l.veggies,
            hvy_alcohol    = l.hvy_alcohol,
            ment_hlth      = l.ment_hlth,
            phys_hlth      = l.phys_hlth,
            diff_walk      = l.diff_walk,
            any_healthcare = l.any_healthcare,
            no_doc_cost    = l.no_doc_cost,
            heart_disease  = l.heart_disease,
            stroke         = l.stroke,
            sex            = l.sex,
            age            = l.age,
            education      = l.education,
            income         = l.income,
        )
        p_lifestyle       = result["p_lifestyle"]        # calibrated → fusion normalises internally  # norm value → fusion input
        lifestyle_details = result                        # keeps p_lifestyle for display
    fusion_result = predict_fusion(
        p_clinical  = p_clinical,
        p_lifestyle = p_lifestyle,
        p_gene      = gene_result["p_gene"],
    )

    return {
        "p_final"          : fusion_result["p_final"],
        "risk_category"    : fusion_result["risk_category"],
        "variant_used"     : fusion_result["variant_used"],
        "normalised_scores": fusion_result["normalised_scores"],
        "clinical"         : clinical_details,
        "lifestyle"        : lifestyle_details,
        "gene"             : gene_result,
    }



