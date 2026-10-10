from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime

# Agent execution statuses
# PENDING, RUNNING, COMPLETED, FAILED, NEEDS_REVIEW

class AgentExecutionTrace(BaseModel):
    agent: str
    status: str = "COMPLETED"  # PENDING, RUNNING, COMPLETED, FAILED, NEEDS_REVIEW
    confidence: float
    execution_time_ms: float
    input_sources: List[str] = Field(default_factory=list)
    output: Dict[str, Any] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)
    model_used: Optional[str] = None
    stage: Optional[str] = None

class OrchestratorRunRequest(BaseModel):
    scenario_id: str = "wayanad-landslide"
    disaster_type: Optional[str] = "Landslide"
    auto_approve: bool = False
    evidence_overrides: Optional[Dict[str, Any]] = None

class OrchestratorRunResponse(BaseModel):
    execution_id: str
    scenario_id: str
    disaster_type: str
    region: str
    status: str
    timestamp: str
    loop_stage: str
    final_risk: float
    confidence: float
    severity: str
    agent_traces: List[AgentExecutionTrace]
    evidence_summary: Dict[str, Any]
    impact_summary: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    approval_required: bool
    approval_id: Optional[str] = None
    next_monitoring_scheduled: str
    risk_indices: Optional[Dict[str, Any]] = None

class RiskPredictRequest(BaseModel):
    scenario_id: Optional[str] = "wayanad-landslide"
    slope: Optional[float] = 35.0
    elevation: Optional[float] = 1240.0
    rainfall_24h: Optional[float] = 180.0
    rainfall_72h: Optional[float] = 420.0
    rainfall_7d: Optional[float] = 580.0
    vv: Optional[float] = -12.4
    vh: Optional[float] = -18.6
    sar_change: Optional[float] = 0.72
    ndvi: Optional[float] = 0.65
    ndvi_change: Optional[float] = -0.42
    change_percentage: Optional[float] = 63.0
    segmented_area: Optional[float] = 7.03
    aspect: Optional[float] = 145.0
    curvature: Optional[float] = -0.04

class RiskPredictResponse(BaseModel):
    risk_probability: float
    severity: str
    confidence: float
    feature_importance: Dict[str, float]
    calibrated_probability: float
    calibration_method: str = "platt_scaling"
    model_name: str = "XGBoost-DisasterRisk-v2"
    source_status: str = "MODEL_OUTPUT"

class BayesianUpdateRequest(BaseModel):
    scenario_id: Optional[str] = "wayanad-landslide"
    prior: float = 0.20
    evidence: str = "sar_anomaly"  # sar_anomaly, rainfall_saturation, optical_change, terrain_instability
    evidence_strength: Optional[float] = 0.85
    likelihood_ratio: Optional[float] = None

class BayesianUpdateResponse(BaseModel):
    prior: float
    evidence: str
    posterior: float
    likelihood_ratio: float
    timestamp: str
    evidence_history: List[Dict[str, Any]]
    calibration_applied: bool = True
    uncertainty_bounds: Dict[str, float]

class RiskSimulationRequest(BaseModel):
    rainfall: float = 180.0
    slope: float = 35.0
    saturation: float = 67.0
    vegetation: float = 22.0
    instability: float = 58.0
    change: float = 63.0
    scenario_id: Optional[str] = "wayanad-landslide"

class RiskSimulationResponse(BaseModel):
    scenario_score: float
    simulated_score: float
    severity: str
    confidence: float
    factors: Dict[str, float]
    mode: str = "MODEL_PREDICTION"

class GeoChatRequest(BaseModel):
    question: str
    scenario_id: Optional[str] = "wayanad-landslide"
    context: Optional[Dict[str, Any]] = None
    messages: Optional[List[Dict[str, Any]]] = None

class GeoChatResponse(BaseModel):
    question: str
    answer: str
    grounding_evidence: Dict[str, Any]
    confidence: float
    sources: List[str]
    disclaimer: str
    map_target: Optional[Dict[str, Any]] = None
    llm_provider: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = "SUCCESS"

class AlertActionRequest(BaseModel):
    operator_name: Optional[str] = "Operator"
    verification_outcome: Optional[str] = "Confirmed"  # Confirmed, Rejected, Needs More Evidence
    operator_response: Optional[str] = "Advisory Issued"
    agency_assigned: Optional[str] = "NDRF / SDMA"
    evidence_reviewed: Optional[List[str]] = None
    notes: Optional[str] = None
    reason: Optional[str] = None

class RelocationRecommendRequest(BaseModel):
    scenario_id: str = "wayanad-landslide"
    population_to_relocate: int = 500
    origin_area: Optional[str] = "Meppadi Priority Zone"

class RelocationRecommendResponse(BaseModel):
    recommended_zone: str
    score: float
    decision_type: str = "DECISION SUPPORT"
    requires_approval: bool = True
    reasons: List[str]
    alternatives: List[Dict[str, Any]]
    route_safety: str
    shelter_details: Dict[str, Any]

class ReportGenerateRequest(BaseModel):
    scenario_id: str = "wayanad-landslide"
    format: str = "pdf"
    operator_notes: Optional[str] = "Official retrospective verification report."

class DataInventoryItem(BaseModel):
    name: str
    category: str
    format: str
    source_type: str  # DATASET, LIVE, SIMULATION
    file_path: Optional[str] = None
    crs: Optional[str] = None
    resolution: Optional[str] = None
    geographic_coverage: str
    temporal_coverage: str
    bands_or_features: List[str]
    labels_present: bool
    sample_records: int
    quality_status: str
    missing_values: Optional[str] = None

class DataInventoryResponse(BaseModel):
    timestamp: str
    total_datasets: int
    items: List[DataInventoryItem]

class IndexCalculationRequest(BaseModel):
    scenario_id: Optional[str] = "wayanad-landslide"
    # Optional overrides for HRI
    hazard_probability: Optional[float] = None
    rainfall_score: Optional[float] = None
    terrain_instability: Optional[float] = None
    satellite_change: Optional[float] = None
    recent_change: Optional[float] = None
    # Optional overrides for PRI
    population_inside_hazard_zone: Optional[float] = None
    total_regional_population: Optional[float] = None
    vulnerable_population: Optional[float] = None
    infrastructure_exposure: Optional[float] = None
    accessibility_difficulty: Optional[float] = None
    time_sensitivity: Optional[float] = None
    # Optional overrides for CCPA
    available_shelter_capacity: Optional[float] = None
    population_requiring_shelter: Optional[float] = None
    available_water: Optional[float] = None
    required_water: Optional[float] = None
    available_food: Optional[float] = None
    required_food: Optional[float] = None
    available_medical_capacity: Optional[float] = None
    required_medical_capacity: Optional[float] = None
    available_transport: Optional[float] = None
    required_transport: Optional[float] = None

