import { useRef, useState } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { useCommentStore } from '@/store/useCommentStore'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getUserById } from '@/auth/users'
import { formatDateTime, cn } from '@/lib/utils'
import type { CommentEntityType } from '@/types/common'

// ─── Props ────────────────────────────────────────────────────────────────────

interface CommentThreadProps {
  entityType: CommentEntityType
  entityId: string
  /**
   * The project that owns this entity.  Required for Supabase sync
   * (comments.project_id FK).  Pass the project's UUID string.
   */
  projectId: string
  /** Optional extra className on the outer wrapper */
  className?: string
}

// ─── Single comment bubble ────────────────────────────────────────────────────

function CommentBubble({
  comment,
  isOwn,
  onRemove,
}: {
  comment: { id: string; authorUserId: string; body: string; createdAt: string }
  isOwn: boolean
  onRemove: () => void
}) {
  const author = getUserById(comment.authorUserId)
  const name   = author?.name ?? 'Unknown'
  const initials = author?.initials ?? '?'
  const avatarColor = author?.avatarColor ?? '#888'

  return (
    <div className="flex items-start gap-2 group">
      {/* Avatar */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-2xs font-bold shrink-0 mt-0.5"
        style={{ backgroundColor: avatarColor }}
        title={name}
      >
        {initials}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-ink">{name}</span>
          <span className="text-2xs text-ink-faint">{formatDateTime(comment.createdAt)}</span>
        </div>
        <p className="text-xs text-ink-secondary mt-0.5 leading-relaxed whitespace-pre-wrap break-words">
          {comment.body}
        </p>
      </div>

      {/* Delete — own comments only, on hover */}
      {isOwn && (
        <button
          onClick={onRemove}
          title="Delete comment"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-faint hover:text-red-500 shrink-0 mt-0.5"
        >
          <Trash2 size={11} />
        </button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CommentThread({ entityType, entityId, projectId, className }: CommentThreadProps) {
  const comments    = useCommentStore((s) => s.getFor(entityType, entityId))
  const addComment  = useCommentStore((s) => s.addComment)
  const removeComment = useCommentStore((s) => s.removeComment)

  const { user } = useCurrentUser()

  const [body, setBody] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handlePost = () => {
    const trimmed = body.trim()
    if (!trimmed || !user) return
    addComment({ projectId, entityType, entityId, authorUserId: user.id, body: trimmed })
    setBody('')
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to post
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handlePost()
    }
  }

  return (
    <div className={cn('space-y-3', className)}>

      {/* ── Comment list ─────────────────────────────────────────────── */}
      {comments.length === 0 ? (
        <p className="text-xs text-ink-faint italic">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <CommentBubble
              key={c.id}
              comment={c}
              isOwn={!!user && c.authorUserId === user.id}
              onRemove={() => removeComment(c.id)}
            />
          ))}
        </div>
      )}

      {/* ── New comment input ─────────────────────────────────────────── */}
      {user ? (
        <div className="flex items-end gap-2 pt-2 border-t border-surface-2">
          {/* Mini avatar */}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-2xs font-bold shrink-0"
            style={{ backgroundColor: user.avatarColor }}
          >
            {user.initials}
          </div>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment… (⌘↵ to post)"
              rows={2}
              className="w-full text-xs border border-surface-3 rounded px-2.5 py-1.5 bg-white resize-none focus:outline-none focus:border-accent placeholder:text-ink-faint"
            />
          </div>

          <button
            onClick={handlePost}
            disabled={!body.trim()}
            title="Post comment"
            className="shrink-0 p-1.5 rounded bg-accent text-white hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-default"
          >
            <Send size={11} />
          </button>
        </div>
      ) : (
        <p className="text-2xs text-ink-faint pt-2 border-t border-surface-2">
          Log in (top bar) to add a comment.
        </p>
      )}
    </div>
  )
}
