import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
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
  isOnline: navigator.onLine,
  networkOnline: navigator.onLine,
  apiReachable: navigator.onLine,
  lastChecked: null,
  statusLabel: navigator.onLine ? 'CHECKING...' : 'OFFLINE MODE (NO NETWORK)'
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
 * Immediately flips API reachability to false without waiting for the heartbeat.
 */
export function reportApiFailure(errorOrEndpoint?: string) {
  console.warn('[APERIO Connectivity] API request failure reported:', errorOrEndpoint);
  updateConnectivity({
    apiReachable: false,
    statusLabel: 'OFFLINE MODE · BACKEND UNREACHABLE',
    lastChecked: new Date()
  });
}

/**
 * Report a successful API request.
 */
export function reportApiSuccess() {
  if (!globalState.apiReachable || !globalState.isOnline) {
    console.log('[APERIO Connectivity] Backend connection restored via successful request');
  }
  updateConnectivity({
    networkOnline: true,
    apiReachable: true,
    statusLabel: 'ONLINE · CLOUD CONNECTED',
    lastChecked: new Date()
  });
}

/**
 * Actively ping backend /health endpoint to verify real connectivity
 */
export async function checkConnectivityNow(): Promise<boolean> {
  if (!navigator.onLine) {
    updateConnectivity({
      networkOnline: false,
      apiReachable: false,
      statusLabel: 'OFFLINE MODE · NO NETWORK',
      lastChecked: new Date()
    });
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const healthUrl = `${API_BASE}/health`;
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      updateConnectivity({
        networkOnline: true,
        apiReachable: true,
        statusLabel: 'ONLINE · CLOUD CONNECTED',
        lastChecked: new Date()
      });
      return true;
    } else {
      updateConnectivity({
        networkOnline: true,
        apiReachable: false,
        statusLabel: `OFFLINE MODE · API HTTP ${response.status}`,
        lastChecked: new Date()
      });
      return false;
    }
  } catch (err) {
    updateConnectivity({
      networkOnline: navigator.onLine,
      apiReachable: false,
      statusLabel: 'OFFLINE MODE · BACKEND UNREACHABLE',
      lastChecked: new Date()
    });
    return false;
  }
}

// Global listeners for window online / offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[APERIO Connectivity] Browser went online; verifying backend reachability...');
    updateConnectivity({ networkOnline: true });
    checkConnectivityNow();
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

  // Listen to custom API events from apiFetch
  window.addEventListener('aperio:api:success', () => {
    reportApiSuccess();
  });

  window.addEventListener('aperio:api:failure', (e: Event) => {
    const custom = e as CustomEvent<{ error?: string }>;
    reportApiFailure(custom.detail?.error);
  });

  // Initial heartbeat check
  checkConnectivityNow();

  // Periodic heartbeat every 15 seconds
  setInterval(() => {
    checkConnectivityNow();
  }, 15000);
}

/**
 * React hook to consume live connectivity status
 */
export function useConnectivity() {
  const state = useSyncExternalStore(subscribeConnectivity, getConnectivitySnapshot);

  const recheck = useCallback(async () => {
    return await checkConnectivityNow();
  }, []);

  return {
    ...state,
    recheck
  };
}
