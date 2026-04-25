from pydantic import BaseModel, Field

class CIBand(BaseModel):
    """Lower and upper bound for a single CI level."""
    lower: float = Field(..., description="Lower confidence bound (cm³)")
    upper: float = Field(..., description="Upper confidence bound (cm³)")

class ParameterStats(BaseModel):
    """Mean + std for a single Gompertz parameter."""
    mean: float = Field(..., description="Posterior mean across MC samples")
    std: float = Field(..., description="Posterior std — uncertainty proxy")
    label: str = Field(..., description="Human-readable parameter name")
    interpretation: str = Field(..., description="Clinical interpretation string")

class TumorParameters(BaseModel):
    """
    Three Gompertz ODE parameters predicted by B-BINN.

    dV/dt = α · V · ln(K/V) - β · V
      α — growth rate
      K — carrying capacity (maximum reachable volume)
      β — therapy effect (how much treatment slows growth)
    """
    alpha: ParameterStats = Field(..., description="Tumor growth rate (α)")
    K:     ParameterStats = Field(..., description="Carrying capacity (K) in cm³")
    beta:  ParameterStats = Field(..., description="Therapy effect (β)")

class Measurement(BaseModel):
    """Single observed measurement — used in request body."""
    week:   float = Field(..., ge=0, description="Week of measurement")
    volume: float = Field(..., gt=0, description="Tumor volume in cm³")