import { useState, useEffect, useRef } from 'react'
import client from '../../api/client.js'
import { Search, X, ChevronRight, Dumbbell, Plus } from 'lucide-react'
import GlassCard from '../ui/GlassCard.jsx'

export default function ExerciseSelector({ onSelect, onCancel }) {
  const [exercises, setExercises] = useState([])
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('select') // 'select' or 'create'
  const searchInputRef = useRef(null)
  
  // Custom exercise form state
  const [newName, setNewName] = useState('')
  const [newMuscle, setNewMuscle] = useState('chest')
  const [creating, setCreating] = useState(false)

  const muscles = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core']

  useEffect(() => {
    if (mode === 'select') fetchExercises()
  }, [search, muscleFilter, mode])

  useEffect(() => {
    if (mode === 'select' && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [mode])

  const fetchExercises = async () => {
    try {
      setLoading(true)
      const res = await client.get('/exercises', {
        params: {
          search: search || undefined,
          muscle_group: muscleFilter || undefined
        }
      })
      setExercises(res.data)
    } catch (err) {
      console.error('Failed to fetch exercises')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCustom = async (e) => {
    e.preventDefault()
    if (!newName) return
    setCreating(true)
    try {
      const res = await client.post('/exercises', {
        name: newName,
        muscle_group: newMuscle,
        equipment: 'other',
        category: 'strength'
      })
      onSelect(res.data)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create exercise')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex flex-col p-4 animate-fade-in">
      <div className="max-w-xl mx-auto w-full flex-1 flex flex-col overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {mode === 'select' ? 'Add Exercise' : 'Create Custom Exercise'}
          </h2>
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {mode === 'select' ? (
          <>
            {/* Search & Filters */}
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  ref={searchInputRef}
                  placeholder="Search exercises..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setMuscleFilter('')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${!muscleFilter ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}
                >
                  ALL MUSCLES
                </button>
                {muscles.map(m => (
                  <button
                    key={m}
                    onClick={() => setMuscleFilter(m)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-all border ${muscleFilter === m ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4"></div>
                   <p className="text-sm">Finding exercises...</p>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setMode('create')}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all mb-2"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Plus size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-emerald-500">Create Custom Exercise</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Can't find it in the list?</div>
                    </div>
                  </button>

                  {exercises.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">
                      <p>No exercises found matching your search.</p>
                    </div>
                  ) : (
                    exercises.map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => onSelect(ex)}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-emerald-500 transition-colors">
                              <Dumbbell size={20} />
                          </div>
                          <div>
                              <div className="font-bold text-slate-200 group-hover:text-white transition-colors">{ex.name}</div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{ex.muscle_group}</div>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-700 group-hover:text-emerald-500 transition-colors" />
                      </button>
                    ))
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleCreateCustom} className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Exercise Name</label>
              <input
                type="text"
                autoFocus
                required
                placeholder="e.g. Weighted Pull-ups"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-4 px-4 text-white text-lg font-bold outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Primary Muscle Group</label>
              <div className="grid grid-cols-2 gap-2">
                {muscles.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setNewMuscle(m)}
                    className={`py-3 rounded-xl text-sm font-bold uppercase border transition-all ${newMuscle === m ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <button
                type="submit"
                disabled={creating || !newName}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white py-4 rounded-2xl font-black tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98]"
              >
                {creating ? 'CREATING...' : 'CREATE & ADD'}
              </button>
              <button
                type="button"
                onClick={() => setMode('select')}
                className="w-full py-3 text-slate-500 font-bold hover:text-slate-300 transition-colors"
              >
                Go Back to List
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
