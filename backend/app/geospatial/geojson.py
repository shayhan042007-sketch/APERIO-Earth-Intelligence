import json
from typing import Dict, Any, List

def create_feature(geometry_type: str, coordinates: Any, properties: Dict[str, Any]) -> Dict[str, Any]:
    """Generates standard RFC 7946 GeoJSON Feature"""
    return {
        "type": "Feature",
        "geometry": {
            "type": geometry_type,
            "coordinates": coordinates
        },
        "properties": properties
    }

def create_feature_collection(features: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generates standard RFC 7946 GeoJSON FeatureCollection"""
    return {
        "type": "FeatureCollection",
        "features": features
    }

def create_polygon_feature(coords: List[List[float]], properties: Dict[str, Any]) -> Dict[str, Any]:
    # Ensure [lon, lat] for standard GeoJSON
    pts = [[p[1], p[0]] if abs(p[0]) <= 90 and abs(p[1]) <= 180 and p[0] != p[1] else p for p in coords]
    if pts[0] != pts[-1]:
        pts.append(pts[0])
    return create_feature("Polygon", [pts], properties)
