"""
APERIO Deterministic Risk Indices Calculation Module
===================================================
Implements transparent, deterministic, and explainable risk indices:
1. HRI  - Hazard Risk Index (0-100)
2. PRI  - Population Risk Index (0-100)
3. CCPA - Carrying Capacity & Preparedness Assessment (0-100)
4. APERIO Priority Score (0-100)

All formulas are strictly deterministic, strictly bounded between 0-100,
and return both raw component inputs and final index calculations.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

def clamp(val: float, min_val: float = 0.0, max_val: float = 100.0) -> float:
    return max(min_val, min(max_val, float(val)))

def classify_hri(score: float) -> str:
    s = clamp(score)
    if s <= 20.0:
        return "SAFE"
    elif s <= 40.0:
        return "LOW"
    elif s <= 60.0:
        return "MODERATE"
    elif s <= 80.0:
        return "HIGH"
    else:
        return "CRITICAL"

def classify_ccpa(score: float) -> str:
    s = clamp(score)
    if s >= 80.0:
        return "GOOD"
    elif s >= 60.0:
        return "ADEQUATE"
    elif s >= 40.0:
        return "LIMITED"
    elif s >= 20.0:
        return "CRITICAL"
    else:
        return "SEVERE SHORTAGE"

def classify_priority(score: float) -> str:
    s = clamp(score)
    if s >= 80.0:
        return "CRITICAL"
    elif s >= 60.0:
        return "HIGH"
    elif s >= 40.0:
        return "MODERATE"
    elif s >= 20.0:
        return "LOW"
    else:
        return "SAFE"


class HRIInputs(BaseModel):
    hazard_probability: float = Field(..., ge=0.0, le=100.0, description="Hazard occurrence probability (0-100)")
    rainfall_score: float = Field(..., ge=0.0, le=100.0, description="Normalized antecedent rainfall severity (0-100)")
    terrain_instability: float = Field(..., ge=0.0, le=100.0, description="Slope & terrain curvature instability (0-100)")
    satellite_change: float = Field(..., ge=0.0, le=100.0, description="SAR amplitude/decorrelation change (0-100)")
    recent_change: float = Field(..., ge=0.0, le=100.0, description="Optical NDVI / recent ground disturbance (0-100)")

class PRIInputs(BaseModel):
    population_inside_hazard_zone: float = Field(..., ge=0.0, description="Exposed headcount in direct impact polygon")
    total_regional_population: float = Field(..., gt=0.0, description="Total regional population denominator")
    vulnerable_population: float = Field(..., ge=0.0, le=100.0, description="Elderly/children/medical dependency % (0-100)")
    infrastructure_exposure: float = Field(..., ge=0.0, le=100.0, description="Critical roads, bridges, power in zone (0-100)")
    accessibility_difficulty: float = Field(..., ge=0.0, le=100.0, description="Terrain slope / road blockage index (0-100)")
    time_sensitivity: float = Field(..., ge=0.0, le=100.0, description="Imminence / lead time urgency (0-100)")

class CCPAInputs(BaseModel):
    available_shelter_capacity: float = Field(..., ge=0.0)
    population_requiring_shelter: float = Field(..., gt=0.0)
    available_water: float = Field(..., ge=0.0)
    required_water: float = Field(..., gt=0.0)
    available_food: float = Field(..., ge=0.0)
    required_food: float = Field(..., gt=0.0)
    available_medical_capacity: float = Field(..., ge=0.0)
    required_medical_capacity: float = Field(..., gt=0.0)
    available_transport: float = Field(..., ge=0.0)
    required_transport: float = Field(..., gt=0.0)

class AperioIndicesCalculator:
    """
    Deterministic calculation engine for HRI, PRI, CCPA, and APERIO Priority Score.
    """

    @staticmethod
    def calculate_hri(inputs: HRIInputs) -> Dict[str, Any]:
        """
        HRI = 0.35*hazard_probability
            + 0.20*rainfall_score
            + 0.15*terrain_instability
            + 0.15*satellite_change
            + 0.15*recent_change
        """
        hp = clamp(inputs.hazard_probability)
        rf = clamp(inputs.rainfall_score)
        ti = clamp(inputs.terrain_instability)
        sc = clamp(inputs.satellite_change)
        rc = clamp(inputs.recent_change)

        raw_score = (0.35 * hp) + (0.20 * rf) + (0.15 * ti) + (0.15 * sc) + (0.15 * rc)
        score = round(clamp(raw_score), 2)
        classification = classify_hri(score)

        return {
            "score": score,
            "classification": classification,
            "formula": "HRI = 0.35*hazard_prob + 0.20*rainfall + 0.15*terrain + 0.15*sat_change + 0.15*recent_change",
            "weights": {
                "hazard_probability": 0.35,
                "rainfall_score": 0.20,
                "terrain_instability": 0.15,
                "satellite_change": 0.15,
                "recent_change": 0.15
            },
            "components": {
                "hazard_probability": hp,
                "rainfall_score": rf,
                "terrain_instability": ti,
                "satellite_change": sc,
                "recent_change": rc
            }
        }

    @staticmethod
    def calculate_pri(inputs: PRIInputs) -> Dict[str, Any]:
        """
        population_exposure = (population_inside_hazard_zone / total_regional_population) * 100
        PRI = 0.45*population_exposure
            + 0.20*vulnerable_population
            + 0.15*infrastructure_exposure
            + 0.10*accessibility_difficulty
            + 0.10*time_sensitivity
        """
        exposure_pct = clamp((inputs.population_inside_hazard_zone / inputs.total_regional_population) * 100.0)
        vuln = clamp(inputs.vulnerable_population)
        infra = clamp(inputs.infrastructure_exposure)
        access = clamp(inputs.accessibility_difficulty)
        time_sens = clamp(inputs.time_sensitivity)

        raw_score = (0.45 * exposure_pct) + (0.20 * vuln) + (0.15 * infra) + (0.10 * access) + (0.10 * time_sens)
        score = round(clamp(raw_score), 2)

        return {
            "score": score,
            "formula": "PRI = 0.45*pop_exposure + 0.20*vulnerable + 0.15*infra + 0.10*accessibility + 0.10*time_sensitivity",
            "weights": {
                "population_exposure": 0.45,
                "vulnerable_population": 0.20,
                "infrastructure_exposure": 0.15,
                "accessibility_difficulty": 0.10,
                "time_sensitivity": 0.10
            },
            "components": {
                "population_exposure": round(exposure_pct, 2),
                "population_inside_hazard_zone": inputs.population_inside_hazard_zone,
                "total_regional_population": inputs.total_regional_population,
                "vulnerable_population": vuln,
                "infrastructure_exposure": infra,
                "accessibility_difficulty": access,
                "time_sensitivity": time_sens
            }
        }

    @staticmethod
    def calculate_ccpa(inputs: CCPAInputs) -> Dict[str, Any]:
        """
        shelter_coverage   = min(available_shelter_capacity / population_requiring_shelter, 1) * 100
        water_coverage     = min(available_water / required_water, 1) * 100
        food_coverage      = min(available_food / required_food, 1) * 100
        medical_coverage   = min(available_medical_capacity / required_medical_capacity, 1) * 100
        transport_coverage = min(available_transport / required_transport, 1) * 100

        CCPA = 0.35*shelter_coverage
             + 0.20*water_coverage
             + 0.15*food_coverage
             + 0.15*medical_coverage
             + 0.15*transport_coverage
        """
        shelter_cov = min(inputs.available_shelter_capacity / inputs.population_requiring_shelter, 1.0) * 100.0
        water_cov = min(inputs.available_water / inputs.required_water, 1.0) * 100.0
        food_cov = min(inputs.available_food / inputs.required_food, 1.0) * 100.0
        med_cov = min(inputs.available_medical_capacity / inputs.required_medical_capacity, 1.0) * 100.0
        trans_cov = min(inputs.available_transport / inputs.required_transport, 1.0) * 100.0

        raw_score = (0.35 * shelter_cov) + (0.20 * water_cov) + (0.15 * food_cov) + (0.15 * med_cov) + (0.15 * trans_cov)
        score = round(clamp(raw_score), 2)
        classification = classify_ccpa(score)

        return {
            "score": score,
            "classification": classification,
            "deficit": round(100.0 - score, 2),
            "formula": "CCPA = 0.35*shelter + 0.20*water + 0.15*food + 0.15*medical + 0.15*transport",
            "weights": {
                "shelter_coverage": 0.35,
                "water_coverage": 0.20,
                "food_coverage": 0.15,
                "medical_coverage": 0.15,
                "transport_coverage": 0.15
            },
            "components": {
                "shelter_coverage": round(shelter_cov, 2),
                "water_coverage": round(water_cov, 2),
                "food_coverage": round(food_cov, 2),
                "medical_coverage": round(med_cov, 2),
                "transport_coverage": round(trans_cov, 2)
            },
            "raw_inventories": {
                "shelter": {"available": inputs.available_shelter_capacity, "required": inputs.population_requiring_shelter},
                "water": {"available": inputs.available_water, "required": inputs.required_water},
                "food": {"available": inputs.available_food, "required": inputs.required_food},
                "medical": {"available": inputs.available_medical_capacity, "required": inputs.required_medical_capacity},
                "transport": {"available": inputs.available_transport, "required": inputs.required_transport}
            }
        }

    @classmethod
    def calculate_priority_score(
        cls,
        hri_inputs: HRIInputs,
        pri_inputs: PRIInputs,
        ccpa_inputs: CCPAInputs
    ) -> Dict[str, Any]:
        """
        priority = 0.50*HRI + 0.30*PRI + 0.20*(100 - CCPA)
        """
        hri_res = cls.calculate_hri(hri_inputs)
        pri_res = cls.calculate_pri(pri_inputs)
        ccpa_res = cls.calculate_ccpa(ccpa_inputs)

        hri = hri_res["score"]
        pri = pri_res["score"]
        ccpa = ccpa_res["score"]
        ccpa_deficit = 100.0 - ccpa

        raw_priority = (0.50 * hri) + (0.30 * pri) + (0.20 * ccpa_deficit)
        priority_score = round(clamp(raw_priority), 2)
        classification = classify_priority(priority_score)

        return {
            "priority_score": priority_score,
            "classification": classification,
            "formula": "Priority = 0.50*HRI + 0.30*PRI + 0.20*(100 - CCPA)",
            "weights": {
                "HRI": 0.50,
                "PRI": 0.30,
                "CCPA_deficit": 0.20
            },
            "hri": hri_res,
            "pri": pri_res,
            "ccpa": ccpa_res
        }

# Pre-computed deterministic scenario index sets for known scenarios
SCENARIO_INDICES_REGISTRY: Dict[str, Dict[str, Any]] = {
    "wayanad-landslide": {
        "hri_inputs": {
            "hazard_probability": 94.0,
            "rainfall_score": 96.0,
            "terrain_instability": 88.0,
            "satellite_change": 85.0,
            "recent_change": 78.0
        },
        "pri_inputs": {
            "population_inside_hazard_zone": 4250.0,
            "total_regional_population": 12500.0,
            "vulnerable_population": 34.0,
            "infrastructure_exposure": 82.0,
            "accessibility_difficulty": 88.0,
            "time_sensitivity": 95.0
        },
        "ccpa_inputs": {
            "available_shelter_capacity": 2400.0,
            "population_requiring_shelter": 4250.0,
            "available_water": 3200.0,
            "required_water": 4250.0,
            "available_food": 2800.0,
            "required_food": 4250.0,
            "available_medical_capacity": 65.0,
            "required_medical_capacity": 120.0,
            "available_transport": 14.0,
            "required_transport": 28.0
        }
    },
    "assam-flood": {
        "hri_inputs": {
            "hazard_probability": 82.0,
            "rainfall_score": 88.0,
            "terrain_instability": 25.0,
            "satellite_change": 86.0,
            "recent_change": 70.0
        },
        "pri_inputs": {
            "population_inside_hazard_zone": 8140.0,
            "total_regional_population": 35000.0,
            "vulnerable_population": 28.0,
            "infrastructure_exposure": 74.0,
            "accessibility_difficulty": 72.0,
            "time_sensitivity": 85.0
        },
        "ccpa_inputs": {
            "available_shelter_capacity": 5500.0,
            "population_requiring_shelter": 8140.0,
            "available_water": 6000.0,
            "required_water": 8140.0,
            "available_food": 5800.0,
            "required_food": 8140.0,
            "available_medical_capacity": 85.0,
            "required_medical_capacity": 140.0,
            "available_transport": 22.0,
            "required_transport": 35.0
        }
    },
    "maharashtra-fire": {
        "hri_inputs": {
            "hazard_probability": 68.0,
            "rainfall_score": 14.0,
            "terrain_instability": 52.0,
            "satellite_change": 66.0,
            "recent_change": 72.0
        },
        "pri_inputs": {
            "population_inside_hazard_zone": 1360.0,
            "total_regional_population": 18000.0,
            "vulnerable_population": 19.0,
            "infrastructure_exposure": 45.0,
            "accessibility_difficulty": 48.0,
            "time_sensitivity": 62.0
        },
        "ccpa_inputs": {
            "available_shelter_capacity": 1800.0,
            "population_requiring_shelter": 1360.0,
            "available_water": 2000.0,
            "required_water": 1360.0,
            "available_food": 2000.0,
            "required_food": 1360.0,
            "available_medical_capacity": 45.0,
            "required_medical_capacity": 30.0,
            "available_transport": 12.0,
            "required_transport": 10.0
        }
    },
    "assam-forest": {
        "hri_inputs": {
            "hazard_probability": 45.0,
            "rainfall_score": 38.0,
            "terrain_instability": 30.0,
            "satellite_change": 48.0,
            "recent_change": 52.0
        },
        "pri_inputs": {
            "population_inside_hazard_zone": 420.0,
            "total_regional_population": 22000.0,
            "vulnerable_population": 12.0,
            "infrastructure_exposure": 20.0,
            "accessibility_difficulty": 35.0,
            "time_sensitivity": 30.0
        },
        "ccpa_inputs": {
            "available_shelter_capacity": 1000.0,
            "population_requiring_shelter": 420.0,
            "available_water": 1000.0,
            "required_water": 420.0,
            "available_food": 1000.0,
            "required_food": 420.0,
            "available_medical_capacity": 30.0,
            "required_medical_capacity": 10.0,
            "available_transport": 8.0,
            "required_transport": 4.0
        }
    }
}

def get_scenario_indices(scenario_id: str) -> Dict[str, Any]:
    raw = SCENARIO_INDICES_REGISTRY.get(scenario_id)
    if raw:
        hri_in = HRIInputs(**raw["hri_inputs"])
        pri_in = PRIInputs(**raw["pri_inputs"])
        ccpa_in = CCPAInputs(**raw["ccpa_inputs"])
        return AperioIndicesCalculator.calculate_priority_score(hri_in, pri_in, ccpa_in)

    # Resolve from disaster repository if it is a dataset event
    try:
        from backend.app.data.disaster_repository import disaster_repository
        event = disaster_repository.get_event_by_id(scenario_id)
    except Exception:
        event = None

    if event:
        ev = event.get("evidence", {})
        dtype = event.get("disaster_type", "")
        hazard_prob = float(event.get("risk_score", 50.0))

        if dtype == "FLOOD":
            corr_pct = float(ev.get("corrected_percent_flooded_area", 5.0))
            tot_pct = float(ev.get("percent_flooded_area", 10.0))
            rf = min(100.0, corr_pct * 4.0 + 30.0)
            ti = 18.0  # floodplain
            sc = min(100.0, tot_pct * 3.5)
            rc = 42.0
            exposed_pop = max(500.0, float(tot_pct * 400.0))
            tot_pop = 25000.0
            shelter_cap = 4000.0
        elif dtype == "WILDFIRE":
            frp = float(ev.get("frp", 12.0))
            bright = float(ev.get("brightness", 320.0))
            rf = 12.0  # dry
            ti = 45.0
            sc = min(100.0, max(20.0, frp * 2.2))
            rc = min(100.0, max(30.0, (bright - 300.0) * 1.5))
            exposed_pop = 1200.0
            tot_pop = 15000.0
            shelter_cap = 1500.0
        elif dtype == "DEFORESTATION":
            loss_pct = float(ev.get("forest_loss_pct", 5.0))
            slope_deg = float(ev.get("slope_deg", 12.0))
            rf = min(100.0, max(10.0, float(ev.get("rainfall_mm", 100.0)) / 25.0))
            ti = min(100.0, max(10.0, slope_deg * 2.2))
            sc = min(100.0, max(10.0, abs(float(ev.get("sar_change_db", 0.5))) * 30.0))
            rc = min(100.0, max(10.0, loss_pct * 2.5))
            exposed_pop = 350.0
            tot_pop = 18000.0
            shelter_cap = 800.0
        elif dtype == "LANDSLIDE":
            reported_rain = float(ev.get("reported_rainfall_mm", 220.0))
            rf = min(100.0, max(30.0, reported_rain / 3.0))
            ti = 75.0
            sc = 65.0
            rc = 55.0
            exposed_pop = 2800.0
            tot_pop = 12000.0
            shelter_cap = 2200.0
        else:
            rf, ti, sc, rc = 50.0, 50.0, 50.0, 50.0
            exposed_pop, tot_pop, shelter_cap = 1000.0, 10000.0, 1000.0

        hri_in = HRIInputs(
            hazard_probability=hazard_prob,
            rainfall_score=rf,
            terrain_instability=ti,
            satellite_change=sc,
            recent_change=rc
        )
        pri_in = PRIInputs(
            population_inside_hazard_zone=exposed_pop,
            total_regional_population=tot_pop,
            vulnerable_population=25.0,
            infrastructure_exposure=50.0,
            accessibility_difficulty=ti,
            time_sensitivity=hazard_prob
        )
        ccpa_in = CCPAInputs(
            available_shelter_capacity=shelter_cap,
            population_requiring_shelter=exposed_pop,
            available_water=shelter_cap * 1.2,
            required_water=exposed_pop,
            available_food=shelter_cap * 1.1,
            required_food=exposed_pop,
            available_medical_capacity=60.0,
            required_medical_capacity=80.0,
            available_transport=12.0,
            required_transport=20.0
        )
        return AperioIndicesCalculator.calculate_priority_score(hri_in, pri_in, ccpa_in)

    # Default fallback
    hri_in = HRIInputs(hazard_probability=50, rainfall_score=50, terrain_instability=50, satellite_change=50, recent_change=50)
    pri_in = PRIInputs(population_inside_hazard_zone=1000, total_regional_population=10000, vulnerable_population=20, infrastructure_exposure=30, accessibility_difficulty=40, time_sensitivity=50)
    ccpa_in = CCPAInputs(available_shelter_capacity=1000, population_requiring_shelter=1000, available_water=1000, required_water=1000, available_food=1000, required_food=1000, available_medical_capacity=50, required_medical_capacity=50, available_transport=10, required_transport=10)
    return AperioIndicesCalculator.calculate_priority_score(hri_in, pri_in, ccpa_in)
