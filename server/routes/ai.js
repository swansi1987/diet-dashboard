import { Router } from 'express'
import multer from 'multer'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { verifyJWT } from '../middleware/auth.js'
import { runAI } from '../services/aiService.js'
import pool from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const router = Router()
router.use(verifyJWT)

const upload = multer({
  storage: multer.diskStorage({
    destination: join(__dirname, '..', '..', 'uploads', 'meals'),
    filename: (req, file, cb) => cb(null, `${req.user.userId}_${Date.now()}${file.originalname.match(/\.[^.]+$/)?.[0] || '.jpg'}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
})

const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

function handleAIError(err, res) {
  console.error('AI error:', err.message)
  res.status(err.statusCode || 500).json({ error: err.message })
}

// POST /api/ai/quick-add
router.post('/quick-add', async (req, res) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'text is required' })
  try {
    const result = await runAI(req.user.userId, 'quickAddParse', text)
    res.json(result)
  } catch (err) { handleAIError(err, res) }
})

// POST /api/ai/photo-meal — returns AI analysis; saves file permanently
router.post('/photo-meal', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' })
  try {
    const { readFileSync } = await import('fs')
    const base64 = readFileSync(req.file.path).toString('base64')
    const mimeType = req.file.mimetype
    const result = await runAI(req.user.userId, 'photoMealAnalyze', base64, mimeType)
    const imageUrl = `/uploads/meals/${req.file.filename}`
    res.json({ entries: result, imageUrl })
  } catch (err) { handleAIError(err, res) }
})

// POST /api/ai/enrich — food enrichment (text or image)
router.post('/enrich', memUpload.single('image'), async (req, res) => {
  try {
    let result
    if (req.file) {
      const base64 = req.file.buffer.toString('base64')
      result = await runAI(req.user.userId, 'enrichFoodByImage', base64, req.file.mimetype)
    } else if (req.body.foodName) {
      result = await runAI(req.user.userId, 'enrichFoodByName', req.body.foodName)
    } else {
      return res.status(400).json({ error: 'Provide foodName or image' })
    }
    res.json(result)
  } catch (err) { handleAIError(err, res) }
})

// POST /api/ai/minerals
router.post('/minerals', async (req, res) => {
  const { foodIds } = req.body
  if (!foodIds?.length) return res.status(400).json({ error: 'foodIds required' })
  try {
    const result = await pool.query(
      'SELECT id, name FROM food_database WHERE id = ANY($1::int[]) AND user_id = $2',
      [foodIds, req.user.userId]
    )
    const updated = await runAI(req.user.userId, 'updateMinerals', result.rows)
    // Apply updates to DB
    for (const item of updated) {
      await pool.query(
        `UPDATE food_database SET calcium=$1, iron=$2, magnesium=$3, potassium=$4, zinc=$5
         WHERE id=$6 AND user_id=$7`,
        [item.calcium, item.iron, item.magnesium, item.potassium, item.zinc, item.id, req.user.userId]
      )
    }
    res.json(updated)
  } catch (err) { handleAIError(err, res) }
})

// POST /api/ai/meal-planner
router.post('/meal-planner', async (req, res) => {
  const { profile, todayTotals } = req.body
  try {
    const markdown = await runAI(req.user.userId, 'generateMealPlan', profile || {}, todayTotals || {})
    res.json({ markdown })
  } catch (err) { handleAIError(err, res) }
})

// POST /api/ai/recipe
router.post('/recipe', async (req, res) => {
  const { ingredientIds } = req.body
  if (!ingredientIds?.length || ingredientIds.length < 2) {
    return res.status(400).json({ error: 'Select at least 2 ingredients' })
  }
  try {
    const result = await pool.query(
      'SELECT id, name, base_quantity, unit FROM food_database WHERE id = ANY($1::int[]) AND user_id = $2',
      [ingredientIds, req.user.userId]
    )
    const markdown = await runAI(req.user.userId, 'generateRecipe', result.rows)
    res.json({ markdown })
  } catch (err) { handleAIError(err, res) }
})

export default router
