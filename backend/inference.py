"""
backend/inference.py — Model loading and preprocessing utilities
================================================================
Separates inference logic from API routing.
"""

import io
import os
import numpy as np
import pandas as pd
import nibabel as nib
import torch
from pathlib import Path

from model.models.bbinn import BBINN


VOXEL_TO_CM3 = 1e-3   # 1 mm³ = 0.001 cm³

 
T_MAX        = 255.0       # globalni max nedelja u datasetu (iz dataset.py)
VOXEL_TO_CM3 = 1e-3        # 1 mm³ = 0.001 cm³
HIDDEN_SIZE  = 64
TRAIN_DROPOUT = 0.0        # treniran bez dropout-a
INFERENCE_DROPOUT = 0.1    # uključujemo samo za MC inference
 
CI_QUANTILES = {
    "50": (0.25,  0.75),
    "70": (0.15,  0.85),
    "80": (0.10,  0.90),
    "90": (0.05,  0.95),
    "95": (0.025, 0.975),
}

def load_model(path: str) -> BBINN:
    """
    Load pretrained BBINN from disk.
    Called once at startup — model stays in memory.
    """
    if not Path(path).exists():
        raise FileNotFoundError(f"Model checkpoint not found: {path}")

    model = BBINN(dropout_p=0.3)
    state = torch.load(path, map_location="cpu", weights_only=True)
    model.load_state_dict(state)
    model.eval()

    print(f"BBINN loaded from {path}")
    return model


def extract_volume_from_nifti(file_bytes: bytes) -> float:
    """
    Extract tumor volume (cm³) from a NIfTI segmentation mask.

    Replicates the logic in preprocessing/extract_volumes.py
    so the API pipeline is consistent with training data.

    Args:
        file_bytes: raw bytes of .nii or .nii.gz file

    Returns:
        Tumor volume in cm³

    Raises:
        ValueError if mask appears empty or invalid
    """
    # Load from bytes — nibabel can handle in-memory streams
    fh   = nib.FileHolder(fileobj=io.BytesIO(file_bytes))
    img  = nib.Nifti1Image.from_file_map({"header": fh, "image": fh})

    data   = img.get_fdata()
    header = img.header
    zooms  = header.get_zooms()[:3]    # voxel size in mm

    voxel_vol_mm3 = float(zooms[0] * zooms[1] * zooms[2])
    n_voxels      = int((data > 0).sum())

    if n_voxels == 0:
        raise ValueError("Segmentation mask appears empty — no tumor voxels found")

    volume_cm3 = n_voxels * voxel_vol_mm3 * VOXEL_TO_CM3

    if volume_cm3 > 500:
        raise ValueError(f"Extracted volume ({volume_cm3:.1f} cm³) seems unrealistic. Check mask.")

    return round(volume_cm3, 4)


def build_features(times: np.ndarray, volumes: np.ndarray) -> np.ndarray:
    """
    Build the 4-dimensional feature vector for a patient.
    Must match exactly what was used during training in bbinn_trainer.py.

    Args:
        times:   [T] array of week values
        volumes: [T] array of volume values (cm³)

    Returns:
        [4] float32 feature array
    """
    MAX_WEEK = 173.0   # max follow-up in LUMIERE — same constant as in trainer
    v0       = volumes[0]

    return np.array([
        1.0,                          # normalized initial volume (always 1.0)
        float(np.log(v0 + 1e-6)),    # log of actual initial volume
        len(times) / 20.0,            # sequence length, normalized
        float(times.max()) / MAX_WEEK,# follow-up duration, normalized
    ], dtype=np.float32)

def _load_demo_patients(
    csv_path: str = "model/data/tumor_volumes_clean.csv",
) -> dict:
    if not os.path.exists(csv_path):
        print(f"[WARN] Demo CSV nije pronadjen: {csv_path}")
        return {}

    df     = pd.read_csv(csv_path).sort_values(["patient", "week_normalized"])
    counts = df.groupby("patient")["week_normalized"].count()

    # Bira pacijente sa >= 4 merenja, sortira po broju merenja — više = bolji demo
    valid  = counts[counts >= 4].sort_values(ascending=False).index

    result = {}
    for pid in valid:
        group = df[df["patient"] == pid].sort_values("week_normalized")

        # Ako CSV ima originalne (nenormalizovane) kolone, koristimo njih za prikaz
        # Model je treniran na normalizovanim vrednostima (V/V0, week_normalized).
        # Mora se koristiti isti prostor pri inferenciji.
        week_col   = "week_normalized"   if "week_normalized"   in df.columns else "week"
        volume_col = "volume_normalized" if "volume_normalized" in df.columns else "volume_cm3"

        result[str(pid)] = {
            "history": [
                {
                    "week":   round(float(row[week_col]),   2),
                    "volume": round(float(row[volume_col]), 4),
                }
                for _, row in group.iterrows()
            ]
        }

    print(f"[OK] Ucitano {len(result)} demo pacijenata")
    return result

