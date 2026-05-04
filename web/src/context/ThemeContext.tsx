'use client';

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
});

const PUBLIC_STORAGE_KEY = 'urbanmiles-theme';
const ADMIN_STORAGE_KEY = 'urbanmiles-admin-theme';
const THEME_STORAGE_EVENT = 'urbanmiles-theme-change';

function isTheme(value: string | null): value is Theme {
  return value === 'dark' || value === 'light';
}

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(THEME_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(THEME_STORAGE_EVENT, onStoreChange);
  };
}

function getThemeSnapshot(storageKey: string, defaultTheme: Theme) {
  const storedTheme = window.localStorage.getItem(storageKey);
  return isTheme(storedTheme) ? storedTheme : defaultTheme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;
  const storageKey = isAdminRoute ? ADMIN_STORAGE_KEY : PUBLIC_STORAGE_KEY;
  const defaultTheme: Theme = isAdminRoute ? 'dark' : 'light';
  const theme = useSyncExternalStore(
    subscribeToTheme,
    () => getThemeSnapshot(storageKey, defaultTheme),
    () => defaultTheme
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(storageKey, nextTheme);
      window.dispatchEvent(new Event(THEME_STORAGE_EVENT));
    } catch {
      // ignore
    }
  };

  return (
    <ThemeContext value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// Guard SSR: always render dark on server
export function useServerTheme(): Theme | 'dark' {
  return 'dark';
}
