import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { useDailyLog } from '../../hooks/useDailyLog.js'
import { useProfile } from '../../hooks/useProfile.js'
import { useWeightLog } from '../../hooks/useWeightLog.js'
import { calcTotals } from '../../utils/nutritionCalc.js'
import GlassCard from '../ui/GlassCard.jsx'
import GradientButton from '../ui/GradientButton.jsx'
import ErrorBanner from '../ui/ErrorBanner.jsx'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'
import client from '../../api/client.js'
import { Cpu } from 'lucide-react'

function MarkdownRender({ text }) {
  // Simple markdown renderer for headings and bullets
  const lines = text.split('\n')
  return (
    <div className="space-y-1 text-sm text-slate-300">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-emerald-400 mt-4 first:mt-0">{line.slice(3)}</h2>
        if (line.startsWith('# ')) return <h1 key={i} className="text-lg font-bold text-white mt-4 first:mt-0">{line.slice(2)}</h1>
        if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-semibold text-cyan-400 mt-3">{line.slice(4)}</h3>
        if (line.startsWith('- ') || line.startsWith('* ')) return <p key={i} className="pl-4 before:content-['•'] before:mr-2 before:text-slate-500">{line.slice(2)}</p>
        if (line.match(/^\d+\./)) return <p key={i} className="pl-4">{line}</p>
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-slate-200">{line.slice(2, -2)}</p>
        if (line.trim() === '') return <div key={i} className="h-1" />
        return <p key={i}>{line}</p>
      })}
    </div>
  )
}

export default function MealPlannerView() {
  const { selectedDate } = useApp()
  const { logs } = useDailyLog(selectedDate)
  const { profile, age } = useProfile()
  const { latestWeight } = useWeightLog(1)
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const totals = calcTotals(logs)

  const handleGenerate = async () => {
    setLoading(true); setError(null)
    try {
      const profileCtx = { age, weight: latestWeight || profile?.weight, height: profile?.height }
      const res = await client.post('/ai/meal-planner', { profile: profileCtx, todayTotals: totals })
      setPlan(res.data.markdown)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate plan. Check your AI key in Settings.')
    } finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">AI Meal Planner</h1>
        <GradientButton onClick={handleGenerate} disabled={loading}>
          <Cpu className="w-4 h-4 mr-1.5" />
          {loading ? 'Generating...' : 'Generate Plan'}
        </GradientButton>
      </div>

      {/* Context summary */}
      <GlassCard className="p-4">
        <p className="text-sm text-slate-400 mb-3">Generating plan based on:</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-slate-300">Today's intake: <span className="text-emerald-400">{Math.round(totals.calories)} kcal</span></span>
          {(latestWeight || profile?.weight) && <span className="text-slate-300">Weight: <span className="text-cyan-400">{latestWeight || profile?.weight} kg</span></span>}
          {age && <span className="text-slate-300">Age: <span className="text-cyan-400">{age}</span></span>}
          {profile?.height && <span className="text-slate-300">Height: <span className="text-cyan-400">{profile.height} cm</span></span>}
        </div>
      </GlassCard>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading && (
        <GlassCard className="p-12 flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-slate-400">Creating your personalized meal plan...</p>
        </GlassCard>
      )}

      {plan && !loading && (
        <GlassCard className="p-6">
          <MarkdownRender text={plan} />
          <div className="flex justify-end mt-6 pt-4 border-t border-slate-700">
            <GradientButton variant="ghost" onClick={() => setPlan(null)}>Generate Another</GradientButton>
          </div>
        </GlassCard>
      )}

      {!plan && !loading && (
        <GlassCard className="p-12 flex flex-col items-center gap-4 text-center">
          <Cpu className="w-12 h-12 text-slate-600" />
          <div>
            <p className="text-slate-400">Click "Generate Plan" to create a personalized next-day meal plan</p>
            <p className="text-slate-600 text-sm mt-1">Uses your today's intake and profile as context</p>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
