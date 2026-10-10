from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.app.agents.landslide_agent import landslide_agent
from backend.app.agents.flood_agent import flood_agent
from backend.app.agents.wildfire_agent import wildfire_agent
from backend.app.agents.deforestation_agent import deforestation_agent
from backend.app.data.ingestion import ingestion_pipeline

router = APIRouter(prefix="/detection", tags=["Detection"])

class DetectionRunRequest(BaseModel):
    scenario_id: str = "wayanad-landslide"
    hazard: Optional[str] = "Landslide"
    layers_selected: Optional[List[str]] = None

@router.post("/run")
def run_hazard_detection(req: DetectionRunRequest):
    ingested = ingestion_pipeline.ingest_scenario_data(req.scenario_id)
    hazard = req.hazard or "Landslide"

    if "landslide" in hazard.lower():
        result = landslide_agent.run(ingested)
    elif "flood" in hazard.lower():
        result = flood_agent.run(ingested)
    elif "fire" in hazard.lower() or "wildfire" in hazard.lower():
        result = wildfire_agent.run(ingested)
    else:
        result = deforestation_agent.run(ingested)

    return {
        "scenario_id": req.scenario_id,
        "hazard": hazard,
        "detection_result": result["output"],
        "confidence": result["confidence"],
        "layers_active": req.layers_selected or ["SAR Change", "Rainfall", "Terrain"],
        "gis_geometry": ingested["gis"]["hazard_polygon"],
        "status": "COMPLETED",
        "timestamp": ingested["timestamp"]
    }
