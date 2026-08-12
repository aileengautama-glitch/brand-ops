/**
 * Shown instead of the Approvals page to roles that have no business there.
 *
 * The nav entry is hidden too — this exists so a bookmarked or pasted URL doesn't
 * expose the queue, not as a UI people are meant to reach.
 */
import { ShieldCheck } from 'lucide-react'

export default function ApprovalsNoAccess() {
  return (
    <div className="p-6 max-w-3xl">
      <div className="text-center py-14">
        <ShieldCheck size={28} className="mx-auto mb-3 text-ink-faint opacity-30" />
        <p className="text-sm font-medium text-ink-muted">Approvals aren’t part of your role</p>
        <p className="text-xs text-ink-faint mt-1">
          Approvals are raised by the Art Director or Producer and signed off by the Head of Marketing.
        </p>
      </div>
    </div>
  )
}
