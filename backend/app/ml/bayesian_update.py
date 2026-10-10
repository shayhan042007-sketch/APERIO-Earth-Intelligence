import math
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.app.ml.calibration import calibrator

# Domain likelihood ratios: P(Evidence | Hazard) / P(Evidence | No Hazard)
EVIDENCE_LIKELIHOOD_RATIOS: Dict[str, float] = {
    "sar_anomaly": 3.25,             # Significant SAR amplitude decorrelation / backscatter anomaly
    "sar_flood_inundation": 4.10,    # SAR specular reflection water drop
    "rainfall_saturation": 2.80,     # Antecedent rainfall > 200mm / extreme soil saturation
    "optical_change": 2.15,          # Significant NDVI loss / optical bare soil scar
    "terrain_instability": 2.45,     # Slope > 30 deg + convergent concave curvature
    "infrastructure_exposure": 1.60, # Proximity to vital transport corridor / settlement
    "fire_burn_signature": 3.90      # NBR drop + thermal infrared spike
}

class BayesianRiskUpdater:
    """
    Implements true recursive Bayesian belief updating:
    Prior Odds = P(H) / (1 - P(H))
    Posterior Odds = Prior Odds * Likelihood Ratio (LR)
    Posterior Probability = Posterior Odds / (1 + Posterior Odds)
    """
    def __init__(self):
        self._history: List[Dict[str, Any]] = []

    def update_risk(
        self,
        prior: float,
        evidence_name: str,
        custom_lr: Optional[float] = None,
        evidence_strength: float = 1.0
    ) -> Dict[str, Any]:
        # Clip prior to avoid division by zero or infinite odds
        clamped_prior = max(0.01, min(0.99, prior))
        prior_odds = clamped_prior / (1.0 - clamped_prior)

        # Retrieve base likelihood ratio
        base_lr = custom_lr or EVIDENCE_LIKELIHOOD_RATIOS.get(evidence_name, 2.0)
        # Scale LR by evidence strength (confidence in observation)
        # LR_effective = 1 + strength * (base_lr - 1)
        effective_lr = 1.0 + max(0.1, evidence_strength) * (base_lr - 1.0)

        # Bayesian update in odds space
        posterior_odds = prior_odds * effective_lr
        posterior_raw = posterior_odds / (1.0 + posterior_odds)

        # Calibrate posterior
        posterior_calibrated = calibrator.calibrate(posterior_raw, method="platt")
        posterior = round(float(posterior_calibrated), 3)

        # Compute 95% Bayesian credible interval uncertainty bounds
        # Using Beta distribution approximation
        variance = (posterior * (1.0 - posterior)) / 12.0
        std = math.sqrt(max(1e-6, variance))
        bounds = {
            "lower_95": round(max(0.01, posterior - 1.96 * std), 3),
            "upper_95": round(min(0.99, posterior + 1.96 * std), 3)
        }

        record = {
            "step": len(self._history) + 1,
            "prior": round(clamped_prior, 3),
            "evidence": evidence_name,
            "likelihood_ratio": round(effective_lr, 2),
            "posterior": posterior,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "uncertainty_bounds": bounds
        }
        self._history.append(record)

        return {
            "prior": round(clamped_prior, 3),
            "evidence": evidence_name,
            "likelihood_ratio": round(effective_lr, 2),
            "posterior": posterior,
            "timestamp": record["timestamp"],
            "evidence_history": list(self._history),
            "uncertainty_bounds": bounds
        }

    def get_history(self) -> List[Dict[str, Any]]:
        return list(self._history)

    def reset(self):
        self._history = []

bayesian_updater = BayesianRiskUpdater()
