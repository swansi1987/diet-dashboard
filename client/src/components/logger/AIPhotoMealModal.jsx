import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import GradientButton from '../ui/GradientButton.jsx'
import ErrorBanner from '../ui/ErrorBanner.jsx'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'
import client from '../../api/client.js'
import { Camera } from 'lucide-react'
import { MEAL_TYPES, MEAL_LABELS } from '../../utils/constants.js'

export default function AIPhotoMealModal({ isOpen, onClose, onAdd, defaultMealType = 'snacks' }) {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [mealType, setMealType] = useState(defaultMealType)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const reset = () => { setImage(null); setPreview(null); setResult(null); setError(null) }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setResult(null)
  }

  const handleAnalyze = async () => {
    if (!image) return
    setLoading(true); setError(null)
    const fd = new FormData()
    fd.append('image', image)
    try {
      const res = await client.post('/ai/photo-meal', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Photo analysis failed. Check your API key in Settings.')
    } finally { setLoading(false) }
  }

  const handleLog = async () => {
    if (!result) return
    for (const entry of result.entries) {
      await onAdd({
        food_name: entry.foodName || 'Photo Meal',
        meal_type: mealType,
        quantity: entry.estimatedQuantityG || 0,
        calories: entry.calories || 0,
        protein: entry.protein || 0,
        carbs: entry.carbs || 0,
        fats: entry.fats || 0,
        is_junk_meal: true,
        consumed: true,
        image_url: result.imageUrl,
      })
    }
    reset(); onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose() }} title="AI Photo Meal" size="md">
      <div className="p-6 space-y-4">
        <p className="text-sm text-slate-400">
          Upload a photo of your meal for AI-powered nutritional analysis. Logged as a junk/cheat meal.
        </p>

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Meal Type</label>
          <select className="input-field" value={mealType} onChange={e => setMealType(e.target.value)}>
            {MEAL_TYPES.map(t => <option key={t} value={t}>{MEAL_LABELS[t]}</option>)}
          </select>
        </div>

        {!image ? (
          <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-colors">
            <Camera className="w-10 h-10 text-slate-500" />
            <span className="text-sm text-slate-400">Upload or capture meal photo</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          </label>
        ) : (
          <div className="space-y-3">
            {preview && (
              <img src={preview} alt="Meal preview" className="w-full max-h-48 object-cover rounded-xl" />
            )}
            {!result && (
              <div className="flex gap-3">
                <GradientButton variant="ghost" onClick={reset} className="flex-1 justify-center">Change Photo</GradientButton>
                <GradientButton onClick={handleAnalyze} disabled={loading} className="flex-1 justify-center">
                  {loading ? <><LoadingSpinner size="sm" className="mr-2" /> Analyzing...</> : 'Analyze'}
                </GradientButton>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">{result.entries?.length} item(s) detected:</p>
            <div className="space-y-2">
              {result.entries?.map((e, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-slate-700/30 rounded-xl">
                  <div className="text-sm text-slate-200">{e.foodName}</div>
                  <div className="text-right">
                    <div className="text-sm text-emerald-400">{e.calories} kcal</div>
                    <div className="text-xs text-slate-500">~{e.estimatedQuantityG}g</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <GradientButton variant="ghost" onClick={reset}>Retake</GradientButton>
              <GradientButton onClick={handleLog}>Log as Junk Meal</GradientButton>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
