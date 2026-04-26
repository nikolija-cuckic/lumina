# Lumina

**Clarity through uncertainty** — a Bayesian Biology-Informed Neural Network for personalized glioblastoma growth prediction with quantified uncertainty.

Built for the Google Nexus AI & ML in Practice Hackathon (2026).

---

## What it does

Lumina predicts how a glioblastoma tumor will behave in the coming weeks, based on a patient's volumetric measurement history. Unlike black-box models, Lumina learns three biologically interpretable parameters per patient and produces calibrated confidence intervals across five levels (50%, 70%, 80%, 90%, 95%).

The clinical signal is simple: a physician selects a patient, sees the predicted growth trajectory with uncertainty bands, and gets a plain-language interpretation of whether the current therapy is working.

---

## How it works

### Biological model

Tumor growth follows the Gompertz differential equation:

```
dV/dt = α · V · ln(K / V) − β · V
```

- **α** — tumor-specific growth rate
- **K** — carrying capacity (maximum reachable volume)
- **β** — therapy effect (how much treatment slows growth)

These are not generic population averages — the network learns a distinct (α, K, β) triple for each patient from their own measurement history.

### Architecture

The model is a **Biologically Informed Neural Network (BINN)**: a compact feedforward network (4 → 64 → 64 → 3) that maps patient features to Gompertz parameters, which are then integrated through the ODE using `dopri5` (Dormand-Prince adaptive solver from `torchdiffeq`).

```
Patient features [4]
  ├── log(initial_volume)
  ├── n_measurements / 20
  ├── max_week / T_MAX
  └── volume trend

        ↓ Linear → Tanh → Linear → Tanh → Linear → Softplus
        
(α, K, β) [3]  — always positive

        ↓ GompertzODE + odeint(dopri5)

V(t) [T]  — predicted volume trajectory
```

Softplus on the output guarantees positive parameters at all times without explicit constraints.

### Training

The loss function is a relative MAE on normalized volumes plus a soft biology penalty:

```python
data_loss     = mean(|V_pred - V_true| / (V_true + ε))
biology_loss  = relu(α - 1) + relu(K - 100) + relu(β - 1)
total_loss    = data_loss + 0.05 * biology_loss
```

Relative MAE is used instead of MSE on log space to handle the wide range of tumor volumes across patients. The biology penalty softly discourages biologically implausible parameters without hard-clamping them.

Training uses Adam with `weight_decay=1e-4` and `ReduceLROnPlateau` on the training loss.

**Dropout is disabled during training** (p=0.0) so the network can freely memorize per-patient parameter combinations. This is critical — dropout during training causes the model to collapse to population averages.

### Uncertainty quantification

Uncertainty is added post-training via **MC Dropout at inference time**:

1. `model.eval()` — dropout off — produces the deterministic mean prediction (used as the displayed mean trajectory)
2. `enable_dropout(p=0.1)` — dropout on — runs 100 forward passes to sample a distribution over (α, K, β)
3. Each sample is propagated through the ODE → 100 trajectories
4. Quantiles are computed per timepoint for each CI level

Using a small p=0.1 at inference on a model trained with p=0.0 gives meaningful uncertainty without destroying the per-patient individualization that was learned during training.

```python
CI_QUANTILES = {
    "50": (0.25,  0.75),
    "70": (0.15,  0.85),
    "80": (0.10,  0.90),
    "90": (0.05,  0.95),
    "95": (0.025, 0.975),
}
```

### Dataset

