import { Router } from 'express'
import pool from '../db.js'
import { verifyJWT } from '../middleware/auth.js'

const router = Router()
router.use(verifyJWT)

// GET /api/daily-logs?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  const { date } = req.query
  const userId = req.user.userId
  try {
    if (date) {
      const result = await pool.query(
        'SELECT * FROM daily_logs WHERE user_id = $1 AND date = $2 ORDER BY sort_order ASC, created_at ASC',
        [userId, date]
      )
      return res.json(result.rows)
    }
    // Return all logs for range (used by reports)
    const { start, end } = req.query
    const result = await pool.query(
      'SELECT * FROM daily_logs WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date ASC, sort_order ASC',
      [userId, start || '2000-01-01', end || '2100-01-01']
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch logs' })
  }
})

// POST /api/daily-logs
router.post('/', async (req, res) => {
  const userId = req.user.userId
  const {
    date, meal_type, food_name, brand_name, quantity,
    calories, protein, carbs, fats, calcium, iron, magnesium, potassium, zinc,
    food_id, consumed, is_junk_meal, image_url, sort_order
  } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO daily_logs
        (user_id, date, meal_type, food_name, brand_name, quantity, calories, protein, carbs, fats,
         calcium, iron, magnesium, potassium, zinc, food_id, consumed, is_junk_meal, image_url, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [userId, date, meal_type, food_name, brand_name ?? null, quantity ?? 0,
       calories ?? 0, protein ?? 0, carbs ?? 0, fats ?? 0,
       calcium ?? 0, iron ?? 0, magnesium ?? 0, potassium ?? 0, zinc ?? 0,
       food_id ?? null, consumed ?? true, is_junk_meal ?? false, image_url ?? null, sort_order ?? 0]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to add log entry' })
  }
})

// PUT /api/daily-logs/:id
router.put('/:id', async (req, res) => {
  const userId = req.user.userId
  const { id } = req.params
  const fields = req.body
  const allowed = ['meal_type','food_name','brand_name','quantity','calories','protein','carbs','fats',
                   'calcium','iron','magnesium','potassium','zinc','consumed','is_junk_meal','image_url','sort_order']
  const updates = Object.keys(fields).filter(k => allowed.includes(k))
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' })
  const setClauses = updates.map((k, i) => `${k} = $${i + 1}`).join(', ')
  const values = updates.map(k => fields[k])
  try {
    const result = await pool.query(
      `UPDATE daily_logs SET ${setClauses} WHERE id = $${updates.length + 1} AND user_id = $${updates.length + 2} RETURNING *`,
      [...values, id, userId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Log entry not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update log entry' })
  }
})

// DELETE /api/daily-logs/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  const userId = req.user.userId
  try {
    await pool.query('DELETE FROM daily_logs WHERE id = $1 AND user_id = $2', [id, userId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete log entry' })
  }
})

// POST /api/daily-logs/copy — copy entries to another date
router.post('/copy', async (req, res) => {
  const userId = req.user.userId
  const { ids, targetDate } = req.body
  if (!ids?.length || !targetDate) return res.status(400).json({ error: 'ids and targetDate required' })
  try {
    const existing = await pool.query(
      `SELECT * FROM daily_logs WHERE id = ANY($1::int[]) AND user_id = $2`,
      [ids, userId]
    )
    const inserted = []
    for (const row of existing.rows) {
      const r = await pool.query(
        `INSERT INTO daily_logs
          (user_id, date, meal_type, food_name, brand_name, quantity, calories, protein, carbs, fats,
           calcium, iron, magnesium, potassium, zinc, food_id, consumed, is_junk_meal, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING *`,
        [userId, targetDate, row.meal_type, row.food_name, row.brand_name, row.quantity,
         row.calories, row.protein, row.carbs, row.fats,
         row.calcium, row.iron, row.magnesium, row.potassium, row.zinc,
         row.food_id, true, row.is_junk_meal, row.sort_order]
      )
      inserted.push(r.rows[0])
    }
    res.json(inserted)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to copy logs' })
  }
})

export default router
