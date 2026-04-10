import { Router } from 'express'
import pool from '../db.js'
import { verifyJWT } from '../middleware/auth.js'

const router = Router()
router.use(verifyJWT)

// GET / — List templates (own + optionally public)
router.get('/', async (req, res, next) => {
  try {
    const { include_public } = req.query
    const userId = req.user.userId
    let sql = 'SELECT * FROM workout_templates WHERE created_by = $1'
    const params = [userId]
    if (include_public === 'true') {
      sql = 'SELECT * FROM workout_templates WHERE created_by = $1 OR is_public = TRUE'
    }
    sql += ' ORDER BY updated_at DESC'
    const { rows } = await pool.query(sql, params)
    res.json(rows)
  } catch (err) { next(err) }
})

// POST /:id/duplicate — must be before GET /:id to avoid param collision
router.post('/:id/duplicate', async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: [src] } = await client.query('SELECT * FROM workout_templates WHERE id = $1', [req.params.id])
    if (!src) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }) }
    if (src.created_by !== req.user.userId && !src.is_public) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Forbidden' }) }
    const { rows: [newTmpl] } = await client.query(
      `INSERT INTO workout_templates (name, description, created_by, difficulty, tags, estimated_duration_minutes, is_public)
       VALUES ($1,$2,$3,$4,$5,$6,FALSE) RETURNING *`,
      [src.name + ' (Copy)', src.description, req.user.userId, src.difficulty, src.tags, src.estimated_duration_minutes]
    )
    const { rows: srcExs } = await client.query('SELECT * FROM template_exercises WHERE template_id = $1 ORDER BY sort_order', [src.id])
    for (const ex of srcExs) {
      await client.query(
        `INSERT INTO template_exercises (template_id, exercise_id, set_count, rep_range_min, rep_range_max, rest_seconds, tempo, notes, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [newTmpl.id, ex.exercise_id, ex.set_count, ex.rep_range_min, ex.rep_range_max, ex.rest_seconds, ex.tempo, ex.notes, ex.sort_order]
      )
    }
    await client.query('COMMIT')
    res.status(201).json(newTmpl)
  } catch (err) { await client.query('ROLLBACK'); next(err) } finally { client.release() }
})

// PUT /:id/exercises — Bulk replace exercises in template
router.put('/:id/exercises', async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: [tmpl] } = await client.query('SELECT created_by FROM workout_templates WHERE id = $1', [req.params.id])
    if (!tmpl) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }) }
    if (tmpl.created_by !== req.user.userId) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Forbidden' }) }
    await client.query('DELETE FROM template_exercises WHERE template_id = $1', [req.params.id])
    const { exercises = [] } = req.body
    for (const ex of exercises) {
      await client.query(
        `INSERT INTO template_exercises (template_id, exercise_id, set_count, rep_range_min, rep_range_max, rest_seconds, tempo, notes, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [req.params.id, ex.exercise_id, ex.set_count || 3, ex.rep_range_min || null, ex.rep_range_max || null, ex.rest_seconds || 90, ex.tempo || null, ex.notes || null, ex.sort_order || 0]
      )
    }
    await client.query('UPDATE workout_templates SET updated_at=NOW() WHERE id=$1', [req.params.id])
    await client.query('COMMIT')
    res.json({ success: true, count: exercises.length })
  } catch (err) { await client.query('ROLLBACK'); next(err) } finally { client.release() }
})

// GET /:id — Full template with exercises
router.get('/:id', async (req, res, next) => {
  try {
    const { rows: [tmpl] } = await pool.query('SELECT * FROM workout_templates WHERE id = $1', [req.params.id])
    if (!tmpl) return res.status(404).json({ error: 'Template not found' })
    if (tmpl.created_by !== req.user.userId && !tmpl.is_public) return res.status(403).json({ error: 'Forbidden' })
    const { rows: exercises } = await pool.query(
      `SELECT te.*, e.name as exercise_name, e.muscle_group, e.equipment, e.thumbnail_url, e.gif_url, e.category
       FROM template_exercises te JOIN exercises e ON e.id = te.exercise_id
       WHERE te.template_id = $1 ORDER BY te.sort_order ASC`,
      [req.params.id]
    )
    res.json({ ...tmpl, exercises })
  } catch (err) { next(err) }
})

// POST /
router.post('/', async (req, res, next) => {
  try {
    const { name, description, difficulty, tags, estimated_duration_minutes, is_public } = req.body
    if (!name) return res.status(400).json({ error: 'name required' })
    const { rows } = await pool.query(
      `INSERT INTO workout_templates (name, description, created_by, difficulty, tags, estimated_duration_minutes, is_public)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, description || null, req.user.userId, difficulty || null, tags || null, estimated_duration_minutes || null, is_public || false]
    )
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
})

// PUT /:id
router.put('/:id', async (req, res, next) => {
  try {
    const { rows: [tmpl] } = await pool.query('SELECT * FROM workout_templates WHERE id = $1', [req.params.id])
    if (!tmpl) return res.status(404).json({ error: 'Not found' })
    if (tmpl.created_by !== req.user.userId) return res.status(403).json({ error: 'Forbidden' })
    const { name, description, difficulty, tags, estimated_duration_minutes, is_public } = req.body
    const { rows } = await pool.query(
      `UPDATE workout_templates SET name=COALESCE($1,name), description=COALESCE($2,description), difficulty=COALESCE($3,difficulty), tags=COALESCE($4,tags), estimated_duration_minutes=COALESCE($5,estimated_duration_minutes), is_public=COALESCE($6,is_public), updated_at=NOW() WHERE id=$7 RETURNING *`,
      [name, description, difficulty, tags, estimated_duration_minutes, is_public, req.params.id]
    )
    res.json(rows[0])
  } catch (err) { next(err) }
})

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rows: [tmpl] } = await pool.query('SELECT created_by FROM workout_templates WHERE id = $1', [req.params.id])
    if (!tmpl) return res.status(404).json({ error: 'Not found' })
    if (tmpl.created_by !== req.user.userId) return res.status(403).json({ error: 'Forbidden' })
    await pool.query('DELETE FROM workout_templates WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) { next(err) }
})

export default router
