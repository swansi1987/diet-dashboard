import { Router } from 'express'
import pool from '../db.js'
import { verifyJWT } from '../middleware/auth.js'

const router = Router()
router.use(verifyJWT)

// Helper: check and upsert personal records after a session is finished
async function checkAndUpdatePRs(client, userId, sessionId) {
  const { rows: sets } = await client.query(
    `SELECT exercise_id, weight_kg, reps FROM session_sets
     WHERE session_id = $1 AND is_warmup = FALSE AND weight_kg IS NOT NULL AND reps IS NOT NULL`,
    [sessionId]
  )

  // Group sets by exercise
  const exerciseMap = {}
  for (const s of sets) {
    if (!exerciseMap[s.exercise_id]) exerciseMap[s.exercise_id] = []
    exerciseMap[s.exercise_id].push(s)
  }

  let updated = 0
  for (const [exerciseId, exSets] of Object.entries(exerciseMap)) {
    const maxWeight = Math.max(...exSets.map(s => +s.weight_kg))
    const maxReps = Math.max(...exSets.map(s => +s.reps))
    const maxVolume = Math.max(...exSets.map(s => +s.weight_kg * +s.reps))
    const max1RM = Math.max(...exSets.map(s => +s.weight_kg * (1 + +s.reps / 30)))

    const prs = [
      { pr_type: '1rm',        value: +max1RM.toFixed(2),  col: 'weight_kg' },
      { pr_type: 'max_weight', value: maxWeight,            col: 'weight_kg' },
      { pr_type: 'max_reps',   value: maxReps,              col: 'reps' },
      { pr_type: 'max_volume', value: maxVolume,            col: 'volume_kg' },
    ]

    for (const pr of prs) {
      const r = await client.query(
        `INSERT INTO personal_records (user_id, exercise_id, pr_type, ${pr.col}, achieved_at, session_id)
         VALUES ($1,$2,$3,$4,NOW(),$5)
         ON CONFLICT (user_id, exercise_id, pr_type) DO UPDATE
           SET ${pr.col} = EXCLUDED.${pr.col}, achieved_at = NOW(), session_id = EXCLUDED.session_id
           WHERE personal_records.${pr.col} < EXCLUDED.${pr.col}`,
        [userId, exerciseId, pr.pr_type, pr.value, sessionId]
      )
      if (r.rowCount > 0) updated++
    }
  }
  return updated
}

// GET /history/:exerciseId — MUST be before GET /:id to avoid Express matching 'history' as :id
router.get('/history/:exerciseId', async (req, res, next) => {
  try {
    const userId = req.user.userId
    const { exerciseId } = req.params
    // Get last 5 sessions that included this exercise
    const { rows: sessions } = await pool.query(
      `SELECT DISTINCT ws.id, ws.title, ws.started_at, ws.finished_at, ws.duration_seconds, ws.perceived_effort
       FROM workout_sessions ws
       JOIN session_sets ss ON ss.session_id = ws.id
       WHERE ws.user_id = $1 AND ss.exercise_id = $2
       ORDER BY ws.started_at DESC
       LIMIT 5`,
      [userId, exerciseId]
    )
    // For each session, fetch the sets for this exercise
    const result = []
    for (const session of sessions) {
      const { rows: sets } = await pool.query(
        `SELECT * FROM session_sets WHERE session_id = $1 AND exercise_id = $2 ORDER BY set_number ASC`,
        [session.id, exerciseId]
      )
      result.push({ ...session, sets })
    }
    res.json(result)
  } catch (err) { next(err) }
})

