from fastapi import APIRouter
from backend.app.schemas.pydantic_schemas import GeoChatRequest, GeoChatResponse
from backend.app.services.geochat_service import geochat_service
from backend.app.api.disasters import SCENARIOS_DATABASE

router = APIRouter(prefix="/geochat", tags=["GeoChat Explanation"])

@router.get("/provider")
def get_llm_provider():
    """Returns the active configuration and readiness of the LLM provider."""
    return geochat_service.get_provider_status()

@router.post("", response_model=GeoChatResponse)
def chat_with_geochat(req: GeoChatRequest):
    scenario = next((s for s in SCENARIOS_DATABASE if s["id"] == req.scenario_id), SCENARIOS_DATABASE[0])
    
    # Merge custom context if passed
    scenario_data = dict(scenario)
    if req.context:
        scenario_data.update(req.context)

    result = geochat_service.answer_question(
        question=req.question,
        scenario_data=scenario_data,
        scenario_id=req.scenario_id or scenario.get("id"),
        context=req.context,
        messages=req.messages
    )

    return GeoChatResponse(
        question=result["question"],
        answer=result["answer"],
        grounding_evidence=result["grounding_evidence"],
        confidence=result["confidence"],
        sources=result["sources"],
        disclaimer=result["disclaimer"],
        map_target=result.get("map_target"),
        llm_provider=result.get("llm_provider"),
        tool_calls=result.get("tool_calls"),
        status=result.get("status", "SUCCESS")
    )
