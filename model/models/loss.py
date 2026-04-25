import torch
import torch.nn as nn

class BBINNLoss(nn.Module):
    def __init__(self, biology_weight=0.01):
        super().__init__()
        self.biology_weight = biology_weight
        self.mse = nn.MSELoss()

    def forward(self, V_pred, V_true, alpha, K, beta):
        V_pred_log = torch.log1p(torch.clamp(V_pred, min=1e-6))
        V_true_log = torch.log1p(torch.clamp(V_true, min=1e-6))
        data_loss = self.mse(V_pred_log, V_true_log)

        alpha_penalty = torch.mean(torch.relu(alpha - 1.0))
        K_penalty = torch.mean(torch.relu(K - 100.0))
        beta_penalty = torch.mean(torch.relu(beta - 1.0))

        biology_loss = alpha_penalty + beta_penalty + K_penalty
        total_loss = data_loss + self.biology_weight * biology_loss

        return total_loss, data_loss, biology_loss