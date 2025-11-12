// components/project/ChangeOrdersSection.tsx
import { todayString } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import { colors } from '@/styles/theme';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

type ChangeOrder = {
  id: string;
  engagement_id: string;
  current_status: 'Open' | 'Authorized' | 'Issued' | 'Closed';
  description: string;
  notes: string | null;
  date_requested: string | null;
  date_authorized: string | null;
  date_issued: string | null;
  amount: number; // This is sales amount (customer-facing)
  budget_amount: number | null;
  customer_co_number: string | null;
  created_at: string;
  updated_at: string;
};

type ChangeOrdersSectionProps = {
  projectId: string;
};

export default function ChangeOrdersSection({
  projectId,
}: ChangeOrdersSectionProps) {
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCO, setEditingCO] = useState<ChangeOrder | null>(null);
  const [form, setForm] = useState({
    current_status: 'Open' as 'Open' | 'Authorized' | 'Issued' | 'Closed',
    description: '',
    amount: '', // Sales amount
    budget_amount: '',
    customer_co_number: '',
    notes: '',
    date_authorized: '',
    date_issued: '',
  });

  useEffect(() => {
    loadChangeOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadChangeOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('engagement_change_orders')
      .select('*')
      .eq('engagement_id', projectId)
      .eq('deleted', false)
      .order('date_requested', { ascending: false });

    if (error) {
      console.error('Error loading change orders:', error);
    } else {
      setChangeOrders((data ?? []) as ChangeOrder[]);
    }
    setLoading(false);
  };

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
      budget_amount: '',
      customer_co_number: '',
      notes: '',
      date_authorized: '',
      date_issued: '',
    });
    setShowModal(true);
  };

  const openForEdit = (co: ChangeOrder) => {
    setEditingCO(co);

    // Convert dates to YYYY-MM-DD format for date inputs using UTC to avoid timezone issues
    const formatDateUTC = (dateStr: string | null) => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (e) {
        console.error('Error parsing date:', e);
        return '';
      }
    };

    setForm({
      current_status: co.current_status,
      description: co.description,
      amount: String(co.amount || 0),
      budget_amount: String(co.budget_amount || 0),
      customer_co_number: co.customer_co_number || '',
      notes: co.notes || '',
      date_authorized: formatDateUTC(co.date_authorized),
      date_issued: formatDateUTC(co.date_issued),
    });
    setShowModal(true);
  };

  const saveCO = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return alert('Description is required');

    setSaving(true);
    try {
      // Auto-populate dates based on status if not provided (new CO only)
      let dateAuthorized = form.date_authorized || null;
      let dateIssued = form.date_issued || null;

      const today = todayString();

      if (!editingCO) {
        // New change order - auto-populate dates based on status
        if (form.current_status === 'Authorized' && !dateAuthorized) {
          dateAuthorized = today;
        }
        if (
          (form.current_status === 'Issued' ||
            form.current_status === 'Closed') &&
          !dateIssued
        ) {
          dateIssued = today;
        }
      }

      const payload: {
        engagement_id: string;
        current_status: ChangeOrder['current_status'];
        description: string;
        amount: number;
        budget_amount: number | null;
        customer_co_number: string | null;
        notes: string | null;
        date_authorized?: string;
        date_issued?: string;
      } = {
        engagement_id: projectId,
        current_status: form.current_status,
        description: form.description.trim(),
        amount: Number(form.amount) || 0,
        budget_amount: Number(form.budget_amount) || null,
        customer_co_number: form.customer_co_number.trim() || null,
        notes: form.notes.trim() || null,
      };

      // Include dates in payload if provided
      if (dateAuthorized) {
        payload.date_authorized = dateAuthorized;
      }
      if (dateIssued) {
        payload.date_issued = dateIssued;
      }

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
        loadChangeOrders();
      }
    } catch (err) {
      console.error('Unexpected error saving change order:', err);
      alert('Unexpected error saving change order. See console for details.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCO = async (id: string) => {
    if (!confirm('Are you sure you want to delete this change order?')) return;

    const { error } = await supabase
      .from('engagement_change_orders')
      .update({ deleted: true })
      .eq('id', id);

    if (error) {
      alert('Error deleting change order: ' + error.message);
    } else {
      setChangeOrders((prev) => prev.filter((co) => co.id !== id));
    }
  };

  const money = (n: number | null | undefined) =>
    n == null
      ? '—'
      : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const dateStr = (d: string | null | undefined) => {
    if (!d) return '—';
    try {
      const date = new Date(d);
      // Use UTC to avoid timezone issues
      const month = date.getUTCMonth() + 1;
      const day = date.getUTCDate();
      const year = date.getUTCFullYear();
      return `${month}/${day}/${year}`;
    } catch {
      return '—';
    }
  };

  const totalAmount = changeOrders.reduce(
    (sum, co) => sum + (co.amount ?? 0),
    0
  );

  const totalBudgetAmount = changeOrders.reduce(
    (sum, co) => sum + (co.budget_amount ?? 0),
    0
  );

  const statusTotals = {
    Open: changeOrders
      .filter((co) => co.current_status === 'Open')
      .reduce((sum, co) => sum + (co.amount ?? 0), 0),
    Authorized: changeOrders
      .filter((co) => co.current_status === 'Authorized')
      .reduce((sum, co) => sum + (co.amount ?? 0), 0),
    Issued: changeOrders
      .filter((co) => co.current_status === 'Issued')
      .reduce((sum, co) => sum + (co.amount ?? 0), 0),
    Closed: changeOrders
      .filter((co) => co.current_status === 'Closed')
      .reduce((sum, co) => sum + (co.amount ?? 0), 0),
  };

  const budgetTotals = {
    Open: changeOrders
      .filter((co) => co.current_status === 'Open')
      .reduce((sum, co) => sum + (co.budget_amount ?? 0), 0),
    Authorized: changeOrders
      .filter((co) => co.current_status === 'Authorized')
      .reduce((sum, co) => sum + (co.budget_amount ?? 0), 0),
    Issued: changeOrders
      .filter((co) => co.current_status === 'Issued')
      .reduce((sum, co) => sum + (co.budget_amount ?? 0), 0),
    Closed: changeOrders
      .filter((co) => co.current_status === 'Closed')
      .reduce((sum, co) => sum + (co.budget_amount ?? 0), 0),
  };

  if (loading) {
    return (
      <div style={{ padding: 24, color: colors.textSecondary }}>
        Loading change orders…
      </div>
    );
  }

  return (
    <div style={cardStyle}>
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
              marginBottom: 2,
            }}
          >
            Sales Amount Total: {money(totalAmount)}
          </p>
          <p
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              marginTop: 0,
            }}
          >
            Budget Amount Total: {money(totalBudgetAmount)}
          </p>
        </div>
        <button
          type="button"
          onClick={openForNew}
          style={{
            background: '#1e3a5f',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Add change order"
          aria-label="Add change order"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Status Totals */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: 12,
            background: '#fff',
            border: '1px solid #e5dfd5',
            borderRadius: 8,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#78716c',
              margin: 0,
              marginBottom: 4,
            }}
          >
            Open
          </p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.textPrimary,
              margin: 0,
              marginBottom: 2,
            }}
          >
            Sales: {money(statusTotals.Open)}
          </p>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: colors.textSecondary,
              margin: 0,
            }}
          >
            Budget: {money(budgetTotals.Open)}
          </p>
        </div>
        <div
          style={{
            padding: 12,
            background: '#f0fdf4',
            border: '1px solid #34d399',
            borderRadius: 8,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#065f46',
              margin: 0,
              marginBottom: 4,
            }}
          >
            Authorized
          </p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.textPrimary,
              margin: 0,
              marginBottom: 2,
            }}
          >
            Sales: {money(statusTotals.Authorized)}
          </p>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: colors.textSecondary,
              margin: 0,
            }}
          >
            Budget: {money(budgetTotals.Authorized)}
          </p>
        </div>
        <div
          style={{
            padding: 12,
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#854d0e',
              margin: 0,
              marginBottom: 4,
            }}
          >
            Issued
          </p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.textPrimary,
              margin: 0,
              marginBottom: 2,
            }}
          >
            Sales: {money(statusTotals.Issued)}
          </p>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: colors.textSecondary,
              margin: 0,
            }}
          >
            Budget: {money(budgetTotals.Issued)}
          </p>
        </div>
        <div
          style={{
            padding: 12,
            background: '#e5e7eb',
            border: '1px solid #9ca3af',
            borderRadius: 8,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#374151',
              margin: 0,
              marginBottom: 4,
            }}
          >
            Closed
          </p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.textPrimary,
              margin: 0,
              marginBottom: 2,
            }}
          >
            Sales: {money(statusTotals.Closed)}
          </p>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: colors.textSecondary,
              margin: 0,
            }}
          >
            Budget: {money(budgetTotals.Closed)}
          </p>
        </div>
      </div>

      {changeOrders.length === 0 ? (
        <p
          style={{
            color: colors.textSecondary,
            textAlign: 'center',
            padding: 24,
          }}
        >
          No change orders yet. Click &quot;+ New Change Order&quot; to add one.
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
                <th style={thRight}>Sales Amount</th>
                <th style={thRight}>Budget Amount</th>
                <th style={th}>Customer CO #</th>
                <th style={th}>Date Requested</th>
                <th style={th}>Date Authorized</th>
                <th style={th}>Date Issued</th>
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
                  <td style={tdRight}>{money(co.budget_amount)}</td>
                  <td style={td}>{co.customer_co_number ?? '—'}</td>
                  <td style={td}>{dateStr(co.date_requested)}</td>
                  <td style={td}>{dateStr(co.date_authorized)}</td>
                  <td style={td}>{dateStr(co.date_issued)}</td>
                  <td style={tdCenter}>
                    <button
                      type="button"
                      onClick={() => openForEdit(co)}
                      style={{
                        ...btnSmall,
                        marginLeft: 0,
                        background: 'transparent',
                        border: 'none',
                        color: colors.textSecondary,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 4,
                      }}
                      title="Edit"
                      aria-label="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCO(co.id)}
                      style={{
                        ...btnSmall,
                        marginLeft: 6,
                        background: 'transparent',
                        border: 'none',
                        color: colors.logoRed,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 4,
                      }}
                      title="Delete"
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={overlay}>
          <div style={modal} role="dialog" aria-modal="true">
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
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
                      color: colors.textSecondary,
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
                      color: colors.textSecondary,
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
                      color: colors.textSecondary,
                      marginBottom: 4,
                      display: 'block',
                      fontWeight: 500,
                    }}
                  >
                    Sales Amount
                  </label>
                  <input
                    id="amount"
                    name="amount"
                    placeholder="Sales Amount"
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={handleChange}
                    style={input}
                  />
                </div>
                <div>
                  <label
                    htmlFor="budget_amount"
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      marginBottom: 4,
                      display: 'block',
                      fontWeight: 500,
                    }}
                  >
                    Budget Amount
                  </label>
                  <input
                    id="budget_amount"
                    name="budget_amount"
                    placeholder="Budget Amount"
                    type="number"
                    step="0.01"
                    value={form.budget_amount}
                    onChange={handleChange}
                    style={input}
                  />
                </div>
                <div>
                  <label
                    htmlFor="customer_co_number"
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
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
                    htmlFor="date_authorized"
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      marginBottom: 4,
                      display: 'block',
                      fontWeight: 500,
                    }}
                  >
                    Date Authorized
                  </label>
                  <input
                    id="date_authorized"
                    name="date_authorized"
                    type="date"
                    value={form.date_authorized}
                    onChange={handleChange}
                    style={input}
                  />
                </div>
                <div>
                  <label
                    htmlFor="date_issued"
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      marginBottom: 4,
                      display: 'block',
                      fontWeight: 500,
                    }}
                  >
                    Date Issued
                  </label>
                  <input
                    id="date_issued"
                    name="date_issued"
                    type="date"
                    value={form.date_issued}
                    onChange={handleChange}
                    style={input}
                  />
                </div>
                <div>
                  <label
                    htmlFor="notes"
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
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
const cardStyle: React.CSSProperties = {
  background: '#faf8f5',
  border: '1px solid #e5dfd5',
  borderRadius: 12,
  padding: 24,
  marginBottom: 24,
};

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
  fontSize: 16, // Prevent iOS zoom on mobile
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
