"""
APERIO 2.0 - Controlled Copilot Tool Calling Service
Provides structured, audited backend tools for the AI Copilot.
Directly executes against verified geospatial, risk, relocation, and resource engines.
"""
from typing import Dict, Any, List, Optional
import json

from backend.app.api.disasters import SCENARIOS_DATABASE
from backend.app.ml.risk_indices import get_scenario_indices
from backend.app.agents.change_detection_agent import change_detection_agent
from backend.app.api.relocation import get_relocation_options
from backend.app.api.resources import get_resource_inventory, resolve_region_key
from backend.app.api.monitoring import get_monitoring_state

def tool_get_scenario_details(scenario_id: str) -> Dict[str, Any]:
    """Retrieves metadata, coordinates, sensors, and observed baseline for a disaster scenario."""
    scen = next((s for s in SCENARIOS_DATABASE if s["id"] == scenario_id), None)
    if not scen:
        key = resolve_region_key(scenario_id, None)
        scen = next((s for s in SCENARIOS_DATABASE if key in s["id"].lower() or key in s.get("place", "").lower()), SCENARIOS_DATABASE[0])
    return {
        "id": scen["id"],
        "hazard": scen["hazard"],
        "place": scen["place"],
        "region": scen["region"],
        "severity": scen["severity"],
        "baseline_risk_pct": scen["risk"],
        "confidence_pct": scen["confidence"],
        "affected_area": scen["area"],
        "population": scen["population"],
        "rainfall_mm": scen["rainfall"],
        "slope_deg": scen["slope"],
        "coordinates": scen["coords"],
        "sensors_supported": scen.get("sensors_supported", []),
        "pre_date": scen.get("pre_date"),
        "post_date": scen.get("post_date")
    }

def tool_get_risk_indices(scenario_id: str) -> Dict[str, Any]:
    """Retrieves deterministic APERIO Risk Indices: HRI, PRI, CCPA, and Priority Score."""
    indices = get_scenario_indices(scenario_id)
    return {
        "scenario_id": scenario_id,
        "priority_score": indices.get("priority_score"),
        "classification": indices.get("classification"),
        "hazard_risk_index_hri": {
            "score": indices.get("hri", {}).get("score"),
            "classification": indices.get("hri", {}).get("classification"),
            "components": indices.get("hri", {}).get("components")
        },
        "population_risk_index_pri": {
            "score": indices.get("pri", {}).get("score"),
            "components": indices.get("pri", {}).get("components")
        },
        "carrying_capacity_ccpa": {
            "score": indices.get("ccpa", {}).get("score"),
            "deficit_pct": indices.get("ccpa", {}).get("deficit"),
            "classification": indices.get("ccpa", {}).get("classification"),
            "components": indices.get("ccpa", {}).get("components")
        }
    }

def tool_get_change_detection(scenario_id: str) -> Dict[str, Any]:
    """Retrieves multi-temporal satellite change detection measurements, affected extent, and detection zones."""
    res = change_detection_agent.run(scenario_id)
    out = res.get("output", {})
    zones_summary = []
    for z in out.get("detection_zones", []):
        zones_summary.append({
            "zone_id": z.get("id"),
            "name": z.get("name"),
            "area_km2": z.get("area_km2"),
            "classification": z.get("classification"),
            "confidence": z.get("confidence"),
            "evidence": z.get("evidence"),
            "center": z.get("center_geo")
        })
    return {
        "scenario_id": scenario_id,
        "hazard_type": out.get("change_type"),
        "pre_observation_date": out.get("pre_date"),
        "post_observation_date": out.get("post_date"),
        "pre_sensor": out.get("pre_sensor"),
        "post_sensor": out.get("post_sensor"),
        "previous_affected_km2": out.get("previous_affected_extent_km2"),
        "latest_affected_km2": out.get("latest_affected_extent_km2"),
        "net_change_km2": out.get("net_change_km2"),
        "percentage_change": out.get("percentage_change_label"),
        "detection_confidence": out.get("detection_confidence"),
        "methodology": out.get("methodology"),
        "total_zones": out.get("total_zones_count"),
        "zones": zones_summary
    }

def tool_get_relocation_options(scenario_id: str, population_to_relocate: Optional[int] = None) -> Dict[str, Any]:
    """Retrieves algorithmically ranked candidate shelters, distance, road status, and capacity."""
    reloc = get_relocation_options(scenario_id, population_to_relocate)
    return {
        "scenario_id": scenario_id,
        "decision_type": reloc.get("decision_type"),
        "requires_human_approval": reloc.get("requires_human_approval", True),
        "population_to_relocate": reloc.get("population_to_relocate"),
        "top_shelter": reloc.get("top_shelter"),
        "alternatives": reloc.get("alternatives", []),
        "disclaimer": reloc.get("disclaimer")
    }

