// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { fetchDemTerrain } from './api';
import type { Scenario } from './data';
import { scenarios } from './data';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

type Props = {
  scenario?: Scenario;
  demData?: any;
  risk?: number;
};

// Generates canvas texture for crisp 3D WebGL billboard badges
function makeBadgeTexture(text: string, fgColor: string, borderColor: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 340;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  // White pill background with border
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(8, 8, 324, 84, 18);
  ctx.fill();
  ctx.stroke();

  // Text label
  ctx.fillStyle = fgColor;
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 170, 50);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// 3D Billboard Pin (Pure WebGL - immune to React DOM reconciliation errors)
function BadgePin({
  position,
  text,
  fgColor,
  borderColor
}: {
  position: [number, number, number];
  text: string;
  fgColor: string;
  borderColor: string;
}) {
  const texture = useMemo(() => makeBadgeTexture(text, fgColor, borderColor), [text, fgColor, borderColor]);

  return (
    <group position={position}>
      {/* Pin Stem */}
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 1.3, 12]} />
        <meshBasicMaterial color={borderColor} />
      </mesh>
      {/* Pin Ground Anchor Dot */}
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshBasicMaterial color={borderColor} />
      </mesh>
      {/* Billboard Sprite */}
      <sprite scale={[3.0, 0.9, 1]} position={[0, 1.6, 0]}>
        <spriteMaterial map={texture} depthTest={false} transparent />
      </sprite>
    </group>
  );
}

// 3D Realistic Terrain Mesh Surface
function TerrainMesh({
  grid,
  minElev,
  maxElev,
  exaggeration,
  showContours,
  showHillshade,
  scenario
}: {
  grid: number[][];
  minElev: number;
  maxElev: number;
  exaggeration: number;
  showContours: boolean;
  showHillshade: boolean;
  scenario?: Scenario;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, peakPoint, lowPoint, centerPoint } = useMemo(() => {
    const size = 16;
    const segments = 63; // 64x64 vertices
    const g = new THREE.PlaneGeometry(size, size, segments, segments);
    g.rotateX(-Math.PI / 2);

    const pos = g.attributes.position;
    const colors: number[] = [];
    const delta = Math.max(1, maxElev - minElev);
    const heightScale = 3.2 * exaggeration;

    let highestY = -Infinity;
    let highestIdx = 0;
    let lowestY = Infinity;
    let lowestIdx = 0;
    const centerIdx = 32 * 64 + 32;

    for (let r = 0; r < 64; r++) {
      for (let c = 0; c < 64; c++) {
        const idx = r * 64 + c;
        const elev = grid[r] && grid[r][c] !== undefined ? grid[r][c] : minElev;
        const normH = Math.max(0, Math.min(1, (elev - minElev) / delta));

        // Elevation height
        const y = normH * heightScale;
        pos.setY(idx, y);

        if (y > highestY) {
          highestY = y;
          highestIdx = idx;
        }
        if (y < lowestY) {
          lowestY = y;
          lowestIdx = idx;
        }

        // Natural Topographic Hypsometric Tints:
        // Sand/pale buff lowland -> Muted forest green mid slopes -> Deep olive mountain flanks -> Dark charcoal rock peak
        let color = new THREE.Color();
        if (normH < 0.25) {
          const t = normH / 0.25;
          color.setRGB(0.82 - t * 0.15, 0.78 - t * 0.05, 0.68 - t * 0.12);
        } else if (normH < 0.55) {
          const t = (normH - 0.25) / 0.3;
          color.setRGB(0.52 - t * 0.18, 0.65 - t * 0.18, 0.48 - t * 0.15);
        } else if (normH < 0.82) {
          const t = (normH - 0.55) / 0.27;
          color.setRGB(0.34 - t * 0.08, 0.44 - t * 0.18, 0.32 - t * 0.10);
        } else {
          const t = (normH - 0.82) / 0.18;
          color.setRGB(0.26 + t * 0.10, 0.23 + t * 0.08, 0.22 + t * 0.08);
        }

        // 50m Contours Modulation
        if (showContours) {
          const contourFraction = (normH * 10) % 1;
          if (contourFraction < 0.07 || contourFraction > 0.93) {
            color.multiplyScalar(0.72);
          }
        }

        colors.push(color.r, color.g, color.b);
      }
    }

    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();

    const peakPos = [pos.getX(highestIdx), pos.getY(highestIdx), pos.getZ(highestIdx)] as [number, number, number];
    const lowPos = [pos.getX(lowestIdx), pos.getY(lowestIdx), pos.getZ(lowestIdx)] as [number, number, number];
    const centerPos = [pos.getX(centerIdx), pos.getY(centerIdx), pos.getZ(centerIdx)] as [number, number, number];

    return {
      geometry: g,
      peakPoint: peakPos,
      lowPoint: lowPos,
      centerPoint: centerPos
    };
  }, [grid, minElev, maxElev, exaggeration, showContours]);

  return (
    <group>
      {/* 3D Terrain Surface */}
      <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          roughness={showHillshade ? 0.82 : 0.95}
          metalness={0.02}
          flatShading={false}
        />
      </mesh>

      {/* Floating 3D Badge: Peak Elevation */}
      {peakPoint && (
        <BadgePin
          position={peakPoint}
          text={`▲ Peak ${maxElev}m`}
          fgColor="#065f46"
          borderColor="#059669"
        />
      )}

      {/* Floating 3D Badge: Lowest Elevation */}
      {lowPoint && (
        <BadgePin
          position={lowPoint}
          text={`● Low ${minElev}m`}
          fgColor="#0369a1"
          borderColor="#0284c7"
        />
      )}

      {/* Floating 3D Badge: Event Epicenter */}
      {centerPoint && (
        <BadgePin
          position={centerPoint}
          text={`◈ ${scenario?.place || 'Epicenter'}`}
          fgColor="#991b1b"
          borderColor="#dc2626"
        />
      )}
    </group>
  );
}

