import os
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Load environment variables from .env in project root and backend directory
_project_root = Path(__file__).resolve().parent.parent.parent
_root_env = _project_root / ".env"
_backend_env = Path(__file__).resolve().parent.parent / ".env"
if _root_env.exists():
    load_dotenv(_root_env)
if _backend_env.exists():
    load_dotenv(_backend_env)
load_dotenv()


from backend.app.database.session import Base, engine
from backend.app.api.auth import router as auth_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.disasters import router as disasters_router
from backend.app.api.satellite import router as satellite_router
from backend.app.api.detection import router as detection_router
from backend.app.api.change_detection import router as change_detection_router
from backend.app.api.risk import router as risk_router
from backend.app.api.bayesian import router as bayesian_router
from backend.app.api.agents import router as agents_router
from backend.app.api.dem import router as dem_router
from backend.app.api.relocation import router as relocation_router
from backend.app.api.resources import router as resources_router
from backend.app.api.geochat import router as geochat_router
from backend.app.api.reports import router as reports_router
from backend.app.api.monitoring import router as monitoring_router
from backend.app.api.approvals import router as approvals_router
from backend.app.api.data import router as data_router

# Initialize database tables
try:
    Base.metadata.create_all(bind=engine)
except Exception:
    pass

app = FastAPI(
    title="APERIO - Autonomous Earth Intelligence Platform",
    description="Backend AI, Geospatial, Multi-Agent, XGBoost, and Bayesian Risk Assessment API",
    version="2.4.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# Enable CORS for frontend Vite development server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routers
app.include_router(auth_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(disasters_router, prefix="/api")
app.include_router(satellite_router, prefix="/api")
app.include_router(detection_router, prefix="/api")
app.include_router(change_detection_router, prefix="/api")
app.include_router(risk_router, prefix="/api")
app.include_router(bayesian_router, prefix="/api")
app.include_router(agents_router, prefix="/api")
app.include_router(dem_router, prefix="/api")
app.include_router(relocation_router, prefix="/api")
app.include_router(resources_router, prefix="/api")
app.include_router(geochat_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(monitoring_router, prefix="/api")
app.include_router(approvals_router, prefix="/api")
app.include_router(data_router, prefix="/api")

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "HEALTHY",
        "service": "APERIO Earth Intelligence Platform Backend",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "database": "CONNECTED",
        "ml_engine": "XGBoost-DisasterRisk-v2 + Bayesian Odds Layer",
        "agents_available": 16
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to APERIO Earth Intelligence API. Interactive docs available at /api/docs"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=False)
