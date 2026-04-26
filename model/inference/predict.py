import numpy as np
import torch
import pandas as pd
import os

from ..models.bbinn import BBINN


CI_QUANTILES = {
    50: (0.25,  0.75),
    70: (0.15,  0.85),
    80: (0.10,  0.90),
    90: (0.05,  0.95),
    95: (0.025, 0.975),
}


def load_model(model_path: str, config: dict) -> BBINN:
    """Ucitava istrenirani model sa diska."""
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

    model = BBINN(
        hidden_size=config["hidden_size"],
        dropout_p=config["dropout_p"],
    ).to(device)

    model.load_state_dict(torch.load(model_path, map_location=device))
    print(f"Model ucitan: {model_path}")

    return model


def build_features(times: np.ndarray, volumes: np.ndarray) -> np.ndarray:
    initial_volume = volumes[0]
    n_measurements = len(times)
    max_week       = times[-1]
    std_volume     = volumes.std() if len(volumes) > 1 else 0.0

    return np.array([
        np.log1p(initial_volume),
        n_measurements / 20.0,
        max_week / 255.0,
        std_volume,
    ], dtype=np.float32)


def _interpret_alpha(alpha_mean: float) -> str:
    if alpha_mean > 0.5:
        return "Visoka brzina rasta — agresivno ponašanje tumora"
    elif alpha_mean > 0.2:
        return "Umerena brzina rasta"
    else:
        return "Niska brzina rasta — sporo rastuć tumor"


def _interpret_beta(beta_mean: float) -> str:
    if beta_mean > 0.5:
        return "Jak efekat terapije — tumor dobro reaguje"
    elif beta_mean > 0.2:
        return "Umeren odgovor na terapiju"
    else:
        return "Slab efekat terapije — razmotriti promenu tretmana"


def _interpret_K(K_mean: float) -> str:
    return f"Tumor neće preći ~{K_mean:.1f} cm³ bez intervencije"


def _traffic_light(alpha_mean: float, beta_mean: float) -> str:
    ratio = alpha_mean / (beta_mean + 1e-6)
    if ratio > 2.5:
        return "red"
    elif ratio > 1.0:
        return "yellow"
    else:
        return "green"


def predict_with_uncertainty(
    model: BBINN,
    times: np.ndarray,
    volumes: np.ndarray,
    n_samples: int = 100,
    device: str = "cpu",
) -> dict:
    features = build_features(times, volumes)
    x        = torch.tensor(features, dtype=torch.float32).unsqueeze(0).to(device)
    t_span   = torch.tensor(times, dtype=torch.float32).to(device)

    model.eval()
    model.enable_dropout()

    all_trajs  = []
    all_alphas = []
    all_Ks     = []
    all_betas  = []

    with torch.no_grad():
        for _ in range(n_samples):
            try:
                V_pred, alpha, K, beta = model(x, t_span)

                all_trajs.append(V_pred.squeeze().cpu().numpy())
                all_alphas.append(alpha.item())
                all_Ks.append(K.item())
                all_betas.append(beta.item())

            except Exception:
                continue

    n_successful = len(all_trajs)
    all_trajs    = np.stack(all_trajs, axis=0)
    all_alphas   = np.array(all_alphas)
    all_Ks       = np.array(all_Ks)
    all_betas    = np.array(all_betas)

    V_mean     = all_trajs.mean(axis=0)
    alpha_mean = float(all_alphas.mean())
    alpha_std  = float(all_alphas.std())
    K_mean     = float(all_Ks.mean())
    K_std      = float(all_Ks.std())
    beta_mean  = float(all_betas.mean())
    beta_std   = float(all_betas.std())

    timepoints = []
    for i, week in enumerate(times):
        ci = {}
        for level, (q_low, q_high) in CI_QUANTILES.items():
            ci[str(level)] = {
                "lower": float(np.quantile(all_trajs[:, i], q_low)),
                "upper": float(np.quantile(all_trajs[:, i], q_high)),
            }

        timepoints.append({
            "week":           float(week),
            "observed":       float(volumes[i]),
            "predicted_mean": float(V_mean[i]),
            "ci":             ci,
        })

    return {
        "timepoints": timepoints,
        "parameters": {
            "alpha": {
                "mean":           alpha_mean,
                "std":            alpha_std,
                "label":          "Brzina rasta",
                "interpretation": _interpret_alpha(alpha_mean),
            },
            "K": {
                "mean":           K_mean,
                "std":            K_std,
                "label":          "Maksimalni kapacitet",
                "interpretation": _interpret_K(K_mean),
            },
            "beta": {
                "mean":           beta_mean,
                "std":            beta_std,
                "label":          "Efekat terapije",
                "interpretation": _interpret_beta(beta_mean),
            },
        },
        "traffic_light": _traffic_light(alpha_mean, beta_mean),
        "n_mc_samples":  n_successful,
    }


def save_predictions_csv(result: dict, patient_id: str, save_dir: str = "outputs/predictions"):
    os.makedirs(save_dir, exist_ok=True)

    rows = []
    for tp in result["timepoints"]:
        row = {
            "patient":        patient_id,
            "week":           tp["week"],
            "observed":       tp["observed"],
            "predicted_mean": tp["predicted_mean"],
        }
        for level in [50, 70, 80, 90, 95]:
            row[f"ci_{level}_lower"] = tp["ci"][str(level)]["lower"]
            row[f"ci_{level}_upper"] = tp["ci"][str(level)]["upper"]

        rows.append(row)

    df   = pd.DataFrame(rows)
    path = os.path.join(save_dir, f"{patient_id}_predictions.csv")
    df.to_csv(path, index=False)
    print(f"Sacuvano: {path}")

    return path