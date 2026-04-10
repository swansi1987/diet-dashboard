import { useState } from 'react'
import { useFoodDatabase } from '../../hooks/useFoodDatabase.js'
import GlassCard from '../ui/GlassCard.jsx'
import GradientButton from '../ui/GradientButton.jsx'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'
import FoodFormModal from './FoodFormModal.jsx'
import BulkImportModal from './BulkImportModal.jsx'
import AIEnrichModal from './AIEnrichModal.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { Plus, Search, Pencil, Trash2, Download, Upload, Sparkles } from 'lucide-react'

export default function FoodDatabaseView() {
  const [search, setSearch] = useState('')
  const { foods, loading, addFood, updateFood, deleteFood, exportCSV, importCSV } = useFoodDatabase(search)
  const [formModal, setFormModal] = useState({ open: false, food: null })
  const [importModal, setImportModal] = useState(false)
  const [enrichModal, setEnrichModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null })

  const handleSave = async (data) => {
    if (formModal.food) {
      await updateFood(formModal.food.id, data)
    } else {
      await addFood(data)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Food Database</h1>
        <div className="flex flex-wrap gap-2">
          <GradientButton variant="ghost" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </GradientButton>
          <GradientButton variant="ghost" size="sm" onClick={() => setImportModal(true)}>
            <Upload className="w-4 h-4 mr-1.5" /> Import CSV
          </GradientButton>
          <GradientButton variant="ghost" size="sm" onClick={() => setEnrichModal(true)}>
            <Sparkles className="w-4 h-4 mr-1.5" /> AI Enrich
          </GradientButton>
          <GradientButton size="sm" onClick={() => setFormModal({ open: true, food: null })}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Food
          </GradientButton>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          className="input-field pl-10"
          placeholder="Search food database..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <LoadingSpinner />
          </div>
        ) : foods.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <p>No foods found.</p>
            <button onClick={() => setFormModal({ open: true, food: null })} className="text-emerald-400 text-sm mt-2 hover:text-emerald-300">
              Add your first food →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Food</th>
                  <th className="text-right px-3 py-3 text-slate-400 font-medium">Per</th>
                  <th className="text-right px-3 py-3 text-slate-400 font-medium">Cal</th>
                  <th className="text-right px-3 py-3 text-slate-400 font-medium">P(g)</th>
                  <th className="text-right px-3 py-3 text-slate-400 font-medium">C(g)</th>
                  <th className="text-right px-3 py-3 text-slate-400 font-medium">F(g)</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {foods.map(f => (
                  <tr key={f.id} className="border-b border-slate-800 hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{f.name}</div>
                      {f.brand_name && <div className="text-xs text-slate-500">{f.brand_name}</div>}
                    </td>
                    <td className="text-right px-3 py-3 text-slate-400">{f.base_quantity}{f.unit}</td>
                    <td className="text-right px-3 py-3 text-emerald-400 font-medium">{f.calories}</td>
                    <td className="text-right px-3 py-3 text-slate-300">{f.protein}</td>
                    <td className="text-right px-3 py-3 text-slate-300">{f.carbs}</td>
                    <td className="text-right px-3 py-3 text-slate-300">{f.fats}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setFormModal({ open: true, food: f })} className="p-1.5 text-slate-500 hover:text-emerald-400 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm({ open: true, id: f.id })} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Modals */}
      <FoodFormModal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, food: null })}
        onSave={handleSave}
        editFood={formModal.food}
      />
      <BulkImportModal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        onImport={importCSV}
      />
      <AIEnrichModal
        isOpen={enrichModal}
        onClose={() => setEnrichModal(false)}
        foods={foods}
        onApplyNutrition={(data) => setFormModal({ open: true, food: { ...data, base_quantity: 100, unit: 'g' } })}
      />
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => deleteFood(deleteConfirm.id)}
        title="Delete Food Item"
        message="Are you sure you want to delete this food item? This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
