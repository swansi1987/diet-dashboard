import { Router } from 'express'
import pool from '../db.js'
import { verifyJWT } from '../middleware/auth.js'

const router = Router()
router.use(verifyJWT)

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [req.user.userId])
    res.json(result.rows[0] || {})
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

router.put('/', async (req, res) => {
  const { name, dob, weight, height, waist } = req.body
  const userId = req.user.userId
  try {
    const result = await pool.query(
      `INSERT INTO profiles (user_id, name, dob, weight, height, waist) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id) DO UPDATE SET name=$2, dob=$3, weight=$4, height=$5, waist=$6 RETURNING *`,
      [userId, name ?? null, dob ?? null, weight ?? null, height ?? null, waist ?? null]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

export default router
