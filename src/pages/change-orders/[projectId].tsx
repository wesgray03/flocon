// pages/change-orders/[projectId].tsx
import { supabase } from '@/lib/supabaseClient';
import { colors } from '@/styles/theme';
import { Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type ChangeOrder = {
  id: string;
  engagement_id: string;
  current_status: 'Open' | 'Authorized' | 'Issued' | 'Closed';
  description: string;
  notes: string | null;
  date_requested: string;
  date_authorized: string | null;
  date_issued: string | null;
  amount: number;
  customer_co_number: string | null;
  created_at: string;
  updated_at: string;
};

type Project = {
  id: string;
  name: string;
  contract_amount: number | null;
};

export default function ChangeOrdersPage() {
  const router = useRouter();
  const rawId = router.query.projectId;
  const projectId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [project, setProject] = useState<Project | null>(null);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCO, setEditingCO] = useState<ChangeOrder | null>(null);

  const [form, setForm] = useState({
    current_status: 'Open' as 'Open' | 'Authorized' | 'Issued' | 'Closed',
    description: '',
    amount: '',
    customer_co_number: '',
    notes: '',
  });

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      setLoading(true);

      // Load project info
      const { data: proj, error: projErr } = await supabase
        .from('engagements')
        .select('id,name,contract_amount')
        .eq('id', projectId)
        .single();

      if (projErr) {
        console.error(projErr);
        setProject(null);
      } else {
        setProject(proj as Project);
      }

      // Load change orders
      const { data: cos, error: cosErr } = await supabase
        .from('engagement_change_orders')
        .select('*')
        .eq('engagement_id', projectId)
        .eq('deleted', false)
        .order('date_requested', { ascending: false });

      if (cosErr) {
        console.error(cosErr);
        setChangeOrders([]);
      } else {
        setChangeOrders((cos ?? []) as ChangeOrder[]);
      }

      setLoading(false);
    };

    load();
  }, [projectId]);

  // Close modal on Escape
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showModal]);

  const money = (n: number | null | undefined) =>
    n == null
      ? '—'
      : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const dateStr = (d: string | null) =>
    d ? new Date(d).toLocaleDateString() : '—';

  const totalAmount = useMemo(() => {
    return changeOrders.reduce((sum, co) => sum + (co.amount ?? 0), 0);
  }, [changeOrders]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const openForNew = () => {
    setEditingCO(null);
    setForm({
      current_status: 'Open',
      description: '',
      amount: '',
      customer_co_number: '',
      notes: '',
    });
    setShowModal(true);
  };

  const openForEdit = (co: ChangeOrder) => {
    setEditingCO(co);
    setForm({
      current_status: co.current_status,
      description: co.description,
      amount: co.amount.toString(),
      customer_co_number: co.customer_co_number || '',
      notes: co.notes || '',
    });
    setShowModal(true);
  };

  const saveCO = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return alert('Description is required');
    if (!projectId) return;

    setSaving(true);
    try {
      const payload = {
        engagement_id: projectId,
        current_status: form.current_status,
        description: form.description.trim(),
        amount: Number(form.amount) || 0,
        customer_co_number: form.customer_co_number.trim() || null,
        notes: form.notes.trim() || null,
      };

      let error = null;
      if (editingCO) {
        const { error: err } = await supabase
          .from('engagement_change_orders')
          .update(payload)
          .eq('id', editingCO.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('engagement_change_orders')
          .insert([payload]);
        error = err;
      }

      if (error) {
        alert('Error saving change order: ' + error.message);
      } else {
        setShowModal(false);
        // Reload change orders
        const { data: cos } = await supabase
          .from('engagement_change_orders')
          .select('*')
          .eq('engagement_id', projectId)
          .eq('deleted', false)
          .order('date_requested', { ascending: false });
        setChangeOrders((cos ?? []) as ChangeOrder[]);
      }
    } catch (err) {
      console.error('Unexpected error saving change order:', err);
      alert('Unexpected error saving change order. See console for details.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCO = async (id: string) => {
    if (!confirm('Delete this change order?')) return;

    const { error } = await supabase
      .from('engagement_change_orders')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting change order: ' + error.message);
    } else {
      setChangeOrders((prev) => prev.filter((co) => co.id !== id));
    }
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#f0ebe3',
        padding: 24,
        fontFamily: 'system-ui',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => router.push('/projects')}
          style={{
            background: 'none',
            border: 'none',
            color: colors.navy,
            cursor: 'pointer',
            fontSize: 14,
            padding: 0,
          }}
        >
          ← Back to Projects
        </button>
      </div>

      {loading ? (
        <p style={{ color: colors.textSecondary }}>Loading…</p>
      ) : !project ? (
        <p style={{ color: colors.textSecondary }}>Project not found.</p>
      ) : (
        <>
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5dfd5',
              borderRadius: 12,
              padding: 24,
              marginBottom: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
              Change Orders
            </h1>
            <p style={{ color: colors.textSecondary, marginBottom: 0 }}>
              Project: <strong>{project.name}</strong>
            </p>
          </div>

          <div
            style={{
              background: '#fff',
              border: '1px solid #e5dfd5',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                  Change Orders ({changeOrders.length})
                </h2>
                <p
                  style={{
                    color: colors.textSecondary,
                    fontSize: 14,
                    marginTop: 4,
                  }}
                >
                  Total: {money(totalAmount)}
                </p>
              </div>
              <button
                type="button"
                onClick={openForNew}
                style={{
                  background: '#1e3a5f',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                + New Change Order
              </button>
            </div>

            {changeOrders.length === 0 ? (
              <p
                style={{
                  color: colors.textSecondary,
                  textAlign: 'center',
                  padding: 24,
                }}
              >
                No change orders yet. Click &quot;+ New Change Order&quot; to
                add one.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    fontSize: 14,
                    borderCollapse: 'collapse',
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f0ebe3' }}>
                      <th style={th}>Status</th>
                      <th style={th}>Description</th>
                      <th style={thRight}>Amount</th>
                      <th style={th}>Customer CO #</th>
                      <th style={th}>Date Requested</th>
                      <th style={th}>Date Authorized</th>
                      <th style={thCenter}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changeOrders.map((co) => (
                      <tr key={co.id}>
                        <td style={td}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 500,
                              background:
                                co.current_status === 'Closed'
                                  ? '#e0e7ee'
                                  : co.current_status === 'Authorized'
                                    ? '#d1fae5'
                                    : co.current_status === 'Issued'
                                      ? '#fef3c7'
                                      : '#ebe5db',
                              border:
                                co.current_status === 'Closed'
                                  ? '1px solid #64748b'
                                  : co.current_status === 'Authorized'
                                    ? '1px solid #34d399'
                                    : co.current_status === 'Issued'
                                      ? '1px solid #fde68a'
                                      : '1px solid #d6d3d1',
                              color:
                                co.current_status === 'Closed'
                                  ? '#475569'
                                  : co.current_status === 'Authorized'
                                    ? '#065f46'
                                    : co.current_status === 'Issued'
                                      ? '#854d0e'
                                      : '#78716c',
                            }}
                          >
                            {co.current_status}
                          </span>
                        </td>
                        <td style={td}>{co.description}</td>
                        <td style={tdRight}>{money(co.amount)}</td>
                        <td style={td}>{co.customer_co_number ?? '—'}</td>
                        <td style={td}>{dateStr(co.date_requested)}</td>
                        <td style={td}>{dateStr(co.date_authorized)}</td>
                        <td style={tdCenter}>
                          <button
                            type="button"
                            onClick={() => openForEdit(co)}
                            style={{
                              ...btnSmall,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Edit change order"
                            aria-label="Edit change order"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCO(co.id)}
                            style={{
                              ...btnSmall,
                              marginLeft: 8,
                              background: '#fee2e2',
                              color: colors.errorText,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Delete change order"
                            aria-label="Delete change order"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div style={overlay}>
          <div
            style={modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="co-modal-title"
          >
            <h2
              id="co-modal-title"
              style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}
            >
              {editingCO ? 'Edit Change Order' : 'New Change Order'}
            </h2>
            <form onSubmit={saveCO}>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <div>
                  <label
                    htmlFor="current_status"
                    style={{
                      fontSize: 12,
                      color: '#6b5e50',
                      marginBottom: 4,
                      display: 'block',
                      fontWeight: 500,
                    }}
                  >
                    Status *
                  </label>
                  <select
                    id="current_status"
                    name="current_status"
                    value={form.current_status}
                    onChange={handleChange}
                    style={input}
                    required
                  >
                    <option value="Open">Open</option>
                    <option value="Authorized">Authorized</option>
                    <option value="Issued">Issued</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="description"
                    style={{
                      fontSize: 12,
                      color: '#6b5e50',
                      marginBottom: 4,
                      display: 'block',
                      fontWeight: 500,
                    }}
                  >
                    Description *
                  </label>
                  <input
                    id="description"
                    name="description"
                    placeholder="Description"
                    value={form.description}
                    onChange={handleChange}
                    style={input}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="amount"
                    style={{
                      fontSize: 12,
                      color: '#6b5e50',
                      marginBottom: 4,
                      display: 'block',
                      fontWeight: 500,
                    }}
                  >
                    Amount
                  </label>
                  <input
                    id="amount"
                    name="amount"
                    placeholder="Amount"
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={handleChange}
                    style={input}
                  />
                </div>
                <div>
                  <label
                    htmlFor="customer_co_number"
                    style={{
                      fontSize: 12,
                      color: '#6b5e50',
                      marginBottom: 4,
                      display: 'block',
                      fontWeight: 500,
                    }}
                  >
                    Customer CO Number
                  </label>
                  <input
                    id="customer_co_number"
                    name="customer_co_number"
                    placeholder="Customer CO Number"
                    value={form.customer_co_number}
                    onChange={handleChange}
                    style={input}
                  />
                </div>
                <div>
                  <label
                    htmlFor="notes"
                    style={{
                      fontSize: 12,
                      color: '#6b5e50',
                      marginBottom: 4,
                      display: 'block',
                      fontWeight: 500,
                    }}
                  >
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    placeholder="Notes"
                    value={form.notes}
                    onChange={handleChange}
                    style={{ ...input, minHeight: 80, fontFamily: 'system-ui' }}
                  />
                </div>
              </div>
              <div
                style={{
                  marginTop: 20,
                  display: 'flex',
                  gap: 8,
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={btnCancel}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={btnSave}>
                  {saving ? 'Saving…' : editingCO ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Styles ------------------------------ */
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: 8,
  borderBottom: '1px solid #e5dfd5',
  whiteSpace: 'nowrap',
  fontWeight: 600,
};
const thRight: React.CSSProperties = { ...th, textAlign: 'right' };
const thCenter: React.CSSProperties = { ...th, textAlign: 'center' };

const td: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #e5dfd5',
  whiteSpace: 'nowrap',
};
const tdRight: React.CSSProperties = { ...td, textAlign: 'right' };
const tdCenter: React.CSSProperties = { ...td, textAlign: 'center' };

const overlay: React.CSSProperties = {
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

const modal: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 24,
  maxWidth: 500,
  width: '90%',
  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
};

const input: React.CSSProperties = {
  padding: 8,
  border: '1px solid #e5dfd5',
  borderRadius: 6,
  width: '100%',
  fontSize: 14,
};

const btnCancel: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 14,
};

const btnSave: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  background: '#1e3a5f',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
};

const btnSmall: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 12,
  background: '#0f172a',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};
