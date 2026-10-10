from fastapi import APIRouter
from typing import Dict, Any, List
from backend.app.schemas.pydantic_schemas import OrchestratorRunRequest, OrchestratorRunResponse
from backend.app.agents.orchestrator import orchestrator

router = APIRouter(prefix="/agents", tags=["Agents"])

AGENTS_REGISTRY = [
    {"name": "satellite_agent", "role": "Data Ingestion & Scene Metadata", "status": "ONLINE", "type": "Sensor Specialist"},
    {"name": "cloud_detection_agent", "role": "Optical Cloud Masking & Quality Assessor", "status": "ONLINE", "type": "Optical Specialist"},
    {"name": "preprocessing_agent", "role": "Radiometric & Geometric Harmonization", "status": "ONLINE", "type": "Preprocessing Specialist"},
    {"name": "change_detection_agent", "role": "Multi-Temporal SAR & Optical Surface Comparison", "status": "ONLINE", "type": "Vision Specialist"},
    {"name": "landslide_agent", "role": "Geotechnical Slope Stability & Regolith Saturation", "status": "ONLINE", "type": "Hazard Specialist"},
    {"name": "flood_agent", "role": "Hydrological Inundation & Embankment Breach Tracking", "status": "ONLINE", "type": "Hazard Specialist"},
    {"name": "wildfire_agent", "role": "Thermal Anomaly & Burn Severity Evaluation", "status": "ONLINE", "type": "Hazard Specialist"},
    {"name": "deforestation_agent", "role": "Canopy Thinning & Forest Depletion Monitor", "status": "ONLINE", "type": "Environmental Specialist"},
    {"name": "drought_agent", "role": "Soil Moisture Deficit & Vegetation Stress Tracker", "status": "ONLINE", "type": "Environmental Specialist"},
    {"name": "urban_expansion_agent", "role": "Impervious Surface & Settlement Growth Monitor", "status": "ONLINE", "type": "Spatial Specialist"},
    {"name": "sam_segmentation_agent", "role": "Spatial Scar Delineation ('WHERE?')", "status": "ONLINE", "type": "Vision Specialist"},
    {"name": "risk_assessment_agent", "role": "Feature Fusion, XGBoost, and Bayesian Inference", "status": "ONLINE", "type": "Probabilistic Specialist"},
    {"name": "explanation_agent", "role": "GeoChat Grounded Non-Hallucinatory Explainer", "status": "ONLINE", "type": "Reasoning Specialist"},
    {"name": "recommendation_agent", "role": "Carrying Capacity & Candidate Relocation Planner", "status": "ONLINE", "type": "Action Specialist"},
    {"name": "report_generation_agent", "role": "Comprehensive PDF Authority Document Compiler", "status": "ONLINE", "type": "Reporting Specialist"},
    {"name": "aperio_orchestrator", "role": "Autonomous Plan-Act-Verify-Escalate Coordinator", "status": "ONLINE", "type": "Meta Orchestrator"}
]

@router.get("")
def list_agents():
    return {
        "count": len(AGENTS_REGISTRY),
        "agents": AGENTS_REGISTRY
    }

@router.get("/status")
def get_agents_status():
    return {
        "fleet_status": "ALL_SYSTEMS_OPERATIONAL",
        "active_agents": len(AGENTS_REGISTRY),
        "agents": {a["name"]: a["status"] for a in AGENTS_REGISTRY}
    }

@router.post("/run", response_model=OrchestratorRunResponse)
def run_orchestration(req: OrchestratorRunRequest):
    return orchestrator.execute_workflow(
        scenario_id=req.scenario_id,
        disaster_type=req.disaster_type or "Landslide",
        auto_approve=req.auto_approve
    )
