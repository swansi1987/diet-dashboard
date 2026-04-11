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
import { Flag, Camera, Zap, Beef, Wheat, Droplets, UtensilsCrossed } from 'lucide-react'

const CALORIE_GOAL = 2000

export default function DashboardView() {
  const { selectedDate } = useApp()
  const { logs, loading } = useDailyLog(selectedDate)
  const { entries: weightEntries, latestWeight } = useWeightLog(30)
  const { profile } = useProfile()
  const { cheatDays, isCheatDay } = useCheatDays()

  const totals = calcTotals(logs)
  const cheatDay = isCheatDay(selectedDate)
  const calorieProgress = Math.min((totals.calories / CALORIE_GOAL) * 100, 100)

  const weightChartData = weightEntries.map(e => ({
    date: formatDate(e.date, { month: 'short', day: 'numeric' }),
    weight: parseFloat(e.weight),
  }))

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <LoadingSpinner size="lg" />
    </div>
  )

  const STAT_CARDS = [
    {
      label: 'Calories',
      value: Math.round(totals.calories),
      unit: 'kcal',
      icon: Zap,
      color: 'var(--brand)',
      sub: `${Math.round(calorieProgress)}% of ${CALORIE_GOAL} goal`,
      progress: calorieProgress,
    },
    {
      label: 'Protein',
      value: totals.protein.toFixed(1),
      unit: 'g',
      icon: Beef,
      color: '#38BDF8',
    },
    {
      label: 'Carbs',
      value: totals.carbs.toFixed(1),
      unit: 'g',
      icon: Wheat,
      color: '#FBBF24',
    },
    {
      label: 'Fats',
      value: totals.fats.toFixed(1),
      unit: 'g',
      icon: Droplets,
      color: '#FB923C',
    },
    {
      label: 'Meals',
      value: logs.length,
      unit: '',
      icon: UtensilsCrossed,
      color: 'var(--brand-2)',
      sub: `${logs.filter(l => l.consumed).length} consumed`,
    },
  ]

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Cheat day banner */}
      {cheatDay && (
        <div className="alert alert-warning animate-slide-up">
          <Flag size={14} className="shrink-0 mt-0.5" />
          <span className="text-sm font-medium">This day is flagged as a cheat day</span>
        </div>
      )}

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {STAT_CARDS.map(({ label, value, unit, icon: Icon, color, sub, progress }) => (
          <GlassCard key={label} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="section-title">{label}</span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${color}1A` }}
              >
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span style={{ fontSize: '24px', fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{unit}</span>
            </div>
            {sub && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</p>}
            {progress !== undefined && (
              <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-3)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: color }}
                />
              </div>
            )}
          </GlassCard>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="space-y-5">
          <GlassCard className="p-5">
            <p className="section-title mb-4">Target Protein Consumption</p>
            <div className="flex justify-center">
              <ProteinGauge currentG={totals.protein} weightKg={latestWeight || profile?.weight} />
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <p className="section-title mb-2">Macro Distribution</p>
            <MacroPieChart protein={totals.protein} carbs={totals.carbs} fats={totals.fats} />
          </GlassCard>
        </div>

        {/* Middle column */}
        <div className="space-y-5">
          <GlassCard className="p-5">
            <p className="section-title mb-4">Micronutrients (% RDA)</p>
            <MicroBarChart totals={totals} />
          </GlassCard>

          {weightEntries.length > 1 && (
            <GlassCard className="p-5">
              <p className="section-title mb-4">Weight — last 30 days</p>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-primary)' }}
                    itemStyle={{ color: 'var(--brand)' }}
                  />
                  <Line type="monotone" dataKey="weight" stroke="var(--brand)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <GlassCard className="p-5">
            <p className="section-title mb-4">Activity</p>
            <ActivityCalendar logs={logs} cheatDays={cheatDays} />
          </GlassCard>
        </div>
      </div>

      {/* Today's meals */}
      {logs.length > 0 && (
        <GlassCard className="p-5">
          <p className="section-title mb-4">Today's Meals</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {MEAL_TYPES.map(type => {
              const items = logs.filter(l => l.meal_type === type)
              if (!items.length) return null
              const mealCal = items.filter(i => i.consumed).reduce((s, l) => s + (+l.calories || 0), 0)
              return (
                <div key={type} className="rounded-xl p-4" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-1.5" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {(() => {
                        const Icon = MEAL_ICONS[type]
                        return <Icon size={14} style={{ color: 'var(--brand)' }} />
                      })()}
                      {MEAL_LABELS[type]}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand)' }}>{Math.round(mealCal)} kcal</span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2"
                        style={{ fontSize: '12px', color: item.consumed ? 'var(--text-secondary)' : 'var(--text-muted)', textDecoration: item.consumed ? 'none' : 'line-through' }}
                      >
                        {item.is_junk_meal && <Camera size={11} style={{ color: 'var(--warning)', flexShrink: 0 }} />}
                        <span className="flex-1 truncate">{item.food_name}</span>
                        <span style={{ flexShrink: 0, color: 'var(--text-muted)' }}>{item.calories} kcal</span>
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
