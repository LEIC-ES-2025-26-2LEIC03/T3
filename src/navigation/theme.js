import { DarkTheme } from '@react-navigation/native';

// Override DarkTheme background to match the app's exact dark color.
// This is what actually prevents the white flash on Android — NavigationContainer
// paints this color as the root background before any screen renders.
export const APP_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0A0A0A',
    card: '#0A0A0A',
  },
};
