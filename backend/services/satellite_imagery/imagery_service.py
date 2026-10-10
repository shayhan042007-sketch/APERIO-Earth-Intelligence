import os
import json
import shutil
from typing import Dict, Any, List, Optional
from backend.services.satellite_imagery.event_catalog import resolve_event, EVENT_CATALOG
from backend.services.satellite_imagery.cdse_client import cdse_client, CDSEConfigError, CDSEAPIError

STORAGE_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "satellite_imagery"))
WEB_PUBLIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "artifacts", "aperio", "public", "satellite_imagery"))
WEB_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "artifacts", "aperio", "dist", "public", "satellite_imagery"))

class ImageryService:
    def __init__(self):
        os.makedirs(STORAGE_BASE_DIR, exist_ok=True)
        for h in ["flood", "landslide", "wildfire", "deforestation"]:
            os.makedirs(os.path.join(STORAGE_BASE_DIR, h), exist_ok=True)
            if os.path.exists(os.path.dirname(WEB_PUBLIC_DIR)):
                os.makedirs(os.path.join(WEB_PUBLIC_DIR, h), exist_ok=True)
            if os.path.exists(os.path.dirname(WEB_DIST_DIR)):
                os.makedirs(os.path.join(WEB_DIST_DIR, h), exist_ok=True)

    def get_event_imagery(
        self,
        event_id: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        bbox: Optional[List[float]] = None,
        pre_event_date: Optional[str] = None,
        post_event_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieves real Sentinel-2 pre-event and post-event satellite imagery for an APERIO scenario.
        Checks local verified storage first; otherwise queries CDSE Sentinel Hub API if configured.
        """
        spec = resolve_event(event_id)
        if not spec:
            return {
                "available": False,
                "status": "EVENT_NOT_FOUND",
                "message": f"Event '{event_id}' not found in APERIO event catalog.",
                "event_id": event_id
            }

        hazard_dir = spec["directory"]
        dir_path = os.path.join(STORAGE_BASE_DIR, hazard_dir)
        lat = latitude if latitude is not None else spec["latitude"]
        lon = longitude if longitude is not None else spec["longitude"]
        box = bbox if bbox is not None else spec["bbox"]
        pre_target = pre_event_date or spec["pre_event_date"]
        post_target = post_event_date or spec["post_event_date"]

        meta_path = os.path.join(dir_path, "metadata.json")
        pre_path = os.path.join(dir_path, "pre_event.png")
        post_path = os.path.join(dir_path, "post_event.png")

        # 1. Check if cached real imagery exists in storage
        if os.path.exists(pre_path) and os.path.exists(post_path) and os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                self._sync_to_web(hazard_dir, pre_path, post_path)
                return {
                    "available": True,
                    "status": "LOADED_FROM_STORAGE",
                    "event_id": event_id,
                    "hazard": spec["hazard"],
                    "region": spec["region"],
                    "latitude": lat,
                    "longitude": lon,
                    "bbox": meta.get("bbox", box),
                    "source": meta.get("source", "Copernicus Data Space Ecosystem"),
                    "pre_event": {
                        "image_url": f"/satellite_imagery/{hazard_dir}/pre_event.png",
                        "date": meta.get("pre_event_date", pre_target),
                        "sensor": meta.get("sensor", "Sentinel-2"),
                        "product": meta.get("product", "L2A"),
                        "bands": meta.get("bands", ["B04", "B03", "B02"])
                    },
                    "post_event": {
                        "image_url": f"/satellite_imagery/{hazard_dir}/post_event.png",
                        "date": meta.get("post_event_date", post_target),
                        "sensor": meta.get("sensor", "Sentinel-2"),
                        "product": meta.get("product", "L2A"),
                        "bands": meta.get("bands", ["B04", "B03", "B02"])
                    }
                }
            except Exception:
                pass

        # 2. Check if CDSE API credentials are configured
        if not cdse_client.is_configured():
            return {
                "available": False,
                "status": "CONFIGURATION_REQUIRED",
                "message": "Satellite imagery configuration required. CDSE_CLIENT_ID and CDSE_CLIENT_SECRET not configured in environment.",
                "event_id": event_id,
                "hazard": spec["hazard"],
                "region": spec["region"],
                "latitude": lat,
                "longitude": lon,
                "bbox": box,
                "source": "Copernicus Data Space Ecosystem"
            }

        # 3. Retrieve live Sentinel-2 true-color scenes via CDSE Process API
        try:
            pre_scenes = cdse_client.search_sentinel2_scenes(
                bbox=box,
                date_from=spec["pre_window"][0],
                date_to=spec["pre_window"][1],
                max_cloud=35.0
            )
            post_scenes = cdse_client.search_sentinel2_scenes(
                bbox=box,
                date_from=spec["post_window"][0],
                date_to=spec["post_window"][1],
                max_cloud=45.0
            )

            if not pre_scenes or not post_scenes:
                return {
                    "available": False,
                    "status": "NO_OBSERVATIONS_FOUND",
                    "message": "Satellite imagery unavailable for this event in selected time window.",
                    "event_id": event_id,
                    "bbox": box,
                    "latitude": lat,
                    "longitude": lon
                }

            best_pre = pre_scenes[0]
            best_post = post_scenes[0]

            actual_pre_date = best_pre["date"]
            actual_post_date = best_post["date"]

            # Request true-color RGB for identical bbox
            pre_bytes = cdse_client.fetch_sentinel2_true_color(
                bbox=box,
                date_from=actual_pre_date,
                date_to=actual_pre_date,
                width=512,
                height=512
            )
            post_bytes = cdse_client.fetch_sentinel2_true_color(
                bbox=box,
                date_from=actual_post_date,
                date_to=actual_post_date,
                width=512,
                height=512
            )

            with open(pre_path, "wb") as f:
                f.write(pre_bytes)
            with open(post_path, "wb") as f:
                f.write(post_bytes)

            meta_data = {
                "event_id": spec["event_id"],
                "hazard": spec["hazard"],
                "name": spec["name"],
                "region": spec["region"],
                "latitude": lat,
                "longitude": lon,
                "bbox": box,
                "sensor": "Sentinel-2",
                "product": "L2A",
                "bands": ["B04", "B03", "B02"],
                "pre_event_date": actual_pre_date,
                "post_event_date": actual_post_date,
                "pre_cloud_cover": best_pre["cloud_cover"],
                "post_cloud_cover": best_post["cloud_cover"],
                "source": "Copernicus Data Space Ecosystem"
            }
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(meta_data, f, indent=2)

            self._sync_to_web(hazard_dir, pre_path, post_path)

            return {
                "available": True,
                "status": "RETRIEVED_FROM_CDSE",
                "event_id": event_id,
                "hazard": spec["hazard"],
                "region": spec["region"],
                "latitude": lat,
                "longitude": lon,
                "bbox": box,
                "source": "Copernicus Data Space Ecosystem",
                "pre_event": {
                    "image_url": f"/satellite_imagery/{hazard_dir}/pre_event.png",
                    "date": actual_pre_date,
                    "sensor": "Sentinel-2",
                    "product": "L2A",
                    "bands": ["B04", "B03", "B02"]
                },
                "post_event": {
                    "image_url": f"/satellite_imagery/{hazard_dir}/post_event.png",
                    "date": actual_post_date,
                    "sensor": "Sentinel-2",
                    "product": "L2A",
                    "bands": ["B04", "B03", "B02"]
                }
            }

        except (CDSEConfigError, CDSEAPIError) as e:
            return {
                "available": False,
                "status": "CDSE_API_ERROR",
                "message": str(e),
                "event_id": event_id,
                "bbox": box,
                "latitude": lat,
                "longitude": lon
            }

    def _sync_to_web(self, hazard_dir: str, pre_path: str, post_path: str):
        for base in [WEB_PUBLIC_DIR, WEB_DIST_DIR]:
            target_dir = os.path.join(base, hazard_dir)
            os.makedirs(target_dir, exist_ok=True)
            try:
                shutil.copy2(pre_path, os.path.join(target_dir, "pre_event.png"))
                shutil.copy2(post_path, os.path.join(target_dir, "post_event.png"))
            except Exception:
                pass

imagery_service = ImageryService()

def get_event_imagery(
    event_id: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    bbox: Optional[List[float]] = None,
    pre_event_date: Optional[str] = None,
    post_event_date: Optional[str] = None
) -> Dict[str, Any]:
    return imagery_service.get_event_imagery(
        event_id=event_id,
        latitude=latitude,
        longitude=longitude,
        bbox=bbox,
        pre_event_date=pre_event_date,
        post_event_date=post_event_date
    )
