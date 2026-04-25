"""
backend/inference.py — Model loading and preprocessing utilities
================================================================
Separates inference logic from API routing.
"""

import io
import numpy as np
import nibabel as nib
import torch
from pathlib import Path

from models.bbinn import BBINN


VOXEL_TO_CM3 = 1e-3   # 1 mm³ = 0.001 cm³


def load_model(path: str) -> BBINN:
    """
    Load pretrained BBINN from disk.
    Called once at startup — model stays in memory.
    """
    if not Path(path).exists():
        raise FileNotFoundError(f"Model checkpoint not found: {path}")

    model = BBINN(dropout_p=0.3)
    state = torch.load(path, map_location="cpu")
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
