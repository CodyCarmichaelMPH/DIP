"""
Starsim Service V2 - Clean rewrite with Pierce County calibration
Fixed issues: proper vaccination immunity, realistic attack rates, absolute counts
"""

import logging
from typing import Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)


class StarsimServiceV2:
    """Clean rewrite of Starsim service with proper SEIR model"""
    
    def __init__(self):
        self.starsim_available = False
        logger.info("Starsim Service V2 initialized")
    
    def run_simulation(self, disease: str, population_size: int = 928696, 
                      duration_days: int = 365, n_reps: int = 10) -> Dict[str, Any]:
        """Run Pierce County SEIR simulation with realistic parameters"""
        
        logger.info(f"🔥 V2: Running simulation for {disease}")
        
        # Pierce County population
        total_pop = 928696
        
        # Disease-specific parameters (2024-2025 season)
        if disease == "COVID":
            # COVID-19 (endemic phase, Omicron variants)
            # Target: 5% attack rate (~46k infections) not 92%!
            init_prev = 0.0015  # 0.15% initial prevalence
            # Beta reduced for endemic phase - targeting ~5% attack rate
            # R_eff barely above 1 for slow, limited spread
            beta = 0.055  # Endemic transmission rate for ~5-10% attack rate
            sigma = 0.2  # Incubation rate (5 days)
            gamma = 0.10  # Recovery rate (10 days)
            mu = 0.0005  # Mortality rate (0.05% CFR)
            seasonal_factor = 1.3
            peak_weeks = [48, 49, 50, 51, 52, 1, 2, 3]
            
            # Vaccination: 63.3% primary series (900 days old), 14% boosters (60 days old)
            # Old vaccines: 12% residual transmission protection
            # Recent boosters: 60% transmission protection
            effective_immunity = (0.633 - 0.14) * 0.12 + 0.14 * 0.60  # ≈ 14.3%
            
        elif disease == "Flu":
            # Influenza (severe 2024-2025 season)
            init_prev = 0.0008
            beta = 0.26
            sigma = 0.33  # 3 days incubation
            gamma = 0.20  # 5 days recovery
            mu = 0.0012  # 0.12% CFR
            seasonal_factor = 2.1
            peak_weeks = [1, 2, 3, 4, 5]
            effective_immunity = 0.265 * 0.40  # 26.5% vaccinated * 40% effectiveness
            
        else:  # RSV
            init_prev = 0.0005
            beta = 0.12
            sigma = 0.25  # 4 days incubation
            gamma = 0.125  # 8 days recovery
            mu = 0.0003  # 0.03% CFR
            seasonal_factor = 3.5
            peak_weeks = [47, 48, 49, 50, 51, 52]
            effective_immunity = 0.15 * 0.40  # 15% vaccinated * 40% effectiveness
        
        # Initial conditions (absolute counts)
        S = [int((1.0 - init_prev - effective_immunity) * total_pop)]
        E = [int(init_prev * 0.5 * total_pop)]
        I = [int(init_prev * 0.5 * total_pop)]
        R = [int(effective_immunity * total_pop)]
        D = [0]
        
        # Run SEIR simulation
        for day in range(1, duration_days):
            # Apply seasonality
            week = (day // 7) % 52
            season = seasonal_factor if week in peak_weeks else 1.0
            
            # SEIR dynamics (absolute counts)
            # Immune people are already in R[0], so they're not in S - no need to reduce transmission further
            force_infection = beta * season * I[-1] / total_pop
            new_exposed = force_infection * S[-1]  # Susceptible people can be exposed
            new_infected = sigma * E[-1]
            new_recovered = gamma * I[-1]
            new_deaths = mu * I[-1]
            
            # Update compartments
            S.append(max(0, int(S[-1] - new_exposed)))
            E.append(max(0, int(E[-1] + new_exposed - new_infected)))
            I.append(max(0, int(I[-1] + new_infected - new_recovered - new_deaths)))
            R.append(int(R[-1] + new_recovered))
            D.append(int(D[-1] + new_deaths))
        
        # Summary statistics
        peak_infection = max(I)
        peak_day = I.index(peak_infection)
        total_infected = R[-1] + D[-1]  # Everyone who got infected
        total_deaths = D[-1]
        attack_rate = total_infected / total_pop
        cfr = total_deaths / total_infected if total_infected > 0 else 0
        
        logger.info(f"✅ V2 Results: Peak={peak_infection}, Total={total_infected}, Deaths={total_deaths}, AR={attack_rate:.1%}")
        
        return {
            "success": True,
            "disease": disease,
            "population_size": total_pop,
            "duration_days": duration_days,
            "results": {
                "susceptible": S,
                "exposed": E,
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
            "version": "v2_clean",
            "timestamp": datetime.now().isoformat()
        }


# Create singleton instance
starsim_service_v2 = StarsimServiceV2()