def tool_get_resource_inventory(scenario_id: str) -> Dict[str, Any]:
    """Retrieves verified shelter space, hospital beds, ambulance fleet, population figures, road status, and shortages."""
    inv = get_resource_inventory(scenario_id=scenario_id, region=None)
    return {
        "scenario_id": inv.get("scenario_id"),
        "place": inv.get("place_name"),
        "region": inv.get("region_name"),
        "population_metrics": inv.get("population_metrics"),
        "shelter_metrics": {
            "total_capacity": inv.get("shelter_metrics", {}).get("total_capacity"),
            "total_occupied": inv.get("shelter_metrics", {}).get("total_occupied"),
            "total_available": inv.get("shelter_metrics", {}).get("total_available"),
            "shelters": [
                {
                    "name": s.get("name"),
                    "capacity": s.get("capacity"),
                    "occupancy": s.get("occupancy"),
                    "available": max(0, s.get("capacity", 0) - s.get("occupancy", 0)),
                    "road_status": s.get("road_status"),
                    "hazard_risk": s.get("hazard_risk"),
                    "lat": s.get("lat"),
                    "lon": s.get("lon")
                }
                for s in inv.get("shelter_metrics", {}).get("shelters", [])
            ]
        },
        "healthcare_metrics": {
            "total_beds": inv.get("healthcare_metrics", {}).get("total_beds"),
            "available_beds": inv.get("healthcare_metrics", {}).get("available_beds"),
            "total_ambulances": inv.get("healthcare_metrics", {}).get("total_ambulances"),
            "hospitals": [
                {
                    "name": h.get("name"),
                    "beds_total": h.get("beds_total"),
                    "beds_available": h.get("beds_available"),
                    "ambulances": h.get("ambulances"),
                    "trauma_level": h.get("trauma_level")
                }
                for h in inv.get("healthcare_metrics", {}).get("hospitals", [])
            ]
        },
        "road_network": inv.get("road_metrics"),
        "carrying_capacity": inv.get("carrying_capacity"),
        "shortage_watch": inv.get("shortage_watch"),
        "recommendations": inv.get("recommendations")
    }

def tool_compare_regions(scenario_a: str, scenario_b: str) -> Dict[str, Any]:
    """Compares two disaster regions across hazard type, risk indices, population exposure, and capacity."""
    meta_a = tool_get_scenario_details(scenario_a)
    meta_b = tool_get_scenario_details(scenario_b)
    risk_a = tool_get_risk_indices(scenario_a)
    risk_b = tool_get_risk_indices(scenario_b)
    res_a = tool_get_resource_inventory(scenario_a)
    res_b = tool_get_resource_inventory(scenario_b)

    return {
        "region_a": {
            "place": meta_a["place"],
            "hazard": meta_a["hazard"],
            "priority_score": risk_a["priority_score"],
            "hri": risk_a["hazard_risk_index_hri"]["score"],
            "pri": risk_a["population_risk_index_pri"]["score"],
            "ccpa": risk_a["carrying_capacity_ccpa"]["score"],
            "census_estimate": res_a["population_metrics"]["district_census_estimate"],
            "hazard_zone_pop": res_a["population_metrics"]["population_inside_hazard_zone"],
            "relocation_required": res_a["population_metrics"]["population_requiring_relocation"],
            "shelter_available_beds": res_a["shelter_metrics"]["total_available"],
            "hospital_available_beds": res_a["healthcare_metrics"]["available_beds"]
        },
        "region_b": {
            "place": meta_b["place"],
            "hazard": meta_b["hazard"],
            "priority_score": risk_b["priority_score"],
            "hri": risk_b["hazard_risk_index_hri"]["score"],
            "pri": risk_b["population_risk_index_pri"]["score"],
            "ccpa": risk_b["carrying_capacity_ccpa"]["score"],
            "census_estimate": res_b["population_metrics"]["district_census_estimate"],
            "hazard_zone_pop": res_b["population_metrics"]["population_inside_hazard_zone"],
            "relocation_required": res_b["population_metrics"]["population_requiring_relocation"],
            "shelter_available_beds": res_b["shelter_metrics"]["total_available"],
            "hospital_available_beds": res_b["healthcare_metrics"]["available_beds"]
        }
    }

def tool_get_monitoring_status() -> Dict[str, Any]:
    """Retrieves current autonomous pipeline monitoring telemetry, pass schedule, and active cycles."""
    return get_monitoring_state()

