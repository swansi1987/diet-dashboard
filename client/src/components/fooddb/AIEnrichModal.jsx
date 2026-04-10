import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import GradientButton from '../ui/GradientButton.jsx'
import ErrorBanner from '../ui/ErrorBanner.jsx'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'
import client from '../../api/client.js'
import { Search, Camera, ChefHat } from 'lucide-react'

export default function AIEnrichModal({ isOpen, onClose, foods = [], onApplyNutrition, onApplyRecipe }) {
  const [tab, setTab] = useState('text')
  const [foodName, setFoodName] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const reset = () => { setResult(null); setError(null); setFoodName(''); setImageFile(null); setSelectedIds([]) }

  const handleTextSearch = async () => {
    if (!foodName.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await client.post('/ai/enrich', { foodName })
      setResult({ type: 'nutrition', data: res.data })
    } catch (err) {
      setError(err.response?.data?.error || 'AI request failed')
    } finally { setLoading(false) }
  }

  const handleImageScan = async () => {
    if (!imageFile) return
    const fd = new FormData()
    fd.append('image', imageFile)
    setLoading(true); setError(null)
    try {
      const res = await client.post('/ai/enrich', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult({ type: 'nutrition', data: res.data })
    } catch (err) {
      setError(err.response?.data?.error || 'AI request failed')
    } finally { setLoading(false) }
  }

  const handleRecipe = async () => {
    if (selectedIds.length < 2) return setError('Select at least 2 ingredients')
    setLoading(true); setError(null)
    try {
      const res = await client.post('/ai/recipe', { ingredientIds: selectedIds })
      setResult({ type: 'recipe', data: res.data.markdown })
    } catch (err) {
      setError(err.response?.data?.error || 'AI request failed')
    } finally { setLoading(false) }
  }

  const TABS = [
    { id: 'text', label: 'Text Search', icon: Search },
    { id: 'image', label: 'Image Scan', icon: Camera },
    { id: 'recipe', label: 'Recipe Generator', icon: ChefHat },
  ]

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose() }} title="AI Food Enrichment" size="lg">
      <div className="p-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-700/50 rounded-xl p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setTab(id); reset() }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === id ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* Text Search */}
        {tab === 'text' && !result && (
          <div className="flex gap-3">
            <input
              className="input-field flex-1"
              placeholder="e.g. Chicken Breast, Brown Rice, Avocado..."
              value={foodName}
              onChange={e => setFoodName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTextSearch()}
            />
            <GradientButton onClick={handleTextSearch} disabled={loading || !foodName.trim()}>
              {loading ? <LoadingSpinner size="sm" /> : 'Search'}
            </GradientButton>
          </div>
        )}

        {/* Image Scan */}
        {tab === 'image' && !result && (
          <div className="space-y-3">
            <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-colors">
              <Camera className="w-8 h-8 text-slate-500" />
              <span className="text-sm text-slate-400">{imageFile ? imageFile.name : 'Upload food image'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files[0])} />
            </label>
            {imageFile && (
              <GradientButton onClick={handleImageScan} disabled={loading} className="w-full justify-center">
                {loading ? <><LoadingSpinner size="sm" /> Analyzing...</> : 'Analyze Image'}
              </GradientButton>
            )}
          </div>
        )}

        {/* Recipe Generator */}
        {tab === 'recipe' && !result && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Select 2+ ingredients from your food database</p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {foods.map(f => (
                <label key={f.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-700/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(f.id)}
                    onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, f.id] : prev.filter(i => i !== f.id))}
                    className="accent-emerald-500"
                  />
                  <span className="text-sm text-slate-300">{f.name}</span>
                  {f.brand_name && <span className="text-xs text-slate-500">{f.brand_name}</span>}
                </label>
              ))}
            </div>
            <GradientButton onClick={handleRecipe} disabled={loading || selectedIds.length < 2} className="w-full justify-center">
              {loading ? <><LoadingSpinner size="sm" /> Generating...</> : `Generate Recipe (${selectedIds.length} selected)`}
            </GradientButton>
          </div>
        )}

        {/* Results */}
        {result && result.type === 'nutrition' && (
          <div className="space-y-4">
            <div className="bg-slate-700/30 rounded-xl p-4">
              <div className="font-semibold text-white mb-3">{result.data.name}</div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                {['calories','protein','carbs','fats','calcium','iron','magnesium','potassium','zinc'].map(k => (
                  <div key={k} className="text-center">
                    <div className="text-slate-400 text-xs capitalize">{k}</div>
                    <div className="text-emerald-400 font-medium">{result.data[k] ?? 0}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <GradientButton variant="ghost" onClick={reset}>Try Again</GradientButton>
              <GradientButton onClick={() => { onApplyNutrition?.(result.data); reset(); onClose() }}>
                Apply to Form
              </GradientButton>
            </div>
          </div>
        )}

        {result && result.type === 'recipe' && (
          <div className="space-y-3">
            <div className="prose prose-invert prose-sm max-w-none bg-slate-700/30 rounded-xl p-4 max-h-64 overflow-y-auto text-slate-200 whitespace-pre-wrap text-sm">
              {result.data}
            </div>
            <div className="flex gap-3 justify-end">
              <GradientButton variant="ghost" onClick={reset}>Generate Another</GradientButton>
              <GradientButton onClick={() => { onApplyRecipe?.(result.data); reset(); onClose() }}>
                View Full Recipe
              </GradientButton>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
