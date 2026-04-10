import { Router } from 'express'
import pool from '../db.js'
import { verifyJWT } from '../middleware/auth.js'

const router = Router()
router.use(verifyJWT)

const FIELDS = ['name','brand_name','base_quantity','unit','calories','protein','carbs','fats','calcium','iron','magnesium','potassium','zinc']

// GET /api/food-database
router.get('/', async (req, res) => {
  const { search } = req.query
  const userId = req.user.userId
  try {
    let query = 'SELECT * FROM food_database WHERE user_id = $1'
    const params = [userId]
    if (search) {
      query += ' AND (LOWER(name) LIKE $2 OR LOWER(brand_name) LIKE $2)'
      params.push(`%${search.toLowerCase()}%`)
    }
    query += ' ORDER BY name ASC'
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch food database' })
  }
})

// POST /api/food-database
router.post('/', async (req, res) => {
  const userId = req.user.userId
  const { name, brand_name, base_quantity, unit, calories, protein, carbs, fats, calcium, iron, magnesium, potassium, zinc } = req.body
  if (!name) return res.status(400).json({ error: 'Food name is required' })
  try {
    const result = await pool.query(
      `INSERT INTO food_database (user_id, name, brand_name, base_quantity, unit, calories, protein, carbs, fats, calcium, iron, magnesium, potassium, zinc)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [userId, name, brand_name ?? null, base_quantity ?? 100, unit ?? 'g',
       calories ?? 0, protein ?? 0, carbs ?? 0, fats ?? 0,
       calcium ?? 0, iron ?? 0, magnesium ?? 0, potassium ?? 0, zinc ?? 0]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to add food item' })
  }
})

// PUT /api/food-database/:id
router.put('/:id', async (req, res) => {
  const userId = req.user.userId
  const { id } = req.params
  const updates = Object.keys(req.body).filter(k => FIELDS.includes(k))
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' })
  const setClauses = updates.map((k, i) => `${k} = $${i + 1}`).join(', ')
  const values = updates.map(k => req.body[k])
  try {
    const result = await pool.query(
      `UPDATE food_database SET ${setClauses} WHERE id = $${updates.length + 1} AND user_id = $${updates.length + 2} RETURNING *`,
      [...values, id, userId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Food item not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Failed to update food item' })
  }
})

// DELETE /api/food-database/:id
router.delete('/:id', async (req, res) => {
  const userId = req.user.userId
  try {
    await pool.query('DELETE FROM food_database WHERE id = $1 AND user_id = $2', [req.params.id, userId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete food item' })
  }
})

// GET /api/food-database/export-csv
router.get('/export-csv', async (req, res) => {
  const userId = req.user.userId
  try {
    const result = await pool.query('SELECT * FROM food_database WHERE user_id = $1 ORDER BY name', [userId])
    const headers = FIELDS.join(',')
    const rows = result.rows.map(r =>
      FIELDS.map(f => `"${String(r[f] ?? '').replace(/"/g, '""')}"`).join(',')
    )
    const csv = [headers, ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="food_database.csv"')
    res.send(csv)
  } catch (err) {
    res.status(500).json({ error: 'Failed to export CSV' })
  }
})

// POST /api/food-database/import-csv
router.post('/import-csv', async (req, res) => {
  const userId = req.user.userId
  const { rows } = req.body // Array of objects parsed from CSV on client side
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'No rows to import' })
  let added = 0, updated = 0
  try {
    for (const row of rows) {
      if (!row.name) continue
      const existing = await pool.query(
        'SELECT id FROM food_database WHERE user_id = $1 AND LOWER(name) = $2',
        [userId, row.name.toLowerCase()]
      )
      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE food_database SET brand_name=$1, base_quantity=$2, unit=$3, calories=$4, protein=$5,
           carbs=$6, fats=$7, calcium=$8, iron=$9, magnesium=$10, potassium=$11, zinc=$12
           WHERE id=$13`,
          [row.brand_name??null, row.base_quantity??100, row.unit??'g',
           row.calories??0, row.protein??0, row.carbs??0, row.fats??0,
           row.calcium??0, row.iron??0, row.magnesium??0, row.potassium??0, row.zinc??0,
           existing.rows[0].id]
        )
        updated++
      } else {
        await pool.query(
          `INSERT INTO food_database (user_id, name, brand_name, base_quantity, unit, calories, protein, carbs, fats, calcium, iron, magnesium, potassium, zinc)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [userId, row.name, row.brand_name??null, row.base_quantity??100, row.unit??'g',
           row.calories??0, row.protein??0, row.carbs??0, row.fats??0,
           row.calcium??0, row.iron??0, row.magnesium??0, row.potassium??0, row.zinc??0]
        )
        added++
      }
    }
    res.json({ added, updated })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to import CSV' })
  }
})

export default router
