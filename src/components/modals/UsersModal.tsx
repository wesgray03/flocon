import { supabase } from '@/lib/supabaseClient';
import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  user_type: string;
  auth_user_id: string | null;
}

interface UsersModalProps {
  open: boolean;
  onClose: () => void;
}

export function UsersModal({ open, onClose }: UsersModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    user_type: 'Owner' as 'Owner' | 'Admin' | 'Foreman',
  });

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, user_type, auth_user_id')
        .order('name', { ascending: true });

      if (error) {
        console.error('Users load error:', error.message ?? error);
        setLoadError(error.message ?? String(error));
        setUsers([]);
      } else {
        setUsers(data ?? []);
      }
    } catch (err) {
      console.error('Users load unexpected error:', err);
      setLoadError(String(err));
      setUsers([]);
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
    setFormData({ name: '', email: '', user_type: 'Owner' });
    setEditingId(null);
    setShowForm(false);
  };

  const startAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      user_type: user.user_type as 'Owner' | 'Admin' | 'Foreman',
    });
    setShowForm(true);
  };

  const save = async () => {
    const { name, email, user_type } = formData;
    if (!name.trim() || !email.trim()) {
      return alert('Name and email are required');
    }

    if (editingId) {
      const { error } = await supabase
        .from('users')
        .update({ name: name.trim(), email: email.trim(), user_type })
        .eq('id', editingId);
      if (error) return alert(`Update user error: ${error.message}`);
    } else {
      const { error } = await supabase
        .from('users')
        .insert([{ name: name.trim(), email: email.trim(), user_type }]);
      if (error) return alert(`Add user error: ${error.message}`);
    }

    resetForm();
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) return alert(`Delete user error: ${error.message}`);
    await load();
  };

  if (!open) return null;

  return (
    <div style={styles.overlay}>
      <div
        style={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="users-title"
      >
        <div style={styles.header}>
          <h3 id="users-title" style={styles.title}>
            Users
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={styles.btnCancel}
            aria-label="Close Users"
          >
            Close
          </button>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={startAdd}
            style={{ ...styles.btnSave, marginBottom: 16 }}
          >
            + Add User
          </button>
        )}

        {showForm && (
          <div style={styles.formContainer}>
            <h4 style={styles.formTitle}>
              {editingId ? 'Edit User' : 'New User'}
            </h4>
            <div style={styles.formFields}>
              <input
                placeholder="Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                style={styles.input}
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                style={styles.input}
              />
              <select
                value={formData.user_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    user_type: e.target.value as 'Owner' | 'Admin' | 'Foreman',
                  })
                }
                style={styles.input}
              >
                <option value="Owner">Owner</option>
                <option value="Admin">Admin</option>
                <option value="Foreman">Foreman</option>
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
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

        {loading && <p style={{ color: '#64748b' }}>Loading...</p>}
        {loadError && <p style={{ color: '#ef4444' }}>Error: {loadError}</p>}

        <div style={{ maxHeight: 720, overflowY: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.thCenter}>Type</th>
                <th style={styles.thCenter}>Auth Status</th>
                <th style={styles.thCenter}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={styles.tableRow}>
                  <td style={styles.td}>{user.name}</td>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.tdCenter}>
                    <span style={getUserTypeBadgeStyle(user.user_type)}>
                      {user.user_type}
                    </span>
                  </td>
                  <td style={styles.tdCenter}>
                    <span style={getAuthStatusBadgeStyle(user.auth_user_id)}>
                      {user.auth_user_id ? 'Linked' : 'Not Linked'}
                    </span>
                  </td>
                  <td style={styles.tdCenter}>
                    <button
                      onClick={() => startEdit(user)}
                      style={{
                        ...styles.btnSmall,
                        background: '#3b82f6',
                        marginRight: 4,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Edit user"
                      aria-label="Edit user"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => remove(user.id)}
                      style={{
                        ...styles.btnSmall,
                        background: '#ef4444',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Delete user"
                      aria-label="Delete user"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && !loading && (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>
              No users found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getUserTypeBadgeStyle(userType: string): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
  };

  if (userType === 'Owner') {
    return { ...baseStyle, background: '#dbeafe', color: '#1e40af' };
  } else if (userType === 'Admin') {
    return { ...baseStyle, background: '#ede9fe', color: '#5b21b6' };
  } else {
    return { ...baseStyle, background: '#fed7aa', color: '#9a3412' };
  }
}

function getAuthStatusBadgeStyle(
  authUserId: string | null
): React.CSSProperties {
  return {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
    background: authUserId ? '#e8f0d4' : '#fee2e2',
    color: authUserId ? '#166534' : '#991b1b',
  };
}

// Styles
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
    marginBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
  },
  formContainer: {
    background: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    border: '1px solid #e2e8f0',
  },
  formTitle: {
    margin: '0 0 12px 0',
    fontSize: 16,
  },
  formFields: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  input: {
    padding: 8,
    border: '1px solid #e5e7eb',
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
    background: '#2563eb',
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
    borderBottom: '2px solid #e2e8f0',
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
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
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
