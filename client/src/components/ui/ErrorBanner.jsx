import { AlertCircle, X } from 'lucide-react'

export default function ErrorBanner({ message, onDismiss, variant = 'error' }) {
  if (!message) return null
  return (
    <div className={`alert alert-${variant} animate-fade-in`} role="alert">
      <AlertCircle size={15} className="shrink-0 mt-0.5" />
      <span className="flex-1 text-sm">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="btn-icon shrink-0 -m-1"
          aria-label="Dismiss"
          style={{ padding: '3px' }}
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
