import { useState, useEffect } from 'react'
import client from '../api/client.js'

export function useSettings() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    client.get('/settings')
      .then(res => setSettings(res.data))
      .finally(() => setLoading(false))
  }, [])

  const saveSetting = async (key, value) => {
    setSaving(true)
    try {
      await client.put('/settings', { [key]: value })
      setSettings(prev => ({ ...prev, [key]: value }))
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = async (updates) => {
    setSaving(true)
    try {
      await client.put('/settings', updates)
      setSettings(prev => ({ ...prev, ...updates }))
    } finally {
      setSaving(false)
    }
  }

  return { settings, loading, saving, saveSetting, saveSettings }
}
