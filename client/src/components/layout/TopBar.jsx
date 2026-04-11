import { ChevronLeft, ChevronRight, Calendar, Menu, Sun, Moon } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { addDays, subtractDays, formatDateFull, todayISO } from '../../utils/dateUtils.js'

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  logger:    'Daily Logger',
  fooddb:    'Food Database',
  reports:   'Reports',
  weight:    'Weight Log',
  profile:   'Profile',
  planner:   'Meal Planner',
  data:      'Data Management',
  settings:  'Settings',
}

export default function TopBar({ onMenuClick }) {
  const { selectedDate, setSelectedDate, activeView } = useApp()
  const { theme, toggleTheme } = useTheme()
  const showDateNav = ['dashboard', 'logger'].includes(activeView)

  return (
    <header
      className="flex items-center justify-between px-4 md:px-6 shrink-0"
      style={{
        height: '56px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Left: hamburger + date nav */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="btn-icon md:hidden"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        {showDateNav ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedDate(subtractDays(selectedDate, 1))}
              className="btn-icon"
              aria-label="Previous day"
            >
              <ChevronLeft size={16} />
            </button>

            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}
            >
              <Calendar size={13} style={{ color: 'var(--brand)' }} />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer"
                style={{ fontSize: '13px', color: 'var(--text-primary)', width: '110px' }}
              />
            </div>

            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              disabled={selectedDate >= todayISO()}
              className="btn-icon"
              aria-label="Next day"
              style={{ opacity: selectedDate >= todayISO() ? 0.3 : 1 }}
            >
              <ChevronRight size={16} />
            </button>

            {selectedDate !== todayISO() && (
              <button
                onClick={() => setSelectedDate(todayISO())}
                className="btn btn-ghost btn-xs ml-1"
              >
                Today
              </button>
            )}
          </div>
        ) : (
          <h1
            className="hidden md:block"
            style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}
          >
            {VIEW_TITLES[activeView] || ''}
          </h1>
        )}
      </div>

      {/* Right: date label + theme toggle */}
      <div className="flex items-center gap-2">
        {showDateNav && (
          <span
            className="hidden md:block"
            style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}
          >
            {formatDateFull(selectedDate)}
          </span>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn-icon"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ marginLeft: '4px' }}
        >
          {theme === 'dark'
            ? <Sun size={17} style={{ color: 'var(--warning)' }} />
            : <Moon size={17} style={{ color: 'var(--brand-2)' }} />
          }
        </button>
      </div>
    </header>
  )
}
