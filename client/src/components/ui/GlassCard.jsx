export default function GlassCard({ children, className = '', onClick, variant = 'default' }) {
  const base = 'card transition-all duration-200'
  const variants = {
    default: '',
    elevated: 'shadow-sm',
    hover: 'card-hover cursor-pointer',
    flat: 'border-0 shadow-none',
  }
  return (
    <div
      className={`${base} ${variants[variant] || ''} ${onClick ? 'card-hover cursor-pointer' : ''} ${className}`}
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
