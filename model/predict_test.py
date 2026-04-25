from inference.predict import load_model, predict_with_uncertainty, save_predictions_csv
import numpy as np

CONFIG = {"hidden_size": 32, "dropout_p": 0.1}

model  = load_model("outputs/models/model.pt", config=CONFIG)
device = next(model.parameters()).device.type

times   = np.array([0., 3., 21., 37., 47.])
volumes = np.array([1.0, 2.15, 0.34, 1.46, 1.68])

result = predict_with_uncertainty(model, times, volumes, n_samples=100, device=device)
save_predictions_csv(result, patient_id="Patient-042")