import { AlertTriangle } from 'lucide-react'
import GradientButton from './GradientButton.jsx'
import Modal from './Modal.jsx'

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="p-6 space-y-5">
        {danger && (
          <div className="alert alert-warning">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span className="text-sm">{message}</span>
          </div>
        )}
        {!danger && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>{message}</p>
        )}
        <div className="flex justify-end gap-2">
          <GradientButton variant="ghost" size="sm" onClick={onClose}>Cancel</GradientButton>
          <GradientButton variant={danger ? 'danger' : 'primary'} size="sm" onClick={handleConfirm}>
            {confirmLabel}
          </GradientButton>
        </div>
      </div>
    </Modal>
  )
}
