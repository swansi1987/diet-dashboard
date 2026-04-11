export default function GradientButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
}) {
  const sizes = { xs: 'btn-xs', sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' }
  const variants = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    ghost:     'btn-ghost',
    danger:    'btn-danger',
    success:   'btn-success',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variants[variant] || 'btn-primary'} ${sizes[size] || 'btn-md'} ${className}`}
    >
      {children}
    </button>
  )
}
