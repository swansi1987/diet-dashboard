import { Router } from 'express'
import pool from '../db.js'
import { verifyJWT } from '../middleware/auth.js'

const router = Router()
router.use(verifyJWT)

// POST / — Register a push token
router.post('/', async (req, res, next) => {
  try {
    const { token, platform } = req.body
    if (!token || !platform) return res.status(400).json({ error: 'token and platform required' })
    await pool.query(
      `INSERT INTO push_tokens (user_id, token, platform) VALUES ($1,$2,$3) ON CONFLICT (user_id, token) DO NOTHING`,
      [req.user.userId, token, platform]
    )
    res.json({ success: true })
  } catch (err) { next(err) }
})

// DELETE / — Remove a push token (or all for user)
router.delete('/', async (req, res, next) => {
  try {
    const { token } = req.body
    if (token) {
      await pool.query('DELETE FROM push_tokens WHERE user_id = $1 AND token = $2', [req.user.userId, token])
    } else {
      await pool.query('DELETE FROM push_tokens WHERE user_id = $1', [req.user.userId])
    }
    res.json({ success: true })
  } catch (err) { next(err) }
})

export default router
