
class Timepoint(BaseModel):
    """
    Single timepoint — observed measurement + full prediction.

    ci dict keys are CI level as integer string:
      "50" → 50% CI, "70" → 70%, "80" → 80%, "90" → 90%, "95" → 95%
    """
    week:           float               = Field(..., description="Week number")
    observed:       float | None        = Field(None, description="Observed volume (cm³), null for future timepoints")
    predicted_mean: float               = Field(..., description="Mean predicted volume (cm³)")
    ci: dict[str, CIBand]              = Field(
        ...,
        description="Confidence intervals keyed by level: '50','70','80','90','95'"
    )



class PredictionResponse(BaseModel):
    """
    Full prediction response returned by all /predict endpoints.

    timepoints: one entry per observed week + extrapolated future weeks
    parameters: learned Gompertz parameters with uncertainty
    traffic_light: clinical signal — "red" / "yellow" / "green"
    n_mc_samples: number of MC Dropout samples used
    """
    timepoints:    list[Timepoint]                        = Field(..., description="Per-week predictions")
    parameters:    TumorParameters                         = Field(..., description="Predicted biological parameters")
    traffic_light: Literal["red", "yellow", "green"]      = Field(..., description="Clinical summary signal")
    n_mc_samples:  int                                     = Field(..., description="MC samples used for uncertainty estimation")

    model_config = {
        "json_schema_extra": {
            "example": {
                "timepoints": [
                    {
                        "week": 0,
                        "observed": 2.31,
                        "predicted_mean": 2.31,
                        "ci": {
                            "50": {"lower": 2.25, "upper": 2.37},
                            "70": {"lower": 2.19, "upper": 2.43},
                            "80": {"lower": 2.14, "upper": 2.48},
                            "90": {"lower": 2.07, "upper": 2.55},
                            "95": {"lower": 2.01, "upper": 2.61},
                        }
                    }
                ],
                "parameters": {
                    "alpha": {
                        "mean": 0.18, "std": 0.04,
                        "label": "Growth rate",
                        "interpretation": "Moderate growth rate"
                    },
                    "K": {
                        "mean": 5.20, "std": 0.82,
                        "label": "Carrying capacity (cm³)",
                        "interpretation": "Tumor will not exceed ~5.2 cm³ without intervention"
                    },
                    "beta": {
                        "mean": 0.31, "std": 0.07,
                        "label": "Therapy effect",
                        "interpretation": "Moderate therapy response"
                    }
                },
                "traffic_light": "yellow",
                "n_mc_samples": 200
            }
        }
    }