import { createContext, useContext } from 'react';

export type Theme = 'light' | 'dark' | 'system';

/** localStorage key; `index.html` reads it too, to set the class before first paint. */
export const THEME_STORAGE_KEY = 'migo-theme';

export const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
} | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
