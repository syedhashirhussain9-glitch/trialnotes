import { useColorScheme } from 'react-native';

export interface Theme {
  dark: boolean;
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  onPrimary: string;
  danger: string;
  onDanger: string;
  errorText: string;
}

/** All text/background pairs below are asserted >= 4.5:1 in __tests__/a11y.test.ts */
export const lightTheme: Theme = {
  dark: false,
  bg: '#F4F6F2',
  surface: '#FFFFFF',
  border: '#728378',
  text: '#16231B',
  muted: '#43524A',
  primary: '#1B6B46',
  onPrimary: '#FFFFFF',
  danger: '#B3261E',
  onDanger: '#FFFFFF',
  errorText: '#B3261E',
};

export const darkTheme: Theme = {
  dark: true,
  bg: '#0E1511',
  surface: '#18241D',
  border: '#7F9487',
  text: '#EAF3ED',
  muted: '#B2C4B9',
  primary: '#6FD19B',
  onPrimary: '#06170E',
  danger: '#F2766E',
  onDanger: '#1F0603',
  errorText: '#FF9B94',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
/** Android/iOS accessibility guideline: touch targets at least 48 dp. */
export const MIN_TOUCH = 48;
