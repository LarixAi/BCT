import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { resolveApiHeaders, resolveServerUrl } from '@/lib/api-config';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: resolveServerUrl(),
  requiresAuth: false,
  appBaseUrl: appBaseUrl || import.meta.env.VITE_BASE44_APP_BASE_URL || '',
  headers: resolveApiHeaders(),
});
