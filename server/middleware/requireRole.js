import pool from '../db.js'

export function requireRole(role) {
  return async (req, res, next) => {
    try {
      const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.userId])
      if (!rows[0] || rows[0].role !== role) {
        return res.status(403).json({ error: `Forbidden: requires role '${role}'` })
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}
