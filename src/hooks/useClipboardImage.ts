import { useEffect } from 'react'

/**
 * useClipboardImage — invoke `onImage(file)` when the user pastes an image.
 *
 * Safe by design:
 *  - Ignores pastes whose target is an editable field (input / textarea /
 *    contenteditable) so normal typing and the article editor are untouched.
 *  - Image-only: pastes without an image item are left alone — text paste
 *    anywhere keeps working (no global paste trap).
 *  - Gated by `enabled`; mount on ONE primary image surface per page to avoid
 *    multiple handlers double-adding the same image.
 *
 * Pass a stable `onImage` (useCallback) so the listener isn't re-attached
 * on every render.
 */
export function useClipboardImage(onImage: (file: File) => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return

    const handler = (e: ClipboardEvent) => {
      // Don't interfere with paste into text fields / the editor.
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
      }

      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            e.preventDefault()
            onImage(file)
            return
          }
        }
      }
    }

    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [onImage, enabled])
}
