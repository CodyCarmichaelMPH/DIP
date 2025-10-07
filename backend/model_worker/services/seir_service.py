#!/usr/bin/env python3
"""
SEIR Disease Modeling Service
Implements SEIR (Susceptible-Exposed-Infected-Recovered) models with user-configurable parameters
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json

logger = logging.getLogger("seir_service")

class SEIRService:
    """Service for running SEIR disease modeling simulations with user-configurable parameters"""
    
    def __init__(self):
        self.default_parameters = self._get_default_parameters()
    
    def _get_default_parameters(self) -> Dict[str, Any]:
        """Get default SEIR parameters for different diseases"""
        return {
            "COVID": {
                "name": "COVID-19",
                "model_type": "seir",
                "init_prev": 0.005,      # Initial prevalence
                "beta": 0.315,           # Transmission rate
                "sigma": 0.2,            # Incubation rate (1/incubation_period)
                "gamma": 0.1,            # Recovery rate (1/infectious_period)
                "mu": 0.00126,           # Mortality rate
                "seasonal_factor": 1.03, # Seasonal amplification
                "peak_weeks": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 49, 50, 51, 52],
                "r0": 2.5,               # Basic reproduction number
                "incubation_period": 5,   # Days
                "infectious_period": 10,  # Days
                "vaccination_coverage": 0.70
            },
            "Flu": {
                "name": "Influenza",
                "model_type": "seir",
                "init_prev": 0.002,
                "beta": 0.3446,
                "sigma": 0.5,            # Faster incubation
                "gamma": 0.1429,
                "mu": 0.000598,
                "seasonal_factor": 1.56,
                "peak_weeks": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 49, 50, 51, 52],
                "r0": 1.8,
                "incubation_period": 2,
                "infectious_period": 7,
                "vaccination_coverage": 0.45
            },
            "RSV": {
                "name": "RSV",
                "model_type": "seir",
                "init_prev": 0.0005,
                "beta": 0.165,
                "sigma": 0.25,
                "gamma": 0.125,
                "mu": 0.00011,
                "seasonal_factor": 1.91,
                "peak_weeks": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 45, 46, 47, 48, 49, 50, 51, 52],
                "r0": 1.5,
                "incubation_period": 4,
                "infectious_period": 8,
                "vaccination_coverage": 0.15
            }
        }
    
    def get_disease_parameters(self, disease: str) -> Dict[str, Any]:
        """Get disease-specific SEIR parameters"""
        return self.default_parameters.get(disease, self.default_parameters["COVID"])
    
    def run_seir_simulation(self, 
                          disease: str,
                          population_size: int = 5000,
                          duration_days: int = 365,
                          custom_parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Run SEIR simulation with optional custom parameters"""
        
        # Get parameters (custom or default)
        if custom_parameters:
            params = {**self.get_disease_parameters(disease), **custom_parameters}
        else:
            params = self.get_disease_parameters(disease)
        
        logger.info(f"Running SEIR simulation for {disease} with population {population_size}, duration {duration_days} days")
        
        # Initialize compartments
        S = np.zeros(duration_days)  # Susceptible
        E = np.zeros(duration_days)  # Exposed
        I = np.zeros(duration_days)  # Infected
        R = np.zeros(duration_days)  # Recovered
        D = np.zeros(duration_days)  # Deaths
        
        # Initial conditions
        S[0] = population_size * (1 - params["init_prev"])
        E[0] = population_size * params["init_prev"] * 0.1  # 10% of initial infected are exposed
        I[0] = population_size * params["init_prev"] * 0.9  # 90% of initial infected are infectious
        R[0] = 0
        D[0] = 0
        
        # SEIR model parameters
        beta = params["beta"]
        sigma = params["sigma"]  # Incubation rate
        gamma = params["gamma"]  # Recovery rate
        mu = params["mu"]       # Mortality rate
        
        # Run SEIR simulation
        for t in range(duration_days - 1):
            # Calculate seasonal factor
            seasonal_factor = self._calculate_seasonal_factor(t, params)
            
            # SEIR equations
            # dS/dt = -β(t) * S * I
            # dE/dt = β(t) * S * I - σ * E
            # dI/dt = σ * E - γ * I - μ * I
            # dR/dt = γ * I
            # dD/dt = μ * I
            
            new_infections = beta * seasonal_factor * S[t] * I[t] / population_size
            new_exposed = new_infections
            new_infectious = sigma * E[t]
            new_recoveries = gamma * I[t]
            new_deaths = mu * I[t]
            
            # Update compartments
            S[t+1] = max(0, S[t] - new_exposed)
            E[t+1] = max(0, E[t] + new_exposed - new_infectious)
            I[t+1] = max(0, I[t] + new_infectious - new_recoveries - new_deaths)
            R[t+1] = R[t] + new_recoveries
            D[t+1] = D[t] + new_deaths
            
            # Ensure population conservation
            total_pop = S[t+1] + E[t+1] + I[t+1] + R[t+1] + D[t+1]
            if total_pop > 0:
                scale_factor = population_size / total_pop
                S[t+1] *= scale_factor
                E[t+1] *= scale_factor
                I[t+1] *= scale_factor
                R[t+1] *= scale_factor
                D[t+1] *= scale_factor
        
        # Calculate summary statistics
        peak_exposed = np.max(E)
        peak_infected = np.max(I)
        total_infected = np.sum(I)
        total_deaths = np.max(D)
        attack_rate = (np.max(R) + np.max(D)) / population_size
        
        # Find peak days
        peak_exposed_day = np.argmax(E)
        peak_infected_day = np.argmax(I)
        
        return {
            "success": True,
            "disease": disease,
            "model_type": "SEIR",
            "population_size": population_size,
            "duration_days": duration_days,
            "parameters": params,
            "time_series": {
                "time": list(range(duration_days)),
                "susceptible": S.tolist(),
                "exposed": E.tolist(),
                "infected": I.tolist(),
                "recovered": R.tolist(),
                "deaths": D.tolist()
            },
            "summary": {
                "peak_exposed": float(peak_exposed),
                "peak_infected": float(peak_infected),
                "peak_exposed_day": int(peak_exposed_day),
                "peak_infected_day": int(peak_infected_day),
                "total_infected": float(total_infected),
                "total_deaths": float(total_deaths),
                "attack_rate": float(attack_rate),
                "case_fatality_rate": float(total_deaths / total_infected) if total_infected > 0 else 0,
                "r0": params["r0"],
                "incubation_period": params["incubation_period"],
                "infectious_period": params["infectious_period"]
            },
            "timestamp": datetime.now().isoformat()
        }
    
    def _calculate_seasonal_factor(self, day: int, params: Dict[str, Any]) -> float:
        """Calculate seasonal factor for a given day"""
        week = (day // 7) % 52
        if week in params["peak_weeks"]:
            return params["seasonal_factor"]
        return 1.0
    
    def run_parameter_sensitivity_analysis(self, 
                                         disease: str,
                                         parameter_name: str,
                                         parameter_range: List[float],
                                         population_size: int = 5000,
                                         duration_days: int = 365) -> Dict[str, Any]:
        """Run sensitivity analysis for a specific parameter"""
        
        results = {}
        base_params = self.get_disease_parameters(disease)
        
        for param_value in parameter_range:
            custom_params = {parameter_name: param_value}
            sim_result = self.run_seir_simulation(
                disease=disease,
                population_size=population_size,
                duration_days=duration_days,
                custom_parameters=custom_params
            )
            
            results[f"{parameter_name}_{param_value}"] = {
                "parameter_value": param_value,
                "peak_infected": sim_result["summary"]["peak_infected"],
                "total_infected": sim_result["summary"]["total_infected"],
                "attack_rate": sim_result["summary"]["attack_rate"],
                "case_fatality_rate": sim_result["summary"]["case_fatality_rate"]
            }
        
        return {
            "disease": disease,
            "parameter": parameter_name,
            "parameter_range": parameter_range,
            "sensitivity_results": results,
            "timestamp": datetime.now().isoformat()
        }
    
    def compare_sir_vs_seir(self, 
                           disease: str,
                           population_size: int = 5000,
                           duration_days: int = 365) -> Dict[str, Any]:
        """Compare SIR vs SEIR models for the same disease"""
        
        # Run SEIR simulation
        seir_result = self.run_seir_simulation(
            disease=disease,
            population_size=population_size,
            duration_days=duration_days
        )
        
        # Run SIR simulation (convert SEIR to SIR by removing exposed compartment)
        sir_params = self.get_disease_parameters(disease).copy()
        # Combine exposed and infected compartments for SIR
        sir_params["beta"] = sir_params["beta"] * 1.1  # Slightly higher transmission to compensate
        
        sir_result = self._run_sir_simulation(
            disease=disease,
            population_size=population_size,
            duration_days=duration_days,
            parameters=sir_params
        )
        
        return {
            "disease": disease,
            "population_size": population_size,
            "duration_days": duration_days,
            "seir_results": seir_result,
            "sir_results": sir_result,
            "comparison": {
                "peak_infected_seir": seir_result["summary"]["peak_infected"],
                "peak_infected_sir": sir_result["summary"]["peak_infected"],
                "total_infected_seir": seir_result["summary"]["total_infected"],
                "total_infected_sir": sir_result["summary"]["total_infected"],
                "attack_rate_seir": seir_result["summary"]["attack_rate"],
                "attack_rate_sir": sir_result["summary"]["attack_rate"]
            },
            "timestamp": datetime.now().isoformat()
        }
    
    def _run_sir_simulation(self, 
                           disease: str,
                           population_size: int,
                           duration_days: int,
                           parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Run SIR simulation for comparison"""
        
        # Initialize compartments
        S = np.zeros(duration_days)
        I = np.zeros(duration_days)
        R = np.zeros(duration_days)
        D = np.zeros(duration_days)
        
        # Initial conditions
        S[0] = population_size * (1 - parameters["init_prev"])
        I[0] = population_size * parameters["init_prev"]
        R[0] = 0
        D[0] = 0
        
        # SIR model parameters
        beta = parameters["beta"]
        gamma = parameters["gamma"]
        mu = parameters["mu"]
        
        # Run SIR simulation
        for t in range(duration_days - 1):
            seasonal_factor = self._calculate_seasonal_factor(t, parameters)
            
            new_infections = beta * seasonal_factor * S[t] * I[t] / population_size
            new_recoveries = gamma * I[t]
            new_deaths = mu * I[t]
            
            S[t+1] = max(0, S[t] - new_infections)
            I[t+1] = max(0, I[t] + new_infections - new_recoveries - new_deaths)
            R[t+1] = R[t] + new_recoveries
            D[t+1] = D[t] + new_deaths
        
        # Calculate summary statistics
        peak_infected = np.max(I)
        total_infected = np.sum(I)
        total_deaths = np.max(D)
        attack_rate = (np.max(R) + np.max(D)) / population_size
        
        return {
            "success": True,
            "disease": disease,
            "model_type": "SIR",
            "population_size": population_size,
            "duration_days": duration_days,
            "time_series": {
                "time": list(range(duration_days)),
                "susceptible": S.tolist(),
                "infected": I.tolist(),
                "recovered": R.tolist(),
                "deaths": D.tolist()
            },
            "summary": {
                "peak_infected": float(peak_infected),
                "total_infected": float(total_infected),
                "total_deaths": float(total_deaths),
                "attack_rate": float(attack_rate),
                "case_fatality_rate": float(total_deaths / total_infected) if total_infected > 0 else 0
            }
        }
    
    def get_parameter_descriptions(self) -> Dict[str, str]:
        """Get descriptions of all SEIR parameters"""
        return {
            "init_prev": "Initial prevalence - proportion of population initially infected",
            "beta": "Transmission rate - rate of disease spread per contact",
            "sigma": "Incubation rate - rate of progression from exposed to infected (1/incubation_period)",
            "gamma": "Recovery rate - rate of recovery from infection (1/infectious_period)",
            "mu": "Mortality rate - rate of death from infection",
            "seasonal_factor": "Seasonal amplification factor during peak periods",
            "peak_weeks": "Epidemiological weeks when seasonal factor applies",
            "r0": "Basic reproduction number - average secondary infections per case",
            "incubation_period": "Average time from exposure to becoming infectious (days)",
            "infectious_period": "Average time spent infectious before recovery (days)",
            "vaccination_coverage": "Proportion of population vaccinated"
        }
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Validate user-provided parameters"""
        validation_result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "suggestions": []
        }
        
        # Check required parameters
        required_params = ["init_prev", "beta", "sigma", "gamma", "mu"]
        for param in required_params:
            if param not in parameters:
                validation_result["errors"].append(f"Missing required parameter: {param}")
                validation_result["valid"] = False
        
        # Validate parameter ranges
        if "init_prev" in parameters:
            if not 0 <= parameters["init_prev"] <= 1:
                validation_result["errors"].append("init_prev must be between 0 and 1")
                validation_result["valid"] = False
        
        if "beta" in parameters:
            if parameters["beta"] < 0:
                validation_result["errors"].append("beta must be non-negative")
                validation_result["valid"] = False
        
        if "sigma" in parameters:
            if parameters["sigma"] <= 0:
                validation_result["errors"].append("sigma must be positive")
                validation_result["valid"] = False
        
        if "gamma" in parameters:
            if parameters["gamma"] <= 0:
                validation_result["errors"].append("gamma must be positive")
                validation_result["valid"] = False
        
        if "mu" in parameters:
            if parameters["mu"] < 0:
                validation_result["errors"].append("mu must be non-negative")
                validation_result["valid"] = False
        
        # Check R0 consistency
        if all(p in parameters for p in ["beta", "gamma"]):
            r0 = parameters["beta"] / parameters["gamma"]
            if r0 < 0.5:
                validation_result["warnings"].append(f"R0 = {r0:.2f} is very low, disease may not spread")
            elif r0 > 5:
                validation_result["warnings"].append(f"R0 = {r0:.2f} is very high, may cause unrealistic epidemics")
        
        # Check incubation period consistency
        if "sigma" in parameters and "incubation_period" in parameters:
            expected_sigma = 1.0 / parameters["incubation_period"]
            if abs(parameters["sigma"] - expected_sigma) > 0.1:
                validation_result["suggestions"].append(
                    f"sigma ({parameters['sigma']:.3f}) doesn't match incubation_period ({parameters['incubation_period']} days). "
                    f"Expected sigma ≈ {expected_sigma:.3f}"
                )
        
        return validation_result





