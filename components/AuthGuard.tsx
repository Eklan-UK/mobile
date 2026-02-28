import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import tw from '@/lib/tw';
import { Loader } from '@/components/ui';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

/**
 * AuthGuard component to protect routes
 * Redirects to onboarding/auth if not authenticated
 */
export default function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { isAuthenticated, isLoading, hasHydrated } = useAuth();

  useEffect(() => {
    if (!hasHydrated) return;

    if (requireAuth && !isAuthenticated && !isLoading) {
      // Not authenticated, redirect to onboarding
      router.replace('/(onboarding)/splash');
    }
  }, [isAuthenticated, isLoading, hasHydrated, requireAuth]);

  // Show loading while checking auth status
  if (!hasHydrated || isLoading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-cream-100`}>
        <Loader />
      </View>
    );
  }

  // If requires auth but not authenticated, show nothing (will redirect)
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
