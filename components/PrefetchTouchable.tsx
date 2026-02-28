import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { usePrefetch } from '@/hooks/usePrefetch';

interface PrefetchTouchableProps extends TouchableOpacityProps {
  drillId?: string;
  onPress?: () => void;
  children: React.ReactNode;
}

/**
 * TouchableOpacity component that prefetches drill data on press start
 * This provides instant loading when navigating to drill screens
 */
export const PrefetchTouchable: React.FC<PrefetchTouchableProps> = ({
  drillId,
  onPress,
  children,
  ...props
}) => {
  const { prefetchDrill } = usePrefetch();

  const handlePressIn = () => {
    // Prefetch on press start (before release) for faster navigation
    if (drillId) {
      prefetchDrill(drillId);
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      {...props}
      onPressIn={handlePressIn}
      onPress={handlePress}
    >
      {children}
    </TouchableOpacity>
  );
};

