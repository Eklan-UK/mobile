import { useAuthStore } from '@/store/auth-store';

/**
 * Custom hook for accessing auth state and actions
 */
export const useAuth = () => {
  const {
    user,
    session,
    isLoading,
    isAuthenticated,
    hasHydrated,
    error,
    login,
    register,
    logout,
    checkSession,
    signInWithGoogle,
    signInWithApple,
    clearError,
  } = useAuthStore();

  return {
    // State
    user,
    session,
    isLoading,
    isAuthenticated,
    hasHydrated,
    error,
    
    // Actions
    login,
    register,
    logout,
    checkSession,
    signInWithGoogle,
    signInWithApple,
    clearError,
  };
};
