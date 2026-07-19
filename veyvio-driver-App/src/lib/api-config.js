const BASE44_SERVER = 'https://base44.app';

function isNativeApp() {
  if (typeof window === 'undefined') return false;
  try {
    return window.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

export function getDeployedAppUrl() {
  const url = import.meta.env.VITE_BASE44_APP_BASE_URL;
  return typeof url === 'string' ? url.replace(/\/$/, '') : '';
}

export function getApiKey() {
  return import.meta.env.VITE_BASE44_API_KEY || '';
}

function getHostname() {
  return typeof window !== 'undefined' ? window.location.hostname : '';
}

function isLocalDevHost(host) {
  return host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
}

/** True when Vite proxies /api to the deployed Base44 app URL. */
export function hasViteApiProxy() {
  return isLocalDevHost(getHostname()) && !!getDeployedAppUrl();
}

/** SDK server URL — empty string only when hosted on the app's own base44.app domain. */
export function resolveServerUrl() {
  const deployedAppUrl = getDeployedAppUrl();
  const fallback = deployedAppUrl || BASE44_SERVER;

  if (typeof window === 'undefined') return fallback;

  if (isNativeApp()) return deployedAppUrl || BASE44_SERVER;

  const host = getHostname();
  if (host.endsWith('base44.app')) return '';
  // Call the deployed app API directly (avoids flaky Vite HTTPS proxy on local dev)
  if (deployedAppUrl) return deployedAppUrl;
  return BASE44_SERVER;
}

/** Base URL for AuthContext public-settings calls. */
export function resolvePublicApiBaseUrl() {
  const deployedAppUrl = getDeployedAppUrl();
  const fallback = `${(deployedAppUrl || BASE44_SERVER)}/api/apps/public`;

  if (typeof window === 'undefined') return fallback;

  if (isNativeApp()) {
    const base = deployedAppUrl || BASE44_SERVER;
    return `${base}/api/apps/public`;
  }

  const host = getHostname();
  if (host.endsWith('base44.app')) return '/api/apps/public';
  if (deployedAppUrl) return `${deployedAppUrl}/api/apps/public`;
  return fallback;
}

export function resolveApiHeaders() {
  const apiKey = getApiKey();
  return apiKey ? { api_key: apiKey } : {};
}