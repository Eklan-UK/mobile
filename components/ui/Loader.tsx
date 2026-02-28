import tw from '@/lib/tw';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

interface LoaderProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function Loader({ size = 100, style }: LoaderProps) {
  const animation = useRef<LottieView>(null);

  useEffect(() => {
    // You can control the ref here if needed, e.g. animation.current?.play();
  }, []);

  return (
    <View style={[tw`justify-center items-center`, style]}>
      <LottieView
        autoPlay
        ref={animation}
        style={{
          width: size,
          height: size,
        }}
        source={require('@/assets/animations/loader.json')}
      />
    </View>
  );
}
