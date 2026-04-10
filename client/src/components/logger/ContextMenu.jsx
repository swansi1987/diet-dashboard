import { useEffect, useRef } from 'react'
import { Pencil, Copy, Trash2 } from 'lucide-react'

export default function ContextMenu({ x, y, onEdit, onCopy, onDelete, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const items = [
    { label: 'Edit quantity', icon: Pencil, action: onEdit },
    { label: 'Copy to form', icon: Copy, action: onCopy },
    { label: 'Delete', icon: Trash2, action: onDelete, danger: true },
  ]

  return (
    <div
      ref={ref}
      style={{ top: y, left: x }}
      className="fixed z-50 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 animate-fade-in"
    >
      {items.map(({ label, icon: Icon, action, danger }) => (
        <button
          key={label}
          onClick={() => { action?.(); onClose() }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
            danger ? 'text-red-400 hover:bg-red-900/20' : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  )
}
