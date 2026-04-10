import { useApp } from '../../context/AppContext.jsx'
import { todayISO, toISODate, parseDate } from '../../utils/dateUtils.js'

export default function ActivityCalendar({ logs, cheatDays = [] }) {
  const { selectedDate, setSelectedDate } = useApp()
  const today = todayISO()

  // Build current month grid
  const d = parseDate(selectedDate)
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth()
  const firstDay = new Date(Date.UTC(year, month, 1))
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const startOffset = firstDay.getUTCDay()

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

  // Build calorie map
  const calMap = {}
  for (const log of logs) {
    if (log.consumed && !log.is_junk_meal) {
      calMap[log.date] = (calMap[log.date] || 0) + (+log.calories || 0)
    }
  }
  const cheatSet = new Set(cheatDays.map(c => c.date))

  const CALORIE_GOAL = 2000

  function getCellColor(date) {
    const cal = calMap[date]
    if (!cal) return 'bg-slate-800/50'
    const ratio = cal / CALORIE_GOAL
    if (ratio < 0.5) return 'bg-emerald-900/40'
    if (ratio < 0.8) return 'bg-emerald-700/50'
    if (ratio < 1.1) return 'bg-emerald-500/60'
    return 'bg-emerald-400/70'
  }

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toISODate(new Date(Date.UTC(year, month, day))))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-300">{MONTHS[month]} {year}</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS.map(d => (
          <div key={d} className="text-xs text-slate-600 py-1">{d}</div>
        ))}
        {cells.map((date, i) => (
          <div key={i} className="aspect-square">
            {date ? (
              <button
                onClick={() => setSelectedDate(date)}
                title={date}
                disabled={date > today}
                className={`
                  w-full h-full rounded-lg text-xs font-medium transition-all duration-150
                  ${getCellColor(date)}
                  ${date === selectedDate ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-slate-900' : ''}
                  ${date === today ? 'ring-1 ring-cyan-500/50' : ''}
                  ${cheatSet.has(date) ? 'ring-1 ring-orange-500/70' : ''}
                  ${date > today ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110 hover:ring-1 hover:ring-slate-500'}
                  text-slate-300
                `}
              >
                {parseDate(date).getUTCDate()}
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/60 inline-block"></span> Has meals</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded ring-1 ring-orange-500/70 inline-block"></span> Cheat day</span>
      </div>
    </div>
  )
}
