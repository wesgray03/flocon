import { supabase } from '@/lib/supabaseClient';
import { colors } from '@/styles/theme';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export type Subcontractor = { id: string; name: string };
export type ProjectSubcontractor = {
  id: string;
  subcontractor_id: string;
  subcontractor_name: string;
  work_order_number: string | null;
  assigned_date: string | null;
  notes: string | null;
};

type Props = {
  projectId: string;
};

export default function SubcontractorsSection({ projectId }: Props) {
  const [allSubcontractors, setAllSubcontractors] = useState<Subcontractor[]>(
    []
  );
  const [projectSubcontractors, setProjectSubcontractors] = useState<
    ProjectSubcontractor[]
  >([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newSub, setNewSub] = useState({
    subcontractor_id: '',
    work_order_number: '',
    assigned_date: '',
    notes: '',
  });

  useEffect(() => {
    if (!projectId) return;

    const load = async () => {
      const [{ data: subs }, { data: projSubs }] = await Promise.all([
        supabase.from('subcontractors').select('id, name').order('name'),
        supabase
          .from('project_subcontractors')
          .select(
            'id, subcontractor_id, work_order_number, assigned_date, notes'
          )
          .eq('project_id', projectId),
      ]);

      setAllSubcontractors((subs ?? []) as Subcontractor[]);

      const mapped = (projSubs ?? []).map((ps: any) => ({
        id: ps.id,
        subcontractor_id: ps.subcontractor_id,
        subcontractor_name:
          (subs ?? []).find((s: any) => s.id === ps.subcontractor_id)?.name ||
          'Unknown',
        work_order_number: ps.work_order_number,
        assigned_date: ps.assigned_date,
        notes: ps.notes,
      }));
      setProjectSubcontractors(mapped);
    };

    load();
  }, [projectId]);

  const handleAdd = async () => {
    if (!projectId || !newSub.subcontractor_id) return;

    const { data, error } = await supabase
      .from('project_subcontractors')
      .insert({
        project_id: projectId,
        subcontractor_id: newSub.subcontractor_id,
        work_order_number: newSub.work_order_number || null,
        assigned_date: newSub.assigned_date || null,
        notes: newSub.notes || null,
      })
      .select('id, subcontractor_id, work_order_number, assigned_date, notes')
      .single();

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    const added: ProjectSubcontractor = {
      id: data.id,
      subcontractor_id: data.subcontractor_id,
      subcontractor_name:
        allSubcontractors.find((s) => s.id === data.subcontractor_id)?.name ||
        'Unknown',
      work_order_number: data.work_order_number,
      assigned_date: data.assigned_date,
      notes: data.notes,
    };

    setProjectSubcontractors((prev) => [...prev, added]);
    setShowAdd(false);
    setNewSub({
      subcontractor_id: '',
      work_order_number: '',
      assigned_date: '',
      notes: '',
    });
  };

  const handleRemove = async (id: string) => {
    const ok = confirm('Remove this subcontractor assignment?');
    if (!ok) return;

    const { error } = await supabase
      .from('project_subcontractors')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    setProjectSubcontractors((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <p
          style={{ margin: 0, fontSize: 13, fontWeight: 600, color: colors.textPrimary }}
        >
          Subcontractors
        </p>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            padding: '4px 8px',
            background: '#1e3a5f',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Add subcontractor"
          aria-label="Add subcontractor"
        >
          <Plus size={14} />
        </button>
      </div>

      {projectSubcontractors.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: colors.textMuted,
            fontStyle: 'italic',
          }}
        >
          No subcontractors assigned
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {projectSubcontractors.map((ps) => (
            <div
              key={ps.id}
              style={{
                padding: 8,
                background: '#faf8f5',
                borderRadius: 4,
                fontSize: 13,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <div style={{ fontWeight: 500, color: colors.textPrimary }}>
                  {ps.subcontractor_name}
                </div>
                <button
                  onClick={() => handleRemove(ps.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: colors.logoRed,
                    cursor: 'pointer',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Remove subcontractor"
                  aria-label="Remove subcontractor"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {ps.work_order_number && (
                <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  WO: {ps.work_order_number}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: '#d4f0e8',
            border: '1px solid #93c5fd',
            borderRadius: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: colors.textPrimary,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            Subcontractor
            <select
              value={newSub.subcontractor_id}
              onChange={(e) =>
                setNewSub((p) => ({ ...p, subcontractor_id: e.target.value }))
              }
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #cbd5e1',
                borderRadius: 4,
              }}
            >
              <option value="">Select one...</option>
              {allSubcontractors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: colors.textPrimary,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            Work Order # (optional)
            <input
              type="text"
              value={newSub.work_order_number}
              onChange={(e) =>
                setNewSub((p) => ({ ...p, work_order_number: e.target.value }))
              }
              placeholder="e.g. WO-123"
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #cbd5e1',
                borderRadius: 4,
              }}
            />
          </label>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: colors.textPrimary,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            Assigned Date (optional)
            <input
              type="date"
              value={newSub.assigned_date}
              onChange={(e) =>
                setNewSub((p) => ({ ...p, assigned_date: e.target.value }))
              }
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #cbd5e1',
                borderRadius: 4,
              }}
            />
          </label>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: colors.textPrimary,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            Notes (optional)
            <textarea
              value={newSub.notes}
              onChange={(e) =>
                setNewSub((p) => ({ ...p, notes: e.target.value }))
              }
              rows={3}
              placeholder="Any relevant notes..."
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #cbd5e1',
                borderRadius: 4,
                resize: 'vertical',
              }}
            />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleAdd}
              style={{
                background: '#1e3a5f',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setNewSub({
                  subcontractor_id: '',
                  work_order_number: '',
                  assigned_date: '',
                  notes: '',
                });
              }}
              style={{
                background: '#e5dfd5',
                color: colors.textPrimary,
                border: 'none',
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
