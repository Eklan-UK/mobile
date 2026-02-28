import { Text, TextProps } from 'react-native';
import { Fonts } from '@/constants/fonts';

interface BoldTextProps extends TextProps {
  weight?: 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black' | 'light' | 'extralight';
}

export function BoldText({ 
  style, 
  weight = 'bold',
  ...props 
}: BoldTextProps) {
  const fontFamily = Fonts.nunito[weight] || Fonts.nunito.bold;
  
  return (
    <Text 
      style={[{ fontFamily }, style]} 
      {...props} 
    />
  );
}

