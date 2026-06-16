import { useState } from 'react'
import { Link2, Check } from 'lucide-react'
import { useShareStore } from '@/store/useShareStore'
import type { ShareModule, DeckType } from '@/store/useShareStore'
import { cn } from '@/lib/utils'

interface CopyShareLinkButtonProps {
  module: ShareModule
  projectId: string
  deckType: DeckType
  className?: string
}

/**
 * Generates (or reuses) a share token and copies the shareable URL to clipboard.
 * Shows a brief "Copied!" confirmation state.
 */
export default function CopyShareLinkButton({
  module,
  projectId,
  deckType,
  className,
}: CopyShareLinkButtonProps) {
  const getOrCreateToken = useShareStore((s) => s.getOrCreateToken)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const token = getOrCreateToken(module, projectId, deckType)
    const path = `/share/${module}/${token}/${deckType}`
    const url = `${window.location.origin}${path}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded transition-colors',
        copied
          ? 'border-green-300 bg-green-50 text-green-700'
          : 'border-surface-3 text-ink-secondary hover:bg-surface-1',
        className
      )}
      title="Copy shareable link — anyone with this URL can view the read-only deck"
    >
      {copied ? <Check size={13} /> : <Link2 size={13} />}
      {copied ? 'Link copied!' : 'Copy share link'}
    </button>
  )
}
