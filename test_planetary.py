from pystac_client import Client
import planetary_computer
import requests
from pathlib import Path
import json

catalog = Client.open(
    "https://planetarycomputer.microsoft.com/api/stac/v1"
)

PRE_ID = "S2A_MSIL2A_20240207T051001_R019_T43PFM_20240207T101557"
POST_ID = "S2A_MSIL2A_20240507T050651_R019_T43PFM_20240507T094120"

pre = next(
    catalog.search(
        collections=["sentinel-2-l2a"],
        ids=[PRE_ID]
    ).items()
)

post = next(
    catalog.search(
        collections=["sentinel-2-l2a"],
        ids=[POST_ID]
    ).items()
)

output_dir = Path(
    "backend/data/satellite_imagery/deforestation"
)

output_dir.mkdir(
    parents=True,
    exist_ok=True
)


def download_visual(item, filename):

    signed_item = planetary_computer.sign(item)

    visual = signed_item.assets.get("visual")

    if visual is None:
        raise RuntimeError(
            f"No visual asset for {item.id}"
        )

    response = requests.get(
        visual.href,
        timeout=120
    )

    response.raise_for_status()

    path = output_dir / filename

    with open(path, "wb") as f:
        f.write(response.content)

    print("Saved:", path)


download_visual(pre, "pre_event.tif")
download_visual(post, "post_event.tif")


metadata = {
    "event": "Deforestation",
    "region": "Western Ghats, Kerala",
    "sensor": "Sentinel-2",
    "tile": "43PFM",

    "pre_event": {
        "date": str(pre.datetime),
        "scene_id": pre.id,
        "cloud_cover": pre.properties.get(
            "eo:cloud_cover"
        )
    },

    "post_event": {
        "date": str(post.datetime),
        "scene_id": post.id,
        "cloud_cover": post.properties.get(
            "eo:cloud_cover"
        )
    },

    "source": "Microsoft Planetary Computer",
    "product": "Sentinel-2 L2A",
    "visual_asset": "TCI / true color",

    "note": (
        "Pre/post observation pair for vegetation "
        "change analysis. Deforestation is not "
        "asserted without change-detection evidence."
    )
}

with open(
    output_dir / "metadata.json",
    "w"
) as f:
    json.dump(metadata, f, indent=2)

print("\nDEFORESTATION SATELLITE DATASET READY")