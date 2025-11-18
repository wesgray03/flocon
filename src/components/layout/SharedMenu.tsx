// components/layout/SharedMenu.tsx
// Shared menu items for all master data
// Used across Prospects, Projects, and Project Detail pages

import { colors } from '@/styles/theme';
import { useRouter } from 'next/router';

const menuItemButton: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '10px 16px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  color: colors.textPrimary,
  transition: 'background 0.15s',
  borderBottom: '1px solid #e5dfd5',
};

const menuHeaderStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '8px 16px',
  background: '#f9fafb',
  border: 'none',
  fontSize: 12,
  fontWeight: 600,
  color: colors.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid #e5dfd5',
};

interface SharedMenuProps {
  onClose: () => void;
  onOpenMasterData?: (table: string, label: string) => void;
  onOpenCompanies?: (
    companyType:
      | 'Contractor'
      | 'Architect'
      | 'Owner'
      | 'Subcontractor'
      | 'Vendor',
    label: string
  ) => void;
  onOpenContacts?: () => void;
  onOpenUsers?: () => void;
  onOpenLostReasons?: () => void;
}

export function SharedMenu({
  onClose,
  onOpenMasterData,
  onOpenCompanies,
  onOpenContacts,
  onOpenUsers,
  onOpenLostReasons,
}: SharedMenuProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const { supabase } = await import('@/lib/supabaseClient');
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      <div
        style={{
          height: 1,
          background: '#e5dfd5',
          margin: '4px 0',
        }}
      />

      {/* Companies Section */}
      <div style={menuHeaderStyle}>Companies</div>
      <button
        type="button"
        style={menuItemButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f0ebe3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        onClick={() => {
          onClose();
          if (onOpenCompanies) {
            onOpenCompanies('Contractor', 'Contractors (Customers)');
          }
        }}
      >
        Contractors
      </button>
      <button
        type="button"
        style={menuItemButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f0ebe3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        onClick={() => {
          onClose();
          if (onOpenCompanies) {
            onOpenCompanies('Architect', 'Architects');
          }
        }}
      >
        Architects
      </button>
      <button
        type="button"
        style={menuItemButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f0ebe3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        onClick={() => {
          onClose();
          if (onOpenCompanies) {
            onOpenCompanies('Owner', 'Owners');
          }
        }}
      >
        Owners
      </button>
      <button
        type="button"
        style={menuItemButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f0ebe3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        onClick={() => {
          onClose();
          if (onOpenCompanies) {
            onOpenCompanies('Subcontractor', 'Subcontractors');
          }
        }}
      >
        Subcontractors
      </button>
      <button
        type="button"
        style={menuItemButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f0ebe3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        onClick={() => {
          onClose();
          if (onOpenCompanies) {
            onOpenCompanies('Vendor', 'Vendors');
          }
        }}
      >
        Vendors
      </button>

      <div
        style={{
          height: 1,
          background: '#e5dfd5',
          margin: '4px 0',
        }}
      />

      {/* People Section */}
      <div style={menuHeaderStyle}>People</div>
      <button
        type="button"
        style={menuItemButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f0ebe3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        onClick={() => {
          onClose();
          if (onOpenContacts) {
            onOpenContacts();
          }
        }}
      >
        Contacts
      </button>
      <button
        type="button"
        style={menuItemButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f0ebe3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        onClick={() => {
          onClose();
          if (onOpenUsers) {
            onOpenUsers();
          }
        }}
      >
        Users
      </button>

      <div
        style={{
          height: 1,
          background: '#e5dfd5',
          margin: '4px 0',
        }}
      />

      {/* Project Data Section */}
      <div style={menuHeaderStyle}>Project Data</div>
      <button
        type="button"
        style={menuItemButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f0ebe3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        onClick={() => {
          onClose();
          if (onOpenMasterData) {
            onOpenMasterData('stages', 'Stages');
          }
        }}
      >
        Stages
      </button>
      <button
        type="button"
        style={menuItemButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f0ebe3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        onClick={() => {
          onClose();
          if (onOpenMasterData) {
            onOpenMasterData('engagement_tasks', 'Project Tasks');
          }
        }}
      >
        Project Tasks
      </button>
      <button
        type="button"
        style={menuItemButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f0ebe3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        onClick={() => {
          onClose();
          if (onOpenLostReasons) {
            onOpenLostReasons();
          }
        }}
      >
        Lost Reasons
      </button>

      <div
        style={{
          height: 1,
          background: '#e5dfd5',
          margin: '4px 0',
        }}
      />

      {/* QuickBooks Section */}
      <div style={menuHeaderStyle}>QuickBooks</div>
      <button
        type="button"
        style={menuItemButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f0ebe3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        onClick={async () => {
          onClose();
          if (confirm('Sync all projects to QuickBooks?')) {
            try {
              const response = await fetch('/api/qbo/sync-all-projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ onlyUnsynced: false }),
              });
              const data = await response.json();
              if (data.success) {
                alert(
                  `Success! Synced ${data.syncedCount} of ${data.totalCount} projects.`
                );
                window.location.reload();
              } else {
                alert(
                  `Completed with errors. Synced: ${data.syncedCount}, Errors: ${data.errorCount}`
                );
              }
            } catch (error: any) {
              alert(`Error: ${error.message}`);
            }
          }
        }}
      >
        Sync All Projects
      </button>

      <div
        style={{
          height: 1,
          background: '#e5dfd5',
          margin: '4px 0',
        }}
      />

      <button
        type="button"
        style={{
          ...menuItemButton,
          borderBottom: 'none',
          color: colors.logoRed,
          fontWeight: 600,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#fee2e2';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        onClick={() => {
          onClose();
          handleSignOut();
        }}
      >
        Sign Out
      </button>
    </>
  );
}