def tool_highlight_map_target(name: str, target_type: str, lat: Optional[float] = None, lon: Optional[float] = None, zone_id: Optional[str] = None) -> Dict[str, Any]:
    """Generates a structured map target action to focus, zoom, or highlight on the dashboard map."""
    return {
        "action": "HIGHLIGHT_MAP_TARGET",
        "target_name": name,
        "target_type": target_type,  # 'shelter', 'hospital', 'detection_zone', 'hazard_area'
        "lat": lat,
        "lon": lon,
        "zone_id": zone_id,
        "status": "ACTION_DISPATCHED",
        "message": f"Highlighting {name} ({target_type}) on the dashboard map."
    }

# Mapping of tool names to callable functions
TOOL_REGISTRY = {
    "get_scenario_details": tool_get_scenario_details,
    "get_risk_indices": tool_get_risk_indices,
    "get_change_detection": tool_get_change_detection,
    "get_relocation_options": tool_get_relocation_options,
    "get_resource_inventory": tool_get_resource_inventory,
    "compare_regions": tool_compare_regions,
    "get_monitoring_status": tool_get_monitoring_status,
    "highlight_map_target": tool_highlight_map_target
}

def execute_copilot_tool(tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """Executes a registered tool safely with argument forwarding and error wrapping."""
    fn = TOOL_REGISTRY.get(tool_name)
    if not fn:
        return {"error": f"Unknown tool: '{tool_name}'"}
    try:
        return fn(**args)
    except Exception as e:
        return {"error": f"Tool execution failed for '{tool_name}': {str(e)}"}

# OpenAI-compatible function calling schemas
OPENAI_TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_scenario_details",
            "description": "Retrieves physical geography, coordinates, supported satellite sensors, and baseline observed risk for a disaster scenario.",
            "parameters": {
                "type": "object",
                "properties": {
                    "scenario_id": {"type": "string", "description": "The scenario ID (e.g. 'wayanad-landslide', 'FLD-Tinsukia', 'FIRE-UT-00001', 'DEF-DEF_00007')"}
                },
                "required": ["scenario_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_risk_indices",
            "description": "Retrieves deterministic APERIO Risk Indices including Hazard Risk Index (HRI), Population Risk Index (PRI), Carrying Capacity (CCPA), and overall Priority Score.",
            "parameters": {
                "type": "object",
                "properties": {
                    "scenario_id": {"type": "string", "description": "Scenario ID"}
                },
                "required": ["scenario_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_change_detection",
            "description": "Retrieves multi-temporal satellite change detection measurements, pre/post observation dates, sensors, net changed area (km²), and detected zones.",
            "parameters": {
                "type": "object",
                "properties": {
                    "scenario_id": {"type": "string", "description": "Scenario ID"}
                },
                "required": ["scenario_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_relocation_options",
            "description": "Retrieves algorithmically ranked candidate relief shelters, travel distances, road accessibility, and available capacities for civilian evacuation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "scenario_id": {"type": "string", "description": "Scenario ID"},
                    "population_to_relocate": {"type": "integer", "description": "Number of people requiring relocation"}
                },
                "required": ["scenario_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_resource_inventory",
            "description": "Retrieves verified shelter beds, regional hospital facilities, ambulance fleet, 4-tier population metrics (district census, cluster, hazard zone, evacuees), and logistics shortages.",
            "parameters": {
                "type": "object",
                "properties": {
                    "scenario_id": {"type": "string", "description": "Scenario ID"}
                },
                "required": ["scenario_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "compare_regions",
            "description": "Compares two disaster scenarios side-by-side across risk indices, census demographics, hazard population, and shelter capacities.",
            "parameters": {
                "type": "object",
                "properties": {
                    "scenario_a": {"type": "string", "description": "First scenario ID"},
                    "scenario_b": {"type": "string", "description": "Second scenario ID"}
                },
                "required": ["scenario_a", "scenario_b"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_monitoring_status",
            "description": "Retrieves status of autonomous sensor monitoring cycles, verification queues, and next scheduled satellite overpass.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "highlight_map_target",
            "description": "Highlights, zooms, or marks a specific shelter, hospital, or detection zone on the dashboard map view.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Name of the facility or zone"},
                    "target_type": {"type": "string", "enum": ["shelter", "hospital", "detection_zone", "hazard_area"], "description": "Type of geospatial target"},
                    "lat": {"type": "number", "description": "Latitude coordinate if available"},
                    "lon": {"type": "number", "description": "Longitude coordinate if available"},
                    "zone_id": {"type": "string", "description": "Detection zone ID if target is a zone (e.g. 'S-01')"}
                },
                "required": ["name", "target_type"]
            }
        }
    }
]

# Gemini-compatible function declaration schema
GEMINI_TOOL_DECLARATIONS = [
    {
        "name": t["function"]["name"],
        "description": t["function"]["description"],
        "parameters": t["function"]["parameters"]
    }
    for t in OPENAI_TOOL_DEFINITIONS
]
