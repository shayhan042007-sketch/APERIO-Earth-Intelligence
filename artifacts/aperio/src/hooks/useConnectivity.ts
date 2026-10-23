import { useCallback, useSyncExternalStore } from 'react';
import { API_BASE } from '@/api';

export interface ConnectivityState {
  isOnline: boolean;          // true when both network AND backend API are connected
  networkOnline: boolean;     // true when navigator.onLine is true
  apiReachable: boolean;      // true when backend API responded to health check or request
  lastChecked: Date | null;
  statusLabel: string;
}

// Global connectivity store so all components and API layers share synchronized state
let globalState: ConnectivityState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  networkOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  apiReachable: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastChecked: null,
  statusLabel: (typeof navigator !== 'undefined' && navigator.onLine) ? 'CHECKING...' : 'OFFLINE MODE (NO NETWORK)'
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

export function getConnectivitySnapshot(): ConnectivityState {
  return globalState;
}

export function subscribeConnectivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function updateConnectivity(partial: Partial<ConnectivityState>) {
  const nextNetwork = partial.networkOnline ?? globalState.networkOnline;
  const nextApi = partial.apiReachable ?? globalState.apiReachable;
  const nextIsOnline = nextNetwork && nextApi;

  let label = 'ONLINE · CLOUD CONNECTED';
  if (!nextNetwork) {
    label = 'OFFLINE MODE · NO NETWORK';
  } else if (!nextApi) {
    label = 'OFFLINE MODE · BACKEND UNREACHABLE';
  }

  globalState = {
    ...globalState,
    ...partial,
    isOnline: nextIsOnline,
    networkOnline: nextNetwork,
    apiReachable: nextApi,
    statusLabel: partial.statusLabel || label,
    lastChecked: partial.lastChecked || new Date()
  };

  notifyListeners();
}

/**
 * Report a failed API request from any fetch call across the platform.
 * Immediately flips API reachability to false without waiting for heartbeat.
 */
export function reportApiFailure(errorOrEndpoint?: string) {
  console.warn('[APERIO Connectivity] API request failure reported:', errorOrEndpoint);
  updateConnectivity({
    apiReachable: false,
    statusLabel: 'OFFLINE MODE · BACKEND UNREACHABLE',
    lastChecked: new Date()
  });
  scheduleNextHeartbeat(true);
}

/**
 * Report a successful API request.
 */
export function reportApiSuccess() {
  if (!globalState.apiReachable || !globalState.isOnline) {
    console.log('[APERIO Connectivity] Backend connection verified via successful request');
  }
  consecutiveFailures = 0;
  updateConnectivity({
    networkOnline: true,
    apiReachable: true,
    statusLabel: 'ONLINE · CLOUD CONNECTED',
    lastChecked: new Date()
  });
}

// In-flight request deduplication and adaptive retry controls
let activeCheckPromise: Promise<boolean> | null = null;
let lastCheckTime = 0;
let consecutiveFailures = 0;
let heartbeatTimer: any = null;

const ONLINE_INTERVAL_MS = 30000;    // 30 seconds when connected and healthy
const MIN_OFFLINE_INTERVAL_MS = 15000; // 15 seconds initial retry when offline
const MAX_OFFLINE_INTERVAL_MS = 60000; // 60 seconds max backoff when offline
const THROTTLE_MIN_MS = 4000;         // Don't re-ping if checked < 4s ago unless forced

/**
 * Actively ping backend /health endpoint to verify real connectivity.
 * - Prevents duplicate in-flight requests.
 * - Respects throttling unless force is true.
 * - Provides 6s timeout to account for cloud host cold-starts.
 */
