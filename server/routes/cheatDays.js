import { Router } from 'express'
import pool from '../db.js'
import { verifyJWT } from '../middleware/auth.js'

const router = Router()
router.use(verifyJWT)

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT date, flagged FROM cheat_days WHERE user_id = $1 AND flagged = TRUE',
      [req.user.userId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cheat days' })
  }
})

router.put('/:date', async (req, res) => {
  const { flagged } = req.body
  const { date } = req.params
  const userId = req.user.userId
  try {
    if (flagged) {
      await pool.query(
        `INSERT INTO cheat_days (user_id, date, flagged) VALUES ($1,$2,TRUE)
         ON CONFLICT (user_id, date) DO UPDATE SET flagged = TRUE`,
        [userId, date]
      )
    } else {
      await pool.query('DELETE FROM cheat_days WHERE user_id = $1 AND date = $2', [userId, date])
    }
    res.json({ date, flagged: !!flagged })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cheat day' })
  }
})

export default router
