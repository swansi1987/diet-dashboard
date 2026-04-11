import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pool from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const migrations = [
  '001_init.sql',
  '002_workout_coach.sql',
  '003_oauth.sql',
  '004_exercise_constraints.sql',
]

async function migrate() {
  for (const filename of migrations) {
    const filepath = join(__dirname, 'migrations', filename)
    const sql = readFileSync(filepath, 'utf8')
    try {
      await pool.query(sql)
      console.log(`Migration ${filename} completed successfully.`)
    } catch (err) {
      console.error(`Migration ${filename} failed:`, err.message)
      await pool.end()
      process.exit(1)
    }
  }
  await pool.end()
  console.log('All migrations completed.')
}

migrate()
