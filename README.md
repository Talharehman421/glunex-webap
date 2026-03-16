# Glunex — Multimodal Type 2 Diabetes Risk Prediction Webapp

> **MSc Thesis Project** · Late Fusion Machine Learning System · FastAPI + React · Deployed on Render

[![Live Demo](https://img.shields.io/badge/Live%20Demo-glunex--frontend.onrender.com-blue)](https://glunex-frontend.onrender.com)
[![API Docs](https://img.shields.io/badge/API%20Docs-glunex--api.onrender.com%2Fdocs-green)](https://glunex-api.onrender.com/docs)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/Frontend-React-61DAFB)](https://reactjs.org/)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Live Demo](#live-demo)
- [System Architecture](#system-architecture)
- [The Three ML Models](#the-three-ml-models)
- [Late Fusion Strategy](#late-fusion-strategy)
- [Performance Summary](#performance-summary)
- [Repository Structure](#repository-structure)
- [Tech Stack](#tech-stack)
- [Local Development Setup](#local-development-setup)
- [API Reference](#api-reference)
- [Frontend Pages](#frontend-pages)
- [Model Files](#model-files)
- [Deployment](#deployment)
- [Scientific Caveats](#scientific-caveats)
- [About the Developer](#about-the-developer)

---

## Project Overview

Glunex is an MSc thesis web application that predicts **Type 2 Diabetes (T2D) risk** using a **late fusion multimodal machine learning system**. Three completely independent ML models — each trained on a different dataset — produce their own probability scores. These are then combined by a Logistic Regression meta-model (fusion layer) into a single final risk score.

The system supports four input scenarios. Users provide whatever data they have (clinical records, lifestyle survey answers, or gene expression data), and the app automatically selects the correct fusion variant.

> **Disclaimer:** This is a research tool only. It is NOT a medical diagnostic device and should not be used for clinical decision-making.

---

## Live Demo

| Service | URL |
|---|---|
| Frontend | https://glunex-frontend.onrender.com |
| Backend API | https://glunex-api.onrender.com |
| API Documentation (Swagger) | https://glunex-api.onrender.com/docs |

> **Note:** The app is hosted on Render's free tier. The backend may take **30–60 seconds** to respond on first load after a period of inactivity (cold start). Open the API URL first to wake the backend before using the app.

---

## System Architecture

```
User Browser
     │
     ▼
React Frontend (glunex-frontend.onrender.com)
     │  POST /predict or POST /predict/gene
     ▼
FastAPI Backend (glunex-api.onrender.com)
     │
     ├── Clinical Predictor (XGBoost + Isotonic Calibration)
     ├── Lifestyle Predictor (LightGBM + Isotonic Calibration)
     ├── Gene Expression Predictor (XGBoost + Platt Scaling)
     │
     └── Fusion Layer (Logistic Regression meta-model)
              │
              ▼
         Final Risk Score + SHAP Explanations
```

---

## The Three ML Models

| Model | Dataset | Algorithm | AUC |
|---|---|---|---|
| Clinical | EHR data — 99,986 patients. Features: age, BMI, HbA1c, blood glucose, hypertension, heart disease, smoking, clinical notes (TF-IDF + SVD) | XGBoost + Isotonic Calibration | 0.9754 |
| Lifestyle | CDC BRFSS survey — 253,680 respondents. Features: diet, exercise, smoking, alcohol, mental/physical health, healthcare access | LightGBM + Isotonic Calibration | 0.8241 |
| Gene Expression | Blood RNA-seq — 116 samples. Features: 8 WGCNA module eigengenes computed from uploaded gene expression CSV | XGBoost + Platt Scaling | 0.7679 |

---

## Late Fusion Strategy

Late fusion was chosen because no single real patient exists in all three datasets simultaneously. Each model is trained independently on its own dataset. Only the final probability outputs are combined — analogous to three specialist doctors each giving an independent opinion, then a consultant combining them.

The fusion meta-model is a Logistic Regression trained on synthetic patients constructed by sampling from probability pools.

**SHAP attribution of each modality to the final prediction:**
- Clinical: 62.7%
- Lifestyle: 22.4%
- Gene Expression: 14.9%

### Four Input Scenarios

| Available Data | Fusion Variant |
|---|---|
| Clinical + Lifestyle + Gene | `fusion_all3.joblib` — meta-model with 3 inputs |
| Clinical + Lifestyle | `fusion_clin_life.joblib` — meta-model with 2 inputs |
| Clinical only | Passthrough — returns `p_clinical` directly |
| Lifestyle only | Passthrough — returns `p_lifestyle` directly |

---

## Performance Summary

| Metric | Value |
|---|---|
| Fusion Meta-Model AUC | 0.9897 |
| Average Precision | 0.9537 |
| Brier Score | 0.0272 (8.8× better than weighted average baseline) |
| AUC improvement over clinical alone | +0.0138 |
| Sensitivity analysis (5 seeds) | Std = 0.0006 — excellent stability |

---

## Repository Structure

```
glunex-webap/
├── backend/
│   ├── main.py                    ← FastAPI app + all API endpoints
│   ├── predictors/
│   │   ├── __init__.py
│   │   ├── clinical.py            ← Clinical inference pipeline
│   │   ├── lifestyle.py           ← Lifestyle inference pipeline
│   │   ├── gene.py                ← Gene expression + eigengene PCA pipeline
│   │   └── fusion.py              ← Fusion variant selection + meta-model
│   ├── models/                    ← All 19 trained model files (joblib/json/csv)
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx                ← Routing (4 pages)
│   │   ├── api.js                 ← API base URL config
│   │   ├── pages/
│   │   │   ├── Home.jsx + Home.css
│   │   │   ├── Assess.jsx + Assess.css
│   │   │   ├── Results.jsx + Results.css
│   │   │   └── About.jsx + About.css
│   │   └── components/
│   │       ├── Navbar.jsx + Navbar.css
│   └── package.json
│
└── README.md
```

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| FastAPI (Python) | REST API with auto-generated Swagger docs, Pydantic validation |
| XGBoost 2.1.1 | Clinical and Gene Expression model inference |
| LightGBM 4.5.0 | Lifestyle model inference |
| scikit-learn 1.5.2 | Calibrators, fusion meta-model, scalers |
| SHAP 0.46.0 | Feature attribution explanations |
| NLTK 3.9.1 | Clinical notes text preprocessing |
| Docker | Containerised deployment |
| Python 3.11 | Runtime (in Docker) |

### Frontend
| Technology | Purpose |
|---|---|
| React | Component-based UI |
| React Router | Client-side routing |
| Recharts | SHAP bar charts and visualisations |
| CSS (custom) | All styling — no UI framework |
| Google Fonts | Playfair Display (headings) + DM Sans (body) |

---

## Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Talharehman421/glunex-webap.git
cd glunex-webap
```

### 2. Run the backend

```bash
cd backend
pip install -r requirements.txt
python -m nltk.downloader stopwords wordnet omw-1.4
uvicorn main:app --reload
```

Backend runs at: `http://127.0.0.1:8000`  
Swagger docs at: `http://127.0.0.1:8000/docs`

### 3. Run the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm start
```

Frontend opens automatically at: `http://localhost:3000`

> Both terminals must remain open while using the app.

---

## API Reference

### `POST /predict`

Run prediction using Clinical and/or Lifestyle data.

**Request body:**
```json
{
  "clinical": {
    "age": 45,
    "sex": "Male",
    "bmi": 28.5,
    "hba1c": 6.8,
    "blood_glucose": 125,
    "hypertension": 0,
    "heart_disease": 0,
    "smoking_history": "never",
    "clinical_notes": ""
  },
  "lifestyle": {
    "age": 9,
    "sex": 1,
    "bmi": 28.5,
    "general_health": 3,
    "high_bp": 0,
    "high_chol": 0,
    "chol_check": 1,
    "smoker": 0,
    "phys_activity": 1,
    "fruits": 1,
    "veggies": 1,
    "hvy_alcohol": 0,
    "ment_hlth": 2,
    "phys_hlth": 1,
    "diff_walk": 0,
    "any_healthcare": 1,
    "no_doc_cost": 0,
    "heart_disease": 0,
    "stroke": 0,
    "education": 5,
    "income": 6
  }
}
```

Both `clinical` and `lifestyle` are optional — pass whichever data is available.

### `POST /predict/gene`

Run prediction including gene expression data.

**Form data:**
- `file` — CSV file (rows = genes, columns = samples)
- `clinical` *(optional)* — JSON string of clinical data
- `lifestyle` *(optional)* — JSON string of lifestyle data

### `GET /health`

Health check endpoint. Returns `{"status": "T2D Risk Prediction API is running"}`.

---

## Frontend Pages

| Page | Route | Description |
|---|---|---|
| Home | `/` | Landing page with project overview, model cards, how-it-works steps, and fusion SHAP weight visualisation |
| Assessment | `/assess` | Multi-section form for Clinical, Lifestyle, and Gene Expression data with modality toggle chips |
| Results | `/results` | Risk gauge, per-modality probability cards, normalised percentile scores, SHAP bar charts |
| About | `/about` | Project background, methodology, and thesis context |

---

## Model Files

All 19 model files live in `backend/models/`. They are required for the backend to run.

### Clinical Model (8 files)
| File | Purpose |
|---|---|
| `clinical_xgb_model.joblib` | Trained XGBoost classifier |
| `clinical_iso_calibrator.joblib` | Isotonic regression calibrator |
| `clinical_tfidf.joblib` | Fitted TF-IDF vectoriser (max 1500 features, ngram 1–2) |
| `clinical_svd.joblib` | Fitted TruncatedSVD (30 components) |
| `clinical_scaler.joblib` | StandardScaler for 6 numerical features |
| `clinical_norm_params.json` | HbA1c/glucose min-max and winsorisation bounds from training |
| `clinical_feature_order.json` | Exact ordered list of all 54 feature names |
| `clinical_numerical_cols.json` | Names of the 6 numerical columns |

### Lifestyle Model (3 files)
| File | Purpose |
|---|---|
| `best_model_pipeline.joblib` | Full ImbPipeline: preprocessor + SMOTE + LightGBM |
| `iso_calibrator.joblib` | Isotonic calibrator for lifestyle probabilities |
| `clean_features.json` | Exact ordered feature list after redundant column removal |

### Gene Expression Model (4 files)
| File | Purpose |
|---|---|
| `final_xgb_model.json` | XGBoost model (exported from R), expects 8 scaled ME features |
| `final_xgb_scaler_params.json` | Feature order, means, and SDs for eigengene standardisation |
| `gene_module_assignments.csv` | Maps ~5,000 genes to their WGCNA module colour |
| `platt_calibration_params.json` | Intercept (−2.7031) and slope (5.0127) for Platt scaling |

### Fusion Model (4 files)
| File | Purpose |
|---|---|
| `fusion_all3.joblib` | Meta-model for Clinical + Lifestyle + Gene inputs |
| `fusion_clin_life.joblib` | Meta-model for Clinical + Lifestyle inputs |
| `fusion_config.json` | Variant selection logic, risk thresholds, feature orders |
| `normalisation_params.json` | Reference distributions for percentile-rank normalisation |

---

## Deployment

Both services are deployed on **Render** (free tier).

### Backend (Web Service)
- **Build:** Docker (`backend/Dockerfile`)
- **Start command:** `uvicorn main:app --host 0.0.0.0 --port 8000`
- **URL:** `https://glunex-api.onrender.com`

### Frontend (Static Site)
- **Build command:** `npm install && npm run build`
- **Publish directory:** `build`
- **Environment variable:** `REACT_APP_API_URL = https://glunex-api.onrender.com`
- **URL:** `https://glunex-frontend.onrender.com`

### Docker (Local)

To run the full app locally with Docker:

```bash
# Build and run backend
cd backend
docker build -t glunex-api .
docker run -p 8000:8000 glunex-api
```

---

## Scientific Caveats

**Minor data leakage in metabolic_index:** The metabolic index normalisation (min/max values) was computed on the full dataset before train/test split. As this feature is used only as an engineered input and not as the target, the impact on model evaluation is negligible.

**Synthetic meta-training:** The fusion meta-model AUC of 0.9897 was evaluated on synthetic test patients, not real patients with all three modalities simultaneously. No real patient in this project has clinical, lifestyle, and gene expression data at the same time. This is an inherent limitation of the multimodal late fusion approach.

**Gene expression sample size:** The gene model was trained on only 116 samples. The 95% CI for AUC from 116 samples is approximately ±0.09. The model contributes 14.9% SHAP attribution but should be interpreted cautiously until replicated on a larger cohort.

---

## About the Developer

**Talha Rehman**  
MSc Student  
Project: Multimodal Late Fusion for Type 2 Diabetes Risk Prediction  
GitHub: [Talharehman421](https://github.com/Talharehman421)

---

## About the Model Training Files

The Jupyter notebooks used to train all three ML models and the fusion meta-model are maintained in a **separate repository**:

> 📁 **[glunex-model-training](https://github.com/Talharehman421/glunex-model-training)** *(see below)*

This keeps the deployment repository clean and focused on the webapp code.

---

*Research tool only · Not a medical diagnostic device*