import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ColorScheme } from './index';

interface ThemeContextValue {
  colors: ColorScheme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<boolean | null>(null);
  const isDark = override ?? systemScheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = useCallback(() => {
    setOverride(prev => !(prev ?? systemScheme === 'dark'));
  }, [systemScheme]);

  const value = useMemo(() => ({ colors, isDark, toggleTheme }), [colors, isDark, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
