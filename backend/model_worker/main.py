# Module: model_worker.main
# Purpose: Main entry point for the disease modeling worker service
# Inputs: HTTP requests with run configuration
# Outputs: JSON responses with run status and results
# Errors: Invalid run parameters, data access errors, model errors
# Tests: test_main.py

"""
PSEUDOCODE
1) Initialize FastAPI app and configure middleware
2) Load environment variables and set up logging
3) Define API routes:
   a. Health check endpoint
   b. Run creation endpoint
   c. Run status endpoint
   d. Results retrieval endpoint
   e. Calibration endpoint
4) For each endpoint:
   a. Validate request parameters
   b. Load necessary data (jurisdiction, disease profile)
   c. Process request (create run, check status, etc.)
   d. Return appropriate response
5) For run creation:
   a. Generate run_id
   b. Queue job for async processing
   c. Return 202 Accepted with run_id
6) For run execution:
   a. Load canonical data snapshot
   b. Build meta-agent population
   c. Execute stochastic reps
   d. Aggregate results and write artifacts
   e. Update run status
7) Start server with uvicorn when run as script
"""

import os
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Union

import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Query, Path, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from .domain.models import RunConfig, RunStatus, RunResult, CalibrationConfig, Conversation, Message, ConversationCreate, ConversationUpdate, ConversationResponse, Scenario, ScenarioParameters, ScenarioCreate, ScenarioUpdate, ScenarioResponse, ScenarioShare
from .services.run_service import RunService
from .services.calibration_service import CalibrationService
from .services.starsim_service import StarsimService
from .services.starsim_service_v2 import starsim_service_v2
from .services.seir_service import SEIRService
from .services.conversation_service import conversation_service
from .services.scenario_service import scenario_service
from .services.perplexity_service import perplexity_service
from .adapters.storage_adapter import StorageAdapter

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("model_worker")

# Initialize FastAPI app
app = FastAPI(
    title="Disease Impact Projection - Model Worker",
    description="Service for running disease impact simulations",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services and adapters
storage_adapter = StorageAdapter()
run_service = RunService(storage_adapter)
calibration_service = CalibrationService(storage_adapter)
starsim_service = StarsimService()
seir_service = SEIRService()

# Define API routes
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        v2_available = starsim_service_v2 is not None
    except:
        v2_available = False
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "v2_available": v2_available
    }

@app.post("/runs", status_code=202)
async def create_run(
    run_config: RunConfig, background_tasks: BackgroundTasks
):
    """Create a new simulation run"""
    try:
        # Generate run_id
        run_id = f"run_{datetime.now().strftime('%Y%m%d')}_{str(uuid.uuid4())[:8]}"
        
        # Queue job for async processing
        background_tasks.add_task(
            run_service.execute_run, run_id, run_config
        )
        
        return {"run_id": run_id, "status": "queued"}
    except Exception as e:
        logger.error(f"Error creating run: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/runs/{run_id}")
