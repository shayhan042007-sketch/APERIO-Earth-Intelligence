from fastapi import APIRouter, Query
from backend.app.schemas.pydantic_schemas import RelocationRecommendRequest, RelocationRecommendResponse
from backend.app.agents.recommendation_agent import recommendation_agent
from backend.app.data.ingestion import ingestion_pipeline

from backend.app.api.resources import REGION_POPULATION_METADATA, resolve_region_key
from typing import Optional

router = APIRouter(prefix="/relocation", tags=["Relocation"])

@router.get("")
def get_relocation_options(scenario_id: str = Query("wayanad-landslide"), population_to_relocate: Optional[int] = Query(None)):
    key = resolve_region_key(scenario_id, None)
    meta = REGION_POPULATION_METADATA.get(key, REGION_POPULATION_METADATA["wayanad"])
    default_pop = meta.get("population_requiring_relocation", 500)
    pop = population_to_relocate if population_to_relocate is not None else default_pop

    ingested = ingestion_pipeline.ingest_scenario_data(scenario_id)
    from backend.app.data.disaster_repository import disaster_repository
    ev = disaster_repository.get_event_by_id(scenario_id)
    if ev:
        ingested["disaster_type"] = ev.get("disaster_type")
        ingested["state"] = ev.get("state")
    rec_res = recommendation_agent.run(ingested, population_to_relocate=pop)
    return {
        "scenario_id": scenario_id,
        "population_to_relocate": pop,
        "recommended_zone": rec_res["output"]["recommended_zone"],
        "top_shelter": rec_res["output"]["top_shelter"],
        "alternatives": rec_res["output"]["alternatives"],
        "decision_type": rec_res["output"].get("decision_type", "DECISION SUPPORT"),
        "requires_human_approval": True,
        "disclaimer": "Operator review mandatory. Route and shelter accessibility require ground verification."
    }

@router.post("/recommend", response_model=RelocationRecommendResponse)
def recommend_relocation(req: RelocationRecommendRequest):
    ingested = ingestion_pipeline.ingest_scenario_data(req.scenario_id)
    from backend.app.data.disaster_repository import disaster_repository
    ev = disaster_repository.get_event_by_id(req.scenario_id)
    if ev:
        ingested["disaster_type"] = ev.get("disaster_type")
        ingested["state"] = ev.get("state")
    rec_res = recommendation_agent.run(ingested, population_to_relocate=req.population_to_relocate)
    out = rec_res["output"]

    return RelocationRecommendResponse(
        recommended_zone=out["recommended_zone"],
        score=out["score"],
        decision_type="DECISION SUPPORT",
        requires_approval=True,
        reasons=out["reasons"],
        alternatives=out["alternatives"],
        route_safety="North Corridor Clear of Debris Runout",
        shelter_details=out["top_shelter"]
    )
