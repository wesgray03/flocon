import { supabase } from '@/lib/supabaseClient';
import { colors } from '@/styles/theme';
import { Download, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Company {
  id: string;
  name: string;
  company_type:
    | 'Contractor'
    | 'Architect'
    | 'Owner'
    | 'Subcontractor'
    | 'Vendor';
  is_customer: boolean;
}
type CompanyUpsertPayload = {
  name: string;
  company_type:
    | 'Contractor'
    | 'Architect'
    | 'Owner'
    | 'Subcontractor'
    | 'Vendor';
  is_customer: boolean;
  is_subcontractor: boolean;
  is_vendor: boolean;
};

interface CompaniesModalProps {
  open: boolean;
  onClose: () => void;
  companyType:
    | 'Contractor'
    | 'Architect'
    | 'Owner'
    | 'Subcontractor'
    | 'Vendor';
  label: string;
}

export function CompaniesModal({
  open,
  onClose,
  companyType,
  label,
}: CompaniesModalProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const [showAllVendors, setShowAllVendors] = useState(false);
  const [vendorImportList, setVendorImportList] = useState<Set<string>>(
    new Set()
  );
  const [formData, setFormData] = useState({
    name: '',
    is_customer: companyType === 'Contractor',
  });

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // For Vendor type, load import list and filter accordingly
      if (companyType === 'Vendor') {
        // Load vendor import list
        const { data: importList, error: importError } = await supabase
          .from('qbo_vendor_import_list')
          .select('vendor_name');

        if (importError) throw importError;

        const importNames = new Set(
          (importList || []).map((v) => v.vendor_name.toLowerCase().trim())
        );
        setVendorImportList(importNames);

        // Load all vendors from companies
        const { data, error } = await supabase
          .from('companies')
          .select('id, name, company_type, is_customer')
          .eq('company_type', companyType)
          .order('name', { ascending: true });

        if (error) throw error;

        // Filter based on showAllVendors flag
        const filtered = showAllVendors
          ? (data ?? [])
          : (data ?? []).filter((c) =>
              importNames.has(c.name.toLowerCase().trim())
            );

        setCompanies(filtered);
      } else {
        // For non-vendor types, load normally
        const { data, error } = await supabase
          .from('companies')
          .select('id, name, company_type, is_customer')
          .eq('company_type', companyType)
          .order('name', { ascending: true });

        if (error) throw error;
        setCompanies(data ?? []);
      }
    } catch (err: unknown) {
      console.error('Companies load error:', err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : String(err);
      setLoadError(message);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, companyType, showAllVendors]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const resetForm = () => {
    setFormData({
      name: '',
      is_customer: companyType === 'Contractor',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (company: Company) => {
    setEditingId(company.id);
    setFormData({
      name: company.name,
      is_customer: company.is_customer,
    });
    setShowForm(true);
  };

  const save = async () => {
    const { name } = formData;
    if (!name.trim()) {
      return alert('Company name is required');
    }

    try {
      const payload: CompanyUpsertPayload = {
        name: name.trim(),
        company_type: companyType,
        is_customer: companyType === 'Contractor', // Auto-set based on type
        is_subcontractor: companyType === 'Subcontractor', // Auto-set for subcontractors
        is_vendor: companyType === 'Vendor', // Auto-set for vendors
      };

      if (editingId) {
        const { error } = await supabase
          .from('companies')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('companies').insert([payload]);
        if (error) throw error;
      }
      await load();
      resetForm();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : String(err);
      alert(`Save company error: ${message}`);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this company? This may affect related records.'))
      return;
    // Guard: block deleting any company that is referenced anywhere
    try {
      // 1) Used in engagement_parties as a company?
      const { count: partyCount, error: partyErr } = await supabase
        .from('engagement_parties')
        .select('id', { count: 'exact', head: true })
        .eq('party_type', 'company')
        .eq('party_id', id);
      if (partyErr) throw partyErr;
      if ((partyCount ?? 0) > 0) {
        alert(
          'Cannot delete this company because it is linked to one or more engagements (engagement_parties). Remove those links first.'
        );
        return;
      }

      // 2) Used in engagement_subcontractors?
      const { count: subsCount, error: subsErr } = await supabase
        .from('engagement_subcontractors')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', id);
      if (subsErr) throw subsErr;
      if ((subsCount ?? 0) > 0) {
        alert(
          'Cannot delete this company because it is assigned as a subcontractor on one or more projects. Remove those assignments first.'
        );
        return;
      }

      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
      await load();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : String(err);
      alert(`Delete company error: ${message}`);
    }
  };

  const toggleVendorImportList = async (vendorName: string, add: boolean) => {
    try {
      if (add) {
        const { error } = await supabase
          .from('qbo_vendor_import_list')
          .insert([{ vendor_name: vendorName }]);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('qbo_vendor_import_list')
          .delete()
          .eq('vendor_name', vendorName);

        if (error) throw error;
      }

      await load(); // Reload to update the list
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : String(err);
      alert(`Error: ${message}`);
    }
  };

  const pullFromQuickBooks = async () => {
    const isSubcontractor = companyType === 'Subcontractor';
    const isVendor = companyType === 'Vendor';
    const isContractor = companyType === 'Contractor';

    let confirmMessage = '';
    if (isSubcontractor) {
      confirmMessage =
        'Pull subcontractors from QuickBooks? This will import all vendors marked for 1099 tracking.';
    } else if (isVendor) {
      confirmMessage =
        'Pull vendors from QuickBooks? This will import all vendors.';
    } else if (isContractor) {
      confirmMessage =
        'Pull customers from QuickBooks? This will import all customers.';
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    setPulling(true);
    try {
      let endpoint = '';
      if (isSubcontractor) {
        endpoint = '/api/qbo/pull-subcontractors';
      } else if (isVendor) {
        endpoint = '/api/qbo/pull-vendors';
      } else if (isContractor) {
        endpoint = '/api/qbo/pull-customers';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (result.success) {
        alert(
          `Success! Created: ${result.created}, Updated: ${result.updated}, Skipped: ${result.skipped}`
        );
        await load(); // Refresh the list
      } else {
        const entityType = isSubcontractor ? 'subcontractors' : 'vendors';
        alert(
          `Error pulling ${entityType}: ${result.error || 'Unknown error'}`
        );
      }
    } catch (error: any) {
      console.error('Pull from QuickBooks error:', error);
      const entityType = isSubcontractor ? 'subcontractors' : 'vendors';
      alert(`Error: ${error.message || `Failed to pull ${entityType}`}`);
    } finally {
      setPulling(false);
    }
  };

  if (!open) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>{label}</h3>
          <button onClick={onClose} style={styles.btnCancel}>
            Close
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 12,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={startAdd} style={styles.btnSave}>
              Add {companyType}
            </button>
            {(companyType === 'Subcontractor' ||
              companyType === 'Vendor' ||
              companyType === 'Contractor') && (
              <button
                onClick={pullFromQuickBooks}
                style={{
                  ...styles.btnSave,
                  background: colors.grayBlueDark,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                disabled={pulling}
              >
                <Download size={16} />
                {pulling ? 'Pulling...' : 'Pull from QuickBooks'}
              </button>
            )}
          </div>
          {companyType === 'Vendor' && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                fontSize: 14,
                color: colors.navy,
                fontWeight: 500,
              }}
            >
              <input
                type="checkbox"
                checked={showAllVendors}
                onChange={(e) => setShowAllVendors(e.target.checked)}
                style={{ cursor: 'pointer', width: 16, height: 16 }}
              />
              Show All
            </label>
          )}
        </div>

        {showForm && (
          <div style={styles.formContainer}>
            <div style={styles.formGrid}>
              <input
                placeholder="Company Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((s) => ({ ...s, name: e.target.value }))
                }
                style={styles.input}
                autoFocus
              />
              <div
                style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}
              >
                <button type="button" onClick={save} style={styles.btnSave}>
                  {editingId ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  style={styles.btnCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loadError && (
          <p style={{ color: colors.logoRed }}>Error: {loadError}</p>
        )}

        <div style={{ maxHeight: 720, overflowY: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.th}>Name</th>
                <th style={styles.thCenter}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: 20 }}>
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && companies.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: 20 }}>
                    No {companyType.toLowerCase()}s found. Click &quot;Add{' '}
                    {companyType}&quot; to create one.
                  </td>
                </tr>
              )}
              {companies.map((company) => {
                const inImportList = vendorImportList.has(
                  company.name.toLowerCase()
                );
                return (
                  <tr key={company.id} style={styles.tableRow}>
                    <td style={styles.td}>
                      {companyType === 'Vendor' && showAllVendors && (
                        <input
                          type="checkbox"
                          checked={inImportList}
                          onChange={() =>
                            toggleVendorImportList(company.name, !inImportList)
                          }
                          style={{ marginRight: 8, cursor: 'pointer' }}
                          title={
                            inImportList
                              ? 'Uncheck to hide from dropdowns'
                              : 'Check to show in dropdowns'
                          }
                        />
                      )}
                      {company.name}
                    </td>
                    <td style={styles.tdCenter}>
                      <button
                        onClick={() => startEdit(company)}
                        style={{
                          ...styles.btnSmall,
                          background: '#1e3a5f',
                          marginRight: 4,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Edit company"
                        aria-label="Edit company"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => remove(company.id)}
                        style={{
                          ...styles.btnSmall,
                          background: colors.logoRed,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Delete company"
                        aria-label="Delete company"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    background: '#f9fafb',
    borderRadius: 8,
    padding: 24,
    maxWidth: 800,
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: colors.navy,
  },
  formContainer: {
    background: '#f5f5f5',
    padding: 16,
    borderRadius: 4,
    marginBottom: 16,
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  input: {
    padding: 10,
    borderRadius: 4,
    border: `1px solid ${colors.border}`,
    fontSize: 14,
    width: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  headerRow: {
    background: colors.tableHeader,
    borderBottom: `2px solid ${colors.border}`,
  },
  th: {
    padding: 12,
    textAlign: 'left' as const,
    fontWeight: 600,
    color: colors.navy,
  },
  thCenter: {
    padding: 12,
    textAlign: 'center' as const,
    fontWeight: 600,
    color: colors.navy,
  },
  tableRow: {
    borderBottom: `1px solid ${colors.border}`,
  },
  td: {
    padding: 12,
    color: colors.navy,
  },
  tdCenter: {
    padding: 12,
    textAlign: 'center' as const,
  },
  btnSave: {
    padding: '8px 16px',
    background: colors.navy,
    color: 'white',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  btnCancel: {
    padding: '8px 16px',
    background: '#666',
    color: 'white',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  btnSmall: {
    padding: 6,
    color: 'white',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
  },
  badgeYes: {
    display: 'inline-block',
    padding: '4px 8px',
    background: '#22c55e',
    color: 'white',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
  },
  badgeNo: {
    display: 'inline-block',
    padding: '4px 8px',
    background: '#6b7280',
    color: 'white',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
  },
};
