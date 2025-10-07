# Module: model_worker.services.run_service
# Purpose: Service for executing and managing simulation runs
# Inputs: RunConfig, run_id
# Outputs: Run status, results, and artifacts
# Errors: Data access errors, model errors, parameter validation errors
# Tests: test_run_service.py

"""
PSEUDOCODE
1) Initialize service with dependencies (storage, data adapters)
2) Define methods for:
   a. Executing a run (main workflow)
   b. Getting run status
   c. Getting run results
3) For run execution:
   a. Update run status to "running"
   b. Load canonical data snapshot
   c. Load disease profile
   d. Build meta-agent population
   e. Execute stochastic repetitions
   f. Aggregate results and calculate percentiles
   g. Generate artifacts (JSON, CSV, PDF)
   h. Update run status to "completed"
   i. Handle errors and update status to "failed" if needed
"""

import json
import logging
import os
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

import pandas as pd
import numpy as np

from ..domain.models import RunConfig, RunStatus, RunResult
from ..adapters.storage_adapter import StorageAdapter
from ..domain.seir_model import SEIRModel
from .artifact_generator import ArtifactGenerator

logger = logging.getLogger(__name__)

class RunService:
    """Service for executing and managing simulation runs"""
    
    def __init__(self, storage_adapter: StorageAdapter):
        """Initialize with dependencies"""
        self.storage_adapter = storage_adapter
        self.artifact_generator = ArtifactGenerator(storage_adapter)
    
    async def execute_run(self, run_id: str, run_config: RunConfig):
        """Execute a simulation run"""
        try:
            # Update run status to "running"
            self._update_run_status(run_id, RunStatus.RUNNING)
            logger.info(f"Starting run {run_id} for {run_config.jurisdiction_id}, disease: {run_config.disease}")
            
            # Load canonical data snapshot
            data_snapshot = self.data_adapter.load_canonical_snapshot(
                run_config.jurisdiction_id,
                run_config.disease
            )
            logger.info(f"Loaded data snapshot for {run_config.jurisdiction_id}")
            
            # Load disease profile
            disease_profile = self.data_adapter.load_disease_profile(run_config.disease)
            logger.info(f"Loaded disease profile for {run_config.disease}")
            
            # Load calibrated parameters if requested
            params = disease_profile["parameters"]
            if run_config.use_calibrated_params:
                calibrated_params = self.data_adapter.load_calibrated_params(
                    run_config.jurisdiction_id,
                    run_config.disease
                )
                if calibrated_params:
                    params.update(calibrated_params)
                    logger.info(f"Applied calibrated parameters for {run_config.disease}")
                else:
                    logger.warning(f"No calibrated parameters found for {run_config.disease}, using defaults")
            
            # Build meta-agent population
            population = self._build_population(
                data_snapshot["tracts"],
                data_snapshot["facilities"],
                data_snapshot["demographics"]
            )
            logger.info(f"Built meta-agent population with {len(population)} agents")
            
            # Compute initial conditions
            initial_conditions = self._compute_initial_conditions(
                data_snapshot["timeseries"],
                params,
                run_config.start_date
            )
            logger.info("Computed initial conditions")
            
            # Initialize model
            model = SEIRModel(
                population=population,
                params=params,
                contact_layers=disease_profile["contact_layers"],
                facility_impact_weights=disease_profile["facility_impact_weights"]
            )
            
            # Execute stochastic repetitions
            logger.info(f"Running {run_config.stochastic_reps} stochastic repetitions")
            results = []
            for i in range(run_config.stochastic_reps):
                if i % 10 == 0:
                    logger.info(f"Completed {i}/{run_config.stochastic_reps} repetitions")
                
                # Set up seeding based on mode
                if run_config.seeding_mode == "simulate_introduction":
                    model.set_introductions(run_config.introductions)
                else:  # probabilistic
                    model.set_probabilistic_seeding()
                
                # Apply interventions if any
                for intervention in run_config.interventions:
                    model.apply_intervention(intervention)
                
                # Run single repetition
                rep_result = model.run_simulation(
                    initial_conditions=initial_conditions,
                    start_date=run_config.start_date,
                    num_weeks=run_config.run_length_weeks
                )
                results.append(rep_result)
            
            logger.info(f"Completed all {run_config.stochastic_reps} repetitions")
            
            # Aggregate results and calculate percentiles
            aggregated_results = self._aggregate_results(results)
            logger.info("Aggregated results and calculated percentiles")
            
            # Generate artifacts
            artifacts = self.artifact_generator.generate_artifacts(
                run_id=run_id,
                run_config=run_config,
                results=aggregated_results,
                data_snapshot=data_snapshot
            )
            logger.info(f"Generated {len(artifacts)} artifacts")
            
            # Create run result object
            run_result = RunResult(
                run_id=run_id,
                config=run_config,
                created_at=datetime.now(),
                completed_at=datetime.now(),
                results=aggregated_results["timeseries"],
                facility_impacts=aggregated_results["facility_impacts"],
                artifacts=artifacts,
                calibration_metrics=self._get_calibration_metrics(run_config.disease, run_config.jurisdiction_id),
                provenance=self._get_provenance_info(data_snapshot)
            )
            
            # Store run result
            self.storage_adapter.store_run_result(run_id, run_result)
            logger.info(f"Stored run result for {run_id}")
            
            # Update run status to "completed"
            self._update_run_status(run_id, RunStatus.COMPLETED)
            logger.info(f"Run {run_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Error executing run {run_id}: {str(e)}", exc_info=True)
            self._update_run_status(run_id, RunStatus.FAILED, error_message=str(e))
    
    def get_run_status(self, run_id: str) -> Dict[str, Any]:
        """Get the status of a run"""
        try:
            status_data = self.storage_adapter.get_run_status(run_id)
            return status_data
        except Exception as e:
            logger.error(f"Error getting run status for {run_id}: {str(e)}")
            raise ValueError(f"Run {run_id} not found")
    
    def get_run_results(self, run_id: str) -> RunResult:
        """Get the results of a completed run"""
        try:
            run_result = self.storage_adapter.get_run_result(run_id)
            return run_result
        except Exception as e:
            logger.error(f"Error getting run results for {run_id}: {str(e)}")
            raise ValueError(f"Results for run {run_id} not found")
    
    def _update_run_status(self, run_id: str, status: RunStatus, error_message: Optional[str] = None):
        """Update the status of a run"""
        status_data = {
            "run_id": run_id,
            "status": status,
            "updated_at": datetime.now().isoformat()
        }
        if error_message:
            status_data["error_message"] = error_message
        
        self.storage_adapter.update_run_status(run_id, status_data)
    
    def _build_population(self, tracts, facilities, demographics):
        """Build meta-agent population from tract and facility data"""
        # This would be a complex method to build the population structure
        # For now, we'll return a placeholder
        population = []
        
        # Process tracts
        for tract in tracts:
            tract_fips = tract["properties"]["GEOID20"]
            tract_demo = next((d for d in demographics if d["tract_fips"] == tract_fips), None)
            
            if tract_demo:
                # Create meta-agents for each age group in this tract
                for age_group, count in tract_demo["age_distribution"].items():
                    population.append({
                        "type": "tract",
                        "tract_fips": tract_fips,
                        "age_group": age_group,
                        "count": count
                    })
        
        # Process facilities
        for facility in facilities:
            # Create meta-agents for each facility by age group
            for age_group, count in facility.get("resident_age_profile", {}).items():
                if count > 0:
                    population.append({
                        "type": "facility",
                        "facility_id": facility["facility_id"],
                        "facility_type": facility["type"],
                        "tract_fips": facility["tract_fips"],
                        "age_group": age_group,
                        "count": count,
                        "group": "resident"
                    })
            
            # Add staff as a separate meta-agent
            if facility.get("staff_count", 0) > 0:
                population.append({
                    "type": "facility",
                    "facility_id": facility["facility_id"],
                    "facility_type": facility["type"],
                    "tract_fips": facility["tract_fips"],
                    "age_group": "staff",  # Simplified - in reality would be distributed
                    "count": facility["staff_count"],
                    "group": "staff"
                })
        
        return population
    
    def _compute_initial_conditions(self, timeseries, params, start_date):
        """Compute initial conditions from recent timeseries data"""
        # This would compute S, E, I, R fractions for each meta-agent
        # For now, return a placeholder
        
        # Get recent data leading up to start_date
        recent_data = [ts for ts in timeseries if ts["week_end_date"] <= start_date]
        recent_data.sort(key=lambda x: x["week_end_date"])
        
        # Use the most recent 4 weeks to estimate current state
        recent_weeks = recent_data[-4:] if len(recent_data) >= 4 else recent_data
        
        if not recent_weeks:
            logger.warning("No recent data found for initial conditions, using defaults")
            return {
                "S": 0.9,  # 90% susceptible
                "E": 0.01,  # 1% exposed
                "I": 0.01,  # 1% infectious
                "R": 0.08   # 8% recovered
            }
        
        # Estimate current infectious based on recent cases and detection multiplier
        detection_multiplier = params.get("detection_multiplier", 0.3)
        avg_weekly_cases = sum(week.get("cases", 0) for week in recent_weeks) / len(recent_weeks)
        estimated_infectious = avg_weekly_cases / detection_multiplier
        
        # Estimate immune fraction from vaccination and natural immunity
        vaccination_coverage = recent_weeks[-1].get("vaccinations", {})
        avg_vaccination_rate = sum(vaccination_coverage.values()) / len(vaccination_coverage) if vaccination_coverage else 0.2
        
        # Simple SEIR fractions - would be more complex in real implementation
        infectious_fraction = min(0.05, estimated_infectious / 100000)  # Cap at 5%
        recovered_fraction = 0.3  # Assume 30% have some immunity from prior infection
        vaccinated_effective = avg_vaccination_rate * params.get("vaccine_effectiveness", {}).get("transmission", 0.5)
        
        susceptible_fraction = max(0.1, 1.0 - infectious_fraction - recovered_fraction - vaccinated_effective)
        exposed_fraction = infectious_fraction * 0.5  # Assume half as many exposed as infectious
        
        return {
            "S": susceptible_fraction,
            "E": exposed_fraction,
            "I": infectious_fraction,
            "R": recovered_fraction + vaccinated_effective
        }
    
    def _aggregate_results(self, results):
        """Aggregate results from multiple stochastic repetitions"""
        # This would calculate percentiles and summary statistics
        # For now, return a placeholder
        
        # Placeholder for timeseries metrics
        metrics = ["cases", "hospitalizations", "ed_visits"]
        timeseries_results = {}
        
        for metric in metrics:
            # Create placeholder percentile timeseries
            timeseries_results[metric] = {
                "p5": [{"date": "2025-09-20", "value": 10}],
                "p25": [{"date": "2025-09-20", "value": 20}],
                "p50": [{"date": "2025-09-20", "value": 30}],
                "p75": [{"date": "2025-09-20", "value": 40}],
                "p95": [{"date": "2025-09-20", "value": 50}]
            }
        
        # Placeholder for facility impacts
        facility_impacts = [
            {
                "facility_id": "fac_001",
                "name": "Sample Nursing Home",
                "type": "nursing_home",
                "risk_band": "medium",
                "expected_cases": 12.5,
                "case_range": {"low": 5, "high": 25},
                "capacity_impact_pct": 15.0
            }
        ]
        
        return {
            "timeseries": timeseries_results,
            "facility_impacts": facility_impacts
        }
    
    def _get_calibration_metrics(self, disease, jurisdiction_id):
        """Get metrics about calibration quality"""
        # This would retrieve actual calibration metrics
        # For now, return placeholders
        return {
            "rmse": 0.15,
            "coverage_pct": 85.0,
            "last_calibrated": "2025-09-15"
        }
    
    def _get_provenance_info(self, data_snapshot):
        """Get provenance information about data sources"""
        # This would include data sources, versions, etc.
        # For now, return placeholders
        return {
            "data_sources": [
                {"name": "WA DOH Surveillance", "version": "2025-09-15"},
                {"name": "Census Tracts", "version": "2020"}
            ],
            "freshness_days": 5,
            "notes": "Using latest available data as of run creation"
        }

