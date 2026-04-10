import { useApp } from '../../context/AppContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  LayoutDashboard, BookOpen, Database, BarChart2,
  Scale, User, Cpu, HardDrive, Settings, LogOut, Activity
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'logger', label: 'Daily Logger', icon: BookOpen },
  { id: 'fooddb', label: 'Food Database', icon: Database },
  { id: 'reports', label: 'Reports', icon: BarChart2 },
  { id: 'weight', label: 'Weight Log', icon: Scale },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'planner', label: 'Meal Planner', icon: Cpu },
  { id: 'data', label: 'Data Mgmt', icon: HardDrive },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ mobile = false, onNavigate }) {
  const { activeView, setActiveView } = useApp()
  const { user, logout } = useAuth()

  const handleNav = (id) => {
    setActiveView(id)
    onNavigate?.()
  }

  return (
    <div className={`flex flex-col h-full ${mobile ? '' : 'w-64'} bg-slate-900 border-r border-slate-800`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-white leading-tight">Diet Dashboard</div>
          <div className="text-xs text-slate-500">Nutrition Tracker</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = activeView === id
          return (
            <button
              key={id}
              onClick={() => handleNav(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-400' : ''}`} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-300 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
