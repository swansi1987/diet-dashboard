import { Router } from 'express'
import pool from '../db.js'
import { verifyJWT } from '../middleware/auth.js'
import { EXERCISES } from '../data/exercises-seed.js'

const router = Router()
router.use(verifyJWT)

// POST /seed — Bulk seed global exercises from built-in library (must be before /:id to avoid param match)
// Only seeds when the global exercises table is empty; pass force=true in body to override.
router.post('/seed', async (req, res, next) => {
  try {
    const force = req.body?.force === true

    if (!force) {
      const { rows } = await pool.query('SELECT COUNT(*) AS count FROM exercises WHERE is_global = TRUE')
      if (parseInt(rows[0].count) > 0) {
        return res.json({ seeded: 0, message: 'Global exercises already exist. Pass { force: true } to re-seed.' })
      }
    }

    let count = 0
    for (const ex of EXERCISES) {
      const result = await pool.query(
        `INSERT INTO exercises (name, muscle_group, secondary_muscles, equipment, category, instructions, tips, gif_url, thumbnail_url, is_global)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE)
         ON CONFLICT (name) DO NOTHING`,
        [
          ex.name,
          ex.muscle_group,
          ex.secondary_muscles ?? null,
          ex.equipment ?? 'bodyweight',
          ex.category ?? 'strength',
          ex.instructions ?? null,
          ex.tips ?? null,
          ex.gif_url ?? null,
          ex.thumbnail_url ?? null,
        ]
      )
      if (result.rowCount > 0) count++
    }
    res.json({ seeded: count, total: EXERCISES.length })
  } catch (err) { next(err) }
})

// GET / — List exercises (global + user's own custom)
router.get('/', async (req, res, next) => {
  try {
    const { search, muscle_group, equipment, category, global_only } = req.query
    const userId = req.user.userId
    let where = ['(e.is_global = TRUE OR e.created_by = $1)']
    const params = [userId]
    let p = 2
    if (search) { where.push(`e.name ILIKE $${p++}`); params.push(`%${search}%`) }
    if (muscle_group) { where.push(`e.muscle_group = $${p++}`); params.push(muscle_group) }
    if (equipment) { where.push(`e.equipment = $${p++}`); params.push(equipment) }
    if (category) { where.push(`e.category = $${p++}`); params.push(category) }
    if (global_only === 'true') { where[0] = 'e.is_global = TRUE' }
    const sql = `SELECT e.*, p.name as creator_name FROM exercises e LEFT JOIN profiles p ON p.user_id = e.created_by WHERE ${where.join(' AND ')} ORDER BY e.is_global DESC, e.name ASC`
    const { rows } = await pool.query(sql, params)
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM exercises WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Exercise not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// POST / — Create custom exercise
router.post('/', async (req, res, next) => {
  try {
    const { name, muscle_group, secondary_muscles, equipment, category, instructions, tips, gif_url, thumbnail_url } = req.body
    if (!name || !muscle_group) return res.status(400).json({ error: 'name and muscle_group required' })
    const { rows } = await pool.query(
      `INSERT INTO exercises (name, muscle_group, secondary_muscles, equipment, category, instructions, tips, gif_url, thumbnail_url, is_global, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,FALSE,$10) RETURNING *`,
      [name, muscle_group, secondary_muscles || null, equipment || 'bodyweight', category || 'strength', instructions || null, tips || null, gif_url || null, thumbnail_url || null, req.user.userId]
    )
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
})

// PUT /:id — Update own custom exercise
router.put('/:id', async (req, res, next) => {
  try {
    const { rows: [ex] } = await pool.query('SELECT * FROM exercises WHERE id = $1', [req.params.id])
    if (!ex) return res.status(404).json({ error: 'Not found' })
    if (ex.is_global || ex.created_by !== req.user.userId) return res.status(403).json({ error: 'Cannot modify this exercise' })
    const { name, muscle_group, secondary_muscles, equipment, category, instructions, tips, gif_url, thumbnail_url } = req.body
    const { rows } = await pool.query(
      `UPDATE exercises SET name=COALESCE($1,name), muscle_group=COALESCE($2,muscle_group), secondary_muscles=COALESCE($3,secondary_muscles), equipment=COALESCE($4,equipment), category=COALESCE($5,category), instructions=COALESCE($6,instructions), tips=COALESCE($7,tips), gif_url=COALESCE($8,gif_url), thumbnail_url=COALESCE($9,thumbnail_url) WHERE id=$10 RETURNING *`,
      [name, muscle_group, secondary_muscles, equipment, category, instructions, tips, gif_url, thumbnail_url, req.params.id]
    )
    res.json(rows[0])
  } catch (err) { next(err) }
})

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rows: [ex] } = await pool.query('SELECT * FROM exercises WHERE id = $1', [req.params.id])
    if (!ex) return res.status(404).json({ error: 'Not found' })
    if (ex.is_global || ex.created_by !== req.user.userId) return res.status(403).json({ error: 'Cannot delete this exercise' })
    await pool.query('DELETE FROM exercises WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) { next(err) }
})

export default router