export default function Terrain({ scenario, demData: incomingDem }: Props) {
  const [demData, setDemData] = useState<any>(incomingDem || null);
  const [exaggeration, setExaggeration] = useState<number>(1.6);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showHillshade, setShowHillshade] = useState<boolean>(true);
  const [selectedArea, setSelectedArea] = useState<string>(scenario?.id || scenarios[0].id);
  const controlsRef = useRef<any>(null);

  // Sync selected area with scenario prop
  useEffect(() => {
    if (scenario?.id) setSelectedArea(scenario.id);
  }, [scenario?.id]);

  // Fetch DEM data
  useEffect(() => {
    let mounted = true;
    const scenId = selectedArea || 'wayanad-landslide';
    fetchDemTerrain(scenId).then(res => {
      if (mounted && res) {
        setDemData(res);
      }
    });
    return () => {
      mounted = false;
    };
  }, [selectedArea]);

  const currentScen = scenarios.find(s => s.id === selectedArea) || scenario || scenarios[0];

  // Elevation Grid
  const elevationGrid: number[][] = useMemo(() => {
    if (demData?.elevation_grid && Array.isArray(demData.elevation_grid) && demData.elevation_grid.length >= 64) {
      return demData.elevation_grid;
    }
    const grid: number[][] = [];
    const base = demData?.elevation_min || (currentScen?.slope ? currentScen.slope * 15 + 200 : 800);
    const range = demData?.elevation_max ? demData.elevation_max - base : (currentScen?.slope ? currentScen.slope * 30 : 650);

    for (let r = 0; r < 64; r++) {
      const row: number[] = [];
      for (let c = 0; c < 64; c++) {
        const x = (c - 32) / 12;
        const y = (r - 32) / 12;
        const mountain = Math.exp(-(x * x + y * y) / 4.5) * 0.75 + Math.cos(x * 1.5) * Math.sin(y * 1.5) * 0.25;
        row.push(base + Math.max(0, mountain) * range);
      }
      grid.push(row);
    }
    return grid;
  }, [demData, currentScen]);

  const minElev = demData?.elevation_min ?? 752;
  const maxElev = demData?.elevation_max ?? 1657;
  const meanElev = demData?.elevation_mean ?? Math.round((minElev + maxElev) / 2);
  const elevDelta = demData?.elevation_delta ?? Math.round(maxElev - minElev);
  const meanSlope = demData?.slope_mean_deg ?? (currentScen?.slope ?? 32);
  const maxSlope = demData?.slope_max_deg ?? Math.round(meanSlope * 1.55);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleZoom = (delta: number) => {
    if (controlsRef.current) {
      const cam = controlsRef.current.object;
      cam.position.multiplyScalar(delta);
      controlsRef.current.update();
    }
  };

  return (
    <div
      className="terrain-clean-wrap"
      style={{
        background: '#f8fafc',
        position: 'relative',
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
      }}
    >
      {/* 1. Clean Top Header Bar */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '8px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          zIndex: 10,
          position: 'relative'
        }}
      >
        {/* Left: Study Area Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#475569', letterSpacing: 0.5 }}>
            DEM STUDY AREA:
          </span>
          <select
            className="field-select"
            value={selectedArea}
            onChange={e => setSelectedArea(e.target.value)}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: '#0f172a',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>
                {s.place} ({s.hazard} Epicenter &amp; Terrain)
              </option>
            ))}
          </select>
        </div>

        {/* Right: Interactive Controls (Elevation, Contours, Hillshade, Zoom) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Elevation Exaggeration Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#475569' }}>
            <span>Elevation:</span>
            <input
              type="range"
              min="0.8"
              max="2.5"
              step="0.1"
              value={exaggeration}
              onChange={e => setExaggeration(parseFloat(e.target.value))}
              style={{ width: 80, cursor: 'pointer', accentColor: '#0284c7' }}
            />
            <span style={{ fontWeight: 700, minWidth: 32, color: '#0284c7' }}>
              {exaggeration.toFixed(1)}x
            </span>
          </div>

          {/* Contours Toggle */}
          <button
            type="button"
            onClick={() => setShowContours(!showContours)}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 4,
              cursor: 'pointer',
              border: showContours ? '1.5px solid #059669' : '1px solid #cbd5e1',
              background: showContours ? '#ecfdf5' : '#ffffff',
              color: showContours ? '#065f46' : '#64748b'
            }}
          >
            50m Contours
          </button>

          {/* Hillshade Toggle */}
          <button
            type="button"
            onClick={() => setShowHillshade(!showHillshade)}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 4,
              cursor: 'pointer',
              border: showHillshade ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
              background: showHillshade ? '#f0f9ff' : '#ffffff',
              color: showHillshade ? '#0369a1' : '#64748b'
            }}
          >
            Hillshade
          </button>

          {/* Camera Controls */}
          <div style={{ display: 'flex', gap: 2, borderLeft: '1px solid #e2e8f0', paddingLeft: 8 }}>
            <button
              type="button"
              onClick={() => handleZoom(0.85)}
              title="Zoom In"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#64748b' }}
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(1.15)}
              title="Zoom Out"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#64748b' }}
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={handleResetCamera}
              title="Reset View"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#64748b' }}
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Three.js Clean 3D Map Canvas */}
      <div style={{ height: 420, width: '100%', position: 'relative' }}>
        <Canvas camera={{ position: [16, 15, 17], fov: 36 }} shadows>
          {/* Light clean background */}
          <color attach="background" args={['#f8fafc']} />
          <ambientLight intensity={1.1} />
          {/* Sun directional light creating realistic hillshade */}
          <directionalLight
            position={[18, 24, 14]}
            intensity={showHillshade ? 2.5 : 1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-14, 10, -12]} intensity={0.5} color="#e0f2fe" />

          {/* 3D Realistic Terrain */}
          <TerrainMesh
            grid={elevationGrid}
            minElev={minElev}
            maxElev={maxElev}
            exaggeration={exaggeration}
            showContours={showContours}
            showHillshade={showHillshade}
            scenario={currentScen}
          />

          {/* Clean Subtle Ground Base Grid */}
          <gridHelper args={[22, 22, '#cbd5e1', '#e2e8f0']} position={[0, -0.02, 0]} />

          {/* 3D Orbit Controls */}
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.06}
            minDistance={8}
            maxDistance={35}
            maxPolarAngle={Math.PI * 0.48}
          />
        </Canvas>

        {/* 3. Bottom-Left Clean Floating Readings Card */}
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            padding: '12px 16px',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.1)',
            maxWidth: 340,
            zIndex: 10
          }}
        >
          {/* Card Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', letterSpacing: 0.5 }}>
              ELEVATION &amp; TOPOGRAPHY
            </span>
            <span style={{ fontSize: 9, color: '#0284c7', fontWeight: 600 }}>
              Copernicus 30m
            </span>
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 10 }}>
            {currentScen.place} · 64×64 Sampled Grid
          </div>

          {/* Elevation Gradient Bar */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#475569', marginBottom: 3 }}>
              <span>Low ({minElev}m)</span>
              <span>Mid ({meanElev}m)</span>
              <span>High ({maxElev}m)</span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: 'linear-gradient(to right, #d4ccb0 0%, #769a74 35%, #466848 65%, #3c3430 100%)',
                border: '1px solid #cbd5e1'
              }}
            />
          </div>

          {/* Key Readings Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              padding: '8px 10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              marginBottom: 8
            }}
          >
            <div>
              <span style={{ fontSize: 8, color: '#64748b', display: 'block' }}>HIGHEST</span>
              <strong style={{ fontSize: 13, color: '#059669' }}>▲ {maxElev}m</strong>
            </div>
            <div>
              <span style={{ fontSize: 8, color: '#64748b', display: 'block' }}>LOWEST</span>
              <strong style={{ fontSize: 13, color: '#0284c7' }}>● {minElev}m</strong>
            </div>
            <div>
              <span style={{ fontSize: 8, color: '#64748b', display: 'block' }}>RANGE</span>
              <strong style={{ fontSize: 13, color: '#334155' }}>{elevDelta}m</strong>
            </div>
          </div>

          {/* Slope Readings */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
            <span>Mean Slope: <b>{meanSlope}°</b></span>
            <span>Max Slope: <b style={{ color: '#dc2626' }}>{maxSlope}°</b></span>
          </div>

          {/* Legend Description */}
          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>
            ▲ Peak / Ridge Summit · ● Valley Basin · ◈ Epicenter
          </div>
        </div>
      </div>
    </div>
  );
}
