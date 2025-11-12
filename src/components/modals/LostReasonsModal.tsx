import { supabase } from '@/lib/supabaseClient';
import { colors } from '@/styles/theme';
import { MoveDown, MoveUp, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LostReason {
  id: string;
  reason: string;
  description: string | null;
  is_active: boolean;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

interface LostReasonsModalProps {
  open: boolean;
  onClose: () => void;
}

export function LostReasonsModal({ open, onClose }: LostReasonsModalProps) {
  const [reasons, setReasons] = useState<LostReason[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    is_active: true,
  });

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('lost_reasons')
        .select('*')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('reason', { ascending: true });

      if (error) {
        console.error('Lost reasons load error:', error.message ?? error);
        setLoadError(error.message ?? String(error));
        setReasons([]);
      } else {
        setReasons(data ?? []);
      }
    } catch (err) {
      console.error('Lost reasons load unexpected error:', err);
      setLoadError(String(err));
      setReasons([]);
    } finally {
      setLoading(false);
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
    setFormData({ reason: '', description: '', is_active: true });
    setEditingId(null);
    setShowForm(false);
  };

  const startAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (reason: LostReason) => {
    setEditingId(reason.id);
    setFormData({
      reason: reason.reason,
      description: reason.description || '',
      is_active: reason.is_active,
    });
    setShowForm(true);
  };

  const save = async () => {
    const { reason, description, is_active } = formData;
    if (!reason.trim()) {
      return alert('Reason is required');
    }

    if (editingId) {
      const { error } = await supabase
        .from('lost_reasons')
        .update({
          reason: reason.trim(),
          description: description.trim() || null,
          is_active,
        })
        .eq('id', editingId);
      if (error) return alert(`Update lost reason error: ${error.message}`);
    } else {
      // Get the next display order
      const maxOrder =
        reasons.reduce((max, r) => Math.max(max, r.display_order || 0), 0) + 1;

      const { error } = await supabase.from('lost_reasons').insert([
        {
          reason: reason.trim(),
          description: description.trim() || null,
          is_active,
          display_order: maxOrder,
        },
      ]);
      if (error) return alert(`Add lost reason error: ${error.message}`);
    }

    resetForm();
    await load();
  };

  const remove = async (id: string) => {
    // Check if this reason is being used
    const { data: usageData } = await supabase
      .from('engagements')
      .select('id')
      .eq('lost_reason_id', id)
      .limit(1);

    if (usageData && usageData.length > 0) {
      return alert(
        'Cannot delete this reason because it is being used by engagements. You can deactivate it instead.'
      );
    }

    if (!confirm('Delete this lost reason?')) return;
    const { error } = await supabase.from('lost_reasons').delete().eq('id', id);
    if (error) return alert(`Delete lost reason error: ${error.message}`);
    await load();
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const current = reasons[index];
    const previous = reasons[index - 1];

    // Swap display orders
    await supabase
      .from('lost_reasons')
      .update({ display_order: previous.display_order })
      .eq('id', current.id);

    await supabase
      .from('lost_reasons')
      .update({ display_order: current.display_order })
      .eq('id', previous.id);

    await load();
  };

  const moveDown = async (index: number) => {
    if (index === reasons.length - 1) return;
    const current = reasons[index];
    const next = reasons[index + 1];

    // Swap display orders
    await supabase
      .from('lost_reasons')
      .update({ display_order: next.display_order })
      .eq('id', current.id);

    await supabase
      .from('lost_reasons')
      .update({ display_order: current.display_order })
      .eq('id', next.id);

    await load();
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('lost_reasons')
      .update({ is_active: !currentActive })
      .eq('id', id);
    if (error) return alert(`Toggle active error: ${error.message}`);
    await load();
  };

  if (!open) return null;

  return (
    <div style={styles.overlay}>
      <div
        style={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lost-reasons-title"
      >
        <div style={styles.header}>
          <h3 id="lost-reasons-title" style={styles.title}>
            Lost Reasons
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={styles.btnCancel}
            aria-label="Close Lost Reasons"
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
            + Add Lost Reason
          </button>
        )}

        {loading && (
          <p style={{ textAlign: 'center', color: colors.textSecondary }}>
            Loading...
          </p>
        )}
        {loadError && (
          <p style={{ color: colors.errorText, marginBottom: 12 }}>
            {loadError}
          </p>
        )}

        {showForm && (
          <div style={styles.formContainer}>
            <h4 style={styles.formTitle}>
              {editingId ? 'Edit Lost Reason' : 'Add Lost Reason'}
            </h4>
            <div style={styles.field}>
              <label htmlFor="reason" style={styles.label}>
                Reason *
              </label>
              <input
                id="reason"
                type="text"
                value={formData.reason}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, reason: e.target.value }))
                }
                style={styles.input}
                placeholder="e.g., Price Too High"
              />
            </div>

            <div style={styles.field}>
              <label htmlFor="description" style={styles.label}>
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                style={{ ...styles.input, minHeight: 80 }}
                placeholder="Optional detailed description"
              />
            </div>

            <div style={styles.field}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_active: e.target.checked,
                    }))
                  }
                />
                <span style={styles.label}>Active</span>
              </label>
            </div>

            <div style={styles.formActions}>
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
        )}

        {!showForm && !loading && reasons.length === 0 && (
          <p style={{ textAlign: 'center', color: colors.textSecondary }}>
            No lost reasons yet
          </p>
        )}

        {!showForm && reasons.length > 0 && (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: 60 }}>Order</th>
                  <th style={styles.th}>Reason</th>
                  <th style={styles.th}>Description</th>
                  <th style={{ ...styles.th, width: 80 }}>Status</th>
                  <th style={{ ...styles.th, width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reasons.map((reason, index) => (
                  <tr
                    key={reason.id}
                    style={{
                      ...styles.tr,
                      opacity: reason.is_active ? 1 : 0.5,
                    }}
                  >
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          style={{
                            ...styles.iconBtn,
                            opacity: index === 0 ? 0.3 : 1,
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                          }}
                          title="Move up"
                        >
                          <MoveUp size={14} />
                        </button>
                        <button
                          onClick={() => moveDown(index)}
                          disabled={index === reasons.length - 1}
                          style={{
                            ...styles.iconBtn,
                            opacity: index === reasons.length - 1 ? 0.3 : 1,
                            cursor:
                              index === reasons.length - 1
                                ? 'not-allowed'
                                : 'pointer',
                          }}
                          title="Move down"
                        >
                          <MoveDown size={14} />
                        </button>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <strong>{reason.reason}</strong>
                    </td>
                    <td style={styles.td}>
                      {reason.description || (
                        <span style={{ color: colors.textSecondary }}>—</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() =>
                          toggleActive(reason.id, reason.is_active)
                        }
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: reason.is_active
                            ? colors.grayBlueDark
                            : colors.border,
                          color: reason.is_active
                            ? 'white'
                            : colors.textSecondary,
                        }}
                      >
                        {reason.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => startEdit(reason)}
                          style={styles.iconBtn}
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => remove(reason.id)}
                          style={{ ...styles.iconBtn, color: colors.logoRed }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: 8,
    width: '90%',
    maxWidth: 900,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  header: {
    padding: 20,
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  formContainer: {
    padding: 20,
    borderBottom: `1px solid ${colors.border}`,
  },
  formTitle: {
    margin: '0 0 16px 0',
    fontSize: 16,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    marginBottom: 6,
    fontSize: 14,
    fontWeight: 500,
    color: colors.textPrimary,
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: 14,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    backgroundColor: colors.white,
    color: colors.textPrimary,
  },
  formActions: {
    display: 'flex',
    gap: 12,
    marginTop: 20,
  },
  btnSave: {
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    color: 'white',
    backgroundColor: colors.navy,
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  btnCancel: {
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    color: colors.textPrimary,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    cursor: 'pointer',
  },
  tableContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: 20,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: 12,
    textAlign: 'left',
    fontSize: 13,
    fontWeight: 600,
    color: colors.textSecondary,
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.tableHeader,
  },
  tr: {
    borderBottom: `1px solid ${colors.grayLight}`,
  },
  td: {
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  iconBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: colors.textSecondary,
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 500,
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
  },
};
