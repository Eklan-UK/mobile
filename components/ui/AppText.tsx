import { Text, TextProps } from 'react-native';
import { Fonts } from '@/constants/fonts';

import tw from '@/lib/tw';

interface AppTextProps extends TextProps {
  weight?: 'regular' | 'medium' | 'bold' | 'black' | 'light';
}

export function AppText({ 
  style, 
  weight = 'regular',
  ...props 
}: AppTextProps) {
  const fontFamily = Fonts.satoshi[weight] || Fonts.satoshi.regular;
  
  return (
    <Text 
      style={[tw`text-neutral-900 dark:text-white`, { fontFamily }, style]} 
      {...props} 
    />
  );
}

