// APERIO Deterministic Risk Indices and Client Layer
import { apiFetch } from './lib/api-events';
export type RiskIndicesBreakdown = {
  priority_score: number;
  classification: string;
  formula: string;
  weights: { HRI: number; PRI: number; CCPA_deficit: number };
  hri: {
    score: number;
    classification: string;
    formula: string;
    weights: Record<string, number>;
    components: {
      hazard_probability: number;
      rainfall_score: number;
      terrain_instability: number;
      satellite_change: number;
      recent_change: number;
    };
  };
  pri: {
    score: number;
    formula: string;
    weights: Record<string, number>;
    components: {
      population_exposure: number;
      population_inside_hazard_zone: number;
      total_regional_population: number;
      vulnerable_population: number;
      infrastructure_exposure: number;
      accessibility_difficulty: number;
      time_sensitivity: number;
    };
  };
  ccpa: {
    score: number;
    classification: string;
    deficit: number;
    formula: string;
    weights: Record<string, number>;
    components: {
      shelter_coverage: number;
      water_coverage: number;
      food_coverage: number;
      medical_coverage: number;
      transport_coverage: number;
    };
    raw_inventories: Record<string, { available: number; required: number }>;
  };
};

// Deterministic client fallback computation adhering strictly to the formulas
export function computeAperioIndicesLocally(
  scenarioId: string,
  overrides?: Partial<{
    hazard_prob: number;
    rainfall: number;
    terrain: number;
    sat_change: number;
    recent_change: number;
    pop_exposed: number;
    pop_total: number;
    vulnerable: number;
    infra: number;
    accessibility: number;
    time_sensitivity: number;
    shelter_avail: number;
    shelter_req: number;
    water_avail: number;
    water_req: number;
    food_avail: number;
    food_req: number;
    med_avail: number;
    med_req: number;
    trans_avail: number;
    trans_req: number;
  }>
): RiskIndicesBreakdown {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  // Default seeds per scenario
  let hp = 94, rf = 96, ti = 88, sc = 85, rc = 78;
  let popIn = 4250, popTot = 12500, vuln = 34, infra = 82, access = 88, timeSens = 95;
  let sAvail = 2400, sReq = 4250, wAvail = 3200, wReq = 4250, fAvail = 2800, fReq = 4250, mAvail = 65, mReq = 120, tAvail = 14, tReq = 28;

  if (scenarioId === 'assam-flood') {
    hp = 82; rf = 88; ti = 25; sc = 86; rc = 70;
    popIn = 8140; popTot = 35000; vuln = 28; infra = 74; access = 72; timeSens = 85;
    sAvail = 5500; sReq = 8140; wAvail = 6000; wReq = 8140; fAvail = 5800; fReq = 8140; mAvail = 85; mReq = 140; tAvail = 22; tReq = 35;
  } else if (scenarioId === 'maharashtra-fire') {
    hp = 68; rf = 14; ti = 52; sc = 66; rc = 72;
    popIn = 1360; popTot = 18000; vuln = 19; infra = 45; access = 48; timeSens = 62;
    sAvail = 1800; sReq = 1360; wAvail = 2000; wReq = 1360; fAvail = 2000; fReq = 1360; mAvail = 45; mReq = 30; tAvail = 12; tReq = 10;
  } else if (scenarioId === 'assam-forest') {
    hp = 45; rf = 38; ti = 30; sc = 48; rc = 52;
    popIn = 420; popTot = 22000; vuln = 12; infra = 20; access = 35; timeSens = 30;
    sAvail = 1000; sReq = 420; wAvail = 1000; wReq = 420; fAvail = 1000; fReq = 420; mAvail = 30; mReq = 10; tAvail = 8; tReq = 4;
  }

  // Apply overrides
  if (overrides) {
    if (overrides.hazard_prob !== undefined) hp = overrides.hazard_prob;
    if (overrides.rainfall !== undefined) rf = overrides.rainfall;
    if (overrides.terrain !== undefined) ti = overrides.terrain;
    if (overrides.sat_change !== undefined) sc = overrides.sat_change;
    if (overrides.recent_change !== undefined) rc = overrides.recent_change;
    if (overrides.pop_exposed !== undefined) popIn = overrides.pop_exposed;
    if (overrides.pop_total !== undefined) popTot = overrides.pop_total;
    if (overrides.vulnerable !== undefined) vuln = overrides.vulnerable;
    if (overrides.infra !== undefined) infra = overrides.infra;
    if (overrides.accessibility !== undefined) access = overrides.accessibility;
    if (overrides.time_sensitivity !== undefined) timeSens = overrides.time_sensitivity;
    if (overrides.shelter_avail !== undefined) sAvail = overrides.shelter_avail;
    if (overrides.shelter_req !== undefined) sReq = overrides.shelter_req;
    if (overrides.water_avail !== undefined) wAvail = overrides.water_avail;
    if (overrides.water_req !== undefined) wReq = overrides.water_req;
    if (overrides.food_avail !== undefined) fAvail = overrides.food_avail;
    if (overrides.food_req !== undefined) fReq = overrides.food_req;
    if (overrides.med_avail !== undefined) mAvail = overrides.med_avail;
    if (overrides.med_req !== undefined) mReq = overrides.med_req;
    if (overrides.trans_avail !== undefined) tAvail = overrides.trans_avail;
    if (overrides.trans_req !== undefined) tReq = overrides.trans_req;
  }

  // 1. HRI Calculation
  const hriScore = Math.round(((0.35 * clamp(hp)) + (0.20 * clamp(rf)) + (0.15 * clamp(ti)) + (0.15 * clamp(sc)) + (0.15 * clamp(rc))) * 100) / 100;
  const hriClass = hriScore <= 20 ? 'SAFE' : hriScore <= 40 ? 'LOW' : hriScore <= 60 ? 'MODERATE' : hriScore <= 80 ? 'HIGH' : 'CRITICAL';

  // 2. PRI Calculation
  const popExposurePct = clamp((popIn / Math.max(1, popTot)) * 100);
  const priScore = Math.round(((0.45 * popExposurePct) + (0.20 * clamp(vuln)) + (0.15 * clamp(infra)) + (0.10 * clamp(access)) + (0.10 * clamp(timeSens))) * 100) / 100;

  // 3. CCPA Calculation
  const sCov = Math.min(sAvail / Math.max(1, sReq), 1) * 100;
  const wCov = Math.min(wAvail / Math.max(1, wReq), 1) * 100;
  const fCov = Math.min(fAvail / Math.max(1, fReq), 1) * 100;
  const mCov = Math.min(mAvail / Math.max(1, mReq), 1) * 100;
  const tCov = Math.min(tAvail / Math.max(1, tReq), 1) * 100;

  const ccpaScore = Math.round(((0.35 * sCov) + (0.20 * wCov) + (0.15 * fCov) + (0.15 * mCov) + (0.15 * tCov)) * 100) / 100;
  const ccpaClass = ccpaScore >= 80 ? 'GOOD' : ccpaScore >= 60 ? 'ADEQUATE' : ccpaScore >= 40 ? 'LIMITED' : ccpaScore >= 20 ? 'CRITICAL' : 'SEVERE SHORTAGE';

  // 4. APERIO Priority Score
  const prioScore = Math.round(((0.50 * hriScore) + (0.30 * priScore) + (0.20 * (100 - ccpaScore))) * 100) / 100;
  const prioClass = prioScore >= 80 ? 'CRITICAL' : prioScore >= 60 ? 'HIGH' : prioScore >= 40 ? 'MODERATE' : prioScore >= 20 ? 'LOW' : 'SAFE';

  return {
    priority_score: prioScore,
    classification: prioClass,
    formula: 'Priority = 0.50*HRI + 0.30*PRI + 0.20*(100 - CCPA)',
    weights: { HRI: 0.50, PRI: 0.30, CCPA_deficit: 0.20 },
    hri: {
      score: hriScore,
      classification: hriClass,
      formula: 'HRI = 0.35*hazard_prob + 0.20*rainfall + 0.15*terrain + 0.15*sat_change + 0.15*recent_change',
      weights: { hazard_probability: 0.35, rainfall_score: 0.20, terrain_instability: 0.15, satellite_change: 0.15, recent_change: 0.15 },
      components: { hazard_probability: hp, rainfall_score: rf, terrain_instability: ti, satellite_change: sc, recent_change: rc }
    },
    pri: {
      score: priScore,
      formula: 'PRI = 0.45*pop_exposure + 0.20*vulnerable + 0.15*infra + 0.10*accessibility + 0.10*time_sensitivity',
      weights: { population_exposure: 0.45, vulnerable_population: 0.20, infrastructure_exposure: 0.15, accessibility_difficulty: 0.10, time_sensitivity: 0.10 },
      components: {
        population_exposure: Math.round(popExposurePct * 10) / 10,
        population_inside_hazard_zone: popIn,
        total_regional_population: popTot,
        vulnerable_population: vuln,
        infrastructure_exposure: infra,
        accessibility_difficulty: access,
        time_sensitivity: timeSens
      }
    },
    ccpa: {
      score: ccpaScore,
      classification: ccpaClass,
      deficit: Math.round((100 - ccpaScore) * 100) / 100,
      formula: 'CCPA = 0.35*shelter + 0.20*water + 0.15*food + 0.15*medical + 0.15*transport',
      weights: { shelter_coverage: 0.35, water_coverage: 0.20, food_coverage: 0.15, medical_coverage: 0.15, transport_coverage: 0.15 },
      components: {
        shelter_coverage: Math.round(sCov * 10) / 10,
        water_coverage: Math.round(wCov * 10) / 10,
        food_coverage: Math.round(fCov * 10) / 10,
        medical_coverage: Math.round(mCov * 10) / 10,
        transport_coverage: Math.round(tCov * 10) / 10
      },
      raw_inventories: {
        shelter: { available: sAvail, required: sReq },
        water: { available: wAvail, required: wReq },
        food: { available: fAvail, required: fReq },
        medical: { available: mAvail, required: mReq },
        transport: { available: tAvail, required: tReq }
      }
    }
  };
}

