import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import ErrorBanner from '../ui/ErrorBanner.jsx'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'
import { Activity, ArrowRight } from 'lucide-react'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function LoginScreen() {
  const { login, register, googleLogin } = useAuth()
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const googleBtnRef = useRef(null)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google) return
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        setGoogleLoading(true)
        setError(null)
        try {
          await googleLogin(credential)
        } catch (err) {
          setError(err.response?.data?.error || 'Google sign-in failed')
        } finally {
          setGoogleLoading(false)
        }
      },
    })
    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_black', size: 'large',
        width: googleBtnRef.current.offsetWidth || 400,
        text: tab === 'login' ? 'signin_with' : 'signup_with',
      })
    }
  }, [tab, googleLogin])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const user = tab === 'login' ? await login(email, password) : await register(email, password)
      if (!user) setError('Server returned an unexpected response. Please try again.')
    } catch (err) {
      if (err.response?.data?.error) setError(err.response.data.error)
      else if (err.response?.status) setError(`Server error (${err.response.status}). Please try again.`)
      else if (err.request) setError('Cannot reach the server. Please check your connection.')
      else setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--bg-base)', fontFamily: 'var(--font)' }}
    >
      {/* Left brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 w-[440px] shrink-0"
        style={{ background: 'linear-gradient(155deg, #00D2B4 0%, #0088CC 50%, #7C6FFF 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Activity size={18} color="#fff" />
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>NutriFlex</span>
        </div>

        <div>
          <h2 style={{ color: '#fff', fontSize: '34px', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            Track every meal.<br />Own your health.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', marginTop: '16px', fontSize: '15px', lineHeight: 1.7 }}>
            A complete nutrition platform — from daily logs and macro tracking to weight trends and meal planning.
          </p>

          <div className="flex flex-col gap-3 mt-10">
            {[
              'Smart macro & calorie tracking',
              'Protein intake gauge by bodyweight',
              'Detailed micronutrient reports',
              'Full data import & export',
            ].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
          Self-hosted · Your data stays on your server
        </p>
      </div>

      {/* Right form panel */}
      <div 
        className="flex-1 flex items-center justify-center p-6" 
        style={{ 
          background: '#ffffff',
          '--text-primary': '#0F1623',
          '--text-secondary': '#4B5770',
          '--text-muted': '#8892A4',
          '--bg-surface-2': '#F4F7FB',
          '--border': 'rgba(0, 0, 0, 0.08)'
        }}
      >
        <div className="w-full" style={{ maxWidth: '400px' }}>

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--brand), #0088CC)', boxShadow: '0 4px 16px var(--brand-glow)' }}
            >
              <Activity size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>NutriFlex</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nutritional and Workout Tracker</div>
            </div>
          </div>

          <h1
            style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '6px' }}
          >
            {tab === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px' }}>
            {tab === 'login' ? 'Sign in to your NutriFlex' : 'Start your nutrition journey today'}
          </p>

          {/* Tab switcher */}
          <div
            className="flex mb-6 p-1 rounded-xl"
            style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}
          >
            {[['login', 'Sign In'], ['register', 'Create Account']].map(([t, label]) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null) }}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  color: tab === t ? '#fff' : 'var(--text-muted)',
                  background: tab === t ? 'linear-gradient(135deg, var(--brand), #0088CC)' : 'transparent',
                  boxShadow: tab === t ? '0 2px 8px var(--brand-glow)' : 'none',
                  fontWeight: tab === t ? 600 : 500,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="input-field"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="input-field"
              />
              {tab === 'register' && (
                <p style={{ marginTop: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>Minimum 6 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg w-full mt-2"
              style={{ justifyContent: 'center' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="xs" />
                  {tab === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {tab === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={15} />
                </span>
              )}
            </button>
          </form>

          {/* Google Sign In */}
          {GOOGLE_CLIENT_ID && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>or continue with</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
              {googleLoading ? (
                <div className="flex justify-center py-2"><LoadingSpinner size="sm" /></div>
              ) : (
                <div ref={googleBtnRef} className="w-full flex justify-center" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
