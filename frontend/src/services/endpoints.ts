function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const configuredWsUrl = import.meta.env.VITE_WS_URL?.trim();

export const API_BASE_URL = configuredApiUrl
  ? configuredApiUrl.endsWith('/api')
    ? trimTrailingSlash(configuredApiUrl)
    : `${trimTrailingSlash(configuredApiUrl)}/api`
  : '/api';

export const WS_BASE_URL = configuredWsUrl
  ? trimTrailingSlash(configuredWsUrl)
  : configuredApiUrl
    ? `${trimTrailingSlash(configuredApiUrl.replace(/\/api\/?$/, ''))}/ws`
    : '/ws';