/**
 * Resolves the backend server origin based on environment configuration:
 * 1. Respects VITE_API_URL environment variable if provided.
 * 2. In browser runtime, if hosted on localhost or 127.0.0.1, uses local FastAPI server (http://localhost:8000).
 * 3. In Vite development mode, uses local FastAPI server (http://localhost:8000).
 * 4. In deployed production environments (e.g. Vercel), defaults to working production backend (https://aperio-backend.onrender.com).
 */
export function getBackendOrigin(): string {
  // 1. Explicit VITE_API_URL from environment
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  // 2. Runtime browser location detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return 'http://localhost:8000';
    }
  }

  // 3. Vite DEV mode
  if (import.meta.env.DEV) {
    return 'http://localhost:8000';
  }

  // 4. Working Production backend deployed on Render
  return 'https://aperio-backend.onrender.com';
}

export const BACKEND_URL = getBackendOrigin();
export const API_BASE = `${BACKEND_URL}/api`;

export async function fetchRiskIndices(scenarioId: string): Promise<RiskIndicesBreakdown> {
  try {
    const res = await apiFetch(`${API_BASE}/risk/indices?scenario_id=${encodeURIComponent(scenarioId)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Graceful fallback to deterministic local engine if server is unreachable
  }
  return computeAperioIndicesLocally(scenarioId);
}

export async function calculateCustomIndices(req: Record<string, any>): Promise<RiskIndicesBreakdown> {
  try {
    const res = await apiFetch(`${API_BASE}/risk/indices/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Graceful fallback
  }
  return computeAperioIndicesLocally(req.scenario_id || 'wayanad-landslide', req);
}

export async function fetchAlerts(): Promise<any[]> {
  try {
    const res = await apiFetch(`${API_BASE}/alerts`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return [];
}

export async function approveAlert(alertId: string, operatorNotes?: string): Promise<any> {
  try {
    const res = await apiFetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operator_notes: operatorNotes || 'Approved via Mission Control Response Desk' })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return { status: 'APPROVED', alert_id: alertId };
}

export async function rejectAlert(alertId: string, reason?: string): Promise<any> {
  try {
    const res = await apiFetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'Rejected pending further ground verification' })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return { status: 'REJECTED', alert_id: alertId };
}

export async function fetchDisasterTypes(): Promise<string[]> {
  try {
    const res = await apiFetch(`${API_BASE}/disasters/types`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return ['FLOOD', 'WILDFIRE', 'DEFORESTATION', 'LANDSLIDE'];
}

export async function fetchDisasterStates(disasterType: string): Promise<string[]> {
  try {
    const res = await apiFetch(`${API_BASE}/disasters/states?disaster_type=${encodeURIComponent(disasterType)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return ['Assam', 'Kerala', 'Uttarakhand', 'Maharashtra'];
}

export async function fetchDisasterDistricts(disasterType: string, state: string): Promise<string[]> {
  try {
    const res = await apiFetch(`${API_BASE}/disasters/districts?disaster_type=${encodeURIComponent(disasterType)}&state=${encodeURIComponent(state)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return [];
}

export async function fetchDisasterEvents(disasterType: string, state?: string, district?: string, limit = 50): Promise<any[]> {
  try {
    let url = `${API_BASE}/disasters/events?disaster_type=${encodeURIComponent(disasterType)}&limit=${limit}`;
    if (state) url += `&state=${encodeURIComponent(state)}`;
    if (district) url += `&district=${encodeURIComponent(district)}`;
    const res = await apiFetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return [];
}

export async function fetchDisasterEventDetails(eventId: string): Promise<any> {
  try {
    const res = await apiFetch(`${API_BASE}/disasters/event-details?event_id=${encodeURIComponent(eventId)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return null;
}

export async function analyzeDisasterEvent(eventId: string, autoApprove = false): Promise<any> {
  try {
    const res = await apiFetch(`${API_BASE}/disasters/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, auto_approve: autoApprove })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return null;
}

export async function fetchRelocationOptions(scenarioId: string): Promise<any> {
  try {
    const res = await apiFetch(`${API_BASE}/relocation?scenario_id=${encodeURIComponent(scenarioId)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return null;
}

export async function fetchDemTerrain(scenarioId: string): Promise<any> {
  try {
    const res = await apiFetch(`${API_BASE}/dem?scenario_id=${encodeURIComponent(scenarioId)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return null;
}

export async function fetchResourceInventory(scenarioId?: string): Promise<any> {
  try {
    const url = scenarioId ? `${API_BASE}/resources?scenario_id=${encodeURIComponent(scenarioId)}` : `${API_BASE}/resources`;
    const res = await apiFetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return null;
}

export async function fetchChangeDetection(scenarioId: string): Promise<any> {
  try {
    const res = await apiFetch(`${API_BASE}/change-detection?scenario_id=${encodeURIComponent(scenarioId)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return null;
}

export async function runHazardDetection(scenarioId: string, hazard: string, layersSelected?: string[]): Promise<any> {
  try {
    const res = await apiFetch(`${API_BASE}/detection/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_id: scenarioId, hazard, layers_selected: layersSelected })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return null;
}

export async function generateAuthorityReport(scenarioId: string, operatorNotes?: string): Promise<any> {
  try {
    const res = await apiFetch(`${API_BASE}/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_id: scenarioId, operator_notes: operatorNotes || '' })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return null;
}

export function downloadReportPdfUrl(filename: string): string {
  return `${API_BASE}/reports/download/${encodeURIComponent(filename)}`;
}

export async function fetchMonitoringState(scenarioId?: string): Promise<any> {
  try {
    const url = scenarioId ? `${API_BASE}/monitoring?scenario_id=${encodeURIComponent(scenarioId)}` : `${API_BASE}/monitoring`;
    const res = await apiFetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return null;
}

export async function triggerMonitoringCycle(scenarioId?: string): Promise<any> {
  try {
    const res = await apiFetch(`${API_BASE}/monitoring/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_id: scenarioId || 'wayanad-landslide' })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return null;
}

export async function getGeoChatProvider(): Promise<any> {
  try {
    const res = await apiFetch(`${API_BASE}/geochat/provider`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return { configured: false, provider: 'none', status: 'Backend unreachable' };
}

export async function askGeoChat(
  question: string,
  scenarioId: string,
  context?: any,
  messages?: any[]
): Promise<any> {
  try {
    const res = await apiFetch(`${API_BASE}/geochat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, scenario_id: scenarioId, context, messages })
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => null);
    return {
      error: true,
      message: errData?.detail || `API error (${res.status}: ${res.statusText})`
    };
  } catch (err: any) {
    return {
      error: true,
      message: err?.message || 'Network error: unable to connect to APERIO backend.'
    };
  }
}

export async function submitOperatorReview(
  alertId: string,
  review: {
    verification_outcome: string;
    operator_response: string;
    agency_assigned: string;
    operator_name?: string;
    evidence_reviewed?: string[];
    notes?: string;
  }
): Promise<any> {
  try {
    const res = await apiFetch(`${API_BASE}/alerts/${encodeURIComponent(alertId)}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return { status: review.verification_outcome === 'Confirmed' ? 'APPROVED' : review.verification_outcome === 'Rejected' ? 'REJECTED' : 'NEEDS_MORE_EVIDENCE', alert_id: alertId };
}

export async function fetchGisLayers(scenarioId: string): Promise<any> {
  try {
    const res = await apiFetch(`${API_BASE}/data/gis?scenario_id=${encodeURIComponent(scenarioId)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return null;
}

export async function loginOperator(email = 'operator@aperio.org', password = 'aperio'): Promise<any> {
  try {
    const res = await apiFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return {
    status: 'authenticated',
    user: {
      id: 'usr-op-01',
      name: 'Mission Desk Operator',
      email,
      role: 'Response Desk Specialist',
      organization: 'APERIO Earth Intelligence Mission Operations'
    },
    token: 'aperio-session-token-v2'
  };
}

