import { Text, TextProps } from 'react-native';
import { Fonts } from '@/constants/fonts';

import tw from '@/lib/tw';

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
      style={[tw`text-neutral-900 dark:text-white`, { fontFamily }, style]} 
      {...props} 
    />
  );
}

