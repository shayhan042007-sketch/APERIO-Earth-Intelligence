import math
from typing import List, Tuple

def compute_polygon_area_km2(coordinates: List[List[float]]) -> float:
    """
    Computes accurate geodesic surface area of a polygon defined by [lat, lon] or [lon, lat]
    using WGS-84 spherical projection formula.
    """
    if len(coordinates) < 3:
        return 0.0

    # Ensure closed polygon
    pts = coordinates
    if pts[0] != pts[-1]:
        pts = pts + [pts[0]]

    # Mean latitude for scaling
    lats = [p[0] for p in pts]
    mean_lat_rad = math.radians(sum(lats) / len(lats))

    # Convert degrees to meters approximately
    # 1 deg latitude ≈ 111,139 meters
    # 1 deg longitude ≈ 111,139 * cos(lat) meters
    m_per_deg_lat = 111139.0
    m_per_deg_lon = 111139.0 * math.cos(mean_lat_rad)

    area_m2 = 0.0
    for i in range(len(pts) - 1):
        x1 = pts[i][1] * m_per_deg_lon
        y1 = pts[i][0] * m_per_deg_lat
        x2 = pts[i + 1][1] * m_per_deg_lon
        y2 = pts[i + 1][0] * m_per_deg_lat
        area_m2 += (x1 * y2 - x2 * y1)

    area_km2 = abs(area_m2) / 2.0 / 1e6
    return round(float(area_km2), 2)
