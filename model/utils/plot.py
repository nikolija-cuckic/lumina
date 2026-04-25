import matplotlib.pyplot as plt
import os


def plot_patient(patient_id, t, V_true, V_mean, V_std, save_dir=None):
    """
    Plotuje stvarne zapremine vs MC Dropout predikcije sa uncertainty bandovima.

    Plava linija    : srednja vrednost predikcija
    Plavi band      : +/- 2 std (95% interval)
    Crne tacke      : stvarna merenja
    """
    fig, ax = plt.subplots(figsize=(8, 4))

    # Uncertainty band
    ax.fill_between(
        t,
        V_mean - 2 * V_std,
        V_mean + 2 * V_std,
        alpha=0.2,
        color="steelblue",
        label="95% interval"
    )

    # Predikcija
    ax.plot(t, V_mean, color="steelblue", linewidth=2, label="Predikcija")

    # Stvarna merenja
    ax.scatter(t, V_true, color="black", zorder=5, s=50, label="Merenja")

    ax.set_title(f"{patient_id}")
    ax.set_xlabel("Nedelja")
    ax.set_ylabel("Normalizovani volumen")
    ax.legend()
    ax.grid(True, alpha=0.3)

    plt.tight_layout()

    if save_dir is not None:
        os.makedirs(save_dir, exist_ok=True)
        fig.savefig(f"{save_dir}/{patient_id}.png", dpi=150)
        plt.close(fig)
    else:
        plt.show()


def plot_all_patients(results, save_dir="outputs/plots"):
    """
    Plotuje sve pacijente i cuva kao PNG.
    """
    for patient_id, data in results.items():
        plot_patient(
            patient_id=patient_id,
            t=data["t"],
            V_true=data["V_true"],
            V_mean=data["V_mean"],
            V_std=data["V_std"],
            save_dir=save_dir,
        )
    print(f"Plotovi sacuvani u: {save_dir}")