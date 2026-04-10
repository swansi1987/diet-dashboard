import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'

dotenv.config()

import authRoutes from './routes/auth.js'
import dailyLogsRoutes from './routes/dailyLogs.js'
import foodDatabaseRoutes from './routes/foodDatabase.js'
import weightLogRoutes from './routes/weightLog.js'
import profileRoutes from './routes/profile.js'
import cheatDaysRoutes from './routes/cheatDays.js'
import settingsRoutes from './routes/settings.js'
import aiRoutes from './routes/ai.js'
import dataManagementRoutes from './routes/dataManagement.js'
import exercisesRoutes from './routes/exercises.js'
import workoutTemplatesRoutes from './routes/workoutTemplates.js'
import workoutSessionsRoutes from './routes/workoutSessions.js'
import personalRecordsRoutes from './routes/personalRecords.js'
import bodyMeasurementsRoutes from './routes/bodyMeasurements.js'
import coachClientsRoutes from './routes/coachClients.js'
import assignedProgramsRoutes from './routes/assignedPrograms.js'
import messagesRoutes from './routes/messages.js'
import pushTokensRoutes from './routes/pushTokens.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

// Ensure uploads directory exists
const uploadsDir = join(__dirname, '..', 'uploads', 'meals')
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : true)
  : ['http://localhost:5173', 'http://localhost:8081']
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

// Static file serving for meal photos
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')))

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/daily-logs', dailyLogsRoutes)
app.use('/api/food-database', foodDatabaseRoutes)
app.use('/api/weight-log', weightLogRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/cheat-days', cheatDaysRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/data', dataManagementRoutes)

// FitCoach Platform routes
app.use('/api/exercises', exercisesRoutes)
app.use('/api/workout-templates', workoutTemplatesRoutes)
app.use('/api/workout-sessions', workoutSessionsRoutes)
app.use('/api/personal-records', personalRecordsRoutes)
app.use('/api/body-measurements', bodyMeasurementsRoutes)
app.use('/api/coach-clients', coachClientsRoutes)
app.use('/api/assigned-programs', assignedProgramsRoutes)
app.use('/api/messages', messagesRoutes)
app.use('/api/push-tokens', pushTokensRoutes)

// Serve React SPA in production
if (process.env.NODE_ENV === 'production') {
  const publicDir = join(__dirname, 'public')
  app.use(express.static(publicDir))
  app.get('*', (req, res) => res.sendFile(join(publicDir, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  autoSeedExercises()
})

async function autoSeedExercises() {
  try {
    const { default: pool } = await import('./db.js')
    const { rows } = await pool.query('SELECT COUNT(*) AS count FROM exercises WHERE is_global = TRUE')
    if (parseInt(rows[0].count) > 0) return
    const { EXERCISES } = await import('./data/exercises-seed.js')
    let count = 0
    for (const ex of EXERCISES) {
      const result = await pool.query(
        `INSERT INTO exercises (name, muscle_group, secondary_muscles, equipment, category, instructions, tips, gif_url, is_global)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE)
         ON CONFLICT (name) DO NOTHING`,
        [ex.name, ex.muscle_group, ex.secondary_muscles ?? null, ex.equipment ?? 'bodyweight',
         ex.category ?? 'strength', ex.instructions ?? null, ex.tips ?? null, ex.gif_url ?? null]
      )
      if (result.rowCount > 0) count++
    }
    console.log(`✅ Auto-seeded ${count} exercises`)
  } catch (err) {
    // Table not yet migrated — silently skip
    if (!err.message.includes('does not exist')) {
      console.warn('Exercise auto-seed warning:', err.message)
    }
  }
}
