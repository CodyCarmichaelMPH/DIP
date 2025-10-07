# Module: model_worker.domain.models
# Purpose: Define the domain models for the disease modeling worker
# Inputs: N/A (type definitions)
# Outputs: Pydantic models for API contracts
# Errors: Validation errors for invalid inputs
# Tests: test_models.py

"""
PSEUDOCODE
1) Define base models using Pydantic
2) Define request/response models for API endpoints
3) Include validation rules for each field
4) Define enums for constrained fields
5) Define nested models for complex structures
"""

from enum import Enum
from typing import Dict, List, Optional, Union, Any
from datetime import date as DateType, datetime
from pydantic import BaseModel, Field, validator, model_validator

class DiseaseType(str, Enum):
    """Supported disease types"""
    COVID = "COVID"
    RSV = "RSV"
    FLU = "Flu"

class SeedingMode(str, Enum):
    """Modes for seeding infections in the model"""
    PROBABILISTIC = "probabilistic"
    SIMULATE_INTRODUCTION = "simulate_introduction"

class RunStatus(str, Enum):
    """Possible statuses for a model run"""
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class Introduction(BaseModel):
    """Model for specifying introductions at specific facilities or tracts"""
    facility_id: Optional[str] = Field(None, description="ID of the facility for the introduction")
    tract_fips: Optional[str] = Field(None, description="FIPS code of the tract for the introduction")
    num_introductions: int = Field(1, description="Number of introductions to simulate")
    group: str = Field(..., description="Group for the introduction (e.g., staff, residents)")
    
    @model_validator(mode='after')
    def validate_location(self):
        """Validate that either facility_id or tract_fips is provided"""
        if not self.facility_id and not self.tract_fips:
            raise ValueError("Either facility_id or tract_fips must be provided")
        return self

class Intervention(BaseModel):
    """Model for specifying interventions in the simulation"""
    type: str = Field(..., description="Type of intervention (e.g., vaccination, distancing)")
    target: str = Field(..., description="Target for the intervention (e.g., facility_id, tract_fips)")
    parameters: Dict[str, Any] = Field({}, description="Parameters specific to the intervention type")

class RunConfig(BaseModel):
    """Configuration for a simulation run"""
    jurisdiction_id: str = Field(..., description="ID of the jurisdiction (e.g., tpchd)")
    disease: DiseaseType = Field(..., description="Disease to model")
    run_name: str = Field(..., description="User-provided name for the run")
    created_by: str = Field(..., description="ID of the user creating the run")
    start_date: DateType = Field(..., description="Start date for the simulation")
    run_length_weeks: int = Field(12, description="Length of the simulation in weeks")
    seeding_mode: SeedingMode = Field(..., description="Mode for seeding infections")
    introductions: List[Introduction] = Field([], description="List of introductions for simulate_introduction mode")
    interventions: List[Intervention] = Field([], description="List of interventions to apply")
    stochastic_reps: int = Field(200, description="Number of stochastic repetitions to run")
    use_calibrated_params: bool = Field(True, description="Whether to use calibrated parameters")
    
    @validator("stochastic_reps")
    def validate_stochastic_reps(cls, v):
        """Validate that stochastic_reps is within reasonable bounds"""
        if v < 10:
            raise ValueError("stochastic_reps must be at least 10")
        if v > 1000:
            raise ValueError("stochastic_reps must be at most 1000")
        return v
    
    @validator("run_length_weeks")
    def validate_run_length_weeks(cls, v):
        """Validate that run_length_weeks is within reasonable bounds"""
        if v < 1:
            raise ValueError("run_length_weeks must be at least 1")
        if v > 52:
            raise ValueError("run_length_weeks must be at most 52")
        return v
    
    @model_validator(mode='after')
    def validate_introductions(self):
        """Validate that introductions are provided when using simulate_introduction mode"""
        if self.seeding_mode == SeedingMode.SIMULATE_INTRODUCTION and not self.introductions:
            raise ValueError("introductions must be provided when using simulate_introduction mode")
        return self

class CalibrationConfig(BaseModel):
    """Configuration for a calibration run"""
    jurisdiction_id: str = Field(..., description="ID of the jurisdiction (e.g., tpchd)")
    disease: DiseaseType = Field(..., description="Disease to calibrate")
    calibration_window_weeks: int = Field(8, description="Number of weeks to use for calibration")
    params_to_fit: List[str] = Field(..., description="Parameters to fit during calibration")
    stochastic_reps: int = Field(100, description="Number of stochastic repetitions to run")
    
    @validator("calibration_window_weeks")
    def validate_calibration_window_weeks(cls, v):
        """Validate that calibration_window_weeks is within reasonable bounds"""
        if v < 4:
            raise ValueError("calibration_window_weeks must be at least 4")
        if v > 52:
            raise ValueError("calibration_window_weeks must be at most 52")
        return v
    
    @validator("stochastic_reps")
    def validate_stochastic_reps(cls, v):
        """Validate that stochastic_reps is within reasonable bounds"""
        if v < 10:
            raise ValueError("stochastic_reps must be at least 10")
        if v > 1000:
            raise ValueError("stochastic_reps must be at most 1000")
        return v

