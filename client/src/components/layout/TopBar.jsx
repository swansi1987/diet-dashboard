import { ChevronLeft, ChevronRight, Calendar, Menu } from 'lucide-react'
import { useApp } from '../../context/AppContext.jsx'
import { addDays, subtractDays, formatDateFull, todayISO } from '../../utils/dateUtils.js'

export default function TopBar({ onMenuClick }) {
  const { selectedDate, setSelectedDate, activeView } = useApp()
  const showDateNav = ['dashboard', 'logger'].includes(activeView)

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        {showDateNav && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedDate(subtractDays(selectedDate, 1))}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              disabled={selectedDate >= todayISO()}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {selectedDate !== todayISO() && (
              <button
                onClick={() => setSelectedDate(todayISO())}
                className="ml-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Today
              </button>
            )}
          </div>
        )}
      </div>
      {showDateNav && (
        <p className="hidden md:block text-sm text-slate-400">
          {formatDateFull(selectedDate)}
        </p>
      )}
    </header>
  )
}
