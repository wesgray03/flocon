// FloCon Brand Theme Colors
// Centralized color constants for consistent styling across the application

export const colors = {
  // Primary Navy (from logo)
  navy: '#1e3a5f',
  navyHover: '#152d4a',
  
  // Avocado Green (from logo)
  avocadoDark: '#4a5d23',
  avocado: '#6b8e23',
  avocadoLight: '#a8c070',
  avocadoLightest: '#e8f0d4',
  
  // Logo Red
  logoRed: '#c8102e',
  
  // Warm Beige/Tan (backgrounds)
  backgroundLight: '#f5f1ea',
  cardBackground: '#faf8f5',
  toggleBackground: '#ebe5db',
  tableHeader: '#f0ebe3',
  border: '#e5dfd5',
  
  // Neutrals
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#9ca3af',
  gray: '#6b7280',
  
  // Status Colors
  warning: '#fef3c7',
  warningBorder: '#fbbf24',
  warningText: '#92400e',
  
  error: '#fee2e2',
  errorBorder: '#f5c2c7',
  errorText: '#991b1b',
  
  success: '#e8f0d4',
  successBorder: '#a8c070',
  successText: '#4a5d23',
  
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
    background: colors.avocadoDark,
    color: colors.white,
    hover: '#3d4d1c',
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
