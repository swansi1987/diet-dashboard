import { useApp } from '../../context/AppContext.jsx'
import { useDailyLog } from '../../hooks/useDailyLog.js'
import { useWeightLog } from '../../hooks/useWeightLog.js'
import { useProfile } from '../../hooks/useProfile.js'
import { useCheatDays } from '../../hooks/useCheatDays.js'
import { calcTotals } from '../../utils/nutritionCalc.js'
import { MEAL_LABELS, MEAL_ICONS, MEAL_TYPES } from '../../utils/constants.js'
import GlassCard from '../ui/GlassCard.jsx'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'
import ProteinGauge from '../charts/ProteinGauge.jsx'
import MacroPieChart from '../charts/MacroPieChart.jsx'
import MicroBarChart from '../charts/MicroBarChart.jsx'
import ActivityCalendar from '../charts/ActivityCalendar.jsx'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatDate } from '../../utils/dateUtils.js'
import { Flag, Camera } from 'lucide-react'

export default function DashboardView() {
  const { selectedDate } = useApp()
  const { logs, loading } = useDailyLog(selectedDate)
  const { entries: weightEntries, latestWeight } = useWeightLog(30)
  const { profile } = useProfile()
  const { cheatDays, isCheatDay } = useCheatDays()

  const totals = calcTotals(logs)
  const cheatDay = isCheatDay(selectedDate)

  const weightChartData = weightEntries.map(e => ({
    date: formatDate(e.date, { month: 'short', day: 'numeric' }),
    weight: parseFloat(e.weight),
  }))

  const CALORIE_GOAL = 2000

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Cheat day banner */}
      {cheatDay && (
        <div className="flex items-center gap-2 px-4 py-3 bg-orange-900/30 border border-orange-700/50 rounded-xl text-orange-300 text-sm">
          <Flag className="w-4 h-4" /> This day is flagged as a cheat day
        </div>
      )}

      {/* Calorie + macro stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { label: 'Calories', value: Math.round(totals.calories), unit: 'kcal', color: 'emerald', sub: `of ${CALORIE_GOAL} goal` },
          { label: 'Protein', value: totals.protein, unit: 'g', color: 'cyan' },
          { label: 'Carbs', value: totals.carbs, unit: 'g', color: 'yellow' },
          { label: 'Fats', value: totals.fats, unit: 'g', color: 'orange' },
          { label: 'Meals', value: logs.length, unit: '', color: 'slate', sub: `${logs.filter(l => l.consumed).length} consumed` },
        ].map(({ label, value, unit, color, sub }) => (
          <GlassCard key={label} className="p-4">
            <div className="text-xs text-slate-400 mb-1">{label}</div>
            <div className={`text-2xl font-bold text-${color}-400`}>
              {value}<span className="text-sm font-normal ml-0.5 text-slate-500">{unit}</span>
            </div>
            {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
          </GlassCard>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Protein gauge */}
          <GlassCard className="p-6">
            <div className="text-sm font-semibold text-slate-300 mb-4">Protein Intake</div>
            <div className="flex justify-center">
              <ProteinGauge currentG={totals.protein} weightKg={latestWeight || profile?.weight} />
            </div>
          </GlassCard>

          {/* Macro distribution */}
          <GlassCard className="p-6">
            <div className="text-sm font-semibold text-slate-300 mb-2">Macro Distribution</div>
            <MacroPieChart protein={totals.protein} carbs={totals.carbs} fats={totals.fats} />
          </GlassCard>
        </div>

        {/* Middle column */}
        <div className="space-y-6">
          {/* Micronutrients */}
          <GlassCard className="p-6">
            <div className="text-sm font-semibold text-slate-300 mb-4">Micronutrients (% RDA)</div>
            <MicroBarChart totals={totals} />
          </GlassCard>

          {/* Weight progress */}
          {weightEntries.length > 1 && (
            <GlassCard className="p-6">
              <div className="text-sm font-semibold text-slate-300 mb-4">Weight (last 30 days)</div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis stroke="#475569" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Activity calendar */}
          <GlassCard className="p-6">
            <div className="text-sm font-semibold text-slate-300 mb-4">Activity</div>
            <ActivityCalendar logs={logs} cheatDays={cheatDays} />
          </GlassCard>
        </div>
      </div>

      {/* Today's meals */}
      {logs.length > 0 && (
        <GlassCard className="p-6">
          <div className="text-sm font-semibold text-slate-300 mb-4">Today's Meals</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {MEAL_TYPES.map(type => {
              const items = logs.filter(l => l.meal_type === type)
              if (items.length === 0) return null
              const mealCal = items.filter(i => i.consumed).reduce((s, l) => s + (+l.calories || 0), 0)
              return (
                <div key={type} className="bg-slate-700/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-300">{MEAL_ICONS[type]} {MEAL_LABELS[type]}</span>
                    <span className="text-xs text-emerald-400">{Math.round(mealCal)} kcal</span>
                  </div>
                  <div className="space-y-1">
                    {items.map(item => (
                      <div key={item.id} className={`flex items-center gap-2 text-xs ${item.consumed ? 'text-slate-400' : 'text-slate-600 line-through'}`}>
                        {item.is_junk_meal && <Camera className="w-3 h-3 text-orange-400 shrink-0" />}
                        <span className="flex-1 truncate">{item.food_name}</span>
                        <span className="shrink-0">{item.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
