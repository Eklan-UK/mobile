import { useColorScheme } from 'react-native';
import { useMemo } from 'react';
import { useThemeStore, type ColorTheme } from '@/store/theme-store';
import {
  brandColors,
  getSemanticColors,
  type SemanticColors,
} from '@/constants/theme-tokens';

export type EffectiveScheme = 'light' | 'dark';

/** Resolve store value `"system"` using RN Appearance (same contract as web `enableSystem: false` + manual system). */
export function resolveEffectiveScheme(
  theme: ColorTheme,
  systemScheme: string | null | undefined
): EffectiveScheme {
  if (theme === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return theme;
}

export function useEffectiveColorScheme(): EffectiveScheme {
  const { theme } = useThemeStore();
  const system = useColorScheme();
  return useMemo(
    () => resolveEffectiveScheme(theme, system),
    [theme, system]
  );
}

export function useSemanticTheme() {
  const effective = useEffectiveColorScheme();
  const isDark = effective === 'dark';

  const colors = useMemo(
    (): SemanticColors & typeof brandColors => ({
      ...getSemanticColors(effective),
      ...brandColors,
    }),
    [effective]
  );

  return { isDark, effective, colors };
}
