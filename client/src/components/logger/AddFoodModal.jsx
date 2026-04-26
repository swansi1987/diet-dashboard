import { useState, useEffect } from 'react'
import Modal from '../ui/Modal.jsx'
import GradientButton from '../ui/GradientButton.jsx'
import { useFoodDatabase } from '../../hooks/useFoodDatabase.js'
import { useFuseSearch } from '../../hooks/useFuseSearch.js'
import { scaleNutrition } from '../../utils/nutritionCalc.js'
import { MEAL_TYPES, MEAL_LABELS } from '../../utils/constants.js'
import { Search } from 'lucide-react'

export default function AddFoodModal({ isOpen, onClose, onAdd, defaultMealType = 'breakfast' }) {
  const [selected, setSelected] = useState(null)
  const [quantity, setQuantity] = useState('')
  const [mealType, setMealType] = useState(defaultMealType)

  // Load full food list once — no API calls during search
  const { foods, loading: foodsLoading } = useFoodDatabase('')

  // Client-side fuzzy search via Fuse.js — instant, typo-tolerant, mid-string matching
  const { query, results, search } = useFuseSearch(foods)

  useEffect(() => {
    if (!isOpen) { search(''); setSelected(null); setQuantity('') }
    setMealType(defaultMealType)
  }, [isOpen, defaultMealType]) // eslint-disable-line react-hooks/exhaustive-deps

  const scaled = selected ? scaleNutrition(selected, parseFloat(quantity) || 0) : null

  const handleAdd = () => {
    if (!selected) return
    const qty = parseFloat(quantity) || selected.base_quantity || 100
    onAdd({
      food_id: selected.id,
      food_name: selected.name,
      brand_name: selected.brand_name,
      meal_type: mealType,
      quantity: qty,
      ...scaleNutrition(selected, qty),
      consumed: true,
      is_junk_meal: false,
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Food" size="md">
      <div className="p-6 space-y-4">
        {/* Meal type */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Meal Type</label>
          <select
            className="input-field"
            value={mealType}
            onChange={e => setMealType(e.target.value)}
          >
            {MEAL_TYPES.map(t => <option key={t} value={t}>{MEAL_LABELS[t]}</option>)}
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="input-field pl-10"
            placeholder="Search food database..."
            value={query}
            onChange={e => { search(e.target.value); setSelected(null) }}
          />
        </div>

        {/* Food list — Fuse.js results, instant & typo-tolerant */}
        {!selected && query.length >= 2 && results.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-1">
            {results.map(f => (
              <button
                key={f.id}
                onClick={() => setSelected(f)}
                className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-700/50 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-slate-200">{f.name}</div>
                  {f.brand_name && <div className="text-xs text-slate-500">{f.brand_name}</div>}
                </div>
                <div className="text-xs text-emerald-400">{f.calories} kcal/{f.base_quantity}{f.unit}</div>
              </button>
            ))}
          </div>
        )}

        {/* Empty state — shown only after 2+ chars with no matches */}
        {!selected && query.length >= 2 && results.length === 0 && !foodsLoading && (
          <p className="text-center text-slate-500 text-sm py-3">
            No foods found for &ldquo;{query}&rdquo;
          </p>
        )}

        {/* Selected food + quantity */}
        {selected && (
          <div className="bg-slate-700/30 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-slate-200">{selected.name}</div>
                {selected.brand_name && <div className="text-xs text-slate-500">{selected.brand_name}</div>}
              </div>
              <button onClick={() => setSelected(null)} className="text-xs text-slate-500 hover:text-slate-300">Change</button>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 shrink-0">Quantity ({selected.unit || 'g'})</label>
              <input
                type="number"
                min="1"
                step="1"
                className="input-field w-28"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>

            {scaled && (
              <div className="grid grid-cols-4 gap-2 text-xs text-center">
                {[['Cal', 'calories', 'emerald'], ['Pro', 'protein', 'cyan'], ['Carb', 'carbs', 'yellow'], ['Fat', 'fats', 'orange']].map(([label, key, color]) => (
                  <div key={key} className="bg-slate-800/50 rounded-lg py-2">
                    <div className={`text-${color}-400 font-semibold`}>{scaled[key]}</div>
                    <div className="text-slate-500 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <GradientButton variant="ghost" onClick={onClose}>Cancel</GradientButton>
          <GradientButton onClick={handleAdd} disabled={!selected}>Add to Log</GradientButton>
        </div>
      </div>
    </Modal>
  )
}
