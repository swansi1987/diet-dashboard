export default function GlassCard({ children, className = '', onClick }) {
  return (
    <div
      className={`bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl ${onClick ? 'cursor-pointer hover:border-slate-600/50' : ''} transition-all duration-200 ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
