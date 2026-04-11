import { useApp } from '../../context/AppContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  LayoutDashboard, BookOpen, Database, BarChart2,
  Scale, User, Cpu, HardDrive, Settings, LogOut, Activity
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'logger',    label: 'Daily Logger',  icon: BookOpen },
  { id: 'fooddb',    label: 'Food Database', icon: Database },
  { id: 'reports',   label: 'Reports',       icon: BarChart2 },
  { id: 'weight',    label: 'Weight Log',    icon: Scale },
  { id: 'profile',   label: 'Profile',       icon: User },
  { id: 'planner',   label: 'Meal Planner',  icon: Cpu },
  { id: 'data',      label: 'Data Mgmt',     icon: HardDrive },
  { id: 'settings',  label: 'Settings',      icon: Settings },
]

export default function Sidebar({ mobile = false, onNavigate }) {
  const { activeView, setActiveView } = useApp()
  const { user, logout } = useAuth()

  const handleNav = (id) => {
    setActiveView(id)
    onNavigate?.()
  }

  const initials = user?.email?.[0]?.toUpperCase() || '?'

  return (
    <div
      className={`flex flex-col h-full ${mobile ? 'w-64' : 'w-56'} shrink-0`}
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--brand) 0%, #00A8F3 100%)', boxShadow: '0 2px 10px var(--brand-glow)' }}
        >
          <Activity size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            NutriFlex
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
            Nutritional and Workout Tracker
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = activeView === id
          return (
            <button
              key={id}
              onClick={() => handleNav(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
              style={{
                fontSize: '13.5px',
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--brand)' : 'var(--text-secondary)',
                background: active ? 'var(--brand-glow)' : 'transparent',
                borderLeft: active ? '3px solid var(--brand)' : '3px solid transparent',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-surface-2)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={15} style={{ color: active ? 'var(--brand)' : 'var(--text-muted)', shrink: 0 }} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-3 pb-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-xl" style={{ background: 'var(--bg-surface-2)' }}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white"
            style={{
              background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }} className="truncate">
              {user?.email}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150"
          style={{ fontSize: '13px', color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.08)'; e.currentTarget.style.color = 'var(--danger)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
