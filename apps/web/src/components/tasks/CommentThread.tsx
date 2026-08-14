import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from '../../api/index';
import { toast } from '../../stores/uiStore';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { Send, Reply, Edit2, Trash2, Smile } from 'lucide-react';
import { format } from 'date-fns';
import type { Comment, User } from '@collabo/types';

interface CommentThreadProps {
  taskId: string;
  currentUser: User | null;
}

const COMMON_EMOJIS = ['👍', '❤️', '😄', '🎉', '🚀', '👀', '✅', '💯'];

export default function CommentThread({ taskId, currentUser }: CommentThreadProps) {
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => commentsApi.list(taskId),
  });

  const createMutation = useMutation({
    mutationFn: (data: { content: string; parentId?: string }) =>
      commentsApi.create(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setCommentText('');
      setReplyingTo(null);
    },
    onError: () => toast.error('Failed to post comment'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      commentsApi.update(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: commentsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', taskId] }),
  });

  const reactionMutation = useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) =>
      commentsApi.toggleReaction(id, emoji),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', taskId] }),
  });

  const handleSubmit = (parentId?: string) => {
    const text = commentText.trim();
    if (!text) return;
    createMutation.mutate({ content: text, parentId });
  };

  const rootComments = comments.filter((c) => !c.parentId);

  return (
    <div className="space-y-4">
      {/* Comment input */}
      <div className="flex gap-3">
        <Avatar user={currentUser ?? undefined} size="sm" className="flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit(replyingTo ?? undefined);
              }
            }}
            placeholder="Add a comment... (Ctrl+Enter to submit)"
            className="input-base resize-none text-sm min-h-20"
            rows={3}
          />
          <div className="flex items-center justify-between mt-2">
            {replyingTo && (
              <button
                onClick={() => setReplyingTo(null)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Cancel reply
              </button>
            )}
            <Button
              size="sm"
              icon={Send}
              onClick={() => handleSubmit(replyingTo ?? undefined)}
              isLoading={createMutation.isPending}
              className="ml-auto"
            >
              Comment
            </Button>
          </div>
        </div>
      </div>

      {/* Comments list */}
      {rootComments.length === 0 ? (
        <p className="text-sm text-slate-600 text-center py-6">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {rootComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUser={currentUser}
              onReply={() => {
                setReplyingTo(comment.id);
              }}
              onEdit={(id, content) => {
                setEditingId(id);
                setEditText(content);
              }}
              onDelete={(id) => deleteMutation.mutate(id)}
              onReaction={(id, emoji) => reactionMutation.mutate({ id, emoji })}
              editingId={editingId}
              editText={editText}
              setEditText={setEditText}
              onSaveEdit={() => {
                if (editingId) updateMutation.mutate({ id: editingId, content: editText });
              }}
              onCancelEdit={() => setEditingId(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  currentUser,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  editingId,
  editText,
  setEditText,
  onSaveEdit,
  onCancelEdit,
}: {
  comment: Comment;
  currentUser: User | null;
  onReply: () => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onReaction: (id: string, emoji: string) => void;
  editingId: string | null;
  editText: string;
  setEditText: (t: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  const isOwn = comment.authorId === currentUser?.id;
  const isEditing = editingId === comment.id;
  const [showEmoji, setShowEmoji] = useState(false);

  // Group reactions
  const reactionGroups: Record<string, number> = {};
  comment.reactions?.forEach((r) => {
    reactionGroups[r.emoji] = (reactionGroups[r.emoji] ?? 0) + 1;
  });

  return (
    <div className="flex gap-3 group">
      <Avatar user={comment.author} size="sm" className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-medium text-slate-200">{comment.author?.name}</span>
          <span className="text-xs text-slate-500">
            {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
          </span>
          {comment.isEdited && <span className="text-xs text-slate-600">(edited)</span>}
        </div>

        {isEditing ? (
          <div>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="input-base resize-none text-sm w-full"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={onSaveEdit}>Save</Button>
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
        )}

        {/* Reactions */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(reactionGroups).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => onReaction(comment.id, emoji)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/8 hover:bg-white/15 text-xs border border-white/10 transition-colors"
              >
                {emoji} <span className="text-slate-400">{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="text-slate-600 hover:text-slate-400 transition-colors"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-6 left-0 bg-surface-700 rounded-xl border border-white/10 p-2 flex gap-1 shadow-glass z-10">
                {['👍', '❤️', '😄', '🎉', '🚀', '👀', '✅'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReaction(comment.id, emoji);
                      setShowEmoji(false);
                    }}
                    className="hover:scale-125 transition-transform text-base"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onReply}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Reply className="w-3 h-3" />
            Reply
          </button>
          {isOwn && (
            <>
              <button
                onClick={() => onEdit(comment.id, comment.content)}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </>
          )}
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 pl-4 border-l-2 border-white/8 space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUser={currentUser}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onReaction={onReaction}
                editingId={editingId}
                editText={editText}
                setEditText={setEditText}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