class TimeseriesPoint(BaseModel):
    """A single point in a time series"""
    date: DateType = Field(..., description="Date for this data point")
    value: float = Field(..., description="Value for this data point")

class PercentileResult(BaseModel):
    """Results for a specific percentile"""
    p5: List[TimeseriesPoint] = Field(..., description="5th percentile timeseries")
    p25: List[TimeseriesPoint] = Field(..., description="25th percentile timeseries")
    p50: List[TimeseriesPoint] = Field(..., description="50th percentile timeseries (median)")
    p75: List[TimeseriesPoint] = Field(..., description="75th percentile timeseries")
    p95: List[TimeseriesPoint] = Field(..., description="95th percentile timeseries")

class FacilityImpact(BaseModel):
    """Impact metrics for a specific facility"""
    facility_id: str = Field(..., description="ID of the facility")
    name: str = Field(..., description="Name of the facility")
    type: str = Field(..., description="Type of facility")
    risk_band: str = Field(..., description="Risk band (low, medium, high)")
    expected_cases: float = Field(..., description="Expected number of cases")
    case_range: Dict[str, float] = Field(..., description="Range of possible case counts")
    capacity_impact_pct: float = Field(..., description="Percentage impact on capacity")

class RunResult(BaseModel):
    """Results of a completed simulation run"""
    run_id: str = Field(..., description="ID of the run")
    config: RunConfig = Field(..., description="Configuration used for the run")
    created_at: datetime = Field(..., description="Timestamp when the run was created")
    completed_at: datetime = Field(..., description="Timestamp when the run was completed")
    results: Dict[str, PercentileResult] = Field(..., description="Results by metric")
    facility_impacts: List[FacilityImpact] = Field(..., description="Impacts on facilities")
    artifacts: Dict[str, str] = Field(..., description="Paths to generated artifacts")
    calibration_metrics: Dict[str, float] = Field(..., description="Metrics about the calibration quality")
    provenance: Dict[str, Any] = Field(..., description="Provenance information about data sources and versions")

# Conversation Models for SILAS (Researcher)
class MessageType(str, Enum):
    """Types of messages in a conversation"""
    USER = "user"
    ASSISTANT = "assistant"

class Message(BaseModel):
    """A single message in a conversation"""
    id: str = Field(..., description="Unique identifier for the message")
    type: MessageType = Field(..., description="Type of message (user or assistant)")
    content: str = Field(..., description="Content of the message")
    timestamp: datetime = Field(..., description="When the message was created")
    confidence: Optional[str] = Field(None, description="Confidence level (HIGH, MEDIUM, LOW)")
    grade: Optional[str] = Field(None, description="Evidence grade (A, B, C, D)")
    sources: Optional[List[Dict[str, Any]]] = Field(None, description="Sources and citations")

class Conversation(BaseModel):
    """A conversation with SILAS (Researcher)"""
    id: str = Field(..., description="Unique identifier for the conversation")
    user_id: str = Field(..., description="ID of the user who owns this conversation")
    title: str = Field(..., description="User-friendly title for the conversation")
    messages: List[Message] = Field([], description="Messages in the conversation")
    created_at: datetime = Field(..., description="When the conversation was created")
    updated_at: datetime = Field(..., description="When the conversation was last updated")

class ConversationCreate(BaseModel):
    """Request model for creating a new conversation"""
    title: str = Field(..., description="Title for the new conversation")
    initial_message: Optional[Message] = Field(None, description="Optional initial message")

class ConversationUpdate(BaseModel):
    """Request model for updating a conversation"""
    title: Optional[str] = Field(None, description="New title for the conversation")
    messages: Optional[List[Message]] = Field(None, description="Updated list of messages")

class ConversationResponse(BaseModel):
    """Response model for conversation data"""
    id: str = Field(..., description="Unique identifier for the conversation")
    title: str = Field(..., description="Title of the conversation")
    created_at: datetime = Field(..., description="When the conversation was created")
    updated_at: datetime = Field(..., description="When the conversation was last updated")
    message_count: int = Field(..., description="Number of messages in the conversation")
    last_message_preview: Optional[str] = Field(None, description="Preview of the last message content")

