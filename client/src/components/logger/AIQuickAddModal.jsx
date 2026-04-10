import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import GradientButton from '../ui/GradientButton.jsx'
import ErrorBanner from '../ui/ErrorBanner.jsx'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'
import client from '../../api/client.js'
import { Sparkles } from 'lucide-react'

export default function AIQuickAddModal({ isOpen, onClose, onAdd }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [parsed, setParsed] = useState(null)

  const handleParse = async () => {
    if (!text.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await client.post('/ai/quick-add', { text })
      setParsed(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'AI parsing failed. Check your API key in Settings.')
    } finally { setLoading(false) }
  }

  const handleAddAll = async () => {
    if (!parsed?.length) return
    for (const entry of parsed) {
      await onAdd({
        food_name: entry.foodName,
        meal_type: entry.mealType || 'snacks',
        quantity: entry.quantity || 100,
        calories: entry.calories || 0,
        protein: entry.protein || 0,
        carbs: entry.carbs || 0,
        fats: entry.fats || 0,
        consumed: true,
        is_junk_meal: entry.isJunkMeal || false,
      })
    }
    setText(''); setParsed(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { setText(''); setParsed(null); setError(null); onClose() }} title="AI Quick Add" size="md">
      <div className="p-6 space-y-4">
        <p className="text-sm text-slate-400">
          Describe what you ate in natural language and AI will parse it into log entries.
        </p>

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {!parsed && (
          <>
            <textarea
              className="input-field min-h-24 resize-none"
              placeholder="e.g. I had 200g of chicken breast and a cup of rice for lunch, plus an apple"
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <GradientButton variant="ghost" onClick={onClose}>Cancel</GradientButton>
              <GradientButton onClick={handleParse} disabled={loading || !text.trim()}>
                {loading ? <><LoadingSpinner size="sm" className="mr-2" /> Parsing...</> : <><Sparkles className="w-4 h-4 mr-1.5" /> Parse</>}
              </GradientButton>
            </div>
          </>
        )}

        {parsed && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">{parsed.length} item(s) found — review and confirm:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {parsed.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-slate-700/30 rounded-xl">
                  <div>
                    <div className="text-sm font-medium text-slate-200">{item.foodName}</div>
                    <div className="text-xs text-slate-500">{item.quantity}{item.unit} · {item.mealType}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-emerald-400">{item.calories} kcal</div>
                    <div className="text-xs text-slate-500">P:{item.protein} C:{item.carbs} F:{item.fats}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <GradientButton variant="ghost" onClick={() => setParsed(null)}>Re-parse</GradientButton>
              <GradientButton onClick={handleAddAll}>Add {parsed.length} Item{parsed.length !== 1 ? 's' : ''}</GradientButton>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
