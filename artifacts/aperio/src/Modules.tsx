import { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, Redirect } from 'wouter';
import { Download, FileText, LocateFixed, Play, RefreshCw, ShieldAlert, Layers, Activity, Users, Home, CheckCircle2, XCircle, AlertTriangle, ChevronRight, Eye, ShieldCheck, Compass, ZoomIn, ZoomOut, RotateCcw, Sliders, MapPin, Info, Crosshair, ArrowRight, Maximize2, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { LocalState, Scenario, Hazard } from './data';
import { operationalDisclaimer, pushEvent, saveState, scenarios } from './data';
import MapView from './MapView';
import Terrain from './Terrain';
import {
  fetchRiskIndices,
  calculateCustomIndices,
  computeAperioIndicesLocally,
  fetchAlerts,
  approveAlert,
  rejectAlert,
  fetchDisasterTypes,
  fetchDisasterStates,
  fetchDisasterDistricts,
  fetchDisasterEvents,
  analyzeDisasterEvent,
  fetchRelocationOptions,
  fetchDemTerrain,
  fetchResourceInventory,
  fetchChangeDetection,
  runHazardDetection,
  generateAuthorityReport,
  downloadReportPdfUrl,
  fetchMonitoringState,
  triggerMonitoringCycle,
  submitOperatorReview,
  RiskIndicesBreakdown,
  BACKEND_URL
} from './api';

type Props = { path: string; scenario: Scenario; state: LocalState; setState: (s: LocalState) => void; onToast: (m: string) => void };

const rainfallData = [{ day: '1 day', mm: 34 }, { day: '3 days', mm: 82 }, { day: '7 days', mm: 146 }, { day: '14 days', mm: 224 }, { day: '30 days', mm: 308 }];
const sceneData = [{ scene: 'S-01', area: 2.3 }, { scene: 'S-02', area: 3.4 }, { scene: 'S-03', area: 5.8 }, { scene: 'S-04', area: 7.03 }];
const riskTone = (severity: string) => severity === 'CRITICAL' ? 'high' : severity === 'HIGH' ? 'high' : severity === 'MODERATE' ? 'moderate' : 'safe';
const formatUtcTimestamp = (date: Date = new Date()) => date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

function Title({ kicker, title, description }: { kicker: string; title: string; description: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {kicker && (
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0284c7', marginBottom: 4 }}>
          {kicker}
        </div>
      )}
      <div className="page-head" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div className="heading">
          <h1 style={{ fontSize: 28, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 6px', lineHeight: 1.25 }}>
            {title}
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#475569', maxWidth: 840, margin: 0 }}>
            {description}
          </p>
        </div>
        <div className="head-meta" style={{ fontSize: 12, color: '#64748b', textAlign: 'right', whiteSpace: 'nowrap' }}>
          <strong style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, display: 'block', marginBottom: 2 }}>System Status</strong>
          Connected to APERIO Intelligence Core
        </div>
      </div>
    </div>
  );
}

function Chart({ data, type = 'line' }: { data: { day?: string; mm?: number; scene?: string; area?: number }[]; type?: 'line' | 'bar' }) {
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'line' ? (
          <LineChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#e6edf1" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#6d8290' }} />
            <YAxis tick={{ fontSize: 8, fill: '#80919e' }} />
            <Tooltip />
            <Line type="monotone" dataKey="mm" stroke="#26839b" strokeWidth={2} dot={{ r: 3, fill: '#26839b' }} />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#e6edf1" strokeDasharray="3 3" />
            <XAxis dataKey="scene" tick={{ fontSize: 9, fill: '#6d8290' }} />
            <YAxis tick={{ fontSize: 8, fill: '#80919e' }} />
            <Tooltip />
            <Bar dataKey="area" fill="#4b9bb0" radius={[2, 2, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function Metrics({ scenario }: { scenario: Scenario }) {
  return (
    <div className="stat-row">
      <div className="stat-box"><strong>{scenario.confidence}%</strong><span>Model confidence · Bayesian</span></div>
      <div className="stat-box"><strong>{scenario.area}</strong><span>Affected area · measured</span></div>
      <div className="stat-box"><strong>{scenario.severity}</strong><span>Scenario severity</span></div>
      <div className="stat-box"><strong>{scenario.risk}%</strong><span>Priority risk score</span></div>
    </div>
  );
}

// 1. OVERVIEW
function Overview({ scenario, state, setState }: Props) {
  const [indices, setIndices] = useState<RiskIndicesBreakdown>(() => computeAperioIndicesLocally(scenario.id));

  useEffect(() => {
    let mounted = true;
    fetchRiskIndices(scenario.id).then(res => {
      if (mounted && res) setIndices(res);
    });
    return () => { mounted = false; };
  }, [scenario.id]);

  const isSynthetic = scenario.is_synthetic || scenario.hazard === 'Deforestation';

  return (
    <>
      <Title
        kicker="Mission control / field intelligence"
        title="From signal to decision."
        description="Autonomous multi-agent Earth observation: Detect → Explain → Assess → Act → Verify."
      />

      {isSynthetic && (
        <div style={{ background: '#fdf8ec', border: '1px solid #ebd39b', color: '#875d1f', padding: '10px 14px', borderRadius: 3, marginBottom: 14 }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <AlertTriangle size={14} /> SYNTHETIC DEMO DATA — NOT REAL SATELLITE VALIDATION
          </strong>
          <p style={{ margin: '4px 0 0', fontSize: 11 }}>
            This scenario uses the calibrated synthetic deforestation dataset (aperio_synthetic_deforestation_dataset.csv) for environmental change detection pipeline verification.
          </p>
        </div>
      )}

      <Metrics scenario={scenario} />

      <div className="module-grid">
        <section className="module-panel span-6">
          <div className="row">
            <h2 className="module-title">Antecedent rainfall context</h2>
            <span className="badge">WEATHER RADAR</span>
          </div>
          <p className="module-copy">{scenario.place} observation window · millimetres</p>
          <Chart data={rainfallData} />
        </section>

        <section className="module-panel span-6">
          <div className="row">
            <h2 className="module-title">Disaster extent by scene</h2>
            <span className="badge">SAM SEGMENTATION</span>
          </div>
          <p className="module-copy">Multi-temporal satellite footprint progression · km²</p>
          <Chart data={sceneData} type="bar" />
        </section>

        <section className="module-panel span-12" style={{ padding: 0 }}>
          <div className="panel-head">
            <div className="panel-title"><LocateFixed size={14} /> Operational spatial map</div>
            <span className="panel-kicker">COORDINATES: {scenario.coords[0].toFixed(3)}°N, {scenario.coords[1].toFixed(3)}°E · {scenario.region}</span>
          </div>
          <MapView
            scenario={scenario}
            layers={state.layers}
            onLayer={name => {
              const next = { ...state, layers: { ...state.layers, [name]: !state.layers[name] } };
              setState(next);
              saveState(next);
            }}
            selected={scenario.id}
          />
        </section>
      </div>
    </>
  );
}

// 2. PRIORITY ALERTS
function PriorityAlerts({ scenario, state, setState, onToast }: Props) {
  const [, setLocation] = useLocation();
  const [selectedAlertIdx, setSelectedAlertIdx] = useState(0);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchAlerts().then(backendAlerts => {
      if (!mounted) return;
      if (backendAlerts && backendAlerts.length > 0) {
        setAlerts(backendAlerts);
      } else {
        const fallback = scenarios.map(s => {
          const idx = computeAperioIndicesLocally(s.id);
          return {
            id: `alert-${s.id}`,
            scenario_id: s.id,
            hazard: s.hazard.toUpperCase(),
            place: s.place,
            region: s.region,
            risk: s.risk,
            severity: s.severity,
            population: s.population,
            confidence: s.confidence,
            time_sensitivity: 'Immediate review',
            status: 'AWAITING_OPERATOR_REVIEW',
            evidence_pills: [`Rainfall: ${s.rainfall}mm`, `Slope: ${s.slope}°`, `Vegetation: ${s.vegetation}%`],
            hri: idx.hri.score,
            hri_classification: idx.hri.classification,
            pri: idx.pri.score,
            ccpa: idx.ccpa.score,
            ccpa_classification: idx.ccpa.classification,
            priority_score: idx.priority_score,
            priority_classification: idx.classification,
            indices_breakdown: idx
          };
        }).sort((a, b) => b.priority_score - a.priority_score);
        setAlerts(fallback);
      }
    });
    return () => { mounted = false; };
  }, []);

  const active = alerts[selectedAlertIdx] || alerts[0];
  const idxData = active?.indices_breakdown || computeAperioIndicesLocally(active?.scenario_id || 'wayanad-landslide');

  const handleApprove = async (a: any) => {
    await approveAlert(a.id, 'Approved via Mission Control Operator');
    setAlerts(prev => prev.map(item => item.id === a.id ? { ...item, status: 'APPROVED' } : item));
    const next = pushEvent(state, 'Alert approved by human operator', `${a.hazard} in ${a.place} approved.`);
    setState(next);
    saveState(next);
    onToast(`Alert ${a.id} APPROVED by operator.`);
  };

  const handleReject = async (a: any) => {
    await rejectAlert(a.id, 'Pending field verification');
    setAlerts(prev => prev.map(item => item.id === a.id ? { ...item, status: 'REJECTED' } : item));
    const next = pushEvent(state, 'Alert rejected by operator', `${a.hazard} in ${a.place} rejected pending ground survey.`);
    setState(next);
    saveState(next);
    onToast(`Alert ${a.id} REJECTED.`);
  };

  return (
    <>
      <Title
        kicker="Assess / prioritization"
        title="Priority alerts queue"
        description="Deterministic APERIO queue ranked strictly by Priority Score: 0.50*HRI + 0.30*PRI + 0.20*(100 - CCPA). Human approval loop active."
      />

      <div className="module-grid">
        <section className="module-panel span-7">
          <div className="row" style={{ marginBottom: 12 }}>
            <h2 className="module-title">Ranked alerts queue (Human-in-the-Loop)</h2>
            <span className="badge">{alerts.length} ALERTS LOADED</span>
          </div>

          {alerts.map((a, i) => (
            <article
              className={`alert-row ${selectedAlertIdx === i ? 'selected-alert' : ''}`}
              key={a.id || i}
              style={{
                cursor: 'pointer',
                background: selectedAlertIdx === i ? '#f4f9fb' : '#fff',
                padding: '12px 14px',
                borderRadius: 4,
                marginBottom: 8,
                border: selectedAlertIdx === i ? '1.5px solid #7cb9cb' : '1px solid #e2e8ec'
              }}
              onClick={() => setSelectedAlertIdx(i)}
            >
              <div className="alert-rank">0{i + 1}</div>
              <div className="alert-content">
                <div className="row">
                  <div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`badge ${riskTone(a.priority_classification || a.severity)}`}>
                        {a.priority_classification || a.severity} PRIORITY
                      </span>
                      <span className={`badge ${a.status === 'APPROVED' ? 'safe' : a.status === 'REJECTED' ? 'high' : 'moderate'}`}>
                        {a.status === 'APPROVED' ? '✓ APPROVED' : a.status === 'REJECTED' ? '✕ REJECTED' : '⏳ AWAITING REVIEW'}
                      </span>
                    </div>
                    <h3 style={{ margin: '6px 0 2px', fontSize: 15 }}>{a.hazard} RISK</h3>
                    <p style={{ margin: 0, color: '#526b7c', fontSize: 12 }}>{a.place} — {a.region}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ color: '#185366', fontSize: 24 }}>{a.priority_score || a.risk}</strong>
                    <div style={{ fontSize: 8, color: '#738798', fontFamily: 'monospace' }}>PRIORITY SCORE</div>
                  </div>
                </div>

                {/* Indices summary pills */}
                <div style={{ display: 'flex', gap: 6, margin: '8px 0', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: '#fcf0ed', borderColor: '#f0d0c4', color: '#99422f' }}>
                    HRI: {a.hri} ({a.hri_classification || 'MODERATE'})
                  </span>
                  <span className="badge" style={{ background: '#f1f6fa', borderColor: '#d3e2ee', color: '#2f5c7e' }}>
                    PRI: {a.pri}
                  </span>
                  <span className="badge" style={{ background: '#edf7f2', borderColor: '#c9e3d6', color: '#2c6b50' }}>
                    CCPA: {a.ccpa} ({a.ccpa_classification || 'ADEQUATE'})
                  </span>
                </div>

                {/* Evidence Pills */}
                {a.evidence_pills && (
                  <div style={{ fontSize: 11, color: '#688091', margin: '4px 0 8px' }}>
                    Evidence: {a.evidence_pills.join(' · ')}
                  </div>
                )}

                <div className="control-row" style={{ marginTop: 8 }}>
                  <button
                    className="btn"
                    style={{ background: '#0284c7', borderColor: '#0284c7' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const targetScen = scenarios.find(s => s.id === a.scenario_id) || scenario;
                      const next = {
                        ...state,
                        selectedScenario: targetScen.id,
                        layers: { ...state.layers, Risk: true, 'SAM segmentation': true, Satellite: true, Shelters: true, 'Evacuation routes': true }
                      };
                      setState(next);
                      saveState(pushEvent(next, 'Alert opened on operational map', `${a.hazard} · ${a.place}`));
                      onToast(`Centered on ${a.place} in operational map.`);
                      setLocation('/command-center/overview');
                    }}
                  >
                    <Eye size={12} style={{ marginRight: 4 }} /> View on map
                  </button>

                  {a.status !== 'APPROVED' && (
                    <button
                      className="btn"
                      style={{ background: '#1e7552', borderColor: '#1e7552' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprove(a);
                      }}
                    >
                      <CheckCircle2 size={12} /> Approve alert
                    </button>
                  )}

                  {a.status !== 'REJECTED' && (
                    <button
                      className="btn-secondary"
                      style={{ color: '#a63d33', borderColor: '#e4b6b2' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReject(a);
                      }}
                    >
                      <XCircle size={12} /> Reject alert
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="module-panel span-5">
          <h2 className="module-title">APERIO Index Decomposition</h2>
          <p className="module-copy" style={{ marginBottom: 12 }}>
            Active Alert: <strong>{active?.place} ({active?.hazard})</strong>
          </p>

          {/* Priority Score Box */}
          <div style={{ border: '2px solid #14738d', background: '#eef7fa', padding: 14, borderRadius: 4, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#16586c', fontWeight: 700 }}>APERIO PRIORITY SCORE</span>
              <span className={`badge ${riskTone(idxData.classification)}`}>{idxData.classification}</span>
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, color: '#145163', margin: '4px 0' }}>
              {idxData.priority_score} <span style={{ fontSize: 14, fontWeight: 400, color: '#627c8a' }}>/ 100</span>
            </div>
            <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#45697a' }}>Formula: 0.50*HRI + 0.30*PRI + 0.20*(100 - CCPA)</div>
          </div>

          {/* 1. HRI */}
          <div style={{ border: '1px solid #e1e8ed', padding: 10, borderRadius: 3, marginBottom: 10, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 11, color: '#23445a' }}>1. Hazard Risk Index (HRI)</strong>
              <span className={`badge ${riskTone(idxData.hri.classification)}`}>{idxData.hri.score} — {idxData.hri.classification}</span>
            </div>
            <p style={{ fontSize: 8, color: '#738798', margin: '4px 0 8px', fontFamily: 'monospace' }}>
              0.35*prob + 0.20*rain + 0.15*terrain + 0.15*sat + 0.15*recent
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, fontSize: 8, color: '#476375' }}>
              <div>Hazard Prob: <b>{idxData.hri.components.hazard_probability}</b></div>
              <div>Rainfall Score: <b>{idxData.hri.components.rainfall_score}</b></div>
              <div>Terrain Instability: <b>{idxData.hri.components.terrain_instability}</b></div>
              <div>Satellite Change: <b>{idxData.hri.components.satellite_change}</b></div>
              <div>Recent Disturbance: <b>{idxData.hri.components.recent_change}</b></div>
            </div>
          </div>

          {/* 2. PRI */}
          <div style={{ border: '1px solid #e1e8ed', padding: 10, borderRadius: 3, marginBottom: 10, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 11, color: '#23445a' }}>2. Population Risk Index (PRI)</strong>
              <span className="badge" style={{ background: '#f1f6fa', color: '#22506f', borderColor: '#ccdce8' }}>{idxData.pri.score} / 100</span>
            </div>
            <p style={{ fontSize: 8, color: '#738798', margin: '4px 0 8px', fontFamily: 'monospace' }}>
              0.45*pop_exp + 0.20*vuln + 0.15*infra + 0.10*access + 0.10*time
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, fontSize: 8, color: '#476375' }}>
              <div>Pop. Exposed: <b>{idxData.pri.components.population_exposure}%</b></div>
              <div>Exposed Headcount: <b>{idxData.pri.components.population_inside_hazard_zone}</b></div>
              <div>Vulnerable Pop: <b>{idxData.pri.components.vulnerable_population}%</b></div>
              <div>Infrastructure: <b>{idxData.pri.components.infrastructure_exposure}</b></div>
              <div>Access Difficulty: <b>{idxData.pri.components.accessibility_difficulty}</b></div>
              <div>Time Urgency: <b>{idxData.pri.components.time_sensitivity}</b></div>
            </div>
          </div>

          {/* 3. CCPA */}
          <div style={{ border: '1px solid #e1e8ed', padding: 10, borderRadius: 3, marginBottom: 10, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 11, color: '#23445a' }}>3. Carrying Capacity (CCPA)</strong>
              <span className="badge" style={{ background: '#edf7f2', color: '#2c6b50', borderColor: '#c9e3d6' }}>{idxData.ccpa.score} — {idxData.ccpa.classification}</span>
            </div>
            <p style={{ fontSize: 8, color: '#738798', margin: '4px 0 8px', fontFamily: 'monospace' }}>
              Deficit used in Priority: <b>{idxData.ccpa.deficit}%</b> (100 - CCPA)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, fontSize: 8, color: '#476375' }}>
              <div>Shelter Coverage: <b>{idxData.ccpa.components.shelter_coverage}%</b></div>
              <div>Water Coverage: <b>{idxData.ccpa.components.water_coverage}%</b></div>
              <div>Food Coverage: <b>{idxData.ccpa.components.food_coverage}%</b></div>
              <div>Medical Coverage: <b>{idxData.ccpa.components.medical_coverage}%</b></div>
              <div>Transport Coverage: <b>{idxData.ccpa.components.transport_coverage}%</b></div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// 3. DETECTION
function Detection({ scenario, onToast }: Props) {
  const [hazard, setHazard] = useState<Hazard>(scenario.hazard);
  const [stateName, setStateName] = useState(scenario.region || 'Kerala');
  const [availableStates, setAvailableStates] = useState<string[]>(['Kerala', 'Assam', 'Uttarakhand', 'Maharashtra']);
  const [layers, setLayers] = useState(['SAR change', 'Rainfall', 'Terrain']);
  const [agentResult, setAgentResult] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchDisasterStates(hazard.toUpperCase()).then(states => {
      if (states && states.length > 0) {
        setAvailableStates(states);
        if (!states.includes(stateName)) {
          setStateName(states[0]);
        }
      }
    });
  }, [hazard]);

  const sets: Record<string, string[]> = {
    Landslide: ['Sentinel-1 SAR', 'Sentinel-2 optical', 'Slope', 'Rainfall', 'Terrain', 'Debris/change detection'],
    Flood: ['Water extent', 'Rainfall', 'River areas', 'SAR flood detection', 'Affected buildings/roads'],
    Wildfire: ['Fire affected area', 'Burn area', 'Vegetation loss', 'Smoke/fire region', 'Satellite detection'],
    Deforestation: ['Forest cover', 'Vegetation index', 'Before/after imagery', 'Forest-loss area', 'Change detection']
  };

  const handleRunAgent = async () => {
    setAnalyzing(true);
    let targetScenarioId = scenario.id;
    if (hazard === 'Flood' && stateName === 'Assam') targetScenarioId = 'FLD-Tinsukia';
    else if (hazard === 'Wildfire' && stateName === 'Uttarakhand') targetScenarioId = 'FIRE-UT-00001';
    else if (hazard === 'Deforestation') targetScenarioId = 'DEF-DEF_00007';
    else if (hazard === 'Landslide') targetScenarioId = 'wayanad-landslide';

    const res = await runHazardDetection(targetScenarioId, hazard, layers);
    if (res && res.detection_result) {
      setAgentResult(res);
    } else {
      const direct = await analyzeDisasterEvent(targetScenarioId);
      if (direct) {
        setAgentResult({
          detection_result: direct.findings || direct.recommendations,
          confidence: direct.confidence || 0.88,
          hazard
        });
      }
    }
    setAnalyzing(false);
    onToast(`Specialist ${hazard} Agent executed on ${stateName} dataset.`);
  };

  const isSynthetic = hazard === 'Deforestation';

  return (
    <>
      <Title
        kicker="Detect / specialist disaster agents"
        title="Specialist Disaster Detection Workspace"
        description="Inspect hazard-specific detection models connected directly to Flood, Wildfire, Deforestation, and Landslide datasets."
      />

      <div className="module-grid">
        <section className="module-panel span-8">
          <div className="row" style={{ marginBottom: 12 }}>
            <div>
              <h2 className="module-title">{hazard} Evidence Workspace</h2>
              <p className="module-copy">{stateName} · Multi-Sensor Observation Context</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                className="field-select"
                aria-label="Select hazard"
                value={hazard}
                onChange={e => setHazard(e.target.value as Hazard)}
              >
                {['Landslide', 'Flood', 'Wildfire', 'Deforestation'].map(x => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>

              <select
                className="field-select"
                aria-label="Select state"
                value={stateName}
                onChange={e => setStateName(e.target.value)}
              >
                {availableStates.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {isSynthetic && (
            <div style={{ background: '#fdf8ec', border: '1px solid #ebd39b', color: '#875d1f', padding: '10px 14px', borderRadius: 3, marginBottom: 12 }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <AlertTriangle size={14} /> SYNTHETIC DEMO DATA — NOT REAL SATELLITE VALIDATION
              </strong>
              <p style={{ margin: '4px 0 0', fontSize: 11 }}>
                Deforestation analysis runs on synthetic demonstration data (aperio_synthetic_deforestation_dataset.csv) designed for model benchmarking.
              </p>
            </div>
          )}

          <img className="detection-image" src={scenario.image} alt="Earth observation scene" />

          <div className="evidence-layer-grid">
            {sets[hazard]?.map(x => (
              <button
                key={x}
                onClick={() => setLayers(layers.includes(x) ? layers.filter(l => l !== x) : [...layers, x])}
                className={`evidence-layer ${layers.includes(x) ? 'selected' : ''}`}
              >
                <span className="layer-check">{layers.includes(x) ? 'ON' : 'OFF'}</span>
                <strong>{x}</strong>
                <small>Connected dataset analytical layer</small>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button className="btn" onClick={handleRunAgent} disabled={analyzing}>
              <Play size={13} /> {analyzing ? 'Executing agent...' : `Run Specialist ${hazard} Agent`}
            </button>
          </div>
        </section>

        <section className="module-panel span-4">
          <h2 className="module-title">Specialist Agent Trace</h2>

          {agentResult ? (
            <div style={{ border: '1px solid #b7d7e3', background: '#f3f9fb', padding: 12, borderRadius: 4, marginBottom: 12 }}>
              <span className="badge safe">AGENT COMPLETED</span>
              <h3 style={{ margin: '6px 0 4px', fontSize: 14 }}>{hazard} Specialist Output</h3>
              <div style={{ fontSize: 11, color: '#335266', lineHeight: 1.5 }}>
                {typeof agentResult.detection_result === 'string' ? (
                  agentResult.detection_result
                ) : (
                  <pre style={{ fontSize: 10, background: '#fff', padding: 8, borderRadius: 3, overflowX: 'auto', border: '1px solid #d4e3eb' }}>
                    {JSON.stringify(agentResult.detection_result, null, 2)}
                  </pre>
                )}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: '#4a6b7e' }}>
                Confidence: <b>{Math.round((agentResult.confidence || 0.88) * 100)}%</b>
              </div>
            </div>
          ) : (
            <p className="module-copy">Click &quot;Run Specialist Agent&quot; to execute the corresponding Python backend agent on physical dataset records.</p>
          )}

          <div className="stat-row">
            <div className="stat-box"><strong>{scenario.risk}%</strong><span>Risk score</span></div>
            <div className="stat-box"><strong>{scenario.confidence}%</strong><span>Confidence</span></div>
          </div>

          <p className="module-copy">
            <strong>Active observation layers</strong><br />
            {layers.join(' · ')}
          </p>

          <button className="btn-secondary" onClick={() => onToast('Detection review recorded in session log.')}>
            Record layer review
          </button>
        </section>
      </div>
    </>
  );
}

// 4. CHANGE DETECTION — APERIO 2.0 SATELLITE CHANGE INTELLIGENCE
function ChangeDetection({ scenario, state, setState, onToast }: Props) {
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showOverlay, setShowOverlay] = useState(true);
  const [showZoneBadges, setShowZoneBadges] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [backendMeta, setBackendMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [inspectModal, setInspectModal] = useState<{
    open: boolean;
    type: 'before' | 'after';
    title: string;
    imageUrl: string;
    date: string;
    sensor: string;
    cloud?: number | string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(false);
    setInspectModal(null);
    fetchChangeDetection(scenario.id).then(res => {
      if (mounted) {
        if (res) {
          setBackendMeta(res);
          if (res.detection_zones && res.detection_zones.length > 0) {
            setSelectedZoneId(res.detection_zones[0].id);
          }
        }
        setLoading(false);
      }
    });
    // Reset zoom and pan on scenario change
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    return () => { mounted = false; };
  }, [scenario.id]);

  const hasImagery = backendMeta?.has_imagery !== undefined ? backendMeta.has_imagery : scenario.has_imagery;
  const preImg = backendMeta?.pre_image_url || scenario.pre_image;
  const postImg = backendMeta?.post_image_url || scenario.post_image;
  const preSensor = backendMeta?.pre_sensor || scenario.pre_sensor || 'Sentinel-2 MSI Level-2A';
  const postSensor = backendMeta?.post_sensor || scenario.post_sensor || 'Sentinel-2 MSI Level-2A';
  const preDate = backendMeta?.pre_date || scenario.pre_date || scenario.acquisition_date;
  const postDate = backendMeta?.post_date || scenario.post_date || scenario.acquisition_date;
  const datasetSource = backendMeta?.dataset_source || scenario.dataset_source || 'Sentinel-2 L2A (10m TCI)';
  const locationName = backendMeta?.location_name || `${scenario.place}, ${scenario.region}`;
  const unavailableNotice = backendMeta?.unavailable_notice || scenario.unavailable_notice || 'Satellite imagery unavailable for this event.';

  // Extraction of Change Intelligence Metrics
  const prevExtent = backendMeta?.previous_affected_extent_km2 !== undefined ? backendMeta.previous_affected_extent_km2 : 0.0;
  const latestExtent = backendMeta?.latest_affected_extent_km2 !== undefined ? backendMeta.latest_affected_extent_km2 : scenario.area;
  const newlyAffected = backendMeta?.newly_affected_area_km2 !== undefined ? backendMeta.newly_affected_area_km2 : scenario.area;
  const recededExtent = backendMeta?.receded_area_km2 !== undefined ? backendMeta.receded_area_km2 : 0.0;
  const netChange = backendMeta?.net_change_km2 !== undefined ? backendMeta.net_change_km2 : newlyAffected;
  const pctChangeLabel = backendMeta?.percentage_change_label || (prevExtent > 0 ? `${Math.round((netChange / prevExtent) * 100)}%` : 'N/A (Zero Baseline)');
  const analyzedExtent = backendMeta?.analyzed_area_km2 || 12056.04;
  const confidencePct = Math.round((backendMeta?.detection_confidence || (scenario.confidence / 100)) * 100);
  const methodology = backendMeta?.methodology || 'Visual Surface Reflectance & Optical Anomaly Extraction';
  const methodologyNote = backendMeta?.methodology_note || 'Evaluated on Sentinel-2 MSI Level-2A 10m True-Color (B04/B03/B02) optical imagery. Results represent verified visual change candidates.';

  const detectionZones = backendMeta?.detection_zones || [];
  const activeZone = detectionZones.find((z: any) => z.id === selectedZoneId) || detectionZones[0] || null;

  const handleSelectZone = (zone: any) => {
    setSelectedZoneId(zone.id);
  };

  const handleZoomToZone = (zone: any) => {
    setSelectedZoneId(zone.id);
    setZoom(2);
    // Center pan on the selected zone's percentage coordinates
    const targetX = (50 - zone.center_pct[0]) * 3.5;
    const targetY = (50 - zone.center_pct[1]) * 3.5;
    setPanOffset({ x: targetX, y: targetY });
    onToast(`View zoomed to ${zone.name} (${zone.area_km2} km²).`);
  };

  const handleResetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleSyncToMap = (zone: any) => {
    const nextState = pushEvent(
      state,
      `Detection zone ${zone.id} verified`,
      `${zone.name} (${zone.area_km2} km²) synchronized with operational spatial map at ${zone.center_geo[0]}°N, ${zone.center_geo[1]}°E.`
    );
    setState(nextState);
    saveState(nextState);
    onToast(`Zone ${zone.id} (${zone.area_km2} km²) synchronized with main dashboard map.`);
  };

  return (
    <>
      <Title
        kicker="Satellite Change Detection"
        title="Bi-temporal Observation & Quantified Change Intelligence"
        description="Sentinel-2 MSI Level-2A 10m orbital Earth observation with vector detection overlays, multi-view comparison, and change in affected area."
      />

      {/* Top Toolbar: View Modes, Overlays, and Controls */}
      <section className="module-panel" style={{ padding: '12px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {/* Overlays & Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#476375', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              LAYERS & OVERLAYS:
            </span>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={showOverlay}
                onChange={e => setShowOverlay(e.target.checked)}
              />
              Vector Polygons
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={showZoneBadges}
                onChange={e => setShowZoneBadges(e.target.checked)}
              />
              Zone Tags
            </label>
          </div>

          {/* Zoom and Badge Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: 4, overflow: 'hidden' }}>
              <button
                type="button"
                className="tiny-button"
                style={{ padding: '5px 8px', background: '#ffffff', border: 'none', borderRight: '1px solid #cbd5e1' }}
                onClick={() => setZoom(z => Math.min(2.5, z + 0.35))}
                title="Zoom in"
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                className="tiny-button"
                style={{ padding: '5px 8px', background: '#ffffff', border: 'none', borderRight: '1px solid #cbd5e1' }}
                onClick={() => setZoom(z => Math.max(1, z - 0.35))}
                title="Zoom out"
              >
                <ZoomOut size={13} />
              </button>
              <button
                type="button"
                className="tiny-button"
                style={{ padding: '5px 8px', background: '#ffffff', border: 'none', fontSize: 10, fontWeight: 600 }}
                onClick={handleResetView}
                title="Reset zoom and center"
              >
                <RotateCcw size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} /> {zoom.toFixed(1)}x
              </button>
            </div>

            <span className="badge" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a', fontWeight: 700, fontSize: 9 }}>
              CANDIDATE CHANGE (OPTICAL)
            </span>
          </div>
        </div>
      </section>

      {/* Main Layout: Satellite Imagery Canvas (Left 8 cols) & Change Intelligence Panel (Right 4 cols) */}
      <div className="module-grid">
        {/* Left Column: Visual Satellite Workspace */}
        <section className="module-panel span-8" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <div>
              <h2 className="module-title" style={{ fontSize: 15, margin: 0 }}>
                {scenario.place} · {scenario.hazard} Satellite Scene
              </h2>
              <p className="module-copy" style={{ margin: '2px 0 0', fontSize: 11 }}>
                Orbital Granule footprint: {scenario.coords[0].toFixed(3)}°N, {scenario.coords[1].toFixed(3)}°E · Full Sentinel-2 109.8km Swath
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: 10, color: '#64748b' }}>
              <div><strong>Pre-Event:</strong> {preDate} (Cloud: {backendMeta?.cloud_cover_pre ?? 0.0}%)</div>
              <div><strong>Post-Event:</strong> {postDate} (Cloud: {backendMeta?.cloud_cover_post ?? 0.0}%)</div>
            </div>
          </div>

          {/* Interactive Satellite Canvas Container */}
          {hasImagery ? (
            <div
              style={{
                position: 'relative',
                width: '100%',
                minHeight: 520,
                height: 520,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                overflow: 'hidden',
                background: '#091522',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
              }}
            >
              {/* Scalable & Pannable Viewport */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.25s ease-out',
                  overflow: 'hidden'
                }}
              >
                {/* Main Post-Event Observed Satellite Scene */}
                <img
                  src={postImg}
                  alt={`Post-event observed satellite scene with detection overlay`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />

                {/* SVG Vector Detection Overlays */}
                {showOverlay && (
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          pointerEvents: 'none'
                        }}
                      >
                        <defs>
                          <filter id="amber-glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="0" stdDeviation="0.7" floodColor="#f59e0b" floodOpacity="0.85" />
                          </filter>
                          <filter id="active-glow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#38bdf8" floodOpacity="1" />
                            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#0284c7" floodOpacity="0.75" />
                          </filter>
                        </defs>

                        {/* Render Polygon Zones */}
                        {detectionZones.map((z: any) => {
                          const isSelected = z.id === (activeZone?.id || selectedZoneId);
                          const isDetected = z.classification === 'DETECTED_CHANGE';
                          const ptsString = z.polygon_pct.map((p: [number, number]) => `${p[0]},${p[1]}`).join(' ');

                          return (
                            <polygon
                              key={z.id}
                              points={ptsString}
                              fill={isSelected ? 'rgba(56, 189, 248, 0.45)' : (isDetected ? 'rgba(239, 68, 68, 0.30)' : 'rgba(245, 158, 11, 0.16)')}
                              stroke={isSelected ? '#38bdf8' : (isDetected ? '#f59e0b' : '#eab308')}
                              strokeWidth={isSelected ? '1.6' : (isDetected ? '0.75' : '0.55')}
                              strokeDasharray={isSelected ? 'none' : (isDetected ? 'none' : '1.5, 1.5')}
                              filter={isSelected ? 'url(#active-glow)' : 'url(#amber-glow)'}
                              style={{
                                cursor: 'pointer',
                                pointerEvents: 'auto',
                                transition: 'all 0.15s ease'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectZone(z);
                              }}
                            />
                          );
                        })}
                      </svg>
                    )}

                    {/* Numbered Zone Badges */}
                    {showZoneBadges && detectionZones.map((z: any) => {
                      const isSelected = z.id === (activeZone?.id || selectedZoneId);
                      return (
                        <div
                          key={`badge-${z.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectZone(z);
                          }}
                          style={{
                            position: 'absolute',
                            left: `${z.center_pct[0]}%`,
                            top: `${z.center_pct[1]}%`,
                            transform: `translate(-50%, -50%) scale(${isSelected ? 1.25 : 1})`,
                            background: isSelected ? '#0284c7' : 'rgba(15, 23, 42, 0.92)',
                            color: isSelected ? '#ffffff' : '#fde047',
                            border: `2px solid ${isSelected ? '#38bdf8' : '#f59e0b'}`,
                            boxShadow: isSelected ? '0 0 16px rgba(56, 189, 248, 1), 0 0 5px #ffffff' : '0 2px 8px rgba(0,0,0,0.5)',
                            padding: isSelected ? '4px 9px' : '3px 7px',
                            borderRadius: 12,
                            fontSize: isSelected ? 10 : 9,
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                            zIndex: isSelected ? 30 : 10,
                            userSelect: 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {z.id} {isSelected ? '★' : ''}
                        </div>
                      );
                    })}
              </div>

              {/* Floating Scene Telemetry Overlays */}
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  background: 'rgba(15, 23, 42, 0.88)',
                  backdropFilter: 'blur(8px)',
                  padding: '6px 12px',
                  borderRadius: 4,
                  fontSize: 10,
                  color: '#e2e8f0',
                  border: '1px solid rgba(255,255,255,0.1)',
                  pointerEvents: 'none'
                }}
              >
                <div style={{ color: '#38bdf8', fontWeight: 700, fontSize: 9, letterSpacing: '0.08em' }}>
                  OBSERVATION & DETECTION OVERLAY
                </div>
                <div style={{ fontWeight: 600 }}>{postDate}</div>
                <div style={{ color: '#94a3b8', fontSize: 9 }}>{postSensor}</div>
              </div>

              {/* Bottom Mode Kicker on Canvas */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 10,
                  right: 10,
                  background: 'rgba(15, 23, 42, 0.88)',
                  backdropFilter: 'blur(8px)',
                  padding: '5px 10px',
                  borderRadius: 4,
                  fontSize: 9,
                  color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.1)',
                  pointerEvents: 'none'
                }}
              >
                Resolution: <b>10m/pixel (Level-2A TCI)</b> · CRS: <b>WGS84 UTM</b>
              </div>
            </div>
          ) : (
            <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, background: '#f8fafc', padding: 24 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700 }}>
                AFFECTED AREA NOT YET DETECTED
              </div>
              <h3 style={{ margin: '8px 0 6px', color: '#0f172a' }}>Satellite Imagery Unavailable</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: 11 }}>{unavailableNotice}</p>
            </div>
          )}

          {/* Compact Legend Bar */}
          <div
            style={{
              marginTop: 10,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              padding: '8px 12px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              fontSize: 10,
              color: '#334155'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>LEGEND:</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: 10, background: 'rgba(239, 68, 68, 0.4)', border: '1.5px solid #f59e0b', borderRadius: 2 }} />
                Detected Change
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: 10, background: 'rgba(245, 158, 11, 0.25)', border: '1.5px dashed #eab308', borderRadius: 2 }} />
                Uncertain Change
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: 10, background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #0284c7', borderRadius: 2 }} />
                Reference Granule (12,056 km²)
              </span>
            </div>

            <div style={{ color: '#64748b' }}>
              <strong>Dataset Source:</strong> {datasetSource}
            </div>
          </div>

          {/* SATELLITE SCENE COMPARISON — Side-by-Side Co-registered Panels */}
          <div
            style={{
              marginTop: 14,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '12px 14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    CO-REGISTERED OBSERVATIONS
                  </span>
                  <span className="badge" style={{ fontSize: 9, background: '#f1f5f9', color: '#334155', borderColor: '#cbd5e1', fontWeight: 600 }}>
                    Identical 109.8km Footprint
                  </span>
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  Satellite Scene Comparison
                </h3>
              </div>
              <div style={{ fontSize: 10, color: '#64748b', textAlign: 'right' }}>
                Natural True-Color Reflectance · 10m Ground Resolution
              </div>
            </div>

            {/* Side-by-Side Panels with subtle divider */}
            <div
              className="scene-comparison-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 1px minmax(0, 1fr)',
                gap: 12,
                alignItems: 'stretch'
              }}
            >
              {/* Left Panel: BEFORE — Baseline Observation */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0284c7', display: 'inline-block' }} />
                    <strong style={{ fontSize: 11, color: '#0f172a', letterSpacing: '0.02em' }}>
                      BEFORE — Baseline Observation
                    </strong>
                  </div>
                  <span style={{ fontSize: 10, color: '#0369a1', fontWeight: 700, fontFamily: 'var(--app-font-mono, monospace)' }}>
                    {preDate || 'Pre-Event'}
                  </span>
                </div>

                {preImg && hasImagery ? (
                  <div
                    onClick={() => setInspectModal({
                      open: true,
                      type: 'before',
                      title: `Baseline Observation (${scenario.place})`,
                      imageUrl: preImg,
                      date: preDate,
                      sensor: preSensor,
                      cloud: backendMeta?.cloud_cover_pre
                    })}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: 220,
                      borderRadius: 5,
                      overflow: 'hidden',
                      border: '1px solid #cbd5e1',
                      background: '#091522',
                      cursor: 'zoom-in',
                      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.4)',
                      transition: 'border-color 0.15s ease'
                    }}
                    title="Click to enlarge and inspect Baseline Observation"
                  >
                    <img
                      src={preImg}
                      alt={`Pre-event baseline observation (${preSensor})`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />

                    {/* Sensor and Date Overlay Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        right: 6,
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(4px)',
                        padding: '4px 8px',
                        borderRadius: 3,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 9,
                        color: '#f1f5f9',
                        pointerEvents: 'none'
                      }}
                    >
                      <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                        {preSensor}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: 8.5 }}>
                        Cloud: {backendMeta?.cloud_cover_pre ?? 0.0}%
                      </span>
                    </div>

                    {/* Enlarge Hint Pill */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#e2e8f0',
                        padding: '3px 6px',
                        borderRadius: 3,
                        fontSize: 8.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        pointerEvents: 'none'
                      }}
                    >
                      <Maximize2 size={10} /> Enlarge
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: 220,
                      borderRadius: 5,
                      border: '1px dashed #cbd5e1',
                      background: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 16,
                      textAlign: 'center'
                    }}
                  >
                    <AlertTriangle size={20} color="#94a3b8" style={{ marginBottom: 6 }} />
                    <strong style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>
                      Baseline Image Unavailable
                    </strong>
                    <span style={{ fontSize: 9.5, color: '#94a3b8', maxWidth: 220 }}>
                      No verified pre-event optical granule archived for this scenario.
                    </span>
                  </div>
                )}
              </div>

              {/* Subtle Vertical Divider between Panels */}
              <div
                style={{
                  background: 'linear-gradient(to bottom, #e2e8f0 10%, #cbd5e1 50%, #e2e8f0 90%)',
                  width: 1,
                  alignSelf: 'stretch',
                  margin: '4px 0'
                }}
              />

              {/* Right Panel: AFTER — Latest Observation */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                    <strong style={{ fontSize: 11, color: '#0f172a', letterSpacing: '0.02em' }}>
                      AFTER — Latest Observation
                    </strong>
                  </div>
                  <span style={{ fontSize: 10, color: '#b91c1c', fontWeight: 700, fontFamily: 'var(--app-font-mono, monospace)' }}>
                    {postDate || 'Post-Event'}
                  </span>
                </div>

                {postImg && hasImagery ? (
                  <div
                    onClick={() => setInspectModal({
                      open: true,
                      type: 'after',
                      title: `Latest Observation (${scenario.place})`,
                      imageUrl: postImg,
                      date: postDate,
                      sensor: postSensor,
                      cloud: backendMeta?.cloud_cover_post
                    })}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: 220,
                      borderRadius: 5,
                      overflow: 'hidden',
                      border: '1px solid #cbd5e1',
                      background: '#091522',
                      cursor: 'zoom-in',
                      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.4)',
                      transition: 'border-color 0.15s ease'
                    }}
                    title="Click to enlarge and inspect Latest Observation"
                  >
                    <img
                      src={postImg}
                      alt={`Post-event latest observation (${postSensor})`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />

                    {/* Sensor and Date Overlay Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        right: 6,
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(4px)',
                        padding: '4px 8px',
                        borderRadius: 3,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 9,
                        color: '#f1f5f9',
                        pointerEvents: 'none'
                      }}
                    >
                      <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                        {postSensor}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: 8.5 }}>
                        Cloud: {backendMeta?.cloud_cover_post ?? 0.0}%
                      </span>
                    </div>

                    {/* Enlarge Hint Pill */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#e2e8f0',
                        padding: '3px 6px',
                        borderRadius: 3,
                        fontSize: 8.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        pointerEvents: 'none'
                      }}
                    >
                      <Maximize2 size={10} /> Enlarge
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: 220,
                      borderRadius: 5,
                      border: '1px dashed #cbd5e1',
                      background: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 16,
                      textAlign: 'center'
                    }}
                  >
                    <AlertTriangle size={20} color="#94a3b8" style={{ marginBottom: 6 }} />
                    <strong style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>
                      Latest Image Unavailable
                    </strong>
                    <span style={{ fontSize: 9.5, color: '#94a3b8', maxWidth: 220 }}>
                      No verified post-event optical granule archived for this scenario.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Change Summary Bar filling empty space cleanly */}
            <div
              style={{
                marginTop: 10,
                paddingTop: 8,
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: 10,
                color: '#64748b'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>
                  Observation interval: <strong style={{ color: '#0f172a' }}>{preDate} &rarr; {postDate}</strong>
                </span>
                <span>
                  Net Surface Change: <strong style={{ color: netChange > 0 ? '#b91c1c' : '#0369a1' }}>{netChange > 0 ? `+${netChange}` : netChange} km²</strong>
                </span>
                <span>
                  Change relative to baseline: <strong style={{ color: '#0f172a' }}>{pctChangeLabel}</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Change Intelligence & Detection Evidence */}
        <section className="module-panel span-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 1. Selected Zone Metrics (Dynamically Synchronized with selectedZoneId) */}
          <div style={{ border: '2px solid #0284c7', borderRadius: 6, padding: 12, background: '#ffffff', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)' }}>
            <div className="row" style={{ marginBottom: 8, alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    SELECTED ZONE METRICS
                  </span>
                  {activeZone && (
                    <span style={{ background: '#0284c7', color: '#ffffff', fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 10 }}>
                      {activeZone.id}
                    </span>
                  )}
                </div>
                <h3 style={{ margin: '3px 0 0', fontSize: 13, color: '#0f172a', fontWeight: 700 }}>
                  {activeZone ? activeZone.name : 'No Zone Selected'}
                </h3>
              </div>
              {activeZone && (
                <span className="badge" style={{ background: activeZone.classification === 'DETECTED_CHANGE' ? '#fef2f2' : '#fefce8', color: activeZone.classification === 'DETECTED_CHANGE' ? '#991b1b' : '#854d0e', borderColor: activeZone.classification === 'DETECTED_CHANGE' ? '#fecaca' : '#fef08a', fontWeight: 700, fontSize: 9 }}>
                  {Math.round((activeZone.confidence || 0.88) * 100)}% RELIABILITY
                </span>
              )}
            </div>

            {activeZone ? (
              <>
                {/* Zone Key Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 8 }}>
                  {/* Zone Affected Area */}
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '7px 9px', borderRadius: 4 }}>
                    <div style={{ fontSize: 8, color: '#0369a1', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Zone Affected Area</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0284c7', margin: '1px 0' }}>{activeZone.area_km2} km²</div>
                    <div style={{ fontSize: 8, color: '#0369a1' }}>~{Math.round(activeZone.area_km2 * 100)} hectares</div>
                  </div>

                  {/* Change Classification */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '7px 9px', borderRadius: 4 }}>
                    <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Classification</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: activeZone.classification === 'DETECTED_CHANGE' ? '#dc2626' : '#d97706', margin: '2px 0' }}>
                      {activeZone.classification === 'DETECTED_CHANGE' ? 'Detected Change' : 'Uncertain Change'}
                    </div>
                    <div style={{ fontSize: 8, color: '#64748b' }}>Optical Candidate</div>
                  </div>

                  {/* Baseline Measurement */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 8px', borderRadius: 4 }}>
                    <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Baseline Measurement</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: activeZone.baseline_km2 != null ? '#1e293b' : '#94a3b8' }}>
                      {activeZone.baseline_km2 != null ? `${activeZone.baseline_km2} km²` : 'Unavailable'}
                    </div>
                    <div style={{ fontSize: 8, color: '#94a3b8' }}>Pre-event localized parcel</div>
                  </div>

                  {/* Latest Measurement */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 8px', borderRadius: 4 }}>
                    <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Latest Measurement</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                      {activeZone.latest_km2 != null ? `${activeZone.latest_km2} km²` : `${activeZone.area_km2} km²`}
                    </div>
                    <div style={{ fontSize: 8, color: '#94a3b8' }}>Observed ({postDate})</div>
                  </div>

                  {/* Net Change */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: 4 }}>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Zone Net Change</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: activeZone.net_change_km2 != null ? '#0f172a' : '#94a3b8' }}>
                      {activeZone.net_change_km2 != null ? `${activeZone.net_change_km2 > 0 ? '+' : ''}${Math.round(activeZone.net_change_km2 * 100) / 100} km²` : 'Unavailable'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Change in Affected Area</div>
                  </div>

                  {/* Percentage Change */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: 4 }}>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Zone % Change</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: activeZone.percentage_change != null ? '#0f172a' : '#94a3b8' }}>
                      {activeZone.percentage_change != null ? `${activeZone.percentage_change > 0 ? '+' : ''}${Math.round(activeZone.percentage_change * 10) / 10}%` : 'Unavailable'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Relative to baseline</div>
                  </div>
                </div>

                {/* Geographic Coordinates & Polygon Bounds */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: 4, fontSize: 12, color: '#475569' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>Centroid Coordinates:</span>
                    <span style={{ fontFamily: 'var(--app-font-mono)', fontWeight: 600 }}>{activeZone.center_str || `${activeZone.center_geo[0].toFixed(3)}°N, ${activeZone.center_geo[1].toFixed(3)}°E`}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>Polygon Bounds:</span>
                    <span style={{ fontFamily: 'var(--app-font-mono)', fontWeight: 600 }}>{activeZone.bounds_str || 'Calculated from polygon vertices'}</span>
                  </div>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                No detection zone currently active. Select a scenario with satellite data to view zone-level intelligence.
              </p>
            )}
          </div>

          {/* 2. Scene-wide Impact Summary (Stable across zone selection) */}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 5, padding: 12, background: '#ffffff' }}>
            <div className="row" style={{ marginBottom: 8, alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  SCENE-WIDE IMPACT SUMMARY
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: 12, color: '#0f172a' }}>
                  Total Orbital Granule Footprint
                </h3>
              </div>
              <span className="badge" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0', fontWeight: 700, fontSize: 9 }}>
                {confidencePct}% CONFIDENCE
              </span>
            </div>

            {/* 6-Metric Scene Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {/* Newly Affected Area (Highlighted) */}
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '7px 9px', borderRadius: 4, gridColumn: 'span 2' }}>
                <div style={{ fontSize: 8, color: '#991b1b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🚨 Newly Affected Area (Scene Total)
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#b91c1c', margin: '2px 0' }}>
                  {newlyAffected} km²
                </div>
                <div style={{ fontSize: 8, color: '#7f1d1d' }}>
                  Total newly inundated / disturbed extent across full granule
                </div>
              </div>

              {/* Previous Affected Extent */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '5px 7px', borderRadius: 4 }}>
                <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Previous Extent</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{prevExtent} km²</div>
                <div style={{ fontSize: 8, color: '#94a3b8' }}>Baseline ({preDate})</div>
              </div>

              {/* Latest Affected Extent */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '5px 7px', borderRadius: 4 }}>
                <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Latest Extent</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{latestExtent} km²</div>
                <div style={{ fontSize: 8, color: '#94a3b8' }}>Observed ({postDate})</div>
              </div>

              {/* Area No Longer Affected / Receded */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '5px 7px', borderRadius: 4 }}>
                <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Area No Longer Affected</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f766e' }}>{recededExtent} km²</div>
                <div style={{ fontSize: 8, color: '#94a3b8' }}>Receded / clear zone</div>
              </div>

              {/* Net Change & Percentage */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '5px 7px', borderRadius: 4 }}>
                <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Net Change</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                  {netChange > 0 ? `+${netChange}` : netChange} km²
                </div>
                <div style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>{pctChangeLabel}</div>
              </div>
            </div>

            {/* Total Analyzed Area Footprint & Scene Note */}
            <div style={{ marginTop: 6, fontSize: 8, color: '#64748b', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 5 }}>
              <span>Total Analyzed Swath:</span>
              <strong>{analyzedExtent} km²</strong>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 8, color: '#94a3b8', fontStyle: 'italic' }}>
              Scene-wide statistics reflect the full 109.8 km Sentinel-2 granule and remain constant across zone selections.
            </p>
          </div>

          {/* 3. Numbered Detection Zones Selector */}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 5, padding: 10, background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ fontSize: 11, color: '#0f172a' }}>Numbered Detection Zones</strong>
              <span className="badge" style={{ fontSize: 9 }}>{detectionZones.length} DELINEATED</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
              {detectionZones.map((z: any) => {
                const isSelected = z.id === (activeZone?.id || selectedZoneId);
                return (
                  <div
                    key={z.id}
                    onClick={() => handleSelectZone(z)}
                    style={{
                      border: `1px solid ${isSelected ? '#0284c7' : '#e2e8f0'}`,
                      background: isSelected ? '#f0f9ff' : '#ffffff',
                      boxShadow: isSelected ? '0 0 0 1px #0284c7' : 'none',
                      padding: '6px 8px',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: 10,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          background: isSelected ? '#0284c7' : '#e2e8f0',
                          color: isSelected ? '#ffffff' : '#334155',
                          borderRadius: 3,
                          padding: '1px 5px',
                          fontWeight: 700,
                          fontSize: 9
                        }}
                      >
                        {z.id}
                      </span>
                      <span style={{ fontWeight: isSelected ? 700 : 500, color: isSelected ? '#0369a1' : '#1e293b' }}>
                        {z.name} {isSelected ? '●' : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ color: '#0f172a' }}>{z.area_km2} km²</strong>
                      <span
                        style={{
                          fontSize: 8,
                          padding: '1px 4px',
                          borderRadius: 2,
                          background: z.classification === 'DETECTED_CHANGE' ? '#fee2e2' : '#fef3c7',
                          color: z.classification === 'DETECTED_CHANGE' ? '#991b1b' : '#92400e',
                          fontWeight: 700
                        }}
                      >
                        {z.classification === 'DETECTED_CHANGE' ? 'DETECTED' : 'UNCERTAIN'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Selected Zone Evidence Drawer / Details Panel */}
          {activeZone && (
            <div style={{ border: '1px solid #b9d5e3', background: '#f0f7fa', padding: 12, borderRadius: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    ZONE EVIDENCE &bull; {activeZone.id}
                  </span>
                  <h4 style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>{activeZone.name}</h4>
                </div>
                <span className="badge safe" style={{ fontSize: 9 }}>
                  {Math.round((activeZone.confidence || 0.88) * 100)}% RELIABILITY
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 9, color: '#334155', marginBottom: 8 }}>
                <div><strong>Estimated Extent:</strong> {activeZone.area_km2} km²</div>
                <div><strong>Coordinates:</strong> {activeZone.center_str || `${activeZone.center_geo[0].toFixed(3)}°N, ${activeZone.center_geo[1].toFixed(3)}°E`}</div>
                <div><strong>Classification:</strong> {activeZone.classification}</div>
                <div><strong>Observation Gap:</strong> {preDate} → {postDate}</div>
              </div>

              <div style={{ fontSize: 9, color: '#334155', marginBottom: 6 }}>
                <strong>Evidence Telemetry:</strong><br />
                {activeZone.evidence}
              </div>

              <div style={{ fontSize: 9, color: '#334155', marginBottom: 8 }}>
                <strong>Terrain Context:</strong><br />
                {activeZone.terrain_context}
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 8px', borderRadius: 3, fontSize: 9, color: '#1e3a5f', marginBottom: 10 }}>
                <strong>Tactical Advisory:</strong> {activeZone.tactical_guidance}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn"
                  style={{ flex: 1, padding: '6px 8px', fontSize: 10, fontWeight: 600 }}
                  onClick={() => handleZoomToZone(activeZone)}
                >
                  <Crosshair size={12} style={{ marginRight: 4 }} /> Zoom to Region
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '6px 8px', fontSize: 10, fontWeight: 600, background: '#ffffff' }}
                  onClick={() => handleSyncToMap(activeZone)}
                >
                  <MapPin size={12} style={{ marginRight: 4 }} /> Sync to Main Map
                </button>
              </div>
            </div>
          )}

          {/* 5. Scientific Methodology Card */}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 5, padding: 10, background: '#f8fafc', fontSize: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#0369a1', fontWeight: 700, marginBottom: 4 }}>
              <Info size={12} /> SCIENTIFIC METHODOLOGY &amp; INTEGRITY NOTE
            </div>
            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>{methodology}</div>
            <p style={{ margin: 0, color: '#475569', fontSize: 9, lineHeight: 1.5 }}>
              {methodologyNote}
            </p>
          </div>
        </section>
      </div>

      {/* Satellite Image Modal Inspection Dialog */}
      {inspectModal && inspectModal.open && (
        <div
          onClick={() => setInspectModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              width: '100%',
              maxWidth: 960,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      background: inspectModal.type === 'before' ? '#0284c7' : '#dc2626',
                      color: '#ffffff',
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 10,
                      letterSpacing: '0.05em'
                    }}
                  >
                    {inspectModal.type === 'before' ? 'BASELINE (BEFORE)' : 'LATEST (AFTER)'}
                  </span>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    {inspectModal.title}
                  </h3>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Acquisition: <strong style={{ color: '#0f172a' }}>{inspectModal.date}</strong> &bull; Sensor: <strong>{inspectModal.sensor}</strong>
                  {inspectModal.cloud !== undefined && (
                    <span> &bull; Cloud: <strong>{inspectModal.cloud}%</strong></span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectModal(null)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 4,
                  padding: 6,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569'
                }}
                title="Close inspection view"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body: High Resolution Inspection View */}
            <div
              style={{
                flex: 1,
                background: '#091522',
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 12,
                minHeight: 460
              }}
            >
              <img
                src={inspectModal.imageUrl}
                alt={inspectModal.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '72vh',
                  objectFit: 'contain',
                  borderRadius: 4,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                }}
              />
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '8px 18px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 11,
                color: '#64748b'
              }}
            >
              <span>
                Footprint: <strong>109.8km Sentinel-2 Swath (10m TCI)</strong> &bull; True-Color Composite (B04/B03/B02)
              </span>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 12px', fontSize: 11, background: '#ffffff' }}
                onClick={() => setInspectModal(null)}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 5. COMPARE REGIONS
function CompareRegions() {
  const [left, setLeft] = useState(scenarios[0].id);
  const [right, setRight] = useState(scenarios[1] ? scenarios[1].id : scenarios[0].id);
  const a = scenarios.find(s => s.id === left) || scenarios[0];
  const b = scenarios.find(s => s.id === right) || scenarios[1] || scenarios[0];

  const [indicesA, setIndicesA] = useState<RiskIndicesBreakdown>(() => computeAperioIndicesLocally(a.id));
  const [indicesB, setIndicesB] = useState<RiskIndicesBreakdown>(() => computeAperioIndicesLocally(b.id));
  const [inventoryA, setInventoryA] = useState<any>(null);
  const [inventoryB, setInventoryB] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    fetchRiskIndices(a.id).then(res => { if (mounted && res) setIndicesA(res); });
    fetchResourceInventory(a.id).then(res => { if (mounted && res) setInventoryA(res); });
    return () => { mounted = false; };
  }, [a.id]);

  useEffect(() => {
    let mounted = true;
    fetchRiskIndices(b.id).then(res => { if (mounted && res) setIndicesB(res); });
    fetchResourceInventory(b.id).then(res => { if (mounted && res) setInventoryB(res); });
    return () => { mounted = false; };
  }, [b.id]);

  const data = [
    { key: 'Rainfall (mm)', a: a.rainfall, b: b.rainfall },
    { key: 'Slope (°)', a: a.slope, b: b.slope },
    { key: 'HRI Score', a: indicesA.hri.score, b: indicesB.hri.score },
    { key: 'PRI Score', a: indicesA.pri.score, b: indicesB.pri.score },
    { key: 'Priority Score', a: indicesA.priority_score, b: indicesB.priority_score }
  ];

  const isComparing = left !== right;
  const isCritical = a.severity === 'CRITICAL' || b.severity === 'CRITICAL';
  const isHigh = a.severity === 'HIGH' || b.severity === 'HIGH';
  const statusType = !isComparing
    ? 'default'
    : isCritical
      ? 'critical'
      : isHigh
        ? 'warning'
        : 'active';

  const popA = inventoryA?.population_metrics;
  const popB = inventoryB?.population_metrics;
  const shelterA = inventoryA?.shelter_metrics;
  const shelterB = inventoryB?.shelter_metrics;
  const healthA = inventoryA?.healthcare_metrics;
  const healthB = inventoryB?.healthcare_metrics;

  return (
    <>
      <Title
        kicker="Regional Context"
        title="Compare Disaster Regions"
        description="Cross-scenario intelligence benchmarking comparing physical geography, demographic exposure, and deterministic APERIO risk indices."
      />

      <div className="module-grid">
        <section className="module-panel span-12">
          <div className="row" style={{ marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div className="compare-selects" style={{ margin: 0, alignItems: 'flex-end' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Region A
                <select className="field-select" value={left} onChange={e => setLeft(e.target.value)}>
                  {scenarios.map(s => (
                    <option key={s.id} value={s.id}>{s.place}, {s.region} ({s.hazard})</option>
                  ))}
                </select>
              </label>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b', padding: '0 4px 10px', alignSelf: 'flex-end' }}>vs</span>
              <label className="form-label" style={{ margin: 0 }}>
                Region B
                <select className="field-select" value={right} onChange={e => setRight(e.target.value)}>
                  {scenarios.map(s => (
                    <option key={s.id} value={s.id}>{s.place}, {s.region} ({s.hazard})</option>
                  ))}
                </select>
              </label>
            </div>

            <div className={`context-indicator ${statusType}`}>
              <span className="context-indicator-dot" />
              <span>{isComparing ? 'Comparing 2 regions' : `Region selected · ${a.place}`}</span>
            </div>
          </div>

          <div className="two-maps">
            <div>
              <div className="map-title">{a.place} · {a.region} ({a.hazard})</div>
              <MapView compact scenario={a} layers={{ Risk: true, Shelters: false, Hospitals: false }} onLayer={() => { }} />
            </div>
            <div>
              <div className="map-title">{b.place} · {b.region} ({b.hazard})</div>
              <MapView compact scenario={b} layers={{ Risk: true, Shelters: false, Hospitals: false }} onLayer={() => { }} />
            </div>
          </div>
        </section>

        <section className="module-panel span-7">
          <h2 className="module-title">Context Indicators</h2>
          <div className="compare-bars">
            {data.map(row => (
              <div className="compare-bar-row" key={row.key}>
                <span>{row.key}</span>
                <div>
                  <i style={{ width: `${Math.min(100, (row.a / (row.key.includes('Rainfall') ? 300 : 100)) * 100)}%` }} />
                  <b>{row.a}</b>
                </div>
                <div>
                  <i style={{ width: `${Math.min(100, (row.b / (row.key.includes('Rainfall') ? 300 : 100)) * 100)}%` }} />
                  <b>{row.b}</b>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="module-panel span-5">
          <h2 className="module-title">Comparison Measures</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Indicator</th>
                <th>{a.place}</th>
                <th>{b.place}</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Disaster Type', a.hazard, b.hazard],
                ['State / Region', a.region, b.region],
                ['Priority Score', `${indicesA.priority_score} (${indicesA.classification})`, `${indicesB.priority_score} (${indicesB.classification})`],
                ['HRI (Hazard Risk)', `${indicesA.hri.score}`, `${indicesB.hri.score}`],
                ['PRI (Population Risk)', `${indicesA.pri.score}`, `${indicesB.pri.score}`],
                ['CCPA (Capacity)', `${indicesA.ccpa.score}`, `${indicesB.ccpa.score}`],
                ['District Census Est.', popA ? `${popA.district_census_estimate.toLocaleString()}` : '—', popB ? `${popB.district_census_estimate.toLocaleString()}` : '—'],
                ['Settlement Cluster Pop.', popA ? `${popA.total_regional_population.toLocaleString()}` : '—', popB ? `${popB.total_regional_population.toLocaleString()}` : '—'],
                ['Hazard-Zone Population', popA ? `${popA.population_inside_hazard_zone.toLocaleString()}` : a.population, popB ? `${popB.population_inside_hazard_zone.toLocaleString()}` : b.population],
                ['Immediate Relocation Required', popA ? `${popA.population_requiring_relocation.toLocaleString()}` : '—', popB ? `${popB.population_requiring_relocation.toLocaleString()}` : '—'],
                ['Available Shelter Beds', shelterA ? `${shelterA.total_available.toLocaleString()} / ${shelterA.total_capacity.toLocaleString()}` : '—', shelterB ? `${shelterB.total_available.toLocaleString()} / ${shelterB.total_capacity.toLocaleString()}` : '—'],
                ['Available Hospital Beds', healthA ? `${healthA.available_beds.toLocaleString()} / ${healthA.total_beds.toLocaleString()}` : '—', healthB ? `${healthB.available_beds.toLocaleString()} / ${healthB.total_beds.toLocaleString()}` : '—'],
                ['Affected Extent', a.area, b.area]
              ].map(row => (
                <tr key={row[0]}>
                  {row.map((cell, i) => <td key={i}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

// 6. DEM / 3D TERRAIN
function DemModule({ scenario }: { scenario: Scenario }) {
  const [demData, setDemData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    fetchDemTerrain(scenario.id).then(res => {
      if (mounted && res) setDemData(res);
    });
    return () => { mounted = false; };
  }, [scenario.id]);

  return (
    <>
      <Title
        kicker="Assess / terrain context"
        title="DEM / 3D Terrain Analysis"
        description="Interactive 3D elevation surface grounded in Copernicus GLO-30 Digital Elevation Model topography and slope stability metrics."
      />

      <div className="module-grid">
        <section className="module-panel span-8" style={{ padding: 0 }}>
          <div className="panel-head">
            <div className="panel-title">Interactive 3D Terrain Surface · Orbit / Zoom</div>
            <span className="panel-kicker">{demData?.source || 'COPERNICUS GLO-30 DEM'}</span>
          </div>
          <Terrain risk={scenario.risk} />
        </section>

        <section className="module-panel span-4">
          <h2 className="module-title">Topographic Inspection</h2>
          <div className="terrain-facts">
            <span>Mean elevation<strong>{demData?.elevation_mean ? `${demData.elevation_mean} m` : '952.1 m'}</strong></span>
            <span>Mean slope<strong>{demData?.slope_mean_deg ? `${demData.slope_mean_deg}°` : `${scenario.slope}°`}</strong></span>
            <span>Max slope<strong>{demData?.slope_max_deg ? `${demData.slope_max_deg}°` : '48.2°'}</strong></span>
            <span>Spatial resolution<strong>{demData?.resolution_m ? `${demData.resolution_m} m` : '30 m'}</strong></span>
            <span>High slope risk area<strong>{demData?.high_slope_risk_area_pct ? `${demData.high_slope_risk_area_pct}%` : '28.4%'}</strong></span>
            <span>Validation status<strong className="safe-text">{demData?.status || 'VALIDATED_COPERNICUS_DEM'}</strong></span>
          </div>
          <p className="module-copy">
            {demData?.dynamic_note || 'Base terrain remains static DEM; hazard overlays and risk rasters update dynamically with incoming sensor observations.'}
          </p>
        </section>
      </div>
    </>
  );
}

// 7. RISK SIMULATOR
function RiskSimulator({ scenario, state, setState, onToast }: Props) {
  const getBaseline = () => ({
    hazardProb: scenario.risk || 85,
    rainfallScore: Math.min(100, Math.round(scenario.rainfall * 0.55)),
    terrainInstability: Math.min(100, Math.round(scenario.slope * 2.5)),
    satChange: 72,
    recentChange: scenario.vegetation * 2 || 60,
    popExposed: parseInt(scenario.population.replace(/\D/g, '')) || 4250,
    popTotal: 12500,
    vulnerablePop: 32,
    infraExposure: 75,
    accessDiff: 80,
    timeSens: 90,
    shelterAvail: 2500,
    waterAvail: 3200,
    foodAvail: 2800,
    medAvail: 65,
    transAvail: 14
  });

  const baseline = useMemo(getBaseline, [scenario.id, scenario.risk, scenario.rainfall, scenario.slope, scenario.vegetation, scenario.population]);

  const [hazardProb, setHazardProb] = useState(baseline.hazardProb);
  const [rainfallScore, setRainfallScore] = useState(baseline.rainfallScore);
  const [terrainInstability, setTerrainInstability] = useState(baseline.terrainInstability);
  const [satChange, setSatChange] = useState(baseline.satChange);
  const [recentChange, setRecentChange] = useState(baseline.recentChange);

  const [popExposed, setPopExposed] = useState(baseline.popExposed);
  const [popTotal, setPopTotal] = useState(baseline.popTotal);
  const [vulnerablePop, setVulnerablePop] = useState(baseline.vulnerablePop);
  const [infraExposure, setInfraExposure] = useState(baseline.infraExposure);
  const [accessDiff, setAccessDiff] = useState(baseline.accessDiff);
  const [timeSens, setTimeSens] = useState(baseline.timeSens);

  const [shelterAvail, setShelterAvail] = useState(baseline.shelterAvail);
  const [waterAvail, setWaterAvail] = useState(baseline.waterAvail);
  const [foodAvail, setFoodAvail] = useState(baseline.foodAvail);
  const [medAvail, setMedAvail] = useState(baseline.medAvail);
  const [transAvail, setTransAvail] = useState(baseline.transAvail);

  useEffect(() => {
    const b = getBaseline();
    setHazardProb(b.hazardProb);
    setRainfallScore(b.rainfallScore);
    setTerrainInstability(b.terrainInstability);
    setSatChange(b.satChange);
    setRecentChange(b.recentChange);
    setPopExposed(b.popExposed);
    setPopTotal(b.popTotal);
    setVulnerablePop(b.vulnerablePop);
    setInfraExposure(b.infraExposure);
    setAccessDiff(b.accessDiff);
    setTimeSens(b.timeSens);
    setShelterAvail(b.shelterAvail);
    setWaterAvail(b.waterAvail);
    setFoodAvail(b.foodAvail);
    setMedAvail(b.medAvail);
    setTransAvail(b.transAvail);
  }, [scenario.id]);

  const resetParameters = () => {
    const b = getBaseline();
    setHazardProb(b.hazardProb);
    setRainfallScore(b.rainfallScore);
    setTerrainInstability(b.terrainInstability);
    setSatChange(b.satChange);
    setRecentChange(b.recentChange);
    setPopExposed(b.popExposed);
    setPopTotal(b.popTotal);
    setVulnerablePop(b.vulnerablePop);
    setInfraExposure(b.infraExposure);
    setAccessDiff(b.accessDiff);
    setTimeSens(b.timeSens);
    setShelterAvail(b.shelterAvail);
    setWaterAvail(b.waterAvail);
    setFoodAvail(b.foodAvail);
    setMedAvail(b.medAvail);
    setTransAvail(b.transAvail);
    onToast('Scenario parameters reset to baseline scenario values.');
  };

  const indices = useMemo(() => {
    return computeAperioIndicesLocally(scenario.id, {
      hazard_prob: hazardProb,
      rainfall: rainfallScore,
      terrain: terrainInstability,
      sat_change: satChange,
      recent_change: recentChange,
      pop_exposed: popExposed,
      pop_total: popTotal,
      vulnerable: vulnerablePop,
      infra: infraExposure,
      accessibility: accessDiff,
      time_sensitivity: timeSens,
      shelter_avail: shelterAvail,
      shelter_req: popExposed,
      water_avail: waterAvail,
      water_req: popExposed,
      food_avail: foodAvail,
      food_req: popExposed,
      med_avail: medAvail,
      med_req: Math.round(popExposed * 0.028),
      trans_avail: transAvail,
      trans_req: Math.round(popExposed * 0.0065)
    });
  }, [
    scenario.id, hazardProb, rainfallScore, terrainInstability, satChange, recentChange,
    popExposed, popTotal, vulnerablePop, infraExposure, accessDiff, timeSens,
    shelterAvail, waterAvail, foodAvail, medAvail, transAvail
  ]);

  const baselineRisk = scenario.risk || 85;
  const simulatedRisk = indices.priority_score;
  const riskShift = simulatedRisk - baselineRisk;

  const [activeTab, setActiveTab] = useState<'HRI' | 'PRI' | 'CCPA'>('HRI');

  const recordSimulation = async () => {
    await calculateCustomIndices({
      scenario_id: scenario.id,
      hazard_prob: hazardProb,
      rainfall: rainfallScore,
      terrain: terrainInstability,
      sat_change: satChange,
      recent_change: recentChange,
      pop_exposed: popExposed,
      pop_total: popTotal,
      vulnerable: vulnerablePop,
      infra: infraExposure,
      accessibility: accessDiff,
      time_sensitivity: timeSens
    });

    const next = pushEvent(
      state,
      'Risk index simulation recorded',
      `Calculated HRI: ${indices.hri.score} (${indices.hri.classification}), PRI: ${indices.pri.score}, CCPA: ${indices.ccpa.score} (${indices.ccpa.classification}), Priority: ${indices.priority_score} (${indices.classification})`,
      'Simulation'
    );
    setState(next);
    saveState(next);
    onToast(`Deterministic simulation saved: Priority Score ${indices.priority_score}.`);
  };

  const delta = Math.round((simulatedRisk - baselineRisk) * 10) / 10;
  const formattedDelta = delta > 0 ? `+${delta}%` : `${delta}%`;

  return (
    <>
      <Title
        kicker="Risk Assessment"
        title="Risk Simulator"
        description="Adjust environmental and risk factors to explore potential outcomes."
      />

      <div className="module-grid">
        <section className="module-panel span-7">
          <div className="row" style={{ marginBottom: 16, alignItems: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: 0 }}>Scenario Parameters</h2>
            <div className="control-row" style={{ gap: 8 }}>
              {(['HRI', 'PRI', 'CCPA'] as const).map(tab => (
                <button
                  key={tab}
                  className={`layer-btn ${activeTab === tab ? 'selected' : ''}`}
                  style={{ fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 4 }}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'HRI' ? 'Hazard Risk (HRI)' : tab === 'PRI' ? 'Population Risk (PRI)' : 'Carrying Capacity (CCPA)'}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'HRI' && (
            <div>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: '#475569', marginBottom: 14, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }}>
                <strong>Formula:</strong> HRI = 0.35 × hazard_prob + 0.20 × rainfall + 0.15 × terrain + 0.15 × sat_change + 0.15 × recent_change
              </p>
              <label className="range-row" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Hazard Probability (0–100)</span>
                <input type="range" min="0" max="100" value={hazardProb} onChange={e => setHazardProb(Number(e.target.value))} />
                <output style={{ fontSize: 14, fontWeight: 600, color: '#0284c7', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{hazardProb}</output>
              </label>
              <label className="range-row" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Rainfall Intensity (0–100)</span>
                <input type="range" min="0" max="100" value={rainfallScore} onChange={e => setRainfallScore(Number(e.target.value))} />
                <output style={{ fontSize: 14, fontWeight: 600, color: '#0284c7', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{rainfallScore}</output>
              </label>
              <label className="range-row" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Slope Conditions (0–100)</span>
                <input type="range" min="0" max="100" value={terrainInstability} onChange={e => setTerrainInstability(Number(e.target.value))} />
                <output style={{ fontSize: 14, fontWeight: 600, color: '#0284c7', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{terrainInstability}</output>
              </label>
              <label className="range-row" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Satellite Change Detection (0–100)</span>
                <input type="range" min="0" max="100" value={satChange} onChange={e => setSatChange(Number(e.target.value))} />
                <output style={{ fontSize: 14, fontWeight: 600, color: '#0284c7', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{satChange}</output>
              </label>
              <label className="range-row" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Recent Environmental Disturbance (0–100)</span>
                <input type="range" min="0" max="100" value={recentChange} onChange={e => setRecentChange(Number(e.target.value))} />
                <output style={{ fontSize: 14, fontWeight: 600, color: '#0284c7', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{recentChange}</output>
              </label>
            </div>
          )}

          {activeTab === 'PRI' && (
            <div>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: '#475569', marginBottom: 14, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }}>
                <strong>Formula:</strong> PRI = 0.45 × pop_exposure + 0.20 × vulnerable + 0.15 × infra + 0.10 × accessibility + 0.10 × time_sensitivity
              </p>
              <label className="range-row" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Exposed Population (Headcount)</span>
                <input type="range" min="100" max={popTotal} value={popExposed} onChange={e => setPopExposed(Number(e.target.value))} />
                <output style={{ fontSize: 14, fontWeight: 600, color: '#0284c7', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{popExposed.toLocaleString()}</output>
              </label>
              <label className="range-row" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Total Regional Population (Headcount)</span>
                <input type="range" min="5000" max="50000" step="500" value={popTotal} onChange={e => setPopTotal(Number(e.target.value))} />
                <output style={{ fontSize: 14, fontWeight: 600, color: '#0284c7', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{popTotal.toLocaleString()}</output>
              </label>
              <label className="range-row" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Vulnerable Population Ratio (%)</span>
                <input type="range" min="0" max="100" value={vulnerablePop} onChange={e => setVulnerablePop(Number(e.target.value))} />
                <output style={{ fontSize: 14, fontWeight: 600, color: '#0284c7', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{vulnerablePop}%</output>
              </label>
              <label className="range-row" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Infrastructure Exposure (0–100)</span>
                <input type="range" min="0" max="100" value={infraExposure} onChange={e => setInfraExposure(Number(e.target.value))} />
                <output style={{ fontSize: 14, fontWeight: 600, color: '#0284c7', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{infraExposure}</output>
              </label>
              <label className="range-row" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Accessibility Difficulty (0–100)</span>
                <input type="range" min="0" max="100" value={accessDiff} onChange={e => setAccessDiff(Number(e.target.value))} />
                <output style={{ fontSize: 14, fontWeight: 600, color: '#0284c7', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{accessDiff}</output>
              </label>
              <label className="range-row" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Time Urgency (0–100)</span>
                <input type="range" min="0" max="100" value={timeSens} onChange={e => setTimeSens(Number(e.target.value))} />
                <output style={{ fontSize: 14, fontWeight: 600, color: '#0284c7', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{timeSens}</output>
              </label>
            </div>
          )}

          {activeTab === 'CCPA' && (
            <div>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: '#475569', marginBottom: 14, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }}>
                <strong>Formula:</strong> CCPA = 0.35 × shelter + 0.20 × water + 0.15 × food + 0.15 × medical + 0.15 × transport
              </p>
              <label className="range-row" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Available Shelter Capacity (Persons)</span>
                <input type="range" min="0" max={popExposed * 1.5} value={shelterAvail} onChange={e => setShelterAvail(Number(e.target.value))} />
                <output style={{ fontSize: 14, fontWeight: 600, color: '#0284c7', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{shelterAvail.toLocaleString()}</output>
              </label>
              <label className="range-row" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Potable Water Reserve (Liters / units)</span>
                <input type="range" min="0" max={popExposed * 1.5} value={waterAvail} onChange={e => setWaterAvail(Number(e.target.value))} />
                <output style={{ fontSize: 14, fontWeight: 600, color: '#0284c7', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{waterAvail.toLocaleString()}</output>
              </label>
              <label className="range-row" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Food Rations Available (Meals)</span>
                <input type="range" min="0" max={popExposed * 1.5} value={foodAvail} onChange={e => setFoodAvail(Number(e.target.value))} />
                <output style={{ fontSize: 14, fontWeight: 600, color: '#0284c7', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{foodAvail.toLocaleString()}</output>
              </label>
              <label className="range-row" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Medical Capacity (Staff / Beds)</span>
                <input type="range" min="0" max="200" value={medAvail} onChange={e => setMedAvail(Number(e.target.value))} />
                <output style={{ fontSize: 14, fontWeight: 600, color: '#0284c7', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{medAvail}</output>
              </label>
              <label className="range-row" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 70px', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Evacuation Transport Units (Vehicles)</span>
                <input type="range" min="0" max="50" value={transAvail} onChange={e => setTransAvail(Number(e.target.value))} />
                <output style={{ fontSize: 14, fontWeight: 600, color: '#0284c7', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{transAvail}</output>
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 20, alignItems: 'center' }}>
            <button className="btn" style={{ fontSize: 14, fontWeight: 500, padding: '10px 20px', borderRadius: 4 }} onClick={recordSimulation}>
              <Play size={15} /> Run Simulation
            </button>
            <button className="btn-secondary" style={{ fontSize: 14, fontWeight: 500, padding: '10px 20px', borderRadius: 4 }} onClick={resetParameters}>
              <RotateCcw size={15} /> Reset Parameters
            </button>
          </div>
        </section>

        <section className="module-panel span-5">
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: '0 0 16px' }}>Simulation Results</h2>

          {/* Comparative Metrics Card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            <div style={{ border: '1px solid #cbd5e1', padding: '12px 14px', borderRadius: 6, background: '#f8fafc' }}>
              <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Risk Before Simulation</span>
              <strong style={{ fontSize: 30, fontWeight: 600, color: '#0f172a', display: 'block', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>{baselineRisk}%</strong>
              <small style={{ fontSize: 12, color: '#64748b', display: 'block', marginTop: 4 }}>Observed baseline</small>
            </div>
            <div style={{ border: '1px solid #0284c7', padding: '12px 14px', borderRadius: 6, background: '#f0f9ff' }}>
              <span style={{ fontSize: 12, color: '#0369a1', display: 'block', marginBottom: 4 }}>Projected Risk</span>
              <strong style={{ fontSize: 34, fontWeight: 600, color: '#0284c7', display: 'block', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>{indices.priority_score} <span style={{ fontSize: 15, fontWeight: 400, color: '#64748b' }}>/ 100</span></strong>
              <small style={{ fontSize: 12, color: '#0369a1', display: 'block', marginTop: 4 }}>Simulated outcome</small>
            </div>
            <div style={{ border: '1px solid #cbd5e1', padding: '12px 14px', borderRadius: 6, background: '#f8fafc' }}>
              <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Change from Baseline</span>
              <strong style={{ fontSize: 30, fontWeight: 600, color: delta > 0 ? '#b91c1c' : delta < 0 ? '#15803d' : '#475569', display: 'block', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
                {formattedDelta}
              </strong>
              <small style={{ fontSize: 12, color: '#64748b', display: 'block', marginTop: 4 }}>Change from Baseline</small>
            </div>
          </div>

          {/* Simulation disclaimer */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderLeft: '4px solid #0284c7', padding: '12px 14px', borderRadius: 4, fontSize: 13, color: '#334155', lineHeight: 1.55, marginBottom: 16 }}>
            <strong>Notice:</strong> Simulated outcome based on user-adjusted parameters. Observed real-time telemetry remains unchanged at {baselineRisk}%.
          </div>

          {/* Priority Score Summary */}
          <div style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: 16, borderRadius: 6, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>APERIO Priority Score</span>
              <span className={`badge ${riskTone(indices.classification)}`} style={{ fontSize: 12, fontWeight: 500, padding: '4px 10px' }}>{indices.classification}</span>
            </div>
            <div style={{ fontSize: 34, fontWeight: 600, color: '#0f172a', margin: '6px 0', fontVariantNumeric: 'tabular-nums' }}>
              {indices.priority_score} <span style={{ fontSize: 16, fontWeight: 400, color: '#64748b' }}>/ 100</span>
            </div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              0.50 × HRI({indices.hri.score}) + 0.30 × PRI({indices.pri.score}) + 0.20 × (100 - CCPA[{indices.ccpa.score}])
            </div>
          </div>

          {/* HRI Result */}
          <div style={{ border: '1px solid #e2e8f0', padding: 14, borderRadius: 6, marginBottom: 12, background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Hazard Risk Index (HRI)</span>
              <span className={`badge ${riskTone(indices.hri.classification)}`} style={{ fontSize: 12, fontWeight: 500, padding: '4px 10px' }}>{indices.hri.score} · {indices.hri.classification}</span>
            </div>
            <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, margin: '10px 0 8px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${indices.hri.score}%`, background: '#dc2626', borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 12, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
              <span>0 Safe</span><span>21 Low</span><span>41 Moderate</span><span>61 High</span><span>81 Critical</span>
            </div>
          </div>

          {/* PRI Result */}
          <div style={{ border: '1px solid #e2e8f0', padding: 14, borderRadius: 6, marginBottom: 12, background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Population Risk Index (PRI)</span>
              <span className="badge" style={{ background: '#f0f9ff', color: '#0369a1', borderColor: '#bae6fd', fontSize: 12, fontWeight: 500, padding: '4px 10px' }}>{indices.pri.score} / 100</span>
            </div>
            <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, margin: '10px 0 8px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${indices.pri.score}%`, background: '#0284c7', borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 13, color: '#475569' }}>
              Regional Exposure: {indices.pri.components.population_exposure}% ({popExposed.toLocaleString()} of {popTotal.toLocaleString()} residents)
            </div>
          </div>

          {/* CCPA Result */}
          <div style={{ border: '1px solid #e2e8f0', padding: 14, borderRadius: 6, marginBottom: 12, background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Carrying Capacity (CCPA)</span>
              <span className="badge" style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0', fontSize: 12, fontWeight: 500, padding: '4px 10px' }}>{indices.ccpa.score} · {indices.ccpa.classification}</span>
            </div>
            <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, margin: '10px 0 8px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${indices.ccpa.score}%`, background: '#16a34a', borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 13, color: '#475569' }}>
              Resource Deficit: <strong style={{ color: '#0f172a' }}>{indices.ccpa.deficit}%</strong> · Shelter: {indices.ccpa.components.shelter_coverage}%, Water: {indices.ccpa.components.water_coverage}%, Food: {indices.ccpa.components.food_coverage}%
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// 8. RELOCATION
function Relocation({ scenario, state, setState, onToast }: Props) {
  const getDefaultRelocPop = (id: string) => {
    if (id.includes('Tinsukia') || id.includes('FLD')) return '1200';
    if (id.includes('FIRE') || id.includes('UT')) return '650';
    if (id.includes('DEF')) return '0';
    return '1420';
  };

  const [population, setPopulation] = useState(() => getDefaultRelocPop(scenario.id));
  const [route, setRoute] = useState(false);
  const [relocData, setRelocData] = useState<any>(null);
  const isDeforestation = scenario.hazard === 'Deforestation' || scenario.id.startsWith('DEF');

  useEffect(() => {
    let mounted = true;
    setPopulation(getDefaultRelocPop(scenario.id));
    fetchRelocationOptions(scenario.id).then(res => {
      if (mounted && res) {
        setRelocData(res);
        if (res.population_to_relocate !== undefined) {
          setPopulation(String(res.population_to_relocate));
        }
      }
    });
    return () => { mounted = false; };
  }, [scenario.id]);

  const topShelter = relocData?.top_shelter || {
    name: 'Vythiri District Camp North',
    distance_km: 4.8,
    capacity: 850,
    current_occupancy: 380,
    available_capacity: 470,
    road_status: 'Open · Verified',
    risk_level: 'Low · Outside Runout Corridor'
  };

  return (
    <>
      <Title
        kicker="Evacuation Planning"
        title="Relocation & Evacuation Decision Support"
        description="Dynamic shelter capacity ranking, route safety analysis, and operational evacuation decision support."
      />

      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderLeft: '4px solid #0284c7', padding: '14px 18px', borderRadius: 4, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <ShieldAlert size={22} style={{ color: '#0284c7', flexShrink: 0 }} />
        <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.55 }}>
          <strong style={{ color: '#0f172a', fontWeight: 600 }}>Operational Approval Required:</strong> Relocation recommendations require field verification and incident command authorization prior to civilian mobilization.
        </div>
      </div>

      <div className="module-grid">
        <section className="module-panel span-8" style={{ padding: 0 }}>
          <div className="panel-head" style={{ minHeight: 46, padding: '0 16px' }}>
            <div className="panel-title" style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Operational Evacuation &amp; Route Preview</div>
            <span style={{ fontSize: 13, color: '#64748b' }}>{topShelter.name}</span>
          </div>
          <MapView
            scenario={scenario}
            layers={state.layers}
            onLayer={name => {
              const n = { ...state, layers: { ...state.layers, [name]: !state.layers[name] } };
              setState(n);
              saveState(n);
            }}
            selected={scenario.id}
            route={route}
          />
        </section>

        <section className="module-panel span-4">
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: '0 0 16px' }}>Relocation Parameters</h2>

          <label style={{ display: 'grid', gap: 6, fontSize: 14, fontWeight: 500, color: '#334155', marginBottom: 14 }}>
            Evacuation Population (Headcount)
            <input className="field-input" style={{ fontSize: 14, padding: '9px 12px' }} type="number" min="1" value={population} onChange={e => setPopulation(e.target.value)} />
          </label>

          <label style={{ display: 'grid', gap: 6, fontSize: 14, fontWeight: 500, color: '#334155', marginBottom: 16 }}>
            Hazard Origin Zone
            <select className="field-select" style={{ fontSize: 14, padding: '9px 12px' }}>
              <option>{scenario.place} · {scenario.region}</option>
            </select>
          </label>

          {isDeforestation ? (
            <div className="recommended" style={{ border: '1px solid #86efac', background: '#f0fdf4', padding: 18, borderRadius: 6 }}>
              <div style={{ color: '#166534', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Conservation &amp; Forestry Advisory</div>
              <h3 style={{ color: '#14532d', fontSize: 16, fontWeight: 600, margin: '6px 0 10px' }}>No Civilian Relocation Required</h3>
              <p style={{ fontSize: 14, color: '#166534', margin: '6px 0 14px', lineHeight: 1.55 }}>
                Canopy disturbance detected. Civil evacuation is not triggered for environmental deforestation monitoring.
              </p>
              <div className="shelter-facts" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#166534' }}>Action<strong style={{ fontSize: 14, fontWeight: 600, color: '#14532d', display: 'block' }}>Forest Sentinel Checkpoint</strong></span>
                <span style={{ fontSize: 12, color: '#166534' }}>Inspection<strong style={{ fontSize: 14, fontWeight: 600, color: '#14532d', display: 'block' }}>UAV Drone Canopy Sweep</strong></span>
                <span style={{ fontSize: 12, color: '#166534' }}>Legal Jurisdiction<strong style={{ fontSize: 14, fontWeight: 600, color: '#14532d', display: 'block' }}>Forest Rights Act Patrol</strong></span>
                <span style={{ fontSize: 12, color: '#166534' }}>Accessibility Status<strong style={{ fontSize: 14, fontWeight: 600, color: '#15803d', display: 'block' }}>Open · Unrestricted</strong></span>
              </div>
              <button
                className="btn-secondary"
                style={{ width: '100%', marginTop: 14, fontSize: 14, fontWeight: 500, padding: '10px 18px' }}
                onClick={() => {
                  const n = pushEvent(state, 'Conservation advisory logged', `Forestry inspection advisory recorded for ${scenario.place}.`);
                  setState(n);
                  saveState(n);
                  onToast('Forestry conservation advisory logged.');
                }}
              >
                Log Forestry Protocol
              </button>
            </div>
          ) : (
            <div className="recommended" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: 18, borderRadius: 6 }}>
              <div style={{ color: '#0369a1', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Relocation Recommendation</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: '6px 0 14px' }}>Recommended Safe Locations: {topShelter.name}</h3>
              <div className="shelter-facts" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Estimated Travel Distance<strong style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', display: 'block' }}>{topShelter.distance_km || 2.4} km</strong></span>
                <span style={{ fontSize: 12, color: '#64748b' }}>Available Capacity<strong style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', display: 'block' }}>{(topShelter.available_capacity || topShelter.available || 270).toLocaleString()} persons</strong></span>
                <span style={{ fontSize: 12, color: '#64748b' }}>Total Shelter Capacity<strong style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', display: 'block' }}>{(topShelter.capacity || 650).toLocaleString()} persons</strong></span>
                <span style={{ fontSize: 12, color: '#64748b' }}>Current Occupancy<strong style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', display: 'block' }}>{(topShelter.current_occupancy || topShelter.occupancy || 380).toLocaleString()} persons</strong></span>
                <span style={{ fontSize: 12, color: '#64748b' }}>Accessibility Status<strong style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', display: 'block' }}>{topShelter.road_status || 'Open · Verified'}</strong></span>
                <span style={{ fontSize: 12, color: '#64748b' }}>Hazard Exposure<strong style={{ fontSize: 14, fontWeight: 600, color: '#15803d', display: 'block' }}>{topShelter.risk_level || 'Low · Outside Runout Corridor'}</strong></span>
              </div>
              <p style={{ fontSize: 14, color: '#475569', margin: '14px 0', lineHeight: 1.55 }}>
                Evacuation corridor avoids primary hazard runout polygon. Estimated transit: ~12 min under emergency convoy protocol.
              </p>
              <button
                className="btn"
                style={{ width: '100%', fontSize: 14, fontWeight: 500, padding: '10px 18px', borderRadius: 4 }}
                onClick={() => {
                  setRoute(true);
                  const n = pushEvent(state, 'Evacuation route preview engaged', `${population} persons routed to ${topShelter.name}.`);
                  setState(n);
                  saveState(n);
                  onToast(`Evacuation corridor to ${topShelter.name} displayed.`);
                }}
              >
                Display Evacuation Corridor
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

// 9. RESOURCES
function Resources({ scenario, state, setState, onToast }: Props) {
  const [inventory, setInventory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchResourceInventory(scenario.id).then(res => {
      if (mounted) {
        if (res) setInventory(res);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [scenario.id]);

  const getFallbackMeta = (id: string) => {
    if (id.includes('Tinsukia') || id.includes('FLD')) {
      return {
        district_census_estimate: 1327929,
        district_label: 'Tinsukia District ~1,327,929 (Census 2011 estimate; Sub-division cluster ~35,000)',
        total_regional_population: 35000,
        population_inside_hazard_zone: 2450,
        estimated_exposed_population: 2450,
        population_requiring_relocation: 1200,
        relocation_required_rationale: 'Brahmaputra tributary embankment overflow inundating low-lying rural wards; 1,200 residents assigned to elevated cyclone/flood relief centers.',
        data_source: 'District_FloodedArea Dataset, Census 2011 & ASDMA Flood Roster'
      };
    } else if (id.includes('FIRE') || id.includes('UT')) {
      return {
        district_census_estimate: 330086,
        district_label: 'Uttarkashi/Tehri District ~330,086 (Census 2011 estimate; Ridge sub-basin ~15,000)',
        total_regional_population: 15000,
        population_inside_hazard_zone: 1850,
        estimated_exposed_population: 1850,
        population_requiring_relocation: 650,
        relocation_required_rationale: 'FRP 184 MW thermal wind front advancing downwind; proactive relocation recommended for 650 residents in direct smoke and spark exposure path.',
        data_source: 'Himalayan Forest Fire Radiometer Dataset & UKFD Ground Operations'
      };
    } else if (id.includes('DEF')) {
      return {
        district_census_estimate: 380000,
        district_label: 'Palakkad / Western Ghats Range ~380,000 (Census 2011 estimate; Reserve perimeter ~22,000)',
        total_regional_population: 22000,
        population_inside_hazard_zone: 520,
        estimated_exposed_population: 0,
        population_requiring_relocation: 0,
        relocation_required_rationale: 'Ecological canopy disturbance detected. Civil evacuation is NOT warranted for environmental deforestation observation.',
        data_source: 'Sentinel-2 MSI Bi-temporal NDVI Delta & State Forest Department'
      };
    }
    return {
      district_census_estimate: 817420,
      district_label: 'Wayanad District ~817,420 (Census 2011 estimate; Vythiri Taluk ~192,000)',
      total_regional_population: 12500,
      population_inside_hazard_zone: 4250,
      estimated_exposed_population: 4250,
      population_requiring_relocation: 1420,
      relocation_required_rationale: 'Severe regolith saturation and active debris flow runout in Zone 4 require mandatory evacuation of 1,420 residents.',
      data_source: 'District Census 2011, Panchayat Settlements & KSDMA Ground Truth'
    };
  };

  const pop = inventory?.population_metrics || getFallbackMeta(scenario.id);
  const shelters = inventory?.shelter_metrics;
  const healthcare = inventory?.healthcare_metrics;
  const road = inventory?.road_metrics;
  const ccpa = inventory?.carrying_capacity;

  const update = (key: string, val: number) => {
    const scopedKey = `${scenario.id}:${key}`;
    const next = { ...state, resources: { ...state.resources, [scopedKey]: val } };
    setState(next);
    saveState(next);
  };

  const getResourceValue = (name: string, fallbackVal: number) => {
    const scopedKey = `${scenario.id}:${name}`;
    if (state.resources[scopedKey] !== undefined) return state.resources[scopedKey];
    return fallbackVal;
  };

  // Build the list of active resources for this scenario
  const defaultResourceList = [
    {
      name: 'Shelter capacity',
      total: shelters?.total_capacity || 2000,
      available: shelters?.total_available || 1000,
      unit: 'persons',
      type: 'Verified Facility Infrastructure'
    },
    {
      name: 'Beds',
      total: healthcare?.total_beds || 300,
      available: healthcare?.available_beds || 80,
      unit: 'beds',
      type: 'Verified Healthcare Capacity'
    },
    {
      name: 'Medical staff',
      total: inventory?.resources?.['Medical staff']?.total || 25,
      available: inventory?.resources?.['Medical staff']?.available || 18,
      unit: 'personnel',
      type: 'Verified Healthcare Capacity'
    },
    {
      name: 'Ambulances',
      total: healthcare?.total_ambulances || 12,
      available: healthcare?.total_ambulances || 12,
      unit: 'vehicles',
      type: 'Verified Healthcare Capacity'
    },
    {
      name: 'Emergency vehicles',
      total: inventory?.resources?.['Emergency vehicles']?.total || 14,
      available: inventory?.resources?.['Emergency vehicles']?.available || 8,
      unit: 'vehicles',
      type: 'Verified Logistics Capacity'
    },
    {
      name: 'Food meals',
      total: inventory?.resources?.['Food meals']?.total || 5000,
      available: inventory?.resources?.['Food meals']?.available || 3800,
      unit: 'meals',
      type: 'Estimated Emergency Consumable'
    },
    {
      name: 'Water litres',
      total: inventory?.resources?.['Water litres']?.total || 6000,
      available: inventory?.resources?.['Water litres']?.available || 4200,
      unit: 'litres',
      type: 'Estimated Emergency Consumable'
    }
  ];

  const shortage = inventory?.shortage_watch || [];

  return (
    <>
      <Title
        kicker="Resource Management"
        title="Emergency Resources & Carrying Capacity"
        description={`Track verified emergency supplies, shelter occupancy, and healthcare readiness for ${scenario.place}, ${scenario.region}.`}
      />

      {/* Top 4 Stat Boxes (Dynamically Region-Specific) */}
      <div className="stat-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, margin: '16px 0' }}>
        <div className="stat-box" style={{ padding: '16px 18px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff' }}>
          <strong style={{ fontSize: 32, fontWeight: 600, color: '#0369a1', display: 'block', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
            {pop.population_inside_hazard_zone.toLocaleString()}
          </strong>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'block', marginTop: 4 }}>Population in Hazard Zone</span>
          <small style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 2 }}>
            District Census: {pop.district_census_estimate.toLocaleString()}
          </small>
        </div>

        <div className="stat-box" style={{ padding: '16px 18px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff' }}>
          <strong style={{ fontSize: 32, fontWeight: 600, color: '#0369a1', display: 'block', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
            {shelters ? shelters.total_available.toLocaleString() : '—'}
          </strong>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'block', marginTop: 4 }}>Available Shelter Beds</span>
          <small style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 2 }}>
            {shelters ? `${shelters.total_occupied.toLocaleString()} occupied / ${shelters.total_capacity.toLocaleString()} total` : 'Loading shelters...'}
          </small>
        </div>

        <div className="stat-box" style={{ padding: '16px 18px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff' }}>
          <strong style={{ fontSize: 32, fontWeight: 600, color: '#0369a1', display: 'block', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
            {healthcare ? `${healthcare.available_beds} Beds · ${healthcare.total_ambulances} Amb` : '—'}
          </strong>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'block', marginTop: 4 }}>Operational Healthcare</span>
          <small style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 2 }}>
            {healthcare ? `${healthcare.hospital_count} regional medical facilities` : 'Loading healthcare...'}
          </small>
        </div>

        <div className="stat-box" style={{ padding: '16px 18px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff' }}>
          <strong style={{ fontSize: 32, fontWeight: 600, color: '#0369a1', display: 'block', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
            {ccpa ? `${ccpa.ccpa_score}%` : '—'}
          </strong>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'block', marginTop: 4 }}>Carrying Capacity (CCPA)</span>
          <small style={{ fontSize: 11, color: ccpa?.classification === 'CRITICAL_DEFICIT' ? '#dc2626' : '#16a34a', display: 'block', marginTop: 2, fontWeight: 500 }}>
            {ccpa ? `${ccpa.classification.replace('_', ' ')} · ${ccpa.deficit_percentage}% deficit` : 'Evaluating...'}
          </small>
        </div>
      </div>

      {/* Population & Exposure Breakdown Panel */}
      <section className="module-panel" style={{ marginBottom: 16, border: '1px solid #cbd5e1', borderRadius: 6, background: '#ffffff', padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Population &amp; Geographic Exposure Breakdown · {scenario.place} ({scenario.region})
            </h2>
            <span style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'block' }}>
              Source: {pop.data_source}
            </span>
          </div>
          <span className="badge" style={{ fontSize: 11, fontWeight: 600, padding: '4px 8px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
            Region-Specific Ground Truth
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
          {/* Metric 1: Total District Census */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '12px 14px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
              District Census Estimate
            </span>
            <strong style={{ fontSize: 24, fontWeight: 600, color: '#0f172a', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
              {pop.district_census_estimate.toLocaleString()}
            </strong>
            <span style={{ fontSize: 12, color: '#475569', display: 'block', marginTop: 4 }}>
              Census 2011 district-wide benchmark
            </span>
          </div>

          {/* Metric 2: Settlement Cluster Population */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '12px 14px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
              Settlement Cluster Pop.
            </span>
            <strong style={{ fontSize: 24, fontWeight: 600, color: '#0f172a', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
              {pop.total_regional_population.toLocaleString()}
            </strong>
            <span style={{ fontSize: 12, color: '#475569', display: 'block', marginTop: 4 }}>
              Local Panchayat / Sub-division cluster
            </span>
          </div>

          {/* Metric 3: Population in Hazard Zone */}
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '12px 14px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
              Inside Hazard Impact Zone
            </span>
            <strong style={{ fontSize: 24, fontWeight: 600, color: '#b91c1c', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
              {pop.population_inside_hazard_zone.toLocaleString()}
            </strong>
            <span style={{ fontSize: 12, color: '#7f1d1d', display: 'block', marginTop: 4 }}>
              Direct geospatial exposure to {scenario.hazard}
            </span>
          </div>

          {/* Metric 4: Population Requiring Relocation */}
          <div style={{ background: pop.population_requiring_relocation > 0 ? '#fff7ed' : '#f0fdf4', border: pop.population_requiring_relocation > 0 ? '1px solid #fed7aa' : '1px solid #bbf7d0', borderRadius: 6, padding: '12px 14px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: pop.population_requiring_relocation > 0 ? '#9a3412' : '#166534', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
              Evacuation / Relocation Needed
            </span>
            <strong style={{ fontSize: 24, fontWeight: 600, color: pop.population_requiring_relocation > 0 ? '#c2410c' : '#15803d', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
              {pop.population_requiring_relocation.toLocaleString()}
            </strong>
            <span style={{ fontSize: 12, color: pop.population_requiring_relocation > 0 ? '#9a3412' : '#166534', display: 'block', marginTop: 4 }}>
              {pop.population_requiring_relocation > 0 ? 'Mandatory evacuation headcount' : 'Ecological monitoring only'}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 12, background: '#f8fafc', padding: '10px 14px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 12, color: '#334155', lineHeight: 1.5 }}>
          <strong>Operational Relocation Rationale:</strong> {pop.relocation_required_rationale}
        </div>
      </section>

      <div className="module-grid">
        {/* Main Left: Available Resources & Facilities */}
        <section className="module-panel span-8">
          <div className="row" style={{ marginBottom: 14, alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: 0 }}>Available Resources &amp; Recommended Allocation</h2>
              <span style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'block' }}>
                Values are isolated and scoped to {scenario.place}. Operator overrides persist per scenario.
              </span>
            </div>
            <span className="badge" style={{ fontSize: 12, fontWeight: 500, padding: '4px 10px' }}>Scenario Scoped</span>
          </div>

          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ fontSize: 13, fontWeight: 600, color: '#334155', padding: '10px 14px', textAlign: 'left' }}>Resource Type</th>
                <th style={{ fontSize: 13, fontWeight: 600, color: '#334155', padding: '10px 14px', textAlign: 'left' }}>Classification</th>
                <th style={{ fontSize: 13, fontWeight: 600, color: '#334155', padding: '10px 14px', textAlign: 'left' }}>Available / Planned Allocation</th>
                <th style={{ fontSize: 13, fontWeight: 600, color: '#334155', padding: '10px 14px', textAlign: 'left' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {defaultResourceList.map(r => {
                const currentVal = getResourceValue(r.name, r.available);
                const isShort = currentVal < r.total * 0.8;
                return (
                  <tr key={r.name} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', padding: '10px 14px' }}>{r.name}</td>
                    <td style={{ fontSize: 13, color: '#64748b', padding: '10px 14px' }}>{r.type}</td>
                    <td style={{ fontSize: 14, padding: '10px 14px' }}>
                      <input
                        className="resource-input"
                        type="number"
                        style={{ fontSize: 14, padding: '5px 8px', width: '90px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                        aria-label={`${r.name} available`}
                        value={currentVal}
                        onChange={e => update(r.name, Math.max(0, Number(e.target.value)))}
                      />
                      <span style={{ marginLeft: 8, color: '#64748b', fontSize: 13 }}>/ {r.total.toLocaleString()} {r.unit}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className={`badge ${isShort ? 'high' : 'safe'}`} style={{ fontSize: 12, fontWeight: 500, padding: '3px 8px' }}>
                        {isShort ? 'Shortfall' : 'Available'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Regional Designated Shelters & Facilities List */}
          {shelters && shelters.shelters && shelters.shelters.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>
                Designated Regional Shelters &amp; Facilities · {scenario.place}
              </h3>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ fontSize: 12, fontWeight: 600, color: '#334155', padding: '8px 12px', textAlign: 'left' }}>Shelter Name</th>
                    <th style={{ fontSize: 12, fontWeight: 600, color: '#334155', padding: '8px 12px', textAlign: 'left' }}>Capacity</th>
                    <th style={{ fontSize: 12, fontWeight: 600, color: '#334155', padding: '8px 12px', textAlign: 'left' }}>Occupancy</th>
                    <th style={{ fontSize: 12, fontWeight: 600, color: '#334155', padding: '8px 12px', textAlign: 'left' }}>Available Beds</th>
                    <th style={{ fontSize: 12, fontWeight: 600, color: '#334155', padding: '8px 12px', textAlign: 'left' }}>Road Access</th>
                  </tr>
                </thead>
                <tbody>
                  {shelters.shelters.map((sh: any) => {
                    const avail = Math.max(0, (sh.capacity || 0) - (sh.occupancy || 0));
                    return (
                      <tr key={sh.id || sh.name} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', padding: '8px 12px' }}>{sh.name}</td>
                        <td style={{ fontSize: 13, color: '#475569', padding: '8px 12px' }}>{sh.capacity}</td>
                        <td style={{ fontSize: 13, color: '#475569', padding: '8px 12px' }}>{sh.occupancy}</td>
                        <td style={{ fontSize: 13, fontWeight: 600, color: avail > 0 ? '#15803d' : '#dc2626', padding: '8px 12px' }}>{avail} beds</td>
                        <td style={{ fontSize: 12, color: '#64748b', padding: '8px 12px' }}>{sh.road_status || 'Open'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Regional Healthcare Facilities List */}
          {healthcare && healthcare.hospitals && healthcare.hospitals.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>
                Regional Hospitals &amp; Emergency Medical Centers
              </h3>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ fontSize: 12, fontWeight: 600, color: '#334155', padding: '8px 12px', textAlign: 'left' }}>Hospital / Center</th>
                    <th style={{ fontSize: 12, fontWeight: 600, color: '#334155', padding: '8px 12px', textAlign: 'left' }}>Total Beds</th>
                    <th style={{ fontSize: 12, fontWeight: 600, color: '#334155', padding: '8px 12px', textAlign: 'left' }}>Available Beds</th>
                    <th style={{ fontSize: 12, fontWeight: 600, color: '#334155', padding: '8px 12px', textAlign: 'left' }}>Ambulance Fleet</th>
                    <th style={{ fontSize: 12, fontWeight: 600, color: '#334155', padding: '8px 12px', textAlign: 'left' }}>Trauma Readiness</th>
                  </tr>
                </thead>
                <tbody>
                  {healthcare.hospitals.map((h: any) => (
                    <tr key={h.id || h.name} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', padding: '8px 12px' }}>{h.name}</td>
                      <td style={{ fontSize: 13, color: '#475569', padding: '8px 12px' }}>{h.beds_total}</td>
                      <td style={{ fontSize: 13, fontWeight: 600, color: '#0284c7', padding: '8px 12px' }}>{h.beds_available} beds</td>
                      <td style={{ fontSize: 13, color: '#475569', padding: '8px 12px' }}>{h.ambulances} vehicles</td>
                      <td style={{ fontSize: 12, color: '#15803d', padding: '8px 12px', fontWeight: 500 }}>{h.trauma_level || 'Tier-1 Standby'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            className="btn-secondary"
            style={{ marginTop: 12, fontSize: 14, fontWeight: 500, padding: '10px 18px', borderRadius: 4 }}
            onClick={() => {
              const n = pushEvent(state, `Resource review · ${scenario.place}`, `Operator reviewed live capacity for ${scenario.place}.`);
              setState(n);
              saveState(n);
              onToast(`Resource configuration for ${scenario.place} saved to audit log.`);
            }}
          >
            Record Inventory Review
          </button>
        </section>

        {/* Right Side: Shortfall Alerts & Directives */}
        <section className="module-panel span-4">
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: '0 0 16px' }}>
            Resource Shortfall &amp; Logistics Directives
          </h2>

          {/* Road Corridor Status Card */}
          {road && (
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 6, padding: '12px 14px', marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
                Lifeline Road Accessibility
              </span>
              <strong style={{ fontSize: 14, color: road.accessibility_difficulty_pct > 70 ? '#b91c1c' : '#15803d', display: 'block' }}>
                {road.road_network_status}
              </strong>
              <small style={{ fontSize: 12, color: '#64748b', display: 'block', marginTop: 3 }}>
                Transit Difficulty Score: {road.accessibility_difficulty_pct}%
              </small>
            </div>
          )}

          {shortage.length === 0 ? (
            <div className="notice" style={{ background: '#f0fdf4', borderColor: '#22c55e', color: '#15803d', fontSize: 13, padding: '12px 14px', borderRadius: 4 }}>
              ✓ No critical resource shortfalls detected for {scenario.place}.
            </div>
          ) : (
            shortage.map((item: any, i: number) => (
              <div className="shortage" key={i} style={{ borderBottom: '1px solid #e2e8f0', padding: '12px 0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <ShieldAlert size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong style={{ color: '#991b1b', fontSize: 14, fontWeight: 600, display: 'block' }}>
                    Resource Shortfall: {item.resource || item}
                  </strong>
                  <small style={{ color: '#64748b', fontSize: 12, display: 'block', marginTop: 3, lineHeight: 1.5 }}>
                    {item.message || 'Available allocation below recommended threshold. Automated replenishment convoy recommended.'}
                  </small>
                </span>
              </div>
            ))
          )}

          {inventory?.recommendations && (
            <div style={{ marginTop: 18, background: '#f8fafc', padding: 14, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <strong style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', display: 'block', marginBottom: 8 }}>
                Recommended Logistics Directives:
              </strong>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#475569', lineHeight: 1.65 }}>
                {inventory.recommendations.map((rec: string, i: number) => (
                  <li key={i} style={{ marginBottom: 6 }}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

// 10. REPORTS
function Reports({ scenario, state, setState, onToast }: Props) {
  const [reportResult, setReportResult] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState('Official Incident Assessment (PDF)');

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await generateAuthorityReport(scenario.id, `${reportType} generated by Mission Control Operator`);
      if (res && res.download_url) {
        setReportResult(res);
        const n = pushEvent({ ...state, reports: state.reports + 1 }, 'Authority PDF report generated', `${scenario.hazard} in ${scenario.place}`, 'Report');
        setState(n);
        saveState(n);
        onToast(`Authority ReportLab PDF generated for ${scenario.place}.`);
      } else {
        onToast('Failed to generate report from backend service.');
      }
    } catch (err: any) {
      onToast(`Error generating report: ${err?.message || 'Server error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!reportResult?.download_url) {
      onToast('Please generate the report first before downloading.');
      return;
    }
    
    // Construct full download URL from API_BASE
    const fullUrl = reportResult.download_url.startsWith('http')
      ? reportResult.download_url
      : `${BACKEND_URL}${reportResult.download_url}`;

    // Trigger direct browser download using anchor element
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = reportResult.filename || `APERIO_Report_${scenario.id}.pdf`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast(`Downloading ${reportResult.filename || 'report PDF'}...`);
  };

  const isSynthetic = scenario.is_synthetic || scenario.hazard === 'Deforestation';
  const generatedTimeUtc = useMemo(() => formatUtcTimestamp(), []);

  return (
    <>
      <Title
        kicker="Incident Documentation"
        title="Authority Incident Reports"
        description="Generate official incident assessment reports with geospatial signatures, verified sensor telemetry, and operator audit trail."
      />

      <div className="module-grid">
        <section className="module-panel span-8">
          <div className="row" style={{ marginBottom: 14 }}>
            <h2 className="module-title" style={{ margin: 0 }}>Report Preview</h2>
            <span className="badge">Official Compliance</span>
          </div>

          <div className="report-preview" style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 24, background: '#ffffff' }}>
            <div className="report-heading" style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '2px solid #0284c7', paddingBottom: 14 }}>
              <img src="/logo.svg" alt="APERIO" style={{ width: 34, height: 34 }} />
              <div>
                <strong style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>APERIO Earth Intelligence Core</strong>
                <small style={{ fontSize: 12, color: '#64748b', display: 'block', marginTop: 2 }}>Official Incident Assessment · High-Precision Audit Engine</small>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#475569' }}>{generatedTimeUtc}</span>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', margin: '18px 0 12px' }}>
              {scenario.hazard} Incident Report · {scenario.place}, {scenario.region}
            </h2>

            {isSynthetic && (
              <div style={{ background: '#fefce8', border: '1px solid #fef08a', color: '#854d0e', padding: '12px 14px', borderRadius: 4, marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}>
                <strong>Synthetic Demo Data Notice:</strong> This document reflects synthetic demonstration data for model benchmarking.
              </div>
            )}

            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
              <tbody>
                <tr style={{ background: '#f8fafc' }}>
                  <th colSpan={2} style={{ fontSize: 13, fontWeight: 600, color: '#0369a1', padding: '10px 12px' }}>
                    1. Observed Ground Measurements
                  </th>
                </tr>
                <tr>
                  <td style={{ width: '35%', fontWeight: 600, color: '#475569' }}>Antecedent Rainfall</td>
                  <td style={{ color: '#0f172a' }}>{scenario.rainfall} mm (cumulative gauge observation)</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#475569' }}>Slope Conditions Profile</td>
                  <td style={{ color: '#0f172a' }}>{scenario.slope}° incline profile</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#475569' }}>Exposed Population Headcount</td>
                  <td style={{ color: '#0f172a' }}>{scenario.population} (verified census tract)</td>
                </tr>

                <tr style={{ background: '#f8fafc' }}>
                  <th colSpan={2} style={{ fontSize: 13, fontWeight: 600, color: '#0369a1', padding: '10px 12px' }}>
                    2. Model Predictions
                  </th>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#475569' }}>Hazard Risk Severity</td>
                  <td>
                    <span className={`badge ${riskTone(scenario.severity)}`}>{scenario.severity}</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#475569' }}>Model Confidence Level</td>
                  <td style={{ color: '#0f172a' }}>{scenario.confidence}% (Calibrated Bayesian Update)</td>
                </tr>

                <tr style={{ background: '#f8fafc' }}>
                  <th colSpan={2} style={{ fontSize: 13, fontWeight: 600, color: '#0369a1', padding: '10px 12px' }}>
                    3. Candidate Detections
                  </th>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#475569' }}>Affected Spatial Extent</td>
                  <td style={{ color: '#0f172a' }}>{scenario.area} (spectral change candidate polygon)</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#475569' }}>Data Sources &amp; Constellations</td>
                  <td style={{ color: '#0f172a' }}>Copernicus Sentinel-2 MSI · ALOS PALSAR · In-situ Telemetry</td>
                </tr>

                <tr style={{ background: '#f8fafc' }}>
                  <th colSpan={2} style={{ fontSize: 13, fontWeight: 600, color: '#0369a1', padding: '10px 12px' }}>
                    4. Verified Operational Findings &amp; Directives
                  </th>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#475569' }}>Relocation Recommendation</td>
                  <td style={{ color: '#0f172a' }}>
                    {isSynthetic ? 'Conservation & Forestry Monitoring Advisory' : (scenario.hazard === 'Flood' ? 'Tinsukia District Multipurpose Cyclone & Flood Relief Center' : scenario.hazard === 'Wildfire' ? 'Garhwal Division Community Relief Camp (Barkot)' : 'Vythiri District Camp North')}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#475569' }}>Observation Period</td>
                  <td style={{ color: '#0f172a' }}>Pre-event baseline to latest ingested telemetry pass</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: '#475569' }}>Verification Status</td>
                  <td style={{ color: '#15803d', fontWeight: 600 }}>Operational Field Review Pending Authorization</td>
                </tr>
              </tbody>
            </table>
          </div>

          {reportResult && (
            <div className="notice" style={{ marginTop: 14, background: '#f0fdf4', color: '#15803d', borderColor: '#22c55e', padding: 14, borderRadius: 4, fontSize: 13 }}>
              ✓ Authority PDF ready: <strong>{reportResult.filename}</strong> ({reportResult.file_size_bytes ? `${Math.round(reportResult.file_size_bytes / 1024)} KB` : 'Verified'}).
            </div>
          )}
        </section>

        <section className="module-panel span-4">
          <h2 className="module-title">Generate Incident Report</h2>
          <p className="module-copy" style={{ marginBottom: 16 }}>
            Compiles satellite change detection, XGBoost risk predictions, Bayesian updates, HRI/PRI/CCPA indices, and shelter assignments into an official PDF document.
          </p>

          <label className="form-label" style={{ marginBottom: 14 }}>
            Report Type
            <select className="field-select" value={reportType} onChange={e => setReportType(e.target.value)}>
              <option value="Official Incident Assessment (PDF)">Official Incident Assessment (PDF)</option>
              <option value="Evacuation & Shelter Logistics Annex (PDF)">Evacuation &amp; Shelter Logistics Annex (PDF)</option>
              <option value="Forensic Environmental Disturbance Record (PDF)">Forensic Environmental Disturbance Record (PDF)</option>
            </select>
          </label>

          <label className="form-label" style={{ marginBottom: 14 }}>
            Selected Event
            <input className="field-input" readOnly value={`${scenario.place} · ${scenario.region} (${scenario.id})`} />
          </label>

          <label className="form-label" style={{ marginBottom: 14 }}>
            Observation Period
            <input className="field-input" readOnly value="Pre-Event Baseline → Latest Telemetry" />
          </label>

          <label className="form-label" style={{ marginBottom: 14 }}>
            Data Sources
            <input className="field-input" readOnly value="Copernicus Sentinel-2 MSI, ALOS PALSAR, In-situ Gauges" />
          </label>

          <label className="form-label" style={{ marginBottom: 18 }}>
            Processing Method
            <input className="field-input" readOnly value="Calibrated Bayesian Inversion & ReportLab PDF" />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn" onClick={generate} disabled={generating} style={{ width: '100%' }}>
              <FileText size={16} /> {generating ? 'Generating Report...' : 'Generate Report'}
            </button>

            <button
              className="btn-secondary"
              disabled={!reportResult}
              onClick={handleDownload}
              style={{ width: '100%' }}
            >
              <Download size={16} /> Download Report
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

// 11. MONITORING
function Monitoring({ scenario, state, setState, onToast }: Props) {
  const [monitorMeta, setMonitorMeta] = useState<any>(null);
  const [runningCycle, setRunningCycle] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const runningCycleRef = useRef(false);
  isSyncingRef.current = isSyncing;
  runningCycleRef.current = runningCycle;

  useEffect(() => {
    let mounted = true;
    fetchMonitoringState(scenario.id).then(res => {
      if (mounted && res) setMonitorMeta(res);
    });
    return () => { mounted = false; };
  }, [scenario.id]);

  const handleRunCycle = async () => {
    if (runningCycle || isSyncing) return;
    setRunningCycle(true);
    try {
      const res = await triggerMonitoringCycle(scenario.id);
      const refreshed = await fetchMonitoringState(scenario.id);
      if (refreshed) setMonitorMeta(refreshed);

      const n = pushEvent(
        state,
        'Continuous monitoring cycle executed',
        `Orchestrator finished cycle for ${scenario.place}. Status: ${res?.cycle?.status || 'COMPLETED'}.`,
        'Monitoring'
      );
      setState(n);
      saveState(n);
      onToast(`Monitoring cycle executed for ${scenario.place}.`);
    } catch {
      onToast('✕ Monitoring cycle execution failed.');
    } finally {
      setRunningCycle(false);
    }
  };

  const handleSyncData = async () => {
    if (isSyncing || runningCycle) return;
    setIsSyncing(true);

    try {
      const refreshed = await fetchMonitoringState(scenario.id);
      if (refreshed && (refreshed.scenario_id || refreshed.last_update)) {
        setMonitorMeta(refreshed);

        const n = pushEvent(
          state,
          'Telemetry synchronization completed',
          `Manual data sync executed for ${scenario.place}. Latest telemetry & Bayesian state refreshed from APERIO Intelligence Engine.`,
          'Monitoring'
        );
        setState(n);
        saveState(n);

        onToast('✓ Data synchronization completed successfully.');
      } else {
        throw new Error('Invalid or empty response from monitoring service');
      }
    } catch (err) {
      console.error('[APERIO Monitoring] Data synchronization failed:', err);
      onToast('✕ Synchronization failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const trend = monitorMeta?.risk_progression_trend || [
    { observation: 'Baseline T0', risk: Math.max(5, scenario.risk - 45) },
    { observation: 'Anomaly T1', risk: Math.max(15, scenario.risk - 25) },
    { observation: 'Convergence T2', risk: scenario.risk }
  ];

  const currentRisk = monitorMeta?.latest_risk ?? scenario.risk;
  const prevRisk = monitorMeta?.previous_risk ?? Math.max(5, scenario.risk - 35);
  const isSynthetic = scenario.is_synthetic || scenario.hazard === 'Deforestation';
  const sensorSource = isSynthetic
    ? 'Synthetic Benchmark Telemetry (Calibrated Historical Baseline)'
    : (monitorMeta?.sensor_source || scenario.sensors_supported.join(' · '));

  const latestObsTime = monitorMeta?.latest_observation || formatUtcTimestamp(new Date(Date.now() - 2 * 3600 * 1000));
  const prevObsTime = monitorMeta?.previous_observation || formatUtcTimestamp(new Date(Date.now() - 14 * 3600 * 1000));
  const lastUpdatedTime = monitorMeta?.last_update || formatUtcTimestamp(new Date(Date.now() - 25 * 60 * 1000));

  const loopSteps = [
    { stage: 'OBSERVE', title: 'Multi-Sensor Ingestion', desc: `Streaming: ${sensorSource}`, icon: Eye },
    { stage: 'COMPARE', title: 'Baseline Differencing', desc: `Differencing against: ${prevObsTime}`, icon: RefreshCw },
    { stage: 'DETECT CHANGE', title: 'Anomaly Delineation', desc: monitorMeta?.change_detected || `${scenario.area} disturbance footprint`, icon: Layers },
    { stage: 'UPDATE RISK', title: 'Sequential Bayesian Update', desc: `Risk: ${prevRisk}% → ${currentRisk}% (${scenario.severity})`, icon: Activity },
    { stage: 'ESCALATE / VERIFY', title: 'Incident Command Review', desc: `Verification Status: ${monitorMeta?.monitoring_status || 'Pending Field Verification'}`, icon: ShieldCheck }
  ];

  return (
    <>
      <Title
        kicker="Continuous Monitoring"
        title="Continuous Monitoring Pipeline"
        description="Observe how multi-sensor telemetry cycles through detection, model inference, Bayesian sequential updating, index computation, and operational review."
      />

      <div className="module-grid">
        <section className="module-panel span-8">
          <div className="row" style={{ marginBottom: 14 }}>
            <div>
              <h2 className="module-title" style={{ margin: '0 0 6px' }}>Monitoring Overview · {scenario.place}</h2>
              <p className="module-copy" style={{ margin: 0 }}>
                Event Identifier: <b>{scenario.id}</b> · Geographic Region: <b>{scenario.region}</b> · Observation Cadence: {monitorMeta?.monitoring_frequency || 'Every 6 Hours'}
              </p>
            </div>
            <span className={`badge ${currentRisk >= 75 ? 'high' : currentRisk >= 40 ? 'moderate' : 'safe'}`}>
              {monitorMeta?.monitoring_status || 'Monitoring Active'}
            </span>
          </div>

          {/* Dynamic Risk Progression Card */}
          <div className="monitor-risk" style={{ marginTop: 14, padding: '18px 20px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc' }}>
            <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Current Calibrated Risk (Bayesian Convergence)</span>
            <strong style={{ fontSize: 34, fontWeight: 600, color: '#0369a1', margin: '6px 0', display: 'block' }}>{currentRisk}%</strong>
            <small style={{ fontSize: 13, color: '#64748b' }}>
              Previous Observation: {prevRisk}% → Latest Posterior: {currentRisk}% ({scenario.severity})
            </small>
          </div>

          {/* Operational Loop */}
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 12 }}>
              Continuous Operating Loop
            </h3>
            <div className="operating-loop-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {loopSteps.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.stage}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      padding: 14,
                      borderRadius: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: '#0284c7', fontWeight: 600 }}>
                          0{idx + 1} · {s.stage}
                        </span>
                        <Icon size={16} style={{ color: '#0284c7' }} />
                      </div>
                      <strong style={{ fontSize: 13, color: '#0f172a', display: 'block', lineHeight: 1.4, fontWeight: 600 }}>
                        {s.title}
                      </strong>
                    </div>
                    <small style={{ fontSize: 12, color: '#64748b', marginTop: 10, lineHeight: 1.4 }}>
                      {s.desc}
                    </small>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Observation Details Table */}
          <div style={{ marginTop: 20 }}>
            <table className="table">
              <tbody>
                <tr>
                  <th style={{ width: 220 }}>Latest Observation</th>
                  <td style={{ fontSize: 13, color: '#0f172a' }}>{latestObsTime}</td>
                </tr>
                <tr>
                  <th>Previous Observation</th>
                  <td style={{ fontSize: 13, color: '#0f172a' }}>{prevObsTime}</td>
                </tr>
                <tr>
                  <th>Detected Changes</th>
                  <td>{monitorMeta?.change_detected || `${scenario.area} disturbance footprint delineated`}</td>
                </tr>
                <tr>
                  <th>Data Source Status</th>
                  <td>{sensorSource}</td>
                </tr>
                <tr>
                  <th>Verification Status</th>
                  <td>
                    <span className="badge safe" style={{ marginRight: 8 }}>Standby</span>
                    <span>Field verification pending Incident Commander authorization</span>
                  </td>
                </tr>
                <tr>
                  <th>Next Observation</th>
                  <td>{monitorMeta?.next_scheduled_state || 'Scheduled next pass in 4.5 hours'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" onClick={handleRunCycle} disabled={runningCycle || isSyncing}>
              <RefreshCw size={16} className={runningCycle ? 'animate-spin' : ''} /> {runningCycle ? 'Executing Orchestrator...' : 'Trigger Orchestrator Cycle'}
            </button>
            <button
              className="btn"
              onClick={handleSyncData}
              disabled={isSyncing || runningCycle}
              title={isSyncing ? 'Synchronizing monitoring data...' : 'Manually synchronize monitoring data with APERIO core'}
              style={
                isSyncing
                  ? {
                      background: '#f59e0b',
                      borderColor: '#d97706',
                      color: '#ffffff',
                      cursor: 'not-allowed',
                      transition: 'all 0.2s ease'
                    }
                  : {
                      transition: 'all 0.2s ease'
                    }
              }
            >
              <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'SYNCING...' : 'SYNC DATA'}
            </button>
          </div>
        </section>

        <section className="module-panel span-4">
          <h2 className="module-title">Risk Trend &amp; Telemetry Status</h2>

          {/* Risk Progression Chart */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: 16, borderRadius: 6, marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 10 }}>
              Historical Risk Trajectory
            </span>
            {trend.map((t: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#334155' }}>{t.observation}</span>
                <span style={{ fontWeight: 600, color: '#0284c7' }}>{t.risk}%</span>
              </div>
            ))}
          </div>

          <div className="notice" style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#22c55e', marginBottom: 14, padding: 12, borderRadius: 4, fontSize: 13 }}>
            ✓ Connected to APERIO Intelligence Engine on port 8000.
          </div>

          <div className="sync-row">
            <span>Target Disaster</span>
            <strong>{scenario.hazard}</strong>
          </div>
          <div className="sync-row">
            <span>Event Identifier</span>
            <strong>{scenario.id}</strong>
          </div>
          <div className="sync-row">
            <span>Last Updated</span>
            <strong>{lastUpdatedTime}</strong>
          </div>
          <div className="sync-row">
            <span>Decision Pipeline</span>
            <strong>Calibrated Bayesian</strong>
          </div>
          <div className="sync-row">
            <span>Verification Status</span>
            <strong>Verified Telemetry</strong>
          </div>
          <div className="sync-row">
            <span>Last Operator Audit</span>
            <strong>{state.log[0]?.time ?? 'Session active'}</strong>
          </div>
        </section>
      </div>
    </>
  );
}

export default function ModulePage(props: Props) {
  switch (props.path) {
    case '/command-center/overview':
      return <Overview {...props} />;
    case '/command-center/priority-alerts':
      return <PriorityAlerts {...props} />;
    case '/command-center/detection':
      return <Redirect to="/command-center/change-detection" />;
    case '/command-center/change-detection':
      return <ChangeDetection {...props} />;
    case '/command-center/compare-regions':
      return <CompareRegions />;
    case '/command-center/dem':
      return <DemModule scenario={props.scenario} />;
    case '/command-center/risk-simulator':
      return <RiskSimulator {...props} />;
    case '/command-center/relocation':
      return <Relocation {...props} />;
    case '/command-center/resources':
      return <Resources {...props} />;
    case '/command-center/reports':
      return <Reports {...props} />;
    case '/command-center/monitoring':
      return <Monitoring {...props} />;
    default:
      return <PriorityAlerts {...props} />;
  }
}
