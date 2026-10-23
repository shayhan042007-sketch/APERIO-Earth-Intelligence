// APERIO 2.0 — Global API Event Bus for Connectivity Detection

export function emitApiSuccess() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aperio:api:success'));
  }
}

export function emitApiFailure(endpointOrError?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('aperio:api:failure', {
        detail: { error: endpointOrError }
      })
    );
  }
}

/**
 * Universal wrapper for API fetch requests that automatically informs
 * the connectivity detection system of success or failure.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(input, init);
    if (response.ok) {
      emitApiSuccess();
    } else if (response.status >= 500 || response.status === 404) {
      emitApiFailure(`HTTP ${response.status}`);
    }
    return response;
  } catch (err: any) {
    emitApiFailure(err?.message || 'Fetch failed');
    throw err;
  }
}
