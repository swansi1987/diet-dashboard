import { Router } from 'express'
import pool from '../db.js'
import { verifyJWT } from '../middleware/auth.js'

const router = Router()
router.use(verifyJWT)

router.get('/', async (req, res) => {
  const { limit = 90 } = req.query
  try {
    const result = await pool.query(
      'SELECT * FROM weight_log WHERE user_id = $1 ORDER BY date DESC LIMIT $2',
      [req.user.userId, limit]
    )
    res.json(result.rows.reverse())
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch weight log' })
  }
})

router.post('/', async (req, res) => {
  const { date, weight } = req.body
  if (!date || weight === undefined) return res.status(400).json({ error: 'date and weight required' })
  try {
    const result = await pool.query(
      `INSERT INTO weight_log (user_id, date, weight) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, date) DO UPDATE SET weight = $3 RETURNING *`,
      [req.user.userId, date, weight]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Failed to save weight entry' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM weight_log WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete weight entry' })
  }
})

export default router
