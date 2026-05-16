export type ThemeColors = {
  // Container background
  background: string;
  // Card / surface background
  surface: string;
  // Secondary surface (elevated panels, inputs)
  surfaceMuted: string;
  // Primary text
  ink: string;
  // Secondary / muted text
  muted: string;
  // Tertiary / subtle text
  subtle: string;
  // Card & section borders
  border: string;
  // Brand yellow accent
  yellow: string;
  // Yellow pressed variant
  yellowDark: string;
  // Deep black (used in light mode for contrast)
  black: string;
  // Success / confirmation
  green: string;
  // Danger / error
  red: string;
  // Info / link
  blue: string;
};

export const lightColors: ThemeColors = {
  background: '#f6f3ec',
  surface: '#ffffff',
  surfaceMuted: '#f0ebe2',
  ink: '#111111',
  muted: '#6f6a60',
  subtle: '#9b9387',
  border: '#e4ded3',
  yellow: '#ffc400',
  yellowDark: '#d99b00',
  black: '#0e0e0f',
  green: '#0f9f6e',
  red: '#e5484d',
  blue: '#2b6cff',
};

// Matches UrbanMiles web dark theme (zinc + amber palette)
export const darkColors: ThemeColors = {
  background: '#09090b',
  surface: '#18181b',
  surfaceMuted: '#27272a',
  ink: '#f4f4f5',
  muted: '#a1a1aa',
  subtle: '#71717a',
  border: '#27272a',
  yellow: '#fbbf24',
  yellowDark: '#f59e0b',
  black: '#09090b',
  green: '#34d399',
  red: '#f87171',
  blue: '#60a5fa',
};

// Keep backward-compatible export for screens that still use `colors`
export const colors = lightColors;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  xl: 34,
};

export const shadow = {
  shadowColor: '#2d2519',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.12,
  shadowRadius: 22,
  elevation: 8,
};
