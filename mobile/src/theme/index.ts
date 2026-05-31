export const lightColors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  secondary: '#0F766E',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  error: '#DC2626',
  success: '#16A34A',
  warning: '#F59E0B',
  sos: '#EF4444',
  tabInactive: '#94A3B8',
};

export const darkColors = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  secondary: '#14B8A6',
  background: '#0F172A',
  surface: '#1E293B',
  card: '#1E293B',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  border: '#334155',
  error: '#F87171',
  success: '#4ADE80',
  warning: '#FBBF24',
  sos: '#EF4444',
  tabInactive: '#64748B',
};

export type ColorScheme = typeof lightColors;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  subtitle: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600' as const, lineHeight: 18 },
};

export const shadows = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
};

// Legacy export for backward compatibility
export const colors = lightColors;