# ─────────────────────────────────────────────────────────
# 3. Priprema ulaza za model
# ─────────────────────────────────────────────────────────
 
def build_normalized_input(
    weeks_cm3: list[dict],
) -> tuple[torch.Tensor, torch.Tensor, np.ndarray, np.ndarray, float]:
    """
    Iz istorije merenja u cm³ priprema sve što model očekuje.
 
    Args:
        weeks_cm3: [{"week": float, "volume_cm3": float}, ...]
                   sortirano po nedeljama, prva tačka je baseline
 
    Returns:
        features:    [4] tensor — input za neuronsku mrežu
        t_norm:      [T] tensor — vremenske tačke za ODE solver
        weeks:       [T] np.array — originalne nedelje (za prikaz)
        volumes_cm3: [T] np.array — originalne zapremine u cm³
        v0_cm3:      float — početna zapremina (za denormalizaciju)
    """
    if len(weeks_cm3) < 2:
        raise ValueError("Potrebna su minimum 2 merenja za predikciju.")
 
    # Sortiraj hronološki — defensive
    sorted_history = sorted(weeks_cm3, key=lambda m: m["week"])
 
    weeks       = np.array([m["week"]       for m in sorted_history], dtype=np.float32)
    volumes_cm3 = np.array([m["volume_cm3"] for m in sorted_history], dtype=np.float32)
 
    if weeks[0] != 0:
        # Pomeri prvu nedelju na 0 ako nije već tu
        weeks = weeks - weeks[0]
 
    v0_cm3 = float(volumes_cm3[0])
    if v0_cm3 <= 0:
        raise ValueError("Početna zapremina mora biti pozitivna.")
 
    # Normalizovane vrednosti — V0 = 1.0, vreme skalirano isto kao u treningu
    volumes_norm = volumes_cm3 / v0_cm3
    n_meas       = len(weeks)
    max_week     = float(weeks.max())
    trend        = float(volumes_norm[-1] - volumes_norm[0]) / n_meas
 
    features = torch.tensor([
        np.log1p(v0_cm3),
        n_meas / 20.0,
        max_week / T_MAX,
        trend,
    ], dtype=torch.float32)
 
    # Skaliraj vreme — u treningu se koristi sirovo `week_normalized`,
    # ali ODE solver očekuje sortirane increasing tačke
    t_norm = torch.tensor(weeks, dtype=torch.float32)
 
    return features, t_norm, weeks, volumes_cm3, v0_cm3
 

# ─────────────────────────────────────────────────────────
# 4. Predikcija sa uncertainty
# ─────────────────────────────────────────────────────────
 
def predict_with_uncertainty(
    model:      BBINN,
    features:   torch.Tensor,
    t_span:     torch.Tensor,
    n_samples:  int = 100,
    inference_dropout_p: float = INFERENCE_DROPOUT,
) -> dict:
    """
    Pravi MC inference za jednog pacijenta.
 
    Strategija:
      1. Deterministic forward pass (dropout OFF) → mean predikcija
         Ovo je "prava" predikcija — model je naučio dobre individualne parametre
      2. MC sampling (dropout ON, p=0.1) → CI bendovi
         Mali dropout perturbuje naučene parametre da generišemo distribuciju
 
    Returns:
        dict sa svim sirovim numpy nizovima — denormalizacija dolazi posle
    """
    x = features.unsqueeze(0)   # [1, 4]
 
    # ── Korak 1: deterministic mean ──
    model.eval()
    with torch.no_grad():
        V_mean, alpha_det, K_det, beta_det = model(x, t_span)
    mean_traj = V_mean.cpu().numpy()    # normalizovane vrednosti, V0=1
 
    # ── Korak 2: MC sampling ──
    model.enable_dropout()
    # Override dropout probability — model je treniran sa 0.0
    for m in model.modules():
        if isinstance(m, torch.nn.Dropout):
            m.p = inference_dropout_p
 
    all_trajs  = []
    all_params = []
 
    for _ in range(n_samples):
        try:
            with torch.no_grad():
                V_pred, alpha, K, beta = model(x, t_span)
            all_trajs.append(V_pred.cpu().numpy())
            all_params.append([alpha.item(), K.item(), beta.item()])
        except Exception:
            continue
 
    # Vrati dropout na 0 da ne ostane uključen za sledeći request
    for m in model.modules():
        if isinstance(m, torch.nn.Dropout):
            m.p = TRAIN_DROPOUT
 
    if len(all_trajs) == 0:
        raise RuntimeError("Svi MC passovi su failovali.")
 
    all_trajs  = np.array(all_trajs)    # [n_valid, T]
    all_params = np.array(all_params)   # [n_valid, 3]
 
    return {
        "mean_traj":      mean_traj,
        "all_trajs":      all_trajs,
        "all_params":     all_params,
        "alpha_det":      alpha_det.item(),
        "K_det":          K_det.item(),
        "beta_det":       beta_det.item(),
    }
 
 
