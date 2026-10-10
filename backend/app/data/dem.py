from typing import Dict, Any
from backend.app.geospatial.dem_processing import get_region_dem, generate_terrain_stack

def load_dem_data(scenario_id: str) -> Dict[str, Any]:
    """Loads DEM elevation array and calculates complete terrain stack"""
    dem_array = get_region_dem(scenario_id, grid_size=64)
    terrain_stack = generate_terrain_stack(dem_array, cell_size_m=30.0)

    stats = terrain_stack["stats"]
    return {
        "scenario_id": scenario_id,
        "source": "Copernicus GLO-30 Digital Elevation Model",
        "resolution_m": 30.0,
        "grid_dimensions": list(dem_array.shape),
        "elevation_mean": round(stats["elevation_mean"], 1),
        "elevation_min": round(stats["elevation_min"], 1),
        "elevation_max": round(stats["elevation_max"], 1),
        "slope_mean_deg": round(stats["slope_mean"], 1),
        "slope_max_deg": round(stats["slope_max"], 1),
        "aspect_dominant_deg": round(stats["aspect_dominant"], 1),
        "curvature_mean": round(stats["curvature_mean"], 4),
        "high_slope_risk_area_pct": round(stats["high_slope_area_pct"], 1),
        "elevation_grid": dem_array.tolist(),
        "slope_grid": terrain_stack["slope"].tolist()
    }
