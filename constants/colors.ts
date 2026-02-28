export const Colors = {
  // Primary Green
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#2E7D32',
    600: '#256427',
    700: '#1b4d1e',
    800: '#143615',
    900: '#0d1f0e',
  },
  // Accent Yellow/Gold
  accent: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#F59E0B',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  // Background cream
  cream: {
    50: '#FDFEF9',
    100: '#F9FAF5',
    200: '#F5F6F0',
    300: '#EDEEE8',
  },
  // Neutral grays
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  // Semantic colors
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  // Common
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const LightTheme = {
  background: Colors.cream[100],
  surface: Colors.white,
  text: Colors.neutral[900],
  textSecondary: Colors.neutral[500],
  primary: Colors.primary[500],
  accent: Colors.accent[500],
  border: Colors.neutral[200],
};

export const DarkTheme = {
  background: Colors.neutral[900],
  surface: Colors.neutral[800],
  text: Colors.white,
  textSecondary: Colors.neutral[400],
  primary: Colors.primary[400],
  accent: Colors.accent[400],
  border: Colors.neutral[700],
};

