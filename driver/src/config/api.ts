import { NativeModules } from 'react-native';

const FALLBACK_LAN_API_BASE_URL = 'http://192.168.50.45:3000';

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function isLocalhostUrl(value: string) {
  return /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(value);
}

function getExpoLanApiBaseUrl() {
  const scriptURL = (NativeModules.SourceCode as { scriptURL?: string } | undefined)?.scriptURL;
  const host = scriptURL?.match(/^[a-z]+:\/\/([^:/]+)/i)?.[1];

  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
    return null;
  }

  return `http://${host}:3000`;
}

const configuredBaseUrl = process.env.EXPO_PUBLIC_URBANMILES_API_URL;

export const API_BASE_URL = normalizeBaseUrl(
  configuredBaseUrl && !isLocalhostUrl(configuredBaseUrl)
    ? configuredBaseUrl
    : getExpoLanApiBaseUrl() ?? FALLBACK_LAN_API_BASE_URL
);

export const DRIVER_LOGIN_URL = `${API_BASE_URL}/api/driver/login`;
