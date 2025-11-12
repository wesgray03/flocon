// components/modals/MasterDataModal.tsx
import { supabase } from '@/lib/supabaseClient';
import * as styles from '@/styles/projectStyles';
import { colors } from '@/styles/theme';
import { Pencil, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TaskData {
  id: string;
  name: string;
  stages?: { name?: string }[] | { name?: string };
}

interface MasterDataModalProps {
  open: boolean;
  onClose: () => void;
  table: 'stages' | 'engagement_tasks';
  label: string;
}

export function MasterDataModal({
  open,
  onClose,
  table,
  label,
}: MasterDataModalProps) {
  const [items, setItems] = useState<
    { id: string; name: string; stage_name?: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let data, error;
      if (table === 'engagement_tasks') {
        // Load engagement_tasks with stage information
        const [tasksResult, stagesResult] = await Promise.all([
          supabase
            .from('engagement_tasks')
            .select('id, name, stage_id')
            .order('order_num', { ascending: true }),
          supabase.from('stages').select('id, name'),
        ]);

        if (tasksResult.error) {
          error = tasksResult.error;
          data = null;
        } else if (stagesResult.error) {
          error = stagesResult.error;
          data = null;
        } else {
          // Build stage lookup
          const stagesMap = new Map(
            (stagesResult.data || []).map((s) => [s.id, s.name])
          );
          // Join manually
          data = (tasksResult.data || []).map((task) => ({
            id: task.id,
            name: task.name,
            stage_name: stagesMap.get(task.stage_id) || 'Unknown Stage',
          }));
        }
      } else {
        const result = await supabase
          .from(table)
          .select('id,name')
          .order('name', { ascending: true });
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error(`${label} load error:`, error.message ?? error);
        setLoadError(error.message ?? String(error));
        setItems([]);
      } else {
        setItems(data ?? []);
      }
    } catch (err) {
      console.error(`${label} load unexpected error:`, err);
      setLoadError(String(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, table]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    const { error } = await supabase.from(table).insert([{ name }]);
    if (error) return alert(`Add ${label} error: ${error.message}`);
    setNewName('');
    await load();
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };
  const saveEdit = async () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (!name) return alert('Name cannot be empty');
    const { error } = await supabase
      .from(table)
      .update({ name })
      .eq('id', editingId);
    if (error) return alert(`Update ${label} error: ${error.message}`);
    cancelEdit();
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm(`Delete this ${label.slice(0, -1)}?`)) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return alert(`Delete ${label} error: ${error.message}`);
    await load();
  };

  if (!open) return null;

  return (
    <div style={styles.overlay}>
      <div
        style={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="masterdata-title"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <h3
            id="masterdata-title"
            style={{ margin: 0, fontSize: 18, fontWeight: 600 }}
          >
            {label}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={styles.btnCancel}
            aria-label={`Close ${label}`}
          >
            Close
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            placeholder={`New ${label.slice(0, -1)} name`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ ...styles.input, flex: 1 }}
          />
          <button
            type="button"
            onClick={add}
            style={styles.btnSave}
            aria-label={`Add ${label}`}
          >
            Add
          </button>
        </div>

        <div
          style={{
            border: '1px solid #e5dfd5',
            borderRadius: 8,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              background: '#f0ebe3',
              padding: 8,
              fontSize: 12,
              color: colors.textPrimary,
            }}
          >
            {loading ? 'Loading…' : `${items.length} item(s)`}
            {loadError ? (
              <div
                style={{ color: colors.errorText, marginTop: 8, fontSize: 12 }}
              >
                Error: {loadError}
              </div>
            ) : null}
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 720 }}>
            {items.map((it) => (
              <div
                key={it.id}
                style={{
                  padding: 12,
                  borderBottom: '1px solid #e5dfd5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {editingId === it.id ? (
                  <>
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      style={{ ...styles.input, flex: 1, marginRight: 8 }}
                    />
                    <button
                      type="button"
                      onClick={saveEdit}
                      style={styles.btnSave}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      style={{ ...styles.btnCancel, marginLeft: 8 }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {it.name}
                      </div>
                      {it.stage_name && (
                        <div
                          style={{
                            fontSize: 12,
                            color: colors.textSecondary,
                            marginTop: 2,
                          }}
                        >
                          Stage: {it.stage_name}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(it.id, it.name)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 8,
                        color: colors.textSecondary,
                      }}
                      aria-label={`Edit ${it.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(it.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 8,
                        color: colors.errorText,
                      }}
                      aria-label={`Delete ${it.name}`}
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
