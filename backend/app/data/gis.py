from typing import Dict, Any, List

def get_gis_layers(scenario_id: str) -> Dict[str, Any]:
    """Returns GIS infrastructure, settlements, roads, shelters, and medical assets for the scenario"""
    sid = scenario_id.lower()
    
    if "wayanad" in sid or "landslide" in sid:
        center = [11.556, 76.135]
        shelters = [
            {"id": "sh-01", "name": "Government Higher Secondary School Meppadi", "lat": 11.570, "lon": 76.120, "capacity": 650, "occupancy": 380, "road_status": "Open", "hazard_risk": "LOW", "distance_km": 2.4},
            {"id": "sh-02", "name": "Community Relief Hall Chooralmala West", "lat": 11.535, "lon": 76.170, "capacity": 420, "occupancy": 310, "road_status": "Caution (Debris clearing)", "hazard_risk": "MODERATE", "distance_km": 4.1},
            {"id": "sh-03", "name": "Vythiri District Camp North", "lat": 11.590, "lon": 76.080, "capacity": 800, "occupancy": 220, "road_status": "Open", "hazard_risk": "LOW", "distance_km": 6.8}
        ]
        hospitals = [
            {"id": "hp-01", "name": "Meppadi Community Health Center", "lat": 11.548, "lon": 76.105, "beds_total": 45, "beds_available": 12, "ambulances": 3},
            {"id": "hp-02", "name": "Wayanad District General Hospital (Mananthavady)", "lat": 11.600, "lon": 76.190, "beds_total": 250, "beds_available": 68, "ambulances": 9}
        ]
        roads = [
            {"id": "rd-01", "name": "Meppadi-Chooralmala Main Road", "coordinates": [[11.520, 76.110], [11.545, 76.125], [11.556, 76.135], [11.575, 76.150]], "length_km": 6.5, "status": "Bridge Damaged at Vellarmala"},
            {"id": "rd-02", "name": "Kalpetta Bypass Link", "coordinates": [[11.556, 76.135], [11.570, 76.120], [11.600, 76.090]], "length_km": 5.8, "status": "Clear / Operational"}
        ]
        settlements = [
            {"name": "Mundakkai Hamlet", "lat": 11.558, "lon": 76.138, "population": 1850, "buildings": 420},
            {"name": "Chooralmala Town Cluster", "lat": 11.549, "lon": 76.130, "population": 2400, "buildings": 580}
        ]
        hazard_polygon = [
            [center[0] - 0.035, center[1] - 0.047],
            [center[0] - 0.020, center[1] + 0.035],
            [center[0] + 0.024, center[1] + 0.043],
            [center[0] + 0.040, center[1] - 0.010],
            [center[0] + 0.012, center[1] - 0.055]
        ]
        sam_polygon = [
            [center[0] - 0.022, center[1] - 0.012],
            [center[0] - 0.012, center[1] + 0.024],
            [center[0] + 0.019, center[1] + 0.018],
            [center[0] + 0.014, center[1] - 0.024]
        ]
    elif "tinsukia" in sid or "fld-tinsukia" in sid:
        center = [27.4922, 95.3468]
        shelters = [
            {"id": "sh-tin-01", "name": "Tinsukia District Multipurpose Cyclone & Flood Relief Center", "lat": 27.505, "lon": 95.358, "capacity": 1000, "occupancy": 320, "road_status": "Open", "hazard_risk": "LOW", "distance_km": 1.8},
            {"id": "sh-tin-02", "name": "Bordubi Community High School Relief Camp", "lat": 27.478, "lon": 95.330, "capacity": 650, "occupancy": 210, "road_status": "Open", "hazard_risk": "LOW", "distance_km": 2.5},
            {"id": "sh-tin-03", "name": "Doomdooma Elevated Relief Staging Area", "lat": 27.525, "lon": 95.385, "capacity": 800, "occupancy": 150, "road_status": "Open", "hazard_risk": "LOW", "distance_km": 5.4}
        ]
        hospitals = [
            {"id": "hp-tin-01", "name": "Tinsukia Civil Hospital", "lat": 27.498, "lon": 95.352, "beds_total": 200, "beds_available": 54, "ambulances": 8},
            {"id": "hp-tin-02", "name": "Doomdooma FRU Community Hospital", "lat": 27.520, "lon": 95.380, "beds_total": 80, "beds_available": 22, "ambulances": 4}
        ]
        roads = [
            {"id": "rd-tin-01", "name": "NH-37 Tinsukia-Makum Arterial", "coordinates": [[27.480, 95.320], [27.4922, 95.3468], [27.510, 95.375]], "length_km": 8.2, "status": "Clear / Operational"},
            {"id": "rd-tin-02", "name": "Bordubi Embankment Road", "coordinates": [[27.470, 95.335], [27.490, 95.350]], "length_km": 4.1, "status": "Minor surface pooling"}
        ]
        settlements = [
            {"name": "Tinsukia Sub-division Rural Cluster", "lat": 27.4922, "lon": 95.3468, "population": 2450, "buildings": 540}
        ]
        hazard_polygon = [
            [center[0] - 0.040, center[1] - 0.045],
            [center[0] - 0.015, center[1] + 0.050],
            [center[0] + 0.030, center[1] + 0.040],
            [center[0] + 0.020, center[1] - 0.035]
        ]
        sam_polygon = [
            [center[0] - 0.025, center[1] - 0.028],
            [center[0] - 0.008, center[1] + 0.032],
            [center[0] + 0.018, center[1] + 0.020],
            [center[0] + 0.010, center[1] - 0.020]
        ]
    elif "assam" in sid or "flood" in sid:
        center = [27.472, 94.912]
        shelters = [
            {"id": "sh-as-01", "name": "Dibrugarh University Relief Center", "lat": 27.460, "lon": 94.900, "capacity": 1200, "occupancy": 650, "road_status": "Open", "hazard_risk": "LOW", "distance_km": 3.2},
            {"id": "sh-as-02", "name": "Brahmaputra Embankment Camp", "lat": 27.485, "lon": 94.930, "capacity": 600, "occupancy": 480, "road_status": "Caution", "hazard_risk": "HIGH", "distance_km": 2.1}
        ]
        hospitals = [
            {"id": "hp-as-01", "name": "Assam Medical College Hospital", "lat": 27.465, "lon": 94.920, "beds_total": 400, "beds_available": 95, "ambulances": 14}
        ]
        roads = [
            {"id": "rd-as-01", "name": "NH-37 Floodplain Corridor", "coordinates": [[27.450, 94.880], [27.472, 94.912], [27.500, 94.950]], "length_km": 12.0, "status": "Waterlogging 0.4m"}
        ]
        settlements = [
            {"name": "Dibrugarh Riverine Ward", "lat": 27.472, "lon": 94.912, "population": 8140, "buildings": 1950}
        ]
        hazard_polygon = [
            [center[0] - 0.045, center[1] - 0.055],
            [center[0] - 0.010, center[1] + 0.065],
            [center[0] + 0.035, center[1] + 0.050],
            [center[0] + 0.020, center[1] - 0.040]
        ]
        sam_polygon = [
            [center[0] - 0.030, center[1] - 0.035],
            [center[0] - 0.005, center[1] + 0.040],
            [center[0] + 0.022, center[1] + 0.025],
            [center[0] + 0.010, center[1] - 0.025]
        ]
    elif "fire-ut" in sid or "uttarakhand" in sid or ("fire" in sid and "maharashtra" not in sid):
        center = [30.80037, 78.00012]
        shelters = [
            {"id": "sh-ut-01", "name": "Garhwal Division Community Relief Camp (Barkot)", "lat": 30.815, "lon": 78.018, "capacity": 900, "occupancy": 210, "road_status": "Open · Clear of Fireline", "hazard_risk": "LOW", "distance_km": 2.6},
            {"id": "sh-ut-02", "name": "Tehri District Valley Safe Haven Center", "lat": 30.782, "lon": 77.980, "capacity": 750, "occupancy": 180, "road_status": "Open", "hazard_risk": "LOW", "distance_km": 3.8},
            {"id": "sh-ut-03", "name": "Uttarkashi Regional Indoor Stadium", "lat": 30.835, "lon": 78.035, "capacity": 1200, "occupancy": 340, "road_status": "Open", "hazard_risk": "LOW", "distance_km": 5.9}
        ]
        hospitals = [
            {"id": "hp-ut-01", "name": "District Combined Hospital Uttarkashi", "lat": 30.810, "lon": 78.010, "beds_total": 150, "beds_available": 42, "ambulances": 7},
            {"id": "hp-ut-02", "name": "Barkot Community Health Centre", "lat": 30.790, "lon": 77.990, "beds_total": 60, "beds_available": 18, "ambulances": 3}
        ]
        roads = [
            {"id": "rd-ut-01", "name": "Yamunotri Highway (NH-134)", "coordinates": [[30.770, 77.960], [30.80037, 78.00012], [30.830, 78.040]], "length_km": 11.2, "status": "Clear · Forest Dept Patrol Active"},
            {"id": "rd-ut-02", "name": "Purola Ridge Link Road", "coordinates": [[30.800, 78.000], [30.820, 78.020]], "length_km": 4.5, "status": "Open / Clear"}
        ]
        settlements = [
            {"name": "Garhwal Ridge Settlement", "lat": 30.80037, "lon": 78.00012, "population": 1850, "buildings": 410}
        ]
        hazard_polygon = [
            [center[0] - 0.030, center[1] - 0.035],
            [center[0] - 0.010, center[1] + 0.040],
            [center[0] + 0.035, center[1] + 0.025],
            [center[0] + 0.015, center[1] - 0.030]
        ]
        sam_polygon = [
            [center[0] - 0.018, center[1] - 0.020],
            [center[0] - 0.005, center[1] + 0.025],
            [center[0] + 0.020, center[1] + 0.015],
            [center[0] + 0.010, center[1] - 0.018]
        ]
    elif "def" in sid or "deforest" in sid:
        center = [10.885441, 76.520764] if ("kerala" in sid or "def_00007" in sid) else [26.2, 92.8]
        shelters = [
            {"id": "sh-def-01", "name": "Forest Division Conservation Post (Ecological Advisory)", "lat": center[0] + 0.015, "lon": center[1] + 0.018, "capacity": 100, "occupancy": 15, "road_status": "Patrol Track Open", "hazard_risk": "LOW", "distance_km": 1.9},
            {"id": "sh-def-02", "name": "State Forest Department Base Station", "lat": center[0] - 0.012, "lon": center[1] - 0.015, "capacity": 150, "occupancy": 20, "road_status": "Open", "hazard_risk": "LOW", "distance_km": 2.4}
        ]
        hospitals = [
            {"id": "hp-def-01", "name": "Forestry Mobile Medical Base", "lat": center[0] + 0.010, "lon": center[1] + 0.010, "beds_total": 20, "beds_available": 14, "ambulances": 2}
        ]
        roads = [
            {"id": "rd-def-01", "name": "Forest Range Buffer Road", "coordinates": [[center[0] - 0.020, center[1] - 0.020], [center[0], center[1]], [center[0] + 0.020, center[1] + 0.020]], "length_km": 5.4, "status": "Clear / Forestry Patrol"}
        ]
        settlements = [
            {"name": "Buffer Zone Hamlet", "lat": center[0], "lon": center[1], "population": 520, "buildings": 95}
        ]
        hazard_polygon = [
            [center[0] - 0.020, center[1] - 0.025],
            [center[0] - 0.005, center[1] + 0.030],
            [center[0] + 0.025, center[1] + 0.020],
            [center[0] + 0.010, center[1] - 0.020]
        ]
        sam_polygon = [
            [center[0] - 0.012, center[1] - 0.015],
            [center[0] - 0.003, center[1] + 0.018],
            [center[0] + 0.015, center[1] + 0.012],
            [center[0] + 0.008, center[1] - 0.012]
        ]
    else:
        # Default / Maharashtra historical reference
        center = [19.751, 75.713]
        shelters = [
            {"id": "sh-mh-01", "name": "District Sports Complex (Reference Location)", "lat": 19.760, "lon": 75.720, "capacity": 500, "occupancy": 120, "road_status": "Open", "hazard_risk": "LOW", "distance_km": 1.9}
        ]
        hospitals = [
            {"id": "hp-mh-01", "name": "Civil Hospital", "lat": 19.740, "lon": 75.700, "beds_total": 120, "beds_available": 45, "ambulances": 6}
        ]
        roads = [
            {"id": "rd-mh-01", "name": "State Highway 14", "coordinates": [[19.720, 75.680], [19.751, 75.713], [19.780, 75.740]], "length_km": 8.5, "status": "Clear"}
        ]
        settlements = [
            {"name": "Forest Boundary Settlement", "lat": 19.751, "lon": 75.713, "population": 1360, "buildings": 310}
        ]
        hazard_polygon = [
            [center[0] - 0.025, center[1] - 0.030],
            [center[0] - 0.010, center[1] + 0.035],
            [center[0] + 0.030, center[1] + 0.020],
            [center[0] + 0.015, center[1] - 0.025]
        ]
        sam_polygon = [
            [center[0] - 0.015, center[1] - 0.018],
            [center[0] - 0.005, center[1] + 0.020],
            [center[0] + 0.018, center[1] + 0.010],
            [center[0] + 0.008, center[1] - 0.015]
        ]

    return {
        "center": center,
        "hazard_polygon": hazard_polygon,
        "sam_polygon": sam_polygon,
        "shelters": shelters,
        "hospitals": hospitals,
        "roads": roads,
        "settlements": settlements
    }
