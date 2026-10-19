/**
 * Light and dark palettes used across the app. See https://docs.expo.dev/guides/color-schemes/
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B0B0F',
    textSecondary: '#60646C',
    background: '#F2F2F7',
    card: '#FFFFFF',
    border: '#E3E4E8',
    track: '#E6E7EB',
    tint: '#2563EB',
    onTint: '#FFFFFF',
    danger: '#DC2626',
    warning: '#C2410C',
  },
  dark: {
    text: '#F5F5F7',
    textSecondary: '#A1A1AA',
    background: '#000000',
    card: '#1C1C1E',
    border: '#2C2C2E',
    track: '#2C2C2E',
    tint: '#5B9BFF',
    onTint: '#FFFFFF',
    danger: '#F87171',
    warning: '#FB923C',
  },
} as const;

export type ThemeColors = (typeof Colors)['light'] | (typeof Colors)['dark'];

/** Avatar backgrounds, picked per service by hashing its name. */
export const AvatarColors = ['#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#16A34A', '#0D9488', '#0891B2'];

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 640;
