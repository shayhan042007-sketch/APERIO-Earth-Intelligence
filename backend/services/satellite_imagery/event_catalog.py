from typing import Dict, Any, Optional, List

EVENT_CATALOG: Dict[str, Dict[str, Any]] = {
    "flood": {
        "event_id": "flood",
        "aliases": ["fld-tinsukia", "flood", "assam-flood", "assam_flood", "tinsukia"],
        "hazard": "flood",
        "name": "Upper Brahmaputra Basin / Tinsukia Flood",
        "region": "Assam, India",
        "latitude": 27.4922,
        "longitude": 95.3468,
        "bbox": [95.28, 27.42, 95.42, 27.56],
        "pre_event_date": "2016-08-12",
        "post_event_date": "2016-08-12",
        "pre_window": ["2016-07-01", "2016-08-12"],
        "post_window": ["2016-08-12", "2016-08-30"],
        "directory": "assam_flood"
    },
    "landslide": {
        "event_id": "landslide",
        "aliases": ["wayanad-landslide", "wayanad_landslide", "landslide", "meppadi", "ls-48"],
        "hazard": "landslide",
        "name": "Wayanad (Meppadi / Chooralmala) Landslide",
        "region": "Kerala, India",
        "latitude": 11.5560,
        "longitude": 76.1350,
        "bbox": [76.08, 11.50, 76.19, 11.61],
        "pre_event_date": "2024-07-23",
        "post_event_date": "2024-08-02",
        "pre_window": ["2024-07-01", "2024-07-28"],
        "post_window": ["2024-07-31", "2024-08-15"],
        "directory": "wayanad_landslide"
    },
    "wildfire": {
        "event_id": "wildfire",
        "aliases": ["fire-ut-00001", "fire_ut_00001", "wildfire", "uttarakhand-fire", "garhwal"],
        "hazard": "wildfire",
        "name": "Garhwal Division Forest Wildfire",
        "region": "Uttarakhand, India",
        "latitude": 30.80037,
        "longitude": 78.00012,
        "bbox": [77.93, 30.73, 78.07, 30.87],
        "pre_event_date": "2024-05-02",
        "post_event_date": "2024-05-18",
        "pre_window": ["2024-04-15", "2024-05-05"],
        "post_window": ["2024-05-10", "2024-05-25"],
        "directory": "uttarakhand_wildfire"
    },
    "deforestation": {
        "event_id": "deforestation",
        "aliases": ["def-def_00007", "def_def_00007", "deforestation", "western-ghats-corridor", "meghalaya-forest"],
        "hazard": "deforestation",
        "name": "Forest Canopy Corridor Disturbance",
        "region": "Kerala & Western Ghats, India",
        "latitude": 10.885441,
        "longitude": 76.520764,
        "bbox": [76.45, 10.82, 76.59, 10.95],
        "pre_event_date": "2021-01-15",
        "post_event_date": "2023-01-20",
        "pre_window": ["2021-01-01", "2021-02-15"],
        "post_window": ["2023-01-01", "2023-02-15"],
        "directory": "deforestation"
    }
}

def resolve_event(event_id: str) -> Optional[Dict[str, Any]]:
    clean = event_id.strip().lower()
    for key, spec in EVENT_CATALOG.items():
        if clean == key or clean in spec["aliases"] or key in clean:
            return spec
    # Partial matching
    if "wayanad" in clean or "landslide" in clean:
        return EVENT_CATALOG["landslide"]
    if "flood" in clean or "tinsukia" in clean or "assam" in clean:
        return EVENT_CATALOG["flood"]
    if "fire" in clean or "wildfire" in clean or "uttarakhand" in clean:
        return EVENT_CATALOG["wildfire"]
    if "deforest" in clean:
        return EVENT_CATALOG["deforestation"]
    return None
