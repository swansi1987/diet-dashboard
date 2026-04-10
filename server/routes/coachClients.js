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

// ─── COACH ROUTES ───────────────────────────────────────────────────────────

// GET /coach/clients — List all relationships for this coach
router.get('/coach/clients', async (req, res, next) => {
  try {
    const coachId = req.user.userId
    if (!await assertCoach(coachId, res)) return
    const { rows } = await pool.query(
      `SELECT cc.*, p.name as client_name, u.email as client_email
       FROM coach_clients cc
       JOIN users u ON u.id = cc.client_user_id
       LEFT JOIN profiles p ON p.user_id = cc.client_user_id
       WHERE cc.coach_user_id = $1
       ORDER BY cc.invited_at DESC`,
      [coachId]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// POST /coach/invite — Invite a user by email to become a client
router.post('/coach/invite', async (req, res, next) => {
  try {
    const coachId = req.user.userId
    if (!await assertCoach(coachId, res)) return
    const { email, notes } = req.body
    if (!email) return res.status(400).json({ error: 'email required' })
    const { rows: [target] } = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (!target) return res.status(404).json({ error: 'User not found with that email' })
    if (target.id === coachId) return res.status(400).json({ error: 'Cannot invite yourself' })
    const { rows } = await pool.query(
      `INSERT INTO coach_clients (coach_user_id, client_user_id, status, notes)
       VALUES ($1,$2,'pending',$3)
       ON CONFLICT (coach_user_id, client_user_id) DO UPDATE SET status = 'pending', notes = COALESCE($3, coach_clients.notes)
       RETURNING *`,
      [coachId, target.id, notes || null]
    )
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
})

// PUT /coach/clients/:clientId — Update relationship status or notes (coach side)
router.put('/coach/clients/:clientId', async (req, res, next) => {
  try {
    const coachId = req.user.userId
    if (!await assertCoach(coachId, res)) return
    const { status, notes } = req.body
    const validStatuses = ['active', 'inactive', 'declined']
    if (status && !validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' })
    const { rows: [rel] } = await pool.query(
      'SELECT * FROM coach_clients WHERE coach_user_id = $1 AND client_user_id = $2',
      [coachId, req.params.clientId]
    )
    if (!rel) return res.status(404).json({ error: 'Relationship not found' })
    const { rows } = await pool.query(
      `UPDATE coach_clients
       SET status = COALESCE($1, status),
           notes = COALESCE($2, notes),
           activated_at = CASE WHEN $1 = 'active' AND status != 'active' THEN NOW() ELSE activated_at END
       WHERE coach_user_id = $3 AND client_user_id = $4 RETURNING *`,
      [status || null, notes || null, coachId, req.params.clientId]
    )
    res.json(rows[0])
  } catch (err) { next(err) }
})

// DELETE /coach/clients/:clientId — Remove relationship
router.delete('/coach/clients/:clientId', async (req, res, next) => {
  try {
    const coachId = req.user.userId
    if (!await assertCoach(coachId, res)) return
    const { rows: [rel] } = await pool.query(
      'SELECT id FROM coach_clients WHERE coach_user_id = $1 AND client_user_id = $2',
      [coachId, req.params.clientId]
    )
    if (!rel) return res.status(404).json({ error: 'Relationship not found' })
    await pool.query('DELETE FROM coach_clients WHERE id = $1', [rel.id])
    res.json({ success: true })
  } catch (err) { next(err) }
})

// GET /coach/clients/:clientId/overview — Client overview for coach
router.get('/coach/clients/:clientId/overview', async (req, res, next) => {
  try {
    const coachId = req.user.userId
    if (!await assertCoach(coachId, res)) return
    if (!await assertActiveRelationship(coachId, +req.params.clientId, res)) return

    const clientId = +req.params.clientId

    // Profile
    const { rows: [profile] } = await pool.query(
      `SELECT p.*, u.email, u.created_at as member_since
       FROM profiles p JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1`,
      [clientId]
    )

    // Recent 5 sessions with exercise count
    const { rows: recentSessions } = await pool.query(
      `SELECT ws.id, ws.title, ws.started_at, ws.finished_at, ws.duration_seconds, ws.perceived_effort,
              COUNT(DISTINCT ss.exercise_id) as exercise_count
       FROM workout_sessions ws
       LEFT JOIN session_sets ss ON ss.session_id = ws.id
       WHERE ws.user_id = $1
       GROUP BY ws.id
       ORDER BY ws.started_at DESC
       LIMIT 5`,
      [clientId]
    )

    // Last 7 days calorie totals (from daily_logs if table exists)
    let calorieData = []
    try {
      const { rows } = await pool.query(
        `SELECT date, SUM(calories) as total_calories
         FROM daily_logs
         WHERE user_id = $1 AND date >= NOW() - INTERVAL '7 days'
         GROUP BY date ORDER BY date DESC`,
        [clientId]
      )
      calorieData = rows
    } catch (_) {
      // daily_logs table may not exist in all deployments — silently skip
    }

    // Last 30 days weight log
    const { rows: weightData } = await pool.query(
      `SELECT date, weight FROM weight_log
       WHERE user_id = $1 AND date >= NOW() - INTERVAL '30 days'
       ORDER BY date DESC`,
      [clientId]
    )

    res.json({
      profile: profile || null,
      recent_sessions: recentSessions,
      calorie_last_7_days: calorieData,
      weight_last_30_days: weightData
    })
  } catch (err) { next(err) }
})

// ─── MEMBER ROUTES ──────────────────────────────────────────────────────────

// GET /member/coaches — List all coaches for the current member
router.get('/member/coaches', async (req, res, next) => {
  try {
    const clientId = req.user.userId
    const { rows } = await pool.query(
      `SELECT cc.*, p.name as coach_name, u.email as coach_email
       FROM coach_clients cc
       JOIN users u ON u.id = cc.coach_user_id
       LEFT JOIN profiles p ON p.user_id = cc.coach_user_id
       WHERE cc.client_user_id = $1
       ORDER BY cc.invited_at DESC`,
      [clientId]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /member/invites — Pending invites for the current member
router.get('/member/invites', async (req, res, next) => {
  try {
    const clientId = req.user.userId
    const { rows } = await pool.query(
      `SELECT cc.*, p.name as coach_name, u.email as coach_email
       FROM coach_clients cc
       JOIN users u ON u.id = cc.coach_user_id
       LEFT JOIN profiles p ON p.user_id = cc.coach_user_id
       WHERE cc.client_user_id = $1 AND cc.status = 'pending'
       ORDER BY cc.invited_at DESC`,
      [clientId]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// PUT /member/invites/:coachId — Accept or decline an invite
router.put('/member/invites/:coachId', async (req, res, next) => {
  try {
    const clientId = req.user.userId
    const { action } = req.body // 'accept' | 'decline'
    if (!['accept', 'decline'].includes(action)) return res.status(400).json({ error: "action must be 'accept' or 'decline'" })

    const { rows: [rel] } = await pool.query(
      `SELECT * FROM coach_clients WHERE coach_user_id = $1 AND client_user_id = $2 AND status = 'pending'`,
      [req.params.coachId, clientId]
    )
    if (!rel) return res.status(404).json({ error: 'Pending invite not found' })

    const newStatus = action === 'accept' ? 'active' : 'declined'
    const { rows } = await pool.query(
      `UPDATE coach_clients
       SET status = $1,
           activated_at = CASE WHEN $1 = 'active' THEN NOW() ELSE activated_at END
       WHERE coach_user_id = $2 AND client_user_id = $3 RETURNING *`,
      [newStatus, req.params.coachId, clientId]
    )
    res.json(rows[0])
  } catch (err) { next(err) }
})

export default router
