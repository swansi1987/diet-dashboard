import { Router } from 'express'
import pool from '../db.js'
import { verifyJWT } from '../middleware/auth.js'

const router = Router()
router.use(verifyJWT)

// Helper: verify the caller is a coach
async function assertCoach(userId, res) {
  const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [userId])
  if (!rows[0] || rows[0].role !== 'coach') {
    res.status(403).json({ error: 'Forbidden: requires coach role' })
    return false
  }
  return true
}

// Helper: verify active coach_clients relationship
async function assertActiveRelationship(coachId, clientId, res) {
  const { rows } = await pool.query(
    `SELECT id FROM coach_clients WHERE coach_user_id = $1 AND client_user_id = $2 AND status = 'active'`,
    [coachId, clientId]
  )
  if (!rows[0]) {
    res.status(403).json({ error: 'No active coach-client relationship' })
    return false
  }
  return true
}

// GET /coach — List programs assigned by this coach
router.get('/coach', async (req, res, next) => {
  try {
    const coachId = req.user.userId
    if (!await assertCoach(coachId, res)) return
    const { client_id, status } = req.query
    const params = [coachId]
    let whereExtra = ''
    let p = 2
    if (client_id) { whereExtra += ` AND ap.client_id = $${p++}`; params.push(client_id) }
    if (status)    { whereExtra += ` AND ap.status = $${p++}`; params.push(status) }
    const { rows } = await pool.query(
      `SELECT ap.*, wt.name as template_name, wt.difficulty, wt.estimated_duration_minutes,
              p.name as client_name, u.email as client_email
       FROM assigned_programs ap
       JOIN workout_templates wt ON wt.id = ap.template_id
       JOIN users u ON u.id = ap.client_id
       LEFT JOIN profiles p ON p.user_id = ap.client_id
       WHERE ap.coach_id = $1${whereExtra}
       ORDER BY ap.assigned_at DESC`,
      params
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// POST /coach — Assign a program to a client
router.post('/coach', async (req, res, next) => {
  try {
    const coachId = req.user.userId
    if (!await assertCoach(coachId, res)) return
    const { client_id, template_id, start_date, end_date, notes, week_days } = req.body
    if (!client_id || !template_id) return res.status(400).json({ error: 'client_id and template_id required' })
    if (!await assertActiveRelationship(coachId, +client_id, res)) return

    // Verify template exists and is accessible (own or public)
    const { rows: [tmpl] } = await pool.query(
      'SELECT id FROM workout_templates WHERE id = $1 AND (created_by = $2 OR is_public = TRUE)',
      [template_id, coachId]
    )
    if (!tmpl) return res.status(404).json({ error: 'Template not found or not accessible' })

    const { rows } = await pool.query(
      `INSERT INTO assigned_programs (coach_id, client_id, template_id, start_date, end_date, notes, week_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (client_id, template_id, start_date) DO UPDATE SET
         status = 'active', notes = COALESCE($6, assigned_programs.notes),
         end_date = COALESCE($5, assigned_programs.end_date),
         week_days = COALESCE($7, assigned_programs.week_days),
         assigned_at = NOW()
       RETURNING *`,
      [coachId, client_id, template_id, start_date || null, end_date || null, notes || null, week_days || null]
    )
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
})

// PUT /coach/:programId — Update program status or details
router.put('/coach/:programId', async (req, res, next) => {
  try {
    const coachId = req.user.userId
    if (!await assertCoach(coachId, res)) return
    const { rows: [prog] } = await pool.query(
      'SELECT * FROM assigned_programs WHERE id = $1 AND coach_id = $2',
      [req.params.programId, coachId]
    )
    if (!prog) return res.status(404).json({ error: 'Program not found' })

    const { status, start_date, end_date, notes, week_days } = req.body
    const validStatuses = ['active', 'paused', 'completed', 'cancelled']
    if (status && !validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' })

    const { rows } = await pool.query(
      `UPDATE assigned_programs SET
         status     = COALESCE($1, status),
         start_date = COALESCE($2, start_date),
         end_date   = COALESCE($3, end_date),
         notes      = COALESCE($4, notes),
         week_days  = COALESCE($5, week_days)
       WHERE id = $6 RETURNING *`,
      [status || null, start_date || null, end_date || null, notes || null, week_days || null, req.params.programId]
    )
    res.json(rows[0])
  } catch (err) { next(err) }
})

// DELETE /coach/:programId — Remove an assigned program
router.delete('/coach/:programId', async (req, res, next) => {
  try {
    const coachId = req.user.userId
    if (!await assertCoach(coachId, res)) return
    const { rows: [prog] } = await pool.query(
      'SELECT id FROM assigned_programs WHERE id = $1 AND coach_id = $2',
      [req.params.programId, coachId]
    )
    if (!prog) return res.status(404).json({ error: 'Program not found' })
    await pool.query('DELETE FROM assigned_programs WHERE id = $1', [prog.id])
    res.json({ success: true })
  } catch (err) { next(err) }
})

// GET /member — List programs assigned to the current user
router.get('/member', async (req, res, next) => {
  try {
    const clientId = req.user.userId
    const { status } = req.query
    const params = [clientId]
    let whereExtra = ''
    if (status) { whereExtra = ' AND ap.status = $2'; params.push(status) }
    const { rows } = await pool.query(
      `SELECT ap.*, wt.name as template_name, wt.description as template_description,
              wt.difficulty, wt.estimated_duration_minutes, wt.tags,
              p.name as coach_name, u.email as coach_email
       FROM assigned_programs ap
       JOIN workout_templates wt ON wt.id = ap.template_id
       JOIN users u ON u.id = ap.coach_id
       LEFT JOIN profiles p ON p.user_id = ap.coach_id
       WHERE ap.client_id = $1${whereExtra}
       ORDER BY ap.assigned_at DESC`,
      params
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /member/:programId — Full program with template exercises
router.get('/member/:programId', async (req, res, next) => {
  try {
    const clientId = req.user.userId
    const { rows: [prog] } = await pool.query(
      `SELECT ap.*, wt.name as template_name, wt.description as template_description,
              wt.difficulty, wt.estimated_duration_minutes, wt.tags,
              p.name as coach_name, u.email as coach_email
       FROM assigned_programs ap
       JOIN workout_templates wt ON wt.id = ap.template_id
       JOIN users u ON u.id = ap.coach_id
       LEFT JOIN profiles p ON p.user_id = ap.coach_id
       WHERE ap.id = $1 AND ap.client_id = $2`,
      [req.params.programId, clientId]
    )
    if (!prog) return res.status(404).json({ error: 'Program not found' })

    // Fetch template exercises
    const { rows: exercises } = await pool.query(
      `SELECT te.*, e.name as exercise_name, e.muscle_group, e.equipment, e.thumbnail_url, e.gif_url, e.category
       FROM template_exercises te JOIN exercises e ON e.id = te.exercise_id
       WHERE te.template_id = $1 ORDER BY te.sort_order ASC`,
      [prog.template_id]
    )
    res.json({ ...prog, exercises })
  } catch (err) { next(err) }
})

export default router
