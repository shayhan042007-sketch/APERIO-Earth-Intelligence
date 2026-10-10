import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Bot,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Compass,
  Cpu,
  Crosshair,
  FileText,
  Globe,
  KeyRound,
  Layers3,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageSquareText,
  Pause,
  Play,
  Radio,
  Satellite,
  Scan,
  Send,
  Shield,
  ShieldAlert,
  Sparkles,
  UserCheck,
  X
} from 'lucide-react';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import ModulePage from './Modules';
import MissionControl from './MissionControl';
import {
  navItems,
  operationalDisclaimer,
  pushEvent,
  readState,
  saveState,
  scenarios,
  stamp
} from './data';
import type { LocalState, Scenario } from './data';
import { askGeoChat, getGeoChatProvider, loginOperator } from './api';
import './index.css';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

const heroVideoScenarios = [
  {
    id: 'flood',
    hazard: 'FLOOD',
    place: 'Tinsukia District',
    state: 'Assam, India',
    coords: '27.492° N, 95.347° E',
    orbit: 'LEO-705KM · SAR SPECULAR LOSS PASS',
    sensor: 'SENTINEL-1 C-SAR SPECULAR LOSS // MODIS',
    image: '/motion-flood.jpg',
    severity: 'HIGH',
    hri: 78,
    antecedent: '480 mm rainfall',
    slope: '2.1° low elevation basin',
    samArea: '142.6 Hectares inundated',
    alertTitle: 'FLASH INUNDATION WARNING ISSUED',
    alertMsg: 'Brahmaputra tributary bank overflow. 14 villages in flood plain flagged. Automated supply drop route generated.',
    recipient: 'ASDMA & FLOOD RELIEF TASKFORCE',
    boxStyle: { top: '38%', left: '26%', width: '54%', height: '38%' },
    accentColor: '#48a9c1'
  },
  {
    id: 'landslide',
    hazard: 'LANDSLIDE',
    place: 'Meppadi / Wayanad',
    state: 'Kerala, India',
    coords: '11.556° N, 76.135° E',
    orbit: 'LEO-705KM · ASCENDING PASS 98.2°',
    sensor: 'SENTINEL-1 C-SAR // GLO-30 DEM',
    image: '/motion-landslide.jpg',
    severity: 'CRITICAL',
    hri: 84,
    antecedent: '572 mm rainfall',
    slope: '28.4° slope gradient',
    samArea: '84.2 Hectares debris scar',
    alertTitle: 'CRITICAL DEBRIS RUNOUT DETECTED',
    alertMsg: 'Severe slope saturation in Meppadi Zone 4. Evacuate 1,420 residents via Corridor B. 12 relief shelters designated.',
    recipient: 'KSDMA & NDRF DISASTER RESPONSE',
    boxStyle: { top: '30%', left: '34%', width: '40%', height: '44%' },
    accentColor: '#f59e0b'
  },
  {
    id: 'deforestation',
    hazard: 'DEFORESTATION',
    place: 'Western Ghats Corridor',
    state: 'Kerala, India',
    coords: '10.885° N, 76.521° E',
    orbit: 'LEO-705KM · BI-TEMPORAL MSI PASS',
    sensor: 'SENTINEL-2 MSI NDVI CHANGE DELTA',
    image: '/motion-deforestation.jpg',
    severity: 'MODERATE',
    hri: 46,
    antecedent: '-0.38 NDVI canopy loss',
    slope: '14.8° evergreen buffer zone',
    samArea: '22.8 Hectares clear-cut',
    alertTitle: 'ILLEGAL CANOPY CLEARANCE ALERT',
    alertMsg: 'Bi-temporal spectral anomaly flags rapid canopy loss in protected reserve buffer. Geotagged coordinates transmitted to Forest Ranger.',
    recipient: 'STATE FOREST VIGILANCE CELL',
    boxStyle: { top: '30%', left: '35%', width: '42%', height: '40%' },
    accentColor: '#10b981'
  },
  {
    id: 'wildfire',
    hazard: 'WILDFIRE',
    place: 'Garhwal Division',
    state: 'Uttarakhand, India',
    coords: '30.800° N, 78.000° E',
    orbit: 'LEO-705KM · THERMAL RADIOMETER PASS',
    sensor: 'VIIRS/MODIS 375M ACTIVE FIRE SENSOR',
    image: '/motion-wildfire.jpg',
    severity: 'HIGH',
    hri: 72,
    antecedent: 'FRP 184 MW thermal flux',
    slope: '34.2° pine ridge wind front',
    samArea: '96.5 Hectares active burn front',
    alertTitle: 'ACTIVE CANOPY FIRE FRONT SPREADING',
    alertMsg: 'Thermal runaway spreading 2.4 km/h towards north valley. Firebreak containment vector #3 dispatched to Forest Service.',
    recipient: 'UTTARAKHAND FOREST FORCE & NDRF',
    boxStyle: { top: '26%', left: '30%', width: '48%', height: '46%' },
    accentColor: '#ef4444'
  }
];

