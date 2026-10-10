export type Hazard = 'Landslide' | 'Flood' | 'Wildfire' | 'Deforestation';

export type Scenario = {
  id: string;
  hazard: Hazard;
  place: string;
  region: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'WATCH';
  risk: number;
  confidence: number;
  area: string;
  population: string;
  rainfall: number;
  slope: number;
  vegetation: number;
  image: string;
  pre_image: string;
  post_image: string;
  description: string;
  coords: [number, number];
  sensors_supported: string[];
  acquisition_date: string;
  is_synthetic?: boolean;
  is_reference_only?: boolean;
  has_imagery?: boolean;
  pre_sensor?: string;
  post_sensor?: string;
  pre_date?: string;
  post_date?: string;
  dataset_source?: string;
  unavailable_notice?: string;
};

export const scenarios: Scenario[] = [
  {
    id: 'FLD-Tinsukia',
    hazard: 'Flood',
    place: 'Tinsukia District',
    region: 'Assam',
    severity: 'MODERATE',
    risk: 26,
    confidence: 88,
    area: '12.4 km²',
    population: '2,450',
    rainfall: 138,
    slope: 4,
    vegetation: 10,
    image: '/motion-flood.jpg',
    has_imagery: true,
    pre_image: '/satellite_imagery/assam_flood/pre_event.png',
    post_image: '/satellite_imagery/assam_flood/post_event.png',
    pre_sensor: 'Sentinel-2 MSI Level-2A (Tile T46RGR True-Color)',
    post_sensor: 'Sentinel-2 MSI Level-2A (Tile T46RGR True-Color)',
    pre_date: '2024-05-22',
    post_date: '2024-07-31',
    dataset_source: 'Microsoft Planetary Computer / Sentinel-2 L2A (10m TCI)',
    description: 'River basin inundation intelligence from District flood-area dataset and real Sentinel-2 L2A True-Color imagery.',
    coords: [27.4922, 95.3468],
    sensors_supported: ['Sentinel-2 MSI Level-2A', 'Sentinel-1 C-SAR IW Mode', 'Sen1Floods11 Ground Truth'],
    acquisition_date: '2024-07-31'
  },
  {
    id: 'wayanad-landslide',
    hazard: 'Landslide',
    place: 'Meppadi, Wayanad',
    region: 'Kerala',
    severity: 'CRITICAL',
    risk: 91,
    confidence: 95,
    area: '7.03 km²',
    population: '4,250',
    rainfall: 180,
    slope: 35,
    vegetation: 22,
    image: '/motion-landslide.jpg',
    has_imagery: true,
    pre_image: '/satellite_imagery/wayanad_landslide/pre_event.png',
    post_image: '/satellite_imagery/wayanad_landslide/post_event.png',
    pre_sensor: 'Sentinel-2 MSI Level-2A (Tile T43PEN True-Color)',
    post_sensor: 'Sentinel-2 MSI Level-2A (Tile T43PEN True-Color)',
    pre_date: '2024-06-29',
    post_date: '2024-08-13',
    dataset_source: 'Microsoft Planetary Computer / Sentinel-2 L2A (10m TCI)',
    description: 'Debris avalanche, regolith saturation and slope failure intelligence with real Sentinel-2 L2A True-Color imagery.',
    coords: [11.556, 76.135],
    sensors_supported: ['Sentinel-2 MSI Level-2A', 'Sentinel-1 C-SAR (IW)', 'Copernicus GLO-30 DEM'],
    acquisition_date: '2024-08-13'
  },
  {
    id: 'DEF-DEF_00007',
    hazard: 'Deforestation',
    place: 'Western Ghats Corridor',
    region: 'Kerala',
    severity: 'WATCH',
    risk: 1,
    confidence: 80,
    area: '1.8 km²',
    population: '520',
    rainfall: 64,
    slope: 36,
    vegetation: 42,
    image: '/motion-deforestation.jpg',
    has_imagery: true,
    pre_image: '/satellite_imagery/deforestation/pre_event.png',
    post_image: '/satellite_imagery/deforestation/post_event.png',
    pre_sensor: 'Sentinel-2 MSI Level-2A (Tile 43PFM True-Color)',
    post_sensor: 'Sentinel-2 MSI Level-2A (Tile 43PFM True-Color)',
    pre_date: '2024-02-07',
    post_date: '2024-05-07',
    dataset_source: 'Microsoft Planetary Computer / Sentinel-2 L2A (10m TCI)',
    description: 'Forest canopy disturbance tracking with real bi-temporal Sentinel-2 L2A True-Color observation granules.',
    coords: [10.885441, 76.520764],
    sensors_supported: ['Sentinel-2 MSI Level-2A', 'Sentinel-1 C-SAR (Biomass)'],
    acquisition_date: '2024-05-07',
    is_synthetic: false
  },
  {
    id: 'FIRE-UT-00001',
    hazard: 'Wildfire',
    place: 'Garhwal Division',
    region: 'Uttarakhand',
    severity: 'HIGH',
    risk: 64,
    confidence: 75,
    area: '4.2 km²',
    population: '1,850',
    rainfall: 18,
    slope: 22,
    vegetation: 34,
    image: '/motion-wildfire.jpg',
    has_imagery: true,
    pre_image: '/satellite_imagery/uttarakhand_wildfire/pre_event.png',
    post_image: '/satellite_imagery/uttarakhand_wildfire/post_event.png',
    pre_sensor: 'Sentinel-2 MSI Level-2A (Tile 44RMU True-Color)',
    post_sensor: 'Sentinel-2 MSI Level-2A (Tile 44RMU True-Color)',
    pre_date: '2017-02-16',
    post_date: '2017-03-28',
    dataset_source: 'Microsoft Planetary Computer / Sentinel-2 L2A (10m TCI)',
    description: 'Active thermal wildfire radiometer detection and real Sentinel-2 L2A True-Color burn scar observations.',
    coords: [29.710, 79.917],
    sensors_supported: ['Sentinel-2 MSI Level-2A', 'MODIS/VIIRS Active Fire Radiometer (FRP)'],
    acquisition_date: '2017-03-28'
  }
];

