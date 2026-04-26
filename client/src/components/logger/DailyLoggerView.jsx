import { useState, useCallback } from 'react'
import { DndContext, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useApp } from '../../context/AppContext.jsx'
import { useDailyLog } from '../../hooks/useDailyLog.js'
import { useCheatDays } from '../../hooks/useCheatDays.js'
import apiClient from '../../api/client.js'
import MealColumn from './MealColumn.jsx'
import AddFoodModal from './AddFoodModal.jsx'
import AIQuickAddModal from './AIQuickAddModal.jsx'
import AIPhotoMealModal from './AIPhotoMealModal.jsx'
import CopyMealModal from './CopyMealModal.jsx'
import GradientButton from '../ui/GradientButton.jsx'
import ErrorBanner from '../ui/ErrorBanner.jsx'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'
import { MEAL_TYPES } from '../../utils/constants.js'
import { scaleNutrition } from '../../utils/nutritionCalc.js'
import { Sparkles, Camera, Copy, Flag, CheckSquare } from 'lucide-react'

export default function DailyLoggerView() {
  const { selectedDate } = useApp()
  const { logs, loading, error, addLog, addLogs, updateLog, deleteLog, copyLogsToDate } = useDailyLog(selectedDate)
  const { isCheatDay, toggleCheatDay } = useCheatDays()

  const [addModal, setAddModal] = useState({ open: false, mealType: 'breakfast' })
  const [aiModal, setAiModal] = useState(false)
  const [photoModal, setPhotoModal] = useState(false)
  const [copyModal, setCopyModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [activeDrag, setActiveDrag] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const cheatDay = isCheatDay(selectedDate)

  const logsByMealType = MEAL_TYPES.reduce((acc, type) => {
    acc[type] = logs.filter(l => l.meal_type === type).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    return acc
  }, {})

  const handleDragStart = ({ active }) => {
    setActiveDrag(logs.find(l => l.id === active.id))
  }

  const handleDragEnd = useCallback(async ({ active, over }) => {
    setActiveDrag(null)
    if (!over || active.id === over.id) return

    const activeItem = logs.find(l => l.id === active.id)
    const overItem = logs.find(l => l.id === over.id)
    const overContainer = over.id

    // Moving to a different meal type column
    if (!overItem && MEAL_TYPES.includes(overContainer)) {
      if (activeItem.meal_type !== overContainer) {
        await updateLog(active.id, { meal_type: overContainer })
      }
      return
    }

    // Reordering within same column or moving to different column
    if (overItem) {
      if (activeItem.meal_type !== overItem.meal_type) {
        await updateLog(active.id, { meal_type: overItem.meal_type })
      }
    }
  }, [logs, updateLog])

  const handleToggleConsumed = (id, consumed) => {
    updateLog(id, { consumed })
  }

  const handleEditQuantity = async (id, newQty) => {
    const item = logs.find(l => l.id === id)
    if (!item) return

    let scaled = null

    // 1. Try to fetch original food if ID exists
    if (item.food_id) {
      try {
        const res = await apiClient.get(`/food-database/${item.food_id}`)
        if (res.data) {
          scaled = scaleNutrition(res.data, newQty)
        }
      } catch (err) {
        console.warn('Failed to fetch food by ID, falling back to ratio scaling', err)
      }
    }

    // 2. Fallback to ratio scaling if we couldn't get original food data
    if (!scaled && item.quantity > 0) {
      const ratio = newQty / item.quantity
      scaled = {
        calories: Math.round((item.calories || 0) * ratio * 10) / 10,
        protein: Math.round((item.protein || 0) * ratio * 10) / 10,
        carbs: Math.round((item.carbs || 0) * ratio * 10) / 10,
        fats: Math.round((item.fats || 0) * ratio * 10) / 10,
        calcium: Math.round((item.calcium || 0) * ratio * 10) / 10,
        iron: Math.round((item.iron || 0) * ratio * 10) / 10,
        magnesium: Math.round((item.magnesium || 0) * ratio * 10) / 10,
        potassium: Math.round((item.potassium || 0) * ratio * 10) / 10,
        zinc: Math.round((item.zinc || 0) * ratio * 10) / 10,
      }
    }

    await updateLog(id, { quantity: newQty, ...scaled })
  }

  const handleCopyItem = (item) => {
    setAddModal({ open: true, mealType: item.meal_type })
  }

  const handleSelectItem = (id, checked) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id))
  }

  const handleSelectAll = (checked) => {
    setSelectedIds(checked ? logs.map(l => l.id) : [])
  }

  const handleCopySelected = async (targetDate) => {
    await copyLogsToDate(selectedIds, targetDate)
    setSelectedIds([])
  }

  const totalConsumed = logs.filter(l => l.consumed).reduce((s, l) => s + (+l.calories || 0), 0)
  const allSelected = logs.length > 0 && selectedIds.length === logs.length

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 flex flex-wrap gap-2">
          <GradientButton size="sm" onClick={() => setAddModal({ open: true, mealType: 'breakfast' })}>
            + Add Food
          </GradientButton>
          <GradientButton size="sm" variant="ghost" onClick={() => setAiModal(true)}>
            <Sparkles className="w-4 h-4 mr-1.5" /> AI Quick Add
          </GradientButton>
          <GradientButton size="sm" variant="ghost" onClick={() => setPhotoModal(true)}>
            <Camera className="w-4 h-4 mr-1.5" /> Photo Meal
          </GradientButton>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.length > 0 && (
            <GradientButton size="sm" variant="ghost" onClick={() => setCopyModal(true)}>
              <Copy className="w-4 h-4 mr-1.5" /> Copy {selectedIds.length}
            </GradientButton>
          )}
          <GradientButton
            size="sm"
            variant={cheatDay ? 'danger' : 'ghost'}
            onClick={() => toggleCheatDay(selectedDate, !cheatDay)}
          >
            <Flag className="w-4 h-4 mr-1.5" /> {cheatDay ? 'Cheat Day ✓' : 'Flag Cheat'}
          </GradientButton>
        </div>
      </div>

      {/* Select all */}
      {logs.length > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200">
            <input type="checkbox" checked={allSelected} onChange={e => handleSelectAll(e.target.checked)} className="accent-emerald-500" />
            <CheckSquare className="w-4 h-4" />
            Select All ({logs.length})
          </label>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">Total: <span className="text-emerald-400 font-medium">{Math.round(totalConsumed)} kcal</span></span>
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      {/* Meal columns */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {MEAL_TYPES.map(type => (
            <MealColumn
              key={type}
              mealType={type}
              items={logsByMealType[type]}
              onAddFood={(mt) => setAddModal({ open: true, mealType: mt })}
              onToggleConsumed={handleToggleConsumed}
              onEdit={handleEditQuantity}
              onCopy={handleCopyItem}
              onDelete={deleteLog}
              selectedIds={selectedIds}
              onSelect={handleSelectItem}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDrag && (
            <div className="px-3 py-2.5 bg-slate-800 border border-emerald-500/30 rounded-xl shadow-2xl text-sm text-slate-200 rotate-2">
              {activeDrag.food_name} · {activeDrag.calories} kcal
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      <AddFoodModal
        isOpen={addModal.open}
        onClose={() => setAddModal(p => ({ ...p, open: false }))}
        onAdd={addLog}
        defaultMealType={addModal.mealType}
      />
      <AIQuickAddModal isOpen={aiModal} onClose={() => setAiModal(false)} onAdd={addLog} />
      <AIPhotoMealModal isOpen={photoModal} onClose={() => setPhotoModal(false)} onAdd={addLog} />
      <CopyMealModal
        isOpen={copyModal}
        onClose={() => setCopyModal(false)}
        onCopy={handleCopySelected}
        logCount={selectedIds.length}
      />
    </div>
  )
}
