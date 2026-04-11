import { useState, useEffect, useCallback } from 'react'
import client from '../api/client.js'

export function useFoodDatabase(search = '') {
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchFoods = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get('/food-database', { params: search ? { search } : {} })
      setFoods(res.data)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchFoods() }, [fetchFoods])

  const addFood = async (data) => {
    const res = await client.post('/food-database', data)
    setFoods(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)))
    return res.data
  }

  const updateFood = async (id, data) => {
    const res = await client.put(`/food-database/${id}`, data)
    setFoods(prev => prev.map(f => f.id === id ? res.data : f))
    return res.data
  }

  const deleteFood = async (id) => {
    await client.delete(`/food-database/${id}`)
    setFoods(prev => prev.filter(f => f.id !== id))
  }

  const exportCSV = async () => {
    try {
      const res = await client.get('/food-database/export-csv', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `food_database_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export CSV failed:', err)
    }
  }

  const importCSV = async (rows) => {
    const res = await client.post('/food-database/import-csv', { rows })
    await fetchFoods()
    return res.data
  }

  return { foods, loading, addFood, updateFood, deleteFood, exportCSV, importCSV, refetch: fetchFoods }
}
