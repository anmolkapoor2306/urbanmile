import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedPlace } from '@/src/data/mock';
import { darkColors, lightColors, type ThemeColors } from '@/src/constants/theme';
import { createContext } from 'react';

export type AppTheme = 'light' | 'dark';

const THEME_KEY = '@urbanmile_theme';
const AUTH_KEY = '@urbanmile_auth';

export interface SavedPlaceItem extends SavedPlace {}

interface AppContextValue {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  resolvedColors: ThemeColors;
  isLoggedIn: boolean;
  setLoggedIn: (loggedIn: boolean) => void;
  savedPlaces: SavedPlaceItem[];
  addSavedPlace: (place: SavedPlaceItem) => void;
  removeSavedPlace: (id: string) => void;
  setSavedPlaces: (places: SavedPlaceItem[]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

async function loadTheme(): Promise<AppTheme> {
  try {
    const stored = await AsyncStorage.getItem(THEME_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

async function saveTheme(t: AppTheme) {
  try {
    await AsyncStorage.setItem(THEME_KEY, t);
  } catch {
    // ignore
  }
}

async function loadAuth(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(AUTH_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

async function saveAuth(loggedIn: boolean) {
  try {
    await AsyncStorage.setItem(AUTH_KEY, String(loggedIn));
  } catch {
    // ignore
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('light');
  const [isLoggedIn, setLoggedInState] = useState<boolean>(false);

  const resolvedColors = useMemo(
    () => (theme === 'dark' ? darkColors : lightColors),
    [theme],
  );

  useEffect(() => {
    loadTheme().then((t) => setThemeState(t));
    loadAuth().then((auth) => setLoggedInState(auth));
  }, []);

  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t);
    saveTheme(t);
  }, []);

  const setLoggedIn = useCallback((loggedIn: boolean) => {
    setLoggedInState(loggedIn);
    saveAuth(loggedIn);
  }, []);

  const [savedPlaces, setSavedPlaces] = useState<SavedPlaceItem[]>([]);

  const addSavedPlace = useCallback((place: SavedPlaceItem) => {
    setSavedPlaces((prev) => [...prev, place]);
  }, []);

  const removeSavedPlace = useCallback((id: string) => {
    setSavedPlaces((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        resolvedColors,
        isLoggedIn,
        setLoggedIn,
        savedPlaces,
        addSavedPlace,
        removeSavedPlace,
        setSavedPlaces,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function useThemeColors(): ThemeColors {
  return useApp().resolvedColors;
}
