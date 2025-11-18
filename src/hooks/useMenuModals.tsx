// hooks/useMenuModals.tsx
// Shared hook for menu modal state management across all pages
import { CompaniesModal } from '@/components/modals/CompaniesModal';
import { ContactsModal } from '@/components/modals/ContactsModal';
import { LostReasonsModal } from '@/components/modals/LostReasonsModal';
import { MasterDataModal } from '@/components/modals/MasterDataModal';
import { UsersModal } from '@/components/modals/UsersModal';
import { useState } from 'react';

export function useMenuModals(onDataChange?: () => void) {
  const [companiesModal, setCompaniesModal] = useState<{
    open: boolean;
    companyType:
      | 'Contractor'
      | 'Architect'
      | 'Owner'
      | 'Subcontractor'
      | 'Vendor'
      | null;
    label: string;
  }>({ open: false, companyType: null, label: '' });

  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showLostReasonsModal, setShowLostReasonsModal] = useState(false);

  const [showMaster, setShowMaster] = useState<null | {
    table: 'stages' | 'engagement_tasks';
    label: string;
  }>(null);

  const openMaster = (table: 'stages' | 'engagement_tasks', label: string) => {
    console.log('[openMaster] Called with:', { table, label });
    setShowMaster({ table, label });
  };

  const closeMaster = () => setShowMaster(null);

  const menuCallbacks = {
    onOpenMasterData: (table: string, label: string) =>
      openMaster(table as 'stages' | 'engagement_tasks', label),
    onOpenCompanies: (
      companyType:
        | 'Contractor'
        | 'Architect'
        | 'Owner'
        | 'Subcontractor'
        | 'Vendor',
      label: string
    ) => {
      setCompaniesModal({ open: true, companyType, label });
    },
    onOpenContacts: () => setShowContactsModal(true),
    onOpenUsers: () => setShowUsersModal(true),
    onOpenLostReasons: () => setShowLostReasonsModal(true),
  };

  const renderModals = () => (
    <>
      {/* Master Data Modal (Stages, Project Tasks) */}
      {showMaster && (
        <>
          {console.log('[Render] MasterDataModal with:', showMaster)}
          <MasterDataModal
            open={true}
            onClose={closeMaster}
            table={showMaster.table}
            label={showMaster.label}
          />
        </>
      )}

      {/* Companies Modal */}
      {companiesModal.open && companiesModal.companyType && (
        <CompaniesModal
          open={companiesModal.open}
          onClose={() => {
            setCompaniesModal({ open: false, companyType: null, label: '' });
            onDataChange?.(); // Reload data if callback provided
          }}
          companyType={companiesModal.companyType}
          label={companiesModal.label}
        />
      )}

      {/* Users Modal */}
      {console.log('[Render] showUsersModal:', showUsersModal)}
      <UsersModal
        open={showUsersModal}
        onClose={() => setShowUsersModal(false)}
      />

      {/* Contacts Modal */}
      {console.log('[Render] showContactsModal:', showContactsModal)}
      <ContactsModal
        open={showContactsModal}
        onClose={() => setShowContactsModal(false)}
      />

      {/* Lost Reasons Modal */}
      {console.log('[Render] showLostReasonsModal:', showLostReasonsModal)}
      {showLostReasonsModal && (
        <LostReasonsModal
          open={showLostReasonsModal}
          onClose={() => {
            setShowLostReasonsModal(false);
            onDataChange?.(); // Reload data if callback provided
          }}
        />
      )}
    </>
  );

  return {
    menuCallbacks,
    renderModals,
  };
}
