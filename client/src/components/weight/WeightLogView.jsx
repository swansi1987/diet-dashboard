import { useState } from 'react'
import { useWeightLog } from '../../hooks/useWeightLog.js'
import GlassCard from '../ui/GlassCard.jsx'
import GradientButton from '../ui/GradientButton.jsx'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'
import { todayISO, formatDate } from '../../utils/dateUtils.js'
import { Trash2, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function WeightLogView() {
  const { entries, loading, addEntry, deleteEntry, latestWeight } = useWeightLog(90)
  const [date, setDate] = useState(todayISO())
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!weight) return
    setSaving(true)
    try {
      await addEntry(date, parseFloat(weight))
      setWeight('')
    } finally {
      setSaving(false)
    }
  }

  const trend = entries.length >= 2
    ? entries[entries.length - 1].weight - entries[entries.length - 2].weight
    : null

  const chartData = entries.map(e => ({
    date: formatDate(e.date, { month: 'short', day: 'numeric' }),
    weight: parseFloat(e.weight),
  }))

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Weight Log</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="text-xs text-slate-400 mb-1">Current Weight</div>
          <div className="text-2xl font-bold text-emerald-400">{latestWeight ? `${latestWeight} kg` : '—'}</div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="text-xs text-slate-400 mb-1">Last Change</div>
          <div className={`text-2xl font-bold flex items-center gap-1 ${!trend ? 'text-slate-400' : trend < 0 ? 'text-emerald-400' : trend > 0 ? 'text-red-400' : 'text-slate-400'}`}>
            {trend === null ? '—' : (
              <>
                {trend < 0 ? <TrendingDown className="w-5 h-5" /> : trend > 0 ? <TrendingUp className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                {trend > 0 ? '+' : ''}{trend?.toFixed(1)} kg
              </>
            )}
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="text-xs text-slate-400 mb-1">Total Entries</div>
          <div className="text-2xl font-bold text-cyan-400">{entries.length}</div>
        </GlassCard>
      </div>

      {/* Add entry */}
      <GlassCard className="p-6">
        <h2 className="section-title mb-4">Log Weight</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Date</label>
            <input
              type="date"
              className="input-field w-40"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              min="1"
              className="input-field w-32"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="70.5"
              required
            />
          </div>
          <GradientButton type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Log Weight'}
          </GradientButton>
        </form>
      </GlassCard>

      {/* Chart */}
      {entries.length > 1 && (
        <GlassCard className="p-6">
          <h2 className="section-title mb-4">Weight History</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }}
                formatter={(v) => [`${v} kg`, 'Weight']}
              />
              <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {/* Log table */}
      {entries.length > 0 && (
        <GlassCard className="p-6">
          <h2 className="section-title mb-4">History</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[...entries].reverse().map(entry => (
              <div key={entry.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-700/30 transition-colors">
                <span className="text-sm text-slate-400">{formatDate(entry.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <span className="text-sm font-semibold text-emerald-400">{entry.weight} kg</span>
                <button onClick={() => deleteEntry(entry.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
