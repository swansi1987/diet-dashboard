import Modal from './Modal.jsx'
import GradientButton from './GradientButton.jsx'

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title = 'Confirm', message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="p-6 space-y-4">
        <p className="text-slate-300">{message}</p>
        <div className="flex gap-3 justify-end">
          <GradientButton variant="ghost" onClick={onClose}>Cancel</GradientButton>
          <GradientButton variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose() }}>
            {confirmLabel}
          </GradientButton>
        </div>
      </div>
    </Modal>
  )
}
