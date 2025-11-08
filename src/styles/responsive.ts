// Responsive utility functions and breakpoints
import { CSSProperties } from 'react';

// Breakpoints
export const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
} as const;

// Media query helper
export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < breakpoints.mobile;
};

export const isTablet = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.innerWidth >= breakpoints.mobile &&
    window.innerWidth < breakpoints.tablet
  );
};

// Responsive modal styles
export const getResponsiveModalStyles = (): CSSProperties => {
  if (typeof window === 'undefined') {
    return {
      maxWidth: 1200,
      width: '90%',
      padding: 24,
    };
  }

  const width = window.innerWidth;

  if (width < breakpoints.mobile) {
    // Mobile: nearly full screen
    return {
      maxWidth: '100%',
      width: '95vw',
      padding: 16,
      maxHeight: '95vh',
    };
  } else if (width < breakpoints.tablet) {
    // Tablet: slightly smaller margins
    return {
      maxWidth: 700,
      width: '92%',
      padding: 20,
      maxHeight: '92vh',
    };
  } else {
    // Desktop: original styles
    return {
      maxWidth: 1200,
      width: '90%',
      padding: 24,
      maxHeight: '90vh',
    };
  }
};

// Responsive touch target size
export const minTouchTarget = 44; // iOS/Android recommended minimum

// Button styles with proper touch targets
export const getResponsiveButtonStyles = (
  size: 'small' | 'medium' | 'large' = 'medium'
): CSSProperties => {
  const baseStyles: CSSProperties = {
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: minTouchTarget,
    minWidth: minTouchTarget,
  };

  switch (size) {
    case 'small':
      return {
        ...baseStyles,
        padding: '8px 12px',
        fontSize: 13,
      };
    case 'large':
      return {
        ...baseStyles,
        padding: '12px 24px',
        fontSize: 16,
      };
    case 'medium':
    default:
      return {
        ...baseStyles,
        padding: '10px 16px',
        fontSize: 14,
      };
  }
};
