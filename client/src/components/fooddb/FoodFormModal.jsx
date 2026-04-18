import { useState, useEffect } from 'react'
import Modal from '../ui/Modal.jsx'
import GradientButton from '../ui/GradientButton.jsx'

const FIELDS = [
  { key: 'name', label: 'Food Name *', type: 'text', required: true, col: 2 },
  { key: 'brand_name', label: 'Brand Name', type: 'text', col: 2 },
  { key: 'base_quantity', label: 'Base Quantity', type: 'number', placeholder: '100', col: 1 },
  { key: 'unit', label: 'Unit', type: 'text', placeholder: 'g', col: 1 },
  { key: 'calories', label: 'Calories (kcal)', type: 'number', col: 1 },
  { key: 'protein', label: 'Protein (g)', type: 'number', col: 1 },
  { key: 'carbs', label: 'Carbs (g)', type: 'number', col: 1 },
  { key: 'fats', label: 'Fats (g)', type: 'number', col: 1 },
  { key: 'calcium', label: 'Calcium (mg)', type: 'number', col: 1 },
  { key: 'iron', label: 'Iron (mg)', type: 'number', col: 1 },
  { key: 'magnesium', label: 'Magnesium (mg)', type: 'number', col: 1 },
  { key: 'potassium', label: 'Potassium (mg)', type: 'number', col: 1 },
  { key: 'zinc', label: 'Zinc (mg)', type: 'number', col: 1 },
]

const empty = { name: '', brand_name: '', base_quantity: 100, unit: 'g', calories: 0, protein: 0, carbs: 0, fats: 0, calcium: 0, iron: 0, magnesium: 0, potassium: 0, zinc: 0, is_global: false }

export default function FoodFormModal({ isOpen, onClose, onSave, editFood = null }) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(editFood ? { ...empty, ...editFood } : empty)
  }, [editFood, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editFood ? 'Edit Food Item' : 'Add Food Item'} size="lg">
      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-2 gap-4">
          {FIELDS.map(({ key, label, type, required, placeholder, col }) => (
            <div key={key} className={col === 2 ? 'col-span-2' : 'col-span-1'}>
              <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
              <input
                type={type}
                required={required}
                step={type === 'number' ? '0.01' : undefined}
                min={type === 'number' ? '0' : undefined}
                className="input-field"
                placeholder={placeholder || ''}
                value={form[key] ?? ''}
                onChange={e => setForm(p => ({ ...p, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_global || false}
              onChange={e => setForm(p => ({ ...p, is_global: e.target.checked }))}
              className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
            />
            <span className="text-sm text-slate-300">
              Share with all users
              <span className="ml-1.5 text-xs text-slate-500">(visible to everyone in the app)</span>
            </span>
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <GradientButton variant="ghost" onClick={onClose} type="button">Cancel</GradientButton>
          <GradientButton type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</GradientButton>
        </div>
      </form>
    </Modal>
  )
}
