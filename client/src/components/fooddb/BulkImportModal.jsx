import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import GradientButton from '../ui/GradientButton.jsx'
import { Upload, CheckCircle } from 'lucide-react'

const EXPECTED_HEADERS = ['name','brand_name','base_quantity','unit','calories','protein','carbs','fats','calcium','iron','magnesium','potassium','zinc']

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  }).filter(r => r.name)
}

export default function BulkImportModal({ isOpen, onClose, onImport }) {
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result)
      setPreview(rows)
      setResult(null)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!preview?.length) return
    setImporting(true)
    try {
      const r = await onImport(preview)
      setResult(r)
      setPreview(null)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const csv = EXPECTED_HEADERS.join(',') + '\n' + 'Chicken Breast,,100,g,165,31,0,3.6,15,1,29,256,1'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'food_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Food Database (CSV)" size="lg">
      <div className="p-6 space-y-4">
        {result ? (
          <div className="text-center py-6">
            <div className="text-emerald-500 mb-3 flex justify-center"><CheckCircle size={40} /></div>
            <p className="text-emerald-400 font-medium">Import complete!</p>
            <p className="text-slate-400 text-sm mt-1">{result.added} added · {result.updated} updated</p>
            <GradientButton className="mt-4" onClick={onClose}>Done</GradientButton>
          </div>
        ) : (
          <>
            <div className="flex gap-3">
              <label className="flex-1 flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-colors">
                <Upload className="w-8 h-8 text-slate-500" />
                <span className="text-sm text-slate-400">Click to select CSV file</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
              </label>
            </div>
            <button onClick={downloadTemplate} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors underline">
              Download CSV template
            </button>
            {preview && (
              <div>
                <p className="text-sm text-slate-400 mb-2">{preview.length} rows ready to import</p>
                <div className="max-h-48 overflow-y-auto text-xs text-slate-300 space-y-1">
                  {preview.slice(0, 10).map((row, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/30 rounded-lg">
                      <span className="font-medium">{row.name}</span>
                      {row.brand_name && <span className="text-slate-500">· {row.brand_name}</span>}
                      <span className="ml-auto text-slate-500">{row.calories} kcal</span>
                    </div>
                  ))}
                  {preview.length > 10 && <p className="text-slate-500 text-center">… and {preview.length - 10} more</p>}
                </div>
                <div className="flex gap-3 justify-end mt-4">
                  <GradientButton variant="ghost" onClick={() => setPreview(null)} type="button">Clear</GradientButton>
                  <GradientButton onClick={handleImport} disabled={importing}>
                    {importing ? 'Importing...' : `Import ${preview.length} items`}
                  </GradientButton>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
