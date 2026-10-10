from fastapi import APIRouter, Query
from typing import Dict, Any, Optional, List
from backend.app.data.gis import get_gis_layers

router = APIRouter(prefix="/resources", tags=["Resources"])

REGION_POPULATION_METADATA: Dict[str, Dict[str, Any]] = {
    "wayanad": {
        "region_id": "wayanad-landslide",
        "place": "Meppadi, Wayanad",
        "state": "Kerala",
        "hazard": "Landslide",
        "district_census_estimate": 817420,  # Wayanad District Census 2011
        "district_label": "Wayanad District ~817,420 (Census 2011 estimate; Vythiri Taluk ~192,000)",
        "total_regional_population": 12500,  # Local Panchayat cluster (Meppadi & Chooralmala)
        "population_inside_hazard_zone": 4250,  # Mundakkai (1,850) + Chooralmala (2,400)
        "estimated_exposed_population": 4250,
        "population_requiring_relocation": 1420,  # Zone 4 immediate evacuation corridor
        "relocation_required_rationale": "Severe regolith saturation and active debris flow runout in Zone 4 require mandatory evacuation of 1,420 residents.",
        "food_meals_available": 2800,
        "water_litres_available": 3200,
        "medical_staff_available": 18,
        "medical_staff_required": 25,
        "emergency_vehicles_available": 8,
        "emergency_vehicles_required": 14,
        "accessibility_difficulty_pct": 88.0,
        "road_network_status": "Restricted (Bridge Damaged at Vellarmala)",
        "data_source": "District Census 2011, Panchayat Settlements & KSDMA Ground Truth",
        "recommendations": [
            "Request district food logistics supply convoy from Kalpetta depot to replenish dry meal rations.",
            "Deploy mobile water tankers to Meppadi and Chooralmala staging points (WHO buffer: 3L/person/day).",
            "Vellarmala bridge damaged: route emergency medical transport exclusively via Kalpetta Bypass Link.",
            "Alert Wayanad District General Hospital (Mananthavady) trauma team for standby rotation."
        ]
    },
    "tinsukia": {
        "region_id": "FLD-Tinsukia",
        "place": "Tinsukia District",
        "state": "Assam",
        "hazard": "Flood",
        "district_census_estimate": 1327929,  # Tinsukia District Census 2011
        "district_label": "Tinsukia District ~1,327,929 (Census 2011 estimate; Sub-division cluster ~35,000)",
        "total_regional_population": 35000,
        "population_inside_hazard_zone": 2450,
        "estimated_exposed_population": 2450,
        "population_requiring_relocation": 1200,  # Low-lying riverside bastis
        "relocation_required_rationale": "Brahmaputra tributary embankment overflow inundating low-lying rural wards; 1,200 residents assigned to elevated cyclone/flood relief centers.",
        "food_meals_available": 5800,
        "water_litres_available": 6000,
        "medical_staff_available": 22,
        "medical_staff_required": 25,
        "emergency_vehicles_available": 11,
        "emergency_vehicles_required": 12,
        "accessibility_difficulty_pct": 72.0,
        "road_network_status": "Operational (Minor Surface Pooling on Bordubi Embankment)",
        "data_source": "District_FloodedArea Dataset, Census 2011 & ASDMA Flood Roster",
        "recommendations": [
            "Pre-position SDRF inflatable rescue boats at Doomdooma elevated staging area.",
            "Monitor Bordubi embankment road for cresting tributary backflow.",
            "Distribute water purification tablets across Tinsukia Multipurpose Center.",
            "Shelter capacity adequate across combined district camp network (1,770 beds available vs 1,200 needed)."
        ]
    },
    "assam-flood": {
        "region_id": "assam-flood",
        "place": "Dibrugarh & Basin",
        "state": "Assam",
        "hazard": "Flood",
        "district_census_estimate": 1326744,  # Dibrugarh District Census 2011
        "district_label": "Dibrugarh District ~1,326,744 (Census 2011 estimate; Riverine tract ~35,000)",
        "total_regional_population": 35000,
        "population_inside_hazard_zone": 8140,
        "estimated_exposed_population": 8140,
        "population_requiring_relocation": 3400,
        "relocation_required_rationale": "High-stage riverine flooding along NH-37 corridor requiring relocation of 3,400 floodplain residents.",
        "food_meals_available": 5800,
        "water_litres_available": 6000,
        "medical_staff_available": 24,
        "medical_staff_required": 30,
        "emergency_vehicles_available": 14,
        "emergency_vehicles_required": 20,
        "accessibility_difficulty_pct": 75.0,
        "road_network_status": "Waterlogging 0.4m on NH-37 Floodplain Corridor",
        "data_source": "District_FloodedArea Dataset & Assam State Disaster Management Authority",
        "recommendations": [
            "Deploy amphibious evacuation assets along NH-37 corridor.",
            "Replenish Assam Medical College Hospital blood and IV fluid stocks."
        ]
    },
    "uttarakhand": {
        "region_id": "FIRE-UT-00001",
        "place": "Garhwal Division",
        "state": "Uttarakhand",
        "hazard": "Wildfire",
        "district_census_estimate": 330086,  # Uttarkashi District Census 2011
        "district_label": "Uttarkashi/Tehri District ~330,086 (Census 2011 estimate; Ridge sub-basin ~15,000)",
        "total_regional_population": 15000,
        "population_inside_hazard_zone": 1850,
        "estimated_exposed_population": 1850,
        "population_requiring_relocation": 650,  # Downwind pine slope hamlets
        "relocation_required_rationale": "FRP 184 MW thermal wind front advancing downwind; proactive relocation recommended for 650 residents in direct smoke and spark exposure path.",
        "food_meals_available": 3500,
        "water_litres_available": 4500,
        "medical_staff_available": 20,
        "medical_staff_required": 25,
        "emergency_vehicles_available": 9,
        "emergency_vehicles_required": 10,
        "accessibility_difficulty_pct": 48.0,
        "road_network_status": "Open / Clear · Forest Dept Patrol Active on Yamunotri Highway",
        "data_source": "Himalayan Forest Fire Radiometer Dataset & UKFD Ground Operations",
        "recommendations": [
            "Station auxiliary water tankers along Yamunotri Highway (NH-134) fuelbreak line.",
            "Dispatch smoke-inhalation triage kits and N95 masks to Barkot Community Health Centre.",
            "Deploy forest department air and ground watch teams along Purola ridge link road."
        ]
    },
    "deforestation": {
        "region_id": "DEF-DEF_00007",
        "place": "Western Ghats Corridor",
        "state": "Kerala",
        "hazard": "Deforestation",
        "district_census_estimate": 380000,  # Palakkad/Western Ghats ecological buffer
        "district_label": "Palakkad / Western Ghats Range ~380,000 (Census 2011 estimate; Reserve perimeter ~22,000)",
        "total_regional_population": 22000,
        "population_inside_hazard_zone": 520,  # Buffer zone hamlets
        "estimated_exposed_population": 0,  # Ecological disturbance - no civilian hazard exposure
        "population_requiring_relocation": 0,  # No civilian evacuation needed
        "relocation_required_rationale": "Ecological canopy disturbance detected. Civil evacuation is NOT warranted for environmental deforestation observation.",
        "food_meals_available": 1500,
        "water_litres_available": 2000,
        "medical_staff_available": 12,
        "medical_staff_required": 15,
        "emergency_vehicles_available": 4,
        "emergency_vehicles_required": 6,
        "accessibility_difficulty_pct": 35.0,
        "road_network_status": "Open / Unrestricted · Forestry Patrol Track Clear",
        "data_source": "Sentinel-2 MSI Bi-temporal NDVI Delta & State Forest Department",
        "recommendations": [
            "Maintain ecological monitoring protocol: civilian evacuation is NOT triggered for canopy loss.",
            "Dispatch State Forest Department patrol crew to sample coordinates for boundary ground-truthing.",
            "Cross-reference satellite deforestation polygon with cadastral reserve boundary."
        ]
    }
}