# ─────────────────────────────────────────────────────────
# 5. Denormalizacija + format za frontend
# ─────────────────────────────────────────────────────────
 
def _interpret_alpha(a):
    if a > 0.5: return "Visoka brzina rasta — agresivno ponašanje tumora"
    if a > 0.2: return "Umerena brzina rasta"
    return "Niska brzina rasta — sporo rastuć tumor"
 
def _interpret_beta(b):
    if b > 0.5: return "Jak efekat terapije — tumor dobro reaguje"
    if b > 0.2: return "Umeren odgovor na terapiju"
    return "Slab efekat terapije — razmotriti promenu tretmana"
 
def _traffic_light(alpha, beta):
    ratio = alpha / (beta + 1e-6)
    if ratio > 2.5: return "red"
    if ratio > 1.0: return "yellow"
    return "green"
 
 
def build_response(
    raw:         dict,
    weeks:       np.ndarray,
    volumes_cm3: np.ndarray,
    v0_cm3:      float,
) -> dict:
    """
    Uzima sirovi MC rezultat (u normalizovanim vrednostima) i pravi
    PredictionResponse dict sa denormalizovanim cm³ vrednostima.
    """
    mean_traj  = raw["mean_traj"]   # [T]
    all_trajs  = raw["all_trajs"]   # [n_valid, T]
    all_params = raw["all_params"]  # [n_valid, 3]
 
    # Denormalizacija — pomnoži sa v0 da vrati cm³
    mean_traj_cm3 = mean_traj * v0_cm3
    all_trajs_cm3 = all_trajs * v0_cm3
 
    # Parametri — α i β su skalarni (independent of v0)
    # K je u normalizovanim jedinicama → pomnoži sa v0 za cm³
    alpha_mean = float(all_params[:, 0].mean())
    K_mean     = float(all_params[:, 1].mean()) * v0_cm3
    beta_mean  = float(all_params[:, 2].mean())
 
    alpha_std  = float(all_params[:, 0].std())
    K_std      = float(all_params[:, 1].std()) * v0_cm3
    beta_std   = float(all_params[:, 2].std())
 
    # Timepoints sa svim CI nivoima
    timepoints = []
    for i, week in enumerate(weeks):
        ci_bands = {}
        for level, (q_lo, q_hi) in CI_QUANTILES.items():
            ci_bands[level] = {
                "lower": round(float(np.quantile(all_trajs_cm3[:, i], q_lo)), 4),
                "upper": round(float(np.quantile(all_trajs_cm3[:, i], q_hi)), 4),
            }
 
        timepoints.append({
            "week":           float(week),
            "observed":       round(float(volumes_cm3[i]), 4),
            "predicted_mean": round(float(mean_traj_cm3[i]), 4),
            "ci":             ci_bands,
        })
 
    return {
        "timepoints": timepoints,
        "parameters": {
            "alpha": {
                "mean":  round(alpha_mean, 4),
                "std":   round(alpha_std,  4),
                "label": "Brzina rasta",
                "interpretation": _interpret_alpha(alpha_mean),
            },
            "K": {
                "mean":  round(K_mean, 4),
                "std":   round(K_std,  4),
                "label": "Maksimalni kapacitet (cm³)",
                "interpretation": f"Tumor neće preći ~{K_mean:.1f} cm³ bez intervencije",
            },
            "beta": {
                "mean":  round(beta_mean, 4),
                "std":   round(beta_std,  4),
                "label": "Efekat terapije",
                "interpretation": _interpret_beta(beta_mean),
            },
        },
        "traffic_light": _traffic_light(alpha_mean, beta_mean),
        "n_mc_samples":  len(all_trajs),
    }
 
 
# ─────────────────────────────────────────────────────────
# 6. Glavni pipeline — sve zajedno
# ─────────────────────────────────────────────────────────
 
def predict_from_history(
    model:        BBINN,
    history_cm3:  list[dict],
    n_mc_samples: int = 100,
) -> dict:
    """
    Glavni entry point — sve od istorije merenja u cm³ do PredictionResponse.
 
    Args:
        model:        učitan BINN
        history_cm3:  [{"week": float, "volume_cm3": float}, ...]
        n_mc_samples: broj MC dropout passova
 
    Returns:
        PredictionResponse dict spreman za JSON serializaciju
    """
    features, t_span, weeks, volumes_cm3, v0_cm3 = build_normalized_input(history_cm3)
 
    raw = predict_with_uncertainty(
        model, features, t_span,
        n_samples=n_mc_samples,
    )
 
    return build_response(raw, weeks, volumes_cm3, v0_cm3)