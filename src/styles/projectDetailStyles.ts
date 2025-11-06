import React from 'react';

// Card Styles
export const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
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
  color: '#0f172a',
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
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  width: '100%',
};

// Table Styles
export const thLeft: React.CSSProperties = {
  padding: '12px 8px',
  textAlign: 'left',
  fontWeight: 600,
  borderBottom: '2px solid #e2e8f0',
  fontSize: 13,
  color: '#64748b',
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
  borderBottom: '1px solid #f1f5f9',
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
  background: '#2563eb',
  color: '#fff',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

export const secondaryButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  background: '#fff',
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