[LUMIERE](https://www.nature.com/articles/s41597-022-01560-7) — the only publicly available longitudinal GBM dataset with segmentation masks across multiple timepoints per patient. 52 patients with 4+ measurements were used for training. Volumes are normalized by initial volume (V₀ = 1.0 always), so K represents the maximum-to-initial volume ratio.

The small dataset size is not incidental — longitudinal MRI with segmentation masks is extremely rare in medical imaging. Bayesian inference is appropriate precisely because the model needs to communicate what it does not know.

---

## Project structure

```
lumina/
│
├── model/                         # ML training pipeline
│   ├── models/
│   │   ├── binn.py                # BINN network + enable_dropout()
│   │   └── ode.py                 # GompertzODE + solve_patient()
│   ├── models/
│   │   └── loss.py                # Relative MAE + biology penalty
│   ├── dataset/
│   │   └── dataset.py             # Feature engineering + normalization
│   ├── training/
│   │   └── trainer.py             # Training loop with checkpointing
│   ├── data/
│   │   └── tumor_volumes_clean.csv
│   ├── outputs/
│   │   ├── models/                # Checkpoints every 50 epochs
│   │   └── logs/                  # Per-epoch CSV training log
│   └── main.py                    # Training entrypoint
│
├── backend/                       # FastAPI inference server
│   ├── main.py                    # Endpoints + startup model loading
│   ├── inference.py               # Full prediction pipeline
│   └── schemas.py                 # Pydantic request/response models
│
└── frontend/                      # React UI
    └── src/
        ├── App.jsx                # State orchestration + MOCK_RESPONSE
        ├── api/client.js          # All backend calls
        ├── hooks/usePrediction.js # Loading/error state
        └── components/
            ├── DemoSelector.jsx   # Patient list sidebar
            ├── TrajectoryChart.jsx# Plotly chart with CI bands
            ├── ParameterCards.jsx # α, K, β with interpretation
            ├── CITable.jsx        # CI table across all levels
            └── TrafficLight.jsx   # Green/yellow/red clinical signal
```

---

## Backend API

The backend loads the trained model once at startup and keeps it in memory. All patient data is pre-loaded from the CSV — there is no file upload in the clinical workflow.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/patients` | List all patients with summary stats |
| `GET`  | `/patients/{id}/history` | Raw measurement history for a patient |
| `GET`  | `/patients/{id}/predict` | Run B-BINN inference, return full prediction |
| `GET`  | `/health` | Liveness check for Cloud Run |

The prediction response mirrors the frontend `MOCK_RESPONSE` shape exactly, so replacing mock data with a live API call requires changing one line in `App.jsx`.

```json
{
  "timepoints": [
    {
      "week": 12,
      "observed": 22.4,
      "predicted_mean": 21.8,
      "ci": {
        "50": {"lower": 20.9, "upper": 22.7},
        "70": {"lower": 20.1, "upper": 23.5},
        "90": {"lower": 18.8, "upper": 25.1},
        "95": {"lower": 17.9, "upper": 26.3}
      }
    }
  ],
  "parameters": {
    "alpha": {"mean": 0.21, "std": 0.04, "label": "Brzina rasta", "interpretation": "..."},
    "K":     {"mean": 38.2, "std": 6.1,  "label": "Maksimalni kapacitet (cm³)", "interpretation": "..."},
    "beta":  {"mean": 0.19, "std": 0.06, "label": "Efekat terapije", "interpretation": "..."}
  },
  "traffic_light": "yellow",
  "n_mc_samples": 97
}
```

---

## Key design decisions

**Why BINN and not a generic ML model?**
A generic model predicts a scalar outcome. BINN learns parameters of a known biological process — the Gompertz equation — so each parameter is directly interpretable by a clinician. α is not a feature weight, it is the growth rate of this specific tumor.

**Why not train with dropout?**
Standard MC Dropout assumes the model was trained with dropout. On a dataset of 52 patients, dropout during training regularizes so aggressively that the network collapses to population averages — every patient gets nearly identical (α, K, β). Training without dropout, then enabling it only at inference, preserves per-patient individualization while still generating a parameter distribution for CI estimation.

**Why relative MAE over log-MSE?**
Log-MSE amplifies small absolute errors when volumes are small. Relative MAE treats a 10% prediction error the same regardless of whether the tumor is 5 cm³ or 50 cm³, which is more appropriate for clinical interpretation.

**Why Gompertz over logistic or exponential?**
Logistic growth assumes symmetric growth around the inflection point. Exponential has no upper bound. Gompertz is asymmetric — growth decelerates as volume approaches K — which matches observed tumor biology more closely.

---

## Limitations

- Trained on 52 patients. Confidence intervals are wide and reflect genuine uncertainty — this is a feature, not a bug.
- Gompertz is a monotonic model. It cannot fully capture non-monotonic behavior (sharp drops followed by regrowth) that sometimes occurs with aggressive treatment response followed by resistance.
- Parameters are learned from volumetric data only. Clinical variables (age, sex, treatment type, MGMT methylation status) are not included in this prototype.
- Not validated in a clinical setting. Lumina is a research prototype and a decision support tool — it does not replace clinical judgment.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| ML    | PyTorch, torchdiffeq, NumPy, pandas |
| Backend | FastAPI, Pydantic, nibabel |
| Frontend | React 18, Plotly, Tailwind CSS, Vite |
| Deployment | Google Cloud Run (backend), Vercel (frontend) |

