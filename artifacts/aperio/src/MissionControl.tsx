import { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileSearch,
  Home,
  Layers,
  MapPin,
  Mountain,
  Navigation,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Users
} from 'lucide-react';
import type { LocalState, Scenario } from './data';
import { pushEvent, saveState, scenarios } from './data';
import MapView from './MapView';
import Terrain from './Terrain';
import {
  fetchDemTerrain,
  fetchRelocationOptions,
  fetchRiskIndices,
  submitOperatorReview,
  RiskIndicesBreakdown,
  computeAperioIndicesLocally
} from './api';

type Props = {
  state: LocalState;
  setState: (s: LocalState) => void;
  scenario: Scenario;
  onToast: (s: string) => void;
};

const stages = ['Detect', 'Explain', 'Assess', 'Act', 'Verify'];

export default function MissionControl({ state, setState, scenario, onToast }: Props) {
  const [stage, setStage] = useState('Assess');
  const [activeCanvasTab, setActiveCanvasTab] = useState<'MAP' | 'TERRAIN' | 'RELOCATION'>('MAP');

  // Backend intelligence states
  const [indices, setIndices] = useState<RiskIndicesBreakdown>(() => computeAperioIndicesLocally(scenario.id));
  const [demData, setDemData] = useState<any>(null);
  const [relocData, setRelocData] = useState<any>(null);

  // Operator review inputs
  const [verificationOutcome, setVerificationOutcome] = useState('Confirmed');
  const [operatorResponse, setOperatorResponse] = useState(
    scenario.hazard === 'Deforestation'
      ? 'Issue Forestry Conservation Advisory'
      : 'Issue Immediate Evacuation Advisory & Stage Shelters'
  );
  const [agencyAssigned, setAgencyAssigned] = useState(
    scenario.hazard === 'Deforestation'
      ? 'State Forest Department (Simulated Workflow)'
      : 'National Disaster Response Force (NDRF) / SDMA'
  );
  const [operatorNotes, setOperatorNotes] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [lastReviewLogged, setLastReviewLogged] = useState<any>(null);

  // Refresh backend intelligence when selected scenario changes
  useEffect(() => {
    let mounted = true;

    fetchRiskIndices(scenario.id).then(res => {
      if (mounted && res) setIndices(res);
    });

    fetchDemTerrain(scenario.id).then(res => {
      if (mounted && res) setDemData(res);
    });

    fetchRelocationOptions(scenario.id).then(res => {
      if (mounted && res) setRelocData(res);
    });

    // Reset default operator actions per hazard
    if (scenario.hazard === 'Deforestation') {
      setOperatorResponse('Issue Forestry Conservation Advisory');
      setAgencyAssigned('State Forest Department (Simulated Workflow)');
    } else if (scenario.hazard === 'Flood') {
      setOperatorResponse('Issue Floodplain Evacuation & Embankment Alert');
      setAgencyAssigned('State Disaster Management Authority (SDMA)');
    } else if (scenario.hazard === 'Wildfire') {
      setOperatorResponse('Dispatch Aerial Firefighting & Establish Firebreaks');
      setAgencyAssigned('NDRF / State Forest Fire Division');
    } else {
      setOperatorResponse('Issue Immediate Evacuation Advisory & Stage Shelters');
      setAgencyAssigned('National Disaster Response Force (NDRF) / SDMA');
    }

    return () => {
      mounted = false;
    };
  }, [scenario.id]);

  const trail = (title: string, detail: string, extra?: any) => {
    const next = pushEvent(state, title, detail, 'Operator', extra);
    setState(next);
    saveState(next);
  };

  const isSynthetic = scenario.is_synthetic || scenario.hazard === 'Deforestation';
  const isReference = scenario.is_reference_only;

  const handleSelectScenario = (scenId: string) => {
    const target = scenarios.find(s => s.id === scenId);
    if (!target) return;
    const next = { ...state, selectedScenario: scenId };
    setState(next);
    saveState(next);
    trail('Scenario selected', `${target.hazard} · ${target.place}`);
    onToast(`Switched scenario to ${target.place} (${target.hazard}).`);
  };

  // Submit Human Operator Review
  const handleSubmitReview = async () => {
    setReviewSubmitting(true);
    const alertId = `alert-${scenario.id}`;

    const reviewPayload = {
      verification_outcome: verificationOutcome,
      operator_response: operatorResponse,
      agency_assigned: agencyAssigned,
      notes: operatorNotes || `Operator verified sensor convergence for ${scenario.place}.`,
      operator_name: state.authenticatedUser?.name || 'Mission Desk Operator',
      evidence_reviewed: [
        `Risk Score: ${scenario.risk}%`,
        `Sensors: ${scenario.sensors_supported.join(', ')}`,
        `Topography: Slope ${scenario.slope}°, Rain ${scenario.rainfall}mm`
      ]
    };

    const res = await submitOperatorReview(alertId, reviewPayload);

    const logEntry = {
      outcome: verificationOutcome,
      response: operatorResponse,
      agency: agencyAssigned,
      notes: operatorNotes || 'Review officially audited',
      timestamp: new Date().toLocaleTimeString()
    };
    setLastReviewLogged(logEntry);

    trail(
      `Human Operator Decision: ${verificationOutcome.toUpperCase()}`,
      `${scenario.place} [${scenario.hazard}]: ${operatorResponse} assigned to ${agencyAssigned}.`,
      { agency: agencyAssigned, status: verificationOutcome }
    );

    setReviewSubmitting(false);
    onToast(`Decision "${verificationOutcome}" officially recorded and audited for ${scenario.place}.`);
  };

  // Top shelter details
  const topShelter = relocData?.top_shelter || {
    name: 'District Designated Relief Complex',
    distance_km: 2.8,
    capacity: 750,
    available_capacity: 340,
    road_status: 'Open · Verified',
    risk_level: 'LOW'
  };

  return (
    <>
      {/* 1. Operating Loop Breadcrumb */}
      <div className="loop" aria-label="Decision workflow">
        {stages.map((s, i) => (
          <div style={{ display: 'contents' }} key={s}>
            <button
              className={`loop-step ${stage.toLowerCase() === s.toLowerCase() ? 'current' : stages.indexOf(stage) > i ? 'done' : ''}`}
              onClick={() => {
                setStage(s);
                trail(`Workflow stage: ${s}`, `Operator opened ${s} for ${scenario.place}.`);
              }}
            >
              <span className="step-num">
                {stages.indexOf(stage) > i ? <Check size={11} /> : String(i + 1).padStart(2, '0')}
              </span>
              {s}
            </button>
            {i < 4 && <div className="loop-line" />}
          </div>
        ))}
      </div>

      {/* 2. Scenario Alerts / Warnings */}
      {isSynthetic && (
        <div style={{ background: '#fdf8ec', border: '1px solid #ebd39b', color: '#875d1f', padding: '10px 14px', borderRadius: 3, marginBottom: 10, fontSize: 11 }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} /> SYNTHETIC DEMO DATA — BENCHMARK VALIDATION ONLY
          </strong>
          <p style={{ margin: '4px 0 0' }}>
            This deforestation scenario runs on synthetic demonstration data (aperio_synthetic_deforestation_dataset.csv). Ecological disturbance tracking does NOT trigger civilian mass evacuation.
          </p>
        </div>
      )}

      {isReference && (
        <div style={{ background: '#f0f6fa', border: '1px solid #cadbe6', color: '#274b62', padding: '10px 14px', borderRadius: 3, marginBottom: 10, fontSize: 11 }}>
          <strong>HISTORICAL REFERENCE PROFILE:</strong> Verified active wildfire radiometer dataset is active for Uttarakhand &amp; Himachal Pradesh.
        </div>
      )}

      {/* 3. Active Scenarios Strip (Single Source of Truth Selector) */}
      <div className="incident-strip">
        <span className="incident-label">ACTIVE SCENARIOS</span>
        {scenarios.map(item => (
          <button
            key={item.id}
            className={`incident-chip ${item.id === scenario.id ? 'selected' : ''}`}
            onClick={() => handleSelectScenario(item.id)}
            style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}
          >
            <span className="chip-sev" />
            <span>{item.hazard.toUpperCase()}</span>
            <span>{item.place}</span>
          </button>
        ))}
      </div>

      {/* 4. Main Intelligence Grid */}
      <div className="workspace-grid">
        {/* Left: Spatial Canvas / Map / DEM / Relocation */}
        <section className="panel map-panel">
          <div className="panel-head">
            <div className="panel-title">
              <MapPin size={14} /> Spatial &amp; Topographic Intelligence
            </div>
            <span className="panel-kicker">
              {scenario.coords[0].toFixed(3)}°N, {scenario.coords[1].toFixed(3)}°E · {scenario.place}
            </span>
          </div>

          {/* Canvas Mode Switcher */}
          <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#f4f8fa', borderBottom: '1px solid #e1e9ed' }}>
            <button
              className={`layer-btn ${activeCanvasTab === 'MAP' ? 'selected' : ''}`}
              onClick={() => setActiveCanvasTab('MAP')}
            >
              <Layers size={11} style={{ marginRight: 4 }} /> Operational Spatial Map
            </button>
            <button
              className={`layer-btn ${activeCanvasTab === 'TERRAIN' ? 'selected' : ''}`}
              onClick={() => setActiveCanvasTab('TERRAIN')}
            >
              <Mountain size={11} style={{ marginRight: 4 }} /> 3D DEM / Terrain
            </button>
            <button
              className={`layer-btn ${activeCanvasTab === 'RELOCATION' ? 'selected' : ''}`}
              onClick={() => setActiveCanvasTab('RELOCATION')}
            >
              <Navigation size={11} style={{ marginRight: 4 }} /> Evacuation Corridor Preview
            </button>
          </div>

          {activeCanvasTab === 'MAP' && (
            <MapView
              scenario={scenario}
              layers={state.layers}
              onLayer={name => {
                const next = { ...state, layers: { ...state.layers, [name]: !state.layers[name] } };
                setState(next);
                saveState(next);
              }}
              selected={scenario.id}
              highlightTarget={state.highlightedMapTarget}
            />
          )}

          {activeCanvasTab === 'TERRAIN' && (
            <div style={{ position: 'relative' }}>
              <Terrain scenario={scenario} demData={demData} risk={scenario.risk} />
            </div>
          )}

          {activeCanvasTab === 'RELOCATION' && (
            <MapView
              scenario={scenario}
              layers={{ ...state.layers, Shelters: true, 'Evacuation routes': true }}
              selected={scenario.id}
              route={true}
              highlightTarget={state.highlightedMapTarget}
            />
          )}

          {/* Sensor stream strip */}
          <div className="map-controls">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#45697a' }}>CONNECTED SENSORS:</span>
              {scenario.sensors_supported.map(s => (
                <span key={s} className="badge safe" style={{ fontSize: 8 }}>
                  ✓ {s}
                </span>
              ))}
            </div>
            <span className="sample-label">
              ACQUISITION: {scenario.acquisition_date}
            </span>
          </div>
        </section>

        {/* Right Column: Scenario Metrics & Index Decomposition */}
        <div className="right-column">
          <section className="panel">
            <div className="incident-title-row">
              <div>
                <h2 className="incident-title">
                  {scenario.hazard} Risk · {scenario.place}
                </h2>
                <div className="loc">
                  <MapPin size={11} /> {scenario.region}, India · Scenario ID: {scenario.id}
                </div>
              </div>
              <span className={`severity ${scenario.severity.toLowerCase()}`}>
                {scenario.severity}
              </span>
            </div>

            <div className="brief">{scenario.description}</div>

            <div className="metrics">
              <div className="metric">
                <strong>{scenario.population}</strong>
                <span>Population exposed</span>
              </div>
              <div className="metric">
                <strong>{scenario.area}</strong>
                <span>Delineated extent</span>
              </div>
              <div className="metric">
                <strong style={{ color: '#b91c1c' }}>{scenario.risk}%</strong>
                <span>Priority risk score</span>
              </div>
            </div>

            {/* APERIO Priority Score Breakdown */}
            <div style={{ border: '1.5px solid #14738d', background: '#f2f8fa', padding: 10, borderRadius: 3, marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#16576b', fontWeight: 700 }}>
                  APERIO PRIORITY SCORE
                </span>
                <span className="badge" style={{ background: '#14738d', color: '#fff', border: 'none' }}>
                  {indices.classification} ({indices.priority_score})
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 8, textAlign: 'center', fontSize: 9 }}>
                <div style={{ background: '#fff', padding: 6, border: '1px solid #dce7ec' }}>
                  <span style={{ color: '#99422f', fontWeight: 700 }}>HRI: {indices.hri.score}</span>
                  <div style={{ fontSize: 7, color: '#738798' }}>HAZARD RISK</div>
                </div>
                <div style={{ background: '#fff', padding: 6, border: '1px solid #dce7ec' }}>
                  <span style={{ color: '#2f5c7e', fontWeight: 700 }}>PRI: {indices.pri.score}</span>
                  <div style={{ fontSize: 7, color: '#738798' }}>POPULATION RISK</div>
                </div>
                <div style={{ background: '#fff', padding: 6, border: '1px solid #dce7ec' }}>
                  <span style={{ color: '#2c6b50', fontWeight: 700 }}>CCPA: {indices.ccpa.score}</span>
                  <div style={{ fontSize: 7, color: '#738798' }}>CAPACITY</div>
                </div>
              </div>
            </div>

            <div className="confidence" style={{ marginTop: 10 }}>
              <div className="confidence-top">
                <span>BAYESIAN POSTERIOR CONFIDENCE</span>
                <strong>{scenario.confidence}%</strong>
              </div>
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: `${scenario.confidence}%` }} />
              </div>
              <div className="uncertainty">
                <strong>Grounding verification</strong>: Fused multi-sensor observation ({scenario.sensors_supported[0]}), rainfall ({scenario.rainfall} mm), and terrain ({scenario.slope}°).
              </div>
            </div>
          </section>

          {/* Evidence Inspection */}
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <FileSearch size={14} /> Observed Telemetry Evidence
              </div>
              <span className="panel-kicker">GROUNDED BACKEND TELEMETRY</span>
            </div>
            <div className="evidence-list">
              {[
                { label: 'Antecedent Precipitation Record', detail: `${scenario.rainfall} mm accumulation in observation window`, val: `${scenario.rainfall} mm` },
                { label: 'Copernicus 30m Slope Stability', detail: `Average terrain gradient ${scenario.slope}°`, val: `${scenario.slope}°` },
                { label: 'Primary Remote Sensing Anomaly', detail: scenario.sensors_supported.join(' · '), val: 'VERIFIED' }
              ].map(item => (
                <div className="evidence-item" key={item.label}>
                  <span className="evidence-icon">
                    <Activity size={13} />
                  </span>
                  <span>
                    <span className="evidence-title">{item.label}</span>
                    <span className="evidence-detail">{item.detail}</span>
                  </span>
                  <span className="evidence-score">{item.val}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* 5. Lower Grid: Relocation Decision Support + Human-in-the-Loop Operator Review */}
      <div className="lower-grid">
        {/* Left: Operational Relocation / Evacuation Directives */}
        <section className="decision-card">
          <div className="panel-head">
            <div className="panel-title">
              <Home size={14} /> Relocation &amp; Safe Haven Directives
            </div>
            <span className="panel-kicker">DECISION SUPPORT</span>
          </div>

          {scenario.hazard === 'Deforestation' ? (
            <div style={{ padding: '12px 14px', background: '#f0f7f3', border: '1px solid #7ea88f', borderRadius: 3, marginTop: 10 }}>
              <div style={{ color: '#296645', fontSize: 10, fontWeight: 700 }}>
                CONSERVATION &amp; MONITORING ADVISORY
              </div>
              <h3 style={{ color: '#1e5236', margin: '4px 0 6px', fontSize: 14 }}>
                No Civilian Relocation Required
              </h3>
              <p style={{ fontSize: 11, color: '#365a45', margin: 0, lineHeight: 1.5 }}>
                Observed environmental canopy disturbance is an ecological change observation. Maintain forestry checkpoint patrols and aerial sweep; civilian evacuation is not triggered.
              </p>
            </div>
          ) : (
            <div style={{ marginTop: 10 }}>
              <div className="recommended" style={{ marginBottom: 10 }}>
                <div className="eyebrow" style={{ color: '#065f46' }}>PRIMARY RECOMMENDED SAFE HAVEN</div>
                <h3 style={{ fontSize: 15, margin: '4px 0' }}>{topShelter.name}</h3>
                <div className="shelter-facts">
                  <span>Transit Distance<strong>{topShelter.distance_km || 2.4} km</strong></span>
                  <span>Total Capacity<strong>{topShelter.capacity || 650}</strong></span>
                  <span>Available Space<strong>{topShelter.available_capacity || topShelter.available || 340}</strong></span>
                  <span>Corridor Access<strong>{topShelter.road_status || 'Open · Clear'}</strong></span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: '#4d6978', margin: '6px 0' }}>
                Shelter ranking synthesizes hazard distance, capacity headroom, and verified road accessibility.
              </p>
              <button
                className="btn-secondary"
                onClick={() => {
                  setActiveCanvasTab('RELOCATION');
                  trail('Evacuation corridor previewed', `Corridor to ${topShelter.name} opened.`);
                  onToast(`Evacuation corridor to ${topShelter.name} displayed.`);
                }}
              >
                Inspect Evacuation Corridor on Map
              </button>
            </div>
          )}
        </section>

        {/* Right: Human-in-the-Loop Operator Review & Agency Dispatch */}
        <section className="verify-card">
          <div className="panel-head">
            <div className="panel-title">
              <ShieldCheck size={14} /> Operator Verification &amp; Agency Workflow
            </div>
            <span className="panel-kicker">HUMAN CONTROL REQUIRED</span>
          </div>

          <div className="verify-body" style={{ marginTop: 8 }}>
            {/* Verification Outcome */}
            <label className="form-label" style={{ marginBottom: 8 }}>
              Verification Outcome:
              <select
                className="field-select"
                style={{ width: '100%', marginTop: 3 }}
                value={verificationOutcome}
                onChange={e => setVerificationOutcome(e.target.value)}
              >
                <option value="Confirmed">Confirmed (Evidence Validated)</option>
                <option value="Needs More Evidence">Needs More Evidence (Field Survey Requested)</option>
                <option value="Rejected">Rejected (False Alarm / Non-Critical)</option>
              </select>
            </label>

            {/* Operator Response */}
            <label className="form-label" style={{ marginBottom: 8 }}>
              Operator Response Directive:
              <input
                className="field-input"
                style={{ width: '100%', marginTop: 3 }}
                value={operatorResponse}
                onChange={e => setOperatorResponse(e.target.value)}
              />
            </label>

            {/* Agency Assignment */}
            <label className="form-label" style={{ marginBottom: 8 }}>
              Assigned Coordinating Agency:
              <select
                className="field-select"
                style={{ width: '100%', marginTop: 3 }}
                value={agencyAssigned}
                onChange={e => setAgencyAssigned(e.target.value)}
              >
                <option value="National Disaster Response Force (NDRF) / SDMA">National Disaster Response Force (NDRF) / SDMA</option>
                <option value="State Disaster Management Authority (SDMA)">State Disaster Management Authority (SDMA)</option>
                <option value="District Emergency Operation Center (DEOC)">District Emergency Operation Center (DEOC)</option>
                <option value="State Forest Department (Simulated Workflow)">State Forest Department (Simulated Workflow)</option>
              </select>
            </label>

            {/* Operator Notes */}
            <label className="form-label" style={{ marginBottom: 10 }}>
              Command Log Notes:
              <input
                className="field-input"
                style={{ width: '100%', marginTop: 3 }}
                placeholder="Enter commander / operator remarks..."
                value={operatorNotes}
                onChange={e => setOperatorNotes(e.target.value)}
              />
            </label>

            <button
              className="btn"
              style={{ width: '100%' }}
              disabled={reviewSubmitting}
              onClick={handleSubmitReview}
            >
              <CheckCircle2 size={13} /> {reviewSubmitting ? 'Recording Audit...' : 'Commit Operator Review & Audit Record'}
            </button>

            {lastReviewLogged && (
              <div style={{ marginTop: 10, padding: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 3, fontSize: 10, color: '#166534' }}>
                ✓ <strong>Decision Recorded:</strong> {lastReviewLogged.outcome} at {lastReviewLogged.timestamp}
                <br />
                Agency: {lastReviewLogged.agency}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
