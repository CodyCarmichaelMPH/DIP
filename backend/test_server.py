#!/usr/bin/env python3
"""
Simple test server to verify Starsim endpoints work
"""
import json
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Test Disease Modeling API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "v2_available": True
    }

@app.get("/starsim/status")
async def get_starsim_status():
    return {
        "starsim_available": True,
        "service_status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/starsim/simulate")
async def run_starsim_simulation(
    disease: str = "COVID",
    population_size: int = 50,
    duration_days: int = 3,
    n_reps: int = 1
):
    """Simple test simulation with minimal parameters"""
    
    # Simple SEIR simulation
    S = [population_size]
    E = [0]
    I = [1]  # Start with 1 infected
    R = [0]
    D = [0]
    
    for day in range(1, duration_days):
        # Simple SEIR dynamics
        beta = 0.3  # Transmission rate
        sigma = 0.2  # Incubation rate
        gamma = 0.1  # Recovery rate
        mu = 0.001   # Death rate
        
        force_infection = beta * I[-1] / population_size
        new_exposed = force_infection * S[-1]
        new_infected = sigma * E[-1]
        new_recovered = gamma * I[-1]
        new_deaths = mu * I[-1]
        
        S.append(max(0, int(S[-1] - new_exposed)))
        E.append(max(0, int(E[-1] + new_exposed - new_infected)))
        I.append(max(0, int(I[-1] + new_infected - new_recovered - new_deaths)))
        R.append(int(R[-1] + new_recovered))
        D.append(int(D[-1] + new_deaths))
    
    # Calculate summary
    peak_infection = max(I)
    peak_day = I.index(peak_infection)
    total_infected = R[-1] + D[-1]
    total_deaths = D[-1]
    attack_rate = total_infected / population_size
    cfr = total_deaths / total_infected if total_infected > 0 else 0
    
    return {
        "success": True,
        "disease": disease,
        "population_size": population_size,
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
                "case_fatality_rate": cfr
            }
        },
        "pierce_county_enhanced": False,
        "version": "test_simple",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
