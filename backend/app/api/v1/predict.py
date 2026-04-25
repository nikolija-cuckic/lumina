import json
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from backend.app.api.schemas import PredictionResponse
from backend.app.container import get_prediction_service
from backend.app.services.prediction_service import PredictionService

router = APIRouter(prefix="/predict", tags=["predict"])



@router.post("/upload", response_model=PredictionResponse)
async def predict_from_upload(
    file: Annotated[UploadFile, File(...)],
    patient_history: str = "[]",
    svc: PredictionService = Depends(get_prediction_service),
):
    if not file.filename.endswith((".nii", ".nii.gz")):
        raise HTTPException(400, "Only .nii or .nii.gz files accepted")
    try:
        history = json.loads(patient_history)
        contents = await file.read()
        return await svc.predict_from_nifti(contents, history)
    except ValueError as e:
        raise HTTPException(422, str(e))