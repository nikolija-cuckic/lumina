import torch
import numpy as np
import pandas as pd

T_MAX = 255.0 #Globalni maksimum nedelja iz dataseta

def get_patient_data(df, patient_id):
    data = df[df["patient"] == patient_id].sort_values("week_normalized")

    t = torch.tensor(data["week_normalized"].values, dtype=torch.float32)
    V = torch.tensor(data["volume_normalized"].values, dtype=torch.float32)

    initial_volume = data["initial_volume"].iloc[0]
    n_measurements = len(data)
    max_week = data["week_normalized"].max()
    std_volume = data["volume_normalized"].std()

    features = torch.tensor([
        np.log1p(initial_volume),
        n_measurements / 20.0,
        max_week / T_MAX,
        std_volume,
    ], dtype=torch.float32)

    return t, V, features