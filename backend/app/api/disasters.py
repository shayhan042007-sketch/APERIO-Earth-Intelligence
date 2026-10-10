from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from backend.app.data.disaster_repository import disaster_repository
from backend.app.agents.orchestrator import orchestrator

router = APIRouter(prefix="/disasters", tags=["Disasters"])

SCENARIOS_DATABASE: List[Dict[str, Any]] = [
    {
        "id": "wayanad-landslide",
        "hazard": "Landslide",
        "place": "Meppadi, Wayanad",
        "region": "Kerala",
        "severity": "CRITICAL",
        "risk": 91,
        "confidence": 95,
        "area": "7.03 km²",
        "population": "4,250",
        "rainfall": 180,
        "slope": 35,
        "vegetation": 22,
        "image": "/scene-landslide.jpg",
        "description": "Slope instability, rainfall saturation and debris-flow intelligence across Mundakkai and Chooralmala drainage paths.",
        "coords": [11.556, 76.135],
        "historical_events": 3,
        "sensor_convergence": "CONFIRMED (SAR + DEM + Rainfall)",
        "source_status": "DATASET"
    },
    {
        "id": "assam-flood",
        "hazard": "Flood",
        "place": "Dibrugarh & Basin",
        "region": "Assam",
        "severity": "HIGH",
        "risk": 78,
        "confidence": 88,
        "area": "18.6 km²",
        "population": "8,140",
        "rainfall": 142,
        "slope": 4,
        "vegetation": 8,
        "image": "/scene-assam.jpg",
        "description": "River inundation, embankment overflow and flood-extent intelligence along the Upper Brahmaputra floodplain.",
        "coords": [27.472, 94.912],
        "historical_events": 5,
        "sensor_convergence": "CONFIRMED (SAR Water Index + Hydrology)",
        "source_status": "DATASET"
    },
    {
        "id": "maharashtra-fire",
        "hazard": "Wildfire",
        "place": "Forest Region",
        "region": "Maharashtra",
        "severity": "MODERATE",
        "risk": 64,
        "confidence": 81,
        "area": "3.8 km²",
        "population": "1,360",
        "rainfall": 24,
        "slope": 18,
        "vegetation": 31,
        "image": "/scene-flood.jpg",
        "description": "Fire detection, burn-area monitoring and vegetation fuel-stress risk in reserve forest corridor.",
        "coords": [19.751, 75.713],
        "historical_events": 2,
        "sensor_convergence": "CONFIRMED (Thermal + NBR Index)",
        "source_status": "DATASET"
    },
    {
        "id": "assam-forest",
        "hazard": "Deforestation",
        "place": "Forest Region",
        "region": "Assam",
        "severity": "WATCH",
        "risk": 42,
        "confidence": 76,
        "area": "2.1 km²",
        "population": "420",
        "rainfall": 72,
        "slope": 11,
        "vegetation": 38,
        "image": "/scene-assam.jpg",
        "description": "Forest-loss monitoring, canopy fragmentation, and environmental change detection.",
        "coords": [26.2, 92.8],
        "historical_events": 1,
        "sensor_convergence": "CONFIRMED (NDVI Time-Series)",
        "source_status": "DATASET"
    },
    {
        "id": "FLD-Tinsukia",
        "hazard": "Flood",
        "place": "Tinsukia District",
        "region": "Assam",
        "severity": "MODERATE",
        "risk": 26,
        "confidence": 88,
        "area": "12.4 km²",
        "population": "2,450",
        "rainfall": 138,
        "slope": 4,
        "vegetation": 10,
        "image": "/scene-assam.jpg",
        "description": "District flood inundation monitoring from District_FloodedArea dataset.",
        "coords": [27.4922, 95.3468],
        "historical_events": 4,
        "sensor_convergence": "CONFIRMED (Flooded Area: 6.14%, Corrected: 4.88%)",
        "source_status": "DATASET"
    },
    {
        "id": "FIRE-UT-00001",
        "hazard": "Wildfire",
        "place": "Garhwal Division",
        "region": "Uttarakhand",
        "severity": "HIGH",
        "risk": 64,
        "confidence": 75,
        "area": "4.2 km²",
        "population": "1,850",
        "rainfall": 18,
        "slope": 22,
        "vegetation": 34,
        "image": "/scene-flood.jpg",
        "description": "Active thermal fire hotspot from Himalayan forest fire radiometer dataset.",
        "coords": [30.80037, 78.00012],
        "historical_events": 3,
        "sensor_convergence": "CONFIRMED (FRP: 10.96 MW, Brightness: 349.0 K)",
        "source_status": "DATASET"
    },
    {
        "id": "DEF-DEF_00007",
        "hazard": "Deforestation",
        "place": "Western Ghats Corridor",
        "region": "Kerala",
        "severity": "WATCH",
        "risk": 1,
        "confidence": 80,
        "area": "1.8 km²",
        "population": "520",
        "rainfall": 64,
        "slope": 36,
        "vegetation": 42,
        "image": "/scene-landslide.jpg",
        "description": "Forest canopy disturbance tracking (SYNTHETIC DEMO DATA).",
        "coords": [10.885441, 76.520764],
        "historical_events": 1,
        "sensor_convergence": "CONFIRMED (NDVI Change: -0.0076, Forest Loss: 1.38%)",
        "source_status": "SYNTHETIC DEMO DATA",
        "is_synthetic": True
    }
]

