type RuntimeMode = 'live' | 'disabled';

type FirebaseEnvConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
};

const trim = (value: string | undefined): string => value?.trim() ?? '';
const isTruthy = (value: string | undefined): boolean => trim(value).toLowerCase() === 'true';

const PLACEHOLDER_ENV_VALUES = new Set([
  'your_real_applixir_game_api_key',
  'your_applixir_game_api_key',
  'your_api_key',
  'changeme',
  'change_me',
  'replace_me',
  'replace-with-your-value',
  'your_project_id',
  'your_project_id.firebaseapp.com',
  'your_project_id.appspot.com',
  'your_messaging_sender_id',
  'your_app_id',
  'your_api_key_here',
]);

const hasConfiguredValue = (value: string | undefined): boolean => {
  const normalized = trim(value);
  if (!normalized) return false;
  return !PLACEHOLDER_ENV_VALUES.has(normalized.toLowerCase());
};

const firebase = {
  apiKey: trim(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: trim(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: trim(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: trim(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: trim(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: trim(import.meta.env.VITE_FIREBASE_APP_ID),
  measurementId: trim(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID),
} satisfies FirebaseEnvConfig;

const applixir = {
  apiKey: trim(import.meta.env.VITE_APPLIXIR_API_KEY),
  scriptSrc: trim(import.meta.env.VITE_APPLIXIR_SCRIPT_SRC) || '/lib/player.js',
};

const analyticsMeasurementId = trim(import.meta.env.VITE_GA_MEASUREMENT_ID) || firebase.measurementId;
const configuredSiteUrl = trim(import.meta.env.VITE_SITE_URL);
const supportEmail = trim(import.meta.env.VITE_SUPPORT_EMAIL);
const projectSupportUrl = trim(import.meta.env.VITE_PROJECT_SUPPORT_URL);
const applixirServerValidationRequested = isTruthy(import.meta.env.VITE_APPLIXIR_SERVER_VALIDATION);

const firebaseConfigured = Boolean(
  hasConfiguredValue(firebase.apiKey) &&
  hasConfiguredValue(firebase.projectId) &&
  hasConfiguredValue(firebase.appId),
);
const applixirConfigured = Boolean(hasConfiguredValue(applixir.apiKey) && applixir.scriptSrc);

const mode: RuntimeMode = firebaseConfigured ? 'live' : 'disabled';

export const getRuntimeSiteUrl = (): string => {
  if (configuredSiteUrl) return configuredSiteUrl.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin.replace(/\/+$/, '');
  return '';
};

export const runtimeConfig = {
  mode,
  siteUrl: configuredSiteUrl,
  supportEmail,
  projectSupportUrl,
  analyticsMeasurementId,
  firebase: {
    ...firebase,
    configured: firebaseConfigured,
  },
  applixir: {
    ...applixir,
    configured: applixirConfigured,
    serverValidationEnabled: mode === 'live' && applixirConfigured && applixirServerValidationRequested,
  },
  capabilities: {
    login: mode === 'live' && firebaseConfigured,
    rewardedVideo: mode === 'live' && applixirConfigured,
    analytics: Boolean(analyticsMeasurementId),
  },
} as const;

export type RuntimeConfig = typeof runtimeConfig;
export type RuntimeModeName = RuntimeMode;
