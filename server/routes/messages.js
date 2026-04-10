import { Router } from 'express'
import pool from '../db.js'
import { verifyJWT } from '../middleware/auth.js'

const router = Router()
router.use(verifyJWT)

// Helper: verify an active coach-client relationship exists between two users (either direction)
async function assertMessagingAllowed(userId, otherId, res) {
  const { rows } = await pool.query(
    `SELECT id FROM coach_clients
     WHERE status = 'active'
       AND (
         (coach_user_id = $1 AND client_user_id = $2)
         OR
         (coach_user_id = $2 AND client_user_id = $1)
       )`,
    [userId, otherId]
  )
  if (!rows[0]) {
    res.status(403).json({ error: 'No active coach-client relationship with this user' })
    return false
  }
  return true
}

// GET /conversations — List all threads with last message + unread count
router.get('/conversations', async (req, res, next) => {
  try {
    const userId = req.user.userId
    const { rows } = await pool.query(
      `SELECT
         CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS other_user_id,
         p.name AS other_user_name,
         u.email AS other_user_email,
         m.body AS last_message_body,
         m.sent_at AS last_message_at,
         m.sender_id AS last_sender_id,
         COUNT(unread.id) FILTER (WHERE unread.receiver_id = $1 AND unread.is_read = FALSE) AS unread_count
       FROM messages m
       LEFT JOIN messages unread ON
         LEAST(unread.sender_id, unread.receiver_id) = LEAST(m.sender_id, m.receiver_id)
         AND GREATEST(unread.sender_id, unread.receiver_id) = GREATEST(m.sender_id, m.receiver_id)
       JOIN users u ON u.id = (CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END)
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE (m.sender_id = $1 OR m.receiver_id = $1)
         AND m.sent_at = (
           SELECT MAX(m2.sent_at) FROM messages m2
           WHERE LEAST(m2.sender_id, m2.receiver_id) = LEAST(m.sender_id, m.receiver_id)
             AND GREATEST(m2.sender_id, m2.receiver_id) = GREATEST(m.sender_id, m.receiver_id)
         )
       GROUP BY other_user_id, p.name, u.email, m.body, m.sent_at, m.sender_id
       ORDER BY m.sent_at DESC`,
      [userId]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /:otherId — Get message thread with a specific user
router.get('/:otherId', async (req, res, next) => {
  try {
    const userId = req.user.userId
    const otherId = +req.params.otherId
    if (!await assertMessagingAllowed(userId, otherId, res)) return

    const { limit = 50, before } = req.query
    const params = [userId, otherId]
    let whereExtra = ''
    if (before) {
      whereExtra = ' AND m.sent_at < $3'
      params.push(before)
    }
    params.push(+limit)
    const { rows } = await pool.query(
      `SELECT m.*, p.name AS sender_name
       FROM messages m
       LEFT JOIN profiles p ON p.user_id = m.sender_id
       WHERE (
         (m.sender_id = $1 AND m.receiver_id = $2)
         OR
         (m.sender_id = $2 AND m.receiver_id = $1)
       )${whereExtra}
       ORDER BY m.sent_at DESC
       LIMIT $${params.length}`,
      params
    )
    // Mark messages from the other user as read
    await pool.query(
      `UPDATE messages SET is_read = TRUE WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [otherId, userId]
    )
    res.json(rows.reverse()) // chronological order
  } catch (err) { next(err) }
})

// POST /:otherId — Send a message to another user
router.post('/:otherId', async (req, res, next) => {
  try {
    const userId = req.user.userId
    const otherId = +req.params.otherId
    if (userId === otherId) return res.status(400).json({ error: 'Cannot message yourself' })
    if (!await assertMessagingAllowed(userId, otherId, res)) return

    const { body, media_url } = req.body
    if (!body || !body.trim()) return res.status(400).json({ error: 'body required' })

    const { rows } = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, body, media_url)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [userId, otherId, body.trim(), media_url || null]
    )
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
})

// PUT /:messageId/read — Mark a specific message as read
router.put('/:messageId/read', async (req, res, next) => {
  try {
    const userId = req.user.userId
    const { rows: [msg] } = await pool.query(
      'SELECT * FROM messages WHERE id = $1 AND receiver_id = $2',
      [req.params.messageId, userId]
    )
    if (!msg) return res.status(404).json({ error: 'Message not found' })
    await pool.query('UPDATE messages SET is_read = TRUE WHERE id = $1', [req.params.messageId])
    res.json({ success: true })
  } catch (err) { next(err) }
})

// DELETE /:messageId — Delete own sent message
router.delete('/:messageId', async (req, res, next) => {
  try {
    const userId = req.user.userId
    const { rows: [msg] } = await pool.query(
      'SELECT * FROM messages WHERE id = $1 AND sender_id = $2',
      [req.params.messageId, userId]
    )
    if (!msg) return res.status(404).json({ error: 'Message not found or not yours' })
    await pool.query('DELETE FROM messages WHERE id = $1', [req.params.messageId])
    res.json({ success: true })
  } catch (err) { next(err) }
})

// GET /unread/count — Unread message count for the current user
router.get('/unread/count', async (req, res, next) => {
  try {
    const { rows: [row] } = await pool.query(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND is_read = FALSE',
      [req.user.userId]
    )
    res.json({ unread: +row.count })
  } catch (err) { next(err) }
})

export default router
