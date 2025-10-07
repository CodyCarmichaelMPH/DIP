# Module: model_worker.services.starsim_service
# Purpose: Service for running Starsim disease modeling simulations
# Inputs: Disease type, population parameters, simulation configuration
# Outputs: Simulation results with agent-based modeling data
# Errors: Invalid disease parameters, simulation errors, data processing errors
# Tests: test_starsim_service.py

"""
PSEUDOCODE
1) Initialize Starsim service with configuration
2) Define disease-specific parameters for COVID, Flu, RSV
3) Create agent-based population models
4) Run simulations with different scenarios
5) Process and format results for frontend consumption
6) Handle errors and edge cases gracefully
"""

import logging
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import json

try:
    import starsim as ss
    STARSIM_AVAILABLE = True
except ImportError:
    STARSIM_AVAILABLE = False
    logging.warning("Starsim not available. Install with: pip install starsim")

logger = logging.getLogger("starsim_service")

class StarsimService:
    """Service for running Starsim disease modeling simulations"""
    
    def __init__(self):
        self.starsim_available = STARSIM_AVAILABLE
        if not self.starsim_available:
            logger.warning("Starsim not available. Simulations will use fallback methods.")
    
    def get_disease_parameters(self, disease: str) -> Dict[str, Any]:
        """Get Pierce County-calibrated disease-specific parameters for Starsim"""
        # Pierce County-calibrated parameters for 2024-2025 season
        # Based on real WA DOH vaccination data, CDC surveillance, and epidemiological studies
        # Population: 928,696 residents
        # See Docs/Pierce_County_Disease_Parameters_2025.md for full documentation
        disease_configs = {
            "COVID": {
                "type": "sir",
                "init_prev": 0.0015,  # 0.15% initially infected (Pierce County 2025 calibrated)
                "beta": 0.35,       # Calibrated transmission rate for Omicron variants
                "recovery_rate": 0.1, # 10-day recovery period
                "mortality_rate": 0.0005,  # 0.05% CFR (2024-2025 season, post-vaccination era)
                "seasonality": {
                    "peak_weeks": [48, 49, 50, 51, 52, 1, 2, 3],  # Dec-Jan peak
                    "seasonal_factor": 1.3  # Moderate winter seasonality
                },
                "r0": 3.0,  # R0 for Omicron variants (range 2.5-3.5)
                "vaccination_coverage": 0.14,  # 14.0% 2024-2025 vaccine (WA DOH Pierce County data)
                "primary_series_coverage": 0.633,  # 63.3% primary series completion
                "booster_coverage_2023_2024": 0.146,  # 14.6% booster coverage
                "booster_coverage_2024_2025": 0.140,  # 14.0% booster coverage
                "vaccination_by_age": {
                    "0_4": 0.072,    # 7.2% (6m-4 years)
                    "5_11": 0.261,   # 26.1% (5-11 years)
                    "12_17": 0.45,   # 45% (12-17 years)
                    "18_49": 0.65,   # 65% (18-49 years)
                    "50_64": 0.78,   # 78% (50-64 years)
                    "65_plus": 0.89  # 89% (65+ years)
                },
                "vaccination_by_race": {
                    "white": 0.72,
                    "black": 0.58,
                    "hispanic": 0.61,
                    "asian": 0.78,
                    "native_american": 0.55,
                    "pacific_islander": 0.67
                },
                "vaccination_by_sex": {
                    "male": 0.61,
                    "female": 0.66
                },
                "vaccination_effectiveness": {
                    "primary_series_transmission": 0.50,  # 50% reduction in transmission (when recent)
                    "primary_series_severity": 0.85,      # 85% reduction in severe disease
                    "booster_transmission": 0.60,         # 60% reduction in transmission
                    "booster_severity": 0.90,            # 90% reduction in severe disease
                    "waning_immunity_days": 180,         # 6 months waning to residual immunity
                    "booster_waning_days": 120,           # 4 months booster waning
                    "residual_transmission_floor": 0.12,  # 12% residual protection (T-cell immunity persists)
                    "residual_severity_floor": 0.65       # 65% residual protection against severe disease
                },
                "expected_annual_cases": 46000,  # Pierce County expected cases (~5% attack rate)
                "expected_annual_deaths": 23   # Pierce County expected deaths (0.05% CFR)
            },
            "Flu": {
                "type": "sir",
                "init_prev": 0.0008,  # 0.08% initially infected (seasonal start)
                "beta": 0.26,      # Calibrated transmission rate for seasonal influenza
                "recovery_rate": 0.20,  # 5-day recovery period (0.20 = 20% per day)
                "mortality_rate": 0.0012,  # 0.12% CFR (2024-2025 severe season, H1N1/H3N2)
                "seasonality": {
                    "peak_weeks": [1, 2, 3, 4, 5],  # Jan-early Feb peak
                    "seasonal_factor": 2.1  # Strong winter seasonality
                },
                "r0": 1.3,  # R0 for seasonal influenza (range 1.2-1.4)
                "vaccination_coverage": 0.265,  # 26.5% vaccination coverage (WA DOH Pierce County 2024-2025)
                "vaccination_by_age": {
                    "0_4": 0.38,     # 38% (0-4 years)
                    "5_17": 0.42,    # 42% (5-17 years)
                    "18_49": 0.41,   # 41% (18-49 years)
                    "50_64": 0.52,   # 52% (50-64 years)
                    "65_plus": 0.68  # 68% (65+ years)
                },
                "vaccination_by_sex": {
                    "male": 0.25,
                    "female": 0.28
                },
                "vaccination_effectiveness": {
                    "transmission": 0.40,  # 40% reduction in transmission
                    "severity": 0.60,      # 60% reduction in severe disease
                    "waning_immunity_days": 365,  # 1 year waning
                    "seasonal_match_effectiveness": 0.70  # 70% when well-matched
                },
                "expected_annual_cases": 74000,  # Pierce County expected cases (~8% attack rate)
                "expected_annual_deaths": 89   # Pierce County expected deaths (extrapolated from WA State 422 deaths)
            },
            "RSV": {
                "type": "sir",
                "init_prev": 0.0005,  # 0.05% initially infected (very seasonal)
                "beta": 0.12,        # Calibrated transmission rate (lower, shorter window)
                "recovery_rate": 0.125,  # 8-day recovery period (0.125 = 12.5% per day)
                "mortality_rate": 0.0003,  # 0.03% CFR (primarily infants and elderly)
                "seasonality": {
                    "peak_weeks": [47, 48, 49, 50, 51, 52],  # Mid-Nov to Dec peak (earlier than flu/COVID)
                    "seasonal_factor": 3.5  # Very strong winter seasonality (most seasonal of three)
                },
                "r0": 1.5,  # R0 for RSV (range 1.2-1.8)
                "vaccination_coverage": 0.15,  # 15% overall vaccination coverage (new vaccine)
                "adults_75_plus_coverage": 0.461,  # 46.1% adults 75+ years (WA DOH Pierce County 2024-2025)
                "vaccination_by_age": {
                    "0_4": 0.12,     # 12% (0-4 years)
                    "5_17": 0.08,    # 8% (5-17 years)
                    "18_49": 0.05,   # 5% (18-49 years)
                    "50_64": 0.18,   # 18% (50-64 years)
                    "65_plus": 0.35  # 35% (65+ years)
                },
                "vaccination_effectiveness": {
                    "transmission": 0.40,  # 40% reduction in transmission
                    "severity": 0.75,      # 75% reduction in severe disease
                    "waning_immunity_days": 180,  # 6 months waning
                    "pediatric_effectiveness": 0.85  # 85% effectiveness in children
                },
                "expected_annual_cases": 23000,  # Pierce County expected cases (~2.5% attack rate, pediatric/elderly focus)
                "expected_annual_deaths": 7    # Pierce County expected deaths (very low mortality)
            }
        }
        
        return disease_configs.get(disease, disease_configs["COVID"])
    
    def calculate_vaccination_effectiveness(self, disease: str, vaccination_status: str, time_since_vaccination: int = 0) -> Dict[str, float]:
        """
        Calculate vaccination effectiveness based on vaccination status and time since vaccination.
        Accounts for differences between primary series and boosters.
        
        Args:
            disease: Disease type (COVID, Flu, RSV)
            vaccination_status: 'unvaccinated', 'primary_series', 'booster_2023_2024', 'booster_2024_2025'
            time_since_vaccination: Days since vaccination
        
        Returns:
            Dict with transmission and severity effectiveness
        """
        disease_params = self.get_disease_parameters(disease)
        
        if vaccination_status == "unvaccinated":
            return {"transmission_effectiveness": 0.0, "severity_effectiveness": 0.0}
        
        # Get base effectiveness from disease parameters
        if disease == "COVID":
            if vaccination_status == "primary_series":
                base_transmission = disease_params["vaccination_effectiveness"]["primary_series_transmission"]
                base_severity = disease_params["vaccination_effectiveness"]["primary_series_severity"]
                waning_days = disease_params["vaccination_effectiveness"]["waning_immunity_days"]
            elif vaccination_status in ["booster_2023_2024", "booster_2024_2025"]:
                base_transmission = disease_params["vaccination_effectiveness"]["booster_transmission"]
                base_severity = disease_params["vaccination_effectiveness"]["booster_severity"]
                waning_days = disease_params["vaccination_effectiveness"]["booster_waning_days"]
            else:
                return {"transmission_effectiveness": 0.0, "severity_effectiveness": 0.0}
        else:
            # For Flu and RSV, use standard effectiveness
            base_transmission = disease_params["vaccination_effectiveness"]["transmission"]
            base_severity = disease_params["vaccination_effectiveness"]["severity"]
            waning_days = disease_params["vaccination_effectiveness"]["waning_immunity_days"]
        
        # Calculate waning immunity with residual floor (T-cell immunity persists)
        residual_transmission = disease_params["vaccination_effectiveness"].get("residual_transmission_floor", 0.0)
        residual_severity = disease_params["vaccination_effectiveness"].get("residual_severity_floor", 0.0)
        
        if time_since_vaccination > waning_days:
            # Immunity has waned to residual levels (T-cell immunity persists indefinitely)
            return {
                "transmission_effectiveness": residual_transmission,
                "severity_effectiveness": residual_severity
            }
        elif time_since_vaccination > waning_days * 0.5:
            # Immunity is waning (linear decay to residual levels)
            decay_progress = (time_since_vaccination - waning_days * 0.5) / (waning_days * 0.5)
            transmission_eff = base_transmission - (base_transmission - residual_transmission) * decay_progress
            severity_eff = base_severity - (base_severity - residual_severity) * decay_progress
            return {
                "transmission_effectiveness": transmission_eff,
                "severity_effectiveness": severity_eff
            }
        else:
            # Full effectiveness
            return {
                "transmission_effectiveness": base_transmission,
                "severity_effectiveness": base_severity
            }
    
    def get_pierce_county_demographics(self) -> Dict[str, Any]:
        """Get Pierce County demographic data for agent-based modeling"""
        return {
            "population": 928696,
            "age_distribution": {
                "0_4": 0.062,
                "5_17": 0.158,
                "18_49": 0.412,
                "50_64": 0.198,
                "65_plus": 0.170
            },
            "gender_distribution": {
                "male": 0.492,
                "female": 0.508
            },
            "race_ethnicity": {
                "white": 0.712,
                "black": 0.067,
                "hispanic": 0.108,
                "asian": 0.078,
                "native_american": 0.012,
                "pacific_islander": 0.015,
                "other": 0.008
            },
            "socioeconomic_factors": {
                "poverty_rate": 0.112,
                "median_household_income": 67850,
                "unemployment_rate": 0.045,
                "disability_rate": 0.134
            },
            "healthcare_infrastructure": {
                "hospitals": 8,
                "total_beds": 1247,
                "icu_beds": 89,
                "nursing_homes": 23,
                "dialysis_centers": 12,
                "childcare_centers": 187
            }
        }
    
    def create_agent_network(self, n_agents: int = 5000, network_type: str = "random") -> Dict[str, Any]:
        """Create agent network configuration"""
        return {
            "type": network_type,
            "n_contacts": 10 if network_type == "random" else 15,
            "household_size": 2.5,
            "workplace_contacts": 5,
            "school_contacts": 3
        }
    
    def run_simulation(self, disease: str, population_size: int = 928696, 
                      duration_days: int = 365, n_reps: int = 10) -> Dict[str, Any]:
        """V2 CLEAN REWRITE - Run Pierce County SEIR simulation with realistic parameters"""
        
        print(f"\n\n🔥🔥🔥 V2 INLINE IS RUNNING FOR {disease} 🔥🔥🔥\n\n")
        logger.info(f"🔥 V2 INLINE: Running simulation for {disease}")
        
        # Pierce County population
        total_pop = 928696
        
        # Disease-specific parameters (2024-2025 season)
        if disease == "COVID":
            init_prev = 0.0015
            beta = 0.055  # Endemic transmission for ~10-15% attack rate
            sigma = 0.2
            gamma = 0.10
            mu = 0.0005
            seasonal_factor = 1.3
            peak_weeks = [48, 49, 50, 51, 52, 1, 2, 3]
            effective_immunity = (0.633 - 0.14) * 0.12 + 0.14 * 0.60
        elif disease == "Flu":
            init_prev = 0.0008
            beta = 0.26
            sigma = 0.33
            gamma = 0.20
            mu = 0.0012
            seasonal_factor = 2.1
            peak_weeks = [1, 2, 3, 4, 5]
            effective_immunity = 0.265 * 0.40
        else:  # RSV
            init_prev = 0.0005
            beta = 0.12
            sigma = 0.25
            gamma = 0.125
            mu = 0.0003
            seasonal_factor = 3.5
            peak_weeks = [47, 48, 49, 50, 51, 52]
            effective_immunity = 0.15 * 0.40
        
        # Initial conditions
        S = [int((1.0 - init_prev - effective_immunity) * total_pop)]
        E = [int(init_prev * 0.5 * total_pop)]
        I = [int(init_prev * 0.5 * total_pop)]
        R = [int(effective_immunity * total_pop)]
        D = [0]
        
        # SEIR simulation
        for day in range(1, duration_days):
            week = (day // 7) % 52
            season = seasonal_factor if week in peak_weeks else 1.0
            force_infection = beta * season * I[-1] / total_pop
            new_exposed = force_infection * S[-1]
            new_infected = sigma * E[-1]
            new_recovered = gamma * I[-1]
            new_deaths = mu * I[-1]
            S.append(max(0, int(S[-1] - new_exposed)))
            E.append(max(0, int(E[-1] + new_exposed - new_infected)))
            I.append(max(0, int(I[-1] + new_infected - new_recovered - new_deaths)))
            R.append(int(R[-1] + new_recovered))
            D.append(int(D[-1] + new_deaths))
        
        # Summary
        peak_infection = max(I)
        peak_day = I.index(peak_infection)
        total_infected = R[-1] + D[-1]
        total_deaths = D[-1]
        attack_rate = total_infected / total_pop
        cfr = total_deaths / total_infected if total_infected > 0 else 0
        
        logger.info(f"✅ V2 Results: Peak={peak_infection}, Total={total_infected}, AR={attack_rate:.1%}")
        
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
            "version": "v2_inline",
            "timestamp": datetime.now().isoformat()
        }
        
        # Original Starsim code (commented out for now)
        # if not self.starsim_available:
        #     return self._run_fallback_simulation(disease, population_size, duration_days)
        # 
        # try:
        #     # Get disease parameters
        #     disease_params = self.get_disease_parameters(disease)
        #     network_config = self.create_agent_network(population_size)
        #     
        #     # Create simulation parameters
        #     pars = {
        #         "n_agents": population_size,
        #         "networks": network_config,
        #         "diseases": disease_params,
        #         "n_days": duration_days,
        #         "n_reps": n_reps
        #     }
        #     
        #     # Run simulation
        #     sim = ss.Sim(pars)
        #     sim.run()
        #     
        #     # Extract results
        #     results = self._extract_simulation_results(sim, disease)
        #     
        #     return {
        #         "success": True,
        #         "disease": disease,
        #         "population_size": population_size,
        #         "duration_days": duration_days,
        #         "results": results,
        #         "timestamp": datetime.now().isoformat()
        #     }
        #     
        # except Exception as e:
        #     logger.error(f"Error running Starsim simulation for {disease}: {str(e)}")
        #     return self._run_fallback_simulation(disease, population_size, duration_days)
    
    def _extract_simulation_results(self, sim, disease: str) -> Dict[str, Any]:
        """Extract and format simulation results"""
        try:
            # Get disease module results
            disease_module = sim.diseases.get(disease.lower(), None)
            if not disease_module:
                # Try to get the first disease module
                disease_modules = list(sim.diseases.values())
                if disease_modules:
                    disease_module = disease_modules[0]
                else:
                    raise ValueError("No disease modules found in simulation")
            
            # Extract time series data
            results = {
                "susceptible": disease_module.susceptible.tolist() if hasattr(disease_module, 'susceptible') else [],
                "infected": disease_module.infected.tolist() if hasattr(disease_module, 'infected') else [],
                "recovered": disease_module.recovered.tolist() if hasattr(disease_module, 'recovered') else [],
                "deaths": disease_module.deaths.tolist() if hasattr(disease_module, 'deaths') else [],
                "time_points": list(range(len(disease_module.susceptible))) if hasattr(disease_module, 'susceptible') else []
            }
            
            # Calculate summary statistics
            if results["infected"]:
                peak_infection = max(results["infected"])
                peak_day = results["infected"].index(peak_infection)
                total_infected = sum(results["infected"])
                total_deaths = sum(results["deaths"]) if results["deaths"] else 0
                
                results["summary"] = {
                    "peak_infection": peak_infection,
                    "peak_day": peak_day,
                    "total_infected": total_infected,
                    "total_deaths": total_deaths,
                    "attack_rate": total_infected / len(results["infected"]) if results["infected"] else 0,
                    "case_fatality_rate": total_deaths / total_infected if total_infected > 0 else 0
                }
            
            return results
            
        except Exception as e:
            logger.error(f"Error extracting simulation results: {str(e)}")
            return self._generate_fallback_results(disease)
    
    def _run_fallback_simulation(self, disease: str, population_size: int, duration_days: int) -> Dict[str, Any]:
        """Run fallback simulation when Starsim is not available"""
        logger.info(f"Running fallback simulation for {disease}")
        
        # Generate synthetic data based on disease characteristics
        results = self._generate_fallback_results(disease)
        
        return {
            "success": True,
            "disease": disease,
            "population_size": population_size,
            "duration_days": duration_days,
            "results": results,
            "fallback": True,
            "timestamp": datetime.now().isoformat()
        }
    
    def _generate_fallback_results(self, disease: str) -> Dict[str, Any]:
        """Generate fallback results when Starsim is not available using Pierce County data"""
        # Disease-specific parameters for fallback
        disease_params = self.get_disease_parameters(disease)
        pierce_demographics = self.get_pierce_county_demographics()
        
        # Generate time series data
        days = 365
        time_points = list(range(days))
        
        # Pierce County population-based initial conditions
        total_population = pierce_demographics["population"]
        vaccination_coverage = disease_params["vaccination_coverage"]
        
        # Account for vaccination effectiveness and existing immunity
        if disease == "COVID":
            # COVID has primary series (63.3%) and current season booster (14%)
            primary_series_coverage = disease_params.get("primary_series_coverage", 0.633)
            booster_coverage = vaccination_coverage  # 14% have 2024-2025 booster
            
            # Calculate effective vaccination coverage considering effectiveness and waning
            # Most primary series were 2021-2022 (900 days = ~2.5 years average age)
            primary_effectiveness = self.calculate_vaccination_effectiveness(disease, "primary_series", 900)
            # 2024-2025 boosters are recent (60 days = ~2 months average)
            booster_effectiveness = self.calculate_vaccination_effectiveness(disease, "booster_2024_2025", 60)
            
            # Total protection: people with only primary series + people with booster
            effective_vaccination = (
                (primary_series_coverage - booster_coverage) * primary_effectiveness["transmission_effectiveness"] +
                booster_coverage * booster_effectiveness["transmission_effectiveness"]
            )
        else:
            # Flu and RSV use standard vaccination effectiveness
            vaccination_effectiveness = self.calculate_vaccination_effectiveness(disease, "primary_series", 90)
            effective_vaccination = vaccination_coverage * vaccination_effectiveness["transmission_effectiveness"]
        
        # Initial conditions accounting for vaccination
        initial_susceptible = 1.0 - disease_params["init_prev"] - effective_vaccination
        initial_infected = disease_params["init_prev"]
        initial_recovered = effective_vaccination  # Vaccinated individuals start as recovered
        
        # Use absolute population counts (not fractions) for consistency
        susceptible = [initial_susceptible * total_population]
        infected = [initial_infected * total_population]
        recovered = [initial_recovered * total_population]
        deaths = [0.0]
        
        # Simple SIR model simulation with Pierce County parameters
        beta = disease_params["beta"]
        recovery_rate = disease_params["recovery_rate"]
        mortality_rate = disease_params["mortality_rate"]
        
        for day in range(1, days):
            # Apply seasonality
            seasonal_factor = 1.0
            if "seasonality" in disease_params:
                week = (day // 7) % 52
                if week in disease_params["seasonality"]["peak_weeks"]:
                    seasonal_factor = disease_params["seasonality"]["seasonal_factor"]
            
            # Calculate new infections with vaccination protection
            # Using absolute counts, so normalize by population
            base_transmission = beta * seasonal_factor * infected[-1] * susceptible[-1] / total_population
            
            # Use pre-calculated effective vaccination (constant throughout simulation)
            vaccination_protection = effective_vaccination
            
            new_infections = base_transmission * (1 - vaccination_protection)
            new_recoveries = recovery_rate * infected[-1]
            new_deaths = mortality_rate * infected[-1]
            
            # Update compartments
            s_new = max(0, susceptible[-1] - new_infections)
            i_new = max(0, infected[-1] + new_infections - new_recoveries - new_deaths)
            r_new = recovered[-1] + new_recoveries
            d_new = deaths[-1] + new_deaths
            
            susceptible.append(s_new)
            infected.append(i_new)
            recovered.append(r_new)
            deaths.append(d_new)
        
        # Calculate summary statistics (arrays are already in absolute counts)
        peak_infection = max(infected)
        peak_day = infected.index(peak_infection)
        
        # Total infected = cumulative cases (recovered + deaths)
        total_infected = recovered[-1] + deaths[-1]
        
        # Total deaths is the final cumulative death count
        total_deaths = deaths[-1]
        
        # Attack rate = proportion of population infected
        attack_rate = total_infected / total_population
        
        # Case fatality rate = deaths / total cases
        case_fatality_rate = total_deaths / total_infected if total_infected > 0 else 0
        
        return {
            "susceptible": susceptible,
            "infected": infected,
            "recovered": recovered,
            "deaths": deaths,
            "time_points": time_points,
            "summary": {
                "peak_infection": peak_infection,
                "peak_day": peak_day,
                "total_infected": total_infected,
                "total_deaths": total_deaths,
                "attack_rate": attack_rate,
                "case_fatality_rate": case_fatality_rate,
                "vaccination_coverage": vaccination_coverage,
                "effective_vaccination": effective_vaccination,
                "pierce_county_population": total_population
            },
            "pierce_county_data": {
                "demographics": pierce_demographics,
                "disease_parameters": disease_params,
                "vaccination_effectiveness": self.calculate_vaccination_effectiveness(disease, "primary_series", 90)
            }
        }
    
    def _run_pierce_county_simulation(self, disease: str, population_size: int, duration_days: int) -> Dict[str, Any]:
        """Run Pierce County-enhanced SEIR simulation with real demographic and vaccination data"""
        logger.info(f"🔥 FIXED VERSION Running Pierce County-enhanced SEIR simulation for {disease} 🔥")
        
        # Get Pierce County data
        disease_params = self.get_disease_parameters(disease)
        pierce_demographics = self.get_pierce_county_demographics()
        
        # Use actual Pierce County population for realistic scaling
        total_population = pierce_demographics["population"]
        if population_size != total_population:
            logger.info(f"Using full Pierce County population: {total_population} (requested: {population_size})")
        
        # Generate enhanced time series data with Pierce County parameters
        days = duration_days
        time_points = list(range(days))
        
        # Pierce County population-based initial conditions
        vaccination_coverage = disease_params["vaccination_coverage"]
        
        # Account for vaccination effectiveness and existing immunity
        if disease == "COVID":
            # COVID has primary series (63.3%) and current season booster (14%)
            primary_series_coverage = disease_params.get("primary_series_coverage", 0.633)  # Most people have some immunity
            booster_coverage = vaccination_coverage  # 14% have 2024-2025 booster
            
            # Calculate effective vaccination coverage considering effectiveness and waning
            # Most primary series were 2021-2022 (900 days = ~2.5 years average age)
            primary_effectiveness = self.calculate_vaccination_effectiveness(disease, "primary_series", 900)
            # 2024-2025 boosters are recent (60 days = ~2 months average)
            booster_effectiveness = self.calculate_vaccination_effectiveness(disease, "booster_2024_2025", 60)
            
            # Total protection: people with only primary series + people with booster (who have better protection)
            # We don't double-count: booster people are subset of primary series people
            effective_vaccination = (
                (primary_series_coverage - booster_coverage) * primary_effectiveness["transmission_effectiveness"] +
                booster_coverage * booster_effectiveness["transmission_effectiveness"]
            )
        else:
            # Flu and RSV use standard vaccination effectiveness
            vaccination_effectiveness = self.calculate_vaccination_effectiveness(disease, "primary_series", 90)
            effective_vaccination = vaccination_coverage * vaccination_effectiveness["transmission_effectiveness"]
        
        # Initial conditions accounting for vaccination - SEIR model
        initial_susceptible = 1.0 - disease_params["init_prev"] - effective_vaccination
        initial_exposed = disease_params["init_prev"] * 0.5  # Half of initial prevalence in exposed state
        initial_infected = disease_params["init_prev"] * 0.5  # Half already infected
        initial_recovered = effective_vaccination  # Vaccinated individuals start as recovered
        
        susceptible = [initial_susceptible * total_population]
        exposed = [initial_exposed * total_population]
        infected = [initial_infected * total_population]
        recovered = [initial_recovered * total_population]
        deaths = [0.0]
        
        # SEIR model parameters with Pierce County calibration
        beta = disease_params["beta"]
        sigma = 0.2  # Incubation rate (1/5 days = 0.2, meaning 5-day incubation period)
        recovery_rate = disease_params["recovery_rate"]
        mortality_rate = disease_params["mortality_rate"]
        
        for day in range(1, days):
            # Apply seasonality
            seasonal_factor = 1.0
            if "seasonality" in disease_params:
                week = (day // 7) % 52
                if week in disease_params["seasonality"]["peak_weeks"]:
                    seasonal_factor = disease_params["seasonality"]["seasonal_factor"]
            
            # SEIR Model Dynamics with vaccination protection
            # Vaccination protection is constant (based on vaccine age, not simulation day)
            # We already calculated this at initialization - just use that constant value
            vaccination_protection = effective_vaccination
            
            # S -> E: New exposures (force of infection)
            force_of_infection = beta * seasonal_factor * infected[-1] / total_population
            new_exposures = force_of_infection * susceptible[-1] * (1 - vaccination_protection)
            
            # E -> I: Exposed become infected
            new_infections = sigma * exposed[-1]
            
            # I -> R: Infected recover
            new_recoveries = recovery_rate * infected[-1]
            
            # I -> D: Infected die
            new_deaths = mortality_rate * infected[-1]
            
            # Update SEIR compartments (with bounds checking)
            s_new = max(0, susceptible[-1] - new_exposures)
            e_new = max(0, exposed[-1] + new_exposures - new_infections)
            i_new = max(0, infected[-1] + new_infections - new_recoveries - new_deaths)
            r_new = recovered[-1] + new_recoveries
            d_new = deaths[-1] + new_deaths
            
            susceptible.append(s_new)
            exposed.append(e_new)
            infected.append(i_new)
            recovered.append(r_new)
            deaths.append(d_new)
        
        # Calculate summary statistics correctly
        peak_infection = max(infected)
        peak_day = infected.index(peak_infection)
        
        # DEBUG: Log compartment values
        logger.info(f"🔍 Final values: S={susceptible[-1]}, E={exposed[-1]}, I={infected[-1]}, R={recovered[-1]}, D={deaths[-1]}")
        
        # Total infected = everyone who is no longer susceptible (recovered + deaths)
        # This represents the cumulative number of people who have been infected at some point
        total_infected = recovered[-1] + deaths[-1]
        logger.info(f"🔍 total_infected = {recovered[-1]} + {deaths[-1]} = {total_infected}")
        
        # Total deaths is the final cumulative death count (not a sum!)
        total_deaths = deaths[-1]
        
        # Attack rate = proportion of population that got infected
        attack_rate = total_infected / total_population
        
        # Case fatality rate = deaths / total cases
        case_fatality_rate = total_deaths / total_infected if total_infected > 0 else 0
        
        return {
            "success": True,
            "disease": disease,
            "population_size": total_population,  # Return actual Pierce County population
            "duration_days": duration_days,
            "results": {
                "susceptible": susceptible,
                "exposed": exposed,  # Add exposed compartment to results
                "infected": infected,
                "recovered": recovered,
                "deaths": deaths,
                "time_points": time_points,
                "summary": {
                    "peak_infection": peak_infection,
                    "peak_day": peak_day,
                    "total_infected": total_infected,
                    "total_deaths": total_deaths,
                    "attack_rate": attack_rate,
                    "case_fatality_rate": case_fatality_rate,
                    "vaccination_coverage": vaccination_coverage,
                    "effective_vaccination": effective_vaccination,
                    "pierce_county_population": total_population
                },
                "pierce_county_data": {
                    "demographics": pierce_demographics,
                    "disease_parameters": disease_params,
                    "vaccination_effectiveness": self.calculate_vaccination_effectiveness(disease, "primary_series", 90)
                }
            },
            "pierce_county_enhanced": True,
            "timestamp": datetime.now().isoformat()
        }
    
    def run_scenario_comparison(self, disease: str, scenarios: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Run multiple scenarios for comparison"""
        results = {}
        
        for i, scenario in enumerate(scenarios):
            scenario_name = scenario.get("name", f"scenario_{i+1}")
            
            # Run simulation with scenario parameters
            sim_result = self.run_simulation(
                disease=disease,
                population_size=scenario.get("population_size", 5000),
                duration_days=scenario.get("duration_days", 365),
                n_reps=scenario.get("n_reps", 10)
            )
            
            results[scenario_name] = sim_result
        
        return {
            "success": True,
            "disease": disease,
            "scenarios": results,
            "timestamp": datetime.now().isoformat()
        }
    
    def get_simulation_status(self) -> Dict[str, Any]:
        """Get status of Starsim service"""
        return {
            "starsim_available": self.starsim_available,
            "service_status": "healthy",
            "timestamp": datetime.now().isoformat()
        }
