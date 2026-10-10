from typing import Dict, Any, List
import numpy as np

# Standardized feature vector order for XGBoost input
FEATURE_NAMES: List[str] = [
    "slope",
    "elevation",
    "rainfall_24h",
    "rainfall_72h",
    "rainfall_7d",
    "soil_saturation",
    "vv",
    "vh",
    "sar_change",
    "ndvi",
    "ndvi_change",
    "change_percentage",
    "segmented_area",
    "aspect",
    "curvature"
]

DEFAULT_FEATURE_VALUES: Dict[str, float] = {
    "slope": 15.0,
    "elevation": 500.0,
    "rainfall_24h": 20.0,
    "rainfall_72h": 50.0,
    "rainfall_7d": 100.0,
    "soil_saturation": 0.40,
    "vv": -15.0,
    "vh": -22.0,
    "sar_change": 1.0,
    "ndvi": 0.50,
    "ndvi_change": 0.0,
    "change_percentage": 5.0,
    "segmented_area": 1.0,
    "aspect": 180.0,
    "curvature": 0.0
}

def fuse_features(raw_features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fuses multi-modal observations into a single standardized feature dictionary
    and 1D numpy vector, imputing missing features with robust climatological/terrain medians.
    """
    fused_dict = {}
    fused_vector = []

    for name in FEATURE_NAMES:
        val = raw_features.get(name)
        if val is None or (isinstance(val, (int, float)) and (np.isnan(val) or np.isinf(val))):
            val = DEFAULT_FEATURE_VALUES[name]
        else:
            val = float(val)

        fused_dict[name] = round(val, 4)
        fused_vector.append(val)

    return {
        "features_dict": fused_dict,
        "feature_vector": np.array(fused_vector, dtype=np.float32),
        "feature_names": FEATURE_NAMES,
        "missing_imputed_count": sum(1 for k in FEATURE_NAMES if k not in raw_features)
    }
