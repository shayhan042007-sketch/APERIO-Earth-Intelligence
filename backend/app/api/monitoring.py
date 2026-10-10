from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from backend.app.agents.orchestrator import orchestrator
from backend.app.api.disasters import SCENARIOS_DATABASE

router = APIRouter(prefix="/monitoring", tags=["Continuous Monitoring"])

MONITORING_STEPS = [
    "New satellite observation ingested",
    "Data quality & cloud detection check",
    "Sensor preprocessing & coregistration",
    "Temporal change detection",
    "Specialized disaster hazard evaluation",
    "SAM spatial segmentation ('WHERE?')",
    "Multi-modal feature fusion",
    "XGBoost risk prediction ('WHAT / HOW LIKELY?')",
    "Bayesian sequential belief update",
    "Updated calibrated risk surface",
    "Priority alert generation",
    "Human operator review & approval",
    "Automated authority reporting",
    "Continuous cycle standby"
]

OPERATIONAL_LOOP = [
    {"code": "OBSERVE", "label": "Multi-Sensor Observation Ingestion", "desc": "Ingest optical, SAR, or thermal radiometer observation."},
    {"code": "COMPARE", "label": "Bi-temporal Baseline Differencing", "desc": "Co-register against pre-disaster baseline observation."},
    {"code": "DETECT_CHANGE", "label": "Surface Anomaly & SAM Delineation", "desc": "Quantify physical delta (water, scar, canopy, thermal)."},
    {"code": "UPDATE_RISK", "label": "XGBoost & Sequential Bayesian Update", "desc": "Fuse evidence into posterior calibrated risk score."},
    {"code": "ESCALATE_VERIFY", "label": "Human Commander Review & Agency Action", "desc": "Close loop with verified dispatch or audit record."}
]

MONITORING_HISTORY = [
    {
        "cycle_id": "cycle-01",
        "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
        "scenario": "Wayanad Landslide",
        "step_reached": 13,
        "final_risk": 91.0,
        "status": "APPROVED_BY_OPERATOR"
    }
]

class MonitoringRunRequest(BaseModel):
    scenario_id: Optional[str] = "wayanad-landslide"
    step_advance: Optional[int] = 1

