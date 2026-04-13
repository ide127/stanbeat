import { runtimeConfig } from '../runtimeConfig';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let initialized = false;

const measurementId = runtimeConfig.analyticsMeasurementId;

export const initializeAnalytics = (): void => {
  if (initialized || !measurementId || typeof document === 'undefined') {
    return;
  }

  initialized = true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? ((...args: unknown[]) => {
    window.dataLayer?.push(args);
  });

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    page_title: document.title,
    send_page_view: true,
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
};

export const trackEvent = (eventName: string, params?: Record<string, string | number>) => {
  if (!measurementId) return;
  try {
    window.gtag?.('event', eventName, params);
  } catch {
    // no-op
  }
};
