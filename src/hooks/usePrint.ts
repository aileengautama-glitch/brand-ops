/**
 * usePrint — per-artefact print orientation helper.
 *
 * CSS @page is a document-level rule; it cannot be scoped to a selector. This hook
 * works around that by injecting a <style> tag with the desired orientation just
 * before the browser opens the print dialog, then removing it when printing finishes
 * (via the afterprint event). This is the most reliable cross-browser approach.
 *
 * Usage:
 *   const triggerPrint = usePrint('landscape')
 *   <button onClick={triggerPrint}>Print</button>
 */
import { useCallback } from 'react'

type Orientation = 'portrait' | 'landscape'

const STYLE_ID = 'brand-ops-print-orientation'

export function usePrint(orientation: Orientation = 'portrait', opts?: { margin?: string }) {
  const margin = opts?.margin
  return useCallback(() => {
    // Remove any previously-injected style (safety)
    document.getElementById(STYLE_ID)?.remove()

    const style = document.createElement('style')
    style.id = STYLE_ID
    // A later @page rule overrides print.css's default margin for this artefact only.
    // Decks pass margin:'0' so each fixed A4 .deck-page maps 1:1 onto the sheet (WYSIWYG).
    style.textContent = `@page { size: A4 ${orientation};${margin !== undefined ? ` margin: ${margin};` : ''} }`
    document.head.appendChild(style)

    const cleanup = () => {
      document.getElementById(STYLE_ID)?.remove()
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)

    window.print()
  }, [orientation, margin])
}
