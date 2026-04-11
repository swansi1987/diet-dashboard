import pg from 'pg'
import dns from 'dns'
import dotenv from 'dotenv'

dotenv.config()

dns.setDefaultResultOrder('ipv4first')

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error', err)
})

export default pool
