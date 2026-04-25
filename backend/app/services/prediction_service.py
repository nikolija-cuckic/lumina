import json

import numpy as np
import torch

from backend.app.api.schemas import (
    CIBand,
    ParameterStats,
    PredictionResponse,
    Timepoint,
    TumorParameters,
)
from backend.inference import build_features, extract_volume_from_nifti
from model.inference.predict import predict_with_uncertainty

CI_LEVELS = [0.50, 0.70, 0.80, 0.90, 0.95]


class PredictionService:
    def __init__(self, model, demo_patients: dict = None):
        self.model = model
        self.demo_patients = demo_patients or {}

    async def predict_from_nifti(self, contents: bytes, history: list) -> PredictionResponse:
        volume = extract_volume_from_nifti(contents)
        history.append({"week": len(history) * 4, "volume": volume})
        return _run_prediction(history, self.model)

    def predict_from_history(self, history: list) -> PredictionResponse:
        return _run_prediction(history, self.model)


def _run_prediction(history: list[dict], model) -> PredictionResponse:
    """Core prediction logic — shared by all predict endpoints."""
    if len(history) < 2:
        raise ValueError("Potrebna su najmanje 2 merenja za predikciju.")

    times   = np.array([m["week"]   for m in history], dtype=np.float32)
    volumes = np.array([m["volume"] for m in history], dtype=np.float32)

    result = predict_with_uncertainty(model, times, volumes, n_samples=200)

    timepoints = [
        Timepoint(
            week=tp["week"],
            observed=tp.get("observed"),
            predicted_mean=tp["predicted_mean"],
            ci={k: CIBand(**v) for k, v in tp["ci"].items()},
        )
        for tp in result["timepoints"]
    ]

    p = result["parameters"]
    parameters = TumorParameters(
        alpha=ParameterStats(**p["alpha"]),
        K=ParameterStats(**p["K"]),
        beta=ParameterStats(**p["beta"]),
    )

    return PredictionResponse(
        timepoints=timepoints,
        parameters=parameters,
        traffic_light=result["traffic_light"],
        n_mc_samples=result["n_mc_samples"],
    )
