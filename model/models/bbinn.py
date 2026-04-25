import torch
import torch.nn
from torch import nn

from .ode import solve_patient

class BBINN(nn.Module):
    def __init__(self, hidden_size=32, dropout_p=0.1):
        super().__init__()

        self.network = nn.Sequential(
            nn.Linear(4, hidden_size),
            nn.Tanh(),
            nn.Dropout(p=dropout_p),
            nn.Linear(hidden_size, hidden_size),
            nn.Tanh(),
            nn.Dropout(p=dropout_p),
            nn.Linear(hidden_size, 3),
        )

        nn.init.constant_(self.network[-1].bias, -2.0)
        nn.init.zeros_(self.network[-1].weight)

    def enable_dropout(self):
        for m in self.modules():
            if isinstance(m, nn.Dropout):
                m.train()

    def forward(self, patient_features, t_points):
        raw_params = self.network(patient_features)

        alpha = nn.functional.softplus(raw_params[:, 0])
        K = nn.functional.softplus(raw_params[:, 1])
        beta = nn.functional.softplus(raw_params[:, 2])

        V0 = torch.ones(1, dtype=torch.float32).to(patient_features.device)

        V_pred = solve_patient(
            alpha=alpha,
            K=K,
            beta=beta,
            V0=V0,
            t_points=t_points,
        )

        return V_pred, alpha, K, beta
