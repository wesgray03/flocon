import { supabase } from '@/lib/supabaseClient';
import { Pencil, Trash2 } from 'lucide-react';
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
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Ensure we have an app-level user record linked to the current auth user
  // Returns a concrete user row from public.users or null if not available
  const ensureUser = async (): Promise<User | null> => {
    try {
      if (currentUser) return currentUser;

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return null;

      // Try to find existing app user by auth_user_id
      const { data: existingUser, error: findErr } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single();

      if (existingUser && !findErr) return existingUser as unknown as User;

      // If no user row exists, attempt to create one on the fly
      const nameFromMeta =
        (authUser.user_metadata &&
          (authUser.user_metadata.name || authUser.user_metadata.full_name)) ||
        authUser.email ||
        'New User';

      const insertPayload = {
        auth_user_id: authUser.id,
        name: nameFromMeta as string,
        email: (authUser.email as string) || '',
        user_type: 'Admin' as const,
      };

      const { data: createdUser, error: createErr } = await supabase
        .from('users')
        .insert([insertPayload])
        .select('*')
        .single();

      if (createErr) {
        console.warn('Failed to auto-create user row:', createErr.message);
        return null;
      }

      return createdUser as unknown as User;
    } catch (err) {
      console.error('ensureUser error:', err);
      return null;
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    // Make sure we have a valid users.id to reference
    const user = await ensureUser();
    if (!user) {
      alert(
        'Your account is not linked to an app user yet. Please sign out/in, or contact an admin to create a user record.'
      );
      return;
    }

    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('project_comments')
        .insert([
          {
            project_id: projectId,
            user_id: user.id,
            comment_text: newComment.trim(),
          },
        ])
        .select('id, project_id, user_id, comment_text, created_at')
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        alert('Error adding comment: ' + error.message);
        return;
      }

      // Use the user object we already have from ensureUser()
      const newCommentObj: ProjectComment = {
        id: data.id,
        project_id: data.project_id,
        user_id: data.user_id,
        comment_text: data.comment_text,
        created_at: data.created_at,
        user_name: user.name,
        user_type: user.user_type,
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

  const startEditComment = (comment: ProjectComment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.comment_text);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const saveEditComment = async (commentId: string) => {
    if (!editingText.trim()) return;

    try {
      const { error } = await supabase
        .from('project_comments')
        .update({ comment_text: editingText.trim() })
        .eq('id', commentId);

      if (error) {
        console.error('Error updating comment:', error);
        alert('Error updating comment: ' + error.message);
        return;
      }

      setComments(
        comments.map((c) =>
          c.id === commentId ? { ...c, comment_text: editingText.trim() } : c
        )
      );
      setEditingCommentId(null);
      setEditingText('');
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Unexpected error updating comment');
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
          background: '#faf8f5',
          borderRadius: 8,
          padding: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
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
            borderBottom: '2px solid #1e3a5f',
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
              border: '1px solid #e5dfd5',
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
                loadingComments || !newComment.trim() ? '#9ca3af' : '#1e3a5f',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {comments.map((comment) => {
                const badgeStyle = getBadgeColor(comment.user_type || '');
                const isOwnComment =
                  currentUser && comment.user_id === currentUser.id;

                const isEditing = editingCommentId === comment.id;

                return (
                  <div
                    key={comment.id}
                    style={{
                      padding: 10,
                      background: '#f0ebe3',
                      borderRadius: 6,
                      border: '1px solid #e5dfd5',
                      fontSize: 13,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#0f172a',
                          }}
                        >
                          {comment.user_name || 'Unknown'}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            background: badgeStyle.bg,
                            color: badgeStyle.color,
                            padding: '2px 6px',
                            borderRadius: 3,
                          }}
                        >
                          {comment.user_type}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: '#9ca3af',
                          }}
                        >
                          {formatTimestamp(comment.created_at)}
                        </span>
                      </div>
                      {isOwnComment && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          {!isEditing && (
                            <>
                              <button
                                onClick={() => startEditComment(comment)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                  padding: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="Edit comment"
                                aria-label="Edit comment"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="Delete comment"
                                aria-label="Delete comment"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div>
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          style={{
                            width: '100%',
                            padding: 8,
                            border: '1px solid #e5dfd5',
                            borderRadius: 4,
                            fontSize: 13,
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            minHeight: 60,
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button
                            onClick={() => saveEditComment(comment.id)}
                            style={{
                              padding: '4px 12px',
                              background: '#1e3a5f',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              fontSize: 12,
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            style={{
                              padding: '4px 12px',
                              background: '#ebe5db',
                              color: '#0f172a',
                              border: 'none',
                              borderRadius: 4,
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p
                        style={{
                          fontSize: 13,
                          color: '#374151',
                          margin: 0,
                          lineHeight: 1.4,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {comment.comment_text}
                      </p>
                    )}
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
