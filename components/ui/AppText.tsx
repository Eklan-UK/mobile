import { Text, TextProps } from 'react-native';
import { Fonts } from '@/constants/fonts';

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
      style={[{ fontFamily }, style]} 
      {...props} 
    />
  );
}

