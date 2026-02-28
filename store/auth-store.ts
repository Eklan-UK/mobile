import { create } from 'zustand';
import { secureStorage } from '@/lib/secure-storage';
import apiClient from '@/lib/api';
import { router } from 'expo-router';
import { logger } from '@/utils/logger';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  role?: string;
  avatar?: string;
  emailVerified?: boolean;
  isEmailVerified?: boolean;
  hasProfile?: boolean; // Backend flag: true when user has completed profile/onboarding
}

export interface Session {
  token: string;
  expiresAt: number;
  userId: string;
}

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  clearError: () => void;
  hydrate: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  hasHydrated: false,
  error: null,

  // Clear error
  clearError: () => set({ error: null }),

  // Hydrate from storage on app start
  hydrate: async () => {
    try {
      const [token, user] = await Promise.all([
        secureStorage.getToken(),
        secureStorage.getUser(),
      ]);

      if (token && user) {
        set({
          user,
          session: { token, expiresAt: 0, userId: user.id },
          isAuthenticated: true,
          isLoading: false,
          hasHydrated: true,
        });
        
        // Verify session in background
        get().checkSession();
      } else {
        set({
          isLoading: false,
          hasHydrated: true,
        });
      }
    } catch (error) {
      logger.error('Hydration error:', error);
      set({
        isLoading: false,
        hasHydrated: true,
      });
    }
  },

  // Check/refresh session
  // Note: Better Auth doesn't have a dedicated /session endpoint, so we use /users/current
  // to validate the token and get the latest user data (including hasProfile)
  checkSession: async () => {
    try {
      // Get current user to validate token and update user data
      const response = await apiClient.get('/api/v1/users/current');
      
      logger.log('🔄 checkSession response:', {
        status: response.status,
        dataKeys: Object.keys(response.data || {}),
        hasUser: !!response.data?.user,
        hasDataUser: !!response.data?.data?.user,
        userData: response.data?.user ? {
          id: response.data.user.id || response.data.user._id,
          hasProfile: response.data.user.hasProfile,
          role: response.data.user.role,
        } : null,
        fullResponse: JSON.stringify(response.data, null, 2).substring(0, 500),
      });
      
      // Extract user data from response
      // The endpoint returns { user: {...} }, so check response.data.user first
      const userData = response.data?.user || response.data?.data?.user || response.data;
      
      if (userData && (userData.id || userData._id)) {
        const hasProfile =
          userData.hasProfile === true ||
          userData.role === 'admin' ||
          userData.role === 'tutor';

        logger.log('🔍 Extracted user data:', {
          userId: userData.id || userData._id,
          hasProfile: userData.hasProfile,
          computedHasProfile: hasProfile,
          role: userData.role,
        });

        const mappedUser: User = {
          id: userData.id || userData._id || '',
          email: userData.email || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          username: userData.username,
          role: userData.role,
          avatar: userData.avatar || userData.image,
          emailVerified: userData.emailVerified || userData.isEmailVerified,
          isEmailVerified: userData.emailVerified || userData.isEmailVerified,
          hasProfile,
        };

        // Update stored user data
        await secureStorage.setUser(mappedUser);
        
        // Update state
        set({
          user: mappedUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        
        logger.log('✅ Session refreshed successfully:', {
          userId: mappedUser.id,
          hasProfile: mappedUser.hasProfile,
        });
      } else {
        logger.warn('⚠️ No user data in checkSession response');
        // Token is valid but no user data - keep existing user
        set({
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      }
    } catch (error: any) {
      const isAuthError = error.response?.status === 401 || error.response?.status === 403;
      
      // Only clear on auth errors (401), not network errors or 404
      if (isAuthError) {
        // Token is invalid - clear auth
        // Don't log auth errors - they're expected and handled gracefully
        await secureStorage.clearAll();
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
        });
      } else {
        // Log non-auth errors for debugging
        logger.error('Session check error:', error);
      }
      
      if (error.response?.status === 404) {
        // Endpoint doesn't exist - that's fine, skip session check
        // Token will be validated on actual API calls
        logger.log('Session check endpoint not available, will validate token on next API call');
        set({
          isLoading: false,
        });
      } else {
        // Network or other errors - don't clear auth, just log
        logger.warn('Session check failed (non-critical):', error.message);
        set({
          isLoading: false,
        });
      }
    }
  },

  // Login with email/password
  login: async (email: string, password: string, rememberMe = true) => {
    logger.log('🔐 Login attempt started:', { email, rememberMe });
    set({ isLoading: true, error: null });

    try {
      logger.log('📡 Sending login request to backend...');
      const response = await apiClient.post('/api/v1/auth/sign-in/email', {
        email,
        password,
        rememberMe,
      });

      logger.log('✅ Login response received:', {
        status: response.status,
        hasUser: !!response.data?.user,
        hasSession: !!response.data?.session,
        hasToken: !!response.data?.token,
      });

      // Better Auth returns data in response.data directly
      const user = response.data?.user || response.data?.data?.user;
      const session = response.data?.session || response.data?.data?.session;
      const token = response.data?.token || session?.token || response.data?.data?.token;

      if (!user) {
        logger.error('❌ No user data in response');
        throw new Error('No user data received from server');
      }

      logger.log('👤 User data:', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified || user.isEmailVerified,
      });

      // Store credentials
      logger.log('💾 Storing credentials...');
      if (token) {
        await secureStorage.setToken(token);
      }
      
      // Extract hasProfile from user object
      const hasProfile = user.hasProfile === true || 
                         user.role === 'admin' || 
                         user.role === 'tutor';
      
      // Update user object with hasProfile
      const userWithProfile = {
        ...user,
        hasProfile,
      };
      
      await secureStorage.setUser(userWithProfile);
      logger.log('✅ Credentials stored successfully');

      set({
        user: userWithProfile,
        session: session || { token, expiresAt: 0, userId: user.id },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Use hasProfile from backend instead of local onboarding flag
      logger.log('🔍 Checking profile status...', { hasProfile, role: user.role });
      
      if (!hasProfile) {
        logger.log('🚀 Navigating to profile setup...');
        router.replace('/(profile-setup)');
      } else {
        logger.log('🏠 Navigating to main app...');
        router.replace('/(tabs)');
      }
      
      logger.log('✅ Login completed successfully');
    } catch (error: any) {
      logger.error('❌ Login failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
      
      // Check if error is related to email verification
      const isEmailVerificationError = 
        (error.response?.status === 400 || error.response?.status === 401) && 
        (error.response?.data?.message?.toLowerCase().includes('email') && 
         error.response?.data?.message?.toLowerCase().includes('verify')) ||
        error.response?.data?.code === 'EMAIL_NOT_VERIFIED' ||
        (error.message?.toLowerCase().includes('email') && 
         error.message?.toLowerCase().includes('verify'));

      if (isEmailVerificationError) {
        // Allow login even if email is not verified
        // Try to get user data from error response if available
        logger.warn('⚠️ Email not verified, but attempting to proceed...');
        
        // If we have user data in error response, use it
        const errorUser = error.response?.data?.user || error.response?.data?.data?.user;
        const errorToken = error.response?.data?.token || 
                          error.response?.data?.session?.token ||
                          error.response?.data?.data?.token;
        
        if (errorUser && errorToken) {
          logger.log('✅ Found user data in error response, proceeding with login...');
          
          // Extract hasProfile from user object
          const hasProfile = errorUser.hasProfile === true || 
                             errorUser.role === 'admin' || 
                             errorUser.role === 'tutor';
          
          const userWithProfile = {
            ...errorUser,
            hasProfile,
          };
          
          await secureStorage.setToken(errorToken);
          await secureStorage.setUser(userWithProfile);
          
          set({
            user: userWithProfile,
            session: { token: errorToken, expiresAt: 0, userId: errorUser.id },
            isAuthenticated: true,
            isLoading: false,
            error: null, // Don't show error, just proceed
          });

          // Use hasProfile from backend
          if (!hasProfile) {
            router.replace('/(profile-setup)');
          } else {
            router.replace('/(tabs)');
          }
          
          return; // Successfully logged in despite email verification warning
        } else {
          // No user data in error - backend is blocking login
          // Log warning but still show error to user
          logger.warn('⚠️ Email not verified and no user data in response - backend is blocking login');
          // Fall through to show error message below
        }
      }
      
      // For other errors, show error message
      const errorMessage = error.response?.data?.message || error.response?.data?.error?.message || 'Login failed. Please try again.';
      logger.log('📝 Setting error message:', errorMessage);
      
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Register new user
  register: async (data: RegisterData) => {
    logger.log('📝 Registration attempt started:', { email: data.email });
    set({ isLoading: true, error: null });

    try {
      logger.log('📡 Sending registration request to backend...');
      const response = await apiClient.post('/api/v1/auth/sign-up/email', {
        email: data.email,
        password: data.password,
        name: `${data.firstName} ${data.lastName}`,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      logger.log('✅ Registration response received:', {
        status: response.status,
        hasUser: !!response.data?.user,
        hasSession: !!response.data?.session,
        hasToken: !!response.data?.token,
      });

      // Better Auth returns data in response.data directly
      const user = response.data?.user || response.data?.data?.user;
      const session = response.data?.session || response.data?.data?.session;
      const token = response.data?.token || session?.token || response.data?.data?.token;

      if (!user) {
        logger.error('❌ No user data in registration response');
        throw new Error('No user data received from server');
      }

      logger.log('👤 New user created:', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });

      // Store credentials
      logger.log('💾 Storing credentials...');
      if (token) {
        await secureStorage.setToken(token);
      }
      
      // New users always have hasProfile: false
      const hasProfile = user.hasProfile === true || 
                         user.role === 'admin' || 
                         user.role === 'tutor';
      
      const userWithProfile = {
        ...user,
        hasProfile: hasProfile || false, // Ensure false for new users
      };
      
      await secureStorage.setUser(userWithProfile);
      logger.log('✅ Credentials stored successfully');

      set({
        user: userWithProfile,
        session: session || { token, expiresAt: 0, userId: user.id },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // New users always go to profile setup
      logger.log('🚀 Navigating to profile setup...');
      router.replace('/(profile-setup)');
      logger.log('✅ Registration completed successfully');
    } catch (error: any) {
      logger.error('❌ Registration failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error?.message || 'Registration failed. Please try again.';
      logger.log('📝 Setting error message:', errorMessage);
      
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      // Call backend logout with empty body to ensure Content-Type is set
      await apiClient.post('/api/v1/auth/sign-out', {});
    } catch (error) {
      logger.error('Logout error:', error);
    } finally {
      // Clear local state regardless of backend response
      await secureStorage.clearAll();
      
      set({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      router.replace('/(onboarding)/splash');
    }
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const { signInWithGoogle } = await import('@/services/oauth.service');
      const { user, session, token } = await signInWithGoogle();

      // Extract hasProfile from user object
      const hasProfile = user.hasProfile === true || 
                         user.role === 'admin' || 
                         user.role === 'tutor';
      
      const userWithProfile = {
        ...user,
        hasProfile,
      };

      // Store credentials
      await secureStorage.setToken(token || session?.token);
      await secureStorage.setUser(userWithProfile);

      set({
        user: userWithProfile,
        session: session || { token, expiresAt: 0, userId: user.id },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Use hasProfile from backend instead of local onboarding flag
      logger.log('🔍 Checking profile status...', { hasProfile, role: user.role });
      
      if (!hasProfile) {
        router.replace('/(profile-setup)');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      // Handle user cancellation gracefully
      if (error.message?.includes('cancelled') || error.message?.includes('canceled')) {
        set({
          error: null, // Don't show error for cancellation
          isLoading: false,
        });
        return;
      }

      const errorMessage = error.response?.data?.message || error.message || 'Google sign-in failed.';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  // Sign in with Apple
  signInWithApple: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const { signInWithApple } = await import('@/services/oauth.service');
      const { user, session, token } = await signInWithApple();

      // Extract hasProfile from user object
      const hasProfile = user.hasProfile === true || 
                         user.role === 'admin' || 
                         user.role === 'tutor';
      
      const userWithProfile = {
        ...user,
        hasProfile,
      };

      // Store credentials
      await secureStorage.setToken(token || session?.token);
      await secureStorage.setUser(userWithProfile);

      set({
        user: userWithProfile,
        session: session || { token, expiresAt: 0, userId: user.id },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Use hasProfile from backend instead of local onboarding flag
      logger.log('🔍 Checking profile status...', { hasProfile, role: user.role });
      
      if (!hasProfile) {
        router.replace('/(profile-setup)');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      // Handle user cancellation gracefully
      if (error.message?.includes('cancelled') || error.message?.includes('canceled')) {
        set({
          error: null, // Don't show error for cancellation
          isLoading: false,
        });
        return;
      }

      const errorMessage = error.response?.data?.message || error.message || 'Apple sign-in failed.';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },
}));
