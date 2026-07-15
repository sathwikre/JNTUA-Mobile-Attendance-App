/**
 * Shared Design Tokens
 *
 * Single source of truth for typography, spacing, and radius.
 * Every component imports from here for consistency.
 */
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const isSmall = SCREEN_WIDTH <= 360;

/* ─── Typography Scale ─── */
export const T = {
  /** Big ring percentage, hero numbers */
  hero:    { fontSize: isSmall ? 32 : 38, fontWeight: '900' as const, lineHeight: isSmall ? 36 : 44 },
  /** Section titles, modal subject names */
  h1:      { fontSize: isSmall ? 18 : 20, fontWeight: '800' as const, lineHeight: isSmall ? 22 : 26 },
  /** Card titles, nav title */
  h2:      { fontSize: isSmall ? 16 : 18, fontWeight: '700' as const, lineHeight: isSmall ? 20 : 24 },
  /** Subsection, stat values */
  h3:      { fontSize: isSmall ? 15 : 17, fontWeight: '700' as const, lineHeight: isSmall ? 19 : 22 },
  /** Primary body text */
  body:    { fontSize: isSmall ? 14 : 15, fontWeight: '600' as const, lineHeight: isSmall ? 18 : 20 },
  /** Secondary text, descriptions */
  caption: { fontSize: isSmall ? 12 : 13, fontWeight: '600' as const, lineHeight: isSmall ? 16 : 18 },
  /** Small labels, badges, meta */
  micro:   { fontSize: isSmall ? 10 : 11, fontWeight: '700' as const, lineHeight: isSmall ? 13 : 15 },
  /** Tiny labels, uppercase categories */
  nano:    { fontSize: isSmall ? 9 : 10,  fontWeight: '700' as const, lineHeight: isSmall ? 12 : 14 },
};

/* ─── Spacing Scale ─── */
export const SP = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 14,
  xxxl: 16,
};

/* ─── Consistent card / container tokens ─── */
export const CARD = {
  marginH: 14,       // horizontal margin for cards
  marginB: 10,       // vertical gap between cards
  padding: 14,       // inner padding
  radius: 14,        // border radius
  border: '#F1F5F9', // border color
  bg: '#FFFFFF',     // background
};

export const COLORS = {
  bg: '#F9FAFB',
  text: '#1E293B',
  textSec: '#475569',
  textMut: '#94A3B8',
  textFaint: '#CBD5E1',
  border: '#F1F5F9',
  borderLight: '#E2E8F0',
  surface: '#F8FAFC',
  white: '#FFFFFF',
  accent: '#7C3AED',
  accentLight: '#F5F3FF',
  green: '#22C55E',
  greenDark: '#16A34A',
  greenBg: '#F0FDF4',
  greenBorder: '#BBF7D0',
  amber: '#F59E0B',
  amberDark: '#D97706',
  amberBg: '#FFFBEB',
  amberBorder: '#FDE68A',
  red: '#EF4444',
  redDark: '#DC2626',
  redBg: '#FEF2F2',
  redBorder: '#FECACA',
  indigo: '#6366F1',
};
