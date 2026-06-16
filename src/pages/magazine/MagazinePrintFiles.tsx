import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Upload, FileText, Download, Trash2, Star, FileCheck } from 'lucide-react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { useCurrentMagazineProject } from '@/hooks/useCurrentProject'
import { saveFile, getFileBlob, deleteFile } from '@/lib/db'
import { generateId, cn, formatDate } from '@/lib/utils'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { PrintFile } from '@/types/magazine'

// ─────────────────────────────────────────────────────────────────────────────
// Magazine — Ready-to-print / final files area.
//
// PDF-first. File bytes live in the IndexedDB `files` store (keyed by the
// PrintFile.id); metadata lives on the project (`printFiles`). PDFs preview in
// an <iframe> via an object URL; other types stay listed + downloadable. Local
// to the magazine module; project-level access (anyone who can view the issue).
// ─────────────────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const isPdf = (f: PrintFile) =>
  f.mimeType === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')

/** Trigger a browser download of a stored file (object URL revoked after click). */
async function downloadStoredFile(file: PrintFile) {
  const blob = await getFileBlob(file.id)
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name || 'file'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ─── Inline PDF preview ───────────────────────────────────────────────────────

function FilePreview({ file }: { file: PrintFile }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    setUrl(null)
    getFileBlob(file.id).then((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [file.id])

  if (!isPdf(file)) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-[72vh] card-soft">
        <FileText size={28} className="text-ink-faint mb-3" />
        <p className="text-sm text-ink-muted mb-1">{file.name}</p>
        <p className="text-xs text-ink-faint mb-4">Inline preview isn't available for this file type.</p>
        <button
          onClick={() => downloadStoredFile(file)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
        >
          <Download size={13} /> Download to view
        </button>
      </div>
    )
  }

  if (!url) {
    return (
      <div className="flex items-center justify-center h-[72vh] card-soft text-xs text-ink-faint">
        Loading preview…
      </div>
    )
  }

  return (
    <iframe
      title={file.name}
      src={url}
      className="w-full h-[72vh] rounded-xl border border-surface-3 bg-white"
    />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MagazinePrintFiles() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentMagazineProject()
  const updateProject        = useMagazineStore((s) => s.updateProject)
  const addPrintFile         = useMagazineStore((s) => s.addPrintFile)
  const removePrintFile      = useMagazineStore((s) => s.removePrintFile)
  const setCurrentPrintFile  = useMagazineStore((s) => s.setCurrentPrintFile)

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<PrintFile | null>(null)

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const files = [...(project.printFiles ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  const current = files.find((f) => f.isCurrent) ?? null
  const selected = files.find((f) => f.id === selectedId) ?? current ?? files[0] ?? null

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(list)) {
        const fid = generateId()
        await saveFile(fid, file)
        addPrintFile(id, { id: fid, name: file.name, mimeType: file.type, sizeBytes: file.size })
        setSelectedId(fid)
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRemove = async (file: PrintFile) => {
    removePrintFile(id, file.id)
    await deleteFile(file.id)          // drop the IndexedDB blob too
    if (selectedId === file.id) setSelectedId(null)
  }

  return (
    <div className="p-6 max-w-5xl">
      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
        actions={
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-50"
          >
            <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload file'}
          </button>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {files.length === 0 ? (
        <div className="card-soft p-12 text-center">
          <FileCheck size={28} className="text-ink-faint mx-auto mb-3" />
          <p className="text-sm text-ink-muted mb-1">No final files yet</p>
          <p className="text-xs text-ink-faint mb-4">
            Upload the print-ready PDF(s) for this issue. The first file becomes the current asset.
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors mx-auto"
          >
            <Upload size={13} /> Upload PDF
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
          {/* ── File list ─────────────────────────────────────────────────── */}
          <PageSection label={`Files — ${files.length}`} card>
            <div className="space-y-1.5">
              {files.map((f) => {
                const active = selected?.id === f.id
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedId(f.id)}
                    className={cn(
                      'group rounded-lg border p-2.5 cursor-pointer transition-colors',
                      active ? 'border-accent/50 bg-accent/[0.06]' : 'border-surface-2 hover:bg-surface-1',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <FileText size={15} className="text-ink-faint shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink truncate" title={f.name}>{f.name}</p>
                        <p className="text-2xs text-ink-faint mt-0.5">
                          {formatSize(f.sizeBytes)} · {formatDate(f.createdAt, 'dd MMM yyyy')}
                        </p>
                        {f.isCurrent && (
                          <span className="inline-flex items-center gap-1 mt-1 text-2xs font-bold uppercase tracking-widest text-accent">
                            <Star size={10} className="fill-accent" /> Current
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Row actions */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-surface-2">
                      {!f.isCurrent && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setCurrentPrintFile(id, f.id) }}
                          className="text-2xs text-ink-muted hover:text-accent transition-colors"
                        >
                          Set as current
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadStoredFile(f) }}
                        className="flex items-center gap-1 text-2xs text-ink-muted hover:text-ink transition-colors ml-auto"
                      >
                        <Download size={11} /> Download
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmRemove(f) }}
                        className="flex items-center gap-1 text-2xs text-ink-faint hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 pt-2.5 border-t border-surface-2 text-2xs text-ink-faint">
              PDFs preview in-app. To replace the current asset, upload a new file and mark it current.
            </p>
          </PageSection>

          {/* ── Preview ───────────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">
                Preview{selected ? ` — ${selected.name}` : ''}
              </h2>
              {selected?.isCurrent && (
                <span className="text-2xs font-medium text-accent">Current print-ready asset</span>
              )}
            </div>
            {selected ? (
              <FilePreview file={selected} />
            ) : (
              <div className="flex items-center justify-center h-[72vh] card-soft text-xs text-ink-faint">
                Select a file to preview.
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove file"
        message={`Remove "${confirmRemove?.name}"? This deletes the stored file and cannot be undone.`}
        confirmLabel="Remove"
        onConfirm={() => { if (confirmRemove) handleRemove(confirmRemove); setConfirmRemove(null) }}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  )
}
