const SIZES = { xs: 14, sm: 18, md: 28, lg: 40 }

export function LoadingSpinner({ size = 'md', className = '' }) {
  const px = SIZES[size] || SIZES.md
  return (
    <svg
      className={className}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 0.7s linear infinite' }}
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="10" stroke="var(--border)" strokeWidth="2.5" />
      <path
        d="M12 2 A10 10 0 0 1 22 12"
        stroke="var(--brand)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function FullPageSpinner() {
  return (
    <div
      className="flex items-center justify-center h-screen"
      style={{ background: 'var(--bg-base)' }}
    >
      <LoadingSpinner size="lg" />
    </div>
  )
}

export default LoadingSpinner
