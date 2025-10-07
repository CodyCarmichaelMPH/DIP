#!/usr/bin/env python3
"""
Simple backend to resolve CORS issues and test login functionality.
This provides the essential API endpoints without complex dependencies.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import json
import uuid
from datetime import datetime

app = FastAPI(title="Disease Modeling Backend (API)")

# No CORS middleware on the mounted app - it will be handled by root_app

# Pydantic models
class ScenarioParameters(BaseModel):
    disease_name: str
    model_type: str
    population_size: Optional[int] = 10000
    duration_days: Optional[int] = 365
    n_reps: Optional[int] = 10
    random_seed: Optional[int] = None
    start_date: Optional[str] = None
    stop_date: Optional[str] = None
    unit: Optional[str] = None
    init_prev: Optional[float] = None
    beta: Optional[float] = None
    gamma: Optional[float] = None
    sigma: Optional[float] = None
    mu: Optional[float] = None
    seasonal_factor: Optional[float] = None
    peak_weeks: Optional[List[int]] = None
    network_n_contacts: Optional[int] = None
    network_poisson_lam: Optional[float] = None
    vaccination_coverage: Optional[float] = None
    booster_coverage: Optional[float] = None
    vax_transmission_eff: Optional[float] = None
    vax_severity_eff: Optional[float] = None
    waning_days: Optional[int] = None
    residual_transmission_floor: Optional[float] = None

class ScenarioCreate(BaseModel):
    name: str
    description: Optional[str] = None
    parameters: ScenarioParameters
    is_public: Optional[bool] = False
    tags: Optional[List[str]] = None
    author_name: Optional[str] = None

class ScenarioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parameters: Optional[ScenarioParameters] = None
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = None

class Scenario(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    parameters: ScenarioParameters
    created_at: str
    updated_at: str
    last_run_at: Optional[str] = None
    run_count: int = 0

class ScenarioResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: str
    updated_at: str
    last_run_at: Optional[str] = None
    run_count: int = 0
    disease_name: str
    model_type: str
    is_public: bool = False
    is_shared: bool = False
    tags: Optional[List[str]] = None
    author_name: Optional[str] = None
    user_id: str
    is_owner: bool = True

# In-memory storage for scenarios
scenarios_db: Dict[str, List[Scenario]] = {}

@app.get("/health")
async def health_check():
    """Health check endpoint (scoped under /api when mounted)"""
    return {"status": "healthy", "message": "Backend is running"}

@app.get("/starsim/simulate")
@app.post("/starsim/simulate")
async def starsim_simulation(
    disease: str = "COVID",
    population_size: int = 1000,
    duration_days: int = 365,
    n_reps: int = 10
):
    """Starsim simulation endpoint"""
    import numpy as np
    
    # Generate realistic simulation data
    days = duration_days
    time_points = list(range(days))
    
    # Initialize SEIR compartments with proper conservation
    # Start with initial conditions
    init_infected = int(population_size * 0.001)  # 0.1% initially infected
    init_exposed = int(population_size * 0.001)   # 0.1% initially exposed
    
    S = [population_size - init_infected - init_exposed]  # Susceptible
    E = [init_exposed]                                   # Exposed  
    I = [init_infected]                                  # Infected
    R = [0]                                              # Recovered
    D = [0]                                              # Deaths
    
    # SEIR parameters (use defaults if not provided)
    beta = 0.3      # Transmission rate
    gamma = 0.1     # Recovery rate  
    sigma = 0.2     # Incubation rate
    mu = 0.001      # Death rate
    
    # Run SEIR simulation with conservation
    for day in range(1, days):
        # Apply seasonality
        week = (day // 7) % 52
        season = 1.0  # Default seasonal factor
        
        # SEIR dynamics with conservation
        force_infection = beta * season * I[-1] / population_size
        new_exposed = min(force_infection * S[-1], S[-1])  # Can't exceed susceptible
        new_infected = min(sigma * E[-1], E[-1])           # Can't exceed exposed
        new_recovered = min(gamma * I[-1], I[-1])          # Can't exceed infected
        new_deaths = min(mu * I[-1], I[-1])                # Can't exceed infected
        
        # Update compartments with conservation: S + E + I + R + D = constant
        S.append(max(0, int(S[-1] - new_exposed)))
        E.append(max(0, int(E[-1] + new_exposed - new_infected)))
        I.append(max(0, int(I[-1] + new_infected - new_recovered - new_deaths)))
        R.append(int(R[-1] + new_recovered))
        D.append(int(D[-1] + new_deaths))
    
    # Convert to lists for response
    susceptible = S
    exposed = E
    infected = I
    recovered = R
    deaths = D
    
    # Verify conservation: S + E + I + R + D should equal population_size
    total_check = [s + e + i + r + d for s, e, i, r, d in zip(susceptible, exposed, infected, recovered, deaths)]
    if not all(abs(total - population_size) < 1 for total in total_check):
        print(f"Warning: Population conservation violated in Starsim simulation. Expected {population_size}, got {total_check[:3]}")
    
    return {
        "status": "success",
        "message": "Simulation completed",
        "disease": disease,
        "population_size": population_size,
        "duration_days": duration_days,
        "n_reps": n_reps,
        "version": "v2_clean",
        "results": {
            "time_points": time_points,
            "susceptible": susceptible,
            "exposed": exposed,
            "infected": infected,
            "recovered": recovered,
            "deaths": deaths,
            "summary": {
                "peak_infection": max(infected),
                "peak_infected_day": infected.index(max(infected)),
                "total_infected": recovered[-1] + deaths[-1],
                "total_cases": recovered[-1] + deaths[-1],
                "total_deaths": deaths[-1],
                "final_susceptible": susceptible[-1],
                "final_recovered": recovered[-1],
                "attack_rate": (recovered[-1] + deaths[-1]) / population_size,
                "case_fatality_rate": deaths[-1] / (recovered[-1] + deaths[-1]) if (recovered[-1] + deaths[-1]) > 0 else 0
            }
        }
    }

@app.get("/seir/status")
async def seir_status():
    """SEIR service status"""
    return {"status": "available", "message": "SEIR service is running"}

@app.post("/seir/simulate")
async def seir_simulation(
    disease: str = "COVID",
    population_size: int = 5000,
    duration_days: int = 365,
    model_type: str = "SEIR",
    init_prev: float = 0.001,
    beta: float = 0.3,
    gamma: float = 0.1,
    sigma: float = 0.2,
    mu: float = 0.001,
    seasonal_factor: float = 1.0,
    peak_weeks: str = "10,11,12"
):
    """SEIR simulation endpoint with actual SEIR model"""
    import numpy as np
    
    # Parse peak weeks
    peak_weeks_list = [int(w.strip()) for w in peak_weeks.split(',') if w.strip()] if peak_weeks else [10, 11, 12]
    
    # Generate realistic SEIR simulation data using actual SEIR model
    days = duration_days
    time_points = list(range(days))
    
    # Initialize SEIR compartments
    S = [int(population_size * (1 - init_prev))]
    E = [int(population_size * init_prev * 0.5)]
    I = [int(population_size * init_prev * 0.5)]
    R = [0]
    D = [0]
    
    # Run SEIR simulation
    for day in range(1, days):
        # Apply seasonality
        week = (day // 7) % 52
        season = seasonal_factor if week in peak_weeks_list else 1.0
        
        # SEIR dynamics
        force_infection = beta * season * I[-1] / population_size
        new_exposed = force_infection * S[-1]
        new_infected = sigma * E[-1]
        new_recovered = gamma * I[-1]
        new_deaths = mu * I[-1]
        
        # Update compartments
        S.append(max(0, int(S[-1] - new_exposed)))
        E.append(max(0, int(E[-1] + new_exposed - new_infected)))
        I.append(max(0, int(I[-1] + new_infected - new_recovered - new_deaths)))
        R.append(int(R[-1] + new_recovered))
        D.append(int(D[-1] + new_deaths))
    
    # Convert to lists for response
    susceptible = S
    exposed = E
    infected = I
    recovered = R
    deaths = D
    
    return {
        "success": True,
        "disease": disease,
        "model_type": model_type,
        "population_size": population_size,
        "duration_days": duration_days,
        "parameters": {
            "init_prev": init_prev,
            "beta": beta,
            "sigma": sigma,
            "gamma": gamma,
            "mu": mu,
            "seasonal_factor": seasonal_factor,
            "peak_weeks": peak_weeks_list,
            "r0": beta / gamma,
            "incubation_period": 1 / sigma,
            "infectious_period": 1 / gamma
        },
        "time_series": {
            "time": time_points,
            "susceptible": susceptible,
            "exposed": exposed,
            "infected": infected,
            "recovered": recovered,
            "deaths": deaths
        },
        "summary": {
            "peak_exposed": max(exposed),
            "peak_infected": max(infected),
            "peak_exposed_day": exposed.index(max(exposed)),
            "peak_infected_day": infected.index(max(infected)),
            "total_infected": recovered[-1] + deaths[-1],
            "total_deaths": deaths[-1],
            "attack_rate": (recovered[-1] + deaths[-1]) / population_size,
            "case_fatality_rate": deaths[-1] / (recovered[-1] + deaths[-1]) if (recovered[-1] + deaths[-1]) > 0 else 0,
            "r0": beta / gamma,
            "incubation_period": 1 / sigma,
            "infectious_period": 1 / gamma
        },
        "timestamp": datetime.now().isoformat()
    }

# Scenario management endpoints
@app.get("/users/{user_id}/scenarios")
async def get_user_scenarios(user_id: str):
    """Get all scenarios for a user"""
    user_scenarios = scenarios_db.get(user_id, [])
    scenario_responses = []
    
    for scenario in user_scenarios:
        response = ScenarioResponse(
            id=scenario.id,
            name=scenario.name,
            description=scenario.description,
            created_at=scenario.created_at,
            updated_at=scenario.updated_at,
            last_run_at=scenario.last_run_at,
            run_count=scenario.run_count,
            disease_name=scenario.parameters.disease_name,
            model_type=scenario.parameters.model_type,
            is_public=scenario.parameters.disease_name == "COVID",  # Simple logic for demo
            is_shared=False,
            tags=[],
            author_name="Demo User",
            user_id=scenario.user_id,
            is_owner=True
        )
        scenario_responses.append(response)
    
    return {"scenarios": scenario_responses}

@app.get("/users/{user_id}/scenarios/{scenario_id}")
async def get_scenario(user_id: str, scenario_id: str):
    """Get a specific scenario"""
    user_scenarios = scenarios_db.get(user_id, [])
    scenario = next((s for s in user_scenarios if s.id == scenario_id), None)
    
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    return scenario

@app.post("/users/{user_id}/scenarios")
async def create_scenario(user_id: str, scenario_data: ScenarioCreate):
    """Create a new scenario"""
    scenario_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    scenario = Scenario(
        id=scenario_id,
        user_id=user_id,
        name=scenario_data.name,
        description=scenario_data.description,
        parameters=scenario_data.parameters,
        created_at=now,
        updated_at=now,
        last_run_at=None,
        run_count=0
    )
    
    if user_id not in scenarios_db:
        scenarios_db[user_id] = []
    
    scenarios_db[user_id].append(scenario)
    
    return scenario

@app.put("/users/{user_id}/scenarios/{scenario_id}")
async def update_scenario(user_id: str, scenario_id: str, update_data: ScenarioUpdate):
    """Update a scenario"""
    user_scenarios = scenarios_db.get(user_id, [])
    scenario = next((s for s in user_scenarios if s.id == scenario_id), None)
    
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    # Update fields if provided
    if update_data.name is not None:
        scenario.name = update_data.name
    if update_data.description is not None:
        scenario.description = update_data.description
    if update_data.parameters is not None:
        scenario.parameters = update_data.parameters
    if update_data.is_public is not None:
        # Handle is_public logic here if needed
        pass
    if update_data.tags is not None:
        # Handle tags logic here if needed
        pass
    
    scenario.updated_at = datetime.now().isoformat()
    
    return scenario

@app.delete("/users/{user_id}/scenarios/{scenario_id}")
async def delete_scenario(user_id: str, scenario_id: str):
    """Delete a scenario"""
    user_scenarios = scenarios_db.get(user_id, [])
    scenario = next((s for s in user_scenarios if s.id == scenario_id), None)
    
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    scenarios_db[user_id] = [s for s in user_scenarios if s.id != scenario_id]
    
    return {"message": "Scenario deleted successfully"}

@app.post("/users/{user_id}/scenarios/{scenario_id}/run")
async def record_scenario_run(user_id: str, scenario_id: str):
    """Record a scenario run"""
    user_scenarios = scenarios_db.get(user_id, [])
    scenario = next((s for s in user_scenarios if s.id == scenario_id), None)
    
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    scenario.run_count += 1
    scenario.last_run_at = datetime.now().isoformat()
    scenario.updated_at = datetime.now().isoformat()
    
    return scenario

@app.get("/users/{user_id}/scenarios/public")
async def get_public_scenarios(user_id: str, limit: int = 50):
    """Get public scenarios"""
    # For demo purposes, return empty list
    return {"scenarios": []}

@app.get("/users/{user_id}/scenarios/shared")
async def get_shared_scenarios(user_id: str):
    """Get shared scenarios"""
    # For demo purposes, return empty list
    return {"scenarios": []}

# Root app that mounts the API under /api
root_app = FastAPI(title="Disease Modeling Backend")

# Add CORS middleware to the top-level app (handles all requests including /api/*)
root_app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https://([a-z0-9-]+\.)?broadlyepi\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,
)

# Add GitHub Pages origin
root_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://codycarmic haelmph.github.io"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,
)

# Add local development origins
root_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174", 
        "http://localhost:3000",
        "http://localhost",
        "https://dip-frontend-398210810947.us-west1.run.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,
)

@root_app.get("/health")
async def root_health_check():
    """Top-level health endpoint for load balancers/containers."""
    return {"status": "healthy", "message": "Root is running"}

# Mount the existing API app under /api
root_app.mount("/api", app)

if __name__ == "__main__":
    print("Starting Simple Backend...")
    print("Root:   http://localhost:8000")
    print("Health: http://localhost:8000/health")
    print("API:    http://localhost:8000/api")
    print("API Docs: http://localhost:8000/api/docs")
    print("\nPress Ctrl+C to stop")
    
    uvicorn.run(
        "simple_backend:root_app",
        host="0.0.0.0",
        port=8000,
        reload=False
    )

        "https://dip-frontend-398210810947.us-west1.run.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,
)

@root_app.get("/health")
async def root_health_check():
    """Top-level health endpoint for load balancers/containers."""
    return {"status": "healthy", "message": "Root is running"}

# Mount the existing API app under /api
root_app.mount("/api", app)

if __name__ == "__main__":
    print("Starting Simple Backend...")
    print("Root:   http://localhost:8000")
    print("Health: http://localhost:8000/health")
    print("API:    http://localhost:8000/api")
    print("API Docs: http://localhost:8000/api/docs")
    print("\nPress Ctrl+C to stop")
    
    uvicorn.run(
        "simple_backend:root_app",
        host="0.0.0.0",
        port=8000,
        reload=False
    )
