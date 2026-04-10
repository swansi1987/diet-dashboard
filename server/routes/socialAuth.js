import { Router } from 'express'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import pool from '../db.js'

const router = Router()
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

function issueTokens(userId) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' })
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
  return { accessToken, refreshToken }
}

async function storeRefreshToken(userId, refreshToken, res) {
  await pool.query(
    'INSERT INTO user_settings (user_id, key, value) VALUES ($1, $2, $3) ON CONFLICT (user_id, key) DO UPDATE SET value = $3',
    [userId, 'refresh_token', refreshToken]
  )
  res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
}

// POST /api/auth/google
// Body: { idToken }
router.post('/google', async (req, res) => {
  const { idToken } = req.body
  if (!idToken) return res.status(400).json({ error: 'idToken required' })
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Google login not configured on this server' })

  try {
    // Verify the token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()
    const { sub: googleId, email, name } = payload

    if (!email) return res.status(400).json({ error: 'No email in Google account' })

    // Check if this Google account is already linked
    const oauthRow = await pool.query(
      'SELECT user_id FROM user_oauth WHERE provider = $1 AND provider_id = $2',
      ['google', googleId]
    )

    let userId

    if (oauthRow.rows.length > 0) {
      // Returning user — existing Google link found
      userId = oauthRow.rows[0].user_id
    } else {
      // New Google user — check if email already exists (email/password account)
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])

      if (existing.rows.length > 0) {
        // Email already registered with password — link Google to that account
        userId = existing.rows[0].id
      } else {
        // Brand new user — create account
        const newUser = await pool.query(
          'INSERT INTO users (email, name, role) VALUES ($1, $2, $3) RETURNING id',
          [email.toLowerCase(), name || null, 'member']
        )
        userId = newUser.rows[0].id
        // Create empty profile
        await pool.query('INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId])
      }

      // Link this Google account to the user
      await pool.query(
        'INSERT INTO user_oauth (user_id, provider, provider_id, provider_email) VALUES ($1, $2, $3, $4)',
        [userId, 'google', googleId, email.toLowerCase()]
      )
    }

    // Fetch full user record
    const userRow = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [userId])
    const user = userRow.rows[0]

    const { accessToken, refreshToken } = issueTokens(userId)
    await storeRefreshToken(userId, refreshToken, res)

    res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (err) {
    console.error('Google auth error:', err.message)
    if (err.message?.includes('Token used too late') || err.message?.includes('Invalid token')) {
      return res.status(401).json({ error: 'Google token invalid or expired. Please try again.' })
    }
    res.status(500).json({ error: 'Google sign-in failed' })
  }
})

export default router
