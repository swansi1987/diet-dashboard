import { useState, useEffect, useCallback } from 'react'
import client from '../api/client.js'

export function useDailyLog(date) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchLogs = useCallback(async () => {
    if (!date) return
    setLoading(true)
    setError(null)
    try {
      const res = await client.get('/daily-logs', { params: { date } })
      setLogs(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const addLog = async (entry) => {
    const res = await client.post('/daily-logs', { ...entry, date })
    setLogs(prev => [...prev, res.data])
    return res.data
  }

  const addLogs = async (entries) => {
    const added = []
    for (const entry of entries) {
      const res = await client.post('/daily-logs', { ...entry, date })
      added.push(res.data)
    }
    setLogs(prev => [...prev, ...added])
    return added
  }

  const updateLog = async (id, partial) => {
    // Optimistic update
    setLogs(prev => prev.map(l => l.id === id ? { ...l, ...partial } : l))
    try {
      const res = await client.put(`/daily-logs/${id}`, partial)
      setLogs(prev => prev.map(l => l.id === id ? res.data : l))
    } catch (err) {
      // Revert on failure
      fetchLogs()
      throw err
    }
  }

  const deleteLog = async (id) => {
    setLogs(prev => prev.filter(l => l.id !== id))
    try {
      await client.delete(`/daily-logs/${id}`)
    } catch {
      fetchLogs()
    }
  }

  const copyLogsToDate = async (ids, targetDate) => {
    const res = await client.post('/daily-logs/copy', { ids, targetDate })
    return res.data
  }

  return { logs, loading, error, addLog, addLogs, updateLog, deleteLog, copyLogsToDate, refetch: fetchLogs }
}
