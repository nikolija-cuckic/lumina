from pydantic import BaseModel, Field, field_validator

from .base import Measurement

class FeaturePredictRequest(BaseModel):
    """
    Request body for /predict/features.
    Use when you already have the volume time series.
    """
    measurements: list[Measurement] = Field(
        ...,
        min_length=2,
        description="Chronological list of observed measurements"
    )

    @field_validator("measurements")
    @classmethod
    def must_be_chronological(cls, v: list[Measurement]) -> list[Measurement]:
        weeks = [m.week for m in v]
        if weeks != sorted(weeks):
            raise ValueError("measurements must be in chronological order (ascending week)")
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "measurements": [
                    {"week": 0,  "volume": 2.31},
                    {"week": 4,  "volume": 2.87},
                    {"week": 8,  "volume": 3.45},
                    {"week": 12, "volume": 3.21},
                ]
            }
        }
    }