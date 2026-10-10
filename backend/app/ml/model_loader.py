from typing import Dict, Any
from backend.app.ml.xgboost_model import xgboost_risk_model

def get_model_status() -> Dict[str, Any]:
    return {
        "model_loaded": xgboost_risk_model.is_trained,
        "model_architecture": "XGBoost Gradient Boosted Decision Trees",
        "validation_metrics": xgboost_risk_model.metrics,
        "n_features": len(xgboost_risk_model.feature_names),
        "calibration": "Platt Scaling Logistic Sigmoid"
    }
