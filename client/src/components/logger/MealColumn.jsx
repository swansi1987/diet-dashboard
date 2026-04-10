import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import FoodLogItem from './FoodLogItem.jsx'
import { MEAL_LABELS, MEAL_ICONS } from '../../utils/constants.js'
import { Plus } from 'lucide-react'

export default function MealColumn({ mealType, items, onAddFood, onToggleConsumed, onEdit, onCopy, onDelete, selectedIds, onSelect }) {
  const { setNodeRef, isOver } = useDroppable({ id: mealType })
  const ids = items.map(i => i.id)
  const total = items.filter(i => i.consumed).reduce((s, i) => s + (+i.calories || 0), 0)

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border transition-all duration-200 ${
        isOver
          ? 'border-emerald-500/50 bg-emerald-900/10'
          : 'border-slate-700/50 bg-slate-800/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-base">{MEAL_ICONS[mealType]}</span>
          <span className="text-sm font-semibold text-slate-200">{MEAL_LABELS[mealType]}</span>
          {items.length > 0 && (
            <span className="text-xs text-slate-500">({items.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && <span className="text-xs text-emerald-400">{Math.round(total)} kcal</span>}
          <button
            onClick={() => onAddFood(mealType)}
            className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-slate-700/50 rounded-lg transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="p-2 min-h-12 space-y-1">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <FoodLogItem
              key={item.id}
              item={item}
              onToggleConsumed={(consumed) => onToggleConsumed(item.id, consumed)}
              onEdit={onEdit}
              onCopy={onCopy}
              onDelete={onDelete}
              selected={selectedIds?.includes(item.id)}
              onSelect={(checked) => onSelect?.(item.id, checked)}
            />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div
            className="flex items-center justify-center h-10 text-xs text-slate-600 cursor-pointer hover:text-slate-500 transition-colors"
            onClick={() => onAddFood(mealType)}
          >
            Drop here or click + to add
          </div>
        )}
      </div>
    </div>
  )
}
