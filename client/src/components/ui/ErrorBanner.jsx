import { AlertCircle, X } from 'lucide-react'
import { useState } from 'react'

export default function ErrorBanner({ message, onDismiss }) {
  const [visible, setVisible] = useState(true)
  if (!message || !visible) return null
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-red-900/30 border border-red-700/50 rounded-xl text-red-300 text-sm animate-fade-in">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        onClick={() => { setVisible(false); onDismiss?.() }}
        className="text-red-400 hover:text-red-200 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
