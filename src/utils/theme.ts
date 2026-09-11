import { useState, useEffect } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'endotoxin_theme_preference';

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // ignore localstorage errors
  }
  return 'system';
}

export function resolveIsDark(preference: ThemePreference): boolean {
  if (typeof window === 'undefined') return false;
  if (preference === 'dark') return true;
  if (preference === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function applyTheme(preference: ThemePreference): boolean {
  if (typeof window === 'undefined') return false;
  const isDark = resolveIsDark(preference);

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // ignore localstorage errors
  }

  window.dispatchEvent(
    new CustomEvent('app-theme-changed', {
      detail: { isDark, preference },
    })
  );

  return isDark;
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(getStoredThemePreference);
  const [isDark, setIsDark] = useState<boolean>(() => resolveIsDark(getStoredThemePreference()));

  useEffect(() => {
    // Apply initial theme
    const darkActive = applyTheme(preference);
    setIsDark(darkActive);

    // Listen to system OS preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const currentPref = getStoredThemePreference();
      if (currentPref === 'system') {
        const active = applyTheme('system');
        setIsDark(active);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, [preference]);

  const setPreference = (newPref: ThemePreference) => {
    setPreferenceState(newPref);
    const darkActive = applyTheme(newPref);
    setIsDark(darkActive);
  };

  const toggleTheme = () => {
    // If currently dark, switch to light; if currently light, switch to dark
    const nextPref: ThemePreference = isDark ? 'light' : 'dark';
    setPreference(nextPref);
  };

  return {
    preference,
    isDark,
    setPreference,
    toggleTheme,
  };
}