function HeroSatelliteVideo() {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [flash, setFlash] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('');

  // Clock readout
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateClock();
    const t = setInterval(updateClock, 1000);
    return () => clearInterval(t);
  }, []);

  // Video loop timer: 8 seconds per scenario, 2s per operational phase
  useEffect(() => {
    if (!isPlaying) return;

    const interval = 100;
    const totalDuration = 8000;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      const pct = Math.min(100, (elapsed / totalDuration) * 100);
      setProgress(pct);

      if (elapsed < 2000) {
        setPhase(0); // 1. Orbit scan
      } else if (elapsed < 4000) {
        if (elapsed - interval < 2000) {
          setFlash(true);
          setTimeout(() => setFlash(false), 450);
        }
        setPhase(1); // 2. Satellite capture
      } else if (elapsed < 6000) {
        setPhase(2); // 3. AI Delineation & Risk
      } else {
        setPhase(3); // 4. Alert Dispatch
      }

      if (elapsed >= totalDuration) {
        elapsed = 0;
        setSceneIdx(prev => (prev + 1) % heroVideoScenarios.length);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, sceneIdx]);

  const activeScene = heroVideoScenarios[sceneIdx];

  const phaseNames = [
    { num: '01', name: 'ORBIT PASS', icon: Satellite, status: 'Scanning coordinates & aligning SAR radar beam' },
    { num: '02', name: 'IMAGERY CAPTURE', icon: Scan, status: 'Triggering multi-spectral & SAR sensor acquisition' },
    { num: '03', name: 'AI DELINEATION', icon: Cpu, status: 'Running SAM polygon segmentation & Bayesian risk engine' },
    { num: '04', name: 'ALERT DISPATCHED', icon: Bell, status: 'Emergency dispatch sent to command desk & NDRF' }
  ];

  return (
    <div className="hero-video-stage">
      {/* Background imagery viewport */}
      <div className="hero-video-viewport">
        <img
          key={activeScene.id}
          className="hero-video-image"
          src={activeScene.image}
          alt={activeScene.hazard}
        />
        <div className="hero-video-scrim" />
        <div className="hero-video-sweep-line" />
        {flash && <div className="hero-video-flash" />}
      </div>

      {/* Top Telemetry HUD */}
      <div className="hero-video-topbar">
        <div className="hero-video-telemetry-left">
          <span className="hero-video-live-tag">
            <span className="cinematic-pulse-dot" style={{ background: '#ef4444' }} />
            {isPlaying ? 'SATELLITE LIVE FEED' : 'SIMULATION PAUSED'}
          </span>
          <span className="hero-video-sensor-title">
            {activeScene.sensor}
          </span>
        </div>

        <div className="hero-video-telemetry-right">
          <span>{activeScene.coords}</span>
          <span style={{ color: '#48a9c1', fontWeight: 600 }}>{currentTime}</span>
        </div>
      </div>

      {/* Center Operational Stage: Target Reticle, SAM Bounding Box & Alerts */}
      <div className="hero-video-center-stage">
        {/* Reticle / AI Bounding Box */}
        {(phase === 1 || phase === 2 || phase === 3) && (
          <div
            className="hero-video-target-box"
            style={{
              ...activeScene.boxStyle,
              borderColor: phase >= 2 ? activeScene.accentColor : '#48a9c1'
            }}
          >
            <div
              className="hero-video-target-tag"
              style={{ background: phase >= 2 ? activeScene.accentColor : '#14738d' }}
            >
              {phase === 1
                ? 'ACQUIRING SENSOR APERTURE'
                : `SAM-AI DELINEATION · ${activeScene.samArea}`}
            </div>
            <div className="hero-video-reticle-cross" />
          </div>
        )}

        {/* Phase 3 & 4 Telemetry Metrics Overlay */}
        {phase >= 2 && (
          <div
            style={{
              position: 'absolute',
              top: 24,
              right: 28,
              background: '#ffffff',
              border: `1.5px solid ${activeScene.accentColor}`,
              borderRadius: 6,
              padding: '12px 16px',
              fontFamily: 'var(--app-font-mono)',
              backdropFilter: 'blur(10px)',
              pointerEvents: 'auto',
              boxShadow: '0 6px 20px rgba(20, 43, 67, 0.12)'
            }}
          >
            <div style={{ fontSize: 10, color: '#566c7d', letterSpacing: '0.08em', fontWeight: 600 }}>BAYESIAN HAZARD RISK</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: activeScene.accentColor, margin: '2px 0' }}>
              {activeScene.hri}% <span style={{ fontSize: 11, color: '#183149' }}>({activeScene.severity})</span>
            </div>
            <div style={{ fontSize: 10, color: '#475d6e' }}>
              {activeScene.antecedent} · {activeScene.slope}
            </div>
          </div>
        )}

        {/* Phase 3: Emergency Alert Dispatched Card */}
        {phase === 3 ? (
          <div className="hero-video-alert-card">
            <div className="hero-video-alert-head">
              <div className="hero-video-alert-title">
                <AlertTriangle size={18} />
                <span>{activeScene.alertTitle}</span>
              </div>
              <span className="hero-video-alert-badge">
                DISPATCHED
              </span>
            </div>
            <p className="hero-video-alert-body">
              {activeScene.alertMsg}
            </p>
            <div className="hero-video-alert-footer">
              <span>TARGET AUTHORITY: <strong>{activeScene.recipient}</strong></span>
              <Link
                href="/sign-in"
                style={{
                  color: '#14738d',
                  textDecoration: 'none',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                Inspect in Console <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #cbdbe6',
              borderRadius: 6,
              padding: '14px 18px',
              maxWidth: 500,
              backdropFilter: 'blur(10px)',
              pointerEvents: 'auto',
              marginTop: 'auto',
              boxShadow: '0 8px 24px rgba(20, 43, 67, 0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="cinematic-pulse-dot" style={{ background: '#14738d' }} />
              <strong style={{ fontSize: 13, color: '#183149', fontFamily: 'var(--app-font-display)', letterSpacing: '0.04em' }}>
                {activeScene.hazard} · {activeScene.place}
              </strong>
              <span style={{ fontSize: 10, color: '#14738d', fontFamily: 'var(--app-font-mono)', marginLeft: 'auto', fontWeight: 600 }}>
                {activeScene.state}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#475d6e', lineHeight: 1.5 }}>
              {phaseNames[phase].status}
            </div>
          </div>
        )}
      </div>

      {/* Operational Phase Stepper */}
      <div className="hero-video-stepper">
        {phaseNames.map((p, idx) => {
          const Icon = p.icon;
          const isActive = phase === idx;
          return (
            <button
              key={p.name}
              type="button"
              className={`hero-video-step-chip ${isActive ? 'active' : ''}`}
              onClick={() => {
                setPhase(idx as 0 | 1 | 2 | 3);
                if (idx === 1) {
                  setFlash(true);
                  setTimeout(() => setFlash(false), 450);
                }
              }}
            >
              <Icon size={13} />
              <span>{p.num}. {p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Video Controls & Scenario Selector */}
      <div className="hero-video-controls">
        <div className="hero-video-control-buttons">
          <button
            type="button"
            className="hero-video-btn-play"
            aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 2 }} />}
          </button>
          <button
            type="button"
            className="tiny-button"
            style={{ fontSize: 11, padding: '6px 12px', background: '#ffffff', color: '#183149', border: '1px solid #cbdbe6', fontWeight: 600 }}
            onClick={() => setSceneIdx(prev => (prev - 1 + heroVideoScenarios.length) % heroVideoScenarios.length)}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <button
            type="button"
            className="tiny-button"
            style={{ fontSize: 11, padding: '6px 12px', background: '#ffffff', color: '#183149', border: '1px solid #cbdbe6', fontWeight: 600 }}
            onClick={() => setSceneIdx(prev => (prev + 1) % heroVideoScenarios.length)}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>

        <div className="hero-video-target-tabs">
          {heroVideoScenarios.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              className={`hero-video-tab-btn ${idx === sceneIdx ? 'active' : ''}`}
              onClick={() => {
                setSceneIdx(idx);
                setPhase(0);
                setProgress(0);
              }}
            >
              {s.hazard}
            </button>
          ))}
        </div>

        {/* Running Video Progress Line */}
        <div className="hero-video-progress-bar">
          <div className="hero-video-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

// 1. PUBLIC LANDING PAGE
function Home() {
  return (
    <main className="public-page">
      <header className="public-header">
        <Link href="/" className="public-logo">
          <img src="/logo.svg" alt="" />
          <strong>APERIO</strong>
          <span className="brand-sub">EARTH INTELLIGENCE</span>
        </Link>
        <div className="control-row">
          <Link href="/sign-in" className="btn" style={{ padding: '10px 20px', fontSize: 14, fontWeight: 700 }}>
            <KeyRound size={15} /> Sign In
          </Link>
        </div>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-kicker">EARTH INTELLIGENCE FOR OPERATIONAL EMERGENCY RESPONSE</div>
          <h1>See the signal.<br />Understand the risk.</h1>
          <p>
            APERIO fuses satellite radar (Sentinel-1 C-SAR), optical (Sentinel-2 MSI), and terrain elevation (Copernicus DEM) with deterministic risk indices and human commander review.
          </p>
          <div className="hero-actions">
            <Link href="/sign-in" className="btn">
              Enter Mission <ArrowRight size={18} />
            </Link>
            <Link href="/sign-in" className="btn-secondary">
              Select Scenario
            </Link>
          </div>
          <div className="hero-footnote">OPERATIONAL MISSION COMMAND · MULTI-HAZARD EARTH INTELLIGENCE</div>
        </div>
        <div className="hero-art" style={{ padding: 0 }}>
          <HeroSatelliteVideo />
        </div>
      </section>
      <section className="public-section">
        <div className="eyebrow">The Operating Loop</div>
        <h2 className="section-heading">Evidence to Accountable Human Action.</h2>
        <div className="public-loop">
          {['DETECT', 'EXPLAIN', 'ASSESS', 'ACT', 'VERIFY'].map((x, i) => (
            <div key={x}>
              <b>0{i + 1}</b>
              <strong>{x}</strong>
              <span>
                {[
                  'Multi-sensor signal anomaly ingestion',
                  'Bi-temporal change detection & SAM delineation',
                  'XGBoost prediction & Bayesian update',
                  'Evacuation routing & resource allocation',
                  'Audited human review & authority reporting'
                ][i]}
              </span>
            </div>
          ))}
        </div>
        <p className="public-disclaimer">{operationalDisclaimer}</p>
      </section>
      <section className="public-section areas-public">
        <div className="eyebrow">Active Scenarios</div>
        <h2 className="section-heading">Multi-Hazard Operational Disasters.</h2>
        <div className="area-grid">
          {scenarios.map(s => (
            <Link href="/sign-in" className="area-card" key={s.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <img src={s.image} alt={s.hazard} />
              <div className="area-content">
                <span className={`badge ${s.severity === 'CRITICAL' || s.severity === 'HIGH' ? 'high' : s.severity === 'MODERATE' ? 'moderate' : 'safe'}`}>
                  {s.severity} PRIORITY
                </span>
                <h3>{s.hazard} · {s.place}</h3>
                <p>{s.description}</p>
                <span className="card-cta">
                  Enter Mission <ArrowRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <footer className="public-footer">
        <span>APERIO / AUTONOMOUS EARTH INTELLIGENCE</span>
        <span>Mission Operations Center · FastAPI Connected</span>
        <Link href="/sign-in">Operator Sign In</Link>
      </footer>
    </main>
  );
}

// 2. POST-LOGIN CINEMATIC INTRO
function CinematicIntro({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3200);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onComplete]);

  return (
    <div className="cinematic-intro-stage" onClick={onComplete} title="Click to skip">
      <div className="cinematic-intro-stars" />
      <div className="cinematic-intro-earth" />
      <button
        className="cinematic-intro-skip-btn"
        onClick={e => {
          e.stopPropagation();
          onComplete();
        }}
      >
        SKIP [ESC] »
      </button>

      <div className="cinematic-intro-content">
        <img className="cinematic-intro-logo-icon" src="/logo.svg" alt="APERIO Emblem" />
        <h1 className="cinematic-intro-title">APERIO</h1>
        <div className="cinematic-intro-subtitle">Autonomous Earth Intelligence Platform</div>
        <div className="cinematic-intro-pillars">
          <span>DETECT</span>
          <span className="cinematic-intro-dot">•</span>
          <span>EXPLAIN</span>
          <span className="cinematic-intro-dot">•</span>
          <span>ASSESS</span>
          <span className="cinematic-intro-dot">•</span>
          <span>ACT</span>
          <span className="cinematic-intro-dot">•</span>
          <span>VERIFY</span>
        </div>
      </div>

      <div className="cinematic-intro-clickhint">
        Click anywhere to continue
      </div>
    </div>
  );
}

const hazardSlides = [
  {
    id: 'satellite',
    tabName: 'ORBIT SCAN',
    name: 'SATELLITE EARTH OBSERVATION / SENSOR INGESTION',
    region: 'LEO-705KM Sun-Synchronous Orbit',
    coords: 'ORBIT 98.2° // MULTISPECTRAL & SAR INGESTION',
    sensor: 'SENTINEL-1 C-SAR // SENTINEL-2 MSI // GLO-30 DEM',
    status: 'REAL-TIME MULTI-SPECTRAL OBSERVATION SWEEP',
    image: '/motion-satellite.jpg'
  },
  {
    id: 'landslide',
    tabName: 'LANDSLIDE',
    name: 'MEPPADI / WAYANAD DEBRIS TORRENT',
    region: 'Kerala, India',
    coords: '11.556° N, 76.135° E',
    sensor: 'SENTINEL-1 C-SAR // COPERNICUS GLO-30 DEM',
    status: 'CRITICAL SLOPE DEBRIS SATURATION & RUNOUT',
    image: '/motion-landslide.jpg'
  },
  {
    id: 'flood',
    tabName: 'FLOOD',
    name: 'TINSUKIA RIVER BASIN INUNDATION',
    region: 'Assam, India',
    coords: '27.492° N, 95.347° E',
    sensor: 'SENTINEL-1 C-SAR SPECULAR LOSS // MODIS',
    status: 'TORRENTIAL DOWNPOUR & BASIN INUNDATION',
    image: '/motion-flood.jpg'
  },
  {
    id: 'wildfire',
    tabName: 'WILDFIRE',
    name: 'GARHWAL HIMALAYAN FOREST FIRE',
    region: 'Uttarakhand, India',
    coords: '30.800° N, 78.000° E',
    sensor: 'VIIRS/MODIS ACTIVE FIRE RADIOMETER (FRP)',
    status: 'THERMAL RADIOMETER ACTIVE FIRE FRONT',
    image: '/motion-wildfire.jpg'
  },
  {
    id: 'deforestation',
    tabName: 'DEFORESTATION',
    name: 'WESTERN GHATS BIOMASS CORRIDOR',
    region: 'Kerala, India',
    coords: '10.885° N, 76.521° E',
    sensor: 'SENTINEL-2 MSI NDVI CHANGE DELTA',
    status: 'CANOPY CLEAR-CUT & BIOMASS LOSS TRACKING',
    image: '/motion-deforestation.jpg'
  }
];

// 3. AUTHENTICATION (CINEMATIC OPERATOR SIGN-IN)
function SignInPage({ state, setState }: { state: LocalState; setState: (s: LocalState) => void }) {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('operator@aperio.org');
  const [password, setPassword] = useState('aperio2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showIntro, setShowIntro] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIdx(prev => (prev + 1) % hazardSlides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await loginOperator(email, password);
      if (res && res.status === 'authenticated') {
        const next = {
          ...state,
          authenticatedUser: res.user || {
            email,
            name: 'Mission Desk Operator',
            role: 'Response Desk Specialist',
            organization: 'APERIO Earth Intelligence Mission Operations'
          }
        };
        setState(next);
        saveState(next);
        setShowIntro(true);
      } else {
        setError('Invalid credentials. Use operator@aperio.org.');
      }
    } catch {
      setError('Connection error to authentication service.');
    } finally {
      setLoading(false);
    }
  };

  if (showIntro) {
    return <CinematicIntro onComplete={() => setLocation('/select-area')} />;
  }

  const activeSlide = hazardSlides[slideIdx];

  return (
    <main className="cinematic-signin-page">
      {/* Background satellite & hazard monitoring motion picture imagery */}
      <div className="cinematic-bg-canvas">
        {hazardSlides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`cinematic-slide ${idx === slideIdx ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          />
        ))}
      </div>

      <div className="cinematic-overlay-vignette" />
      <div className="cinematic-grid-lines" />
      <div className="cinematic-radar-sweep">
        <div className="cinematic-radar-beam" />
      </div>

      {/* Telemetry HUD on Left */}
      <div className="cinematic-telemetry-hud">
        <div className="cinematic-hud-header">
          <div className="cinematic-hud-pill">
            <span className="cinematic-pulse-dot" /> ORBITAL SENSORS ONLINE // LEO-705KM
          </div>
          <div className="cinematic-hud-pill">
            <Satellite size={11} /> INGESTION ACTIVE
          </div>
        </div>

        <div className="cinematic-hud-center">
          <div className="cinematic-hud-kicker">
            <Crosshair size={13} /> APERIO SATELLITE RADAR &amp; MULTISPECTRAL OBSERVATION
          </div>
          <h1 className="cinematic-hud-title">Autonomous Earth Intelligence</h1>
          <p className="cinematic-hud-desc">
            Continuous multi-sensor satellite observation, Bayesian risk updating, and audited emergency response decision support.
          </p>

          <div className="cinematic-live-hazard-badge">
            <Compass size={14} style={{ color: '#38bdf8' }} />
            <div>
              <strong>{activeSlide.name}</strong> · {activeSlide.region}
              <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                {activeSlide.coords} · {activeSlide.sensor}
              </div>
            </div>
          </div>

          {/* Interactive Motion Picture Tabs */}
          <div className="cinematic-motion-strip">
            {hazardSlides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                className={`cinematic-motion-tab ${idx === slideIdx ? 'active' : ''}`}
                onClick={() => setSlideIdx(idx)}
              >
                <span className="cinematic-motion-tab-num">0{idx + 1}</span>
                <span className="cinematic-motion-tab-name">{slide.tabName}</span>
                {idx === slideIdx && <div className="cinematic-motion-tab-progress" />}
              </button>
            ))}
          </div>
        </div>

        <div className="cinematic-hud-footer">
          <div className="cinematic-hud-stat">
            ORBITAL VELOCITY: <span>7.56 km/s</span>
          </div>
          <div className="cinematic-hud-stat">
            INCLINATION: <span>98.2°</span>
          </div>
          <div className="cinematic-hud-stat">
            REVISIT CYCLE: <span>6-12 DAYS</span>
          </div>
          <div className="cinematic-hud-stat">
            FASTAPI SYNC: <span>PORT 8000</span>
          </div>
        </div>
      </div>

      {/* Operator Login Panel on Right */}
      <div className="cinematic-signin-panel">
        <div className="cinematic-auth-box">
          <div className="cinematic-brand-logo">
            <img src="/logo.svg" alt="APERIO Emblem" />
            <div>
              <strong className="cinematic-brand-text">APERIO</strong>
              <span className="cinematic-brand-sub">MISSION OPERATIONS DESK</span>
            </div>
          </div>

          <h2 className="cinematic-auth-heading">Operator Sign In</h2>
          <p className="cinematic-auth-caption">Enter authorized emergency intelligence credentials</p>

          {error && (
            <div className="cinematic-auth-error">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <label className="cinematic-input-label">
              Operator Email:
            </label>
            <div className="cinematic-input-wrap">
              <Mail size={13} />
              <input
                className="cinematic-input"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <label className="cinematic-input-label">
              Access Token / Security Key:
            </label>
            <div className="cinematic-input-wrap">
              <Lock size={13} />
              <input
                className="cinematic-input"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button className="cinematic-btn-submit" type="submit" disabled={loading}>
              <KeyRound size={14} />
              {loading ? 'Authenticating System...' : 'Sign In to Mission Operations'}
            </button>
          </form>

          <div className="cinematic-demo-badge">
            <strong>DEMO CREDENTIALS PRE-FILLED:</strong>
            Email: <code>operator@aperio.org</code> · Token: <code>aperio2026</code>
          </div>
        </div>
      </div>
    </main>
  );
}

// 4. SELECT AREA (HORIZONTAL CINEMATIC MISSION SELECTOR)
function SelectArea({
  setState,
  state,
  onToast
}: {
  state: LocalState;
  setState: (s: LocalState) => void;
  onToast: (m: string) => void;
}) {
  const [, setLocation] = useLocation();

  // Find initial scenario index
  const initialIndex = useMemo(() => {
    const idx = scenarios.findIndex(x => x.id === state.selectedScenario);
    return idx >= 0 ? idx : 0;
  }, [state.selectedScenario]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Gesture handling refs
  const dragStartX = useRef<number | null>(null);
  const isDragging = useRef(false);
  const wheelThrottle = useRef(false);

  const selectedScenario = scenarios[activeIndex] || scenarios[0];

  const getDatasetProvenance = (hazard: string) => {
    switch (hazard) {
      case 'Flood':
        return 'District flood-area dataset';
      case 'Landslide':
        return 'Landslide incidence dataset';
      case 'Deforestation':
        return 'Current APERIO deforestation demonstration dataset';
      case 'Wildfire':
        return 'Uttarakhand/Himalayan fire observation dataset';
      default:
        return 'Verified disaster intelligence dataset';
    }
  };

  const nextScenario = useCallback(() => {
    setActiveIndex(prev => Math.min(scenarios.length - 1, prev + 1));
  }, []);

  const prevScenario = useCallback(() => {
    setActiveIndex(prev => Math.max(0, prev - 1));
  }, []);

  const enterMission = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    const chosen = scenarios[activeIndex];
    const s = { ...state, selectedScenario: chosen.id };
    const n = pushEvent(s, 'Scenario selected', `${chosen.hazard} · ${chosen.place}`);
    setState(n);
    saveState(n);

    // Smooth cinematic zoom and fade into overview dashboard
    setTimeout(() => {
      setLocation('/command-center/overview');
      onToast(`Loaded ${chosen.place} (${chosen.hazard}).`);
    }, 420);
  }, [activeIndex, isTransitioning, onToast, setLocation, setState, state]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTransitioning) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextScenario();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevScenario();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        enterMission();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enterMission, isTransitioning, nextScenario, prevScenario]);

  // Wheel handling: converts horizontal and vertical scroll to carousel advance
  const handleWheel = (e: React.WheelEvent) => {
    if (isTransitioning) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 24) return;
    if (wheelThrottle.current) return;

    wheelThrottle.current = true;
    setTimeout(() => {
      wheelThrottle.current = false;
    }, 380);

    if (delta > 0) {
      nextScenario();
    } else {
      prevScenario();
    }
  };

  // Pointer drag & touch swipe gestures
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isTransitioning) return;
    dragStartX.current = e.clientX;
    isDragging.current = true;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current || dragStartX.current === null) return;
    const diff = e.clientX - dragStartX.current;
    isDragging.current = false;
    dragStartX.current = null;

    if (Math.abs(diff) > 45) {
      if (diff < 0) {
        nextScenario();
      } else {
        prevScenario();
      }
    }
  };

  const handlePointerCancel = () => {
    isDragging.current = false;
    dragStartX.current = null;
  };

  return (
    <main className="cinematic-select-page">
      {/* Top Header */}
      <header className="cinematic-select-topbar">
        <div className="cinematic-select-brand">
          <img src="/logo.svg" alt="APERIO Emblem" />
          <div>
            <strong>APERIO MISSION OPERATIONS CONSOLE</strong>
            <span style={{ display: 'block', fontSize: 11, color: '#14738d', fontFamily: 'var(--app-font-mono)', letterSpacing: '0.12em', marginTop: 2, fontWeight: 600 }}>
              AUTONOMOUS EARTH INTELLIGENCE
            </span>
          </div>
        </div>

        <div className="cinematic-select-status">
          <span className="cinematic-hud-pill">
            <span className="cinematic-pulse-dot" /> FASTAPI CONNECTED
          </span>
          <span className="cinematic-hud-pill">
            <Globe size={13} /> 4 DATASETS ONLINE
          </span>
          <button
            onClick={() => {
              const next = { ...state, authenticatedUser: null };
              setState(next);
              saveState(next);
              setLocation('/sign-in');
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 4,
              color: '#dc2626',
              padding: '6px 14px',
              fontSize: 11,
              fontFamily: 'var(--app-font-mono)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            SIGN OUT
          </button>
        </div>
      </header>

      {/* Ambient background glow shifting according to the active disaster */}
      <div className={`cinematic-carousel-ambient ${selectedScenario.hazard.toUpperCase()}`} />

      {/* Main Carousel Stage */}
      <div
        className={`cinematic-carousel-stage ${isTransitioning ? 'is-transitioning' : ''}`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className="cinematic-stage-header">
          <div className="cinematic-stage-kicker">
            <Crosshair size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />
            OPERATIONAL MISSION DEPLOYMENT
          </div>
          <h1 className="cinematic-stage-title">Select Mission Scenario</h1>
        </div>

        {/* Floating Left Arrow */}
        <button
          type="button"
          aria-label="Previous scenario"
          className="cinematic-carousel-nav-btn prev"
          disabled={activeIndex === 0 || isTransitioning}
          onClick={prevScenario}
        >
          <ChevronLeft size={24} />
        </button>

        {/* Floating Right Arrow */}
        <button
          type="button"
          aria-label="Next scenario"
          className="cinematic-carousel-nav-btn next"
          disabled={activeIndex === scenarios.length - 1 || isTransitioning}
          onClick={nextScenario}
        >
          <ChevronRight size={24} />
        </button>

        {/* 3D Horizontal Carousel Track */}
        <div className="cinematic-carousel-track">
          {scenarios.map((s, idx) => {
            const diff = idx - activeIndex;
            const isActive = diff === 0;
            const isNeighbor = Math.abs(diff) === 1;

            let transformStyle = '';
            if (isActive) {
              transformStyle = 'translate(-50%, -50%) scale(1) translateX(0%) translateZ(0px)';
            } else if (diff === -1) {
              transformStyle = 'translate(-50%, -50%) scale(0.72) translateX(-118%) translateZ(-90px)';
            } else if (diff === 1) {
              transformStyle = 'translate(-50%, -50%) scale(0.72) translateX(118%) translateZ(-90px)';
            } else {
              transformStyle = `translate(-50%, -50%) scale(0.5) translateX(${diff > 0 ? '220%' : '-220%'}) translateZ(-160px)`;
            }

            return (
              <article
                key={s.id}
                className={`cinematic-carousel-card ${isActive ? 'is-active' : isNeighbor ? 'is-neighbor' : 'is-hidden'} ${s.hazard.toUpperCase()}`}
                style={{ transform: transformStyle }}
                onClick={() => {
                  if (!isActive && !isTransitioning) {
                    setActiveIndex(idx);
                  }
                }}
              >
                {/* Visual Backdrop */}
                <img className="cinematic-card-backdrop" src={s.image} alt={s.hazard} />
                <div className="cinematic-card-scrim" />

                {/* Card Top Information */}
                <div className="cinematic-card-header">
                  <div>
                    <div className="cinematic-card-target-kicker">
                      TARGET DEPLOYMENT 0{idx + 1}
                    </div>
                    <h2 className="cinematic-card-title-massive">{s.hazard}</h2>
                    <div className="cinematic-card-loc-sub">
                      {s.place} · {s.region}
                    </div>
                  </div>

                  <div className="cinematic-card-status-badge">
                    <span className="cinematic-pulse-dot" style={{ width: 6, height: 6 }} />
                    ANALYSIS READY
                  </div>
                </div>

                {/* Card Bottom: Provenance, Metrics & Enter Action */}
                <div className="cinematic-card-bottom">
                  <p className="cinematic-card-desc-text">{s.description}</p>

                  <div className="cinematic-card-data-provenance">
                    <span>Data source:</span>
                    <strong>{getDatasetProvenance(s.hazard)}</strong>
                  </div>

                  <div className="cinematic-card-stats-row">
                    <div className="cinematic-card-stat-box">
                      <span>Hazard Risk (HRI)</span>
                      <strong style={{ color: s.risk > 70 ? '#ef4444' : s.risk > 30 ? '#f59e0b' : '#10b981' }}>
                        {s.risk}%
                      </strong>
                      <small>{s.severity} PRIORITY</small>
                    </div>

                    <div className="cinematic-card-stat-box">
                      <span>Antecedent Signal</span>
                      <strong>{s.rainfall} <small style={{ fontSize: 13, marginLeft: 2 }}>mm</small></strong>
                      <small>{s.slope}° terrain slope</small>
                    </div>

                    <div className="cinematic-card-stat-box">
                      <span>Population at Risk</span>
                      <strong>{s.population}</strong>
                      <small>{s.area} area</small>
                    </div>
                  </div>

                  {isActive && (
                    <button
                      type="button"
                      className="cinematic-btn-launch-mission"
                      onClick={e => {
                        e.stopPropagation();
                        enterMission();
                      }}
                    >
                      ENTER MISSION <ArrowRight size={18} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Bottom Pagination Chips & Keyboard Shortcut Hint */}
        <div className="cinematic-carousel-bottom-bar">
          <div className="cinematic-carousel-indicators">
            {scenarios.map((s, idx) => (
              <button
                type="button"
                key={s.id}
                className={`cinematic-indicator-chip ${idx === activeIndex ? 'active' : ''}`}
                onClick={() => {
                  if (!isTransitioning) setActiveIndex(idx);
                }}
              >
                0{idx + 1} {s.hazard.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

// 4. INTERACTIVE COPILOT (APERIO GEOCHAT)
function AskAperioCopilot({
  state,
  setState,
  scenario
}: {
  state: LocalState;
  setState: (s: LocalState) => void;
  scenario: Scenario;
}) {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);
  const [providerInfo, setProviderInfo] = useState<any>(null);

  useEffect(() => {
    getGeoChatProvider().then(setProviderInfo);
  }, []);

  const quickPrompts = [
    'hello',
    'What is the current risk?',
    'Where should we relocate people?',
    'Which location has the highest capacity?',
    'Show it on the map',
    'What changed between the two satellite observations?',
    'What is the monitoring status?'
  ];

  const handleAsk = async (q: string) => {
    if (!q.trim() || thinking) return;
    setThinking(true);

    try {
      const res = await askGeoChat(
        q,
        scenario.id,
        {
          hazard: scenario.hazard,
          place: scenario.place,
          region: scenario.region,
          risk: scenario.risk,
          rainfall: scenario.rainfall,
          slope: scenario.slope,
          area: scenario.area,
          population: scenario.population,
          confidence: scenario.confidence
        },
        state.chatMessages
      );

      if (res?.error) {
        const errMsg = res.message || 'API error: unable to process Copilot query.';
        const messages = [
          ...state.chatMessages,
          {
            question: q,
            answer: `⚠ ${errMsg}`,
            error: true
          }
        ].slice(-10);
        const next = pushEvent({ ...state, chatMessages: messages }, 'Copilot Query Failed', errMsg, 'Error');
        setState(next);
        saveState(next);
      } else {
        const answerText = res?.answer || `APERIO analysis for ${scenario.place}: Calibrated ${scenario.hazard} risk is ${scenario.risk}% with ${scenario.confidence}% confidence grounded in observed rainfall (${scenario.rainfall} mm) and topography (${scenario.slope}° slope).`;
        const sources = res?.sources || scenario.sensors_supported;
        const conf = res?.confidence || scenario.confidence;
        const mapTarget = res?.map_target || null;

        const messages = [
          ...state.chatMessages,
          {
            question: q,
            answer: answerText,
            sources,
            confidence: conf,
            mapTarget
          }
        ].slice(-10);

        let next = pushEvent({ ...state, chatMessages: messages }, 'Copilot Question Answered', q, 'Copilot');

        // If map target returned, also update active map target and ensure Shelters layer is on
        if (mapTarget) {
          next = {
            ...next,
            highlightedMapTarget: mapTarget,
            layers: { ...next.layers, Shelters: true, Hospitals: true }
          };
        }

        setState(next);
        saveState(next);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Unexpected network exception communicating with APERIO backend.';
      const messages = [
        ...state.chatMessages,
        {
          question: q,
          answer: `⚠ Connection Error: ${errMsg}`,
          error: true
        }
      ].slice(-10);
      const next = pushEvent({ ...state, chatMessages: messages }, 'Copilot Error', errMsg, 'Error');
      setState(next);
      saveState(next);
    } finally {
      setQuestion('');
      setThinking(false);
    }
  };

  return (
    <>
      <button
        className="btn chat-fab"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <Bot size={15} />
        <span>APERIO Copilot</span>
      </button>

      {open && (
        <section className="chat-panel" aria-label="APERIO Grounded Copilot" style={{ width: 400, maxHeight: 540, display: 'flex', flexDirection: 'column' }}>
          <header className="chat-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Bot size={15} style={{ color: '#38bdf8' }} />
              <div>
                <strong>APERIO Operational Copilot</strong>
                <div style={{ fontSize: 8, color: '#94a3b8' }}>
                  Context: {scenario.place} ({scenario.hazard})
                </div>
              </div>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={15} />
            </button>
          </header>

          <div className="chat-body" style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', padding: '8px 10px', borderRadius: 3, fontSize: 10, marginBottom: 8 }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={11} /> Grounded Earth Intelligence Assistant
              </strong>
              Grounded strictly in verified backend tools, Copernicus sensors, DEM slope, and relocation algorithms.
            </div>

            {/* Provider status badge */}
            <div style={{ fontSize: 9, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: 3, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>ENGINE: <strong>{providerInfo?.execution_mode || 'DETERMINISTIC TOOL EXECUTION'}</strong></span>
              <span className="badge" style={{ fontSize: 7, background: providerInfo?.configured ? '#dcfce7' : '#f1f5f9', color: providerInfo?.configured ? '#166534' : '#475569' }}>
                {providerInfo?.configured ? `LLM: ${providerInfo.provider}` : 'LLM: UNCONFIGURED (DETERMINISTIC)'}
              </span>
            </div>

            {state.chatMessages.map((m, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div className="chat-question" style={{ fontWeight: 600, fontSize: 11, color: '#1e293b', marginBottom: 4 }}>
                  {m.question}
                </div>
                <div className="chat-answer" style={{
                  fontSize: 11,
                  lineHeight: 1.5,
                  background: m.error ? '#fef2f2' : '#f8fafc',
                  color: m.error ? '#991b1b' : 'inherit',
                  padding: 10,
                  borderRadius: 3,
                  borderLeft: m.error ? '3px solid #ef4444' : '3px solid #0284c7'
                }}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.answer}</div>
                  {m.sources && m.sources.length > 0 && !m.error && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {m.sources.map(s => (
                        <span key={s} className="badge" style={{ fontSize: 7, background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Contextual Action Button */}
                  {!m.error && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        className="tiny-button"
                        onClick={() => {
                          const target = m.mapTarget || {
                            target_name: `${scenario.place} Epicenter`,
                            target_type: 'hazard_area',
                            lat: scenario.coords[0],
                            lon: scenario.coords[1]
                          };
                          const next = {
                            ...state,
                            highlightedMapTarget: target,
                            layers: { ...state.layers, Shelters: true, Hospitals: true }
                          };
                          setState(next);
                          saveState(next);
                          setLocation('/command-center/overview');
                        }}
                        style={{
                          fontSize: 9,
                          padding: '3px 8px',
                          background: m.mapTarget ? '#dbeafe' : '#e2e8f0',
                          color: m.mapTarget ? '#1e40af' : '#334155',
                          fontWeight: 600,
                          border: m.mapTarget ? '1px solid #93c5fd' : '1px solid #cbd5e1',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <MapPin size={10} />
                        <span>{m.mapTarget ? `Highlight ${m.mapTarget.target_name} on Map` : 'View on Map'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {thinking && (
              <div style={{ padding: '8px 10px', fontSize: 10, color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 6, margin: '6px 0' }}>
                <span className="spinner" style={{ width: 10, height: 10, border: '2px solid #0284c7', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                <span>Querying APERIO decision pipeline &amp; ground telemetry...</span>
              </div>
            )}

            {/* Quick Action Suggestion Buttons */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>SUGGESTED QUESTIONS:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {quickPrompts.map(q => (
                  <button
                    key={q}
                    className="tiny-button"
                    style={{ textAlign: 'left', fontSize: 10, padding: '4px 8px', background: '#fff', border: '1px solid #cbd5e1' }}
                    onClick={() => handleAsk(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form
            className="chat-form"
            onSubmit={e => {
              e.preventDefault();
              handleAsk(question);
            }}
            style={{ padding: 8, display: 'flex', gap: 6, borderTop: '1px solid #e2e8f0', background: '#fff' }}
          >
            <input
              aria-label="Ask a question"
              placeholder={`Ask about ${scenario.place}...`}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              disabled={thinking}
              style={{ flex: 1, padding: '7px 9px', fontSize: 11, border: '1px solid #cbd5e1', borderRadius: 2 }}
            />
            <button className="btn" type="submit" disabled={!question.trim() || thinking} style={{ padding: '7px 12px' }}>
              <Send size={12} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}

// 5. PRIMARY COMMAND SHELL (SINGLE CLEAN NAVIGATION)
const navIcons = [
  Activity,
  ShieldAlert,
  Layers3,
  ArrowRight,
  CircleDot,
  FileText,
  FileText,
  Activity
];

function CommandShell({
  children,
  state,
  setState
}: {
  children: ReactNode;
  state: LocalState;
  setState: (s: LocalState) => void;
}) {
  const [online, setOnline] = useState(navigator.onLine);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const activePath = window.location.pathname.replace(basePath, '') || '/';
  const [trailShown, setTrailShown] = useState(false);
  const selected = scenarios.find(s => s.id === state.selectedScenario) ?? scenarios[0];

  // Functional Sign Out
  const handleSignOut = () => {
    const next = { ...state, authenticatedUser: null };
    setState(next);
    saveState(next);
    setLocation('/sign-in');
  };

  const user = state.authenticatedUser;

  return (
    <div className="app-shell">
      {/* Primary Sidebar (THE SINGLE PRIMARY NAVIGATION) */}
      <aside className="sidebar">
        <Link className="brand brand-link" href="/command-center/overview">
          <div className="brand-mark">A</div>
          <div>
            <div className="brand-name">APERIO</div>
            <span className="brand-sub">EARTH INTELLIGENCE</span>
          </div>
        </Link>

        <div className="nav-label">Command Modules</div>
        <nav className="side-nav">
          {navItems.map(([label, path], i) => {
            const Icon = navIcons[i] || Activity;
            return (
              <Link
                key={path}
                href={path}
                title={label}
                className={`nav-item ${activePath === path ? 'active' : ''}`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="nav-label">Session Controls</div>
        <button className="nav-item" onClick={() => setTrailShown(!trailShown)}>
          <Activity size={14} />
          <span>{trailShown ? 'Hide Activity Trail' : 'Activity Audit Trail'}</span>
        </button>

        <button className="nav-item" onClick={() => setLocation('/select-area')}>
          <Layers3 size={14} />
          <span>Switch Scenario</span>
        </button>

        <div className="sidebar-spacer" />

        <div className="demo-note">
          <strong><CircleDot size={11} /> OPERATIONAL SYSTEM</strong>
          Connected to FastAPI Backend on port 8000.
        </div>

        {/* User Information */}
        <div className="user-row">
          <div className="avatar">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'OP'}
          </div>
          <div className="user-meta">
            {user?.name || 'Mission Desk Operator'}
            <small>{user?.role || 'Response Desk Specialist'}</small>
          </div>
        </div>

        {/* Working Sign Out Button */}
        <button className="nav-item" onClick={handleSignOut} style={{ color: '#ef4444' }}>
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="main-area">
        {/* Top Header */}
        <header className="topbar">
          <div className="top-brandline">
            MISSION OPERATIONS <span> / </span> EMERGENCY RESPONSE DESK
          </div>
          <div className="top-right">
            <label className="scenario-select-label" htmlFor="scenario-top">
              SCENARIO
            </label>
            <select
              id="scenario-top"
              aria-label="Select scenario"
              className="top-select"
              value={selected.id}
              onChange={e => {
                const n = { ...state, selectedScenario: e.target.value };
                saveState(n);
                setState(n);
              }}
            >
              {scenarios.map(s => (
                <option key={s.id} value={s.id}>
                  {s.region} · {s.hazard} ({s.place})
                </option>
              ))}
            </select>
            <div className="sim-pill">
              <span className="sim-dot" /> BACKEND SYNCED
            </div>
            <div className={`online-pill ${online ? '' : 'offline'}`}>
              <span className={`online-dot ${online ? '' : 'offline-dot'}`} />
              {online ? 'ONLINE' : 'OFFLINE MODE'}
            </div>
            <span className="clock">{stamp()}</span>
          </div>
        </header>

        {/* Quick Audit Trail Drawer */}
        {trailShown && (
          <div className="quick-trail">
            {state.log.length ? (
              state.log.slice(0, 6).map(item => (
                <div key={item.id} style={{ marginBottom: 6 }}>
                  <strong>{item.time} · {item.kind}</strong>
                  <div>{item.title} — {item.detail}</div>
                  {item.agency && <small style={{ color: '#0369a1' }}>Agency: {item.agency}</small>}
                </div>
              ))
            ) : (
              <div>No operator activity recorded in current session.</div>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="content">
          {children}
          <div className="footer-note">
            APERIO / MISSION OPERATIONS COMMAND CENTER / FASTAPI BACKEND CONNECTED
          </div>
        </div>
      </main>

      {/* Interactive Copilot */}
      <AskAperioCopilot state={state} setState={setState} scenario={selected} />
    </div>
  );
}

// 6. COMMAND ROUTE WRAPPER
function CommandRoute({
  state,
  setState,
  onToast
}: {
  state: LocalState;
  setState: (s: LocalState) => void;
  onToast: (m: string) => void;
}) {
  const [location] = useLocation();
  const scenario = useMemo(
    () => scenarios.find(s => s.id === state.selectedScenario) ?? scenarios[0],
    [state.selectedScenario]
  );

  return (
    <CommandShell state={state} setState={setState}>
      <div className="eyebrow">Mission Control · Operational Workspace</div>
      <div className="page-head">
        <div className="heading">
          <h1>
            {location === '/command-center/overview'
              ? 'Detect. Explain. Assess. Act. Verify.'
              : 'APERIO Command Workspace'}
          </h1>
          <p>Multi-sensor disaster intelligence and human operator review.</p>
        </div>
        <div className="head-meta">
          <strong>APERIO MISSION DESK</strong>
          {scenarios.length} active scenarios · 4 datasets connected
        </div>
      </div>

      {location === '/command-center/overview' ? (
        <MissionControl state={state} setState={setState} scenario={scenario} onToast={onToast} />
      ) : (
        <ModulePage path={location} scenario={scenario} state={state} setState={setState} onToast={onToast} />
      )}
    </CommandShell>
  );
}

// 7. PROTECTED ROUTE CHECKER
function Protected({
  children,
  state
}: {
  children: ReactNode;
  state: LocalState;
}) {
  if (!state.authenticatedUser) {
    return <Redirect to="/sign-in" />;
  }
  return <>{children}</>;
}

// 8. ROOT APPLICATION ROUTER
function App() {
  const [state, setState] = useState<LocalState>(readState);
  const [toast, setToast] = useState('');

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  return (
    <WouterRouter base={basePath}>
      <Switch>
        {/* Public Landing */}
        <Route path="/" component={Home} />

        {/* Authentication */}
        <Route path="/sign-in">
          <SignInPage state={state} setState={setState} />
        </Route>

        <Route path="/select-area">
          <Protected state={state}>
            <SelectArea state={state} setState={setState} onToast={setToast} />
          </Protected>
        </Route>

        {/* Redirect aliases for DEM and Relocation to Overview */}
        <Route path="/command-center/dem">
          <Redirect to="/command-center/overview" />
        </Route>
        <Route path="/command-center/relocation">
          <Redirect to="/command-center/overview" />
        </Route>

        {/* 9 Standard Command Center Routes */}
        {navItems.map(([, path]) => (
          <Route key={path} path={path}>
            <Protected state={state}>
              <CommandRoute state={state} setState={setState} onToast={setToast} />
            </Protected>
          </Route>
        ))}

        {/* Catch-all fallback */}
        <Route>
          <Home />
        </Route>
      </Switch>

      {toast && (
        <div role="status" className="toast">
          {toast}
        </div>
      )}
    </WouterRouter>
  );
}

export default App;
