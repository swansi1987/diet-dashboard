export default function GradientButton({ children, onClick, type = 'button', disabled = false, variant = 'primary', size = 'md', className = '' }) {
  const variants = {
    primary: 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white',
    danger: 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 text-white',
    ghost: 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 border border-slate-600',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]} ${sizes[size]}
        rounded-xl font-medium transition-all duration-200
        hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        focus:outline-none focus:ring-2 focus:ring-emerald-500/50
        ${className}
      `}
    >
      {children}
    </button>
  )
}
