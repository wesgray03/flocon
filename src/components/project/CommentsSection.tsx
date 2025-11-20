import { supabase } from '@/lib/supabaseClient';
import { colors } from '@/styles/theme';
import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type ProjectComment = {
  id: string;
  engagement_id: string;
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
  user_type: 'Admin' | 'Office' | 'Field';
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
  const [isFollowUp, setIsFollowUp] = useState(false);

  // Mention functionality state
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load all users for mentions
  useEffect(() => {
    const loadUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, user_type')
        .order('name');

      if (!error && data) {
        setAllUsers(data as User[]);
      }
    };
    loadUsers();
  }, []);

  // Detect @ mentions in text
  const handleCommentChange = (
    value: string,
    textarea?: HTMLTextAreaElement
  ) => {
    setNewComment(value);

    const cursorPos = textarea?.selectionStart ?? value.length;

    // Find the last @ before cursor
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);

      // Check if we're still in the same word (no spaces after @)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
        return;
      }
    }

    setShowMentions(false);
    setMentionSearch('');
  };

  // Filter users based on mention search
  const filteredUsers = allUsers.filter((user) =>
    user.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  // Insert mention into text
  const insertMention = (user: User) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = newComment;
    const cursorPos = textarea.selectionStart;

    // Find the @ symbol before cursor
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const beforeAt = text.substring(0, lastAtIndex);
      const afterCursor = text.substring(cursorPos);
      const newText = `${beforeAt}@${user.name} ${afterCursor}`;

      setNewComment(newText);
      setShowMentions(false);
      setMentionSearch('');

      // Set cursor position after the mention
      setTimeout(() => {
        const newCursorPos = lastAtIndex + user.name.length + 2;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    }
  };

  // Extract mentioned users from comment text
  const extractMentions = (text: string): string[] => {
    // Match @FirstName LastName (up to 2 words, stops at non-word chars except space)
    const mentionRegex = /@(\w+(?:\s\w+)?)\b/g;
    const matches = text.matchAll(mentionRegex);
    const mentionedNames: string[] = [];

    for (const match of matches) {
      mentionedNames.push(match[1]);
    }

    return mentionedNames;
  };

  // Get user IDs from names
  const getUserIdsByNames = (names: string[]): string[] => {
    return names
      .map((name) => {
        const user = allUsers.find((u) => u.name === name);
        return user?.id;
      })
      .filter((id): id is string => id !== undefined);
  };

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
      // Extract mentions from comment text
      const mentionedNames = extractMentions(newComment);
      const mentionedUserIds = getUserIdsByNames(mentionedNames);

      const { data, error } = await supabase
        .from('engagement_comments')
        .insert([
          {
            engagement_id: projectId,
            user_id: user.id,
            comment_text: newComment.trim(),
            is_follow_up: isFollowUp,
          },
        ])
        .select('id, engagement_id, user_id, comment_text, created_at')
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        alert('Error adding comment: ' + error.message);
        return;
      }

      // Store mentions in comment_mentions table
      if (mentionedUserIds.length > 0) {
        const mentionsToInsert = mentionedUserIds.map((userId) => ({
          comment_id: data.id,
          mentioned_user_id: userId,
        }));

        const { error: mentionsError } = await supabase
          .from('comment_mentions')
          .insert(mentionsToInsert);

        if (mentionsError) {
          console.error('Error storing mentions:', mentionsError);
          // Don't block comment posting if mentions fail
        } else {
          // Send email notifications asynchronously (don't wait for it)
          // Only send if we have a valid project ID
          if (projectId && projectId !== 'undefined') {
            // Fetch project name for notification
            const { data: projectData } = await supabase
              .from('engagements')
              .select('name')
              .eq('id', projectId)
              .single();

            supabase.functions
              .invoke('notify-mention', {
                body: {
                  comment_id: data.id,
                  mentioned_user_ids: mentionedUserIds,
                  commenter_name: user.name,
                  project_name: projectData?.name || 'Project',
                  engagement_id: projectId,
                  comment_text: newComment.trim(),
                },
              })
              .catch((err) => console.error('Email notification error:', err));
          } else {
            console.warn(
              'Skipping mention notification: invalid project ID',
              projectId
            );
          }
        }
      }

      // Use the user object we already have from ensureUser()
      const newCommentObj: ProjectComment = {
        id: data.id,
        engagement_id: data.engagement_id,
        user_id: data.user_id,
        comment_text: data.comment_text,
        created_at: data.created_at,
        user_name: user.name,
        user_type: user.user_type,
      };

      setComments([newCommentObj, ...comments]);
      setNewComment('');
      setIsFollowUp(false);

      // Update engagement's last_call if this is a follow-up
      if (isFollowUp) {
        const { error: lastCallError } = await supabase
          .from('engagements')
          .update({ last_call: new Date().toISOString().split('T')[0] })
          .eq('id', projectId);

        if (lastCallError) {
          console.error('Error updating last_call:', lastCallError);
        }
      }
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
        .from('engagement_comments')
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
        .from('engagement_comments')
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
        return { bg: '#e0e7ee', color: '#1e40af' };
      case 'Admin':
        return { bg: '#e0e7ee', color: '#5b21b6' };
      case 'Foreman':
        return { bg: '#ebe5db', color: '#9a3412' };
      default:
        return { bg: '#f0ebe3', color: colors.textSecondary };
    }
  };

  // Render comment text with highlighted mentions
  const renderCommentWithMentions = (text: string) => {
    // Match @FirstName LastName (up to 2 words, stops at non-word chars except space)
    const mentionRegex = /@(\w+(?:\s\w+)?)\b/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    const matches = text.matchAll(mentionRegex);
    for (const match of matches) {
      const matchIndex = match.index!;

      // Add text before mention
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      // Add highlighted mention
      parts.push(
        <span
          key={matchIndex}
          style={{
            background: '#e0e7ee',
            color: '#1e40af',
            padding: '2px 4px',
            borderRadius: 3,
            fontWeight: 600,
          }}
        >
          {match[0]}
        </span>
      );

      lastIndex = matchIndex + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
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
            color: colors.textPrimary,
            borderBottom: '2px solid #1e3a5f',
            paddingBottom: 12,
          }}
        >
          Comments ({comments.length})
        </h2>

        {/* Add Comment Form */}
        <form
          onSubmit={handleAddComment}
          style={{ marginBottom: 16, flexShrink: 0, position: 'relative' }}
        >
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => handleCommentChange(e.target.value, e.target)}
            onKeyDown={(e) => {
              // Close mentions dropdown on Escape
              if (e.key === 'Escape' && showMentions) {
                setShowMentions(false);
                e.preventDefault();
              }
              // Navigate mentions with arrow keys
              if (
                showMentions &&
                (e.key === 'ArrowDown' || e.key === 'ArrowUp')
              ) {
                e.preventDefault();
                // TODO: Add keyboard navigation
              }
            }}
            placeholder="Add a comment... (use @ to mention someone)"
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

          {/* Follow-up Checkbox */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              id="is-follow-up"
              checked={isFollowUp}
              onChange={(e) => setIsFollowUp(e.target.checked)}
              style={{
                width: 16,
                height: 16,
                cursor: 'pointer',
              }}
            />
            <label
              htmlFor="is-follow-up"
              style={{
                fontSize: 13,
                color: colors.textPrimary,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Mark as follow-up (updates last contact date)
            </label>
          </div>

          {/* Mentions Dropdown */}
          {showMentions && filteredUsers.length > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: 4,
                background: '#fff',
                border: '1px solid #e5dfd5',
                borderRadius: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                maxHeight: 200,
                overflowY: 'auto',
                zIndex: 1000,
              }}
            >
              {filteredUsers.slice(0, 5).map((user) => (
                <div
                  key={user.id}
                  onClick={() => insertMention(user)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderBottom: '1px solid #f0ebe3',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0ebe3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 13 }}>
                    {user.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      background: '#e0e7ee',
                      color: '#1e40af',
                      padding: '2px 6px',
                      borderRadius: 3,
                    }}
                  >
                    {user.user_type}
                  </span>
                </div>
              ))}
            </div>
          )}

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
                color: colors.textMuted,
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
                            color: colors.textPrimary,
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
                            color: colors.textMuted,
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
                                  color: colors.textSecondary,
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
                                  color: colors.logoRed,
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
                              color: colors.textPrimary,
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
                        {renderCommentWithMentions(comment.comment_text)}
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
