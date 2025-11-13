import { supabase } from '@/lib/supabaseClient';
import { colors } from '@/styles/theme';
import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

export type SOVLine = {
  id: string;
  line_code: string | null;
  description: string;
  division: string | null;
  unit: string | null;
  quantity: number | null;
  unit_cost: number | null;
  extended_cost: number; // computed by DB
  category: string | null; // 'Material' | 'Labor' | 'Other' | null
  retainage_percent: number;
  created_at: string;
};

function money(n?: number | null) {
  return n == null
    ? '—'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

const thBase: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #e5dfd5',
};
const thLeft: React.CSSProperties = { ...thBase, textAlign: 'left' };
const thCenter: React.CSSProperties = { ...thBase, textAlign: 'center' };
const thRight: React.CSSProperties = { ...thBase, textAlign: 'right' };

const tdBase: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #e5dfd5',
};
const tdLeft: React.CSSProperties = { ...tdBase, textAlign: 'left' };
const tdCenter: React.CSSProperties = { ...tdBase, textAlign: 'center' };
const tdRight: React.CSSProperties = { ...tdBase, textAlign: 'right' };

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5dfd5',
  borderRadius: 12,
  padding: 24,
  marginBottom: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
};

export default function SOVSection({ projectId }: { projectId: string }) {
  const [lines, setLines] = useState<SOVLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingLine, setEditingLine] = useState<SOVLine | null>(null);
  const [newLine, setNewLine] = useState({
    line_code: '',
    description: '',
    unit: 'EA',
    quantity: '',
    unit_cost: '',
    category: 'Material' as 'Material' | 'Labor' | 'Other' | 'MatLab',
  });

  useEffect(() => {
    if (!projectId) return;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('engagement_sov_lines')
        .select(
          'id,line_code,description,division,unit,quantity,unit_cost,extended_cost,category,retainage_percent,created_at'
        )
        .eq('engagement_id', projectId)
        .order('created_at', { ascending: true });

      if (!error) setLines((data ?? []) as SOVLine[]);
      setLoading(false);
    };

    load();
  }, [projectId]);

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, l) => {
        const ext = l.extended_cost ?? 0;
        const cat = (l.category ?? 'Material').toLowerCase();
        if (cat === 'labor') acc.labor += ext;
        else if (cat === 'matlab') acc.matlab += ext;
        else if (cat === 'other') acc.other += ext;
        else acc.materials += ext;
        acc.total += ext;
        return acc;
      },
      { materials: 0, labor: 0, matlab: 0, other: 0, total: 0 }
    );
  }, [lines]);

  const addLine = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    if (!newLine.description.trim()) return;

    const qty = Number(newLine.quantity);
    const cost = Number(newLine.unit_cost);
    if (Number.isNaN(qty) || Number.isNaN(cost)) return;

    if (editingLine) {
      // Update existing line
      const upd = {
        line_code: newLine.line_code || null,
        description: newLine.description,
        unit: newLine.unit || null,
        quantity: qty,
        unit_cost: cost,
        category: newLine.category || 'Material',
      };

      const { data, error } = await supabase
        .from('engagement_sov_lines')
        .update(upd)
        .eq('id', editingLine.id)
        .select(
          'id,line_code,description,division,unit,quantity,unit_cost,extended_cost,category,retainage_percent,created_at'
        );

      if (!error && data) {
        setLines((prev) =>
          prev.map((l) => (l.id === editingLine.id ? (data[0] as SOVLine) : l))
        );
        setEditingLine(null);
        setNewLine({
          line_code: '',
          description: '',
          unit: 'EA',
          quantity: '',
          unit_cost: '',
          category: 'Material' as 'Material' | 'Labor' | 'MatLab' | 'Other',
        });
      }
    } else {
      // Insert new line
      const ins = {
        engagement_id: projectId,
        line_code: newLine.line_code || null,
        description: newLine.description,
        division: null,
        unit: newLine.unit || null,
        quantity: qty,
        unit_cost: cost,
        extended_cost: qty * cost,
        category: newLine.category || 'Material',
        retainage_percent: 10,
      };

      const { data, error } = await supabase
        .from('engagement_sov_lines')
        .insert([ins])
        .select(
          'id,line_code,description,division,unit,quantity,unit_cost,extended_cost,category,retainage_percent,created_at'
        );

      if (!error && data) {
        setLines((prev) => [...prev, ...(data as SOVLine[])]);
        setNewLine({
          line_code: '',
          description: '',
          unit: 'EA',
          quantity: '',
          unit_cost: '',
          category: 'Material' as 'Material' | 'Labor' | 'MatLab' | 'Other',
        });
      }
    }
  };

  const editLine = (line: SOVLine) => {
    setEditingLine(line);
    setNewLine({
      line_code: line.line_code || '',
      description: line.description,
      unit: line.unit || 'EA',
      quantity: String(line.quantity || ''),
      unit_cost: String(line.unit_cost || ''),
      category:
        (line.category as 'Material' | 'Labor' | 'MatLab' | 'Other') ||
        'Material',
    });
  };

  const cancelEdit = () => {
    setEditingLine(null);
    setNewLine({
      line_code: '',
      description: '',
      unit: 'EA',
      quantity: '',
      unit_cost: '',
      category: 'Material' as 'Material' | 'Labor' | 'MatLab' | 'Other',
    });
  };

  const deleteLine = async (lineId: string) => {
    if (!confirm('Delete this line item?')) return;

    const { error } = await supabase
      .from('engagement_sov_lines')
      .delete()
      .eq('id', lineId);

    if (!error) {
      setLines((prev) => prev.filter((l) => l.id !== lineId));
    }
  };

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
          Schedule of Values
        </h2>
        <div
          className="sov-totals"
          style={{ fontSize: 14, color: colors.textMuted }}
        >
          <div>
            <b>Materials:</b> {money(totals.materials)}
          </div>
          <div>
            <b>Labor:</b> {money(totals.labor)}
          </div>
          <div>
            <b>MatLab:</b> {money(totals.matlab)}
          </div>
          <div>
            <b>Other:</b> {money(totals.other)}
          </div>
          <div>
            <b>Total:</b> {money(totals.total)}
          </div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: colors.textSecondary }}>Loading…</p>
      ) : lines.length === 0 ? (
        <p style={{ color: colors.textSecondary }}>No SOV lines yet.</p>
      ) : (
        <div className="sov-table-container" style={{ overflowX: 'auto' }}>
          <table
            style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}
          >
            <thead>
              <tr style={{ background: '#faf8f5' }}>
                <th style={thLeft}>Code</th>
                <th style={thLeft}>Description</th>
                <th style={thCenter}>Unit</th>
                <th style={thRight}>Qty</th>
                <th style={thRight}>Unit Cost</th>
                <th style={thCenter}>Category</th>
                <th style={thRight}>Extended</th>
                <th style={thCenter}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id}>
                  <td style={tdLeft}>{line.line_code ?? '—'}</td>
                  <td style={tdLeft}>{line.description}</td>
                  <td style={tdCenter}>{line.unit ?? '—'}</td>
                  <td style={tdRight}>{line.quantity ?? 0}</td>
                  <td style={tdRight}>{money(line.unit_cost)}</td>
                  <td style={tdCenter}>{line.category ?? '—'}</td>
                  <td style={tdRight}>{money(line.extended_cost)}</td>
                  <td style={tdCenter}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        justifyContent: 'center',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => editLine(line)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          color: colors.navy,
                        }}
                        title="Edit line"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteLine(line.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          color: '#ef4444',
                        }}
                        title="Delete line"
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

      <form onSubmit={addLine} style={{ marginTop: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
            {editingLine ? 'Edit Line' : 'Add New Line'}
          </h3>
          {editingLine && (
            <button
              type="button"
              onClick={cancelEdit}
              style={{
                padding: '6px 12px',
                background: '#6b7280',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Cancel
            </button>
          )}
        </div>
        <div
          className="sov-add-form"
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr 90px 100px 120px 140px 100px',
            gap: 12,
          }}
        >
          <input
            type="text"
            placeholder="Code"
            value={newLine.line_code}
            onChange={(e) =>
              setNewLine((s) => ({ ...s, line_code: e.target.value }))
            }
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Description"
            value={newLine.description}
            onChange={(e) =>
              setNewLine((s) => ({ ...s, description: e.target.value }))
            }
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Unit"
            value={newLine.unit}
            onChange={(e) =>
              setNewLine((s) => ({ ...s, unit: e.target.value }))
            }
            style={inputStyle}
          />
          <input
            type="number"
            placeholder="Qty"
            value={newLine.quantity}
            onChange={(e) =>
              setNewLine((s) => ({ ...s, quantity: e.target.value }))
            }
            style={inputStyle}
          />
          <input
            type="number"
            placeholder="Unit Cost"
            value={newLine.unit_cost}
            onChange={(e) =>
              setNewLine((s) => ({ ...s, unit_cost: e.target.value }))
            }
            style={inputStyle}
          />
          <select
            value={newLine.category}
            onChange={(e) =>
              setNewLine((s) => ({
                ...s,
                category: e.target.value as
                  | 'Material'
                  | 'Labor'
                  | 'MatLab'
                  | 'Other',
              }))
            }
            style={inputStyle}
          >
            <option>Material</option>
            <option>Labor</option>
            <option>MatLab</option>
            <option>Other</option>
          </select>
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              background: '#1e3a5f',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {editingLine ? 'Update' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
