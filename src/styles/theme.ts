// FloCon Brand Theme Colors
// Centralized color constants for consistent styling across the application

export const colors = {
  // Primary Navy (from logo)
  navy: '#1e3a5f',
  navyHover: '#152d4a',
  
  // Grayish Blue (replacing green)
  grayBlueDark: '#475569',
  grayBlue: '#64748b',
  grayBlueLight: '#e0e7ee',
  
  // Logo Red
  logoRed: '#c8102e',
  
  // Warm Beige/Tan (backgrounds)
  backgroundLight: '#f5f1ea',
  cardBackground: '#faf8f5',
  toggleBackground: '#ebe5db',
  tableHeader: '#f0ebe3',
  border: '#e5dfd5',
  rowAlternate: '#f0ebe3', // Alternating table rows
  
  // Neutrals
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#9ca3af',
  gray: '#6b7280',
  grayLight: '#e5e7eb',
  
  // Legacy aliases (for compatibility)
  avocadoDark: '#475569',      // Now grayish blue
  avocado: '#475569',
  avocadoLight: '#64748b',
  avocadoLightest: '#e0e7ee',
  
  // Status Colors
  warning: '#fef3c7',
  warningBorder: '#fbbf24',
  warningText: '#92400e',
  
  error: '#fee2e2',
  errorBorder: '#f5c2c7',
  errorText: '#991b1b',
  
  success: '#e0e7ee',          // Now grayish blue
  successBorder: '#64748b',
  successText: '#475569',
  
  // Legacy/Fallback (gradually remove these)
  white: '#fff',
} as const;

// Common button styles
export const buttonStyles = {
  primary: {
    background: colors.navy,
    color: colors.white,
    hover: colors.navyHover,
  },
  success: {
    background: colors.grayBlueDark,
    color: colors.white,
    hover: '#334155',
  },
  danger: {
    background: colors.logoRed,
    color: colors.white,
    hover: '#a00d26',
  },
  cancel: {
    background: colors.gray,
    color: colors.white,
    hover: '#4b5563',
  },
} as const;
