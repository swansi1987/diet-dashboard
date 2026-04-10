import { useState } from 'react'
import GlassCard from '../ui/GlassCard.jsx'
import GradientButton from '../ui/GradientButton.jsx'
import ErrorBanner from '../ui/ErrorBanner.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import client from '../../api/client.js'
import { Download, Upload, AlertTriangle } from 'lucide-react'

export default function DataManagementView() {
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [importData, setImportData] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleExport = () => {
    window.open('/api/data/export', '_blank')
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        setImportData(data)
        setImportError(null)
        setImportResult(null)
      } catch {
        setImportError('Invalid JSON file. Please select a valid backup file.')
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!importData) return
    setImporting(true); setImportError(null)
    try {
      const res = await client.post('/api/data/import', importData)
      setImportResult(res.data.message)
      setImportData(null)
    } catch (err) {
      setImportError(err.response?.data?.error || 'Import failed')
    } finally { setImporting(false) }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Data Management</h1>

      {/* Export */}
      <GlassCard className="p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-200 mb-1">Export Backup</h2>
          <p className="text-sm text-slate-400">
            Download all your data as a JSON file including daily logs, food database, weight log, and profile.
          </p>
        </div>
        <GradientButton onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" /> Download Backup JSON
        </GradientButton>
      </GlassCard>

      {/* Import */}
      <GlassCard className="p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-200 mb-1">Restore from Backup</h2>
          <div className="flex items-start gap-2 p-3 bg-orange-900/20 border border-orange-700/40 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <p className="text-sm text-orange-300">
              Importing will <strong>replace all current data</strong>. This cannot be undone.
              Export a backup first if needed.
            </p>
          </div>
        </div>

        {importError && <ErrorBanner message={importError} onDismiss={() => setImportError(null)} />}
        {importResult && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-900/30 border border-emerald-700/50 rounded-xl text-emerald-300 text-sm">
            ✅ {importResult}
          </div>
        )}

        <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-colors">
          <Upload className="w-8 h-8 text-slate-500" />
          <span className="text-sm text-slate-400">{importData ? '✅ File loaded — ready to import' : 'Select backup JSON file'}</span>
          <input type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
        </label>

        {importData && (
          <div className="space-y-2 text-sm text-slate-400">
            <p>Backup from: <span className="text-slate-300">{importData.exportedAt?.split('T')[0] || 'unknown'}</span></p>
            <p>Daily logs: <span className="text-slate-300">{importData.dailyLogs?.length || 0}</span></p>
            <p>Food database: <span className="text-slate-300">{importData.foodDatabase?.length || 0} items</span></p>
            <p>Weight entries: <span className="text-slate-300">{importData.weightLog?.length || 0}</span></p>
            <GradientButton
              variant="danger"
              onClick={() => setConfirmOpen(true)}
              disabled={importing}
            >
              {importing ? 'Importing...' : 'Restore This Backup'}
            </GradientButton>
          </div>
        )}
      </GlassCard>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleImport}
        title="Restore Backup"
        message="This will permanently replace all your current data with the backup. Are you absolutely sure?"
        confirmLabel="Yes, Restore"
        danger
      />
    </div>
  )
}
