import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreVertical, Camera } from 'lucide-react'
import ContextMenu from './ContextMenu.jsx'
import Modal from '../ui/Modal.jsx'
import GradientButton from '../ui/GradientButton.jsx'

export default function FoodLogItem({ item, onToggleConsumed, onEdit, onCopy, onDelete, selected, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const [menuPos, setMenuPos] = useState(null)
  const [editModal, setEditModal] = useState(false)
  const [newQty, setNewQty] = useState(item.quantity || 0)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const openMenu = (e) => {
    e.preventDefault()
    setMenuPos({ x: e.clientX, y: e.clientY })
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-150 group
          ${item.consumed ? 'bg-slate-700/20' : 'bg-slate-800/20 opacity-60'}
          ${selected ? 'ring-1 ring-emerald-500/50 bg-emerald-900/10' : 'hover:bg-slate-700/30'}
          ${isDragging ? 'shadow-2xl shadow-black/40 z-50' : ''}
        `}
        onContextMenu={openMenu}
      >
        {/* Drag handle */}
        <div {...attributes} {...listeners} className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0">
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={!!selected}
          onChange={e => onSelect?.(e.target.checked)}
          onClick={e => e.stopPropagation()}
          className="accent-emerald-500 shrink-0"
        />

        {/* Consumed toggle */}
        <input
          type="checkbox"
          checked={item.consumed}
          onChange={e => onToggleConsumed(e.target.checked)}
          className="accent-cyan-500 shrink-0"
          title="Mark as consumed"
        />

        {/* Food info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {item.is_junk_meal && <Camera className="w-3 h-3 text-orange-400 shrink-0" />}
            <span className={`text-sm truncate ${item.consumed ? 'text-slate-200' : 'text-slate-400 line-through'}`}>
              {item.food_name}
            </span>
            {item.brand_name && <span className="text-xs text-slate-500 hidden sm:inline shrink-0">{item.brand_name}</span>}
          </div>
          <div className="text-xs text-slate-500">
            {item.quantity > 0 && `${item.quantity}g`}
            {item.is_junk_meal && <span className="ml-1 text-orange-400">· junk meal</span>}
          </div>
        </div>

        {/* Nutrition */}
        <div className="text-right shrink-0 hidden sm:block">
          <div className="text-sm font-medium text-emerald-400">{item.calories} kcal</div>
          <div className="text-xs text-slate-500">P:{item.protein} C:{item.carbs} F:{item.fats}</div>
        </div>
        <div className="sm:hidden text-sm font-medium text-emerald-400 shrink-0">{item.calories}</div>

        {/* Kebab menu */}
        <button
          onClick={openMenu}
          className="text-slate-600 hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {menuPos && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuPos(null)}
          onEdit={() => { setNewQty(item.quantity); setEditModal(true) }}
          onCopy={() => onCopy?.(item)}
          onDelete={() => onDelete(item.id)}
        />
      )}

      {/* Edit quantity modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Quantity" size="sm">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Quantity (g)</label>
            <input
              type="number"
              min="1"
              step="1"
              className="input-field"
              value={newQty}
              onChange={e => setNewQty(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <GradientButton variant="ghost" onClick={() => setEditModal(false)}>Cancel</GradientButton>
            <GradientButton onClick={() => { onEdit(item.id, newQty); setEditModal(false) }}>Update</GradientButton>
          </div>
        </div>
      </Modal>
    </>
  )
}
