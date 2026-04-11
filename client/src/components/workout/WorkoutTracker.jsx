import { useState, useEffect, useRef } from 'react'
import GlassCard from '../ui/GlassCard.jsx'
import GradientButton from '../ui/GradientButton.jsx'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'
import ExerciseSelector from './ExerciseSelector.jsx'
import client from '../../api/client.js'
import { X, Plus, Trash2, Check, Clock, Save, MoreHorizontal } from 'lucide-react'

export default function WorkoutTracker({ sessionId, onFinished, onCancel }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [duration, setDuration] = useState(0)
  const [showExerciseSelector, setShowExerciseSelector] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    fetchSession()
    timerRef.current = setInterval(() => {
      setDuration(d => d + 1)
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [sessionId])

  const fetchSession = async () => {
    try {
      const res = await client.get(`/workout-sessions/${sessionId}`)
      setSession(res.data)
      // Calculate initial duration if session already had a start time
      const start = new Date(res.data.started_at).getTime()
      setDuration(Math.floor((Date.now() - start) / 1000))
    } catch (err) {
      console.error('Failed to fetch session', err)
    } finally {
      setLoading(false)
    }
  }

  const addExercise = async (exercise) => {
    try {
      // Add initial set for this exercise
      const res = await client.post(`/workout-sessions/${sessionId}/sets`, {
        exercise_id: exercise.id,
        set_number: 1,
        weight_kg: null,
        reps: null
      })
      
      // Refresh session data to show new exercise
      await fetchSession()
      setShowExerciseSelector(false)
    } catch (err) {
      alert('Failed to add exercise')
    }
  }

  const addSet = async (exerciseId) => {
    const exercise = session.exercises.find(e => e.exercise_id === exerciseId)
    const lastSet = exercise.sets[exercise.sets.length - 1]
    const nextNum = exercise.sets.length + 1
    
    try {
      const res = await client.post(`/workout-sessions/${sessionId}/sets`, {
        exercise_id: exerciseId,
        set_number: nextNum,
        weight_kg: lastSet?.weight_kg || null,
        reps: lastSet?.reps || null
      })
      
      const updatedExercises = session.exercises.map(ex => {
        if (ex.exercise_id === exerciseId) {
          return { ...ex, sets: [...ex.sets, res.data] }
        }
        return ex
      })
      setSession({ ...session, exercises: updatedExercises })
    } catch (err) {
      alert('Failed to add set')
    }
  }

  const updateSet = async (exerciseId, setId, data) => {
    try {
      // Optimistic update of state
      const updatedExercises = session.exercises.map(ex => {
        if (ex.exercise_id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map(s => s.id === setId ? { ...s, ...data } : s)
          }
        }
        return ex
      })
      setSession({ ...session, exercises: updatedExercises })
      
      // Persist to server
      await client.put(`/workout-sessions/${sessionId}/sets/${setId}`, data)
    } catch (err) {
      console.error('Update set failed', err)
      // Revert if needed or fetch session again to sync
      fetchSession()
    }
  }

  const removeSet = async (exerciseId, setId) => {
    try {
      await client.delete(`/workout-sessions/${sessionId}/sets/${setId}`)
      const updatedExercises = session.exercises.map(ex => {
        if (ex.exercise_id === exerciseId) {
          return { ...ex, sets: ex.sets.filter(s => s.id !== setId) }
        }
        return ex
      })
      setSession({ ...session, exercises: updatedExercises })
    } catch (err) {
      alert('Delete set failed')
    }
  }

  const finishWorkout = async () => {
    setSaving(true)
    try {
      await client.put(`/workout-sessions/${sessionId}`, {
        finished_at: new Date().toISOString(),
        duration_seconds: duration
      })
      onFinished()
    } catch (err) {
      alert('Failed to finish workout')
    } finally {
      setSaving(false)
    }
  }

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) return <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}><LoadingSpinner /></div>

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <button onClick={onCancel} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
          <X size={20} />
        </button>
        <div className="text-center">
          <h2 className="font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{session.title || 'Workout'}</h2>
          <div className="flex items-center justify-center gap-1.5 font-mono text-lg font-bold" style={{ color: 'var(--brand)' }}>
            <Clock size={16} /> {formatTime(duration)}
          </div>
        </div>
        <button 
          onClick={finishWorkout} 
          disabled={saving}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-emerald-500/20"
        >
          {saving ? '...' : 'FINISH'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {session.exercises?.map((ex, exIdx) => (
          <div key={ex.exercise_id} className="space-y-3">
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <span className="font-black text-lg" style={{ color: 'var(--brand)' }}>{exIdx + 1}</span>
                <h3 className="font-bold text-base">{ex.exercise_name}</h3>
              </div>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                <MoreHorizontal size={18} />
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
                    <th className="py-2 px-3 text-left w-12">Set</th>
                    <th className="py-2 px-3 text-center">Previous</th>
                    <th className="py-2 px-3 text-center w-24">kg</th>
                    <th className="py-2 px-3 text-center w-20">Reps</th>
                    <th className="py-2 px-3 text-right w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ divideColor: 'var(--border)' }}>
                  {ex.sets.map((set, idx) => (
                    <tr key={set.id} className="group">
                      <td className="py-2 px-3">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                        -
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          defaultValue={set.weight_kg || ''}
                          onBlur={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                            if (val !== set.weight_kg) updateSet(ex.exercise_id, set.id, { weight_kg: val });
                          }}
                          placeholder="0"
                          className="w-full border border-transparent focus:border-emerald-500/50 rounded-lg py-1 px-2 text-center outline-none transition-all font-bold"
                          style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)' }}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          defaultValue={set.reps || ''}
                          onBlur={(e) => {
                            const val = e.target.value === '' ? null : parseInt(e.target.value);
                            if (val !== set.reps) updateSet(ex.exercise_id, set.id, { reps: val });
                          }}
                          placeholder="0"
                          className="w-full border border-transparent focus:border-emerald-500/50 rounded-lg py-1 px-2 text-center outline-none transition-all font-bold"
                          style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)' }}
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button 
                          onClick={() => removeSet(ex.exercise_id, set.id)}
                          className="hover:text-rose-500 transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button 
                onClick={() => addSet(ex.exercise_id)}
                className="w-full py-2.5 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Plus size={14} /> ADD SET
              </button>
            </div>
          </div>
        ))}

        <div className="pt-4">
          <button 
            onClick={() => setShowExerciseSelector(true)}
            className="w-full py-4 border-2 border-dashed rounded-2xl font-bold hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-2"
            style={{ color: 'var(--brand)', borderColor: 'var(--border)' }}
          >
            <Plus size={20} /> ADD EXERCISE
          </button>
        </div>
      </div>

      {showExerciseSelector && (
        <ExerciseSelector 
          onSelect={addExercise}
          onCancel={() => setShowExerciseSelector(false)}
        />
      )}
    </div>
  )
}