export type AppEvent = {
  id: string;
  title: string;
  detail: string;
  time: string;
  kind?: string;
  operator?: string;
  agency?: string;
  status?: string;
};

const KEY = 'aperio-platform-local-v2';

export type LocalState = {
  selectedScenario: string;
  log: AppEvent[];
  resources: Record<string, number>;
  layers: Record<string, boolean>;
  approvedActions: string[];
  reports: number;
  chatMessages: {
    question: string;
    answer: string;
    sources?: string[];
    confidence?: number;
    mapTarget?: {
      target_name: string;
      target_type: string;
      lat?: number;
      lon?: number;
      action?: string;
    };
    error?: boolean;
  }[];
  observations: number;
  authenticatedUser: { email: string; name: string; role: string; organization: string } | null;
  highlightedMapTarget?: {
    target_name: string;
    target_type: string;
    lat?: number;
    lon?: number;
    action?: string;
  } | null;
};

export const freshState = (): LocalState => ({
  selectedScenario: scenarios[0].id,
  log: [],
  resources: {
    'Shelter capacity': 5000,
    'Ambulances': 12,
    'Food meals': 3800,
    'Water litres': 4200,
    'Beds': 720,
    'Medical staff': 18,
    'Emergency vehicles': 8
  },
  layers: {
    Risk: true,
    Satellite: true,
    'SAM segmentation': true,
    DEM: false,
    Slope: false,
    Rainfall: false,
    Population: false,
    Shelters: true,
    Hospitals: true,
    Roads: true,
    'Evacuation routes': true,
    Resources: false
  },
  approvedActions: [],
  reports: 0,
  chatMessages: [],
  observations: 0,
  authenticatedUser: {
    email: 'operator@aperio.org',
    name: 'Mission Desk Operator',
    role: 'Response Desk Specialist',
    organization: 'APERIO Earth Intelligence Mission Operations'
  }
});

export function readState(): LocalState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...freshState(), ...saved };
    }
  } catch {
    /* safe local defaults */
  }
  return freshState();
}

export function saveState(state: LocalState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* local storage unavailable */
  }
}

export function stamp() {
  return new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function pushEvent(
  state: LocalState,
  title: string,
  detail: string,
  kind = 'Operator',
  extra?: Partial<AppEvent>
): LocalState {
  return {
    ...state,
    log: [
      {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title,
        detail,
        time: stamp(),
        kind,
        operator: state.authenticatedUser?.name || 'Mission Desk Operator',
        ...extra
      },
      ...state.log
    ].slice(0, 40)
  };
}

export const operationalDisclaimer =
  'Official Emergency Operations Interface. Ground verification is required by Incident Commander before dispatching tactical personnel or issuing mandatory civil orders.';

export const mapLayers = [
  'Risk',
  'Satellite',
  'SAM segmentation',
  'DEM',
  'Slope',
  'Rainfall',
  'Population',
  'Shelters',
  'Hospitals',
  'Roads',
  'Evacuation routes',
  'Resources'
];

export const navItems = [
  ['Overview', '/command-center/overview'],
  ['Priority alerts', '/command-center/priority-alerts'],
  ['Change detection', '/command-center/change-detection'],
  ['Compare regions', '/command-center/compare-regions'],
  ['Risk simulator', '/command-center/risk-simulator'],
  ['Resources', '/command-center/resources'],
  ['Reports', '/command-center/reports'],
  ['Monitoring', '/command-center/monitoring']
];
