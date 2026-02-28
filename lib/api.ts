import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { secureStorage } from './secure-storage';
import { logger } from '@/utils/logger';

// Get the backend URL from environment or use default
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const isDev = __DEV__;

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
    logger.log('🔵 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
    });
    
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
      logger.log('🌐 Origin header set (production):', origin);
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
    
    const token = await secureStorage.getToken();
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      logger.log('🔑 Token attached to request');
    } else {
      logger.log('⚠️ No token available');
    }
    
    // Safely log request data (avoid logging FormData or circular refs)
    if (config.data !== undefined && config.data !== null) {
      const isFormData = 
        config.data instanceof FormData ||
        (config.data && typeof config.data === 'object' && '_parts' in config.data) ||
        (config.data?.constructor?.name === 'FormData');
      
      if (isFormData) {
        logger.log('📤 Request data: [FormData]');
      } else {
        try {
          logger.log('📤 Request data:', safeStringify(config.data));
        } catch (error) {
          logger.log('📤 Request data: [Unable to serialize]');
        }
      }
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
    try {
      logger.log('✅ API Response:', {
        status: response.status,
        url: response.config.url,
        data: safeStringify(response.data),
      });
    } catch (error) {
      logger.log('✅ API Response:', {
        status: response.status,
        url: response.config.url,
        data: '[Unable to serialize]',
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const isAuthError = error.response?.status === 401 || error.response?.status === 403;
    
    // Skip logging auth errors - they're handled gracefully by auth store
    // This prevents cluttering logs with expected auth errors
    if (!isAuthError) {
      try {
        logger.error('❌ API Error:', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          responseData: error.response?.data ? safeStringify(error.response.data) : undefined,
        });
      } catch (logError) {
        // If logging fails, log minimal info
        logger.error('❌ API Error:', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
        });
      }
    } else {
      // Only log auth errors in dev mode for debugging
      if (isDev) {
        logger.log('🔐 Auth error (handled silently):', {
          status: error.response?.status,
          url: error.config?.url,
        });
      }
    }
    
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      logger.log('🔄 Attempting token refresh...');
      originalRequest._retry = true;

      try {
        const refreshToken = await secureStorage.getRefreshToken();
        
        if (refreshToken) {
          logger.log('🔑 Refresh token found, attempting refresh...');
          // Attempt to refresh the token
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refreshToken,
          });

          const { token } = response.data;
          logger.log('✅ Token refreshed successfully');
          
          // Store new token
          await secureStorage.setToken(token);
          
          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          
          return apiClient(originalRequest);
        } else {
          logger.log('⚠️ No refresh token available');
        }
      } catch (refreshError) {
        logger.error('❌ Token refresh failed:', refreshError);
        // Refresh failed, clear auth data
        await secureStorage.clearAll();
        // The auth store will handle redirect to login
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
