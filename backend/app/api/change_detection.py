from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any
from backend.app.agents.change_detection_agent import change_detection_agent

router = APIRouter(prefix="/change-detection", tags=["Change Detection"])

class ChangeDetectionRunRequest(BaseModel):
    scenario_id: str = "wayanad-landslide"
    sensor_type: Optional[str] = "Sentinel-1"

@router.get("")
def get_change_detection_metadata(scenario_id: str = Query("wayanad-landslide")):
    res = change_detection_agent.run(scenario_id)
    return res["output"]

@router.post("/run")
def run_change_detection(req: ChangeDetectionRunRequest):
    res = change_detection_agent.run(req.scenario_id)
    return {
        "status": "COMPLETED",
        "scenario_id": req.scenario_id,
        "sensor_type": req.sensor_type or "Sentinel-1",
        "result": res["output"],
        "confidence": res["confidence"],
        "execution_time_ms": res["execution_time_ms"]
    }
