export const PRIME_PALETTE = {
  red: '#D50000',
  purple: '#9C27B0',
  teal: '#00E5FF',
  blue: '#2962FF',
  green: '#00C853',
  yellow: '#FFD600',
  gray: '#888888',
  glass: 'rgba(255,255,255,0.08)',
};

export const PRIME_DARK = {
  mode: 'dark' as const,
  bg: '#000000',
  cardBg: '#0C0C0C',
  text: '#FFFFFF',
  sub: '#888888',
  border: '#222222',
  inputBg: '#111111',
  navBg: '#0A0A0A',
  ...PRIME_PALETTE,
};

export const PRIME_LIGHT = {
  mode: 'light' as const,
  bg: '#F2F2F7',
  cardBg: '#FFFFFF',
  text: '#000000',
  sub: '#8E8E93',
  border: '#DDDDDD',
  inputBg: '#FFFFFF',
  navBg: '#FFFFFF',
  ...PRIME_PALETTE,
};

export type PrimeTheme = typeof PRIME_DARK;

// ICE theme (existing glassmorphism)
export const ICE_PALETTE = {
  primary: '#00D4FF',
  secondary: '#8B5CF6',
  accent: '#FF00E5',
  success: '#00FFB3',
  warning: '#FFB800',
  error: '#FF3366',
};

export const ICE_DARK = {
  mode: 'dark' as const,
  bg: ['#050813', '#0A0F1C', '#0D1929'] as const, // gradient
  cardBg: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  sub: 'rgba(255,255,255,0.60)',
  ...ICE_PALETTE,
};

export type ThemeMode = 'ice' | 'prime';
