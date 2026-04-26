"""
Pokreće predikciju za sve pacijente iz model/data/tumor_volumes_clean.csv
i čuva po pacijentu CSV u model/outputs/predictions/.

Pokretanje (iz roota projekta):
    .venv\\Scripts\\python.exe predict_all.py
"""
import numpy as np
import pandas as pd

from backend.inference import load_model
from model.inference.predict import predict_with_uncertainty, save_predictions_csv

CSV_PATH    = "model/data/tumor_volumes_clean.csv"
MODEL_PATH  = "model/outputs/models/bbinn_model.pt"
SAVE_DIR    = "model/outputs/predictions"
N_SAMPLES   = 200


def main():
    print(f"Ucitavam model: {MODEL_PATH}")
    model = load_model(MODEL_PATH)

    print(f"Ucitavam podatke: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH).sort_values(["patient", "week_normalized"])

    patients = df["patient"].unique()
    print(f"Pacijenata za predikciju: {len(patients)}\n")

    ok, fail = 0, 0
    for pid in patients:
        group = df[df["patient"] == pid].sort_values("week_normalized")
        times   = group["week_normalized"].to_numpy(dtype=np.float32)
        volumes = group["volume_normalized"].to_numpy(dtype=np.float32)

        if len(times) < 2:
            print(f"[SKIP] {pid}: manje od 2 merenja")
            continue

        try:
            result = predict_with_uncertainty(model, times, volumes, n_samples=N_SAMPLES)
            save_predictions_csv(result, patient_id=pid, save_dir=SAVE_DIR)
            ok += 1
        except Exception as e:
            print(f"[FAIL] {pid}: {e}")
            fail += 1

    print(f"\nGotovo. OK={ok}  FAIL={fail}  ukupno {len(patients)}")
    print(f"CSV-ovi u: {SAVE_DIR}/")


if __name__ == "__main__":
    main()
