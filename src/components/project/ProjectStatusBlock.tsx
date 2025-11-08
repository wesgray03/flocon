import {
    ProjectTask,
    Stage as StageType,
    useProjectTasks,
} from '@/lib/hooks/useProjectTasks';
import { AlertTriangle, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import StageTasksModal from './StageTasksModal';

type Project = {
  id: string;
  stage?: string | null;
  stage_id?: string | null;
  stage_order?: number | null;
};

interface Props {
  project: Project | null;
  stages: StageType[];
  advancing: boolean;
  onAdvanceToNextStage: (
    incompleteTasks?: { id: string; name: string }[]
  ) => void;
  onGoToPreviousStage: () => void;
}

export default function ProjectStatusBlock({
  project,
  stages,
  advancing,
  onAdvanceToNextStage,
  onGoToPreviousStage,
}: Props) {
  const { prevStage, nextStage, prevTasks, currentTasks, toggleTask, reload } =
    useProjectTasks(project?.id, project?.stage_id ?? undefined, stages);

  const [modalOpen, setModalOpen] = useState(false);
  const [tasksState, setTasksState] = useState<ProjectTask[]>(currentTasks);

  // Check if there are incomplete tasks from previous stages
  const hasIncompletePriorTasks = prevTasks.some((task) => !task.complete);
  const incompletePriorCount = prevTasks.filter(
    (task) => !task.complete
  ).length;

  // keep local tasks in sync when hook updates
  useEffect(() => {
    console.log('Syncing tasksState from currentTasks:', currentTasks);
    setTasksState(currentTasks);
  }, [currentTasks]);

  const handleAdvanceClick = () => {
    const incompleteTasks = tasksState.filter((t) => !t.complete);
    onAdvanceToNextStage(
      incompleteTasks.length > 0 ? incompleteTasks : undefined
    );
  };

  const cleanStageName = (stageName?: string | null) => {
    if (!stageName) return 'Not Set';
    if (stageName.includes('. ')) {
      return stageName.split('. ')[1];
    }
    return stageName;
  };

  return (
    <div
      style={{
        background: 'transparent',
        borderRadius: 8,
        padding: 16,
        boxShadow: 'none',
        border: 'none',
        marginTop: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            Project Status
          </h3>
          {hasIncompletePriorTasks && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: 4,
                padding: '4px 8px',
              }}
              title={`${incompletePriorCount} incomplete task(s) from prior stages`}
            >
              <AlertTriangle size={14} color="#d97706" />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#92400e',
                }}
              >
                Prior Tasks Incomplete
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            padding: '6px 8px',
            background: '#1e3a5f',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Edit project status"
          aria-label="Edit project status"
        >
          <Pencil size={16} />
        </button>
      </div>

      {/* Previous Stage */}
      {prevStage && (
        <div style={{ marginBottom: 12 }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 700,
              color: '#6b7280',
            }}
          >
            Previous Stage
          </p>
          <button
            onClick={onGoToPreviousStage}
            disabled={advancing}
            style={{
              padding: 0,
              background: 'transparent',
              border: 'none',
              color: '#1e3a5f',
              textDecoration: 'underline',
              cursor: advancing ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {prevStage.order}. {prevStage.name}
          </button>
        </div>
      )}

      {/* Current Stage with current tasks only */}
      <div
        style={{
          marginBottom: 12,
          background: '#e8f0d4',
          border: '1px solid #a8c070',
          borderRadius: 8,
          padding: 12,
        }}
      >
        <p
          style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#4a5d23' }}
        >
          Current Stage
        </p>
        <p
          style={{
            margin: '4px 0 8px 0',
            fontSize: 16,
            fontWeight: 700,
            color: '#4a5d23',
          }}
        >
          {project?.stage_order
            ? `${project.stage_order}. ${cleanStageName(project.stage)}`
            : cleanStageName(project?.stage)}
        </p>

        {tasksState.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: '#4a5d23' }}>No tasks</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tasksState.map((task) => (
              <label
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14,
                  color: '#374151',
                }}
              >
                <input
                  type="checkbox"
                  checked={task.complete}
                  onChange={async () => {
                    const wasChecking = !task.complete;

                    // Optimistically update local state immediately
                    const updatedTasks = tasksState.map((t) =>
                      t.id === task.id ? { ...t, complete: !task.complete } : t
                    );
                    setTasksState(updatedTasks);

                    // Then persist to database
                    await toggleTask(task.id, task.complete);

                    // If user just checked a box and all tasks are now complete, auto-advance
                    if (
                      wasChecking &&
                      updatedTasks.every((t) => t.complete) &&
                      nextStage &&
                      !advancing
                    ) {
                      console.log(
                        'All tasks complete after checking, auto-advancing'
                      );
                      onAdvanceToNextStage();
                    }
                  }}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <span
                  style={{
                    textDecoration: task.complete ? 'line-through' : 'none',
                    color: task.complete ? '#4a5d23' : '#0f172a',
                  }}
                >
                  {task.name}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Next Stage name only with action */}
      <div>
        <p
          style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6b7280' }}
        >
          Next Stage
        </p>
        {nextStage ? (
          <button
            onClick={handleAdvanceClick}
            disabled={advancing}
            style={{
              padding: 0,
              background: 'transparent',
              border: 'none',
              color: '#1e3a5f',
              textDecoration: 'underline',
              cursor: advancing ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {nextStage.order}. {nextStage.name}
          </button>
        ) : (
          <p style={{ margin: 0, fontSize: 14, color: '#9ca3af' }}>Complete</p>
        )}
      </div>

      {/* Modal */}
      <StageTasksModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          reload();
        }}
        stages={stages}
        projectId={project?.id}
        currentStageId={project?.stage_id}
        onStageTasksUpdate={(stageId, updated) => {
          if (stageId === (project?.stage_id ?? '')) {
            setTasksState(updated);
          }
        }}
      />
    </div>
  );
}
