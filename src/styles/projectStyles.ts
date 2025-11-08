// Shared styles for the Projects page
import React from 'react';
import { colors } from './theme';

// Table header styles
export const th: React.CSSProperties = {
  textAlign: 'left',
  padding: 8,
  borderBottom: `1px solid ${colors.border}`,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  background: colors.tableHeader,
};

export const thRight: React.CSSProperties = { ...th, textAlign: 'right' };
export const thCenter: React.CSSProperties = {
  ...th,
  textAlign: 'center',
  cursor: 'default',
};

// Column-specific widths
export const thQBID: React.CSSProperties = {
  ...th,
  width: 80,
  minWidth: 80,
  maxWidth: 80,
};
export const thProjectName: React.CSSProperties = {
  ...th,
  width: 250,
  minWidth: 200,
};
export const thCustomer: React.CSSProperties = {
  ...th,
  width: 180,
  minWidth: 150,
};
export const thManager: React.CSSProperties = {
  ...th,
  width: 140,
  minWidth: 120,
};
export const thOwner: React.CSSProperties = {
  ...th,
  width: 140,
  minWidth: 120,
};
export const thStage: React.CSSProperties = {
  ...th,
  width: 160,
  minWidth: 140,
};
export const thMoney: React.CSSProperties = {
  ...thRight,
  width: 110,
  minWidth: 100,
};
export const thDate: React.CSSProperties = { ...th, width: 100, minWidth: 90 };
export const thActions: React.CSSProperties = {
  ...thCenter,
  width: 80,
  minWidth: 80,
};

// Table cell styles
export const td: React.CSSProperties = {
  padding: 8,
  borderBottom: `1px solid ${colors.border}`,
  whiteSpace: 'nowrap',
};

export const tdRight: React.CSSProperties = { ...td, textAlign: 'right' };
export const tdCenter: React.CSSProperties = { ...td, textAlign: 'center' };

// Modal styles
export const overlay: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

export const modal: React.CSSProperties = {
  background: colors.white,
  borderRadius: 12,
  padding: 24,
  maxWidth: 1400,
  width: '90%',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
};

// Input and button styles
export const input: React.CSSProperties = {
  padding: 8,
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  width: '100%',
  background: colors.cardBackground,
};

export const btnCancel: React.CSSProperties = {
  padding: '8px 12px',
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  background: colors.white,
  cursor: 'pointer',
};

export const btnSave: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  background: colors.navy,
  color: colors.white,
  border: 'none',
  cursor: 'pointer',
};

export const btnSmall: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 12,
  background: colors.textPrimary,
  color: colors.white,
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};

export const menuItemButton: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  color: colors.textPrimary,
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
  fontSize: 14,
  borderBottom: `1px solid ${colors.tableHeader}`,
  cursor: 'pointer',
};

// Additional button variants
export const btnPrimary: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  background: colors.navy,
  color: colors.white,
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
};

export const btnSuccess: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  background: colors.grayBlueDark,
  color: colors.white,
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
};

export const btnDanger: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  background: colors.logoRed,
  color: colors.white,
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
};

// Link styles
export const linkPrimary: React.CSSProperties = {
  color: colors.navy,
  textDecoration: 'none',
};

export const linkDanger: React.CSSProperties = {
  color: colors.logoRed,
  textDecoration: 'none',
};
