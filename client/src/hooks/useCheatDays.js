import { useState, useEffect } from 'react'
import client from '../api/client.js'

export function useCheatDays() {
  const [cheatDays, setCheatDays] = useState([])

  useEffect(() => {
    client.get('/cheat-days').then(res => setCheatDays(res.data))
  }, [])

  const toggleCheatDay = async (date, flagged) => {
    await client.put(`/cheat-days/${date}`, { flagged })
    if (flagged) {
      setCheatDays(prev => [...prev.filter(c => c.date !== date), { date, flagged: true }])
    } else {
      setCheatDays(prev => prev.filter(c => c.date !== date))
    }
  }

  const isCheatDay = (date) => cheatDays.some(c => c.date === date && c.flagged)

  return { cheatDays, toggleCheatDay, isCheatDay }
}
