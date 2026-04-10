import { Router } from 'express'
import pool from '../db.js'
import { verifyJWT } from '../middleware/auth.js'

const router = Router()
router.use(verifyJWT)

const ALLOWED_KEYS = ['preferred_ai_provider', 'gemini_api_key', 'openai_api_key', 'claude_api_key']

// GET /api/settings — returns all user settings (keys only, values masked for API keys)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT key, value FROM user_settings WHERE user_id = $1 AND key != $2',
      [req.user.userId, 'refresh_token']
    )
    const settings = {}
    for (const row of result.rows) {
      if (row.key.endsWith('_api_key')) {
        settings[row.key] = row.value ? '••••••••' : ''
        settings[`${row.key}_set`] = !!row.value
      } else {
        settings[row.key] = row.value
      }
    }
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// PUT /api/settings — upsert one or multiple settings
router.put('/', async (req, res) => {
  const userId = req.user.userId
  const updates = Object.entries(req.body).filter(([k]) => ALLOWED_KEYS.includes(k))
  if (updates.length === 0) return res.status(400).json({ error: 'No valid settings keys provided' })
  try {
    for (const [key, value] of updates) {
      await pool.query(
        `INSERT INTO user_settings (user_id, key, value) VALUES ($1,$2,$3)
         ON CONFLICT (user_id, key) DO UPDATE SET value = $3`,
        [userId, key, value]
      )
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

// Internal helper: get raw setting value (used by ai.js)
export async function getSettingValue(userId, key) {
  const result = await pool.query(
    'SELECT value FROM user_settings WHERE user_id = $1 AND key = $2',
    [userId, key]
  )
  return result.rows[0]?.value ?? null
}

export default router
