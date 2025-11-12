import { supabase } from '@/lib/supabaseClient';
import { colors } from '@/styles/theme';
import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type ContactType =
  | 'Project Manager'
  | 'Superintendent'
  | 'Estimator'
  | 'Accounting'
  | 'Architect';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  contact_type: ContactType;
  company_id: string | null;
  customer_name?: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface ContactsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ContactsModal({ open, onClose }: ContactsModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    contact_type: ContactType;
    company_id: string;
  }>({
    name: '',
    email: '',
    phone: '',
    contact_type: 'Project Manager',
    company_id: '',
  });

  const load = async () => {
    setLoadError(null);
    try {
      const [contactsRes, companiesRes] = await Promise.all([
        supabase
          .from('contacts')
          .select('id, name, email, phone, contact_type, company_id')
          .order('name', { ascending: true }),
        supabase
          .from('companies')
          .select('id, name')
          .order('name', { ascending: true }),
      ]);

      if (contactsRes.error) throw contactsRes.error;
      if (companiesRes.error) throw companiesRes.error;

      // Create a map of company IDs to names
      const companyMap = new Map<string, string>(
        (companiesRes.data ?? []).map((c: Company) => [c.id, c.name])
      );

      const contactsData: Contact[] = (contactsRes.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        contact_type: c.contact_type as ContactType,
        company_id: c.company_id,
        customer_name: c.company_id
          ? (companyMap.get(c.company_id) ?? null)
          : null,
      }));

      setContacts(contactsData);
      setCompanies(companiesRes.data ?? []);
    } catch (err: unknown) {
      console.error('Contacts load error:', err);
      const message = err instanceof Error ? err.message : String(err);
      setLoadError(message);
      setCompanies([]);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

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
      email: '',
      phone: '',
      contact_type: 'Project Manager',
      company_id: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone || '',
      contact_type: contact.contact_type,
      company_id: contact.company_id || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    const { name, email, contact_type, company_id } = formData;
    if (!name.trim() || !email.trim()) {
      return alert('Name and email are required');
    }
    if (!company_id) {
      return alert('Company is required');
    }

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: formData.phone.trim() || null,
        contact_type,
        company_id: company_id,
      };

      if (editingId) {
        const { error } = await supabase
          .from('contacts')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('contacts').insert([payload]);
        if (error) throw error;
      }
      await load();
      resetForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Save contact error: ${message}`);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    try {
      // Guard: block deleting a contact referenced by any engagement
      const { count, error: usageErr } = await supabase
        .from('engagement_parties')
        .select('id', { count: 'exact', head: true })
        .eq('party_type', 'contact')
        .eq('party_id', id);
      if (usageErr) throw usageErr;
      if ((count ?? 0) > 0) {
        alert(
          'Cannot delete this contact because it is linked to one or more engagements. Remove those links first.'
        );
        return;
      }

      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Delete contact error: ${message}`);
    }
  };

  if (!open) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Contacts</h3>
          <button onClick={onClose} style={styles.btnCancel}>
            Close
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={startAdd} style={styles.btnSave}>
            Add Contact
          </button>
        </div>

        {showForm && (
          <div style={styles.formContainer}>
            <div style={styles.formGrid}>
              <input
                placeholder="Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((s) => ({ ...s, name: e.target.value }))
                }
                style={styles.input}
              />
              <input
                placeholder="Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((s) => ({ ...s, email: e.target.value }))
                }
                style={styles.input}
              />
              <input
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((s) => ({ ...s, phone: e.target.value }))
                }
                style={styles.input}
              />
              <select
                value={formData.contact_type}
                onChange={(e) =>
                  setFormData((s) => ({
                    ...s,
                    contact_type: e.target.value as ContactType,
                  }))
                }
                style={styles.input}
              >
                <option value="Project Manager">Project Manager</option>
                <option value="Superintendent">Superintendent</option>
                <option value="Estimator">Estimator</option>
                <option value="Accounting">Accounting</option>
                <option value="Architect">Architect</option>
              </select>
              <select
                value={formData.company_id}
                onChange={(e) =>
                  setFormData((s) => ({ ...s, company_id: e.target.value }))
                }
                style={styles.input}
                required
              >
                <option value="">-- Select Company (Required) --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.thCenter}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} style={styles.tableRow}>
                  <td style={styles.td}>{contact.name}</td>
                  <td style={styles.td}>{contact.email}</td>
                  <td style={styles.td}>{contact.phone || '—'}</td>
                  <td style={styles.td}>
                    <span style={getContactTypeBadgeStyle()}>
                      {contact.contact_type}
                    </span>
                  </td>
                  <td style={styles.td}>{contact.customer_name || '—'}</td>
                  <td style={styles.tdCenter}>
                    <button
                      onClick={() => startEdit(contact)}
                      style={{
                        ...styles.btnSmall,
                        background: '#1e3a5f',
                        marginRight: 4,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Edit contact"
                      aria-label="Edit contact"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => remove(contact.id)}
                      style={{
                        ...styles.btnSmall,
                        background: colors.logoRed,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Delete contact"
                      aria-label="Delete contact"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getContactTypeBadgeStyle(): React.CSSProperties {
  return {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
    background: '#e0e7ee',
    color: '#1e40af',
  };
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 1200,
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    margin: 0,
    fontSize: 18,
    color: colors.textPrimary,
  },
  formContainer: {
    border: '1px solid #e5dfd5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    background: '#faf8f5',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    padding: 8,
    border: '1px solid #e5dfd5',
    borderRadius: 6,
    width: '100%',
  },
  btnCancel: {
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    background: '#fff',
    cursor: 'pointer',
  },
  btnSave: {
    padding: '8px 12px',
    borderRadius: 6,
    background: '#1e3a5f',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
  },
  btnSmall: {
    padding: '4px 8px',
    fontSize: 12,
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  headerRow: {
    borderBottom: '2px solid #e5dfd5',
  },
  th: {
    padding: 8,
    textAlign: 'left' as const,
    fontSize: 13,
    fontWeight: 600,
  },
  thCenter: {
    padding: 8,
    textAlign: 'center' as const,
    fontSize: 13,
    fontWeight: 600,
    width: 120,
  },
  tableRow: {
    borderBottom: '1px solid #e5dfd5',
  },
  td: {
    padding: 8,
    textAlign: 'left' as const,
  },
  tdCenter: {
    padding: '8px 4px',
    textAlign: 'center' as const,
  },
};
