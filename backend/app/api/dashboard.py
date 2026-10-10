from fastapi import APIRouter
from typing import Dict, Any
from backend.app.api.disasters import SCENARIOS_DATABASE
from backend.app.services.audit_logger import audit_logger

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("")
def get_dashboard_summary():
    total_scenarios = len(SCENARIOS_DATABASE)
    critical_alerts = sum(1 for s in SCENARIOS_DATABASE if s["severity"] == "CRITICAL")
    high_alerts = sum(1 for s in SCENARIOS_DATABASE if s["severity"] == "HIGH")
    
    recent_logs = audit_logger.get_logs(limit=6)

    return {
        "status": "OPERATIONAL",
        "system": "APERIO Autonomous Earth Intelligence Platform",
        "version": "2.4.0-ML-Agentic",
        "environment": "PROTOTYPE_DEMO_ENVIRONMENT",
        "active_scenarios_count": total_scenarios,
        "critical_alerts": critical_alerts,
        "high_alerts": high_alerts,
        "scenes_analyzed_total": 48,
        "models_active": [
            "XGBoost Gradient Boosted Classifier (Trained & Calibrated)",
            "Recursive Bayesian Sequential Odds Updater",
            "Segment Anything Model (SAM) Spatial Interface",
            "Horn DEM Topographic Curvature & Slope Engine"
        ],
        "agent_fleet_status": "ONLINE (10 Specialist Agents Ready)",
        "scenarios": SCENARIOS_DATABASE,
        "recent_audit_trail": recent_logs
    }
