import { createContext, useContext } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface ThemeContextType {
  mode: ThemeMode;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}
