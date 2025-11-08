import { colors } from '@/styles/theme';
import {
  Stage as StageType,
  useProjectTasks,
} from '@/lib/hooks/useProjectTasks';

type Project = {
  id: string;
  stage?: string | null;
  stage_id?: string | null;
  stage_order?: number | null;
};

type Props = {
  project: Project | null;
  stages: StageType[];
  advancing: boolean;
  onAdvanceToNextStage: () => void;
  onGoToPreviousStage: () => void;
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  margin: 0,
  color: colors.textPrimary,
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

export default function StageProgressSection({
  project,
  stages,
  advancing,
  onAdvanceToNextStage,
  onGoToPreviousStage,
}: Props) {
  const {
    prevStage,
    nextStage,
    prevTasks,
    currentTasks,
    nextTasks,
    toggleTask,
  } = useProjectTasks(project?.id, project?.stage_id ?? undefined, stages);

  const cleanStageName = (stageName?: string | null) => {
    if (!stageName) return 'Not Set';
    if (stageName.includes('. ')) {
      return stageName.split('. ')[1];
    }
    return stageName;
  };

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
        <h2 style={{ ...sectionHeaderStyle, margin: 0 }}>Project Status</h2>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 16,
          borderTop: '1px solid #e5dfd5',
          paddingTop: 16,
        }}
      >
        {/* Previous Stage */}
        <div style={{ borderRight: '1px solid #e5dfd5', paddingRight: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: colors.textSecondary,
                fontWeight: 600,
              }}
            >
              Previous Stage
            </p>
            {prevStage ? (
              <button
                onClick={onGoToPreviousStage}
                disabled={advancing}
                style={{
                  margin: '4px 0 0',
                  fontSize: 16,
                  fontWeight: 600,
                  color: colors.gray,
                  background: 'transparent',
                  border: 'none',
                  cursor: advancing ? 'not-allowed' : 'pointer',
                  textDecoration: 'underline',
                  opacity: advancing ? 0.5 : 1,
                  padding: 0,
                }}
              >
                {prevStage.order}. {prevStage.name}
              </button>
            ) : (
              <p style={{ margin: '4px 0 0', fontSize: 16, color: colors.textMuted }}>
                —
              </p>
            )}
          </div>
          <div>
            <p
              style={{
                margin: '0 0 8px 0',
                fontSize: 13,
                color: colors.textSecondary,
                fontStyle: 'italic',
              }}
            >
              List Previous Stage Tasks (View Only)
            </p>
            {prevTasks.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: colors.textMuted }}>
                No tasks
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {prevTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: 14,
                      color: colors.textSecondary,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={task.complete}
                      disabled
                      style={{
                        width: 16,
                        height: 16,
                        marginRight: 8,
                        cursor: 'not-allowed',
                        opacity: 0.6,
                      }}
                    />
                    <span
                      style={{
                        textDecoration: task.complete ? 'line-through' : 'none',
                      }}
                    >
                      {task.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Current Stage */}
        <div
          style={{
            background: '#e0e7ee',
            padding: 16,
            borderRadius: 8,
            border: '2px solid #86efac',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: colors.textPrimary,
                fontWeight: 600,
              }}
            >
              Current Stage
            </p>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 18,
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              {project?.stage_order
                ? `${project.stage_order}. ${cleanStageName(project.stage)}`
                : cleanStageName(project?.stage)}
            </p>
          </div>
          <div>
            <p
              style={{
                margin: '0 0 8px 0',
                fontSize: 13,
                color: colors.textPrimary,
                fontWeight: 600,
              }}
            >
              List Current Stage Tasks (Read/Write)
            </p>
            {currentTasks.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: colors.textPrimary }}>
                No tasks
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {currentTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 8,
                      background: '#faf8f5',
                      borderRadius: 4,
                      border: '1px solid #86efac',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={task.complete}
                      onChange={async () => {
                        await toggleTask(task.id, task.complete);
                      }}
                      style={{
                        width: 18,
                        height: 18,
                        marginRight: 10,
                        cursor: 'pointer',
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        color: task.complete ? '#475569' : '#0f172a',
                        textDecoration: task.complete ? 'line-through' : 'none',
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      {task.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Next Stage */}
        <div style={{ borderLeft: '1px solid #e5dfd5', paddingLeft: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: colors.textSecondary,
                fontWeight: 600,
              }}
            >
              Next Stage
            </p>
            {nextStage ? (
              <button
                onClick={onAdvanceToNextStage}
                disabled={advancing}
                style={{
                  margin: '4px 0 0',
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#0369a1',
                  background: 'transparent',
                  border: 'none',
                  cursor: advancing ? 'not-allowed' : 'pointer',
                  textDecoration: 'underline',
                  opacity: advancing ? 0.5 : 1,
                  padding: 0,
                }}
              >
                {nextStage.order}. {nextStage.name}
              </button>
            ) : (
              <p style={{ margin: '4px 0 0', fontSize: 16, color: colors.textMuted }}>
                Complete
              </p>
            )}
          </div>
          <div>
            <p
              style={{
                margin: '0 0 8px 0',
                fontSize: 13,
                color: colors.textSecondary,
                fontStyle: 'italic',
              }}
            >
              List Next Stage Tasks (View Only)
            </p>
            {nextTasks.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: colors.textMuted }}>
                No tasks
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {nextTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: 14,
                      color: colors.textSecondary,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={task.complete}
                      disabled
                      style={{
                        width: 16,
                        height: 16,
                        marginRight: 8,
                        cursor: 'not-allowed',
                        opacity: 0.6,
                      }}
                    />
                    <span
                      style={{
                        textDecoration: task.complete ? 'line-through' : 'none',
                      }}
                    >
                      {task.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
