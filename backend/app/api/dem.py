from fastapi import APIRouter, Query
from typing import Dict, Any
from backend.app.data.dem import load_dem_data

router = APIRouter(prefix="/dem", tags=["DEM Terrain"])

@router.get("")
def get_dem_terrain(scenario_id: str = Query("wayanad-landslide")):
    dem_info = load_dem_data(scenario_id)
    return {
        "scenario_id": scenario_id,
        "source": dem_info["source"],
        "resolution_m": dem_info["resolution_m"],
        "elevation_mean": dem_info["elevation_mean"],
        "elevation_min": dem_info["elevation_min"],
        "elevation_max": dem_info["elevation_max"],
        "slope_mean_deg": dem_info["slope_mean_deg"],
        "slope_max_deg": dem_info["slope_max_deg"],
        "aspect_dominant_deg": dem_info["aspect_dominant_deg"],
        "curvature_mean": dem_info["curvature_mean"],
        "high_slope_risk_area_pct": dem_info["high_slope_risk_area_pct"],
        "grid_dimensions": dem_info["grid_dimensions"],
        "elevation_delta": round(dem_info["elevation_max"] - dem_info["elevation_min"], 1),
        "elevation_grid": dem_info["elevation_grid"],
        "elevation_sample": dem_info["elevation_grid"][:10],
        "status": "VALIDATED_COPERNICUS_DEM",
        "dynamic_note": "Base terrain remains static DEM; hazard overlays and risk rasters update dynamically."
    }
