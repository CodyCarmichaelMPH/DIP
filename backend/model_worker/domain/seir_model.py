# Module: model_worker.domain.seir_model
# Purpose: SEIR disease transmission model for meta-agents
# Inputs: Population structure, parameters, contact layers, initial conditions
# Outputs: Simulation results over time
# Errors: Parameter validation errors, numerical instability
# Tests: test_seir_model.py

"""
PSEUDOCODE
1) Initialize model with population structure and parameters
2) Define methods for:
   a. Setting up initial conditions
   b. Setting up introductions or probabilistic seeding
   c. Applying interventions
   d. Running a single simulation
   e. Advancing the model one timestep
   f. Computing force of infection
   g. Transitioning between compartments
   h. Aggregating results
3) For each timestep:
   a. Compute force of infection for each meta-agent
   b. Transition between compartments (S→E→I→R)
   c. Apply interventions and seasonal forcing
   d. Record state for output
4) Return timeseries and summary statistics
"""

import logging
import random
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

class SEIRModel:
    """SEIR disease transmission model for meta-agents"""
    
    def __init__(self, population, params, contact_layers, facility_impact_weights):
        """Initialize the model with population and parameters"""
        self.population = population
        self.params = params
        self.contact_layers = contact_layers
        self.facility_impact_weights = facility_impact_weights
        self.introductions = []
        self.interventions = []
        self.random_state = np.random.RandomState()
        
        # Validate inputs
        self._validate_inputs()
    
    def _validate_inputs(self):
        """Validate model inputs"""
        required_params = [
            "transmissibility_base",
            "incubation_period_days",
            "infectious_period_days",
            "detection_multiplier"
        ]
        
        for param in required_params:
            if param not in self.params:
                raise ValueError(f"Missing required parameter: {param}")
        
        if not self.population:
            raise ValueError("Population cannot be empty")
    
    def set_random_seed(self, seed):
        """Set random seed for reproducibility"""
        self.random_state = np.random.RandomState(seed)
    
    def set_introductions(self, introductions):
        """Set specific introductions for the simulation"""
        self.introductions = introductions
    
    def set_probabilistic_seeding(self, external_force=None):
        """Set probabilistic seeding based on external force"""
        # If no external force provided, use a default low value
        self.external_force = external_force or 0.0001
    
    def apply_intervention(self, intervention):
        """Apply an intervention to the model"""
        self.interventions.append(intervention)
        logger.info(f"Applied intervention: {intervention.type} to {intervention.target}")
    
    def run_simulation(self, initial_conditions, start_date, num_weeks):
        """Run a single simulation"""
        # Set up time parameters
        days_per_timestep = 1  # Daily timesteps
        total_timesteps = num_weeks * 7
        
        # Initialize compartments for each meta-agent
        compartments = self._initialize_compartments(initial_conditions)
        
        # Set up data structures for results
        dates = [start_date + timedelta(days=t) for t in range(total_timesteps)]
        results = {
            "dates": dates,
            "compartments": [],
            "metrics": {
                "cases": np.zeros(total_timesteps),
                "hospitalizations": np.zeros(total_timesteps),
                "ed_visits": np.zeros(total_timesteps)
            },
            "facility_impacts": {}
        }
        
        # Process introductions at the start
        if self.introductions:
            self._process_introductions(compartments)
        
        # Run the simulation timestep by timestep
        for t in range(total_timesteps):
            current_date = dates[t]
            
            # Save current state
            results["compartments"].append(self._copy_compartments(compartments))
            
            # Apply seasonal forcing
            seasonal_factor = self._calculate_seasonal_factor(current_date)
            
            # Compute force of infection
            foi = self._compute_force_of_infection(compartments, seasonal_factor)
            
            # Transition between compartments
            new_cases = self._update_compartments(compartments, foi, days_per_timestep)
            
            # Apply interventions that are active
            self._apply_active_interventions(compartments, current_date)
            
            # Record metrics
            results["metrics"]["cases"][t] = new_cases
            results["metrics"]["hospitalizations"][t] = self._calculate_hospitalizations(new_cases, compartments)
            results["metrics"]["ed_visits"][t] = self._calculate_ed_visits(new_cases, compartments)
        
        # Calculate facility impacts
        results["facility_impacts"] = self._calculate_facility_impacts(results)
        
        # Convert results to the expected output format
        formatted_results = self._format_results(results, dates)
        
        return formatted_results
    
    def _initialize_compartments(self, initial_conditions):
        """Initialize compartments for each meta-agent"""
        compartments = {}
        
        for agent in self.population:
            agent_id = self._get_agent_id(agent)
            count = agent.get("count", 0)
            
            # Initialize with the same fractions for all agents
            # In a real implementation, this would be more nuanced based on location, age, etc.
            compartments[agent_id] = {
                "S": int(count * initial_conditions["S"]),
                "E": int(count * initial_conditions["E"]),
                "I": int(count * initial_conditions["I"]),
                "R": int(count * initial_conditions["R"]),
                "total": count,
                "agent": agent  # Store reference to the original agent data
            }
            
            # Ensure the total is preserved
            total = compartments[agent_id]["S"] + compartments[agent_id]["E"] + compartments[agent_id]["I"] + compartments[agent_id]["R"]
            if total != count:
                # Adjust susceptible to make the total correct
                compartments[agent_id]["S"] += (count - total)
        
        return compartments
    
    def _get_agent_id(self, agent):
        """Generate a unique ID for a meta-agent"""
        if agent["type"] == "tract":
            return f"tract_{agent['tract_fips']}_{agent['age_group']}"
        else:  # facility
            return f"facility_{agent['facility_id']}_{agent['age_group']}_{agent['group']}"
    
    def _process_introductions(self, compartments):
        """Process introductions at the start of the simulation"""
        for intro in self.introductions:
            # Find the relevant agents
            if intro.get("facility_id"):
                target_agents = [
                    agent_id for agent_id, comp in compartments.items()
                    if "facility" in agent_id and intro["facility_id"] in agent_id and intro["group"] in agent_id
                ]
            else:  # tract_fips
                target_agents = [
                    agent_id for agent_id, comp in compartments.items()
                    if "tract" in agent_id and intro["tract_fips"] in agent_id
                ]
            
            if not target_agents:
                logger.warning(f"No matching agents found for introduction: {intro}")
                continue
            
            # Distribute introductions across matching agents
            introductions_per_agent = max(1, intro["num_introductions"] // len(target_agents))
            
            for agent_id in target_agents:
                # Move people from S to I
                to_move = min(introductions_per_agent, compartments[agent_id]["S"])
                compartments[agent_id]["S"] -= to_move
                compartments[agent_id]["I"] += to_move
                
                logger.info(f"Introduced {to_move} infections to {agent_id}")
    
    def _compute_force_of_infection(self, compartments, seasonal_factor):
        """Compute force of infection for each meta-agent"""
        # Base transmissibility adjusted by seasonal factor
        base_transmissibility = self.params["transmissibility_base"] * seasonal_factor
        
        # Calculate infectious pressure from each agent
        infectious_pressure = {}
        for agent_id, comp in compartments.items():
            agent = comp["agent"]
            infectious = comp["I"]
            
            if infectious == 0:
                continue
            
            # Normalize by population size
            normalized_infectious = infectious / comp["total"] if comp["total"] > 0 else 0
            
            # Apply different weights based on agent type and contact layer
            if agent["type"] == "tract":
                infectious_pressure[agent_id] = normalized_infectious * base_transmissibility * self.contact_layers["community"]
            else:  # facility
                facility_type = agent["facility_type"]
                contact_multiplier = self.contact_layers.get(facility_type, 1.0)
                infectious_pressure[agent_id] = normalized_infectious * base_transmissibility * contact_multiplier
        
        # Calculate force of infection for each agent based on contacts
        foi = {}
        for agent_id, comp in compartments.items():
            agent = comp["agent"]
            foi[agent_id] = 0.0
            
            # Add external force if using probabilistic seeding
            if hasattr(self, "external_force"):
                foi[agent_id] += self.external_force
            
            # Add force from community contacts
            if agent["type"] == "tract":
                tract_fips = agent["tract_fips"]
                
                # Community transmission within same tract
                for other_id, other_comp in compartments.items():
                    other_agent = other_comp["agent"]
                    if other_agent["type"] == "tract" and other_agent["tract_fips"] == tract_fips:
                        foi[agent_id] += infectious_pressure.get(other_id, 0.0) * 0.7  # Higher weight for same tract
                    elif "tract_fips" in other_agent and other_agent["tract_fips"] == tract_fips:
                        foi[agent_id] += infectious_pressure.get(other_id, 0.0) * 0.3  # Lower weight for facilities in same tract
            
            else:  # facility
                facility_id = agent["facility_id"]
                tract_fips = agent["tract_fips"]
                
                # Transmission within facility
                for other_id, other_comp in compartments.items():
                    other_agent = other_comp["agent"]
                    if "facility_id" in other_agent and other_agent["facility_id"] == facility_id:
                        foi[agent_id] += infectious_pressure.get(other_id, 0.0) * 0.8  # High weight for same facility
                
                # Transmission from surrounding tract
                for other_id, other_comp in compartments.items():
                    other_agent = other_comp["agent"]
                    if other_agent["type"] == "tract" and other_agent["tract_fips"] == tract_fips:
                        foi[agent_id] += infectious_pressure.get(other_id, 0.0) * 0.2  # Lower weight from surrounding tract
        
        return foi
    
    def _update_compartments(self, compartments, foi, days_per_timestep):
        """Update compartments based on disease dynamics"""
        total_new_cases = 0
        
        # Get transition probabilities
        incubation_rate = 1.0 / self.params["incubation_period_days"]["mean"]
        recovery_rate = 1.0 / self.params["infectious_period_days"]["mean"]
        
        # Adjust for timestep
        incubation_prob = 1.0 - np.exp(-incubation_rate * days_per_timestep)
        recovery_prob = 1.0 - np.exp(-recovery_rate * days_per_timestep)
        
        # Update each meta-agent
        for agent_id, comp in compartments.items():
            # Calculate number of new exposures (S -> E)
            infection_prob = 1.0 - np.exp(-foi[agent_id] * days_per_timestep)
            new_exposures = self.random_state.binomial(comp["S"], infection_prob)
            
            # Calculate number of new infectious (E -> I)
            new_infectious = self.random_state.binomial(comp["E"], incubation_prob)
            
            # Calculate number of new recoveries (I -> R)
            new_recoveries = self.random_state.binomial(comp["I"], recovery_prob)
            
            # Update compartments
            comp["S"] -= new_exposures
            comp["E"] += new_exposures - new_infectious
            comp["I"] += new_infectious - new_recoveries
            comp["R"] += new_recoveries
            
            # Track new cases
            total_new_cases += new_infectious
        
        return total_new_cases
    
    def _apply_active_interventions(self, compartments, current_date):
        """Apply interventions that are active on the current date"""
        # This would implement intervention effects
        # For now, it's a placeholder
        pass
    
    def _calculate_seasonal_factor(self, current_date):
        """Calculate seasonal forcing factor based on date"""
        if "seasonal_forcing" not in self.params:
            return 1.0
        
        amplitude = self.params["seasonal_forcing"]["amplitude"]
        peak_month = self.params["seasonal_forcing"]["peak_month"]
        
        # Calculate days from peak (assuming middle of month)
        peak_day = date(current_date.year, peak_month, 15)
        if current_date.month > peak_month:
            peak_day = date(current_date.year + 1, peak_month, 15)
        elif current_date.month < peak_month:
            peak_day = date(current_date.year, peak_month, 15)
        
        days_from_peak = abs((current_date - peak_day).days)
        days_in_year = 365.25
        
        # Cosine seasonal forcing
        seasonal_factor = 1.0 + amplitude * np.cos(2 * np.pi * days_from_peak / days_in_year)
        
        return seasonal_factor
    
    def _calculate_hospitalizations(self, new_cases, compartments):
        """Calculate hospitalizations based on new cases"""
        # Simple calculation based on age-specific hospitalization risk
        hospitalizations = 0
        
        for agent_id, comp in compartments.items():
            agent = comp["agent"]
            age_group = agent.get("age_group", "age_18_49")  # Default if not specified
            
            # Map to standard age groups
            if age_group == "staff":
                age_group = "age_18_49"  # Assume staff are adults
            
            # Get hospitalization risk for this age group
            hosp_risk = self.params.get("hospitalization_risk", {}).get(age_group, 0.01)
            
            # Calculate fraction of new cases from this agent
            agent_fraction = comp["I"] / sum(c["I"] for c in compartments.values()) if sum(c["I"] for c in compartments.values()) > 0 else 0
            
            # Calculate hospitalizations
            agent_hospitalizations = new_cases * agent_fraction * hosp_risk
            hospitalizations += agent_hospitalizations
        
        return hospitalizations
    
    def _calculate_ed_visits(self, new_cases, compartments):
        """Calculate emergency department visits based on new cases"""
        # Simple multiplier on hospitalizations for now
        return self._calculate_hospitalizations(new_cases, compartments) * 2.5
    
    def _calculate_facility_impacts(self, results):
        """Calculate impacts on facilities"""
        facility_impacts = {}
        
        # Group agents by facility
        facilities = {}
        for agent_id, comp in results["compartments"][-1].items():
            agent = comp["agent"]
            if agent["type"] == "facility":
                facility_id = agent["facility_id"]
                if facility_id not in facilities:
                    facilities[facility_id] = {
                        "facility_id": facility_id,
                        "facility_type": agent["facility_type"],
                        "tract_fips": agent["tract_fips"],
                        "agents": []
                    }
                facilities[facility_id]["agents"].append(agent_id)
        
        # Calculate impacts for each facility
        for facility_id, facility in facilities.items():
            # Sum cases across all agents in this facility
            total_cases = 0
            total_population = 0
            
            for agent_id in facility["agents"]:
                for t in range(len(results["dates"])):
                    # Calculate new cases at each timestep
                    if t > 0:
                        new_I = results["compartments"][t][agent_id]["I"] - results["compartments"][t-1][agent_id]["I"] + \
                               (results["compartments"][t-1][agent_id]["I"] - results["compartments"][t][agent_id]["I"]) * \
                               (1.0 / self.params["infectious_period_days"]["mean"])
                        total_cases += max(0, new_I)
                
                total_population += results["compartments"][0][agent_id]["total"]
            
            # Calculate impact metrics
            impact_weight = self.facility_impact_weights.get(facility["facility_type"], 1.0)
            attack_rate = total_cases / total_population if total_population > 0 else 0
            capacity_impact = attack_rate * impact_weight * 100  # As percentage
            
            # Determine risk band
            risk_band = "low"
            if capacity_impact > 30:
                risk_band = "high"
            elif capacity_impact > 15:
                risk_band = "medium"
            
            # Store impact results
            facility_impacts[facility_id] = {
                "facility_id": facility_id,
                "facility_type": facility["facility_type"],
                "total_cases": total_cases,
                "attack_rate": attack_rate,
                "capacity_impact_pct": capacity_impact,
                "risk_band": risk_band
            }
        
        return list(facility_impacts.values())
    
    def _copy_compartments(self, compartments):
        """Create a deep copy of compartments"""
        copy = {}
        for agent_id, comp in compartments.items():
            copy[agent_id] = {
                "S": comp["S"],
                "E": comp["E"],
                "I": comp["I"],
                "R": comp["R"],
                "total": comp["total"],
                "agent": comp["agent"]
            }
        return copy
    
    def _format_results(self, results, dates):
        """Format results for output"""
        # Convert numpy arrays to lists
        metrics = {}
        for metric, values in results["metrics"].items():
            metrics[metric] = [{"date": d.isoformat(), "value": float(v)} for d, v in zip(dates, values)]
        
        # Format facility impacts
        facility_impacts = []
        for impact in results["facility_impacts"]:
            facility_impacts.append({
                "facility_id": impact["facility_id"],
                "type": impact["facility_type"],
                "risk_band": impact["risk_band"],
                "expected_cases": impact["total_cases"],
                "case_range": {
                    "low": impact["total_cases"] * 0.5,  # Simplified range
                    "high": impact["total_cases"] * 1.5
                },
                "capacity_impact_pct": impact["capacity_impact_pct"]
            })
        
        return {
            "metrics": metrics,
            "facility_impacts": facility_impacts
        }

