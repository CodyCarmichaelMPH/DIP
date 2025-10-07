# Module: model_worker.services.calibration_service
# Purpose: Service for calibrating model parameters to recent data
# Inputs: CalibrationConfig, jurisdiction_id, disease
# Outputs: Calibrated parameters, calibration metrics
# Errors: Data access errors, calibration convergence errors
# Tests: test_calibration_service.py

"""
PSEUDOCODE
1) Initialize service with dependencies
2) Define methods for:
   a. Executing calibration
   b. Loading recent data for calibration
   c. Running calibration optimization
   d. Storing calibrated parameters
3) For calibration execution:
   a. Load recent timeseries data
   b. Set up optimization problem
   c. Run optimization to fit parameters
   d. Validate calibration quality
   e. Store results
"""

import logging
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from scipy.optimize import minimize

from ..adapters.storage_adapter import StorageAdapter
from ..domain.models import CalibrationConfig
from ..domain.seir_model import SEIRModel

logger = logging.getLogger(__name__)

class CalibrationService:
    """Service for calibrating model parameters"""
    
    def __init__(self, storage_adapter: StorageAdapter):
        """Initialize with dependencies"""
        self.storage_adapter = storage_adapter
    
    async def execute_calibration(self, calibration_id: str, calibration_config: CalibrationConfig):
        """Execute a calibration run"""
        try:
            logger.info(f"Starting calibration {calibration_id} for {calibration_config.jurisdiction_id}, disease: {calibration_config.disease}")
            
            # Load recent data for calibration
            recent_data = self._load_recent_data(
                calibration_config.jurisdiction_id,
                calibration_config.disease,
                calibration_config.calibration_window_weeks
            )
            
            if not recent_data:
                raise ValueError("No recent data available for calibration")
            
            # Load disease profile
            disease_profile = self.data_adapter.load_disease_profile(calibration_config.disease)
            
            # Load canonical data snapshot
            data_snapshot = self.data_adapter.load_canonical_snapshot(
                calibration_config.jurisdiction_id,
                calibration_config.disease
            )
            
            # Build population
            population = self._build_population(
                data_snapshot["tracts"],
                data_snapshot["facilities"],
                data_snapshot["demographics"]
            )
            
            # Run calibration optimization
            calibrated_params, metrics = self._run_calibration_optimization(
                population=population,
                disease_profile=disease_profile,
                recent_data=recent_data,
                params_to_fit=calibration_config.params_to_fit,
                stochastic_reps=calibration_config.stochastic_reps
            )
            
            # Store calibrated parameters
            self._store_calibrated_parameters(
                calibration_config.jurisdiction_id,
                calibration_config.disease,
                calibrated_params,
                metrics
            )
            
            logger.info(f"Calibration {calibration_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Error executing calibration {calibration_id}: {str(e)}", exc_info=True)
            # Store error status
            self._store_calibration_error(calibration_id, str(e))
    
    def _load_recent_data(self, jurisdiction_id: str, disease: str, window_weeks: int) -> List[Dict[str, Any]]:
        """Load recent data for calibration"""
        # Load full timeseries
        data_snapshot = self.data_adapter.load_canonical_snapshot(jurisdiction_id, disease)
        timeseries = data_snapshot.get("timeseries", [])
        
        if not timeseries:
            return []
        
        # Sort by date
        timeseries.sort(key=lambda x: x["week_end_date"])
        
        # Get recent data
        cutoff_date = datetime.now() - timedelta(weeks=window_weeks)
        recent_data = [
            ts for ts in timeseries
            if datetime.fromisoformat(ts["week_end_date"]) >= cutoff_date
        ]
        
        logger.info(f"Loaded {len(recent_data)} recent data points for calibration")
        return recent_data
    
    def _build_population(self, tracts, facilities, demographics):
        """Build population structure (same as in run_service)"""
        # This would be the same logic as in run_service
        # For now, return a placeholder
        return []
    
    def _run_calibration_optimization(self, population, disease_profile, recent_data, params_to_fit, stochastic_reps) -> Tuple[Dict[str, Any], Dict[str, float]]:
        """Run calibration optimization"""
        # Get base parameters
        base_params = disease_profile["parameters"].copy()
        
        # Define parameter bounds
        param_bounds = self._get_parameter_bounds(params_to_fit)
        
        # Define objective function
        def objective(params):
            # Update parameters
            updated_params = base_params.copy()
            for i, param_name in enumerate(params_to_fit):
                updated_params[param_name] = params[i]
            
            # Run simulation
            model = SEIRModel(
                population=population,
                params=updated_params,
                contact_layers=disease_profile["contact_layers"],
                facility_impact_weights=disease_profile["facility_impact_weights"]
            )
            
            # Run multiple stochastic repetitions
            results = []
            for _ in range(min(stochastic_reps, 10)):  # Limit for calibration
                result = model.run_simulation(
                    initial_conditions=self._get_initial_conditions(recent_data, updated_params),
                    start_date=datetime.fromisoformat(recent_data[0]["week_end_date"]),
                    num_weeks=len(recent_data)
                )
                results.append(result)
            
            # Calculate objective (RMSE)
            rmse = self._calculate_rmse(results, recent_data)
            return rmse
        
        # Run optimization
        initial_params = [base_params[param] for param in params_to_fit]
        
        result = minimize(
            objective,
            initial_params,
            method="L-BFGS-B",
            bounds=param_bounds,
            options={"maxiter": 100}
        )
        
        # Extract calibrated parameters
        calibrated_params = base_params.copy()
        for i, param_name in enumerate(params_to_fit):
            calibrated_params[param_name] = result.x[i]
        
        # Calculate metrics
        metrics = {
            "rmse": result.fun,
            "converged": result.success,
            "iterations": result.nit,
            "calibration_date": datetime.now().isoformat()
        }
        
        logger.info(f"Calibration completed with RMSE: {result.fun:.4f}")
        return calibrated_params, metrics
    
    def _get_parameter_bounds(self, params_to_fit: List[str]) -> List[Tuple[float, float]]:
        """Get parameter bounds for optimization"""
        bounds = []
        
        for param in params_to_fit:
            if param == "transmissibility_base":
                bounds.append((0.5, 2.0))
            elif param == "detection_multiplier":
                bounds.append((0.1, 0.8))
            elif param == "incubation_period_days":
                bounds.append((1.0, 10.0))
            elif param == "infectious_period_days":
                bounds.append((3.0, 14.0))
            else:
                # Default bounds
                bounds.append((0.1, 10.0))
        
        return bounds
    
    def _get_initial_conditions(self, recent_data, params):
        """Get initial conditions from recent data"""
        # Use the same logic as in run_service
        # For now, return default conditions
        return {
            "S": 0.9,
            "E": 0.01,
            "I": 0.01,
            "R": 0.08
        }
    
    def _calculate_rmse(self, results, observed_data):
        """Calculate RMSE between simulated and observed data"""
        if not results or not observed_data:
            return float("inf")
        
        # Aggregate results across repetitions
        aggregated_results = self._aggregate_calibration_results(results)
        
        # Calculate RMSE for each metric
        total_rmse = 0.0
        metric_count = 0
        
        for metric in ["cases", "hospitalizations", "ed_visits"]:
            if metric in aggregated_results and metric in observed_data[0]:
                simulated = aggregated_results[metric]
                observed = [point.get(metric, 0) for point in observed_data]
                
                if len(simulated) == len(observed):
                    mse = np.mean([(s - o) ** 2 for s, o in zip(simulated, observed)])
                    rmse = np.sqrt(mse)
                    total_rmse += rmse
                    metric_count += 1
        
        return total_rmse / metric_count if metric_count > 0 else float("inf")
    
    def _aggregate_calibration_results(self, results):
        """Aggregate results from multiple repetitions"""
        if not results:
            return {}
        
        # Calculate mean across repetitions
        aggregated = {}
        
        for metric in ["cases", "hospitalizations", "ed_visits"]:
            if metric in results[0]["metrics"]:
                values = []
                for result in results:
                    if metric in result["metrics"]:
                        values.append([point["value"] for point in result["metrics"][metric]])
                
                if values:
                    # Calculate mean across repetitions
                    mean_values = np.mean(values, axis=0)
                    aggregated[metric] = mean_values.tolist()
        
        return aggregated
    
    def _store_calibrated_parameters(self, jurisdiction_id: str, disease: str, params: Dict[str, Any], metrics: Dict[str, float]):
        """Store calibrated parameters"""
        calibration_data = {
            "jurisdiction_id": jurisdiction_id,
            "disease": disease,
            "parameters": params,
            "metrics": metrics,
            "created_at": datetime.now().isoformat()
        }
        
        # Store in local file for now
        import json
        calibration_path = f"local_artifacts/calibration_{jurisdiction_id}_{disease}_{datetime.now().strftime('%Y%m%d')}.json"
        
        with open(calibration_path, "w") as f:
            json.dump(calibration_data, f, indent=2, default=str)
        
        logger.info(f"Stored calibrated parameters at {calibration_path}")
    
    def _store_calibration_error(self, calibration_id: str, error_message: str):
        """Store calibration error"""
        error_data = {
            "calibration_id": calibration_id,
            "error": error_message,
            "failed_at": datetime.now().isoformat()
        }
        
        # Store in local file for now
        import json
        error_path = f"local_artifacts/calibration_error_{calibration_id}.json"
        
        with open(error_path, "w") as f:
            json.dump(error_data, f, indent=2, default=str)
        
        logger.info(f"Stored calibration error at {error_path}")