export async function checkConnectivityNow(options?: { force?: boolean }): Promise<boolean> {
  const force = options?.force ?? false;
  const now = Date.now();

  // If a check is already in-flight, return the existing active promise
  if (activeCheckPromise) {
    return activeCheckPromise;
  }

  // Throttle: avoid spamming health checks if we just verified reachability within 4s
  if (!force && globalState.apiReachable && (now - lastCheckTime) < THROTTLE_MIN_MS) {
    return globalState.apiReachable;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    updateConnectivity({
      networkOnline: false,
      apiReachable: false,
      statusLabel: 'OFFLINE MODE · NO NETWORK',
      lastChecked: new Date()
    });
    scheduleNextHeartbeat(true);
    return false;
  }

  activeCheckPromise = (async () => {
    try {
      const controller = new AbortController();
      // 6.5s timeout accounts for cloud backend cold-starts without hanging indefinitely
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const healthUrl = `${API_BASE}/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeoutId);

      lastCheckTime = Date.now();

      if (response.ok) {
        consecutiveFailures = 0;
        updateConnectivity({
          networkOnline: true,
          apiReachable: true,
          statusLabel: 'ONLINE · CLOUD CONNECTED',
          lastChecked: new Date()
        });
        scheduleNextHeartbeat(false);
        return true;
      } else {
        consecutiveFailures++;
        updateConnectivity({
          networkOnline: true,
          apiReachable: false,
          statusLabel: `OFFLINE MODE · API HTTP ${response.status}`,
          lastChecked: new Date()
        });
        scheduleNextHeartbeat(true);
        return false;
      }
    } catch (err: any) {
      lastCheckTime = Date.now();
      consecutiveFailures++;
      updateConnectivity({
        networkOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
        apiReachable: false,
        statusLabel: 'OFFLINE MODE · BACKEND UNREACHABLE',
        lastChecked: new Date()
      });
      scheduleNextHeartbeat(true);
      return false;
    } finally {
      activeCheckPromise = null;
    }
  })();

  return activeCheckPromise;
}

/**
 * Adaptive heartbeat scheduler:
 * - 30s when online
 * - Exponential backoff (15s -> 30s -> 60s) when backend is unreachable to avoid hammering
 * - Pauses when tab is in background
 */
function scheduleNextHeartbeat(isFailure = false) {
  if (typeof window === 'undefined') return;

  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
  }

  // Do not poll if the document is hidden/backgrounded to save resources
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return;
  }

  let delay = ONLINE_INTERVAL_MS;
  if (isFailure) {
    // Backoff: 15s, 30s, 60s max
    const backoffExponent = Math.min(consecutiveFailures, 3);
    delay = Math.min(MIN_OFFLINE_INTERVAL_MS * Math.pow(1.5, backoffExponent - 1), MAX_OFFLINE_INTERVAL_MS);
  }

  heartbeatTimer = setTimeout(() => {
    checkConnectivityNow();
  }, Math.round(delay));
}

// Global listeners for window events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[APERIO Connectivity] Browser went online; verifying backend reachability...');
    consecutiveFailures = 0;
    updateConnectivity({ networkOnline: true });
    checkConnectivityNow({ force: true });
  });

  window.addEventListener('offline', () => {
    console.warn('[APERIO Connectivity] Browser went offline');
    updateConnectivity({
      networkOnline: false,
      apiReachable: false,
      statusLabel: 'OFFLINE MODE · NO NETWORK',
      lastChecked: new Date()
    });
  });

  // Resume check when user returns to tab
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLast = Date.now() - lastCheckTime;
        if (timeSinceLast > 15000) {
          checkConnectivityNow();
        } else {
          scheduleNextHeartbeat(!globalState.apiReachable);
        }
      }
    });
  }

  // Listen to custom API events from apiFetch
  window.addEventListener('aperio:api:success', () => {
    reportApiSuccess();
  });

  window.addEventListener('aperio:api:failure', (e: Event) => {
    const custom = e as CustomEvent<{ error?: string }>;
    reportApiFailure(custom.detail?.error);
  });

  // Initial heartbeat check
  checkConnectivityNow({ force: true });
}

/**
 * React hook to consume live connectivity status
 */
export function useConnectivity() {
  const state = useSyncExternalStore(subscribeConnectivity, getConnectivitySnapshot);

  const recheck = useCallback(async () => {
    return await checkConnectivityNow({ force: true });
  }, []);

  return {
    ...state,
    recheck
  };
}
