import numpy as np
from typing import Dict, Any, Tuple, Optional

def compute_ndvi(red_band: np.ndarray, nir_band: np.ndarray) -> np.ndarray:
    """Compute Normalized Difference Vegetation Index: (NIR - Red) / (NIR + Red)"""
    denom = nir_band + red_band
    ndvi = np.zeros_like(nir_band, dtype=np.float32)
    valid = denom > 1e-6
    ndvi[valid] = (nir_band[valid] - red_band[valid]) / denom[valid]
    return np.clip(ndvi, -1.0, 1.0)

def compute_ndwi(green_band: np.ndarray, nir_band: np.ndarray) -> np.ndarray:
    """Compute Normalized Difference Water Index: (Green - NIR) / (Green + NIR)"""
    denom = green_band + nir_band
    ndwi = np.zeros_like(green_band, dtype=np.float32)
    valid = denom > 1e-6
    ndwi[valid] = (green_band[valid] - nir_band[valid]) / denom[valid]
    return np.clip(ndwi, -1.0, 1.0)

def compute_nbr(nir_band: np.ndarray, swir_band: np.ndarray) -> np.ndarray:
    """Compute Normalized Burn Ratio: (NIR - SWIR) / (NIR + SWIR)"""
    denom = nir_band + swir_band
    nbr = np.zeros_like(nir_band, dtype=np.float32)
    valid = denom > 1e-6
    nbr[valid] = (nir_band[valid] - swir_band[valid]) / denom[valid]
    return np.clip(nbr, -1.0, 1.0)

def compute_sar_backscatter_ratio(vv_band: np.ndarray, vh_band: np.ndarray) -> np.ndarray:
    """Compute VV / VH polarization ratio and cross-ratio anomaly in dB"""
    # Assuming input is in dB or linear amplitude
    ratio = vv_band - vh_band if np.any(vv_band < 0) else vv_band / (vh_band + 1e-6)
    return ratio

def apply_cloud_mask(optical_array: np.ndarray, cloud_prob: np.ndarray, threshold: float = 0.4) -> Tuple[np.ndarray, np.ndarray, float]:
    """Mask out cloudy pixels from optical multispectral image and return mask + usable pct"""
    cloud_mask = cloud_prob > threshold
    usable_pct = float(100.0 * (1.0 - np.mean(cloud_mask)))
    masked_array = np.where(cloud_mask, np.nan, optical_array)
    return masked_array, cloud_mask, usable_pct
