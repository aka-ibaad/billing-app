'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Helper to add transition class temporarily
  const applyThemeWithTransition = useCallback((newTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') || 'light';
    
    if (currentTheme !== newTheme) {
      root.classList.add('theme-transition');
      root.setAttribute('data-theme', newTheme);
      setResolvedTheme(newTheme);
      
      // Remove class after transition duration (200ms)
      setTimeout(() => {
        root.classList.remove('theme-transition');
      }, 200);
    }
  }, []);

  useEffect(() => {
    // 1. Initial Load from localStorage
    const savedTheme = (localStorage.getItem('billing_theme') as Theme) || 'system';
    setThemeState(savedTheme);

    // 2. Resolve current actual theme based on saved preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const resolveAndApply = (t: Theme) => {
      if (t === 'system') {
        applyThemeWithTransition(mediaQuery.matches ? 'dark' : 'light');
      } else {
        applyThemeWithTransition(t);
      }
    };
    
    resolveAndApply(savedTheme);

    // 3. Listen to system preference changes if in system mode
    const handler = (e: MediaQueryListEvent) => {
      setThemeState((currentTheme) => {
        if (currentTheme === 'system') {
          applyThemeWithTransition(e.matches ? 'dark' : 'light');
        }
        return currentTheme;
      });
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [applyThemeWithTransition]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('billing_theme', newTheme);
    
    if (newTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyThemeWithTransition(isDark ? 'dark' : 'light');
    } else {
      applyThemeWithTransition(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
