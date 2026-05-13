import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ColorTheme = 'system' | 'light' | 'dark';

interface ThemeState {
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
}

/** Plain key matching web `localStorage` / `next-themes` (`theme`). */
export const THEME_WEB_STORAGE_KEY = 'theme';

const ZUSTAND_THEME_KEY = 'eklan-theme-persist';
const LEGACY_ZUSTAND_THEME_KEY = 'theme-storage';

async function readWebThemeKey(): Promise<ColorTheme | null> {
  const raw = await AsyncStorage.getItem(THEME_WEB_STORAGE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return null;
}

/**
 * Persists full Zustand snapshot under `ZUSTAND_THEME_KEY`, and mirrors `theme`
 * as a plain string for parity with the web app storage contract.
 */
const themeCrossPlatformStorage: StateStorage = {
  getItem: async (name) => {
    const persisted = await AsyncStorage.getItem(name);
    if (persisted) return persisted;
    if (name !== ZUSTAND_THEME_KEY) return null;
    const legacy = await AsyncStorage.getItem(LEGACY_ZUSTAND_THEME_KEY);
    if (legacy) return legacy;
    const migrated = await readWebThemeKey();
    if (migrated) return JSON.stringify({ state: { theme: migrated }, version: 0 });
    return null;
  },
  setItem: async (name, value) => {
    await AsyncStorage.setItem(name, value);
    try {
      const parsed = JSON.parse(value) as { state?: { theme?: ColorTheme } };
      const t = parsed?.state?.theme;
      if (t === 'light' || t === 'dark' || t === 'system') {
        await AsyncStorage.setItem(THEME_WEB_STORAGE_KEY, t);
      }
    } catch {
      /* ignore */
    }
  },
  removeItem: async (name) => {
    await AsyncStorage.removeItem(name);
    await AsyncStorage.removeItem(THEME_WEB_STORAGE_KEY);
  },
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      /** Matches backend default `profile.theme` when unset. */
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: ZUSTAND_THEME_KEY,
      storage: createJSONStorage(() => themeCrossPlatformStorage),
    }
  )
);
