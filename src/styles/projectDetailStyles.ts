import React from 'react';
import { colors } from './theme';

// Card Styles
export const cardStyle: React.CSSProperties = {
  background: colors.cardBackground,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: 24,
  marginBottom: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

// Header Styles
export const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  margin: '0 0 16px 0',
  color: colors.textPrimary,
};

export const subsectionHeaderStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  margin: '0 0 12px 0',
  color: '#374151',
};

// Input Styles
export const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  fontSize: 14,
  width: '100%',
  background: colors.cardBackground,
};

// Table Styles
export const thLeft: React.CSSProperties = {
  padding: '12px 8px',
  textAlign: 'left',
  fontWeight: 600,
  borderBottom: `2px solid ${colors.border}`,
  fontSize: 13,
  color: colors.textSecondary,
};

export const thCenter: React.CSSProperties = {
  ...thLeft,
  textAlign: 'center',
};

export const thRight: React.CSSProperties = {
  ...thLeft,
  textAlign: 'right',
};

export const tdLeft: React.CSSProperties = {
  padding: '12px 8px',
  borderBottom: '1px solid #ebe5db',
  fontSize: 14,
  color: '#1e293b',
};

export const tdCenter: React.CSSProperties = {
  ...tdLeft,
  textAlign: 'center',
};

export const tdRight: React.CSSProperties = {
  ...tdLeft,
  textAlign: 'right',
};

// Button Styles
export const primaryButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: 'none',
  borderRadius: 6,
  background: '#1e3a5f',
  color: '#fff',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

export const secondaryButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px solid #d9cfc1',
  borderRadius: 6,
  background: '#faf8f5',
  color: '#374151',
  fontSize: 14,
  cursor: 'pointer',
};

export const dangerButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: 'none',
  borderRadius: 6,
  background: '#ef4444',
  color: '#fff',
  fontSize: 14,
  cursor: 'pointer',
};

export const successButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: 'none',
  borderRadius: 6,
  background: '#059669',
  color: '#fff',
  fontSize: 14,
  cursor: 'pointer',
};

// Label Styles
export const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#475569',
  marginBottom: 4,
  letterSpacing: '.25px',
  textTransform: 'uppercase',
};

// Layout Styles
export const pageContainerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f5f1ea',
  fontFamily: 'system-ui',
};

export const headerStyle: React.CSSProperties = {
  background: '#faf8f5',
  borderBottom: '1px solid #e5dfd5',
  padding: '16px 24px',
};

export const contentWrapperStyle: React.CSSProperties = {
  maxWidth: 1600,
  margin: '0 auto',
  padding: 24,
};

export const threeColumnLayoutStyle: React.CSSProperties = {
  display: 'flex',
  gap: 24,
  alignItems: 'flex-start',
};

export const leftSidebarStyle: React.CSSProperties = {
  flex: '0 0 20%',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

export const stickyContainerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

export const mainContentStyle: React.CSSProperties = {
  flex: '0 0 55%',
};

export const rightSidebarStyle: React.CSSProperties = {
  flex: '0 0 25%',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

export const projectInfoCardStyle: React.CSSProperties = {
  background: '#faf8f5',
  borderRadius: 8,
  padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};

export const statusCardStyle: React.CSSProperties = {
  background: '#faf8f5',
  borderRadius: 8,
  padding: 16,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  border: '1px solid #e5dfd5',
};

export const editFormContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  background: '#f0ebe3',
  padding: 12,
  borderRadius: 8,
  border: '1px solid #e5dfd5',
};

export const formFieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

// Tab Styles
export const tabContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 12,
  borderBottom: '1px solid #e5dfd5',
};

export const getTabStyle = (isActive: boolean): React.CSSProperties => ({
  padding: '8px 12px',
  border: 'none',
  background: 'transparent',
  borderBottom: isActive ? '3px solid #1e3a5f' : '3px solid transparent',
  color: isActive ? '#0f172a' : '#64748b',
  fontWeight: isActive ? 700 : 600,
  cursor: 'pointer',
});

// Toast Styles
export const getToastStyle = (
  type: 'success' | 'error' | 'info'
): React.CSSProperties => ({
  position: 'fixed',
  right: 20,
  bottom: 20,
  background:
    type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#1e3a5f',
  color: '#fff',
  padding: '10px 14px',
  borderRadius: 8,
  boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
  fontSize: 14,
  zIndex: 9999,
  maxWidth: 320,
});

// Text Styles
export const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  margin: 0,
  color: '#0f172a',
};

export const subtitleStyle: React.CSSProperties = {
  color: '#64748b',
  margin: '4px 0 0',
  fontSize: 16,
};

export const detailLabelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: '#64748b',
  fontWeight: 500,
};

export const detailValueStyle: React.CSSProperties = {
  margin: '2px 0 0',
  fontSize: 14,
  color: '#0f172a',
};

export const sectionDividerStyle: React.CSSProperties = {
  borderTop: '1px solid #e5e7eb',
  paddingTop: 16,
  marginTop: 4,
};

export const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 12px 0',
  fontSize: 13,
  fontWeight: 600,
  color: '#0f172a',
};
