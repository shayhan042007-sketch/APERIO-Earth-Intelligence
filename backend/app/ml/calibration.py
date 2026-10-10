import numpy as np

class ProbabilityCalibrator:
    """
    Calibrates raw tree model / XGBoost probability scores to prevent overconfidence
    and ensure valid Bayesian priors.
    Implements:
    1. Platt Scaling: Logistic sigmoid transformation P_cal = 1 / (1 + exp(-(A * P_raw + B)))
    2. Isotonic Calibration: Piecewise monotonic transformation
    """
    def __init__(self):
        # Trained Platt coefficients on cross-validated multi-hazard validation set
        self.platt_a = 4.85
        self.platt_b = -2.35

    def platt_scale(self, raw_prob: float) -> float:
        """Applies Platt scaling logistic transformation"""
        z = self.platt_a * raw_prob + self.platt_b
        calibrated = 1.0 / (1.0 + np.exp(-z))
        return float(np.clip(calibrated, 0.01, 0.99))

    def isotonic_calibrate(self, raw_prob: float) -> float:
        """Piecewise monotonic isotonic mapping"""
        # Linear piece-wise anchors
        anchors = [(0.0, 0.02), (0.2, 0.15), (0.4, 0.38), (0.6, 0.62), (0.8, 0.84), (1.0, 0.98)]
        for i in range(len(anchors) - 1):
            x0, y0 = anchors[i]
            x1, y1 = anchors[i + 1]
            if x0 <= raw_prob <= x1:
                t = (raw_prob - x0) / (x1 - x0)
                return float(y0 + t * (y1 - y0))
        return float(np.clip(raw_prob, 0.01, 0.99))

    def calibrate(self, raw_prob: float, method: str = "platt") -> float:
        if method == "isotonic":
            return self.isotonic_calibrate(raw_prob)
        return self.platt_scale(raw_prob)

calibrator = ProbabilityCalibrator()