@router.get("")
def get_monitoring_state(scenario_id: Optional[str] = Query("wayanad-landslide")):
    if not isinstance(scenario_id, str):
        scenario_id = "wayanad-landslide"
    sid = (scenario_id or "wayanad-landslide").lower()
    scen = next((s for s in SCENARIOS_DATABASE if s["id"].lower() == sid), SCENARIOS_DATABASE[0])

    if "wayanad" in sid or "landslide" in sid:
        sensor = "Sentinel-1 C-SAR IW & Sentinel-2 MSI"
        latest_obs = "2024-07-31T00:48Z (Post-failure SAR pass)"
        prev_obs = "2024-07-23T00:48Z (Baseline pre-event pass)"
        change = "Debris avalanche scar (+3.8 dB decorrelation, 7.03 km²)"
        prev_risk = 32.0
        latest_risk = 91.0
        trend = [
            {"observation": "Baseline T0 (Dry)", "risk": 20.0},
            {"observation": "SAR Decorrelation T1", "risk": 48.0},
            {"observation": "Monsoon Burst T2 (180mm)", "risk": 74.0},
            {"observation": "Debris Convergence T3", "risk": 91.0}
        ]
        status = "CRITICAL_ESCALATION_ACTIVE"
        next_state = "Next Sentinel-1 C-SAR ascending pass in 4.5 hours"
    elif "tinsukia" in sid or "fld" in sid:
        sensor = "Sentinel-1 C-SAR (Flood Specular Loss)"
        latest_obs = "2024-08-08T06:15Z (Monsoon peak pass)"
        prev_obs = "2024-08-01T06:15Z (Pre-flood baseline)"
        change = "District inundation: 6.14% flooded area, 1.26% permanent water"
        prev_risk = 14.0
        latest_risk = 26.0
        trend = [
            {"observation": "Pre-Monsoon Base T0", "risk": 10.0},
            {"observation": "River Swell T1", "risk": 18.0},
            {"observation": "Peak Floodplain Spill T2", "risk": 26.0}
        ]
        status = "ACTIVE_RIVERINE_MONITORING"
        next_state = "Next Brahmaputra flood wave projection at 18:00 UTC"
    elif "assam" in sid or "flood" in sid:
        sensor = "Sentinel-1 C-SAR & Sentinel-2 Optical"
        latest_obs = "2024-08-12T11:24Z (Post-flood peak pass)"
        prev_obs = "2024-08-01T11:24Z (Pre-flood normal flow)"
        change = "Brahmaputra bank overflow (18.6 km² inundated)"
        prev_risk = 38.0
        latest_risk = 78.0
        trend = [
            {"observation": "Normal Bank T0", "risk": 24.0},
            {"observation": "Rising Gauge T1", "risk": 52.0},
            {"observation": "Peak Inundation T2", "risk": 78.0}
        ]
        status = "HIGH_INUNDATION_WATCH"
        next_state = "Next C-SAR descending pass in 6.0 hours"
    elif "fire" in sid or "wildfire" in sid or "uttarakhand" in sid:
        sensor = "MODIS/VIIRS Active Fire Radiometer & Sentinel-2 MSI"
        latest_obs = "2024-05-18T14:30Z (Thermal pass)"
        prev_obs = "2024-05-17T14:30Z (Pre-ignition baseline)"
        change = "Thermal hotspot detected (FRP 10.96 MW, Brightness 349.0 K)"
        prev_risk = 22.0
        latest_risk = 64.0
        trend = [
            {"observation": "Pre-Fire Vegetated T0", "risk": 18.0},
            {"observation": "Thermal Anomaly T1", "risk": 44.0},
            {"observation": "Active Fire Radiometer T2", "risk": 64.0}
        ]
        status = "ACTIVE_THERMAL_ALERT"
        next_state = "Next VIIRS night pass in 3.2 hours"
    else:  # Deforestation
        sensor = "Sentinel-2 MSI (NDVI Delta) & Sentinel-1 C-SAR"
        latest_obs = "2024-06-15T05:20Z (Cloud-free optical sweep)"
        prev_obs = "2024-03-10T05:20Z (Quarterly baseline pass)"
        change = "Canopy disturbance alert (NDVI delta -0.0076, SYNTHETIC DEMO DATA)"
        prev_risk = 0.5
        latest_risk = 1.0
        trend = [
            {"observation": "Canopy Baseline T0", "risk": 0.2},
            {"observation": "Initial Disturbance T1", "risk": 0.6},
            {"observation": "Verified Canopy Loss T2", "risk": 1.0}
        ]
        status = "CONSERVATION_ROUTINE_MONITORING"
        next_state = "Next Sentinel-2 5-day cycle pass scheduled"

    return {
        "scenario_id": scen["id"],
        "region": scen.get("place", "Target Region"),
        "hazard": scen.get("hazard", "Hazard"),
        "severity": scen.get("severity", "WATCH"),
        "sensor_source": sensor,
        "latest_observation": latest_obs,
        "previous_observation": prev_obs,
        "change_detected": change,
        "previous_risk": prev_risk,
        "latest_risk": latest_risk,
        "monitoring_status": status,
        "last_update": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "next_scheduled_state": next_state,
        "operational_loop": OPERATIONAL_LOOP,
        "pipeline_stages": MONITORING_STEPS,
        "total_steps": len(MONITORING_STEPS),
        "recent_cycles": MONITORING_HISTORY,
        "monitoring_frequency": "Every 6 Hours (Constellation Ingestion)",
        "risk_progression_trend": trend
    }

@router.post("/run")
def trigger_monitoring_cycle(req: MonitoringRunRequest = MonitoringRunRequest()):
    scenario_id = req.scenario_id or "wayanad-landslide"
    res = orchestrator.execute_workflow(scenario_id=scenario_id)

    cycle_entry = {
        "cycle_id": f"cycle-{len(MONITORING_HISTORY)+1}",
        "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
        "scenario": res.region,
        "final_risk": res.final_risk,
        "severity": res.severity,
        "status": "CYCLE_COMPLETED_ESCALATED" if res.approval_required else "CYCLE_COMPLETED_CLEAR"
    }
    MONITORING_HISTORY.insert(0, cycle_entry)

    return {
        "status": "MONITORING_CYCLE_EXECUTED",
        "cycle": cycle_entry,
        "orchestrator_execution_id": res.execution_id,
        "evidence_summary": res.evidence_summary,
        "next_pass_scheduled": res.next_monitoring_scheduled
    }
