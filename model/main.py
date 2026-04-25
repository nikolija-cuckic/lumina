import os
import pandas as pd
import torch

from training.trainer import train
from inference.predict import predict_all_patients
from utils.plot import plot_all_patients

CONFIG = {
    "hidden_size":            32,
    "dropout_p":              0.1,
    "biology_weight":         0.01,
    "lr":                     1e-3,
    "epochs":                 500,
    "early_stopping_patience": 50,
}

DATA_PATH  = "data/tumor_volumes_clean.csv"
MODEL_PATH = "outputs/models/model.pt"
LOG_PATH   = "outputs/logs/training_log.csv"
PLOT_DIR   = "outputs/plots"


def main():
    os.makedirs("outputs/models", exist_ok=True)
    os.makedirs("outputs/logs",   exist_ok=True)
    os.makedirs("outputs/plots",  exist_ok=True)

    # Ucitavanje podataka
    df       = pd.read_csv(DATA_PATH)
    patients = df["patient"].unique()
    print(f"Pacijenata: {len(patients)}")

    # Trening
    print("\n=== Trening ===\n")
    model, best_loss = train(
        df=df,
        patients=patients,
        config=CONFIG,
        save_path=MODEL_PATH,
        log_path=LOG_PATH,
    )

    # Ucitavamo najbolji model
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(device)
    model = BINN()
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    print(f"\nNajbolji model ucitan sa: {MODEL_PATH}")

    # MC Dropout predikcije
    print("\n=== Predikcije ===\n")
    results = predict_all_patients(
        model=model,
        df=df,
        patients=patients,
        n_samples=100,
    )

    # Plotovanje
    print("\n=== Plotovanje ===\n")
    plot_all_patients(results, save_dir=PLOT_DIR)

    print("\nGotovo!")


if __name__ == "__main__":
    main()