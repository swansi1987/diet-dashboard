import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import GradientButton from '../ui/GradientButton.jsx'
import { addDays, todayISO } from '../../utils/dateUtils.js'

export default function CopyMealModal({ isOpen, onClose, onCopy, logCount }) {
  const [targetDate, setTargetDate] = useState(addDays(todayISO(), 1))
  const [copying, setCopying] = useState(false)

  const handleCopy = async () => {
    setCopying(true)
    try {
      await onCopy(targetDate)
      onClose()
    } finally { setCopying(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Copy Meals to Another Date" size="sm">
      <div className="p-6 space-y-4">
        <p className="text-sm text-slate-400">
          Copy {logCount} selected meal{logCount !== 1 ? 's' : ''} to:
        </p>
        <input
          type="date"
          className="input-field"
          value={targetDate}
          onChange={e => setTargetDate(e.target.value)}
          min={todayISO()}
        />
        <div className="flex justify-end gap-3">
          <GradientButton variant="ghost" onClick={onClose}>Cancel</GradientButton>
          <GradientButton onClick={handleCopy} disabled={copying}>
            {copying ? 'Copying...' : 'Copy Meals'}
          </GradientButton>
        </div>
      </div>
    </Modal>
  )
}
