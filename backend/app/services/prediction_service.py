
CI_LEVELS = [0.50, 0.70, 0.80, 0.90, 0.95]

def _run_prediction(history: list[dict]) -> PredictionResponse:
    """Core prediction logic — shared by all predict endpoints."""
    from backend.schemas import (
        Timepoint, TumorParameters, CIBand, ParameterStats
    )

    times   = np.array([m["week"]   for m in history], dtype=np.float32)
    volumes = np.array([m["volume"] for m in history], dtype=np.float32)

    x      = torch.tensor(build_features(times, volumes)).unsqueeze(0)
    t_span = torch.tensor(times)

    # Run MC inference once — reuse samples for all CI levels
    result = predict_with_uncertainty(
        MODEL, x, t_span, v0=float(volumes[0]),
        n_samples=200,
        ci=0.95,    # run at widest CI — narrower ones extracted from same samples
    )

    all_trajs = result["all_trajs"]  # [n_samples, T]

    # Build timepoints with all CI levels
    timepoints = []
    for i, (week, obs) in enumerate(zip(times, volumes)):
        ci_bands = {}
        for ci in CI_LEVELS:
            alpha = (1 - ci) / 2
            ci_bands[str(int(ci * 100))] = CIBand(
                lower=float(np.quantile(all_trajs[:, i], alpha)),
                upper=float(np.quantile(all_trajs[:, i], 1 - alpha)),
            )

        timepoints.append(Timepoint(
            week=float(week),
            observed=float(obs) if i < len(volumes) else None,
            predicted_mean=float(result["mean_traj"][i]),
            ci=ci_bands,
        ))

    # Biological parameters
    alpha_m, K_m, beta_m = result["mean_params"]
    alpha_s, K_s, beta_s = result["std_params"]

    params = TumorParameters(
        alpha=ParameterStats(
            mean=float(alpha_m), std=float(alpha_s),
            label="Growth rate",
            interpretation=_interpret_alpha(alpha_m),
        ),
        K=ParameterStats(
            mean=float(K_m), std=float(K_s),
            label="Carrying capacity (cm³)",
            interpretation=f"Tumor will not exceed ~{K_m:.1f} cm³ without intervention",
        ),
        beta=ParameterStats(
            mean=float(beta_m), std=float(beta_s),
            label="Therapy effect",
            interpretation=_interpret_beta(beta_m),
        ),
    )

    return PredictionResponse(
        timepoints=timepoints,
        parameters=params,
        traffic_light=_traffic_light(alpha_m, beta_m),
        n_mc_samples=len(all_trajs),
    )
