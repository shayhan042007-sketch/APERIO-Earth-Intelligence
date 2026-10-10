from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, Optional
import os, json
from backend.app.agents.satellite_agent import satellite_agent
from backend.services.satellite_imagery.event_catalog import resolve_event

router = APIRouter(prefix="/satellite", tags=["Satellite"])

@router.get("")
def get_satellite_observation(scenario_id: str = Query("wayanad-landslide")):
    res = satellite_agent.run(scenario_id)
    return res["output"]

@router.get("/history")
def get_satellite_history(scenario_id: str = Query("wayanad-landslide")):
    sid = scenario_id.lower()
    if "wayanad" in sid or "landslide" in sid:
        folder = "wayanad_landslide"
    elif "assam" in sid or "flood" in sid or "tinsukia" in sid or "fld" in sid:
        folder = "assam_flood"
    elif "fire" in sid or "wildfire" in sid or "uttarakhand" in sid:
        folder = "uttarakhand_wildfire"
    else:
        folder = "deforestation"

    meta_path = f"backend/data/satellite_imagery/{folder}/metadata.json"
    if os.path.exists(meta_path):
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        pre_info = meta.get("pre_event", {})
        post_info = meta.get("post_event", {})
        observations = [
            {
                "scene_id": pre_info.get("scene_id", f"S2_{folder}_PRE"),
                "date": pre_info.get("date", "2024-01-01"),
                "sensor": f"Sentinel-2 MSI ({meta.get('tile', 'L2A')})",
                "type": "Pre-Event Baseline (True Color TCI)",
                "cloud_pct": round(pre_info.get("cloud_cover", 0.0), 2),
                "status": "CALIBRATED_BASELINE_L2A"
            },
            {
                "scene_id": post_info.get("scene_id", f"S2_{folder}_POST"),
                "date": post_info.get("date", "2024-01-10"),
                "sensor": f"Sentinel-2 MSI ({meta.get('tile', 'L2A')})",
                "type": "Post-Event Observation (True Color TCI)",
                "cloud_pct": round(post_info.get("cloud_cover", 0.0), 2),
                "status": "OBSERVED_EVENT_L2A"
            }
        ]
    else:
        observations = []

    return {
        "scenario_id": scenario_id,
        "total_scenes": len(observations),
        "history": observations,
        "source": "REAL_SENTINEL2_DATASET"
    }

@router.get("/imagery/{event_id}")
def get_satellite_event_imagery(event_id: str):
    """
    Returns pre- and post-event Sentinel-2 True-Color imagery metadata and web URLs.
    Matching Requirement 13.
    """
    spec = resolve_event(event_id)
    folder = spec["directory"] if spec else "wayanad_landslide"
    meta_path = f"backend/data/satellite_imagery/{folder}/metadata.json"

    if not os.path.exists(meta_path):
        return {
            "available": False,
            "event_id": event_id,
            "status": "SATELLITE_IMAGERY_UNAVAILABLE",
            "message": f"Satellite imagery unavailable for event '{event_id}'"
        }

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    pre_info = meta.get("pre_event", {})
    post_info = meta.get("post_event", {})

    from backend.app.geospatial.change_intelligence import analyze_scenario_change
    intel = analyze_scenario_change(event_id)

    return {
        "available": True,
        "event_id": event_id,
        "pre_event": {
            "image_url": f"/satellite_imagery/{folder}/pre_event.png",
            "date": pre_info.get("date", "")[:10],
            "sensor": meta.get("sensor", "Sentinel-2"),
            "product": meta.get("product", "L2A"),
            "tile": meta.get("tile", ""),
            "bands": ["B04", "B03", "B02"],
            "cloud_cover": round(float(pre_info.get("cloud_cover", 0.0)), 2)
        },
        "post_event": {
            "image_url": f"/satellite_imagery/{folder}/post_event.png",
            "date": post_info.get("date", "")[:10],
            "sensor": meta.get("sensor", "Sentinel-2"),
            "product": meta.get("product", "L2A"),
            "tile": meta.get("tile", ""),
            "bands": ["B04", "B03", "B02"],
            "cloud_cover": round(float(post_info.get("cloud_cover", 0.0)), 2)
        },
        "bbox": meta.get("bbox", spec.get("bbox") if spec else []),
        "region": meta.get("region", ""),
        "source": meta.get("source", "Copernicus Data Space Ecosystem / Microsoft Planetary Computer"),
        "detection_zones": intel.get("detection_zones", []),
        "metrics": {
            "previous_affected_extent_km2": intel.get("previous_affected_extent_km2"),
            "latest_affected_extent_km2": intel.get("latest_affected_extent_km2"),
            "newly_affected_area_km2": intel.get("newly_affected_area_km2"),
            "receded_area_km2": intel.get("receded_area_km2"),
            "net_change_km2": intel.get("net_change_km2"),
            "percentage_change": intel.get("percentage_change"),
            "percentage_change_label": intel.get("percentage_change_label"),
            "analyzed_area_km2": intel.get("analyzed_area_km2"),
            "methodology": intel.get("methodology"),
            "detection_status": intel.get("detection_status")
        }
    }

