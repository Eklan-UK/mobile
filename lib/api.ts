import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { secureStorage } from './secure-storage';
import { logger } from '@/utils/logger';

// Get the backend URL from environment or use default
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const isDev = __DEV__;

// ─── In-memory token cache (avoids SecureStore read on every request) ────────
let cachedToken: string | null = null;
let tokenCacheTime = 0;
const TOKEN_CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Invalidate the in-memory token cache.
 * Call this after login, logout, token refresh, or any auth state change.
 */
export function invalidateTokenCache() {
  cachedToken = null;
  tokenCacheTime = 0;
}

/**
 * Get the auth token, using an in-memory cache to avoid
 * hitting SecureStore (native Keychain/Keystore) on every API call.
 */
export async function getCachedToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && (now - tokenCacheTime) < TOKEN_CACHE_TTL) {
    return cachedToken;
  }
  cachedToken = await secureStorage.getToken();
  tokenCacheTime = now;
  return cachedToken;
}

/**
 * Safely serialize data for logging (handles FormData, circular refs, etc.)
 */
function safeStringify(data: any): string {
  if (data === null || data === undefined) {
    return String(data);
  }
  
  // Check if it's FormData
  if (
    data instanceof FormData ||
    (data && typeof data === 'object' && '_parts' in data) ||
    (data?.constructor?.name === 'FormData')
  ) {
    return '[FormData]';
  }
  
  // Check if it's a function
  if (typeof data === 'function') {
    return '[Function]';
  }
  
  // Try to stringify, catch circular reference errors
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    // Handle circular references
    try {
      const seen = new WeakSet();
      return JSON.stringify(data, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      }, 2);
    } catch {
      return '[Non-serializable object]';
    }
  }
}

/**
 * Create axios instance with default config
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies
});

/**
 * Request interceptor to attach auth token
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Lightweight request logging — no body serialization
    if (isDev) {
      logger.log('🔵 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
      });
    }
    
    // Set Origin header for Better Auth validation (production only)
    // React Native doesn't automatically send Origin header like web browsers do
    // Better Auth requires this header in production to validate trusted origins
    // In development, Better Auth is more lenient and doesn't require this
    if (!isDev && config.headers && !config.headers['Origin']) {
      // Use the API base URL as origin (should be in Better Auth trusted origins)
      // Fallback to mobile app scheme if API URL is not available
      // The mobile scheme 'elkan://' is also in trusted origins as a backup
      const origin = API_BASE_URL || 'elkan://';
      config.headers['Origin'] = origin;
    }
    
    // Ensure Content-Type is set for POST, PUT, PATCH requests
    // But skip if data is FormData (let it set Content-Type with boundary automatically)
    if (config.method && ['post', 'put', 'patch'].includes(config.method.toLowerCase())) {
      if (config.headers && !config.headers['Content-Type']) {
        // Check if data is FormData
        // In React Native, FormData might not pass instanceof check, so check for _parts or FormData constructor
        const isFormData = 
          config.data instanceof FormData ||
          (config.data && typeof config.data === 'object' && '_parts' in config.data) ||
          (config.data && config.data.constructor && config.data.constructor.name === 'FormData');
        
        if (!isFormData) {
          config.headers['Content-Type'] = 'application/json';
        } else {
          // Explicitly delete Content-Type for FormData to let axios set it with boundary
          delete config.headers['Content-Type'];
        }
      } else if (config.headers && config.headers['Content-Type'] && config.data instanceof FormData) {
        // If Content-Type was set but data is FormData, remove it
        delete config.headers['Content-Type'];
      }
    }
    
    // Use cached token to avoid hitting SecureStore on every request
    const token = await getCachedToken();
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    logger.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle token refresh and errors
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Lightweight response logging — no body serialization to avoid blocking JS thread
    if (isDev) {
      logger.log('✅ API Response:', {
        status: response.status,
        url: response.config.url,
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const isAuthError = error.response?.status === 401 || error.response?.status === 403;
    
    // Skip logging auth errors - they're handled gracefully by auth store
    // This prevents cluttering logs with expected auth errors
    if (!isAuthError) {
      logger.error('❌ API Error:', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
      });
    } else if (isDev) {
      // Only log auth errors in dev mode for debugging
      logger.log('🔐 Auth error (handled silently):', {
        status: error.response?.status,
        url: error.config?.url,
      });
    }
    
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await secureStorage.getRefreshToken();
        
        if (refreshToken) {
          // Attempt to refresh the token
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refreshToken,
          });

          const { token } = response.data;
          
          // Store new token and invalidate cache so it picks up the new one
          await secureStorage.setToken(token);
          invalidateTokenCache();
          
          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        logger.error('❌ Token refresh failed:', refreshError);
        // Refresh failed, clear auth data
        await secureStorage.clearAll();
        invalidateTokenCache();
        // The auth store will handle redirect to login
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
