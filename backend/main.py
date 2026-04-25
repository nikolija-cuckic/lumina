
import os
import sys
import json
import numpy as np
import torch
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(str(Path(__file__).parent.parent))
#from models.bbinn import BBINN, predict_with_uncertainty
#from backend.inference import load_model, extract_volume_from_nifti, build_features
#from backend.schemas import (
#    PredictionResponse,
#    FeaturePredictRequest,
#    DemoPatient,
#    HealthResponse,
#)

# ─────────────────────────────────────────────────────────
# App setup
# ─────────────────────────────────────────────────────────

app = FastAPI(
    title="B-BINN Tumor Growth Predictor",
    description="Bayesian Biology-Informed Neural Network for tumor volume prediction.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once at startup — not per request
#MODEL: BBINN = None
DEMO_PATIENTS: dict = {}

@app.on_event("startup")
async def startup():
    global MODEL, DEMO_PATIENTS
    #MODEL = load_model(path="training/outputs/bbinn_model.pt")
    #DEMO_PATIENTS = _load_demo_patients()