# Scenario Models for Scenario Builder
class ScenarioParameters(BaseModel):
    """Model for scenario simulation parameters"""
    # Basic parameters
    disease_name: str = Field(..., description="Name of the disease")
    model_type: str = Field(..., description="Model type (SIR or SEIR)")
    start_date: Optional[str] = Field(None, description="Simulation start date")
    stop_date: Optional[str] = Field(None, description="Simulation stop date")
    unit: Optional[str] = Field(None, description="Time unit (day, week, month)")
    duration_days: Optional[int] = Field(None, description="Duration in days")
    
    # Derived metrics (user-friendly)
    basic_reproduction_number: Optional[float] = Field(None, description="R0 value")
    average_infectious_period: Optional[float] = Field(None, description="Average infectious period")
    case_fatality_rate: Optional[float] = Field(None, description="Case fatality rate")
    average_incubation_period: Optional[float] = Field(None, description="Average incubation period")
    
    # Technical parameters
    init_prev: Optional[float] = Field(None, description="Initial prevalence")
    beta: Optional[float] = Field(None, description="Transmission rate")
    gamma: Optional[float] = Field(None, description="Recovery rate")
    sigma: Optional[float] = Field(None, description="Incubation rate")
    mu: Optional[float] = Field(None, description="Mortality rate")
    
    # Seasonal parameters
    seasonal_factor: Optional[float] = Field(None, description="Seasonal multiplier")
    peak_weeks: Optional[List[int]] = Field(None, description="Peak weeks for seasonality")
    
    # Population parameters
    population_size: Optional[int] = Field(None, description="Population size")
    network_n_contacts: Optional[float] = Field(None, description="Average number of contacts")
    network_poisson_lam: Optional[float] = Field(None, description="Poisson lambda for contacts")
    
    # Vaccination parameters
    vaccination_coverage: Optional[float] = Field(None, description="Vaccination coverage")
    booster_coverage: Optional[float] = Field(None, description="Booster coverage")
    vax_transmission_eff: Optional[float] = Field(None, description="Vaccination transmission effectiveness")
    vax_severity_eff: Optional[float] = Field(None, description="Vaccination severity effectiveness")
    waning_days: Optional[int] = Field(None, description="Days to waning")
    residual_transmission_floor: Optional[float] = Field(None, description="Residual transmission floor")
    
    # Simulation parameters
    n_reps: Optional[int] = Field(None, description="Number of repetitions")
    random_seed: Optional[int] = Field(None, description="Random seed")

class Scenario(BaseModel):
    """A saved simulation scenario"""
    id: str = Field(..., description="Unique identifier for the scenario")
    user_id: str = Field(..., description="ID of the user who owns this scenario")
    name: str = Field(..., description="User-friendly name for the scenario")
    description: Optional[str] = Field(None, description="Description of the scenario")
    parameters: ScenarioParameters = Field(..., description="Scenario parameters")
    created_at: datetime = Field(..., description="When the scenario was created")
    updated_at: datetime = Field(..., description="When the scenario was last updated")
    last_run_at: Optional[datetime] = Field(None, description="When the scenario was last run")
    run_count: int = Field(0, description="Number of times this scenario has been run")
    
    # Privacy and sharing controls
    is_public: bool = Field(False, description="Whether the scenario is public to other users")
    is_shared: bool = Field(False, description="Whether the scenario has been shared")
    shared_with: Optional[List[str]] = Field(None, description="List of user IDs this scenario is shared with")
    tags: Optional[List[str]] = Field(None, description="Tags for categorizing scenarios")
    author_name: Optional[str] = Field(None, description="Display name of the scenario author")

class ScenarioCreate(BaseModel):
    """Request model for creating a new scenario"""
    name: str = Field(..., description="Name for the new scenario")
    description: Optional[str] = Field(None, description="Description of the scenario")
    parameters: ScenarioParameters = Field(..., description="Scenario parameters")
    is_public: bool = Field(False, description="Whether the scenario should be public")
    tags: Optional[List[str]] = Field(None, description="Tags for categorizing the scenario")
    author_name: Optional[str] = Field(None, description="Display name of the scenario author")

class ScenarioUpdate(BaseModel):
    """Request model for updating a scenario"""
    name: Optional[str] = Field(None, description="New name for the scenario")
    description: Optional[str] = Field(None, description="New description of the scenario")
    parameters: Optional[ScenarioParameters] = Field(None, description="Updated scenario parameters")
    is_public: Optional[bool] = Field(None, description="Whether the scenario should be public")
    tags: Optional[List[str]] = Field(None, description="Updated tags for the scenario")
    shared_with: Optional[List[str]] = Field(None, description="List of user IDs to share the scenario with")

class ScenarioShare(BaseModel):
    """Request model for sharing a scenario"""
    user_ids: List[str] = Field(..., description="List of user IDs to share the scenario with")
    message: Optional[str] = Field(None, description="Optional message to include with the share")

class ScenarioResponse(BaseModel):
    """Response model for scenario data"""
    id: str = Field(..., description="Unique identifier for the scenario")
    name: str = Field(..., description="Name of the scenario")
    description: Optional[str] = Field(None, description="Description of the scenario")
    created_at: datetime = Field(..., description="When the scenario was created")
    updated_at: datetime = Field(..., description="When the scenario was last updated")
    last_run_at: Optional[datetime] = Field(None, description="When the scenario was last run")
    run_count: int = Field(..., description="Number of times this scenario has been run")
    disease_name: str = Field(..., description="Disease name from parameters")
    model_type: str = Field(..., description="Model type from parameters")
    
    # Privacy and sharing information
    is_public: bool = Field(False, description="Whether the scenario is public")
    is_shared: bool = Field(False, description="Whether the scenario has been shared")
    tags: Optional[List[str]] = Field(None, description="Tags for the scenario")
    author_name: Optional[str] = Field(None, description="Display name of the scenario author")
    user_id: str = Field(..., description="ID of the user who owns this scenario")
    is_owner: bool = Field(True, description="Whether the current user owns this scenario")