// GET / — List sessions with total volume
router.get('/', async (req, res, next) => {
  try {
    const { limit = 20, offset = 0, from, to } = req.query
    const userId = req.user.userId
    const params = [userId]
    let whereExtra = ''
    let p = 2
    if (from) { whereExtra += ` AND ws.started_at >= $${p++}`; params.push(from) }
    if (to)   { whereExtra += ` AND ws.started_at <= $${p++}`; params.push(to) }
    params.push(+limit, +offset)
    const { rows } = await pool.query(
      `SELECT ws.*,
              COUNT(DISTINCT ss.exercise_id) as exercise_count,
              COALESCE(SUM(CASE WHEN ss.is_warmup = FALSE AND ss.weight_kg IS NOT NULL AND ss.reps IS NOT NULL
                           THEN ss.weight_kg * ss.reps ELSE 0 END), 0) as total_volume_kg
       FROM workout_sessions ws
       LEFT JOIN session_sets ss ON ss.session_id = ws.id
       WHERE ws.user_id = $1${whereExtra}
       GROUP BY ws.id
       ORDER BY ws.started_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      params
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /:id — Full session with sets grouped by exercise
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user.userId
    const { rows: [session] } = await pool.query(
      'SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    )
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const { rows: sets } = await pool.query(
      `SELECT ss.*, e.name as exercise_name, e.muscle_group, e.equipment, e.thumbnail_url
       FROM session_sets ss
       JOIN exercises e ON e.id = ss.exercise_id
       WHERE ss.session_id = $1
       ORDER BY ss.exercise_id, ss.set_number ASC`,
      [req.params.id]
    )

    // Group sets by exercise
    const exerciseMap = {}
    for (const set of sets) {
      const key = set.exercise_id
      if (!exerciseMap[key]) {
        exerciseMap[key] = {
          exercise_id: set.exercise_id,
          exercise_name: set.exercise_name,
          muscle_group: set.muscle_group,
          equipment: set.equipment,
          thumbnail_url: set.thumbnail_url,
          sets: []
        }
      }
      const { exercise_name, muscle_group, equipment, thumbnail_url, ...setData } = set
      exerciseMap[key].sets.push(setData)
    }

    res.json({ ...session, exercises: Object.values(exerciseMap) })
  } catch (err) { next(err) }
})

// POST / — Create (start) a session
router.post('/', async (req, res, next) => {
  try {
    const { template_id, title, started_at, notes, bodyweight_kg } = req.body
    const { rows } = await pool.query(
      `INSERT INTO workout_sessions (user_id, template_id, title, started_at, notes, bodyweight_kg)
       VALUES ($1,$2,$3,COALESCE($4,NOW()),$5,$6) RETURNING *`,
      [req.user.userId, template_id || null, title || null, started_at || null, notes || null, bodyweight_kg || null]
    )
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
})

// PUT /:id — Update / finish session; triggers PR check when finished_at is provided
router.put('/:id', async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const userId = req.user.userId
    const { rows: [session] } = await client.query(
      'SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    )
    if (!session) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Session not found' }) }

    const { title, notes, finished_at, duration_seconds, perceived_effort, bodyweight_kg, template_id } = req.body
    const { rows: [updated] } = await client.query(
      `UPDATE workout_sessions
       SET title=COALESCE($1,title),
           notes=COALESCE($2,notes),
           finished_at=COALESCE($3,finished_at),
           duration_seconds=COALESCE($4,duration_seconds),
           perceived_effort=COALESCE($5,perceived_effort),
           bodyweight_kg=COALESCE($6,bodyweight_kg),
           template_id=COALESCE($7,template_id)
       WHERE id=$8 RETURNING *`,
      [title, notes, finished_at, duration_seconds, perceived_effort, bodyweight_kg, template_id, req.params.id]
    )

    let prsUpdated = 0
    // Trigger PR check when session is being marked finished for the first time
    if (finished_at && !session.finished_at) {
      prsUpdated = await checkAndUpdatePRs(client, userId, +req.params.id)
    }

    await client.query('COMMIT')
    res.json({ ...updated, prs_updated: prsUpdated })
  } catch (err) { await client.query('ROLLBACK'); next(err) } finally { client.release() }
})

// DELETE /:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rows: [session] } = await pool.query(
      'SELECT id FROM workout_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    )
    if (!session) return res.status(404).json({ error: 'Session not found' })
    await pool.query('DELETE FROM workout_sessions WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) { next(err) }
})

// POST /:id/sets — Add a set to a session
router.post('/:id/sets', async (req, res, next) => {
  try {
    const userId = req.user.userId
    const { rows: [session] } = await pool.query(
      'SELECT id FROM workout_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    )
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const { exercise_id, set_number, weight_kg, reps, duration_seconds, distance_meters, rpe, is_warmup, is_dropset, is_failure, notes, completed_at } = req.body
    if (!exercise_id || set_number === undefined) return res.status(400).json({ error: 'exercise_id and set_number required' })

    const { rows } = await pool.query(
      `INSERT INTO session_sets (session_id, exercise_id, set_number, weight_kg, reps, duration_seconds, distance_meters, rpe, is_warmup, is_dropset, is_failure, notes, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,NOW())) RETURNING *`,
      [req.params.id, exercise_id, set_number, weight_kg || null, reps || null, duration_seconds || null, distance_meters || null, rpe || null, is_warmup || false, is_dropset || false, is_failure || false, notes || null, completed_at || null]
    )
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
})

// PUT /:id/sets/:setId — Update a set
router.put('/:id/sets/:setId', async (req, res, next) => {
  try {
    const userId = req.user.userId
    // Verify session ownership
    const { rows: [session] } = await pool.query(
      'SELECT id FROM workout_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    )
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const { rows: [set] } = await pool.query(
      'SELECT id FROM session_sets WHERE id = $1 AND session_id = $2',
      [req.params.setId, req.params.id]
    )
    if (!set) return res.status(404).json({ error: 'Set not found' })

    const { weight_kg, reps, duration_seconds, distance_meters, rpe, is_warmup, is_dropset, is_failure, notes, set_number } = req.body
    
    // Use an object to build the query dynamically or just set explicit values
    const { rows } = await pool.query(
      `UPDATE session_sets
       SET weight_kg = COALESCE($1, weight_kg),
           reps = COALESCE($2, reps),
           duration_seconds = COALESCE($3, duration_seconds),
           distance_meters = COALESCE($4, distance_meters),
           rpe = COALESCE($5, rpe),
           is_warmup = COALESCE($6, is_warmup),
           is_dropset = COALESCE($7, is_dropset),
           is_failure = COALESCE($8, is_failure),
           notes = COALESCE($9, notes),
           set_number = COALESCE($10, set_number)
       WHERE id = $11 RETURNING *`,
      [
        weight_kg === undefined ? null : weight_kg,
        reps === undefined ? null : reps,
        duration_seconds === undefined ? null : duration_seconds,
        distance_meters === undefined ? null : distance_meters,
        rpe === undefined ? null : rpe,
        is_warmup,
        is_dropset,
        is_failure,
        notes,
        set_number,
        req.params.setId
      ]
    )
    res.json(rows[0])
  } catch (err) { next(err) }
})

// DELETE /:id/sets/:setId — Remove a set
router.delete('/:id/sets/:setId', async (req, res, next) => {
  try {
    const userId = req.user.userId
    const { rows: [session] } = await pool.query(
      'SELECT id FROM workout_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    )
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const { rows: [set] } = await pool.query(
      'SELECT id FROM session_sets WHERE id = $1 AND session_id = $2',
      [req.params.setId, req.params.id]
    )
    if (!set) return res.status(404).json({ error: 'Set not found' })

    await pool.query('DELETE FROM session_sets WHERE id = $1', [req.params.setId])
    res.json({ success: true })
  } catch (err) { next(err) }
})

// POST /sync — Offline bulk upsert of sessions and sets
router.post('/sync', async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const userId = req.user.userId
    const { sessions = [] } = req.body
    const results = []

    for (const s of sessions) {
      // Upsert session by id if provided, otherwise insert
      let sessionId
      if (s.id) {
        // Verify ownership
        const { rows: [existing] } = await client.query(
          'SELECT id FROM workout_sessions WHERE id = $1 AND user_id = $2',
          [s.id, userId]
        )
        if (existing) {
          const { rows: [updated] } = await client.query(
            `UPDATE workout_sessions
             SET title=COALESCE($1,title), template_id=COALESCE($2,template_id), started_at=COALESCE($3,started_at),
                 finished_at=COALESCE($4,finished_at), duration_seconds=COALESCE($5,duration_seconds),
                 notes=COALESCE($6,notes), perceived_effort=COALESCE($7,perceived_effort), bodyweight_kg=COALESCE($8,bodyweight_kg)
             WHERE id=$9 RETURNING *`,
            [s.title, s.template_id, s.started_at, s.finished_at, s.duration_seconds, s.notes, s.perceived_effort, s.bodyweight_kg, s.id]
          )
          sessionId = updated.id
          results.push({ id: sessionId, action: 'updated' })
        } else {
          // id given but not owned — insert fresh
          const { rows: [inserted] } = await client.query(
            `INSERT INTO workout_sessions (user_id, template_id, title, started_at, finished_at, duration_seconds, notes, perceived_effort, bodyweight_kg)
             VALUES ($1,$2,$3,COALESCE($4,NOW()),$5,$6,$7,$8,$9) RETURNING *`,
            [userId, s.template_id || null, s.title || null, s.started_at, s.finished_at || null, s.duration_seconds || null, s.notes || null, s.perceived_effort || null, s.bodyweight_kg || null]
          )
          sessionId = inserted.id
          results.push({ id: sessionId, action: 'inserted' })
        }
      } else {
        const { rows: [inserted] } = await client.query(
          `INSERT INTO workout_sessions (user_id, template_id, title, started_at, finished_at, duration_seconds, notes, perceived_effort, bodyweight_kg)
           VALUES ($1,$2,$3,COALESCE($4,NOW()),$5,$6,$7,$8,$9) RETURNING *`,
          [userId, s.template_id || null, s.title || null, s.started_at, s.finished_at || null, s.duration_seconds || null, s.notes || null, s.perceived_effort || null, s.bodyweight_kg || null]
        )
        sessionId = inserted.id
        results.push({ id: sessionId, action: 'inserted' })
      }

      // Upsert sets for this session
      if (Array.isArray(s.sets)) {
        // Delete existing sets and re-insert (simplest safe approach for offline sync)
        await client.query('DELETE FROM session_sets WHERE session_id = $1', [sessionId])
        for (const set of s.sets) {
          await client.query(
            `INSERT INTO session_sets (session_id, exercise_id, set_number, weight_kg, reps, duration_seconds, distance_meters, rpe, is_warmup, is_dropset, is_failure, notes, completed_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,NOW()))`,
            [sessionId, set.exercise_id, set.set_number, set.weight_kg || null, set.reps || null, set.duration_seconds || null, set.distance_meters || null, set.rpe || null, set.is_warmup || false, set.is_dropset || false, set.is_failure || false, set.notes || null, set.completed_at || null]
          )
        }
        // Run PR check if session was finished
        if (s.finished_at) {
          await checkAndUpdatePRs(client, userId, sessionId)
        }
      }
    }

    await client.query('COMMIT')
    res.json({ synced: results.length, results })
  } catch (err) { await client.query('ROLLBACK'); next(err) } finally { client.release() }
})

export default router
