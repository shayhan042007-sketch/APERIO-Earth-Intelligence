from backend.app.agents.orchestrator import orchestrator
from backend.app.services.report_generator import report_generator_service
import os

print("--- RUNNING FULL APERIO WORKFLOW FOR WAYANAD LANDSLIDE ---")
res = orchestrator.execute_workflow(scenario_id="wayanad-landslide", disaster_type="Landslide")
print("Execution ID:", res.execution_id)
print("Target:", res.disaster_type, res.region)
print("Final Risk:", res.final_risk, "%")
print("Severity:", res.severity)
print("Confidence:", res.confidence, "%")
print("Agent Traces Count:", len(res.agent_traces))
print("SAM Area:", res.evidence_summary["sam_segmented_area_km2"], "km2")
print("Impact Population Exposed:", res.impact_summary["population_exposed"])
print("Recommendations Count:", len(res.recommendations))
print("Human Approval Required:", res.approval_required, "Approval ID:", res.approval_id)

pdf_path = report_generator_service.generate_pdf_report({
    "id": "wayanad-landslide",
    "hazard": "Landslide",
    "place": "Meppadi, Wayanad",
    "region": "Kerala",
    "risk": res.final_risk,
    "confidence": res.confidence,
    "area": f"{res.evidence_summary['sam_segmented_area_km2']} km²",
    "population": f"{res.impact_summary['population_exposed']:,}",
    "rainfall": 180,
    "slope": 35
})
print("PDF File generated:", pdf_path, "Size:", os.path.getsize(pdf_path), "bytes")
assert os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 1000
print("WORKFLOW AND PDF GENERATION PASSED SUCCESSFULLY!")