class DisasterAnalysisRequest(BaseModel):
    event_id: str
    auto_approve: bool = False

@router.get("")
def list_disasters():
    return SCENARIOS_DATABASE

@router.get("/types")
def get_disaster_types():
    """Dynamically discover available disaster types."""
    return disaster_repository.get_disaster_types()

@router.get("/states")
def get_disaster_states(disaster_type: str = Query("FLOOD")):
    """Dynamically discover states present in the disaster dataset."""
    return disaster_repository.get_states(disaster_type)

@router.get("/districts")
def get_disaster_districts(
    disaster_type: str = Query("FLOOD"),
    state: str = Query("Assam")
):
    """Dynamically discover districts or subregions in the disaster dataset for a state."""
    return disaster_repository.get_districts(disaster_type, state)

@router.get("/events")
def get_disaster_events(
    disaster_type: str = Query("FLOOD"),
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    limit: int = Query(50)
):
    """Retrieve filtered disaster events normalized to the Common Data Model."""
    return disaster_repository.get_events(disaster_type, state, district, limit)

@router.get("/event-details")
def get_disaster_event_details(event_id: str = Query(...)):
    """Retrieve full normalized event item with raw dataset fields."""
    ev = disaster_repository.get_event_by_id(event_id)
    if ev:
        return ev
    for s in SCENARIOS_DATABASE:
        if s["id"] == event_id:
            return s
    raise HTTPException(status_code=404, detail=f"Disaster event '{event_id}' not found")

@router.post("/analyze")
def analyze_disaster_event(req: DisasterAnalysisRequest):
    """Runs the full APERIO decision pipeline on a dataset event."""
    return orchestrator.execute_workflow(scenario_id=req.event_id, auto_approve=req.auto_approve)

@router.get("/{scenario_id}")
def get_disaster_by_id(scenario_id: str):
    # Check disaster repository first
    ev = disaster_repository.get_event_by_id(scenario_id)
    if ev:
        return {
            "id": ev["event_id"],
            "hazard": ev["disaster_type"].capitalize(),
            "place": ev["district"] or f"{ev['state']} Area",
            "region": ev["state"],
            "severity": ev["severity"],
            "risk": int(ev["risk_score"]),
            "confidence": int(ev["confidence"] * 100),
            "area": "N/A" if ev["latitude"] is None else "Survey extent",
            "population": "Assessed in loop",
            "rainfall": 120,
            "slope": 15,
            "vegetation": 25,
            "image": "/scene-flood.jpg" if ev["disaster_type"] == "FLOOD" else "/scene-landslide.jpg" if ev["disaster_type"] == "LANDSLIDE" else "/scene-assam.jpg",
            "description": f"Observation in {ev['district'] or ev['state']}: {ev['source']}",
            "coords": [ev["latitude"], ev["longitude"]] if ev["latitude"] and ev["longitude"] else [20.5937, 78.9629],
            "historical_events": 1,
            "sensor_convergence": "EVALUATING",
            "source_status": "DATASET",
            "normalized_event": ev
        }
    for s in SCENARIOS_DATABASE:
        if s["id"] == scenario_id:
            return s
    raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")
