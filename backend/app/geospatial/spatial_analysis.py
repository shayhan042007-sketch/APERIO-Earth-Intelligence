from typing import List, Dict, Any, Tuple
from shapely.geometry import Point, Polygon, LineString, shape
from backend.app.geospatial.area_calculation import compute_polygon_area_km2

def evaluate_impact_intersection(
    hazard_polygon_coords: List[List[float]],
    settlements: List[Dict[str, Any]],
    roads: List[Dict[str, Any]],
    hospitals: List[Dict[str, Any]],
    shelters: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Performs spatial intersection between hazard extent polygon and GIS layers
    (population settlements, road segments, hospitals, and shelters).
    """
    if len(hazard_polygon_coords) < 3:
        return {
            "affected_area_km2": 0.0,
            "population_exposed": 0,
            "buildings_affected": 0,
            "roads_affected_count": 0,
            "roads_affected_km": 0.0,
            "hospitals_at_risk": [],
            "shelters_at_risk": [],
            "safe_shelters": shelters
        }

    # Build Shapely polygon (coords as [lat, lon])
    hazard_poly = Polygon(hazard_polygon_coords)
    area_km2 = compute_polygon_area_km2(hazard_polygon_coords)

    # 1. Population and buildings intersection
    total_pop_exposed = 0
    total_buildings = 0
    for s in settlements:
        pt = Point(s["lat"], s["lon"])
        if hazard_poly.contains(pt) or hazard_poly.distance(pt) < 0.01:
            total_pop_exposed += s.get("population", 0)
            total_buildings += s.get("buildings", int(s.get("population", 0) / 4.2))

    # 2. Roads affected
    affected_roads_count = 0
    affected_roads_km = 0.0
    for r in roads:
        line = LineString(r["coordinates"])
        if hazard_poly.intersects(line):
            affected_roads_count += 1
            affected_roads_km += r.get("length_km", 1.8)

    # 3. Hospitals at risk
    hospitals_at_risk = []
    for h in hospitals:
        pt = Point(h["lat"], h["lon"])
        if hazard_poly.contains(pt) or hazard_poly.distance(pt) < 0.015:
            hospitals_at_risk.append(h["name"])

    # 4. Shelters at risk vs safe
    shelters_at_risk = []
    safe_shelters = []
    for sh in shelters:
        pt = Point(sh["lat"], sh["lon"])
        if hazard_poly.contains(pt) or hazard_poly.distance(pt) < 0.01:
            shelters_at_risk.append(sh)
        else:
            safe_shelters.append(sh)

    return {
        "affected_area_km2": area_km2,
        "population_exposed": max(total_pop_exposed, int(area_km2 * 600)),
        "buildings_affected": max(total_buildings, int(area_km2 * 140)),
        "roads_affected_count": affected_roads_count,
        "roads_affected_km": round(affected_roads_km, 2),
        "hospitals_at_risk": hospitals_at_risk,
        "shelters_at_risk": [s["name"] for s in shelters_at_risk],
        "safe_shelters": safe_shelters
    }
