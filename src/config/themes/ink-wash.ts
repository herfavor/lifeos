/**
 * Ink Wash Theme — LifeOS default
 * Quiet neutrals with a single brand-blue action accent.
 * Hues carry meaning: blue = action, green = complete, amber = attention,
 * red = danger, purple = AI/reflection, teal = time/focus.
 */

import type { ThemeDefinition } from './types';

export const inkWashTheme: ThemeDefinition = {
  id: 'ink-wash',
  name: 'Ink Wash',
  description: '中性灰底与品牌蓝强调，克制安静的默认配色',
  category: 'minimal',
  preview: {
    primary: '#3478F6',
    secondary: '#0E7490',
    accent: '#7C3AED',
  },
  light: {
    '--surface-light': '#F7F8FA',
    '--surface-light-elevated': '#ECF0F4',
    '--surface-dark': '#0B1120',
    '--surface-dark-elevated': '#152033',

    '--text-light-primary': '#17191C',
    '--text-light-secondary': '#667085',
    '--text-light-tertiary': '#64748B',
    '--text-dark-primary': '#F1F5F9',
    '--text-dark-secondary': '#CBD5E1',
    '--text-dark-tertiary': '#94A3B8',

    '--border-light': '#E6E8EC',
    '--border-dark': 'rgba(148, 163, 184, 0.20)',

    '--accent-blue': '#3478F6',
    '--accent-blue-hover': '#2B68E0',
    '--accent-magenta': '#DB2777',
    '--accent-magenta-hover': '#BE185D',
    '--accent-cyan': '#0E7490',
    '--accent-cyan-hover': '#155E75',
    '--accent-green': '#16A34A',
    '--accent-green-hover': '#15803D',
    '--accent-neon-green': '#4ADE80',
    '--accent-purple': '#7C3AED',
    '--accent-purple-hover': '#6D28D9',
    '--accent-red': '#DC2626',
    '--accent-red-hover': '#B91C1C',
    '--accent-yellow': '#D97706',
    '--accent-yellow-hover': '#B45309',
    '--accent-orange': '#EA580C',
    '--accent-orange-hover': '#C2410C',

    '--accent-primary': '#3478F6',
    '--accent-primary-hover': '#2B68E0',
    '--accent-secondary': '#0E7490',
    '--accent-secondary-hover': '#155E75',

    '--status-success': '#16A34A',
    '--status-warning': '#D97706',
    '--status-error': '#DC2626',
    '--status-info': '#3478F6',
  },
  dark: {
    '--surface-light': '#F7F8FA',
    '--surface-light-elevated': '#ECF0F4',
    '--surface-dark': '#0B1120',
    '--surface-dark-elevated': '#152033',

    '--text-light-primary': '#17191C',
    '--text-light-secondary': '#667085',
    '--text-light-tertiary': '#64748B',
    '--text-dark-primary': '#F1F5F9',
    '--text-dark-secondary': '#CBD5E1',
    '--text-dark-tertiary': '#94A3B8',

    '--border-light': '#E6E8EC',
    '--border-dark': 'rgba(148, 163, 184, 0.25)',

    '--accent-blue': '#6B9BFF',
    '--accent-blue-hover': '#8FB3FF',
    '--accent-magenta': '#F472B6',
    '--accent-magenta-hover': '#F9A8D4',
    '--accent-cyan': '#2DD4BF',
    '--accent-cyan-hover': '#5EEAD4',
    '--accent-green': '#4ADE80',
    '--accent-green-hover': '#86EFAC',
    '--accent-neon-green': '#4ADE80',
    '--accent-purple': '#A78BFA',
    '--accent-purple-hover': '#C4B5FD',
    '--accent-red': '#F87171',
    '--accent-red-hover': '#FCA5A5',
    '--accent-yellow': '#FBBF24',
    '--accent-yellow-hover': '#FCD34D',
    '--accent-orange': '#FB923C',
    '--accent-orange-hover': '#FDBA74',

    '--accent-primary': '#6B9BFF',
    '--accent-primary-hover': '#8FB3FF',
    '--accent-secondary': '#2DD4BF',
    '--accent-secondary-hover': '#5EEAD4',

    '--status-success': '#4ADE80',
    '--status-warning': '#FBBF24',
    '--status-error': '#F87171',
    '--status-info': '#6B9BFF',
  },
};
