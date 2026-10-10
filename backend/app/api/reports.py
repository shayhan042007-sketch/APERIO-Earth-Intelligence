import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from backend.app.schemas.pydantic_schemas import ReportGenerateRequest
from backend.app.services.report_generator import report_generator_service, REPORT_OUTPUT_DIR
from backend.app.api.disasters import SCENARIOS_DATABASE
from backend.app.data.disaster_repository import disaster_repository

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.post("/generate")
def generate_report(req: ReportGenerateRequest):
    ev = disaster_repository.get_event_by_id(req.scenario_id)
    if ev:
        scenario = {
            "id": ev["event_id"],
            "hazard": ev["disaster_type"].capitalize(),
            "place": ev["district"] or f"{ev['state']} Area",
            "region": ev["state"],
            "risk": int(ev.get("risk_score", 75)),
            "confidence": int(ev.get("confidence", 0.85) * 100),
            "area": "N/A" if ev["latitude"] is None else "Survey extent",
            "population": "Assessed in loop",
            "rainfall": 120,
            "slope": 15,
            "approval_status": "AWAITING HUMAN REVIEW",
            "is_synthetic": "SYNTHETIC" in str(ev.get("evidence", {})) or ev["disaster_type"] == "DEFORESTATION"
        }
    else:
        scenario = next((s for s in SCENARIOS_DATABASE if s["id"] == req.scenario_id), SCENARIOS_DATABASE[0])

    pdf_path = report_generator_service.generate_pdf_report(scenario, req.operator_notes or "")

    filename = os.path.basename(pdf_path)
    return {
        "status": "REPORT_GENERATED",
        "scenario_id": req.scenario_id,
        "filename": filename,
        "format": "PDF",
        "file_size_bytes": os.path.getsize(pdf_path),
        "download_url": f"/api/reports/download/{filename}",
        "summary": {
            "title": f"APERIO Disaster Intelligence Authority Report - {scenario['hazard']}",
            "location": f"{scenario['place']}, {scenario['region']}",
            "risk_score": f"{scenario['risk']}%",
            "confidence": f"{scenario['confidence']}%",
            "disclaimer": "Official sample demonstration report generated via ReportLab."
        }
    }

@router.get("/download/{filename}")
def download_report_pdf(filename: str):
    file_path = os.path.join(REPORT_OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Requested report PDF not found")
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/pdf"
    )
