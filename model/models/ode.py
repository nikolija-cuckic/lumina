import torch
import torch.nn as nn
from torchdiffeq import odeint


class GompertzODE(nn.Module):
    def __init__(self, alpha, K, beta):
        super().__init__()
        self.alpha = alpha
        self.K = K
        self.beta = beta

    def forward(self, t, V):
        V = V.clamp(min=1e-6)
        K = self.K.clamp(min=1e-6)

        growth = self.alpha * V * torch.log(K/V)
        treatment = self.beta * V

        return growth - treatment

def solve_patient(alpha, K, beta, V0, t_points):
    ode = GompertzODE(alpha, K, beta)

    V_pred  = odeint(
        ode,
        V0,
        t_points,
        method="dopri5",
        rtol=1e-4,
        atol=1e-5,
    )

    return V_pred.squeeze()