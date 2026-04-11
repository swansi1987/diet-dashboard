import { useState, useEffect } from 'react'
import GlassCard from '../ui/GlassCard.jsx'
import GradientButton from '../ui/GradientButton.jsx'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'
import ErrorBanner from '../ui/ErrorBanner.jsx'
import WorkoutTracker from './WorkoutTracker.jsx'
import RoutineNameModal from './RoutineNameModal.jsx'
import client from '../../api/client.js'
import { Plus, Play, History, MoreVertical, Dumbbell, Clock, ChevronRight, Trash2 } from 'lucide-react'

export default function WorkoutView() {
  const [templates, setTemplates] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('start') // 'start' or 'history'
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [showNamePrompt, setShowNamePrompt] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [tmplRes, histRes] = await Promise.all([
        client.get('/workout-templates'),
        client.get('/workout-sessions?limit=20')
      ])
      setTemplates(tmplRes.data)
      setHistory(histRes.data)
    } catch (err) {
      setError('Failed to load workout data')
    } finally {
      setLoading(false)
    }
  }

  const deleteHistory = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this workout history?')) return
    try {
      await client.delete(`/workout-sessions/${id}`)
      setHistory(history.filter(s => s.id !== id))
    } catch (err) {
      alert('Failed to delete workout history')
    }
  }

  const startEmptyWorkout = async (routineName) => {
    try {
      const res = await client.post('/workout-sessions', {
        title: routineName || 'Empty Workout',
        started_at: new Date().toISOString()
      })
      setActiveSessionId(res.data.id)
      setShowNamePrompt(false)
    } catch (err) {
      setError('Failed to start workout')
    }
  }

  const startTemplate = async (template) => {
    try {
      // 1. Create the session
      const res = await client.post('/workout-sessions', {
        template_id: template.id,
        title: template.name,
        started_at: new Date().toISOString()
      })
      const sessionId = res.data.id

      // 2. Add sets based on template exercises
      // First fetch full template to get exercises
      const tmplFull = await client.get(`/workout-templates/${template.id}`)
      for (const ex of tmplFull.data.exercises) {
        // Add one initial set for each exercise in the template
        await client.post(`/workout-sessions/${sessionId}/sets`, {
          exercise_id: ex.exercise_id,
          set_number: 1,
          weight_kg: null,
          reps: ex.rep_range_min || null
        })
      }

      setActiveSessionId(sessionId)
    } catch (err) {
      setError('Failed to start template')
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>

  if (activeSessionId) {
    return (
      <WorkoutTracker 
        sessionId={activeSessionId} 
        onFinished={() => {
          setActiveSessionId(null)
          fetchData()
        }}
        onCancel={() => {
          if (confirm('Cancel workout? Data will not be saved.')) {
            client.delete(`/workout-sessions/${activeSessionId}`)
            setActiveSessionId(null)
          }
        }}
      />
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Workout</h1>
        <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
          <button
            onClick={() => setTab('start')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'start' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Start
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'history' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            History
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {tab === 'start' ? (
        <div className="space-y-6">
          {/* Quick Start */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider px-1">Quick Start</h2>
            <GradientButton onClick={() => setShowNamePrompt(true)} className="w-full py-4 justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={20} />
                </div>
                <div className="text-left">
                  <div className="font-bold text-base">Start an Empty Workout</div>
                  <div className="text-xs text-white/70">No template, just log as you go</div>
                </div>
              </div>
              <ChevronRight size={18} className="opacity-50" />
            </GradientButton>
          </section>

          {showNamePrompt && (
            <RoutineNameModal 
              onConfirm={startEmptyWorkout}
              onCancel={() => setShowNamePrompt(false)}
            />
          )}

          {/* Templates */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Templates ({templates.length})</h2>
              <button className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                <Plus size={14} /> NEW TEMPLATE
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.length === 0 ? (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                  <Dumbbell className="mx-auto text-slate-700 mb-3" size={32} />
                  <p className="text-slate-500 text-sm">No templates yet. Create one to speed up your logs.</p>
                </div>
              ) : templates.map(tmpl => (
                <GlassCard key={tmpl.id} className="p-5 hover:border-emerald-500/30 transition-all cursor-pointer group" onClick={() => startTemplate(tmpl)}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">{tmpl.name}</h3>
                    <button className="p-1 text-slate-500 hover:text-slate-300"><MoreVertical size={16} /></button>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 h-8">{tmpl.description || 'No description'}</p>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-800/50">
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1"><Dumbbell size={12} /> {tmpl.tags?.join(', ') || 'Workout'}</span>
                      {tmpl.estimated_duration_minutes && (
                        <span className="flex items-center gap-1"><Clock size={12} /> {tmpl.estimated_duration_minutes}m</span>
                      )}
                    </div>
                    <Play size={14} className="text-emerald-500" />
                  </div>
                </GlassCard>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="py-20 text-center">
              <History className="mx-auto text-slate-800 mb-4" size={48} />
              <p className="text-slate-500">You haven't logged any workouts yet.</p>
            </div>
          ) : history.map(session => (
            <GlassCard key={session.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex flex-col items-center justify-center text-emerald-500 font-bold uppercase tracking-tight">
                   <span className="text-[10px]">{new Date(session.started_at).toLocaleString('en-US', { month: 'short' })}</span>
                   <span className="text-lg font-black">{new Date(session.started_at).getDate()}</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-200">{session.title || 'Workout'}</h3>
                  <p className="text-xs text-slate-500">
                    {session.exercise_count} exercises • {Math.round(session.total_volume_kg)}kg volume
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-medium text-slate-400">{Math.round(session.duration_seconds / 60)} min</div>
                  <ChevronRight size={16} className="text-slate-600" />
                </div>
                <button
                  onClick={(e) => deleteHistory(e, session.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
