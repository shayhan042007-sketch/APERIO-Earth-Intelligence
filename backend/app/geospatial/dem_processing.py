import numpy as np
from typing import Dict, Any, Tuple
from backend.app.geospatial.slope import compute_slope
from backend.app.geospatial.aspect import compute_aspect
from backend.app.geospatial.curvature import compute_curvature

def generate_terrain_stack(dem_array: np.ndarray, cell_size_m: float = 30.0) -> Dict[str, Any]:
    """Generates a complete terrain feature stack from DEM: elevation, slope, aspect, curvature"""
    slope = compute_slope(dem_array, cell_size_m)
    aspect = compute_aspect(dem_array, cell_size_m)
    total_curv, profile_curv, planform_curv = compute_curvature(dem_array, cell_size_m)

    stats = {
        "elevation_min": float(np.min(dem_array)),
        "elevation_max": float(np.max(dem_array)),
        "elevation_mean": float(np.mean(dem_array)),
        "slope_mean": float(np.mean(slope)),
        "slope_max": float(np.max(slope)),
        "aspect_dominant": float(np.median(aspect[aspect >= 0])) if np.any(aspect >= 0) else 0.0,
        "curvature_mean": float(np.mean(total_curv)),
        "high_slope_area_pct": float(100.0 * np.mean(slope > 30.0))
    }

    return {
        "elevation": dem_array,
        "slope": slope,
        "aspect": aspect,
        "curvature": total_curv,
        "profile_curvature": profile_curv,
        "planform_curvature": planform_curv,
        "stats": stats
    }

def get_region_dem(scenario_id: str, grid_size: int = 64) -> np.ndarray:
    """
    Returns elevation matrix for the region.
    Calibrated with real geographic elevation ranges:
    - Wayanad (Western Ghats): 750m - 1800m, steep escarpments
    - Assam (Brahmaputra Valley): 90m - 180m, low slope floodplain
    - Maharashtra (Sahyadri/Deccan): 400m - 950m
    """
    x = np.linspace(-3, 3, grid_size)
    y = np.linspace(-3, 3, grid_size)
    xx, yy = np.meshgrid(x, y)

    sid = scenario_id.lower()
    if "wayanad" in sid or "landslide" in sid:
        # Rugged Western Ghats mountainous terrain with Meppadi valley and Vellarimala peak (750m - 1800m)
        base_elev = 850.0
        elev = (
            base_elev
            + 480.0 * np.exp(-((xx - 0.5)**2 + (yy + 0.2)**2) / 2.5)
            + 280.0 * np.sin(xx * 1.4) * np.cos(yy * 1.2)
            + 160.0 * np.cos(xx * 2.2 + yy * 0.8)
            + 90.0 * np.sin((xx + yy) * 1.8)
        )
    elif "tinsukia" in sid or "assam" in sid or "flood" in sid or "fld" in sid:
        # Upper Brahmaputra low relief floodplain with river channels (90m - 140m)
        base_elev = 110.0
        elev = (
            base_elev
            + 14.0 * np.sin(xx * 0.8)
            + 7.0 * np.cos(yy * 0.9)
            - 11.0 * np.exp(-(xx**2) / 0.8)
            + 5.0 * np.sin((xx + yy) * 1.2)
        )
    elif "fire" in sid or "garhwal" in sid or "uttarakhand" in sid or "ut-" in sid:
        # High-altitude Garhwal Himalayas steep ridges, deep gorges, and fire hazard slopes (1500m - 2900m)
        base_elev = 1600.0
        elev = (
            base_elev
            + 750.0 * np.exp(-((xx + 0.3)**2 + (yy - 0.4)**2) / 3.0)
            + 420.0 * np.sin(xx * 1.6) * np.cos(yy * 1.5)
            + 210.0 * np.cos(xx * 2.6 - yy * 1.1)
            + 120.0 * np.sin((xx * 0.8 + yy * 2.1))
        )
    elif "def" in sid or "deforest" in sid or "ghats" in sid:
        # Western Ghats tropical forest reserve ridge and buffer valley (650m - 1300m)
        base_elev = 720.0
        elev = (
            base_elev
            + 310.0 * np.exp(-((xx - 0.2)**2 + (yy + 0.5)**2) / 2.8)
            + 180.0 * np.sin(xx * 1.2) * np.cos(yy * 1.0)
            + 95.0 * np.cos(xx * 2.0 + yy * 1.4)
        )
    else:
        # Regional plateau baseline
        base_elev = 450.0
        elev = base_elev + 110.0 * np.sin(xx * 1.1) + 85.0 * np.cos(yy * 1.3)

    return elev.astype(np.float32)
