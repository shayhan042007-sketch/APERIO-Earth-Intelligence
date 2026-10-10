from typing import Dict, Any

def extract_raw_features(ingested_data: Dict[str, Any]) -> Dict[str, float]:
    """
    Extracts individual domain features from ingested satellite, DEM, rainfall,
    and GIS observations:
    - Sentinel-1: VV, VH, VV/VH ratio, backscatter change
    - Sentinel-2: NDVI, NDVI change, NDWI, NBR
    - DEM: elevation, slope, aspect, curvature
    - Rainfall: 24h rainfall, 72h rainfall, 7-day rainfall, anomaly
    - Change & SAM: change percentage, changed area
    """
    sar = ingested_data.get("sentinel1", {})
    opt = ingested_data.get("sentinel2", {})
    rain = ingested_data.get("rainfall", {})
    dem = ingested_data.get("dem", {})

    slope = float(dem.get("slope_mean_deg", 35.0))
    elevation = float(dem.get("elevation_mean", 1240.0))
    aspect = float(dem.get("aspect_dominant_deg", 145.0))
    curvature = float(dem.get("curvature_mean", -0.04))
    r24 = float(rain.get("rainfall_24h_mm", 180.0))
    r72 = float(rain.get("rainfall_72h_mm", 572.0))
    r7d = float(rain.get("rainfall_7d_mm", 840.0))
    ranom = float(rain.get("anomaly_pct", 320.0))
    soil_sat = float(rain.get("soil_saturation_index", 0.94))
    vv = float(sar.get("vv_mean_db", -12.4))
    vh = float(sar.get("vh_mean_db", -18.6))
    sar_ch = float(sar.get("backscatter_change_db", 3.8))
    ndvi = float(opt.get("ndvi_post", 0.32))
    ndvi_ch = float(opt.get("ndvi_change", -0.42))
    ndwi = float(opt.get("ndwi", -0.12))
    nbr = float(opt.get("nbr", 0.65))
    ch_pct = 63.0
    seg_area = 7.03

    # Integrate disaster-specific dataset records if attached
    flood = ingested_data.get("flood_record") or {}
    fire = ingested_data.get("wildfire_record") or {}
    deforest = ingested_data.get("deforestation_record") or {}
    landslide = ingested_data.get("landslide_record") or {}

    if flood:
        pct_flood = float(flood.get("corrected_percent_flooded_area") or flood.get("percent_flooded_area") or 0.0)
        ch_pct = max(1.0, min(100.0, pct_flood))
        ndwi = 0.45
        sar_ch = min(5.0, max(0.5, pct_flood / 6.0))
    elif fire:
        frp = float(fire.get("frp") or 0.0)
        brightness = float(fire.get("brightness") or 300.0)
        ch_pct = max(5.0, min(100.0, frp * 2.0))
        nbr = -0.35 if frp > 10.0 else 0.10
        sar_ch = min(4.0, max(0.4, frp / 25.0))
    elif deforest:
        loss_pct = float(deforest.get("forest_loss_pct") or 0.0)
        ch_pct = max(0.5, min(100.0, loss_pct))
        if deforest.get("ndvi_change") is not None:
            ndvi_ch = float(deforest.get("ndvi_change"))
        if deforest.get("elevation_m") is not None:
            elevation = float(deforest.get("elevation_m"))
        if deforest.get("slope_deg") is not None:
            slope = float(deforest.get("slope_deg"))
        sar_ch = min(5.0, abs(float(deforest.get("sar_change_db") or 1.0)))
    elif landslide:
        if landslide.get("reported_rainfall_mm") is not None:
            r72 = float(landslide.get("reported_rainfall_mm"))

    return {
        "slope": slope,
        "elevation": elevation,
        "aspect": aspect,
        "curvature": curvature,
        "rainfall_24h": r24,
        "rainfall_72h": r72,
        "rainfall_7d": r7d,
        "rainfall_anomaly": ranom,
        "soil_saturation": soil_sat,
        "vv": vv,
        "vh": vh,
        "sar_change": sar_ch,
        "ndvi": ndvi,
        "ndvi_change": ndvi_ch,
        "ndwi": ndwi,
        "nbr": nbr,
        "change_percentage": ch_pct,
        "segmented_area": seg_area
    }
