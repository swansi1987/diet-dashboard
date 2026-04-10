import { useState, useRef } from 'react'
import client from '../../api/client.js'
import GlassCard from '../ui/GlassCard.jsx'
import GradientButton from '../ui/GradientButton.jsx'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'
import { usePDFExport } from '../../hooks/usePDFExport.js'
import { useCheatDays } from '../../hooks/useCheatDays.js'
import { quickPresets, subtractDays, todayISO, formatDateShort } from '../../utils/dateUtils.js'
import { calcTotals } from '../../utils/nutritionCalc.js'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'
import { Download, FileText } from 'lucide-react'

const TOOLTIP_STYLE = { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0', fontSize: '12px' }
const AXIS_STYLE = { stroke: '#475569', tick: { fontSize: 10, fill: '#475569' } }

export default function ReportsView() {
  const today = todayISO()
  const [start, setStart] = useState(subtractDays(today, 29))
  const [end, setEnd] = useState(today)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const { cheatDays } = useCheatDays()
  const { chartRef, exportPDF } = usePDFExport()

  const cheatDates = new Set(cheatDays.map(c => c.date))

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const res = await client.get('/daily-logs', { params: { start, end } })
      setLogs(res.data)
      setLoaded(true)
    } finally { setLoading(false) }
  }

  // Build per-day aggregates
  const byDate = {}
  for (const log of logs) {
    if (!byDate[log.date]) byDate[log.date] = []
    byDate[log.date].push(log)
  }

  const chartData = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, dayLogs]) => {
    const totals = calcTotals(dayLogs)
    return {
      date: formatDateShort(date),
      rawDate: date,
      calories: Math.round(totals.calories),
      protein: totals.protein,
      carbs: totals.carbs,
      fats: totals.fats,
      calcium: totals.calcium,
      iron: totals.iron,
      magnesium: totals.magnesium,
      potassium: totals.potassium,
      zinc: totals.zinc,
      isCheat: cheatDates.has(date),
    }
  })

  // CSV export
  const exportCSV = () => {
    const headers = 'date,meal_type,food_name,quantity,calories,protein,carbs,fats,calcium,iron,magnesium,potassium,zinc'
    const rows = logs.map(l => [l.date, l.meal_type, `"${l.food_name}"`, l.quantity, l.calories, l.protein, l.carbs, l.fats, l.calcium, l.iron, l.magnesium, l.potassium, l.zinc].join(','))
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `diet-report-${start}-to-${end}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const cheatRefLines = chartData.filter(d => d.isCheat).map(d => d.date)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        {loaded && (
          <div className="flex gap-2">
            <GradientButton size="sm" variant="ghost" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1.5" /> CSV
            </GradientButton>
            <GradientButton size="sm" variant="ghost" onClick={() => exportPDF(logs, start, end)}>
              <FileText className="w-4 h-4 mr-1.5" /> PDF
            </GradientButton>
          </div>
        )}
      </div>

      {/* Date Range */}
      <GlassCard className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {quickPresets().map(p => (
            <button
              key={p.label}
              onClick={() => { setStart(p.start); setEnd(p.end) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${start === p.start && end === p.end ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700/50 text-slate-400 hover:text-slate-200'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">From</label>
            <input type="date" className="input-field w-40" value={start} onChange={e => setStart(e.target.value)} max={end} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">To</label>
            <input type="date" className="input-field w-40" value={end} onChange={e => setEnd(e.target.value)} min={start} max={today} />
          </div>
          <div className="mt-4">
            <GradientButton onClick={fetchReportData} disabled={loading}>
              {loading ? <LoadingSpinner size="sm" /> : 'Load Report'}
            </GradientButton>
          </div>
        </div>
      </GlassCard>

      {!loaded && !loading && (
        <GlassCard className="p-12 text-center text-slate-500">
          Select a date range and click "Load Report"
        </GlassCard>
      )}

      {loading && <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>}

      {loaded && !loading && (
        <div ref={chartRef} className="space-y-6">
          {chartData.length === 0 ? (
            <GlassCard className="p-12 text-center text-slate-500">No data for this period</GlassCard>
          ) : (
            <>
              {/* Calories */}
              <GlassCard className="p-6">
                <h2 className="text-sm font-semibold text-slate-300 mb-4">Calories per Day</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" {...AXIS_STYLE} interval="preserveStartEnd" />
                    <YAxis {...AXIS_STYLE} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    {cheatRefLines.map(d => <ReferenceLine key={d} x={d} stroke="#f97316" strokeDasharray="4 4" label={{ value: '🚩', position: 'top' }} />)}
                    <Bar dataKey="calories" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>

              {/* Macros */}
              <GlassCard className="p-6">
                <h2 className="text-sm font-semibold text-slate-300 mb-4">Macronutrients (g/day)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" {...AXIS_STYLE} interval="preserveStartEnd" />
                    <YAxis {...AXIS_STYLE} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: '11px' }}>{v}</span>} />
                    <Line type="monotone" dataKey="protein" stroke="#10b981" strokeWidth={2} dot={false} name="Protein" />
                    <Line type="monotone" dataKey="carbs" stroke="#06b6d4" strokeWidth={2} dot={false} name="Carbs" />
                    <Line type="monotone" dataKey="fats" stroke="#f59e0b" strokeWidth={2} dot={false} name="Fats" />
                  </LineChart>
                </ResponsiveContainer>
              </GlassCard>

              {/* Micronutrients */}
              <GlassCard className="p-6">
                <h2 className="text-sm font-semibold text-slate-300 mb-4">Micronutrients (mg/day)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" {...AXIS_STYLE} interval="preserveStartEnd" />
                    <YAxis {...AXIS_STYLE} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: '11px' }}>{v}</span>} />
                    <Line type="monotone" dataKey="calcium" stroke="#06b6d4" strokeWidth={1.5} dot={false} name="Calcium" />
                    <Line type="monotone" dataKey="iron" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Iron" />
                    <Line type="monotone" dataKey="magnesium" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="Magnesium" />
                    <Line type="monotone" dataKey="potassium" stroke="#10b981" strokeWidth={1.5} dot={false} name="Potassium" />
                    <Line type="monotone" dataKey="zinc" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Zinc" />
                  </LineChart>
                </ResponsiveContainer>
              </GlassCard>

              {/* Data table */}
              <GlassCard className="p-6 overflow-x-auto">
                <h2 className="text-sm font-semibold text-slate-300 mb-4">Food Log Detail ({logs.length} entries)</h2>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {['Date','Meal','Food','Qty','Cal','P','C','F'].map(h => (
                        <th key={h} className="text-left px-2 py-2 text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.filter(l => l.consumed).map(l => (
                      <tr key={l.id} className="border-b border-slate-800 hover:bg-slate-700/20">
                        <td className="px-2 py-1.5 text-slate-400">{l.date}</td>
                        <td className="px-2 py-1.5 text-slate-400 capitalize">{l.meal_type}</td>
                        <td className="px-2 py-1.5 text-slate-300 max-w-32 truncate">{l.food_name}</td>
                        <td className="px-2 py-1.5 text-slate-400">{l.quantity}g</td>
                        <td className="px-2 py-1.5 text-emerald-400">{l.calories}</td>
                        <td className="px-2 py-1.5 text-slate-300">{l.protein}</td>
                        <td className="px-2 py-1.5 text-slate-300">{l.carbs}</td>
                        <td className="px-2 py-1.5 text-slate-300">{l.fats}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassCard>
            </>
          )}
        </div>
      )}
    </div>
  )
}
