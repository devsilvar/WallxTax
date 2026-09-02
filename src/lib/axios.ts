import axios from 'axios';
import axiosRetry, { isNetworkError, exponentialDelay } from 'axios-retry';

export interface ApiError {
  response?: {
    data?: {
      error?: {
        message?: string;
        code?: string;
        details?: unknown;
      };
    };
    status?: number;
  };
  message?: string;
  name?: string;
}

/**
 * Maps server error codes that should never be shown to end users
 * to friendly, actionable messages.
 */
const FRIENDLY_MESSAGES: Record<string, string> = {
  DATABASE_ERROR:
    "We're having trouble reaching our servers. Please check your internet connection and try again.",
  SERVICE_UNAVAILABLE:
    "Our service is temporarily unavailable. Please check your internet connection and try again shortly.",
  INTERNAL_ERROR:
    "Something went wrong on our end. Please try again in a moment.",
  INTERNAL_SERVER_ERROR:
    "Something went wrong on our end. Please try again in a moment.",
};

/** Patterns in raw error messages that indicate connectivity issues. */
const NETWORK_PATTERNS = [
  "can't reach database",
  'database server',
  'econnrefused',
  'econnreset',
  'enotfound',
  'etimedout',
  'network error',
  'fetch failed',
  'failed to fetch',
  'socket hang up',
  'err_network',
];

function isNetworkishMessage(msg: string): boolean {
  const lower = msg.toLowerCase();
  return NETWORK_PATTERNS.some((p) => lower.includes(p));
}

export function getErrorMessage(error: unknown, fallback?: string): string {
  if (axios.isAxiosError<{ error?: { message?: string; code?: string } }>(error)) {
    const code = error.response?.data?.error?.code;
    const serverMsg = error.response?.data?.error?.message;

    // 1. Map known technical error codes to friendly text
    if (code && FRIENDLY_MESSAGES[code]) {
      return FRIENDLY_MESSAGES[code];
    }

    // 2. Catch raw messages that leak infrastructure details
    if (serverMsg && isNetworkishMessage(serverMsg)) {
      return "We're having trouble connecting. Please check your internet and try again.";
    }

    // 3. Pure network failure (no response at all — device offline, DNS fail, etc.)
    if (!error.response) {
      return "Unable to connect. Please check your internet connection and try again.";
    }

    // 4. Server returned a message that's safe to show
    return serverMsg || error.message || fallback || "An error occurred";
  }

  if (error instanceof Error) {
    if (isNetworkishMessage(error.message)) {
      return "Unable to connect. Please check your internet connection and try again.";
    }
    return error.message || fallback || "An unexpected error occurred";
  }

  return fallback || "An unexpected error occurred";
}

// API base URL.
//   - Dev (no VITE_API_BASE_URL): uses '/api/v1', which Vite proxies
//     to http://localhost:3000 (see vite.config.ts).
//   - Prod (or when VITE_API_BASE_URL is set): uses the specified URL.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Retry policy ───────────────────────────────────────────
//
// Render free tier sleeps after inactivity → first request after a cold
// start takes 2–5s and sometimes 502/503. Nigerian 4G drops packets.
// We retry idempotent reads with exponential backoff so transient
// failures never reach the user.
//
// Rules:
//   • Only retry GET / HEAD (mutations are not safe to replay)
//   • Retry on network errors + 502 / 503 / 504
//   • Skip 401 — the response interceptor below handles refresh + replay
//   • Skip all other 4xx — those won't change on retry
//   • 2 retries (3 total attempts), exponential backoff 300ms / 900ms

axiosRetry(api, {
  retries: 2,
  retryDelay: (retryCount) => exponentialDelay(retryCount, undefined, 300),
  retryCondition: (error) => {
    const method = (error.config?.method || 'get').toLowerCase();
    if (method !== 'get' && method !== 'head') return false;

    if (isNetworkError(error)) return true;

    const status = error.response?.status;
    if (status === 401) return false; // let the response interceptor handle refresh
    return status === 502 || status === 503 || status === 504;
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // If data is FormData, remove Content-Type so browser sets boundary automatically
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const newToken = data.data.accessToken;
          localStorage.setItem('accessToken', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Lazy import — auth.store imports this module, so a top-level
          // import would create a load-time cycle. Resolving at call-time
          // is fine because by now both modules are fully evaluated.
          const { useAuthStore } = await import('@/stores/auth.store.ts');
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
