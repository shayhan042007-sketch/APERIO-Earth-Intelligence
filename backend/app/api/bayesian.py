from fastapi import APIRouter
from backend.app.schemas.pydantic_schemas import BayesianUpdateRequest, BayesianUpdateResponse
from backend.app.ml.bayesian_update import bayesian_updater

router = APIRouter(prefix="/bayesian", tags=["Bayesian Inference"])

@router.post("/update", response_model=BayesianUpdateResponse)
def bayesian_update(req: BayesianUpdateRequest):
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
def bayesian_history():
    return bayesian_updater.get_history()
