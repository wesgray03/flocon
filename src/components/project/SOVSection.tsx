import { supabase } from '@/lib/supabaseClient';
import { colors } from '@/styles/theme';
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
  const [newLine, setNewLine] = useState({
    line_code: '',
    description: '',
    unit: 'EA',
    quantity: '',
    unit_cost: '',
    category: 'Material' as 'Material' | 'Labor' | 'Other',
  });

  useEffect(() => {
    if (!projectId) return;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('sov_lines')
        .select(
          'id,line_code,description,division,unit,quantity,unit_cost,extended_cost,category,retainage_percent,created_at'
        )
        .eq('project_id', projectId)
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
        else if (cat === 'other') acc.other += ext;
        else acc.materials += ext;
        acc.total += ext;
        return acc;
      },
      { materials: 0, labor: 0, other: 0, total: 0 }
    );
  }, [lines]);

  const addLine = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    if (!newLine.description.trim()) return;

    const qty = Number(newLine.quantity);
    const cost = Number(newLine.unit_cost);
    if (Number.isNaN(qty) || Number.isNaN(cost)) return;

    const payload = {
      project_id: projectId,
      line_code: newLine.line_code || null,
      description: newLine.description,
      division: null as string | null,
      unit: newLine.unit || null,
      quantity: qty,
      unit_cost: cost,
      category: newLine.category,
    };

    const { data, error } = await supabase
      .from('sov_lines')
      .insert([payload])
      .select(
        'id,line_code,description,division,unit,quantity,unit_cost,extended_cost,category,created_at'
      );

    if (!error && data) {
      setLines((prev) => [...prev, ...(data as SOVLine[])]);
      setNewLine({
        line_code: '',
        description: '',
        unit: 'EA',
        quantity: '',
        unit_cost: '',
        category: 'Material',
      });
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={addLine} style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          Add New Line
        </h3>
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
                category: e.target.value as 'Material' | 'Labor' | 'Other',
              }))
            }
            style={inputStyle}
          >
            <option>Material</option>
            <option>Labor</option>
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
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
