// pages/change-orders/[projectId].tsx
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

type Project = {
  id: string;
  qbid: string | null;
  name: string;
};

type ChangeOrder = {
  id: string;
  project_id: string;
  co_number: string | null;
  description: string;
  amount: number;
  status: string | null;
  date: string | null;
  created_at: string;
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
    co_number: '',
    description: '',
    amount: '',
    status: 'Pending',
    date: '',
  });

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      setLoading(true);

      // Load project info
      const { data: proj, error: projErr } = await supabase
        .from('projects')
        .select('id,qbid,name')
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
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false });

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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const openForNew = () => {
    setEditingCO(null);
    setForm({
      co_number: '',
      description: '',
      amount: '',
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const openForEdit = (co: ChangeOrder) => {
    setEditingCO(co);
    setForm({
      co_number: co.co_number || '',
      description: co.description,
      amount: co.amount.toString(),
      status: co.status || 'Pending',
      date: co.date || '',
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
        project_id: projectId,
        co_number: form.co_number || null,
        description: form.description,
        amount: Number(form.amount) || 0,
        status: form.status || 'Pending',
        date: form.date || null,
      };

      let error = null;
      if (editingCO) {
        const { error: err } = await supabase
          .from('change_orders')
          .update(payload)
          .eq('id', editingCO.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('change_orders')
          .insert([payload]);
        error = err;
      }

      if (error) {
        alert('Error saving change order: ' + error.message);
      } else {
        setShowModal(false);
        // Reload change orders
        const { data: cos } = await supabase
          .from('change_orders')
          .select('*')
          .eq('project_id', projectId)
          .order('date', { ascending: false });
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
      .from('change_orders')
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
        background: '#f1f5f9',
        padding: 24,
        fontFamily: 'system-ui',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/projects"
          style={{ color: '#2563eb', textDecoration: 'none' }}
        >
          ← Back to Projects
        </Link>
      </div>

      {loading ? (
        <p style={{ color: '#475569' }}>Loading…</p>
      ) : !project ? (
        <p style={{ color: '#475569' }}>Project not found.</p>
      ) : (
        <>
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 24,
              marginBottom: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
              Change Orders
            </h1>
            <p style={{ color: '#475569', marginBottom: 4 }}>
              Project: <strong>{project.name}</strong>
            </p>
            {project.qbid && (
              <p style={{ color: '#475569', marginBottom: 0 }}>
                QBID: {project.qbid}
              </p>
            )}
          </div>

          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
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
                <p style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>
                  Total: {money(totalAmount)}
                </p>
              </div>
              <button
                type="button"
                onClick={openForNew}
                style={{
                  background: '#2563eb',
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
              <p style={{ color: '#475569', textAlign: 'center', padding: 24 }}>
                No change orders yet. Click "+ New Change Order" to add one.
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
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={th}>CO #</th>
                      <th style={th}>Description</th>
                      <th style={thRight}>Amount</th>
                      <th style={th}>Status</th>
                      <th style={th}>Date</th>
                      <th style={thCenter}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changeOrders.map((co) => (
                      <tr key={co.id}>
                        <td style={td}>{co.co_number ?? '—'}</td>
                        <td style={td}>{co.description}</td>
                        <td style={tdRight}>{money(co.amount)}</td>
                        <td style={td}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 500,
                              background:
                                co.status === 'Approved'
                                  ? '#dcfce7'
                                  : co.status === 'Rejected'
                                    ? '#fee2e2'
                                    : '#fef3c7',
                              color:
                                co.status === 'Approved'
                                  ? '#166534'
                                  : co.status === 'Rejected'
                                    ? '#991b1b'
                                    : '#854d0e',
                            }}
                          >
                            {co.status ?? 'Pending'}
                          </span>
                        </td>
                        <td style={td}>{dateStr(co.date)}</td>
                        <td style={tdCenter}>
                          <button
                            type="button"
                            onClick={() => openForEdit(co)}
                            style={btnSmall}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCO(co.id)}
                            style={{
                              ...btnSmall,
                              marginLeft: 8,
                              background: '#fee2e2',
                              color: '#991b1b',
                            }}
                          >
                            Delete
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
                <input
                  name="co_number"
                  placeholder="CO Number"
                  value={form.co_number}
                  onChange={handleChange}
                  style={input}
                />
                <input
                  name="description"
                  placeholder="Description *"
                  value={form.description}
                  onChange={handleChange}
                  style={input}
                  required
                />
                <input
                  name="amount"
                  placeholder="Amount"
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={handleChange}
                  style={input}
                />
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  style={input}
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <input
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleChange}
                  style={input}
                />
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
  borderBottom: '1px solid #e5e7eb',
  whiteSpace: 'nowrap',
  fontWeight: 600,
};
const thRight: React.CSSProperties = { ...th, textAlign: 'right' };
const thCenter: React.CSSProperties = { ...th, textAlign: 'center' };

const td: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #e5e7eb',
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
  border: '1px solid #e5e7eb',
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
  background: '#2563eb',
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
