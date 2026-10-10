import os
import csv
import re
from typing import Dict, Any, List, Optional, Tuple

class DisasterRepository:
    """
    Central repository for the four disaster datasets:
    1. FLOOD: District_FloodedArea.csv
    2. WILDFIRE: himalayan_forestFire_analysis_clean.csv
    3. DEFORESTATION: aperio_synthetic_deforestation_dataset.csv (SYNTHETIC DEMO DATA)
    4. LANDSLIDE: LandslideIncidences.csv
    """
    def __init__(self, data_dir: str = "backend/data/disaster_datasets"):
        self.data_dir = data_dir
        self.flood_file = self._resolve_path("District_FloodedArea.csv", r"C:\Users\Lenovo\Downloads\District_FloodedArea.csv")
        self.wildfire_file = self._resolve_path("himalayan_forestFire_analysis_clean.csv", r"C:\Users\Lenovo\Downloads\himalayan_forestFire_analysis_clean.csv")
        self.deforest_file = self._resolve_path("aperio_synthetic_deforestation_dataset.csv", r"C:\Users\Lenovo\Downloads\aperio_synthetic_deforestation_dataset.csv")
        self.landslide_file = self._resolve_path("LandslideIncidences.csv", r"C:\Users\Lenovo\Downloads\archive (4)\LandslideIncidences.csv")

        self._flood_records: List[Dict[str, Any]] = []
        self._wildfire_by_state: Dict[str, List[Dict[str, Any]]] = {}
        self._deforest_by_state: Dict[str, List[Dict[str, Any]]] = {}
        self._landslide_records: List[Dict[str, Any]] = []
        self._all_events_index: Dict[str, Dict[str, Any]] = {}

        self._load_datasets()

    def _resolve_path(self, filename: str, fallback: str) -> str:
        local_p = os.path.join(self.data_dir, filename)
        if os.path.exists(local_p):
            return local_p
        if os.path.exists(fallback):
            return fallback
        return local_p

    def _load_datasets(self):
        self._load_flood()
        self._load_wildfire()
        self._load_deforestation()
        self._load_landslides()

    def _load_flood(self):
        if not os.path.exists(self.flood_file):
            return

        state_blocks = [
            (0, 2, 'Dadra & Nagar Haveli and Daman & Diu'),
            (3, 5, 'Andaman & Nicobar Islands'),
            (6, 18, 'Andhra Pradesh'),
            (19, 43, 'Arunachal Pradesh'),
            (44, 76, 'Assam'),
            (77, 114, 'Bihar'),
            (115, 115, 'Chandigarh'),
            (116, 142, 'Chhattisgarh'),
            (143, 153, 'Delhi'),
            (154, 155, 'Goa'),
            (156, 188, 'Gujarat'),
            (189, 210, 'Haryana'),
            (211, 222, 'Himachal Pradesh'),
            (223, 244, 'Jammu & Kashmir'),
            (245, 268, 'Jharkhand'),
            (269, 298, 'Karnataka'),
            (299, 312, 'Kerala'),
            (313, 363, 'Madhya Pradesh'),
            (364, 399, 'Maharashtra'),
            (400, 415, 'Manipur'),
            (416, 426, 'Meghalaya'),
            (427, 434, 'Mizoram'),
            (435, 445, 'Nagaland'),
            (446, 475, 'Odisha'),
            (476, 497, 'Punjab'),
            (498, 530, 'Rajasthan'),
            (531, 534, 'Sikkim'),
            (535, 565, 'Telangana'),
            (566, 573, 'Tripura'),
            (574, 648, 'Uttar Pradesh'),
            (649, 661, 'Uttarakhand'),
            (662, 684, 'West Bengal'),
            (685, 731, 'Tamil Nadu')
        ]

        def get_state_for_index(idx: int) -> str:
            for s, e, name in state_blocks:
                if s <= idx <= e:
                    return name
            return "India"

        with open(self.flood_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                dist = row.get("Dist_Name", "").strip()
                pct_flood = float(row.get("Percent_Flooded_Area", 0.0) or 0.0)
                perm_water = float(row.get("Parmanent_Water", 0.0) or 0.0)
                corr_flood = float(row.get("Corrected_Percent_Flooded_Area", 0.0) or 0.0)
                state = get_state_for_index(idx)

                event_id = f"FLD-{dist.replace(' ', '_').replace('&', 'and')}"

                if corr_flood >= 15.0 or pct_flood >= 25.0:
                    severity = "CRITICAL"
                elif corr_flood >= 8.0 or pct_flood >= 12.0:
                    severity = "HIGH"
                elif corr_flood >= 3.0 or pct_flood >= 5.0:
                    severity = "MODERATE"
                elif corr_flood > 0.5:
                    severity = "LOW"
                else:
                    severity = "WATCH"

                risk_score = round(min(98.0, max(5.0, corr_flood * 3.5 + pct_flood * 1.5)), 1)
                conf = 0.88

                item = {
                    "disaster_type": "FLOOD",
                    "event_id": event_id,
                    "state": state,
                    "district": dist,
                    "latitude": None,
                    "longitude": None,
                    "observation_date": "Monsoon Flood Inundation Assessment",
                    "severity": severity,
                    "confidence": conf,
                    "risk_score": risk_score,
                    "evidence": {
                        "district_name": dist,
                        "percent_flooded_area": round(pct_flood, 2),
                        "permanent_water_pct": round(perm_water, 2),
                        "corrected_percent_flooded_area": round(corr_flood, 2),
                        "survey_unit": "District Administrative Unit"
                    },
                    "source": "District_FloodedArea.csv",
                    "raw_data": row
                }
                self._flood_records.append(item)
                self._all_events_index[event_id] = item

    def _load_wildfire(self):
        if not os.path.exists(self.wildfire_file):
            return
        with open(self.wildfire_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                state = row.get("state", "").strip() or "Himalayan Region"
                lat = float(row.get("latitude", 0.0))
                lon = float(row.get("longitude", 0.0))
                frp = float(row.get("frp", 0.0) or 0.0)
                brightness = float(row.get("brightness", 0.0) or 0.0)
                bright_t31 = float(row.get("bright_t31", 0.0) or 0.0)
                conf_raw = str(row.get("confidence", "n")).strip().lower()
                acq_date = row.get("acq_date", "").strip()
                acq_time = row.get("acq_time", "").strip()
                daynight = row.get("daynight", "D").strip()
                land_cover = row.get("land_cover_code", "").strip()

                event_id = f"FIRE-{state[:2].upper()}-{idx+1:05d}"

                if conf_raw == 'h': conf = 0.95
                elif conf_raw == 'n': conf = 0.75
                elif conf_raw == 'l': conf = 0.50
                else:
                    try: conf = min(1.0, max(0.1, float(conf_raw) / 100.0))
                    except: conf = 0.75

                if frp >= 50.0 or brightness >= 370.0:
                    severity = "CRITICAL"
                    risk_score = round(min(98.0, 75.0 + frp * 0.3), 1)
                elif frp >= 20.0 or brightness >= 340.0:
                    severity = "HIGH"
                    risk_score = round(min(85.0, 60.0 + frp * 0.4), 1)
                elif frp >= 8.0:
                    severity = "MODERATE"
                    risk_score = round(min(68.0, 40.0 + frp * 0.8), 1)
                else:
                    severity = "LOW"
                    risk_score = round(min(45.0, 20.0 + frp * 1.2), 1)

                item = {
                    "disaster_type": "WILDFIRE",
                    "event_id": event_id,
                    "state": state,
                    "district": f"Coord ({lat:.2f}N, {lon:.2f}E)",
                    "latitude": lat,
                    "longitude": lon,
                    "observation_date": acq_date,
                    "severity": severity,
                    "confidence": conf,
                    "risk_score": risk_score,
                    "evidence": {
                        "frp": frp,
                        "brightness": brightness,
                        "bright_t31": bright_t31,
                        "confidence": conf_raw,
                        "acq_time": acq_time,
                        "daynight": daynight,
                        "land_cover_code": land_cover,
                        "satellite_source": "MODIS/VIIRS Active Fire Radiometer"
                    },
                    "source": "himalayan_forestFire_analysis_clean.csv",
                    "raw_data": row
                }
                if state not in self._wildfire_by_state:
                    self._wildfire_by_state[state] = []
                self._wildfire_by_state[state].append(item)
                self._all_events_index[event_id] = item

    def _load_deforestation(self):
        if not os.path.exists(self.deforest_file):
            return
        with open(self.deforest_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                sample_id = row.get("sample_id", "").strip()
                state = row.get("state", "").strip()
                lat = float(row.get("latitude", 0.0))
                lon = float(row.get("longitude", 0.0))
                obs_date = row.get("observation_date", "").strip()
                b_ndvi = float(row.get("before_ndvi", 0.0) or 0.0)
                a_ndvi = float(row.get("after_ndvi", 0.0) or 0.0)
                ch_ndvi = float(row.get("ndvi_change", 0.0) or 0.0)
                loss_pct = float(row.get("forest_loss_pct", 0.0) or 0.0)
                sam_pct = float(row.get("sam_change_area_pct", 0.0) or 0.0)
                tex_score = float(row.get("texture_change_score", 0.0) or 0.0)
                sar_db = float(row.get("sar_change_db", 0.0) or 0.0)
                rain_mm = float(row.get("rainfall_mm", 0.0) or 0.0)
                rain_anom = float(row.get("rainfall_anomaly_pct", 0.0) or 0.0)
                elev = float(row.get("elevation_m", 0.0) or 0.0)
                slope = float(row.get("slope_deg", 0.0) or 0.0)
                def_risk = float(row.get("deforestation_risk", 0.0) or 0.0)
                label = int(row.get("deforestation_label", 0) or 0)

                event_id = f"DEF-{sample_id}"

                risk_score = round(def_risk * 100.0, 1)
                if risk_score >= 80.0 or loss_pct >= 50.0:
                    severity = "CRITICAL"
                elif risk_score >= 60.0 or loss_pct >= 30.0:
                    severity = "HIGH"
                elif risk_score >= 40.0:
                    severity = "MODERATE"
                else:
                    severity = "WATCH"

                item = {
                    "disaster_type": "DEFORESTATION",
                    "event_id": event_id,
                    "state": state,
                    "district": f"Forest Grid ({lat:.2f}N, {lon:.2f}E)",
                    "latitude": lat,
                    "longitude": lon,
                    "observation_date": obs_date,
                    "severity": severity,
                    "confidence": 0.80,
                    "risk_score": risk_score,
                    "evidence": {
                        "before_ndvi": b_ndvi,
                        "after_ndvi": a_ndvi,
                        "ndvi_change": ch_ndvi,
                        "forest_loss_pct": loss_pct,
                        "sam_change_area_pct": sam_pct,
                        "texture_change_score": tex_score,
                        "sar_change_db": sar_db,
                        "rainfall_mm": rain_mm,
                        "rainfall_anomaly_pct": rain_anom,
                        "elevation_m": elev,
                        "slope_deg": slope,
                        "deforestation_risk": def_risk,
                        "deforestation_label": label,
                        "data_type_notice": "SYNTHETIC DEMO DATA - NOT REAL SATELLITE VALIDATION"
                    },
                    "source": "aperio_synthetic_deforestation_dataset.csv (Synthetic Demo Data)",
                    "raw_data": row
                }
                if state not in self._deforest_by_state:
                    self._deforest_by_state[state] = []
                self._deforest_by_state[state].append(item)
                self._all_events_index[event_id] = item

    def _load_landslides(self):
        if not os.path.exists(self.landslide_file):
            return

        def parse_coords(text: str) -> Tuple[Optional[float], Optional[float]]:
            lat_m = re.search(r'Lat[^\d]*(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{1,2}(?:\.\d+)?)[^\d]*N', text, re.I)
            lon_m = re.search(r'Lon[^\d]*(\d{1,3})[^\d]+(\d{1,2})[^\d]+(\d{1,2}(?:\.\d+)?)[^\d]*E', text, re.I)
            lat = None
            lon = None
            if lat_m:
                d, m, s = float(lat_m.group(1)), float(lat_m.group(2)), float(lat_m.group(3))
                lat = round(d + m/60.0 + s/3600.0, 5)
            if lon_m:
                d, m, s = float(lon_m.group(1)), float(lon_m.group(2)), float(lon_m.group(3))
                lon = round(d + m/60.0 + s/3600.0, 5)
            return lat, lon

        known_states = [
            'Tamil Nadu', 'Karnataka', 'Kerala', 'Manipur', 'Arunachal Pradesh', 
            'Assam', 'Meghalaya', 'Sikkim', 'Uttarakhand', 'Himachal Pradesh', 
            'West Bengal', 'Mizoram', 'Nagaland', 'Tripura', 'Maharashtra', 'Goa'
        ]

        with open(self.landslide_file, 'r', encoding='latin-1') as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                title = row.get("Title", "").strip()
                desc = row.get("LandslideIncidence", "").strip()

                state = "Other"
                for s in known_states:
                    if s.lower() in title.lower() or s.lower() in desc.lower():
                        state = s
                        break

                dist_m = re.search(r'([A-Za-z\s]+)\s+District', title)
                district = dist_m.group(1).strip() if dist_m else None
                if not district:
                    dist_m2 = re.search(r'([A-Za-z\s]+)\s+District', desc)
                    district = dist_m2.group(1).strip() if dist_m2 else "Survey Area"

                date_m = re.search(r'\(([^)]+)\)', title)
                date_str = date_m.group(1).strip() if date_m else "August 2020"

                lat, lon = parse_coords(desc)
                event_id = f"LS-{idx+1:02d}"

                rain_m = re.search(r'(\d+(?:\.\d+)?)\s*(?:cm|mm)\s*(?:of\s*)?rainfall', desc, re.I)
                rainfall_val = float(rain_m.group(1)) * 10.0 if rain_m and 'cm' in rain_m.group(0).lower() else (float(rain_m.group(1)) if rain_m else 180.0)

                if "fatal" in desc.lower() or "damaged" in desc.lower() or "blocked" in desc.lower():
                    severity = "CRITICAL" if rainfall_val > 250 else "HIGH"
                    risk_score = round(min(96.0, 70.0 + (rainfall_val / 20.0)), 1)
                else:
                    severity = "MODERATE"
                    risk_score = 62.0

                item = {
                    "disaster_type": "LANDSLIDE",
                    "event_id": event_id,
                    "state": state,
                    "district": district,
                    "latitude": lat,
                    "longitude": lon,
                    "observation_date": date_str,
                    "severity": severity,
                    "confidence": 0.92,
                    "risk_score": risk_score,
                    "evidence": {
                        "incidence_title": title,
                        "geological_survey_summary": desc[:350] + ("..." if len(desc) > 350 else ""),
                        "reported_rainfall_mm": rainfall_val,
                        "coordinates_georeferenced": lat is not None,
                        "source_agency": "Geological Survey of India (GSI) Landslide Incidences"
                    },
                    "source": "LandslideIncidences.csv",
                    "raw_data": row
                }
                self._landslide_records.append(item)
                self._all_events_index[event_id] = item

    # Dynamic Discovery Methods
    def get_disaster_types(self) -> List[str]:
        return ["FLOOD", "WILDFIRE", "DEFORESTATION", "LANDSLIDE"]

    def get_states(self, disaster_type: str) -> List[str]:
        dt = disaster_type.upper()
        if dt == "FLOOD":
            states = set(r["state"] for r in self._flood_records)
            return sorted(list(states))
        elif dt == "WILDFIRE":
            return sorted(list(self._wildfire_by_state.keys()))
        elif dt == "DEFORESTATION":
            return sorted(list(self._deforest_by_state.keys()))
        elif dt == "LANDSLIDE":
            states = set(r["state"] for r in self._landslide_records)
            return sorted(list(states))
        return []

    def get_districts(self, disaster_type: str, state: str) -> List[str]:
        dt = disaster_type.upper()
        if dt == "FLOOD":
            dists = set(r["district"] for r in self._flood_records if r["state"].lower() == state.lower())
            return sorted(list(dists))
        elif dt == "WILDFIRE":
            events = self._wildfire_by_state.get(state, [])
            dates = sorted(list(set(e["observation_date"] for e in events)), reverse=True)
            return dates[:30]
        elif dt == "DEFORESTATION":
            events = self._deforest_by_state.get(state, [])
            grids = sorted(list(set(e["district"] for e in events)))
            return grids[:30]
        elif dt == "LANDSLIDE":
            dists = set(r["district"] for r in self._landslide_records if r["state"].lower() == state.lower())
            return sorted(list(dists))
        return []

    def get_events(self, disaster_type: str, state: Optional[str] = None, district_or_date: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        dt = disaster_type.upper()
        res = []
        if dt == "FLOOD":
            for r in self._flood_records:
                if state and r["state"].lower() != state.lower():
                    continue
                if district_or_date and r["district"].lower() != district_or_date.lower():
                    continue
                res.append(r)
                if len(res) >= limit: break
        elif dt == "WILDFIRE":
            pool = self._wildfire_by_state.get(state, []) if state else [e for sub in self._wildfire_by_state.values() for e in sub]
            for r in pool:
                if district_or_date and r["observation_date"] != district_or_date:
                    continue
                res.append(r)
                if len(res) >= limit: break
        elif dt == "DEFORESTATION":
            pool = self._deforest_by_state.get(state, []) if state else [e for sub in self._deforest_by_state.values() for e in sub]
            for r in pool:
                if district_or_date and r["district"] != district_or_date:
                    continue
                res.append(r)
                if len(res) >= limit: break
        elif dt == "LANDSLIDE":
            for r in self._landslide_records:
                if state and r["state"].lower() != state.lower():
                    continue
                if district_or_date and r["district"] and r["district"].lower() != district_or_date.lower():
                    continue
                res.append(r)
                if len(res) >= limit: break
        return res

    def get_event_by_id(self, event_id: str) -> Optional[Dict[str, Any]]:
        return self._all_events_index.get(event_id)

disaster_repository = DisasterRepository()
