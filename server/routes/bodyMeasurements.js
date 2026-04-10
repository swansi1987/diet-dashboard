import { Router } from 'express'
import pool from '../db.js'
import { verifyJWT } from '../middleware/auth.js'

const router = Router()
router.use(verifyJWT)

// GET / — List measurements (most recent first, configurable limit)
router.get('/', async (req, res, next) => {
  try {
    const { limit = 30 } = req.query
    const { rows } = await pool.query(
      `SELECT * FROM body_measurements WHERE user_id = $1 ORDER BY measured_at DESC LIMIT $2`,
      [req.user.userId, +limit]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /:id — Single measurement
router.get('/:id', async (req, res, next) => {
  try {
    const { rows: [m] } = await pool.query(
      'SELECT * FROM body_measurements WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    )
    if (!m) return res.status(404).json({ error: 'Measurement not found' })
    res.json(m)
  } catch (err) { next(err) }
})

// POST / — Create or update (upsert on user_id + measured_at)
router.post('/', async (req, res, next) => {
  try {
    const {
      measured_at, chest_cm, waist_cm, hips_cm, bicep_cm, forearm_cm,
      thigh_cm, calf_cm, neck_cm, shoulder_cm, bodyfat_percent, notes
    } = req.body
    if (!measured_at) return res.status(400).json({ error: 'measured_at required' })
    const { rows } = await pool.query(
      `INSERT INTO body_measurements
         (user_id, measured_at, chest_cm, waist_cm, hips_cm, bicep_cm, forearm_cm,
          thigh_cm, calf_cm, neck_cm, shoulder_cm, bodyfat_percent, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (user_id, measured_at) DO UPDATE SET
         chest_cm        = COALESCE(EXCLUDED.chest_cm, body_measurements.chest_cm),
         waist_cm        = COALESCE(EXCLUDED.waist_cm, body_measurements.waist_cm),
         hips_cm         = COALESCE(EXCLUDED.hips_cm, body_measurements.hips_cm),
         bicep_cm        = COALESCE(EXCLUDED.bicep_cm, body_measurements.bicep_cm),
         forearm_cm      = COALESCE(EXCLUDED.forearm_cm, body_measurements.forearm_cm),
         thigh_cm        = COALESCE(EXCLUDED.thigh_cm, body_measurements.thigh_cm),
         calf_cm         = COALESCE(EXCLUDED.calf_cm, body_measurements.calf_cm),
         neck_cm         = COALESCE(EXCLUDED.neck_cm, body_measurements.neck_cm),
         shoulder_cm     = COALESCE(EXCLUDED.shoulder_cm, body_measurements.shoulder_cm),
         bodyfat_percent = COALESCE(EXCLUDED.bodyfat_percent, body_measurements.bodyfat_percent),
         notes           = COALESCE(EXCLUDED.notes, body_measurements.notes)
       RETURNING *`,
      [req.user.userId, measured_at, chest_cm || null, waist_cm || null, hips_cm || null, bicep_cm || null,
       forearm_cm || null, thigh_cm || null, calf_cm || null, neck_cm || null, shoulder_cm || null,
       bodyfat_percent || null, notes || null]
    )
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
})

// PUT /:id — Update own measurement
router.put('/:id', async (req, res, next) => {
  try {
    const { rows: [m] } = await pool.query(
      'SELECT id FROM body_measurements WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    )
    if (!m) return res.status(404).json({ error: 'Measurement not found' })

    const {
      measured_at, chest_cm, waist_cm, hips_cm, bicep_cm, forearm_cm,
      thigh_cm, calf_cm, neck_cm, shoulder_cm, bodyfat_percent, notes
    } = req.body
    const { rows } = await pool.query(
      `UPDATE body_measurements SET
         measured_at     = COALESCE($1, measured_at),
         chest_cm        = COALESCE($2, chest_cm),
         waist_cm        = COALESCE($3, waist_cm),
         hips_cm         = COALESCE($4, hips_cm),
         bicep_cm        = COALESCE($5, bicep_cm),
         forearm_cm      = COALESCE($6, forearm_cm),
         thigh_cm        = COALESCE($7, thigh_cm),
         calf_cm         = COALESCE($8, calf_cm),
         neck_cm         = COALESCE($9, neck_cm),
         shoulder_cm     = COALESCE($10, shoulder_cm),
         bodyfat_percent = COALESCE($11, bodyfat_percent),
         notes           = COALESCE($12, notes)
       WHERE id = $13 RETURNING *`,
      [measured_at, chest_cm, waist_cm, hips_cm, bicep_cm, forearm_cm,
       thigh_cm, calf_cm, neck_cm, shoulder_cm, bodyfat_percent, notes, req.params.id]
    )
    res.json(rows[0])
  } catch (err) { next(err) }
})

// DELETE /:id — Delete own measurement
router.delete('/:id', async (req, res, next) => {
  try {
    const { rows: [m] } = await pool.query(
      'SELECT id FROM body_measurements WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    )
    if (!m) return res.status(404).json({ error: 'Measurement not found' })
    await pool.query('DELETE FROM body_measurements WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) { next(err) }
})

export default router
