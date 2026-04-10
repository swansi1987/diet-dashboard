import { useState, useEffect } from 'react'
import { useSettings } from '../../hooks/useSettings.js'
import GlassCard from '../ui/GlassCard.jsx'
import GradientButton from '../ui/GradientButton.jsx'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'
import { AI_PROVIDERS } from '../../utils/constants.js'
import { Eye, EyeOff, CheckCircle, Circle } from 'lucide-react'

function APIKeyInput({ label, settingKey, isSet, onSave }) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!value.trim()) return
    setSaving(true)
    try {
      await onSave(settingKey, value.trim())
      setValue('')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        {label}
        {isSet && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle className="w-3 h-3" /> Set
          </span>
        )}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            className="input-field pr-10"
            placeholder={isSet ? '••••••••••••••••' : 'Paste your API key here'}
            value={value}
            onChange={e => setValue(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <GradientButton onClick={handleSave} disabled={saving || !value.trim()} size="md">
          {saving ? <LoadingSpinner size="sm" /> : saved ? '✓ Saved' : 'Save'}
        </GradientButton>
      </div>
    </div>
  )
}

export default function SettingsView() {
  const { settings, loading, saveSetting } = useSettings()
  const [provider, setProvider] = useState('gemini')
  const [savingProvider, setSavingProvider] = useState(false)

  useEffect(() => {
    if (settings.preferred_ai_provider) setProvider(settings.preferred_ai_provider)
  }, [settings.preferred_ai_provider])

  const handleProviderChange = async (p) => {
    setProvider(p)
    setSavingProvider(true)
    try { await saveSetting('preferred_ai_provider', p) }
    finally { setSavingProvider(false) }
  }

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <GlassCard className="p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-200 mb-1">AI Features Setup</h2>
          <p className="text-sm text-slate-400 mb-4">
            AI features are optional. Configure your API keys below. All AI calls are made
            server-side — your keys are never exposed to the browser.
          </p>

          {/* Provider info table */}
          <div className="mb-6 rounded-xl overflow-hidden border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/60 border-b border-slate-700">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-300 uppercase tracking-wide">Provider</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-300 uppercase tracking-wide">Model</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-300 uppercase tracking-wide">Key name</th>
                </tr>
              </thead>
              <tbody>
                {AI_PROVIDERS.map(({ value, label, model, keyName }, i) => (
                  <tr key={value} className={i < AI_PROVIDERS.length - 1 ? 'border-b border-slate-700/60' : ''}>
                    <td className="px-4 py-2.5 text-slate-300 font-medium">{label}</td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{model}</td>
                    <td className="px-4 py-2.5 text-slate-400">{keyName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Provider selector */}
          <div className="space-y-3 mb-6">
            <label className="block text-sm font-medium text-slate-300">Preferred Provider</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {AI_PROVIDERS.map(({ value, label, model }) => {
                const isActive = provider === value
                const keySet = settings[`${value}_api_key_set`]
                return (
                  <button
                    key={value}
                    onClick={() => handleProviderChange(value)}
                    className={`flex flex-col gap-1 p-4 rounded-xl border transition-all duration-200 text-left
                      ${isActive
                        ? 'border-emerald-500/50 bg-emerald-900/20'
                        : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${isActive ? 'text-emerald-300' : 'text-slate-300'}`}>{label}</span>
                      {isActive
                        ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                        : <Circle className="w-4 h-4 text-slate-600" />
                      }
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{model}</span>
                    {keySet && <span className="text-xs text-emerald-500">✓ Key configured</span>}
                  </button>
                )
              })}
            </div>
            {savingProvider && <p className="text-xs text-slate-500">Saving preference...</p>}
          </div>

          {/* API key inputs */}
          <div className="space-y-5">
            {AI_PROVIDERS.map(({ value, keyName, keySource }) => (
              <div key={value}>
                <APIKeyInput
                  label={keyName}
                  settingKey={`${value}_api_key`}
                  isSet={!!settings[`${value}_api_key_set`]}
                  onSave={saveSetting}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Get your key at{' '}
                  <a
                    href={`https://${keySource}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-emerald-400 underline underline-offset-2 transition-colors"
                  >
                    {keySource}
                  </a>
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            API keys are stored in your PostgreSQL database. Keys are never sent to your browser —
            all AI calls are made server-side using your credentials.
          </p>
        </div>
      </GlassCard>
    </div>
  )
}
