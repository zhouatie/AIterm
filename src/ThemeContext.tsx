import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type EffectiveTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** The user's chosen mode (light / dark / system) */
  mode: ThemeMode;
  /** The resolved theme actually in effect */
  theme: EffectiveTheme;
  /** Cycle to the next mode: light → dark → system → light */
  cycleTheme: () => void;
  /** Set a specific mode */
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = 'theme-mode';
const CYCLE_ORDER: ThemeMode[] = ['light', 'dark', 'system'];

function getSystemTheme(): EffectiveTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): EffectiveTheme {
  return mode === 'system' ? getSystemTheme() : mode;
}

function loadStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(loadStoredMode);
  const [systemTheme, setSystemTheme] = useState<EffectiveTheme>(getSystemTheme);

  const effectiveTheme = mode === 'system' ? systemTheme : mode;

  // Listen for system preference changes
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Sync data-theme attribute on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  // Sync native Electron titlebar theme
  useEffect(() => {
    window.themeApi?.setNativeTheme(mode);
  }, [mode]);

  // Persist to localStorage
  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const cycleTheme = useCallback(() => {
    setMode(prev => {
      const idx = CYCLE_ORDER.indexOf(prev);
      return CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
    });
  }, [setMode]);

  // Fix: cycleTheme uses functional update, so setMode needs to support it
  const cycleThemeFixed = useCallback(() => {
    setModeState(prev => {
      const idx = CYCLE_ORDER.indexOf(prev);
      const next = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
      localStorage.setItem(STORAGE_KEY, next);
      // Also sync native theme for the new mode
      window.themeApi?.setNativeTheme(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, theme: effectiveTheme, cycleTheme: cycleThemeFixed, setMode }),
    [mode, effectiveTheme, cycleThemeFixed, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
