import torch
import numpy as np
import csv
import os

from models.binn import BINN
from models.loss import BINNLoss
from dataset.dataset import get_patient_data


def train(df, patients, config, save_path, log_path):
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(device)

    model     = BINN(hidden_size=config["hidden_size"], dropout_p=config["dropout_p"]).to(device)
    criterion = BINNLoss(biology_weight=config["biology_weight"])
    optimizer = torch.optim.Adam(model.parameters(), lr=config["lr"], weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=20, factor=0.5)

    best_loss = float("inf")
    epochs_without_improvement = 0

    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    log_file   = open(log_path, "w", newline="")
    log_writer = csv.writer(log_file)
    log_writer.writerow([
        "epoch",
        "train_loss", "train_data_loss", "train_biology_loss",
        "train_mae", "train_mape",
        "mean_alpha", "mean_K", "mean_beta"
    ])

    for epoch in range(config["epochs"]):
        model.train()
        train_loss = train_data_loss = train_biology_loss = 0.0
        train_mae  = train_mape = 0.0

        for patient_id in patients:
            t, V, features = get_patient_data(df, patient_id)
            t        = t.to(device)
            V        = V.to(device)
            features = features.unsqueeze(0).to(device)

            optimizer.zero_grad()

            V_pred, alpha, K, beta = model(features, t)
            V_pred = V_pred.squeeze()

            loss, data_loss, biology_loss = criterion(V_pred, V, alpha, K, beta)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            train_loss         += loss.item()
            train_data_loss    += data_loss.item()
            train_biology_loss += biology_loss.item()

            with torch.no_grad():
                pred = V_pred.detach().cpu().numpy()
                true = V.cpu().numpy()
                train_mae += np.mean(np.abs(pred - true))
                mask = true > 1e-6
                if mask.any():
                    train_mape += np.mean(
                        np.abs((pred[mask] - true[mask]) / true[mask])
                    ) * 100

        n               = len(patients)
        train_loss         /= n
        train_data_loss    /= n
        train_biology_loss /= n
        train_mae          /= n
        train_mape         /= n

        scheduler.step(train_loss)

        # Logujemo prosecne parametre
        all_alpha, all_K, all_beta = [], [], []
        model.eval()
        with torch.no_grad():
            for patient_id in patients:
                t, V, features = get_patient_data(df, patient_id)
                t        = t.to(device)
                features = features.unsqueeze(0).to(device)
                _, alpha, K, beta = model(features, t)
                all_alpha.append(alpha.item())
                all_K.append(K.item())
                all_beta.append(beta.item())

        mean_alpha = np.mean(all_alpha)
        mean_K     = np.mean(all_K)
        mean_beta  = np.mean(all_beta)

        log_writer.writerow([
            epoch + 1,
            f"{train_loss:.6f}", f"{train_data_loss:.6f}", f"{train_biology_loss:.6f}",
            f"{train_mae:.6f}", f"{train_mape:.4f}",
            f"{mean_alpha:.4f}", f"{mean_K:.4f}", f"{mean_beta:.4f}"
        ])
        log_file.flush()

        print(
            f"Epoch {epoch+1:4d}/{config['epochs']} | "
            f"Loss: {train_loss:.4f} | MAE: {train_mae:.4f} | MAPE: {train_mape:.1f}% | "
            f"alpha: {mean_alpha:.3f} | K: {mean_K:.3f} | beta: {mean_beta:.3f}"
        )

        if train_loss < best_loss:
            best_loss = train_loss
            epochs_without_improvement = 0
            torch.save(model.state_dict(), save_path)
        else:
            epochs_without_improvement += 1
            if epochs_without_improvement >= config["early_stopping_patience"]:
                print(f"\nEarly stopping on epoch {epoch + 1}!")
                break

    log_file.close()
    print(f"\nBest loss: {best_loss:.4f}")
    print(f"Model saved: {save_path}")

    return model, best_loss