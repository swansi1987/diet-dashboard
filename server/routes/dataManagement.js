import { Router } from 'express'
import pool from '../db.js'
import { verifyJWT } from '../middleware/auth.js'

const router = Router()
router.use(verifyJWT)

// GET /api/data/export
router.get('/export', async (req, res) => {
  const userId = req.user.userId
  try {
    const [logs, foods, weights, profile, cheatDays] = await Promise.all([
      pool.query('SELECT * FROM daily_logs WHERE user_id = $1 ORDER BY date', [userId]),
      pool.query('SELECT * FROM food_database WHERE user_id = $1 OR is_global = TRUE ORDER BY name', [userId]),
      pool.query('SELECT * FROM weight_log WHERE user_id = $1 ORDER BY date', [userId]),
      pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM cheat_days WHERE user_id = $1', [userId]),
    ])
    const backup = {
      exportedAt: new Date().toISOString(),
      dailyLogs: logs.rows,
      foodDatabase: foods.rows,
      weightLog: weights.rows,
      profile: profile.rows[0] || {},
      cheatDays: cheatDays.rows,
    }
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="diet-dashboard-backup-${new Date().toISOString().split('T')[0]}.json"`)
    res.json(backup)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Export failed' })
  }
})

// POST /api/data/import
router.post('/import', async (req, res) => {
  const userId = req.user.userId
  const { dailyLogs, foodDatabase, weightLog, profile, cheatDays } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Clear existing data
    await client.query('DELETE FROM daily_logs WHERE user_id = $1', [userId])
    await client.query('DELETE FROM food_database WHERE user_id = $1', [userId])
    await client.query('DELETE FROM weight_log WHERE user_id = $1', [userId])
    await client.query('DELETE FROM cheat_days WHERE user_id = $1', [userId])

    // Import food database first (logs reference food_id)
    const foodIdMap = {}
    const BATCH = 200
    if (foodDatabase?.length) {
      for (let i = 0; i < foodDatabase.length; i += BATCH) {
        const batch = foodDatabase.slice(i, i + BATCH)
        for (const f of batch) {
          const r = await client.query(
            `INSERT INTO food_database (user_id, name, brand_name, base_quantity, unit, calories, protein, carbs, fats, calcium, iron, magnesium, potassium, zinc)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
            [userId, f.name, f.brand_name, f.base_quantity, f.unit, f.calories, f.protein, f.carbs, f.fats, f.calcium, f.iron, f.magnesium, f.potassium, f.zinc]
          )
          if (f.id) foodIdMap[f.id] = r.rows[0].id
        }
      }
    }

    if (dailyLogs?.length) {
      for (let i = 0; i < dailyLogs.length; i += BATCH) {
        const batch = dailyLogs.slice(i, i + BATCH)
        for (const l of batch) {
          const newFoodId = l.food_id ? (foodIdMap[l.food_id] || null) : null
          await client.query(
            `INSERT INTO daily_logs (user_id, date, meal_type, food_name, brand_name, quantity, calories, protein, carbs, fats,
             calcium, iron, magnesium, potassium, zinc, food_id, consumed, is_junk_meal, image_url, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
            [userId, l.date, l.meal_type, l.food_name, l.brand_name, l.quantity,
             l.calories, l.protein, l.carbs, l.fats,
             l.calcium, l.iron, l.magnesium, l.potassium, l.zinc,
             newFoodId, l.consumed, l.is_junk_meal, l.image_url, l.sort_order]
          )
        }
      }
    }

    if (weightLog?.length) {
      for (const w of weightLog) {
        await client.query(
          'INSERT INTO weight_log (user_id, date, weight) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
          [userId, w.date, w.weight]
        )
      }
    }

    if (profile && Object.keys(profile).length) {
      await client.query(
        `INSERT INTO profiles (user_id, name, dob, weight, height, waist) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (user_id) DO UPDATE SET name=$2, dob=$3, weight=$4, height=$5, waist=$6`,
        [userId, profile.name, profile.dob, profile.weight, profile.height, profile.waist]
      )
    }

    if (cheatDays?.length) {
      for (const cd of cheatDays) {
        if (cd.flagged) {
          await client.query(
            'INSERT INTO cheat_days (user_id, date, flagged) VALUES ($1,$2,TRUE) ON CONFLICT DO NOTHING',
            [userId, cd.date]
          )
        }
      }
    }

    await client.query('COMMIT')
    res.json({ success: true, message: 'Data imported successfully' })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Import failed: ' + err.message })
  } finally {
    client.release()
  }
})

export default router
