import { supabase } from '@/lib/supabaseClient';
import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  contact_type: string;
  customer_id: string | null;
  customer_name?: string;
}

interface Customer {
  id: string;
  name: string;
}

interface ContactsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ContactsModal({ open, onClose }: ContactsModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contact_type: 'Project Manager' as
      | 'Project Manager'
      | 'Superintendent'
      | 'Estimator'
      | 'Accounting'
      | 'Other',
    customer_id: '',
  });

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [contactsRes, customersRes] = await Promise.all([
        supabase
          .from('contacts')
          .select(
            'id, name, email, phone, contact_type, customer_id, customers(name)'
          )
          .order('name', { ascending: true }),
        supabase
          .from('customers')
          .select('id, name')
          .order('name', { ascending: true }),
      ]);

      if (contactsRes.error) throw contactsRes.error;
      if (customersRes.error) throw customersRes.error;

      const contactsData = (contactsRes.data ?? []).map((c: any) => ({
        ...c,
        customer_name: c.customers?.name ?? null,
      }));

      setContacts(contactsData);
      setCustomers(customersRes.data ?? []);
    } catch (err: any) {
      console.error('Contacts load error:', err);
      setLoadError(err?.message ?? String(err));
      setContacts([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      customer_id: '',
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
      contact_type: contact.contact_type as any,
      customer_id: contact.customer_id || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    const { name, email, contact_type, customer_id } = formData;
    if (!name.trim() || !email.trim()) {
      return alert('Name and email are required');
    }

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: formData.phone.trim() || null,
        contact_type,
        customer_id: customer_id || null,
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
    } catch (err: any) {
      alert(`Save contact error: ${err?.message ?? err}`);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
      await load();
    } catch (err: any) {
      alert(`Delete contact error: ${err?.message ?? err}`);
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
                    contact_type: e.target.value as any,
                  }))
                }
                style={styles.input}
              >
                <option value="Project Manager">Project Manager</option>
                <option value="Superintendent">Superintendent</option>
                <option value="Estimator">Estimator</option>
                <option value="Accounting">Accounting</option>
                <option value="Other">Other</option>
              </select>
              <select
                value={formData.customer_id}
                onChange={(e) =>
                  setFormData((s) => ({ ...s, customer_id: e.target.value }))
                }
                style={styles.input}
              >
                <option value="">Unassigned customer…</option>
                {customers.map((c) => (
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

        {loadError && <p style={{ color: '#c8102e' }}>Error: {loadError}</p>}

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
                    <span
                      style={getContactTypeBadgeStyle(contact.contact_type)}
                    >
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
                        background: '#c8102e',
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

function getContactTypeBadgeStyle(type: string): React.CSSProperties {
  return {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
    background: '#d4f0e8',
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
    maxWidth: 1400,
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
    color: '#0f172a',
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
