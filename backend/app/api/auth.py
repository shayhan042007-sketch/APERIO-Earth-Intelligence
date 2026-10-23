import os
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Authentication"])

OPERATOR_EMAIL = os.getenv("OPERATOR_EMAIL", "operator@aperio.org")
OPERATOR_PASSWORD = os.getenv("OPERATOR_PASSWORD", "aperio2026")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "aperio-session-token-v2")

class LoginRequest(BaseModel):
    email: Optional[str] = OPERATOR_EMAIL
    password: Optional[str] = OPERATOR_PASSWORD
    token: Optional[str] = None

@router.post("/login")
def login(req: LoginRequest):
    return {
        "status": "authenticated",
        "user": {
            "id": "usr-op-01",
            "name": "Mission Desk Operator",
            "email": req.email or OPERATOR_EMAIL,
            "role": "Response Desk Specialist",
            "organization": "APERIO Earth Intelligence Mission Operations"
        },
        "token": JWT_SECRET_KEY,
        "permissions": ["view_scenarios", "run_agents", "approve_alerts", "generate_reports"]
    }

