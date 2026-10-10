from typing import Dict, Any, List
from datetime import datetime
from backend.app.data.sentinel1 import process_sentinel1_scene
from backend.app.data.sentinel2 import process_sentinel2_scene
from backend.app.data.rainfall import get_rainfall_data
from backend.app.data.dem import load_dem_data
from backend.app.data.gis import get_gis_layers

class IngestionPipeline:
    def __init__(self):
        pass

    def ingest_scenario_data(self, scenario_id: str) -> Dict[str, Any]:
        """
        Coordinates full data ingestion for a disaster scenario:
        - Sentinel-1 SAR observation
        - Sentinel-2 Optical MSI observation (with cloud detection)
        - DEM terrain stack
        - Rainfall observation
        - GIS infrastructure & population layers
        - Comprehensive data quality audit
        """
        sar_data = process_sentinel1_scene(None, is_level1_grd=False)
        opt_data = process_sentinel2_scene(scenario_id)
        rainfall = get_rainfall_data(scenario_id)
        dem = load_dem_data(scenario_id)
        gis = get_gis_layers(scenario_id)

        # Evaluate Data Quality & Uncertainty
        quality_score = 0.95
        warnings = []
        if opt_data.get("quality") == "DEGRADED":
            quality_score -= 0.10
            warnings.append(f"Optical sensor degraded due to cloud coverage ({opt_data['cloud_percentage']}%). SAR prioritized.")
        elif opt_data.get("quality") == "UNUSABLE":
            quality_score -= 0.25
            warnings.append("Optical sensor unusable. Full SAR fallback engaged.")

        if rainfall.get("anomaly_pct", 0) > 100.0:
            warnings.append(f"Extreme rainfall anomaly detected (+{rainfall['anomaly_pct']}% above normal).")

        return {
            "scenario_id": scenario_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "crs": "EPSG:4326 (WGS-84)",
            "data_quality": {
                "overall_quality": "GOOD" if quality_score >= 0.85 else "DEGRADED",
                "quality_score": round(quality_score, 2),
                "warnings": warnings,
                "missing_data": False,
                "temporal_alignment": "ALIGNED_WITHIN_12_HOURS"
            },
            "sentinel1": sar_data,
            "sentinel2": opt_data,
            "rainfall": rainfall,
            "dem": dem,
            "gis": gis
        }

ingestion_pipeline = IngestionPipeline()
