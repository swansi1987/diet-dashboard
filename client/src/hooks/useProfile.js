import { useState, useEffect } from 'react'
import client from '../api/client.js'
import { calcAge } from '../utils/dateUtils.js'

export function useProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    client.get('/profile')
      .then(res => setProfile(res.data))
      .finally(() => setLoading(false))
  }, [])

  const saveProfile = async (data) => {
    const res = await client.put('/profile', data)
    setProfile(res.data)
    return res.data
  }

  const age = profile?.dob ? calcAge(profile.dob) : null

  return { profile, loading, saveProfile, age }
}
