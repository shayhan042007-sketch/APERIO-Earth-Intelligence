from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: Optional[str] = "operator@aperio.org"
    password: Optional[str] = "aperio2026"
    token: Optional[str] = None

@router.post("/login")
def login(req: LoginRequest):
    return {
        "status": "authenticated",
        "user": {
            "id": "usr-op-01",
            "name": "Mission Desk Operator",
            "email": req.email,
            "role": "Response Desk Specialist",
            "organization": "APERIO Earth Intelligence Mission Operations"
        },
        "token": "aperio-session-token-v2",
        "permissions": ["view_scenarios", "run_agents", "approve_alerts", "generate_reports"]
    }
