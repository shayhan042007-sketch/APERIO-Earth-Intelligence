import json
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    role = Column(String, default="operator")  # operator, supervisor, admin
    created_at = Column(DateTime, default=datetime.utcnow)

class Region(Base):
    __tablename__ = "regions"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    state = Column(String, nullable=False)
    country = Column(String, default="India")
    center_lat = Column(Float, nullable=False)
    center_lon = Column(Float, nullable=False)
    elevation_mean = Column(Float, default=0.0)
    slope_mean = Column(Float, default=0.0)
    population = Column(Integer, default=0)
    geometry_geojson = Column(Text, nullable=True)  # PostGIS geometry compatible GeoJSON
    created_at = Column(DateTime, default=datetime.utcnow)

class DisasterEvent(Base):
    __tablename__ = "disaster_events"
    id = Column(String, primary_key=True)
    hazard = Column(String, nullable=False)  # Landslide, Flood, Wildfire, Deforestation, Drought, Urban
    place = Column(String, nullable=False)
    region_id = Column(String, ForeignKey("regions.id"), nullable=True)
    severity = Column(String, default="MODERATE")  # CRITICAL, HIGH, MODERATE, WATCH
    risk = Column(Float, default=50.0)
    confidence = Column(Float, default=85.0)
    area_km2 = Column(Float, default=0.0)
    population_exposed = Column(Integer, default=0)
    rainfall_mm = Column(Float, default=0.0)
    slope_deg = Column(Float, default=0.0)
    vegetation_loss_pct = Column(Float, default=0.0)
    description = Column(Text, default="")
    image_url = Column(String, default="/scene-landslide.jpg")
    lat = Column(Float, default=0.0)
    lon = Column(Float, default=0.0)
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)

class SatelliteObservation(Base):
    __tablename__ = "satellite_observations"
    id = Column(String, primary_key=True)
    disaster_event_id = Column(String, ForeignKey("disaster_events.id"), nullable=True)
    scene_id = Column(String, nullable=False)
    sensor = Column(String, nullable=False)  # Sentinel-1, Sentinel-2, Landsat-8
    acquisition_date = Column(DateTime, default=datetime.utcnow)
    cloud_percentage = Column(Float, default=0.0)
    usable_percentage = Column(Float, default=100.0)
    quality = Column(String, default="GOOD")  # GOOD, DEGRADED, UNUSABLE
    resolution_m = Column(Float, default=10.0)
    bands_available = Column(JSON, default=list)
    file_path = Column(String, nullable=True)
    source_type = Column(String, default="DATASET")  # DATASET, LIVE, SIMULATION
    bounds_geojson = Column(Text, nullable=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

class ChangeDetection(Base):
    __tablename__ = "change_detections"
    id = Column(String, primary_key=True)
    disaster_event_id = Column(String, ForeignKey("disaster_events.id"), nullable=True)
    before_scene_id = Column(String, nullable=False)
    after_scene_id = Column(String, nullable=False)
    sensor_type = Column(String, default="SAR")  # SAR, Optical, Multispectral
    change_percentage = Column(Float, default=0.0)
    changed_area_km2 = Column(Float, default=0.0)
    change_type = Column(String, default="Surface Instability")
    evidence_geojson = Column(Text, nullable=True)
    confidence = Column(Float, default=0.90)
    created_at = Column(DateTime, default=datetime.utcnow)

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    id = Column(String, primary_key=True)
    disaster_event_id = Column(String, ForeignKey("disaster_events.id"), nullable=True)
    model_name = Column(String, default="XGBoost-DisasterRisk")
    risk_probability = Column(Float, nullable=False)
    calibrated_probability = Column(Float, nullable=False)
    severity = Column(String, default="HIGH")
    confidence = Column(Float, default=0.90)
    feature_importance = Column(JSON, default=dict)
    features_used = Column(JSON, default=dict)
    calibration_method = Column(String, default="platt_scaling")
    source_status = Column(String, default="MODEL_OUTPUT")
    created_at = Column(DateTime, default=datetime.utcnow)

class RiskUpdate(Base):
    __tablename__ = "risk_updates"
    id = Column(String, primary_key=True)
    risk_assessment_id = Column(String, ForeignKey("risk_assessments.id"), nullable=True)
    prior_probability = Column(Float, nullable=False)
    evidence_type = Column(String, nullable=False)  # sar_anomaly, rainfall_saturation, terrain_instability
    likelihood_ratio = Column(Float, nullable=False)
    posterior_probability = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, default="")

