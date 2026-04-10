import { useState, useEffect } from 'react'
import client from '../api/client.js'

export function useWeightLog(limit = 90) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    client.get('/weight-log', { params: { limit } })
      .then(res => setEntries(res.data))
      .finally(() => setLoading(false))
  }, [limit])

  const addEntry = async (date, weight) => {
    const res = await client.post('/weight-log', { date, weight })
    setEntries(prev => {
      const filtered = prev.filter(e => e.date !== date)
      return [...filtered, res.data].sort((a, b) => a.date.localeCompare(b.date))
    })
    return res.data
  }

  const deleteEntry = async (id) => {
    await client.delete(`/weight-log/${id}`)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const latestWeight = entries.length ? entries[entries.length - 1].weight : null

  return { entries, loading, addEntry, deleteEntry, latestWeight }
}
