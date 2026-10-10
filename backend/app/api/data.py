from fastapi import APIRouter, Query
from backend.app.schemas.pydantic_schemas import DataInventoryResponse
from backend.app.data.dataset_loader import dataset_inventory_service
from backend.app.data.gis import get_gis_layers

router = APIRouter(prefix="/data", tags=["Data Inventory"])

@router.get("/inventory", response_model=DataInventoryResponse)
def get_data_inventory():
    return dataset_inventory_service.get_inventory()

@router.get("/siamese-sample")
def get_siamese_tile_sample(index: int = 0):
    sample = dataset_inventory_service.load_siamese_sample(index=index)
    if not sample:
        return {"status": "NO_SIAMESE_DATA_FOUND", "message": "archive.zip not loaded or accessible"}
    return sample

@router.get("/gis")
def get_gis_infrastructure(scenario_id: str = Query(default="wayanad-landslide")):
    return get_gis_layers(scenario_id)
