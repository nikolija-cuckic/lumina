from pydantic import BaseModel, Field

from .base import Measurement


class HealthResponse(BaseModel):
    status: str = Field(default="ok")
    model_loaded: bool = Field(...)


class DemoPatient(BaseModel):
    id: str = Field(..., description="Patient identifier")
    label: str = Field(..., description="Display label for UI")
    measurements: list[Measurement] = Field(..., description="Chronological volume measurements")
