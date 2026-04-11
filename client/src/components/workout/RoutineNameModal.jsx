import { useState, useEffect } from 'react'
import { Play, X } from 'lucide-react'

export default function RoutineNameModal({ onConfirm, onCancel }) {
  const [name, setName] = useState('Empty Workout')
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsAnimating(true)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    onConfirm(name || 'Empty Workout')
  }

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isAnimating ? 'bg-slate-950/80 backdrop-blur-sm' : 'bg-transparent'}`}>
      <div 
        className={`w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 transform ${isAnimating ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
      >
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">New Workout</h2>
            <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-colors">
              <X size={20} />
            </button>
          </div>

          <p className="text-slate-400 text-sm">
            Give your workout routine a name to track it in your history.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Routine Name</label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Morning Push Day"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 px-4 text-white text-lg font-bold outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-white py-4 rounded-2xl font-black tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                START WORKOUT <Play size={18} fill="currentColor" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