def resolve_region_key(scenario_id: Optional[str], region: Optional[str]) -> str:
    s_str = scenario_id if isinstance(scenario_id, str) else ""
    r_str = region if isinstance(region, str) else ""
    combined = f"{s_str} {r_str}".lower()
    if "tinsukia" in combined or "fld" in combined:
        return "tinsukia"
    elif "assam" in combined or "dibrugarh" in combined:
        return "assam-flood"
    elif "fire" in combined or "wildfire" in combined or "uttarakhand" in combined or "garhwal" in combined:
        return "uttarakhand"
    elif "deforest" in combined or "def_" in combined or "western ghats" in combined:
        return "deforestation"
    elif "wayanad" in combined or "landslide" in combined or "kerala" in combined:
        return "wayanad"
    return "wayanad"

@router.get("")
def get_resource_inventory(scenario_id: Optional[str] = Query(None), region: Optional[str] = Query(None)):
    key = resolve_region_key(scenario_id, region)
    meta = REGION_POPULATION_METADATA.get(key, REGION_POPULATION_METADATA["wayanad"])
    gis = get_gis_layers(meta["region_id"])

    shelters: List[Dict[str, Any]] = gis.get("shelters", [])
    hospitals: List[Dict[str, Any]] = gis.get("hospitals", [])
    roads: List[Dict[str, Any]] = gis.get("roads", [])

    # Calculate Shelters from actual records
    total_shelter_cap = sum(s.get("capacity", 0) for s in shelters)
    occupied_shelter_cap = sum(s.get("occupancy", 0) for s in shelters)
    available_shelter_cap = max(0, total_shelter_cap - occupied_shelter_cap)

    # Calculate Healthcare from actual records
    total_beds = sum(h.get("beds_total", 0) for h in hospitals)
    available_beds = sum(h.get("beds_available", 0) for h in hospitals)
    total_ambulances = sum(h.get("ambulances", 0) for h in hospitals)

    # Population & Demand Calculation
    pop_exposed = meta["estimated_exposed_population"]
    water_req = max(500, int(pop_exposed * 3.0)) if pop_exposed > 0 else 1000
    food_req = max(500, int(pop_exposed * 2.0)) if pop_exposed > 0 else 1000
    water_avail = meta["water_litres_available"]
    food_avail = meta["food_meals_available"]

    # Shortage Calculation
    shortage_watch = []
    if food_avail < food_req * 0.8:
        shortage_watch.append({
            "resource": "Food meals",
            "shortfall": food_req - food_avail,
            "message": f"Food meals inventory ({food_avail:,}) below estimated required demand ({food_req:,} meals/day)."
        })
    if water_avail < water_req * 0.8:
        shortage_watch.append({
            "resource": "Water litres",
            "shortfall": water_req - water_avail,
            "message": f"Potable water supply ({water_avail:,} L) critically below WHO emergency buffer ({water_req:,} L/day)."
        })
    if available_shelter_cap < meta["population_requiring_relocation"]:
        diff = meta["population_requiring_relocation"] - available_shelter_cap
        shortage_watch.append({
            "resource": "Shelter capacity",
            "shortfall": diff,
            "message": f"Shelter capacity deficit: {available_shelter_cap:,} available vs {meta['population_requiring_relocation']:,} evacuees ({diff:,} bed shortfall)."
        })
    if meta["medical_staff_available"] < meta["medical_staff_required"]:
        shortage_watch.append({
            "resource": "Medical staff",
            "shortfall": meta["medical_staff_required"] - meta["medical_staff_available"],
            "message": f"Emergency medical staff ({meta['medical_staff_available']}) below planning quota ({meta['medical_staff_required']})."
        })

    # Carrying Capacity Score Calculation
    shelter_cov = min(1.0, available_shelter_cap / max(1, meta["population_requiring_relocation"])) if meta["population_requiring_relocation"] > 0 else 1.0
    water_cov = min(1.0, water_avail / max(1, water_req))
    food_cov = min(1.0, food_avail / max(1, food_req))
    med_cov = min(1.0, meta["medical_staff_available"] / max(1, meta["medical_staff_required"]))
    trans_cov = min(1.0, meta["emergency_vehicles_available"] / max(1, meta["emergency_vehicles_required"]))

    ccpa_score = round((0.35 * shelter_cov + 0.20 * water_cov + 0.15 * food_cov + 0.15 * med_cov + 0.15 * trans_cov) * 100, 1)
    status_pct = round((available_shelter_cap / max(1, total_shelter_cap)) * 100) if total_shelter_cap > 0 else 100

    return {
        "scenario_id": meta["region_id"],
        "region_name": meta["state"],
        "place_name": meta["place"],
        "hazard": meta["hazard"],
        "population_at_risk": meta["population_inside_hazard_zone"],
        "population_metrics": {
            "district_census_estimate": meta["district_census_estimate"],
            "district_label": meta["district_label"],
            "total_regional_population": meta["total_regional_population"],
            "population_inside_hazard_zone": meta["population_inside_hazard_zone"],
            "estimated_exposed_population": meta["estimated_exposed_population"],
            "population_requiring_relocation": meta["population_requiring_relocation"],
            "relocation_required_rationale": meta["relocation_required_rationale"],
            "data_source": meta["data_source"]
        },
        "shelter_metrics": {
            "total_capacity": total_shelter_cap,
            "total_occupied": occupied_shelter_cap,
            "total_available": available_shelter_cap,
            "shelter_count": len(shelters),
            "shelters": shelters
        },
        "healthcare_metrics": {
            "total_beds": total_beds,
            "available_beds": available_beds,
            "total_ambulances": total_ambulances,
            "hospital_count": len(hospitals),
            "hospitals": hospitals
        },
        "road_metrics": {
            "road_network_status": meta["road_network_status"],
            "accessibility_difficulty_pct": meta["accessibility_difficulty_pct"],
            "roads": roads
        },
        "resources": {
            "Shelter capacity": {
                "available": available_shelter_cap,
                "total": total_shelter_cap,
                "unit": "persons",
                "type": "Verified Facility Infrastructure",
                "status": "SHORTAGE" if available_shelter_cap < meta["population_requiring_relocation"] else "AVAILABLE"
            },
            "Beds": {
                "available": available_beds,
                "total": total_beds,
                "unit": "beds",
                "type": "Verified Healthcare Capacity",
                "status": "AVAILABLE" if available_beds >= 30 else "SHORTAGE"
            },
            "Medical staff": {
                "available": meta["medical_staff_available"],
                "total": meta["medical_staff_required"],
                "unit": "personnel",
                "type": "Verified Healthcare Capacity",
                "status": "AVAILABLE" if meta["medical_staff_available"] >= meta["medical_staff_required"] else "SHORTAGE"
            },
            "Ambulances": {
                "available": total_ambulances,
                "total": total_ambulances,
                "unit": "vehicles",
                "type": "Verified Healthcare Capacity",
                "status": "AVAILABLE"
            },
            "Emergency vehicles": {
                "available": meta["emergency_vehicles_available"],
                "total": meta["emergency_vehicles_required"],
                "unit": "vehicles",
                "type": "Verified Logistics Capacity",
                "status": "AVAILABLE" if meta["emergency_vehicles_available"] >= meta["emergency_vehicles_required"] * 0.8 else "SHORTAGE"
            },
            "Food meals": {
                "available": food_avail,
                "total": max(food_avail, food_req),
                "unit": "meals",
                "type": "Estimated Emergency Consumable",
                "status": "AVAILABLE" if food_avail >= food_req * 0.8 else "SHORTAGE"
            },
            "Water litres": {
                "available": water_avail,
                "total": max(water_avail, water_req),
                "unit": "litres",
                "type": "Estimated Emergency Consumable",
                "status": "AVAILABLE" if water_avail >= water_req * 0.8 else "SHORTAGE"
            }
        },
        "carrying_capacity": {
            "ccpa_score": ccpa_score,
            "status_percentage": status_pct,
            "deficit_percentage": round(100.0 - ccpa_score, 1),
            "classification": "CRITICAL_DEFICIT" if ccpa_score < 50 else "DEFICIT" if ccpa_score < 80 else "ADEQUATE"
        },
        "shortage_watch": shortage_watch,
        "recommendations": meta["recommendations"]
    }
