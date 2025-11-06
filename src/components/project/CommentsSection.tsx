import { supabase } from '@/lib/supabaseClient';
import { useState } from 'react';

type ProjectComment = {
  id: string;
  project_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  user_name?: string;
  user_type?: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  user_type: 'Owner' | 'Admin' | 'Foreman';
};

type CommentsSectionProps = {
  comments: ProjectComment[];
  setComments: (comments: ProjectComment[]) => void;
  currentUser: User | null;
  projectId: string;
};

export function CommentsSection({
  comments,
  setComments,
  currentUser,
  projectId,
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('project_comments')
        .insert([
          {
            project_id: projectId,
            user_id: currentUser.id,
            comment_text: newComment.trim(),
          },
        ])
        .select(
          `
          id,
          project_id,
          user_id,
          comment_text,
          created_at,
          users (name, user_type)
        `
        )
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        alert('Error adding comment: ' + error.message);
        return;
      }

      const newCommentObj: ProjectComment = {
        id: data.id,
        project_id: data.project_id,
        user_id: data.user_id,
        comment_text: data.comment_text,
        created_at: data.created_at,
        user_name: (data.users as any)?.name || currentUser?.name || 'Unknown',
        user_type:
          (data.users as any)?.user_type || currentUser?.user_type || 'Unknown',
      };

      setComments([newCommentObj, ...comments]);
      setNewComment('');
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Unexpected error adding comment');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      const { error } = await supabase
        .from('project_comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('Error deleting comment:', error);
        alert('Error deleting comment: ' + error.message);
        return;
      }

      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Unexpected error deleting comment');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getBadgeColor = (userType: string) => {
    switch (userType) {
      case 'Owner':
        return { bg: '#dbeafe', color: '#1e40af' };
      case 'Admin':
        return { bg: '#ede9fe', color: '#5b21b6' };
      case 'Foreman':
        return { bg: '#fed7aa', color: '#9a3412' };
      default:
        return { bg: '#f1f5f9', color: '#64748b' };
    }
  };

  return (
    <div style={{ flex: '0 0 25%' }}>
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 24,
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            margin: '0 0 16px 0',
            color: '#0f172a',
            borderBottom: '2px solid #2563eb',
            paddingBottom: 12,
          }}
        >
          Comments ({comments.length})
        </h2>

        {/* Add Comment Form */}
        <form
          onSubmit={handleAddComment}
          style={{ marginBottom: 16, flexShrink: 0 }}
        >
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            disabled={loadingComments}
            style={{
              width: '100%',
              minHeight: 80,
              padding: 12,
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical',
              marginBottom: 8,
            }}
          />
          <button
            type="submit"
            disabled={loadingComments || !newComment.trim()}
            style={{
              width: '100%',
              padding: '8px 16px',
              background:
                loadingComments || !newComment.trim() ? '#9ca3af' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor:
                loadingComments || !newComment.trim()
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {loadingComments ? 'Posting...' : 'Post Comment'}
          </button>
        </form>

        {/* Comments List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {comments.length === 0 ? (
            <p
              style={{
                color: '#9ca3af',
                fontSize: 14,
                textAlign: 'center',
                padding: 20,
              }}
            >
              No comments yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {comments.map((comment) => {
                const badgeStyle = getBadgeColor(comment.user_type || '');
                return (
                  <div
                    key={comment.id}
                    style={{
                      padding: 12,
                      background: '#f8fafc',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#0f172a',
                          }}
                        >
                          {comment.user_name || 'Unknown'}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            background: badgeStyle.bg,
                            color: badgeStyle.color,
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          {comment.user_type}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: 18,
                          padding: 0,
                        }}
                        title="Delete comment"
                      >
                        🗑️
                      </button>
                    </div>
                    <p
                      style={{
                        fontSize: 14,
                        color: '#374151',
                        margin: '0 0 8px 0',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {comment.comment_text}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: '#9ca3af',
                        margin: 0,
                      }}
                    >
                      {formatTimestamp(comment.created_at)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
