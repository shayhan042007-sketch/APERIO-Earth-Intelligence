import os
import time
import json
import urllib.request
import urllib.parse
from typing import Dict, Any, List, Optional, Tuple

class CDSEConfigError(Exception):
    """Raised when Copernicus Data Space Ecosystem credentials are missing."""
    pass

class CDSEAPIError(Exception):
    """Raised when CDSE API returns an error or invalid response."""
    pass

class CDSEClient:
    def __init__(self):
        self.client_id = os.environ.get("CDSE_CLIENT_ID", "").strip()
        self.client_secret = os.environ.get("CDSE_CLIENT_SECRET", "").strip()
        self.token_url = os.environ.get(
            "CDSE_TOKEN_URL",
            "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
        ).strip()
        self.sh_base_url = os.environ.get(
            "CDSE_SH_BASE_URL",
            "https://sh.dataspace.copernicus.eu"
        ).rstrip("/")

        self._token: Optional[str] = None
        self._token_expires_at: float = 0.0

    def is_configured(self) -> bool:
        # Check current env in case it was loaded or updated
        cid = os.environ.get("CDSE_CLIENT_ID", self.client_id).strip()
        csec = os.environ.get("CDSE_CLIENT_SECRET", self.client_secret).strip()
        return bool(cid and csec)

    def get_token(self) -> str:
        """Retrieves or refreshes OAuth 2.0 access token."""
        cid = os.environ.get("CDSE_CLIENT_ID", self.client_id).strip()
        csec = os.environ.get("CDSE_CLIENT_SECRET", self.client_secret).strip()
        if not cid or not csec:
            raise CDSEConfigError(
                "Copernicus Data Space Ecosystem credentials not configured. "
                "Set CDSE_CLIENT_ID and CDSE_CLIENT_SECRET in environment variables."
            )

        now = time.time()
        # Return valid cached token (buffer 60 seconds)
        if self._token and now < (self._token_expires_at - 60):
            return self._token

        data = urllib.parse.urlencode({
            "grant_type": "client_credentials",
            "client_id": cid,
            "client_secret": csec
        }).encode("utf-8")

        req = urllib.request.Request(
            self.token_url,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                self._token = res_json.get("access_token")
                expires_in = res_json.get("expires_in", 3600)
                self._token_expires_at = now + float(expires_in)
                return self._token
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8", errors="ignore")
            raise CDSEAPIError(f"OAuth authentication failed (HTTP {e.code}): {err_msg}")
        except Exception as e:
            raise CDSEAPIError(f"OAuth request failed: {str(e)}")

    def search_sentinel2_scenes(
        self,
        bbox: List[float],
        date_from: str,
        date_to: str,
        max_cloud: float = 30.0,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Queries Sentinel Hub Catalog API for Sentinel-2 L2A observations.
        bbox format: [min_lon, min_lat, max_lon, max_lat]
        date format: YYYY-MM-DD
        """
        token = self.get_token()
        search_url = f"{self.sh_base_url}/api/v1/catalog/1.0.0/search"

        payload = {
            "bbox": bbox,
            "datetime": f"{date_from}T00:00:00Z/{date_to}T23:59:59Z",
            "collections": ["sentinel-2-l2a"],
            "limit": limit
        }

        req = urllib.request.Request(
            search_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                features = data.get("features", [])
                results = []
                for f in features:
                    props = f.get("properties", {})
                    cloud = props.get("eo:cloud_cover", 100.0)
                    if cloud <= max_cloud:
                        results.append({
                            "id": f.get("id"),
                            "datetime": props.get("datetime"),
                            "date": props.get("datetime", "")[:10],
                            "cloud_cover": cloud,
                            "bbox": f.get("bbox")
                        })
                # Sort by lowest cloud cover
                results.sort(key=lambda x: x["cloud_cover"])
                return results
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8", errors="ignore")
            raise CDSEAPIError(f"Catalog search failed (HTTP {e.code}): {err_msg}")
        except Exception as e:
            raise CDSEAPIError(f"Catalog request failed: {str(e)}")

    def fetch_sentinel2_true_color(
        self,
        bbox: List[float],
        date_from: str,
        date_to: str,
        width: int = 512,
        height: int = 512,
        max_cloud: float = 30.0
    ) -> bytes:
        """
        Fetches Sentinel-2 True-Color (B04, B03, B02) PNG via Sentinel Hub Process API.
        """
        token = self.get_token()
        process_url = f"{self.sh_base_url}/api/v1/process"

        # Evalscript for Sentinel-2 True Color RGB
        evalscript = """//VERSION=3
function setup() {
  return {
    input: ["B04", "B03", "B02"],
    output: { bands: 3 }
  };
}
function evaluatePixel(sample) {
  // Reflectance values are scaled [0, 1]. Enhance by factor 2.5 for natural true color
  return [sample.B04 * 2.5, sample.B03 * 2.5, sample.B02 * 2.5];
}
"""

        payload = {
            "input": {
                "bounds": {
                    "bbox": bbox,
                    "properties": {
                        "crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
                    }
                },
                "data": [
                    {
                        "type": "sentinel-2-l2a",
                        "dataFilter": {
                            "timeRange": {
                                "from": f"{date_from}T00:00:00Z",
                                "to": f"{date_to}T23:59:59Z"
                            },
                            "maxCloudCoverage": max_cloud
                        }
                    }
                ]
            },
            "output": {
                "width": width,
                "height": height,
                "responses": [
                    {
                        "identifier": "default",
                        "format": {
                            "type": "image/png"
                        }
                    }
                ]
            },
            "evalscript": evalscript
        }

        req = urllib.request.Request(
            process_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "image/png"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8", errors="ignore")
            raise CDSEAPIError(f"Process API failed (HTTP {e.code}): {err_msg}")
        except Exception as e:
            raise CDSEAPIError(f"Process API request failed: {str(e)}")

cdse_client = CDSEClient()
