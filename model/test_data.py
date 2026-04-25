# test_dataset.py
import pandas as pd
from dataset.dataset import get_patient_data

df = pd.read_csv("data/tumor_volumes_clean.csv")

t, V, features = get_patient_data(df, "Patient-002")

print("t:", t)
print("V:", V)
print("features:", features)
print("V[0] == 1.0:", V[0].item() == 1.0)