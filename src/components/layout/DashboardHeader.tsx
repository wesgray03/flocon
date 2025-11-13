// components/layout/DashboardHeader.tsx
import { colors } from '@/styles/theme';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Popover({ open, onClose, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 8,
        width: 220,
        background: '#fff',
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        zIndex: 1001,
      }}
      role="menu"
    >
      {children}
    </div>
  );
}

interface DashboardHeaderProps {
  sessionEmail: string | null;
  activeTab: 'prospects' | 'projects';
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  menuItems: React.ReactNode;
  actionButton?: React.ReactNode;
  exportButton?: React.ReactNode;
}

export function DashboardHeader({
  activeTab,
  menuOpen,
  setMenuOpen,
  menuItems,
  actionButton,
  exportButton,
}: DashboardHeaderProps) {
  return (
    <div
      className="projects-header"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        minHeight: 69,
        marginBottom: 24,
        background: colors.cardBackground,
        padding: '12px 20px',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        gap: 16,
      }}
    >
      {/* Left: FloCon Logo */}
      <div
        className="projects-header-left"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        <Image
          src="/flocon-logo-v2.png"
          alt="FloCon"
          width={150}
          height={45}
          style={{ height: 'auto', maxHeight: 45, width: 'auto' }}
          priority
        />
      </div>

      {/* Center: Prospects | Projects Toggle */}
      <div
        className="projects-header-center"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color:
              activeTab === 'prospects' ? colors.navy : colors.textSecondary,
          }}
        >
          Prospects
        </span>
        <Link
          href={activeTab === 'prospects' ? '/projects' : '/prospects'}
          style={{
            position: 'relative',
            width: 56,
            height: 28,
            background: colors.navy,
            borderRadius: 14,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'inline-block',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 2,
              left: activeTab === 'prospects' ? 2 : 28,
              width: 24,
              height: 24,
              background: '#fff',
              borderRadius: '50%',
              transition: 'left 0.3s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          />
        </Link>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color:
              activeTab === 'projects' ? colors.navy : colors.textSecondary,
          }}
        >
          Projects
        </span>
      </div>

      {/* Right: Export Button + Menu Button */}
      <div
        className="projects-header-right"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: 'flex-end',
        }}
      >
        {actionButton}
        {exportButton}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="projects-menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            style={{
              background: colors.toggleBackground,
              color: colors.textPrimary,
              padding: '10px 12px',
              borderRadius: 6,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
              fontSize: 16,
            }}
            title="Menu"
            aria-label="Menu"
          >
            ☰
          </button>
          <Popover open={menuOpen} onClose={() => setMenuOpen(false)}>
            {menuItems}
          </Popover>
        </div>
      </div>
    </div>
  );
}

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
