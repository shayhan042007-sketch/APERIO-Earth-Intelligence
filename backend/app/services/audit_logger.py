import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.app.database.session import SessionLocal
from backend.app.models.database_models import AgentExecution, HumanApproval

class AuditLogger:
    def __init__(self):
        self._memory_log: List[Dict[str, Any]] = []

    def log_agent_step(
        self,
        agent: str,
        stage: str,
        input_data: Any,
        output_data: Any,
        confidence: float,
        model: str = "APERIO-Agent",
        warnings: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        timestamp = datetime.utcnow().strftime("%H:%M:%S")
        iso_time = datetime.utcnow().isoformat() + "Z"

        entry = {
            "id": f"audit-{len(self._memory_log)+1}-{int(datetime.utcnow().timestamp())}",
            "time_short": timestamp,
            "timestamp": iso_time,
            "agent": agent,
            "stage": stage,
            "confidence": round(confidence, 3),
            "model": model,
            "warnings": warnings or [],
            "decision": output_data.get("status") if isinstance(output_data, dict) else "COMPLETED",
            "summary": f"{agent} [{stage}]: {self._extract_summary(output_data)}"
        }
        self._memory_log.insert(0, entry)

        # Persist to DB if available
        try:
            db = SessionLocal()
            db_record = AgentExecution(
                id=entry["id"],
                agent_name=agent,
                status=entry["decision"],
                confidence=confidence,
                input_sources=[str(input_data)[:200]],
                output_summary=output_data if isinstance(output_data, dict) else {"output": str(output_data)},
                warnings=warnings or [],
                loop_stage=stage
            )
            db.add(db_record)
            db.commit()
            db.close()
        except Exception:
            pass

        return entry

    def log_human_decision(
        self,
        alert_id: str,
        operator: str,
        decision: str,  # APPROVED, REJECTED, REQUEST_MORE_EVIDENCE
        notes: str = ""
    ) -> Dict[str, Any]:
        timestamp = datetime.utcnow().strftime("%H:%M:%S")
        iso_time = datetime.utcnow().isoformat() + "Z"

        entry = {
            "id": f"approval-{len(self._memory_log)+1}",
            "time_short": timestamp,
            "timestamp": iso_time,
            "agent": "Human Operator Review Desk",
            "stage": "VERIFY",
            "confidence": 1.0,
            "model": "Operator Authority",
            "decision": decision,
            "warnings": [],
            "summary": f"Human Operator ({operator}) recorded decision: {decision}. Notes: {notes or 'None'}"
        }
        self._memory_log.insert(0, entry)

        try:
            db = SessionLocal()
            approval = HumanApproval(
                id=entry["id"],
                alert_id=alert_id,
                operator_name=operator,
                decision=decision,
                notes=notes,
                model_confidence=1.0,
                evidence_snapshot={"alert_id": alert_id}
            )
            db.add(approval)
            db.commit()
            db.close()
        except Exception:
            pass

        return entry

    def get_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self._memory_log[:limit]

    def _extract_summary(self, output_data: Any) -> str:
        if isinstance(output_data, dict):
            if "risk_probability" in output_data:
                return f"Risk: {output_data['risk_probability']*100:.1f}%, Severity: {output_data.get('severity')}"
            if "posterior" in output_data:
                return f"Updated Risk: {output_data['posterior']*100:.1f}% ({output_data.get('evidence')})"
            if "segmented_area_km2" in output_data:
                return f"Segmented Scar Area: {output_data['segmented_area_km2']} km²"
            if "change_percentage" in output_data:
                return f"Surface Change: {output_data['change_percentage']}%"
            if "cloud_percentage" in output_data:
                return f"Cloud: {output_data['cloud_percentage']}%, Quality: {output_data.get('quality')}"
            return str(output_data.get("status", "Completed"))
        return str(output_data)[:100]

audit_logger = AuditLogger()
