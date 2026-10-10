from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, List, Optional
from backend.app.schemas.pydantic_schemas import (
    RiskPredictRequest, RiskPredictResponse,
    RiskSimulationRequest, RiskSimulationResponse,
    BayesianUpdateRequest, BayesianUpdateResponse,
    IndexCalculationRequest
)
from backend.app.ml.xgboost_model import xgboost_risk_model
from backend.app.ml.bayesian_update import bayesian_updater
from backend.app.ml.risk_indices import (
    AperioIndicesCalculator, HRIInputs, PRIInputs, CCPAInputs,
    get_scenario_indices, SCENARIO_INDICES_REGISTRY
)

router = APIRouter(prefix="/risk", tags=["Risk Assessment"])



@router.post("/predict", response_model=RiskPredictResponse)
def predict_risk(req: RiskPredictRequest):
    features = {
        "slope": req.slope,
        "elevation": req.elevation,
        "rainfall_24h": req.rainfall_24h,
        "rainfall_72h": req.rainfall_72h,
        "rainfall_7d": req.rainfall_7d,
        "soil_saturation": 0.94 if req.rainfall_72h > 300 else 0.45,
        "vv": req.vv,
        "vh": req.vh,
        "sar_change": req.sar_change,
        "ndvi": req.ndvi,
        "ndvi_change": req.ndvi_change,
        "change_percentage": req.change_percentage,
        "segmented_area": req.segmented_area,
        "aspect": req.aspect,
        "curvature": req.curvature
    }
    prediction = xgboost_risk_model.predict(features)
    return RiskPredictResponse(
        risk_probability=prediction["risk_probability"],
        severity=prediction["severity"],
        confidence=prediction["confidence"],
        feature_importance=prediction["feature_importance"],
        calibrated_probability=prediction["calibrated_probability"],
        calibration_method="platt_scaling",
        model_name="XGBoost-DisasterRisk-v2",
        source_status="MODEL_OUTPUT"
    )

@router.post("/update", response_model=BayesianUpdateResponse)
def update_bayesian_risk(req: BayesianUpdateRequest):
    update_res = bayesian_updater.update_risk(
        prior=req.prior,
        evidence_name=req.evidence,
        custom_lr=req.likelihood_ratio,
        evidence_strength=req.evidence_strength or 0.85
    )
    return BayesianUpdateResponse(
        prior=update_res["prior"],
        evidence=update_res["evidence"],
        posterior=update_res["posterior"],
        likelihood_ratio=update_res["likelihood_ratio"],
        timestamp=update_res["timestamp"],
        evidence_history=update_res["evidence_history"],
        calibration_applied=True,
        uncertainty_bounds=update_res["uncertainty_bounds"]
    )

@router.get("/history")
def get_risk_history():
    return {
        "history": bayesian_updater.get_history(),
        "total_updates": len(bayesian_updater.get_history())
    }

@router.post("/simulate", response_model=RiskSimulationResponse)
def simulate_risk(req: RiskSimulationRequest):
    # Execute actual XGBoost prediction for simulated scenario parameters
    features = {
        "rainfall_24h": req.rainfall,
        "rainfall_72h": req.rainfall * 2.8,
        "rainfall_7d": req.rainfall * 4.2,
        "slope": req.slope,
        "soil_saturation": req.saturation / 100.0,
        "ndvi_change": - (req.vegetation / 100.0),
        "sar_change": (req.change / 20.0),
        "change_percentage": req.change,
        "elevation": 1240.0,
        "vv": -12.4,
        "vh": -18.6
    }
    pred = xgboost_risk_model.predict(features)
    simulated_pct = round(pred["risk_probability"] * 100.0)

    # Base scenario score comparison
    base_score = 91 if "wayanad" in str(req.scenario_id).lower() else 78

    return RiskSimulationResponse(
        scenario_score=base_score,
        simulated_score=simulated_pct,
        severity=pred["severity"],
        confidence=pred["confidence"],
        factors={
            "rainfall_weight": 0.35,
            "slope_weight": 0.28,
            "soil_saturation_weight": 0.18,
            "sar_change_weight": 0.19
        },
        mode="MODEL_PREDICTION"
    )

@router.get("/indices")
def get_scenario_risk_indices(scenario_id: str = Query("wayanad-landslide")):
    """
    Get deterministic APERIO Risk Indices: HRI, PRI, CCPA, and Priority Score.
    Returns both raw component values and calculated final indices.
    """
    return get_scenario_indices(scenario_id)

@router.post("/indices/calculate")
def calculate_custom_risk_indices(req: IndexCalculationRequest):
    """
    Calculate custom deterministic APERIO Risk Indices with parameter overrides.
    """
    scenario_id = req.scenario_id or "wayanad-landslide"
    reg = SCENARIO_INDICES_REGISTRY.get(scenario_id, SCENARIO_INDICES_REGISTRY["wayanad-landslide"])

    # Merge HRI
    h_data = dict(reg["hri_inputs"])
    if req.hazard_probability is not None: h_data["hazard_probability"] = req.hazard_probability
    if req.rainfall_score is not None: h_data["rainfall_score"] = req.rainfall_score
    if req.terrain_instability is not None: h_data["terrain_instability"] = req.terrain_instability
    if req.satellite_change is not None: h_data["satellite_change"] = req.satellite_change
    if req.recent_change is not None: h_data["recent_change"] = req.recent_change

    # Merge PRI
    p_data = dict(reg["pri_inputs"])
    if req.population_inside_hazard_zone is not None: p_data["population_inside_hazard_zone"] = req.population_inside_hazard_zone
    if req.total_regional_population is not None: p_data["total_regional_population"] = req.total_regional_population
    if req.vulnerable_population is not None: p_data["vulnerable_population"] = req.vulnerable_population
    if req.infrastructure_exposure is not None: p_data["infrastructure_exposure"] = req.infrastructure_exposure
    if req.accessibility_difficulty is not None: p_data["accessibility_difficulty"] = req.accessibility_difficulty
    if req.time_sensitivity is not None: p_data["time_sensitivity"] = req.time_sensitivity

    # Merge CCPA
    c_data = dict(reg["ccpa_inputs"])
    if req.available_shelter_capacity is not None: c_data["available_shelter_capacity"] = req.available_shelter_capacity
    if req.population_requiring_shelter is not None: c_data["population_requiring_shelter"] = req.population_requiring_shelter
    if req.available_water is not None: c_data["available_water"] = req.available_water
    if req.required_water is not None: c_data["required_water"] = req.required_water
    if req.available_food is not None: c_data["available_food"] = req.available_food
    if req.required_food is not None: c_data["required_food"] = req.required_food
    if req.available_medical_capacity is not None: c_data["available_medical_capacity"] = req.available_medical_capacity
    if req.required_medical_capacity is not None: c_data["required_medical_capacity"] = req.required_medical_capacity
    if req.available_transport is not None: c_data["available_transport"] = req.available_transport
    if req.required_transport is not None: c_data["required_transport"] = req.required_transport

    hri_in = HRIInputs(**h_data)
    pri_in = PRIInputs(**p_data)
    ccpa_in = CCPAInputs(**c_data)

    return AperioIndicesCalculator.calculate_priority_score(hri_in, pri_in, ccpa_in)

