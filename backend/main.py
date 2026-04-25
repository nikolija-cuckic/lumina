import sys
import json
import numpy as np
import uvicorn
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(str(Path(__file__).parent.parent))

from model.models.bbinn import BBINN
from model.inference.predict import predict_with_uncertainty
from backend.inference import load_model, extract_volume_from_nifti, _load_demo_patients
from backend.app.api.schemas import (
    PredictionResponse,
    FeaturePredictRequest,
    HealthResponse,
)

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
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL: BBINN = None
DEMO_PATIENTS: dict = {}


@app.on_event("startup")
async def startup():
    global MODEL, DEMO_PATIENTS
    MODEL = load_model(path="model/outputs/models/bbinn_model.pt")
    DEMO_PATIENTS = _load_demo_patients()


# ─────────────────────────────────────────────────────────
# Shared prediction helper
# ─────────────────────────────────────────────────────────

def _predict(history: list[dict]) -> PredictionResponse:
    if len(history) < 2:
        raise ValueError("Potrebna su najmanje 2 merenja za predikciju.")
    times   = np.array([m["week"]   for m in history], dtype=np.float32)
    volumes = np.array([m["volume"] for m in history], dtype=np.float32)
    result  = predict_with_uncertainty(MODEL, times, volumes, n_samples=200)
    return PredictionResponse(**result)


# ─────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", model_loaded=MODEL is not None)


@app.post("/predict/features", response_model=PredictionResponse)
async def predict_features(req: FeaturePredictRequest):
    try:
        history = [{"week": m.week, "volume": m.volume} for m in req.measurements]
        return _predict(history)
    except ValueError as e:
        raise HTTPException(422, str(e))


@app.post("/predict/upload", response_model=PredictionResponse)
async def predict_upload(
    file: UploadFile = File(...),
    patient_history: str = "[]",
):
    if not file.filename.endswith((".nii", ".nii.gz")):
        raise HTTPException(400, "Prihvataju se samo .nii ili .nii.gz fajlovi.")
    try:
        contents = await file.read()
        volume   = extract_volume_from_nifti(contents)
        history  = json.loads(patient_history)
        history.append({"week": len(history) * 4, "volume": volume})
        return _predict(history)
    except (ValueError, json.JSONDecodeError) as e:
        raise HTTPException(422, str(e))


@app.get("/demo")
async def list_demo():
    return [
        {
            "patient_id":      pid,
            "n_measurements":  len(data["history"]),
            "max_week":        data["history"][-1]["week"],
            "initial_volume":  data["history"][0]["volume"],
        }
        for pid, data in DEMO_PATIENTS.items()
    ]


@app.get("/demo/{patient_id}", response_model=PredictionResponse)
async def get_demo(patient_id: str):
    if patient_id not in DEMO_PATIENTS:
        raise HTTPException(404, f"Demo pacijent '{patient_id}' nije pronađen.")
    try:
        return _predict(DEMO_PATIENTS[patient_id]["history"])
    except ValueError as e:
        raise HTTPException(422, str(e))


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8001, reload=True)
