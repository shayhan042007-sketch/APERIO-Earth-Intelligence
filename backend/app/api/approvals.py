from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from backend.app.schemas.pydantic_schemas import AlertActionRequest
from backend.app.services.audit_logger import audit_logger
from backend.app.api.disasters import SCENARIOS_DATABASE

from backend.app.ml.risk_indices import get_scenario_indices

router = APIRouter(tags=["Alerts & Human Approval"])

ALERTS_QUEUE: List[Dict[str, Any]] = [
    {
        "id": "alert-01",
        "scenario_id": "wayanad-landslide",
        "hazard": "LANDSLIDE",
        "place": "Meppadi, Wayanad",
        "region": "Kerala",
        "risk": 91,
        "severity": "CRITICAL",
        "population": "4,250",
        "confidence": 95,
        "time_sensitivity": "Immediate review",
        "status": "AWAITING_OPERATOR_REVIEW",
        "evidence_pills": ["heavy antecedent rainfall (572mm)", "steep terrain (35°)", "SAR amplitude anomaly (+3.8dB)", "SAM scar extent (7.03 km²)"]
    },
    {
        "id": "alert-02",
        "scenario_id": "assam-flood",
        "hazard": "FLOOD",
        "place": "Dibrugarh & Basin",
        "region": "Assam",
        "risk": 78,
        "severity": "HIGH",
        "population": "8,140",
        "confidence": 88,
        "time_sensitivity": "Immediate review",
        "status": "AWAITING_OPERATOR_REVIEW",
        "evidence_pills": ["monsoonal inundation (142mm)", "SAR specular loss", "flat floodplain (4°)", "embankment vulnerability"]
    },
    {
        "id": "alert-03",
        "scenario_id": "maharashtra-fire",
        "hazard": "WILDFIRE",
        "place": "Forest Region",
        "region": "Maharashtra",
        "risk": 64,
        "severity": "MODERATE",
        "population": "1,360",
        "confidence": 81,
        "time_sensitivity": "Monitor",
        "status": "AWAITING_OPERATOR_REVIEW",
        "evidence_pills": ["thermal infrared anomaly", "negative NBR (-0.48)", "severe vegetation dryness"]
    },
    {
        "id": "alert-04",
        "scenario_id": "assam-forest",
        "hazard": "DEFORESTATION",
        "place": "Forest Region",
        "region": "Assam",
        "risk": 42,
        "severity": "WATCH",
        "population": "420",
        "confidence": 76,
        "time_sensitivity": "Monitor",
        "status": "AWAITING_OPERATOR_REVIEW",
        "evidence_pills": ["canopy fragmentation", "NDVI decline (-0.28)", "90-day persistence"]
    },
    {
        "id": "alert-fld-tinsukia",
        "scenario_id": "FLD-Tinsukia",
        "hazard": "FLOOD",
        "place": "Tinsukia District",
        "region": "Assam",
        "risk": 26,
        "severity": "MODERATE",
        "population": "2,450",
        "confidence": 88,
        "time_sensitivity": "Dynamic Flood Monitoring",
        "status": "AWAITING_OPERATOR_REVIEW",
        "evidence_pills": ["flooded area 6.14%", "corrected flooded 4.88%", "permanent water 1.26%", "Upper Brahmaputra Basin"]
    },
    {
        "id": "alert-fire-uttarakhand",
        "scenario_id": "FIRE-UT-00001",
        "hazard": "WILDFIRE",
        "place": "Garhwal Division",
        "region": "Uttarakhand",
        "risk": 64,
        "severity": "HIGH",
        "population": "1,850",
        "confidence": 75,
        "time_sensitivity": "Active Fire Radiometer Alert",
        "status": "AWAITING_OPERATOR_REVIEW",
        "evidence_pills": ["fire radiative power 10.96 MW", "brightness 349.0 K", "bright_t31 296.4 K", "daytime active fire"]
    },
    {
        "id": "alert-def-kerala",
        "scenario_id": "DEF-DEF_00007",
        "hazard": "DEFORESTATION",
        "place": "Western Ghats Grid",
        "region": "Kerala",
        "risk": 1,
        "severity": "WATCH",
        "population": "520",
        "confidence": 80,
        "time_sensitivity": "Forestry Canopy Tracking",
        "status": "AWAITING_OPERATOR_REVIEW",
        "evidence_pills": ["NDVI decline -0.0076", "forest loss 1.38%", "elevation 123.1m, slope 36.9°", "SYNTHETIC DEMO DATA"]
    }
]

