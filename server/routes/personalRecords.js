import { Router } from 'express'
import pool from '../db.js'
import { verifyJWT } from '../middleware/auth.js'

const router = Router()
router.use(verifyJWT)

// GET / — All PRs with exercise info, grouped by muscle group then exercise
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT pr.*, e.name as exercise_name, e.muscle_group, e.equipment
       FROM personal_records pr JOIN exercises e ON e.id = pr.exercise_id
       WHERE pr.user_id = $1 ORDER BY e.muscle_group, e.name, pr.pr_type`,
      [req.user.userId]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /:exerciseId — PRs for a specific exercise
router.get('/:exerciseId', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT pr.*, e.name as exercise_name FROM personal_records pr JOIN exercises e ON e.id = pr.exercise_id
       WHERE pr.user_id = $1 AND pr.exercise_id = $2`,
      [req.user.userId, req.params.exerciseId]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// POST /check — Re-run PR check for a given session
router.post('/check', async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { sessionId } = req.body
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' })
    const { rows: [session] } = await client.query(
      'SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, req.user.userId]
    )
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const { rows: sets } = await client.query(
      `SELECT exercise_id, weight_kg, reps FROM session_sets
       WHERE session_id = $1 AND is_warmup = FALSE AND weight_kg IS NOT NULL AND reps IS NOT NULL`,
      [sessionId]
    )
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
        { pr_type: '1rm',        value: +max1RM.toFixed(2), col: 'weight_kg' },
        { pr_type: 'max_weight', value: maxWeight,           col: 'weight_kg' },
        { pr_type: 'max_reps',   value: maxReps,             col: 'reps' },
        { pr_type: 'max_volume', value: maxVolume,           col: 'volume_kg' },
      ]
      for (const pr of prs) {
        const r = await client.query(
          `INSERT INTO personal_records (user_id, exercise_id, pr_type, ${pr.col}, achieved_at, session_id)
           VALUES ($1,$2,$3,$4,NOW(),$5)
           ON CONFLICT (user_id, exercise_id, pr_type) DO UPDATE
             SET ${pr.col} = EXCLUDED.${pr.col}, achieved_at = NOW(), session_id = EXCLUDED.session_id
             WHERE personal_records.${pr.col} < EXCLUDED.${pr.col}`,
          [req.user.userId, exerciseId, pr.pr_type, pr.value, sessionId]
        )
        if (r.rowCount > 0) updated++
      }
    }
    res.json({ updated })
  } catch (err) { next(err) } finally { client.release() }
})

export default router