class AgentExecution(Base):
    __tablename__ = "agent_executions"
    id = Column(String, primary_key=True)
    agent_name = Column(String, nullable=False)
    disaster_event_id = Column(String, ForeignKey("disaster_events.id"), nullable=True)
    status = Column(String, default="COMPLETED")  # PENDING, RUNNING, COMPLETED, FAILED, NEEDS_REVIEW
    confidence = Column(Float, default=0.90)
    execution_time_ms = Column(Float, default=0.0)
    input_sources = Column(JSON, default=list)
    output_summary = Column(JSON, default=dict)
    warnings = Column(JSON, default=list)
    loop_stage = Column(String, default="PLAN")  # PLAN, ACT, VERIFY, ESCALATE
    created_at = Column(DateTime, default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(String, primary_key=True)
    disaster_event_id = Column(String, ForeignKey("disaster_events.id"), nullable=True)
    priority_rank = Column(Integer, default=1)
    hazard = Column(String, nullable=False)
    place = Column(String, nullable=False)
    region = Column(String, nullable=False)
    risk_score = Column(Float, nullable=False)
    severity = Column(String, default="HIGH")
    confidence = Column(Float, default=0.90)
    population_exposed = Column(Integer, default=0)
    time_sensitivity = Column(String, default="Immediate review")
    status = Column(String, default="PENDING_REVIEW")  # PENDING_REVIEW, APPROVED, REJECTED
    evidence_pills = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

class Shelter(Base):
    __tablename__ = "shelters"
    id = Column(String, primary_key=True)
    region_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    capacity = Column(Integer, default=500)
    current_occupancy = Column(Integer, default=0)
    road_status = Column(String, default="Open")
    hazard_risk = Column(String, default="LOW")
    distance_km = Column(Float, default=2.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Hospital(Base):
    __tablename__ = "hospitals"
    id = Column(String, primary_key=True)
    region_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    beds_total = Column(Integer, default=100)
    beds_available = Column(Integer, default=40)
    ambulances = Column(Integer, default=5)
    phone = Column(String, default="+91-112")
    created_at = Column(DateTime, default=datetime.utcnow)

class Resource(Base):
    __tablename__ = "resources"
    id = Column(String, primary_key=True)
    region_id = Column(String, nullable=True)
    name = Column(String, nullable=False)  # Shelter capacity, Ambulances, Food meals, etc.
    available_units = Column(Integer, default=0)
    max_capacity = Column(Integer, default=100)
    unit_label = Column(String, default="units")
    threshold_pct = Column(Float, default=0.80)
    updated_at = Column(DateTime, default=datetime.utcnow)

class EvacuationRoute(Base):
    __tablename__ = "evacuation_routes"
    id = Column(String, primary_key=True)
    disaster_event_id = Column(String, ForeignKey("disaster_events.id"), nullable=True)
    origin_name = Column(String, nullable=False)
    destination_shelter_id = Column(String, ForeignKey("shelters.id"), nullable=True)
    polyline_geojson = Column(Text, nullable=False)
    distance_km = Column(Float, default=0.0)
    est_travel_vehicle_min = Column(Integer, default=10)
    est_travel_walk_min = Column(Integer, default=30)
    status = Column(String, default="Open")
    created_at = Column(DateTime, default=datetime.utcnow)

class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(String, primary_key=True)
    disaster_event_id = Column(String, ForeignKey("disaster_events.id"), nullable=True)
    title = Column(String, nullable=False)
    recommended_action = Column(Text, nullable=False)
    target_zone = Column(String, nullable=False)
    score = Column(Float, default=0.92)
    decision_type = Column(String, default="DECISION SUPPORT")
    status = Column(String, default="AWAITING_OPERATOR")
    reasons = Column(JSON, default=list)
    alternatives = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

class HumanApproval(Base):
    __tablename__ = "human_approvals"
    id = Column(String, primary_key=True)
    alert_id = Column(String, ForeignKey("alerts.id"), nullable=True)
    recommendation_id = Column(String, ForeignKey("recommendations.id"), nullable=True)
    operator_name = Column(String, default="Operator")
    decision = Column(String, nullable=False)  # APPROVED, REJECTED, REQUEST_MORE_EVIDENCE
    notes = Column(Text, default="")
    model_confidence = Column(Float, default=0.90)
    evidence_snapshot = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Report(Base):
    __tablename__ = "reports"
    id = Column(String, primary_key=True)
    disaster_event_id = Column(String, ForeignKey("disaster_events.id"), nullable=True)
    title = Column(String, nullable=False)
    pdf_filename = Column(String, nullable=False)
    content_summary = Column(JSON, default=dict)
    generated_by = Column(String, default="report_generation_agent")
    created_at = Column(DateTime, default=datetime.utcnow)

class MonitoringEvent(Base):
    __tablename__ = "monitoring_events"
    id = Column(String, primary_key=True)
    disaster_event_id = Column(String, ForeignKey("disaster_events.id"), nullable=True)
    step_number = Column(Integer, default=1)
    step_name = Column(String, nullable=False)
    risk_level = Column(Float, default=0.0)
    details = Column(Text, default="")
    timestamp = Column(DateTime, default=datetime.utcnow)
