import Modal from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width="sm"
      footer={
        <>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={
              destructive
                ? 'px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors'
                : 'px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors'
            }
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-secondary">{message}</p>
    </Modal>
  )
}
