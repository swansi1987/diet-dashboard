import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../db.js'
import { verifyJWT } from '../middleware/auth.js'

const router = Router()

function issueTokens(userId) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' })
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
  return { accessToken, refreshToken }
}

function isMobile(req) {
  return req.headers['x-client-type'] === 'mobile'
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, role } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  const validRoles = ['member', 'coach', 'admin']
  const userRole = (role && validRoles.includes(role)) ? role : 'member'
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' })
    const hash = await bcrypt.hash(password, 12)
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
      [email.toLowerCase(), hash, userRole]
    )
    const user = result.rows[0]
    // Create empty profile
    await pool.query('INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id])
    const { accessToken, refreshToken } = issueTokens(user.id)
    // Store refresh token in user_settings
    await pool.query(
      'INSERT INTO user_settings (user_id, key, value) VALUES ($1, $2, $3) ON CONFLICT (user_id, key) DO UPDATE SET value = $3',
      [user.id, 'refresh_token', refreshToken]
    )
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
    const response = { accessToken, user: { id: user.id, email: user.email, role: user.role } }
    if (isMobile(req)) response.refreshToken = refreshToken
    res.json(response)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    const user = result.rows[0]
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })
    const { accessToken, refreshToken } = issueTokens(user.id)
    await pool.query(
      'INSERT INTO user_settings (user_id, key, value) VALUES ($1, $2, $3) ON CONFLICT (user_id, key) DO UPDATE SET value = $3',
      [user.id, 'refresh_token', refreshToken]
    )
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
    const response = { accessToken, user: { id: user.id, email: user.email } }
    if (isMobile(req)) response.refreshToken = refreshToken
    res.json(response)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// POST /api/auth/refresh
// Web: reads refreshToken from httpOnly cookie
// Mobile: reads refreshToken from request body
router.post('/refresh', async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken
  if (!token) return res.status(401).json({ error: 'No refresh token' })
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    const stored = await pool.query(
      'SELECT value FROM user_settings WHERE user_id = $1 AND key = $2',
      [payload.userId, 'refresh_token']
    )
    if (!stored.rows[0] || stored.rows[0].value !== token) {
      return res.status(401).json({ error: 'Invalid refresh token' })
    }
    const accessToken = jwt.sign({ userId: payload.userId }, process.env.JWT_SECRET, { expiresIn: '15m' })
    res.json({ accessToken })
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' })
  }
})

// GET /api/auth/me
router.get('/me', verifyJWT, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, created_at FROM users WHERE id = $1', [req.user.userId])
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' })
    res.json({ user: result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// POST /api/auth/logout
// Mobile clients should send { refreshToken } in body to invalidate their stored token
router.post('/logout', verifyJWT, async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken
  if (token) {
    await pool.query(
      'DELETE FROM user_settings WHERE user_id = $1 AND key = $2',
      [req.user.userId, 'refresh_token']
    )
  }
  res.clearCookie('refreshToken')
  res.json({ message: 'Logged out' })
})

export default router