async def get_run_status(run_id: str = Path(..., description="The ID of the run")):
    """Get the status of a run"""
    try:
        status = run_service.get_run_status(run_id)
        return status
    except Exception as e:
        logger.error(f"Error getting run status: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

@app.get("/runs/{run_id}/results")
async def get_run_results(run_id: str = Path(..., description="The ID of the run")):
    """Get the results of a completed run"""
    try:
        status = run_service.get_run_status(run_id)
        if status["status"] != "completed":
            raise HTTPException(
                status_code=400, 
                detail=f"Run {run_id} is not completed. Current status: {status['status']}"
            )
        
        results = run_service.get_run_results(run_id)
        return results
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting run results: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/calibrate", status_code=202)
async def calibrate(
    calibration_config: CalibrationConfig, background_tasks: BackgroundTasks
):
    """Calibrate model parameters to recent data"""
    try:
        # Generate calibration_id
        calibration_id = f"calib_{datetime.now().strftime('%Y%m%d')}_{str(uuid.uuid4())[:8]}"
        
        # Queue job for async processing
        background_tasks.add_task(
            calibration_service.execute_calibration, calibration_id, calibration_config
        )
        
        return {"calibration_id": calibration_id, "status": "queued"}
    except Exception as e:
        logger.error(f"Error starting calibration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/artifacts/{path:path}")
async def get_artifact(path: str = Path(..., description="Path to the artifact")):
    """Get a signed URL for an artifact"""
    try:
        signed_url = storage_adapter.get_signed_url(path)
        return {"signed_url": signed_url}
    except Exception as e:
        logger.error(f"Error getting artifact: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Artifact {path} not found")

# Starsim endpoints
@app.get("/starsim/status")
async def get_starsim_status():
    """Get Starsim service status"""
    try:
        status = starsim_service.get_simulation_status()
        return status
    except Exception as e:
        logger.error(f"Error getting Starsim status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/starsim/simulate")
@app.post("/starsim/simulate")
async def run_starsim_simulation(
    disease: str = Query(..., description="Disease type (COVID, Flu, RSV)"),
    population_size: int = Query(5000, description="Population size"),
    duration_days: int = Query(365, description="Simulation duration in days"),
    n_reps: int = Query(10, description="Number of simulation repetitions"),
    # time controls
    start_date: Optional[str] = Query(None, description="Simulation start date (YYYY-MM-DD)"),
    stop_date: Optional[str] = Query(None, description="Simulation stop date (YYYY-MM-DD)"),
    unit: Optional[str] = Query(None, description="Time unit: day|week|month"),
    random_seed: Optional[int] = Query(None, description="Random seed"),
    # model selection
    disease_model_type: Optional[str] = Query(None, description="sir|seir"),
    # disease overrides
    init_prev: Optional[float] = Query(None, description="Initial prevalence (fraction)"),
    beta: Optional[float] = Query(None, description="Transmission rate"),
    gamma: Optional[float] = Query(None, description="Recovery rate"),
    sigma: Optional[float] = Query(None, description="Incubation rate (SEIR)"),
    mortality_rate: Optional[float] = Query(None, description="Mortality rate per day"),
    # seasonality
    seasonal_factor: Optional[float] = Query(None, description="Seasonal multiplier during peak weeks"),
    peak_weeks: Optional[str] = Query(None, description="Comma-separated list of peak weeks (0-51)"),
    # network approximation
    n_contacts: Optional[float] = Query(None, description="Average contacts per person"),
    n_contacts_poisson_lam: Optional[float] = Query(None, description="Poisson lambda for contacts"),
    # vaccination
    vaccination_coverage: Optional[float] = Query(None, description="Overall vaccination coverage"),
    booster_coverage: Optional[float] = Query(None, description="Booster coverage (subset of vaccinated)"),
    vax_transmission_eff: Optional[float] = Query(None, description="Vaccination transmission effectiveness"),
    vax_severity_eff: Optional[float] = Query(None, description="Vaccination severity effectiveness"),
    waning_days: Optional[int] = Query(None, description="Days to waning"),
    residual_transmission_floor: Optional[float] = Query(None, description="Residual transmission protection after waning")
):
    """Run Starsim simulation for specified disease - USING V2 CLEAN VERSION"""
    try:
        if disease not in ["COVID", "Flu", "RSV"]:
            raise HTTPException(status_code=400, detail="Invalid disease type. Must be COVID, Flu, or RSV")
        
        # Use standalone V2 function (bypasses ALL caching)
        from model_worker.v2_simulation import run_v2_simulation
        # Parse peak weeks string into list of ints if provided
        peak_weeks_list = None
        if peak_weeks:
            try:
                peak_weeks_list = [int(w.strip()) for w in peak_weeks.split(',') if w.strip()]
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid peak_weeks format. Use comma-separated integers.")

        result = run_v2_simulation(
            disease=disease,
            population_size=population_size,
            duration_days=duration_days,
            n_reps=n_reps,
            # pass-through overrides
            start_date=start_date,
            stop_date=stop_date,
            unit=unit,
            random_seed=random_seed,
            disease_model_type=disease_model_type,
            init_prev=init_prev,
            beta=beta,
            gamma=gamma,
            sigma=sigma,
            mortality_rate=mortality_rate,
            seasonal_factor=seasonal_factor,
            peak_weeks=peak_weeks_list,
            n_contacts=n_contacts,
            n_contacts_poisson_lam=n_contacts_poisson_lam,
            vaccination_coverage=vaccination_coverage,
            booster_coverage=booster_coverage,
            vax_transmission_eff=vax_transmission_eff,
            vax_severity_eff=vax_severity_eff,
            waning_days=waning_days,
            residual_transmission_floor=residual_transmission_floor,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running Starsim simulation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/starsim/scenarios")
async def run_starsim_scenarios(
    disease: str = Query(..., description="Disease type (COVID, Flu, RSV)"),
    scenarios: List[Dict[str, Any]] = Body(..., description="List of scenarios to compare")
):
    """Run multiple Starsim scenarios for comparison"""
    try:
        if disease not in ["COVID", "Flu", "RSV"]:
            raise HTTPException(status_code=400, detail="Invalid disease type. Must be COVID, Flu, or RSV")
        
        result = starsim_service.run_scenario_comparison(disease, scenarios)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running Starsim scenarios: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# SEIR endpoints
@app.get("/seir/status")
async def get_seir_status():
    """Get SEIR service status"""
    try:
        return {
            "service_status": "healthy",
            "model_types": ["SIR", "SEIR"],
            "available_diseases": ["COVID", "Flu", "RSV"],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting SEIR status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/seir/simulate")
async def run_seir_simulation(
    disease: str = Query(..., description="Disease type (COVID, Flu, RSV)"),
    population_size: int = Query(5000, description="Population size"),
    duration_days: int = Query(365, description="Simulation duration in days"),
    model_type: str = Query("SEIR", description="Model type (SIR or SEIR)"),
    custom_parameters: Optional[Dict[str, Any]] = None
):
    """Run SEIR simulation with optional custom parameters"""
    try:
        if disease not in ["COVID", "Flu", "RSV"]:
            raise HTTPException(status_code=400, detail="Invalid disease type. Must be COVID, Flu, or RSV")
        
        if model_type not in ["SIR", "SEIR"]:
            raise HTTPException(status_code=400, detail="Invalid model type. Must be SIR or SEIR")
        
        result = seir_service.run_seir_simulation(
            disease=disease,
            population_size=population_size,
            duration_days=duration_days,
            custom_parameters=custom_parameters
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running SEIR simulation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/seir/validate")
async def validate_parameters(parameters: Dict[str, Any]):
    """Validate user-provided parameters"""
    try:
        validation_result = seir_service.validate_parameters(parameters)
        return validation_result
    except Exception as e:
        logger.error(f"Error validating parameters: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/seir/sensitivity")
async def run_sensitivity_analysis(
    disease: str = Query(..., description="Disease type (COVID, Flu, RSV)"),
    parameter_name: str = Query(..., description="Parameter to analyze"),
    parameter_range: List[float] = Query(..., description="Range of parameter values"),
    population_size: int = Query(5000, description="Population size"),
    duration_days: int = Query(365, description="Simulation duration in days")
):
    """Run parameter sensitivity analysis"""
    try:
        if disease not in ["COVID", "Flu", "RSV"]:
            raise HTTPException(status_code=400, detail="Invalid disease type. Must be COVID, Flu, or RSV")
        
        result = seir_service.run_parameter_sensitivity_analysis(
            disease=disease,
            parameter_name=parameter_name,
            parameter_range=parameter_range,
            population_size=population_size,
            duration_days=duration_days
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running sensitivity analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/seir/compare")
async def compare_sir_vs_seir(
    disease: str = Query(..., description="Disease type (COVID, Flu, RSV)"),
    population_size: int = Query(5000, description="Population size"),
    duration_days: int = Query(365, description="Simulation duration in days")
):
    """Compare SIR vs SEIR models for the same disease"""
    try:
        if disease not in ["COVID", "Flu", "RSV"]:
            raise HTTPException(status_code=400, detail="Invalid disease type. Must be COVID, Flu, or RSV")
        
        result = seir_service.compare_sir_vs_seir(
            disease=disease,
            population_size=population_size,
            duration_days=duration_days
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing SIR vs SEIR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/seir/parameters")
async def get_parameter_descriptions():
    """Get descriptions of all SEIR parameters"""
    try:
        descriptions = seir_service.get_parameter_descriptions()
        return descriptions
    except Exception as e:
        logger.error(f"Error getting parameter descriptions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Conversation endpoints for SILAS (Researcher)
@app.get("/users/{user_id}/conversations")
async def get_user_conversations(user_id: str = Path(..., description="User ID")):
    """Get all conversations for a user"""
    try:
        conversations = conversation_service.get_user_conversations(user_id)
        return {"conversations": conversations}
    except Exception as e:
        logger.error(f"Error getting conversations for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}/conversations/{conversation_id}")
async def get_conversation(
    user_id: str = Path(..., description="User ID"),
    conversation_id: str = Path(..., description="Conversation ID")
):
    """Get a specific conversation"""
    try:
        conversation = conversation_service.get_conversation(user_id, conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation {conversation_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/users/{user_id}/conversations")
async def create_conversation(
    user_id: str = Path(..., description="User ID"),
    conversation_data: ConversationCreate = Body(..., description="Conversation data")
):
    """Create a new conversation"""
    try:
        conversation = conversation_service.create_conversation(user_id, conversation_data)
        return conversation
    except Exception as e:
        logger.error(f"Error creating conversation for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/users/{user_id}/conversations/{conversation_id}")
async def update_conversation(
    user_id: str = Path(..., description="User ID"),
    conversation_id: str = Path(..., description="Conversation ID"),
    update_data: ConversationUpdate = Body(..., description="Update data")
):
    """Update a conversation"""
    try:
        conversation = conversation_service.update_conversation(user_id, conversation_id, update_data)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating conversation {conversation_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/users/{user_id}/conversations/{conversation_id}/messages")
async def add_message(
    user_id: str = Path(..., description="User ID"),
    conversation_id: str = Path(..., description="Conversation ID"),
    message: Message = Body(..., description="Message to add")
):
    """Add a message to a conversation"""
    try:
        conversation = conversation_service.add_message(user_id, conversation_id, message)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding message to conversation {conversation_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/users/{user_id}/conversations/{conversation_id}")
async def delete_conversation(
    user_id: str = Path(..., description="User ID"),
    conversation_id: str = Path(..., description="Conversation ID")
):
    """Delete a conversation"""
    try:
        success = conversation_service.delete_conversation(user_id, conversation_id)
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return {"message": "Conversation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation {conversation_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}/conversations/search")
async def search_conversations(
    user_id: str = Path(..., description="User ID"),
    q: str = Query(..., description="Search query")
):
    """Search conversations by title or content"""
    try:
        conversations = conversation_service.search_conversations(user_id, q)
        return {"conversations": conversations}
    except Exception as e:
        logger.error(f"Error searching conversations for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Scenario endpoints for Scenario Builder
@app.get("/users/{user_id}/scenarios")
async def get_user_scenarios(user_id: str = Path(..., description="User ID")):
    """Get all scenarios for a user"""
    try:
        scenarios = scenario_service.get_user_scenarios(user_id)
        return {"scenarios": scenarios}
    except Exception as e:
        logger.error(f"Error getting scenarios for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}/scenarios/{scenario_id}")
async def get_scenario(
    user_id: str = Path(..., description="User ID"),
    scenario_id: str = Path(..., description="Scenario ID")
):
    """Get a specific scenario"""
    try:
        scenario = scenario_service.get_scenario(user_id, scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        return scenario
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting scenario {scenario_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/users/{user_id}/scenarios")
async def create_scenario(
    user_id: str = Path(..., description="User ID"),
    scenario_data: ScenarioCreate = Body(..., description="Scenario data")
):
    """Create a new scenario"""
    try:
        scenario = scenario_service.create_scenario(user_id, scenario_data)
        return scenario
    except Exception as e:
        logger.error(f"Error creating scenario for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/users/{user_id}/scenarios/{scenario_id}")
async def update_scenario(
    user_id: str = Path(..., description="User ID"),
    scenario_id: str = Path(..., description="Scenario ID"),
    update_data: ScenarioUpdate = Body(..., description="Update data")
):
    """Update a scenario"""
    try:
        scenario = scenario_service.update_scenario(user_id, scenario_id, update_data)
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        return scenario
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating scenario {scenario_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/users/{user_id}/scenarios/{scenario_id}")
async def delete_scenario(
    user_id: str = Path(..., description="User ID"),
    scenario_id: str = Path(..., description="Scenario ID")
):
    """Delete a scenario"""
    try:
        success = scenario_service.delete_scenario(user_id, scenario_id)
        if not success:
            raise HTTPException(status_code=404, detail="Scenario not found")
        return {"message": "Scenario deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting scenario {scenario_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/users/{user_id}/scenarios/{scenario_id}/run")
async def record_scenario_run(
    user_id: str = Path(..., description="User ID"),
    scenario_id: str = Path(..., description="Scenario ID")
):
    """Record that a scenario was run"""
    try:
        scenario = scenario_service.record_scenario_run(user_id, scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        return scenario
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording scenario run {scenario_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}/scenarios/search")
async def search_scenarios(
    user_id: str = Path(..., description="User ID"),
    q: str = Query(..., description="Search query")
):
    """Search scenarios by name, description, or disease"""
    try:
        scenarios = scenario_service.search_scenarios(user_id, q)
        return {"scenarios": scenarios}
    except Exception as e:
        logger.error(f"Error searching scenarios for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}/scenarios/filter/disease/{disease_name}")
async def get_scenarios_by_disease(
    user_id: str = Path(..., description="User ID"),
    disease_name: str = Path(..., description="Disease name")
):
    """Get scenarios filtered by disease name"""
    try:
        scenarios = scenario_service.get_scenarios_by_disease(user_id, disease_name)
        return {"scenarios": scenarios}
    except Exception as e:
        logger.error(f"Error getting scenarios by disease for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}/scenarios/filter/model/{model_type}")
async def get_scenarios_by_model_type(
    user_id: str = Path(..., description="User ID"),
    model_type: str = Path(..., description="Model type")
):
    """Get scenarios filtered by model type"""
    try:
        scenarios = scenario_service.get_scenarios_by_model_type(user_id, model_type)
        return {"scenarios": scenarios}
    except Exception as e:
        logger.error(f"Error getting scenarios by model type for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}/scenarios/recent")
async def get_recent_scenarios(
    user_id: str = Path(..., description="User ID"),
    limit: int = Query(10, description="Number of recent scenarios to return")
):
    """Get recently updated scenarios"""
    try:
        scenarios = scenario_service.get_recent_scenarios(user_id, limit)
        return {"scenarios": scenarios}
    except Exception as e:
        logger.error(f"Error getting recent scenarios for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}/scenarios/most-run")
async def get_most_run_scenarios(
    user_id: str = Path(..., description="User ID"),
    limit: int = Query(10, description="Number of most run scenarios to return")
):
    """Get most frequently run scenarios"""
    try:
        scenarios = scenario_service.get_most_run_scenarios(user_id, limit)
        return {"scenarios": scenarios}
    except Exception as e:
        logger.error(f"Error getting most run scenarios for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Additional scenario sharing endpoints
@app.get("/users/{user_id}/scenarios/public")
async def get_public_scenarios(
    user_id: str = Path(..., description="User ID"),
    limit: int = Query(50, description="Number of public scenarios to return")
):
    """Get public scenarios from all users"""
    try:
        scenarios = scenario_service.get_public_scenarios(user_id, limit)
        return {"scenarios": scenarios}
    except Exception as e:
        logger.error(f"Error getting public scenarios for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}/scenarios/shared")
async def get_shared_scenarios(user_id: str = Path(..., description="User ID")):
    """Get scenarios shared with the user"""
    try:
        scenarios = scenario_service.get_shared_scenarios(user_id)
        return {"scenarios": scenarios}
    except Exception as e:
        logger.error(f"Error getting shared scenarios for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/users/{user_id}/scenarios/{scenario_id}/share")
async def share_scenario(
    user_id: str = Path(..., description="User ID"),
    scenario_id: str = Path(..., description="Scenario ID"),
    share_data: ScenarioShare = Body(..., description="Share data")
):
    """Share a scenario with specific users"""
    try:
        success = scenario_service.share_scenario(user_id, scenario_id, share_data)
        if not success:
            raise HTTPException(status_code=404, detail="Scenario not found or access denied")
        return {"message": "Scenario shared successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sharing scenario {scenario_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/users/{user_id}/scenarios/{scenario_id}/share/{target_user_id}")
async def unshare_scenario(
    user_id: str = Path(..., description="User ID"),
    scenario_id: str = Path(..., description="Scenario ID"),
    target_user_id: str = Path(..., description="Target user ID to unshare with")
):
    """Remove a user from scenario sharing"""
    try:
        success = scenario_service.unshare_scenario(user_id, scenario_id, target_user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Scenario not found or access denied")
        return {"message": "Scenario unshared successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unsharing scenario {scenario_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}/scenarios/tag/{tag}")
async def get_scenarios_by_tag(
    user_id: str = Path(..., description="User ID"),
    tag: str = Path(..., description="Tag to filter by")
):
    """Get scenarios filtered by tag"""
    try:
        scenarios = scenario_service.get_scenarios_by_tag(user_id, tag)
        return {"scenarios": scenarios}
    except Exception as e:
        logger.error(f"Error getting scenarios by tag for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}/scenarios/public/tag/{tag}")
async def get_public_scenarios_by_tag(
    user_id: str = Path(..., description="User ID"),
    tag: str = Path(..., description="Tag to filter by")
):
    """Get public scenarios filtered by tag"""
    try:
        scenarios = scenario_service.get_public_scenarios_by_tag(user_id, tag)
        return {"scenarios": scenarios}
    except Exception as e:
        logger.error(f"Error getting public scenarios by tag for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Perplexity AI Proxy Endpoint
class PerplexityRequest(BaseModel):
    """Request model for Perplexity API proxy"""
    message: str = Field(..., description="User's message/query")
    system_prompt: Optional[str] = Field(None, description="Optional system prompt for context")
    model: str = Field("sonar-pro", description="Perplexity model to use")
    max_tokens: int = Field(1500, description="Maximum tokens in response")
    temperature: float = Field(0.2, description="Sampling temperature (0.0-1.0)")

@app.post("/perplexity/chat")
async def perplexity_chat(request: PerplexityRequest):
    """
    Proxy endpoint for Perplexity AI chat completions
    Uses server-side API key from environment/secrets
    """
    try:
        if not perplexity_service.is_available():
            raise HTTPException(
                status_code=503,
                detail="Perplexity API is not configured on the server. Please contact administrator."
            )
        
        result = await perplexity_service.chat_completion(
            message=request.message,
            system_prompt=request.system_prompt,
            model=request.model,
            max_tokens=request.max_tokens,
            temperature=request.temperature
        )
        
        return result
        
    except ValueError as e:
        logger.error(f"Perplexity API configuration error: {str(e)}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Error calling Perplexity API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process request: {str(e)}")

@app.get("/perplexity/status")
async def perplexity_status():
    """Check if Perplexity API is available and configured"""
    is_available = perplexity_service.is_available()
    if is_available:
        try:
            is_valid = await perplexity_service.validate_api_key()
            return {
                "available": True,
                "configured": True,
                "valid": is_valid,
                "message": "Perplexity API is ready" if is_valid else "API key configured but validation failed"
            }
        except Exception as e:
            logger.error(f"Error validating Perplexity API key: {str(e)}")
            return {
                "available": True,
                "configured": True,
                "valid": False,
                "message": f"API key validation error: {str(e)}"
            }
    else:
        return {
            "available": False,
            "configured": False,
            "valid": False,
            "message": "Perplexity API key not configured on server"
        }

if __name__ == "__main__":
    # Start the server when run as a script
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("ENV", "production") == "development",
    )

