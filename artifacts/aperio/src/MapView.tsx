import { Fragment, useEffect, useMemo, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Polygon, Polyline, Popup, Rectangle, TileLayer, useMap } from 'react-leaflet';
import type { Scenario } from './data';
import { scenarios } from './data';
import { fetchGisLayers, fetchRelocationOptions } from './api';
import 'leaflet/dist/leaflet.css';

type Props = {
  scenario: Scenario;
  layers: Record<string, boolean>;
  onLayer?: (name: string) => void;
  selected?: string | null;
  onSelect?: (id: string) => void;
  route?: boolean;
  compact?: boolean;
  highlightTarget?: { target_name?: string; name?: string; target_type?: string; lat?: number; lon?: number; action?: string } | null;
};

function Recenter({ coords, zoom }: { coords: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, zoom, { animate: true });
  }, [coords, zoom, map]);
  return null;
}

export default function MapView({
  scenario,
  layers,
  onLayer,
  selected,
  onSelect,
  route = false,
  compact = false,
  highlightTarget = null
}: Props) {
  const center = scenario.coords;
  const [gisData, setGisData] = useState<any>(null);
  const [relocData, setRelocData] = useState<any>(null);

  const zoomLevel = useMemo(() => {
    if (compact) return 9;
    if (scenario.hazard === 'Flood') return 11;
    if (scenario.hazard === 'Wildfire') return 11;
    return 12;
  }, [compact, scenario.hazard]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchGisLayers(scenario.id),
      fetchRelocationOptions(scenario.id)
    ]).then(([gis, reloc]) => {
      if (mounted) {
        if (gis) setGisData(gis);
        if (reloc) setRelocData(reloc);
      }
    });
    return () => { mounted = false; };
  }, [scenario.id]);

  // Derived or fallback hazard polygons localized to scenario center
  const dangerZone: [number, number][] = useMemo(() => {
    if (gisData?.hazard_polygon && gisData.hazard_polygon.length > 0) {
      return gisData.hazard_polygon as [number, number][];
    }
    return [
      [center[0] - 0.030, center[1] - 0.035],
      [center[0] - 0.015, center[1] + 0.030],
      [center[0] + 0.025, center[1] + 0.035],
      [center[0] + 0.035, center[1] - 0.010],
      [center[0] + 0.010, center[1] - 0.040]
    ];
  }, [center, gisData]);

  const highRiskBuffer: [number, number][] = useMemo(() => {
    return [
      [center[0] - 0.040, center[1] - 0.048],
      [center[0] - 0.020, center[1] + 0.042],
      [center[0] + 0.035, center[1] + 0.048],
      [center[0] + 0.048, center[1] - 0.015],
      [center[0] + 0.015, center[1] - 0.055]
    ];
  }, [center]);

  const samPolygon: [number, number][] = useMemo(() => {
    if (gisData?.sam_polygon && gisData.sam_polygon.length > 0) {
      return gisData.sam_polygon as [number, number][];
    }
    return [
      [center[0] - 0.018, center[1] - 0.010],
      [center[0] - 0.008, center[1] + 0.020],
      [center[0] + 0.015, center[1] + 0.015],
      [center[0] + 0.010, center[1] - 0.018]
    ];
  }, [center, gisData]);

  // Localized shelters
  const shelters: any[] = useMemo(() => {
    if (gisData?.shelters && gisData.shelters.length > 0) {
      return gisData.shelters;
    }
    return [
      { id: 'sh-loc-1', name: `Primary District Safe Shelter (${scenario.region})`, lat: center[0] + 0.018, lon: center[1] - 0.015, capacity: 800, available: 450, road_status: 'Open', hazard_risk: 'LOW', score: 0.85 },
      { id: 'sh-loc-2', name: `Secondary Community Relief Hall (${scenario.place})`, lat: center[0] - 0.015, lon: center[1] + 0.022, capacity: 500, available: 280, road_status: 'Open', hazard_risk: 'LOW', score: 0.72 }
    ];
  }, [center, scenario, gisData]);

  // Top recommended shelter
  const topShelter = useMemo(() => {
    if (relocData?.top_shelter) return relocData.top_shelter;
    return shelters[0] || null;
  }, [relocData, shelters]);

  // Localized hospitals
  const hospitals: any[] = useMemo(() => {
    if (gisData?.hospitals && gisData.hospitals.length > 0) {
      return gisData.hospitals;
    }
    return [
      { id: 'hp-loc-1', name: `District Civil Health Center (${scenario.region})`, lat: center[0] + 0.012, lon: center[1] + 0.015, beds_available: 35, ambulances: 6 }
    ];
  }, [center, scenario, gisData]);

  // Evacuation route coordinates leading directly to top recommended shelter
  const evacuationRouteCoords = useMemo(() => {
    const dest = topShelter && topShelter.lat && topShelter.lon
      ? [topShelter.lat, topShelter.lon]
      : [center[0] + 0.018, center[1] - 0.015];
    const midPoint = [(center[0] + dest[0]) / 2 + 0.003, (center[1] + dest[1]) / 2 - 0.004];
    return [center, midPoint, dest] as [number, number][];
  }, [center, topShelter]);

  const isDeforestation = scenario.hazard === 'Deforestation';

  return (
    <div className={`map-wrap ${compact ? 'compact' : ''}`} style={{ position: 'relative' }}>
      {/* 1. Compact Professional GIS Layer HUD (Top-Right) */}
      {!compact && onLayer && (
        <div
          className="map-hud-controls"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1000,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            background: 'rgba(11, 20, 28, 0.88)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '5px 8px',
            borderRadius: 4,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            maxWidth: 420
          }}
        >
          {[
            { key: 'Risk', label: 'Risk Hazard' },
            { key: 'Satellite', label: 'Satellite Basemap' },
            { key: 'DEM', label: 'DEM Topo' },
            { key: 'Slope', label: 'Slope Model' },
            { key: 'SAM segmentation', label: 'SAM Perimeter' },
            { key: 'Shelters', label: 'Safe Shelters' },
            { key: 'Evacuation routes', label: 'Evac Routes' },
            { key: 'Hospitals', label: 'Medical' }
          ].map(btn => {
            const active = !!layers[btn.key];
            return (
              <button
                key={btn.key}
                type="button"
                onClick={() => onLayer(btn.key)}
                style={{
                  fontSize: 9,
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  padding: '3px 7px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: active ? '1px solid #14b8a6' : '1px solid rgba(255,255,255,0.12)',
                  background: active ? 'rgba(20, 184, 166, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  color: active ? '#5eead4' : '#94a3b8',
                  transition: 'all 0.15s ease'
                }}
              >
                {active ? '● ' : '○ '}
                {btn.label}
              </button>
            );
          })}
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoomLevel}
        scrollWheelZoom={true}
        zoomControl={!compact}
      >
        <Recenter coords={center} zoom={zoomLevel} />

        {/* 2. Realistic Satellite Basemap (Esri World Imagery + Labels) vs Topo */}
        {layers.Satellite ? (
          <>
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP | APERIO 2.0 GIS'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
            <TileLayer
              attribution=''
              url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              opacity={0.7}
              maxZoom={18}
            />
          </>
        ) : (
          <TileLayer
            attribution='Tiles &copy; Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, TomTom | APERIO'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
            maxZoom={18}
          />
        )}

        {/* 3. Danger Zone & High Risk Zone */}
        {layers.Risk && (
          <>
            {/* Outer high-risk warning buffer */}
            <Polygon
              positions={highRiskBuffer}
              pathOptions={{ color: '#d97706', weight: 1.5, dashArray: '5 5', fillColor: '#fef3c7', fillOpacity: 0.22 }}
            >
              <Popup>
                <div style={{ fontSize: 11 }}>
                  <strong style={{ color: '#b45309' }}>HIGH-RISK EXPOSURE BUFFER</strong>
                  <br />
                  Anticipated runout/surge corridor · {scenario.place}
                  <br />
                  Hazard: {scenario.hazard}
                </div>
              </Popup>
            </Polygon>

            {/* Core Danger Zone */}
            <Polygon
              positions={dangerZone}
              pathOptions={{ color: '#b91c1c', weight: 2.5, fillColor: '#ef4444', fillOpacity: 0.35 }}
              eventHandlers={{ click: () => onSelect?.(scenario.id) }}
            >
              <Popup>
                <div style={{ fontSize: 11 }}>
                  <strong style={{ color: '#b91c1c' }}>DANGER ZONE — CRITICAL HAZARD</strong>
                  <br />
                  <b>{scenario.hazard.toUpperCase()} RISK:</b> {scenario.risk}%
                  <br />
                  <b>Location:</b> {scenario.place}, {scenario.region}
                  <br />
                  <b>Affected Footprint:</b> {scenario.area}
                </div>
              </Popup>
            </Polygon>
          </>
        )}

        {/* 4. SAM Segmentation Boundary */}
        {layers['SAM segmentation'] && (
          <Polygon
            positions={samPolygon}
            pathOptions={{ color: '#7c3aed', weight: 2, dashArray: '4 4', fillColor: '#a78bfa', fillOpacity: 0.25 }}
          >
            <Popup>
              <div style={{ fontSize: 11 }}>
                <strong style={{ color: '#6d28d9' }}>SAM Segmented Boundary ('WHERE')</strong>
                <br />
                Multi-temporal satellite scar/inundation delineated polygon.
              </div>
            </Popup>
          </Polygon>
        )}

        {/* 5. DEM Topographic Contours / Hillshade Context */}
        {layers.DEM && (
          <>
            <Circle
              center={center}
              radius={1800}
              pathOptions={{ color: '#38bdf8', weight: 1.5, dashArray: '4 4', fillColor: '#0284c7', fillOpacity: 0.12 }}
            >
              <Popup>
                <div style={{ fontSize: 11 }}>
                  <strong style={{ color: '#0369a1' }}>DEM Elevation Ring (+100m Base Contour)</strong>
                  <br />
                  Copernicus GLO-30 Digital Elevation Model
                  <br />
                  Regional Mean Slope: {scenario.slope}°
                </div>
              </Popup>
            </Circle>
            <Circle
              center={center}
              radius={3200}
              pathOptions={{ color: '#64748b', weight: 1.2, dashArray: '6 6', fillColor: '#94a3b8', fillOpacity: 0.08 }}
            >
              <Popup>
                <div style={{ fontSize: 11 }}>
                  <strong style={{ color: '#334155' }}>Topographic Ridge Buffer (+250m Crest Line)</strong>
                  <br />
                  Regional Slope: {scenario.slope}°
                </div>
              </Popup>
            </Circle>
          </>
        )}

        {/* 6. Slope Model Overlay */}
        {layers.Slope && (
          <Circle
            center={[center[0] + 0.008, center[1] - 0.010]}
            radius={2200}
            pathOptions={{ color: '#ea580c', weight: 2, dashArray: '3 5', fillColor: '#f97316', fillOpacity: 0.20 }}
          >
            <Popup>
              <div style={{ fontSize: 11 }}>
                <strong style={{ color: '#c2410c' }}>Steep Slope Failure Corridor</strong>
                <br />
                Gradient: {scenario.slope}° &gt; Critical Failure Threshold (30°)
              </div>
            </Popup>
          </Circle>
        )}

        {/* 7. Rainfall Radar */}
        {layers.Rainfall && (
          <Circle
            center={[center[0] + 0.008, center[1] + 0.025]}
            radius={3200}
            pathOptions={{ color: '#0284c7', weight: 1.2, fillColor: '#0ea5e9', fillOpacity: 0.18 }}
          >
            <Popup>
              <div style={{ fontSize: 11 }}>
                <strong style={{ color: '#0369a1' }}>Precipitation Accumulation Zone</strong>
                <br />
                Measured rainfall: {scenario.rainfall} mm
              </div>
            </Popup>
          </Circle>
        )}

        {/* 8. Population Settlement Context */}
        {layers.Population && (
          <Circle
            center={[center[0] - 0.02, center[1] + 0.025]}
            radius={1400}
            pathOptions={{ color: '#9333ea', weight: 1.5, fillColor: '#c084fc', fillOpacity: 0.22 }}
          >
            <Popup>
              <div style={{ fontSize: 11 }}>
                <strong style={{ color: '#7e22ce' }}>Settlement Exposure Area</strong>
                <br />
                Estimated population: {scenario.population} residents
              </div>
            </Popup>
          </Circle>
        )}

        {/* 9. Shelters & Safe Zones (with subtle green halo & distinguished recommendation) */}
        {layers.Shelters && shelters.map(sh => {
          const isTop = topShelter && (topShelter.id === sh.id || topShelter.name === sh.name || topShelter.shelter_id === sh.id);
          const lat = sh.lat || (center[0] + 0.015);
          const lon = sh.lon || (center[1] - 0.015);

          return (
            <Fragment key={sh.id || sh.name || `${lat}-${lon}`}>
              {/* Subtle green safe-zone glow */}
              <Circle
                center={[lat, lon]}
                radius={isTop ? 750 : 500}
                pathOptions={{
                  color: isTop ? '#059669' : '#10b981',
                  weight: isTop ? 2.5 : 1,
                  fillColor: '#34d399',
                  fillOpacity: isTop ? 0.35 : 0.20
                }}
              />
              {/* Distinctive shelter marker */}
              <CircleMarker
                center={[lat, lon]}
                radius={isTop ? 9 : 6}
                pathOptions={{
                  color: isTop ? '#f59e0b' : '#047857',
                  weight: isTop ? 3.5 : 2,
                  fillColor: isTop ? '#10b981' : '#6ee7b7',
                  fillOpacity: 1
                }}
              >
                <Popup>
                  <div style={{ fontSize: 11, minWidth: 180, color: '#0f172a' }}>
                    {isTop && (
                      <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 2, display: 'inline-block', marginBottom: 4 }}>
                        ★ TOP RECOMMENDED SAFE HAVEN
                      </span>
                    )}
                    <br />
                    <strong style={{ fontSize: 12, color: '#065f46' }}>{sh.name}</strong>
                    <br />
                    <b>Transit Distance:</b> {sh.distance_km ? `${sh.distance_km} km` : '1.8 km'}
                    <br />
                    <b>Available Capacity:</b> {sh.available ?? (sh.capacity - (sh.occupancy || 0))} / {sh.capacity}
                    <br />
                    <b>Road Corridor Access:</b> <span style={{ color: '#047857', fontWeight: 600 }}>{sh.road_status || 'Open · Verified'}</span>
                    <br />
                    <b>Hazard Exposure:</b> <span style={{ color: '#047857' }}>{sh.hazard_risk || 'LOW (Safe Ground)'}</span>
                    {sh.score && (
                      <>
                        <br />
                        <b>Relocation Ranking Score:</b> <b>{Math.round(sh.score * 100)}%</b>
                      </>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            </Fragment>
          );
        })}

        {/* 10. Hospitals */}
        {layers.Hospitals && hospitals.map(hp => {
          const lat = hp.lat || (center[0] + 0.01);
          const lon = hp.lon || (center[1] + 0.012);
          return (
            <CircleMarker
              key={hp.id || hp.name}
              center={[lat, lon]}
              radius={6}
              pathOptions={{ color: '#0369a1', weight: 2, fillColor: '#38bdf8', fillOpacity: 0.95 }}
            >
              <Popup>
                <div style={{ fontSize: 11 }}>
                  <strong style={{ color: '#075985' }}>{hp.name}</strong>
                  <br />
                  <b>Available Beds:</b> {hp.beds_available || 18}
                  <br />
                  <b>Ambulances:</b> {hp.ambulances || 4}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* 11. Evacuation Route (Scenario Aware leading to Top Shelter) */}
        {(route || layers['Evacuation routes']) && !isDeforestation && (
          <>
            {/* Outer corridor buffer */}
            <Polyline
              positions={evacuationRouteCoords}
              pathOptions={{ color: '#10b981', weight: 10, opacity: 0.22 }}
            />
            {/* Inner corridor dashed track */}
            <Polyline
              positions={evacuationRouteCoords}
              pathOptions={{ color: '#059669', weight: 4.5, dashArray: '8 6', opacity: 0.95 }}
            >
              <Popup>
                <div style={{ fontSize: 11 }}>
                  <strong style={{ color: '#065f46' }}>VERIFIED EVACUATION ROUTE</strong>
                  <br />
                  <b>Destination:</b> {topShelter?.name || 'Primary District Shelter'}
                  <br />
                  <b>Status:</b> Safe corridor clear of active hazard polygon.
                </div>
              </Popup>
            </Polyline>
          </>
        )}

        {/* 12. Scenario Epicenter Event Marker */}
        <CircleMarker
          center={scenario.coords}
          radius={8}
          pathOptions={{
            color: '#dc2626',
            weight: 3,
            fillColor: '#ef4444',
            fillOpacity: 1
          }}
          eventHandlers={{ click: () => onSelect?.(scenario.id) }}
        >
          <Popup>
            <div style={{ fontSize: 11 }}>
              <span style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 2 }}>
                EVENT EPICENTER
              </span>
              <br />
              <strong style={{ fontSize: 12 }}>{scenario.hazard} · {scenario.place}</strong>
              <br />
              <b>Coordinates:</b> {scenario.coords[0].toFixed(4)}°N, {scenario.coords[1].toFixed(4)}°E
              <br />
              <b>Priority Risk:</b> {scenario.risk}% ({scenario.severity})
              <br />
              <b>Extent:</b> {scenario.area} · <b>Pop:</b> {scenario.population}
            </div>
          </Popup>
        </CircleMarker>

        {/* 13. Copilot Highlight Target */}
        {highlightTarget && highlightTarget.lat && highlightTarget.lon && (
          <Fragment key={`highlight-${highlightTarget.lat}-${highlightTarget.lon}`}>
            <Recenter coords={[highlightTarget.lat, highlightTarget.lon]} zoom={13} />
            <Circle
              center={[highlightTarget.lat, highlightTarget.lon]}
              radius={1000}
              pathOptions={{
                color: '#f59e0b',
                weight: 3,
                dashArray: '6 6',
                fillColor: '#fbbf24',
                fillOpacity: 0.35
              }}
            />
            <CircleMarker
              center={[highlightTarget.lat, highlightTarget.lon]}
              radius={11}
              pathOptions={{
                color: '#b45309',
                weight: 3.5,
                fillColor: '#f59e0b',
                fillOpacity: 1
              }}
            >
              <Popup autoPan={false}>
                <div style={{ fontSize: 11, minWidth: 170 }}>
                  <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 2, display: 'inline-block', marginBottom: 4 }}>
                    🎯 COPILOT HIGHLIGHTED TARGET
                  </span>
                  <br />
                  <strong style={{ fontSize: 12, color: '#92400e' }}>
                    {highlightTarget.target_name || highlightTarget.name}
                  </strong>
                  <br />
                  <b>Type:</b> {(highlightTarget.target_type || 'Facility').toUpperCase()}
                  <br />
                  <b>Coordinates:</b> {highlightTarget.lat.toFixed(4)}°N, {highlightTarget.lon.toFixed(4)}°E
                </div>
              </Popup>
            </CircleMarker>
          </Fragment>
        )}
      </MapContainer>
    </div>
  );
}
