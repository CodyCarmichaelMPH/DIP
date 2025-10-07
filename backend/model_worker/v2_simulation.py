"""
V2 Standalone Simulation - No class dependencies, no caching issues
"""
from datetime import datetime
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta


def run_v2_simulation(
    disease: str,
    population_size: int = 928696,
    duration_days: Optional[int] = 120,
    n_reps: int = 10,
    # time controls
    start_date: Optional[str] = None,
    stop_date: Optional[str] = None,
    unit: Optional[str] = None,
    random_seed: Optional[int] = None,
    # model selection
    disease_model_type: Optional[str] = None,
    # disease overrides
    init_prev: Optional[float] = None,
    beta: Optional[float] = None,
    gamma: Optional[float] = None,
    sigma: Optional[float] = None,
    mortality_rate: Optional[float] = None,
    # seasonality
    seasonal_factor: Optional[float] = None,
    peak_weeks: Optional[List[int]] = None,
    # network approximation
    n_contacts: Optional[float] = None,
    n_contacts_poisson_lam: Optional[float] = None,
    # vaccination
    vaccination_coverage: Optional[float] = None,
    booster_coverage: Optional[float] = None,
    vax_transmission_eff: Optional[float] = None,
    vax_severity_eff: Optional[float] = None,
    waning_days: Optional[int] = None,
    residual_transmission_floor: Optional[float] = None,
) -> Dict[str, Any]:
    """V2 SEIR simulation - standalone function"""
    
    print(f"\n\n🔥🔥🔥 V2 STANDALONE RUNNING FOR {disease} 🔥🔥🔥\n\n")
    
    # Determine duration
    if start_date and stop_date:
        try:
            sd = datetime.fromisoformat(start_date)
            ed = datetime.fromisoformat(stop_date)
            duration_days = max(1, (ed - sd).days)
        except Exception:
            # Fallback to provided duration_days or default
            duration_days = duration_days or 120
    else:
        duration_days = duration_days or 120
    
    # Pierce County population
    total_pop = population_size or 928696
    
    # Disease parameters
    if disease == "COVID":
        init_prev_default = 0.0015
        beta_default = 0.045
        sigma_default = 0.2
        gamma_default = 0.10
        mu_default = 0.0005
        seasonal_factor_default = 1.3
        peak_weeks_default = [48, 49, 50, 51, 52, 1, 2, 3]
        # Effective immunity baseline: primary-only residual + booster * effectiveness
        effective_immunity_default = (0.633 - 0.14) * (residual_transmission_floor if residual_transmission_floor is not None else 0.12) + (0.14) * (vax_transmission_eff if vax_transmission_eff is not None else 0.60)
        season_start_week = 46
    elif disease == "Flu":
        init_prev_default = 0.0008
        beta_default = 0.26
        sigma_default = 0.33
        gamma_default = 0.20
        mu_default = 0.0012
        seasonal_factor_default = 2.1
        peak_weeks_default = [1, 2, 3, 4, 5]
        effective_immunity_default = (vaccination_coverage if vaccination_coverage is not None else 0.265) * (vax_transmission_eff if vax_transmission_eff is not None else 0.40)
        season_start_week = 52
    else:  # RSV
        init_prev_default = 0.0005
        beta_default = 0.12
        sigma_default = 0.25
        gamma_default = 0.125
        mu_default = 0.0003
        seasonal_factor_default = 3.5
        peak_weeks_default = [47, 48, 49, 50, 51, 52]
        effective_immunity_default = (vaccination_coverage if vaccination_coverage is not None else 0.15) * (vax_transmission_eff if vax_transmission_eff is not None else 0.40)
        season_start_week = 45

    # Apply overrides or defaults
    init_prev_val = init_prev if init_prev is not None else init_prev_default
    beta_val = beta if beta is not None else beta_default
    sigma_val = sigma if sigma is not None else sigma_default
    gamma_val = gamma if gamma is not None else gamma_default
    mu_val = mortality_rate if mortality_rate is not None else mu_default
    seasonal_factor_val = seasonal_factor if seasonal_factor is not None else seasonal_factor_default
    peak_weeks_val = peak_weeks if peak_weeks is not None else peak_weeks_default

    # Network contacts approximation: scale beta by contacts / baseline_contacts
    baseline_contacts = 10.0
    contacts = n_contacts_poisson_lam if n_contacts_poisson_lam is not None else (n_contacts if n_contacts is not None else baseline_contacts)
    try:
        contact_multiplier = float(contacts) / baseline_contacts if contacts else 1.0
    except Exception:
        contact_multiplier = 1.0
    beta_val *= contact_multiplier
    
    # Determine effective immunity if not computed (for COVID, defaults already include booster split)
    if disease == "COVID":
        # Allow overrides for booster and vaccination coverage
        booster_cov = booster_coverage if booster_coverage is not None else 0.14
        primary_cov = 0.633
        trans_eff = vax_transmission_eff if vax_transmission_eff is not None else 0.60
        residual = residual_transmission_floor if residual_transmission_floor is not None else 0.12
        effective_immunity = (primary_cov - booster_cov) * residual + booster_cov * trans_eff
    else:
        effective_immunity = effective_immunity_default

    # Initial conditions
    if (disease_model_type or "seir").lower() == "sir":
        S = [int((1.0 - init_prev_val - effective_immunity) * total_pop)]
        I = [int(init_prev_val * total_pop)]
        R = [int(effective_immunity * total_pop)]
        E = None
    else:
        S = [int((1.0 - init_prev_val - effective_immunity) * total_pop)]
        E = [int(init_prev_val * 0.5 * total_pop)]
        I = [int(init_prev_val * 0.5 * total_pop)]
        R = [int(effective_immunity * total_pop)]
    D = [0]
    
    # SEIR simulation (track deaths as float to avoid rounding to 0)
    deaths_float = 0.0
    for day in range(1, duration_days):
        week = (day // 7) % 52
        season = seasonal_factor_val if week in peak_weeks_val else 1.0
        force_infection = beta_val * season * I[-1] / total_pop
        new_exposed = force_infection * S[-1]
        if E is None:
            # SIR dynamics
            new_infected = new_exposed
        else:
            new_infected = sigma_val * E[-1]
        new_recovered = gamma_val * I[-1]
        new_deaths = mu_val * I[-1]
        deaths_float += new_deaths

        S.append(max(0, int(S[-1] - new_exposed)))
        if E is None:
            I.append(max(0, int(I[-1] + new_infected - new_recovered - new_deaths)))
        else:
            E.append(max(0, int(E[-1] + new_exposed - new_infected)))
            I.append(max(0, int(I[-1] + new_infected - new_recovered - new_deaths)))
        R.append(int(R[-1] + new_recovered))
        D.append(int(deaths_float))
    
    # Summary
    peak_infection = max(I)
    peak_day = I.index(peak_infection)
    total_infected = R[-1] + D[-1]
    total_deaths = D[-1]
    attack_rate = total_infected / total_pop
    cfr = total_deaths / total_infected if total_infected > 0 else 0
    
    print(f"✅ V2 Results: Peak={peak_infection}, Total={total_infected}, Deaths={total_deaths}, AR={attack_rate:.1%}")
    
    # Calculate season start date (2024-2025 season) unless start_date provided
    if start_date:
        try:
            season_start_date = datetime.fromisoformat(start_date)
        except Exception:
            # Fallback to computed season start based on week
            jan_1_2025 = datetime(2025, 1, 1)
            days_to_week = (season_start_week - 1) * 7
            season_start_date = jan_1_2025 + timedelta(days=days_to_week)
    else:
        jan_1_2025 = datetime(2025, 1, 1)
        days_to_week = (season_start_week - 1) * 7
        if season_start_week > 26:
            season_start_date = jan_1_2025 - timedelta(days=(53 - season_start_week) * 7)
        else:
            season_start_date = jan_1_2025 + timedelta(days=days_to_week)
    
    return {
        "success": True,
        "disease": disease,
        "population_size": total_pop,
        "duration_days": duration_days,
        "season_start_week": season_start_week,
        "season_start_date": season_start_date.strftime("%B %d, %Y"),
        "results": {
            "susceptible": S,
            "exposed": E if E is not None else None,
            "infected": I,
            "recovered": R,
            "deaths": D,
            "time_points": list(range(duration_days)),
            "summary": {
                "peak_infection": peak_infection,
                "peak_day": peak_day,
                "total_infected": total_infected,
                "total_deaths": total_deaths,
                "attack_rate": attack_rate,
                "case_fatality_rate": cfr,
                "vaccination_coverage": 0.633 if disease == "COVID" else (0.265 if disease == "Flu" else 0.15),
                "effective_vaccination": effective_immunity,
                "pierce_county_population": total_pop
            }
        },
        "pierce_county_enhanced": True,
        "version": "v2_standalone",
        "timestamp": datetime.now().isoformat()
    }

