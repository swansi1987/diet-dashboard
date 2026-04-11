import { useState, useEffect } from 'react'
import { useProfile } from '../../hooks/useProfile.js'
import { useWeightLog } from '../../hooks/useWeightLog.js'
import GlassCard from '../ui/GlassCard.jsx'
import GradientButton from '../ui/GradientButton.jsx'
import ErrorBanner from '../ui/ErrorBanner.jsx'
import LoadingSpinner from '../ui/LoadingSpinner.jsx'
import { User, Calendar, Ruler, Weight, Activity } from 'lucide-react'

export default function ProfileView() {
  const { profile, loading, saveProfile, age } = useProfile()
  const { latestWeight } = useWeightLog(1)
  const [form, setForm] = useState({ name: '', dob: '', weight: '', height: '', waist: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (profile || latestWeight !== null) {
      setForm(prev => ({
        ...prev,
        name: profile?.name || prev.name,
        dob: profile?.dob ? profile.dob.split('T')[0] : prev.dob,
        weight: latestWeight !== null ? latestWeight : (profile?.weight || prev.weight),
        height: profile?.height || prev.height,
        waist: profile?.waist || prev.waist,
      }))
    }
  }, [profile, latestWeight])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await saveProfile(form)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <LoadingSpinner />
    </div>
  )

  const bmi = form.weight && form.height
    ? (form.weight / ((form.height / 100) ** 2)).toFixed(1)
    : null

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Profile</h1>

      {/* Stats */}
      {(age || bmi) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {age && (
            <GlassCard className="p-4 text-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{age}</div>
              <div className="text-xs text-slate-400 mt-1">Years Old</div>
            </GlassCard>
          )}
          {form.weight && (
            <GlassCard className="p-4 text-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{form.weight}</div>
              <div className="text-xs text-slate-400 mt-1">Weight (kg)</div>
            </GlassCard>
          )}
          {form.height && (
            <GlassCard className="p-4 text-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{form.height}</div>
              <div className="text-xs text-slate-400 mt-1">Height (cm)</div>
            </GlassCard>
          )}
          {bmi && (
            <GlassCard className="p-4 text-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{bmi}</div>
              <div className="text-xs text-slate-400 mt-1">BMI</div>
            </GlassCard>
          )}
        </div>
      )}

      <GlassCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
          {success && (
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-900/30 border border-emerald-700/50 rounded-xl text-emerald-300 text-sm">
              Profile saved successfully!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                <User className="w-4 h-4 text-emerald-400" /> Full Name
              </label>
              <input
                className="input-field"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" /> Date of Birth
              </label>
              <input
                type="date"
                className="input-field"
                value={form.dob}
                onChange={e => setForm(p => ({ ...p, dob: e.target.value }))}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                <Weight className="w-4 h-4 text-emerald-400" /> Weight (kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                className="input-field"
                value={form.weight}
                onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                placeholder="70"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                <Ruler className="w-4 h-4 text-emerald-400" /> Height (cm)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                className="input-field"
                value={form.height}
                onChange={e => setForm(p => ({ ...p, height: e.target.value }))}
                placeholder="175"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                <Activity className="w-4 h-4 text-emerald-400" /> Waist (cm)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                className="input-field"
                value={form.waist}
                onChange={e => setForm(p => ({ ...p, waist: e.target.value }))}
                placeholder="80"
              />
            </div>
          </div>

          <GradientButton type="submit" disabled={saving} size="lg">
            {saving ? 'Saving...' : 'Save Profile'}
          </GradientButton>
        </form>
      </GlassCard>
    </div>
  )
}
