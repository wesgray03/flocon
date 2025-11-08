import { ProjectTask, Stage } from '@/lib/hooks/useProjectTasks';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

interface StageTasksModalProps {
  open: boolean;
  onClose: () => void;
  stages: Stage[];
  projectId: string | undefined;
  currentStageId: string | null | undefined;
  onStageTasksUpdate?: (stageId: string, tasks: ProjectTask[]) => void; // notify parent for current stage sync
}

type TasksByStage = Record<string, ProjectTask[]>;

export default function StageTasksModal({
  open,
  onClose,
  stages,
  projectId,
  currentStageId,
  onStageTasksUpdate,
}: StageTasksModalProps) {
  const [tasksByStage, setTasksByStage] = useState<TasksByStage>({});
  const [loading, setLoading] = useState(false);

  // Load all tasks for all stages when modal opens
  useEffect(() => {
    const loadAll = async () => {
      if (!open || !projectId) return;
      setLoading(true);
      try {
        const results = await Promise.all(
          stages.map((s) =>
            supabase
              .from('project_tasks')
              .select(
                `
                id,
                name,
                stage_id,
                order_num,
                project_task_completion!left(complete)
              `
              )
              .eq('stage_id', s.id)
              .eq('project_task_completion.project_id', projectId)
              .order('order_num', { ascending: true })
          )
        );
        const map: TasksByStage = {};
        results.forEach((res, idx) => {
          const stageId = stages[idx].id;
          const mapped = (res.data ?? []).map((task: any) => ({
            id: task.id,
            name: task.name,
            stage_id: task.stage_id,
            order_num: task.order_num,
            complete: task.project_task_completion?.[0]?.complete ?? false,
          }));
          map[stageId] = mapped as ProjectTask[];
        });
        setTasksByStage(map);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [open, stages, projectId]);

  // Auto-scroll to current stage section when modal opens and data is loaded
  useEffect(() => {
    if (!open || loading) return;
    if (!currentStageId) return;
    // Defer to next paint to ensure elements exist
    requestAnimationFrame(() => {
      const el = document.getElementById(`stage-block-${currentStageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, [open, loading, currentStageId, tasksByStage]);

  if (!open) return null;

  const toggleTask = async (task: ProjectTask) => {
    if (!projectId) return;

    const stageId = task.stage_id;

    // Check if completion record exists
    const { data: existing } = await supabase
      .from('project_task_completion')
      .select('id')
      .eq('project_id', projectId)
      .eq('task_id', task.id)
      .maybeSingle();

    let error;
    if (existing) {
      // Update existing record
      const result = await supabase
        .from('project_task_completion')
        .update({ complete: !task.complete })
        .eq('id', existing.id);
      error = result.error;
    } else {
      // Insert new record
      const result = await supabase.from('project_task_completion').insert({
        project_id: projectId,
        task_id: task.id,
        complete: !task.complete,
      });
      error = result.error;
    }

    if (!error) {
      setTasksByStage((prev) => {
        const updated = prev[stageId].map((t) =>
          t.id === task.id ? { ...t, complete: !task.complete } : t
        );
        const next = { ...prev, [stageId]: updated };
        if (stageId === currentStageId && onStageTasksUpdate) {
          onStageTasksUpdate(stageId, updated);
        }
        return next;
      });
    }
  };

  // addTask removed per request
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20 }}>Edit Tasks - All Stages</h2>
          <button onClick={onClose} style={closeBtnStyle}>
            ✕
          </button>
        </div>
        {loading ? (
          <p style={{ fontSize: 14, color: '#64748b' }}>Loading tasks…</p>
        ) : (
          <div
            style={{
              maxHeight: 500,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            {stages.map((s) => {
              const sts = tasksByStage[s.id] || [];
              const isCurrent = s.id === currentStageId;
              return (
                <div
                  key={s.id}
                  id={`stage-block-${s.id}`}
                  style={{
                    border: '1px solid #e5dfd5',
                    borderRadius: 8,
                    padding: 16,
                    background: isCurrent ? '#d4f0e8' : '#faf8f5',
                  }}
                >
                  <h3
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: 16,
                      fontWeight: 600,
                      color: isCurrent ? '#2d5a1e' : '#0f172a',
                    }}
                  >
                    {s.order}. {s.name}
                  </h3>
                  {sts.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                      No tasks yet.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      {sts.map((task) => (
                        <div
                          key={task.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: '#faf8f5',
                            padding: 8,
                            borderRadius: 6,
                            border: '1px solid #e5dfd5',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={task.complete}
                            onChange={() => toggleTask(task)}
                            style={{ marginRight: 12 }}
                          />
                          <span
                            style={{
                              flex: 1,
                              fontSize: 14,
                              textDecoration: task.complete
                                ? 'line-through'
                                : 'none',
                              color: task.complete ? '#2d5a1e' : '#0f172a',
                            }}
                          >
                            {task.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Add task UI removed */}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(15,23,42,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 24,
};

const modalStyle: React.CSSProperties = {
  background: '#faf8f5',
  borderRadius: 12,
  padding: 24,
  width: '100%',
  maxWidth: 600,
  boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
  border: '1px solid #e5dfd5',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: 20,
  cursor: 'pointer',
  color: '#64748b',
  padding: 4,
  lineHeight: 1,
};