def register_alert_in_queue(alert_dict: Dict[str, Any]):
    for a in ALERTS_QUEUE:
        if a["id"] == alert_dict["id"]:
            a.update(alert_dict)
            return
    ALERTS_QUEUE.append(alert_dict)

@router.get("/alerts")
def get_alerts():
    """
    Returns the priority alerts queue dynamically ranked by APERIO Priority Score:
    Priority = 0.50*HRI + 0.30*PRI + 0.20*(100 - CCPA)
    """
    enriched_alerts = []
    for alert in ALERTS_QUEUE:
        item = dict(alert)
        scen_id = item.get("scenario_id", "wayanad-landslide")
        idx_res = get_scenario_indices(scen_id)
        
        item["hri"] = idx_res["hri"]["score"]
        item["hri_classification"] = idx_res["hri"]["classification"]
        item["pri"] = idx_res["pri"]["score"]
        item["ccpa"] = idx_res["ccpa"]["score"]
        item["ccpa_classification"] = idx_res["ccpa"]["classification"]
        item["priority_score"] = idx_res["priority_score"]
        item["priority_classification"] = idx_res["classification"]
        item["indices_breakdown"] = idx_res
        enriched_alerts.append(item)

    # Sort strictly by priority_score descending
    enriched_alerts.sort(key=lambda x: x["priority_score"], reverse=True)
    return enriched_alerts


@router.post("/alerts/{alert_id}/approve")
def approve_alert(alert_id: str, req: AlertActionRequest = AlertActionRequest()):
    for a in ALERTS_QUEUE:
        if a["id"] == alert_id:
            a["status"] = "APPROVED"
            audit_logger.log_human_decision(
                alert_id=alert_id,
                operator=req.operator_name or "Mission Desk Operator",
                decision="APPROVED",
                notes=req.notes or f"Operator confirmed sensor convergence for {a['place']}."
            )
            return {
                "status": "APPROVED",
                "alert_id": alert_id,
                "message": f"Alert {alert_id} for {a['place']} has been officially approved by {req.operator_name or 'Operator'}.",
                "alert": a
            }
    raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")

@router.post("/alerts/{alert_id}/review")
def review_alert(alert_id: str, req: AlertActionRequest = AlertActionRequest()):
    for a in ALERTS_QUEUE:
        if a["id"] == alert_id:
            outcome = req.verification_outcome or "Confirmed"
            status = "APPROVED" if outcome == "Confirmed" else "REJECTED" if outcome == "Rejected" else "NEEDS_MORE_EVIDENCE"
            a["status"] = status
            from datetime import datetime, timezone
            a["operator_review"] = {
                "outcome": outcome,
                "operator_response": req.operator_response or "Tactical Advisory Dispatched",
                "agency_assigned": req.agency_assigned or "NDRF / SDMA (Simulated Agency Workflow)",
                "operator_name": req.operator_name or "Mission Desk Operator",
                "evidence_reviewed": req.evidence_reviewed or a.get("evidence_pills", []),
                "timestamp": datetime.now(timezone.utc).isoformat() + "Z"
            }
            audit_logger.log_human_decision(
                alert_id=alert_id,
                operator=req.operator_name or "Mission Desk Operator",
                decision=outcome,
                notes=f"Response: {req.operator_response} | Agency: {req.agency_assigned} | Notes: {req.notes or req.reason or 'Recorded in audit log'}"
            )
            return {
                "status": status,
                "alert_id": alert_id,
                "verification_outcome": outcome,
                "operator_response": req.operator_response,
                "agency_assigned": req.agency_assigned,
                "alert": a
            }
    raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")

@router.post("/alerts/{alert_id}/reject")
def reject_alert(alert_id: str, req: AlertActionRequest = AlertActionRequest()):
    for a in ALERTS_QUEUE:
        if a["id"] == alert_id:
            a["status"] = "REJECTED"
            audit_logger.log_human_decision(
                alert_id=alert_id,
                operator=req.operator_name or "Mission Desk Operator",
                decision="REJECTED",
                notes=req.reason or "Operator determined risk was non-critical."
            )
            return {
                "status": "REJECTED",
                "alert_id": alert_id,
                "reason": req.reason,
                "alert": a
            }
    raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")
