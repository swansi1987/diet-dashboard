import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './db.js';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function seed() {
  try {
    const dataPath = join(__dirname, '..', 'demo-data.json');
    const rawData = readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);

    // Get or create a default user
    let userRes = await pool.query('SELECT id FROM users LIMIT 1');
    let userId;
    
    if (userRes.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const insertUser = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
        ['demo@example.com', hashedPassword]
      );
      userId = insertUser.rows[0].id;
      console.log('Created demo user: demo@example.com / password123');
    } else {
      userId = userRes.rows[0].id;
      console.log(`Using existing user: ${userId}`);
    }

    // Insert Profile (assuming data.profile exists or just create a dummy one if empty)
    if (data.profile) {
      await pool.query(
        `INSERT INTO profiles (user_id, name, dob, weight, height, waist) 
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET 
         name=EXCLUDED.name, dob=EXCLUDED.dob, weight=EXCLUDED.weight, height=EXCLUDED.height, waist=EXCLUDED.waist`,
        [userId, data.profile.name || 'Demo User', data.profile.dob || '1990-01-01', data.profile.weight || 70, data.profile.height || 175, data.profile.waist || 80]
      );
      console.log('Profile seeded.');
    }

    // Insert weight logs
    if (data.weightLog && data.weightLog.length > 0) {
      await pool.query('DELETE FROM weight_log WHERE user_id = $1', [userId]);
      for (const log of data.weightLog) {
        await pool.query(
          'INSERT INTO weight_log (user_id, date, weight) VALUES ($1, $2, $3)',
          [userId, log.date, log.weight]
        );
      }
      console.log(`Seeded ${data.weightLog.length} weight logs.`);
    }

    // Insert cheat days
    if (data.cheatDays && data.cheatDays.length > 0) {
      await pool.query('DELETE FROM cheat_days WHERE user_id = $1', [userId]);
      for (const day of data.cheatDays) {
         await pool.query(
          'INSERT INTO cheat_days (user_id, date) VALUES ($1, $2)',
          [userId, day.date]
         );
      }
      console.log(`Seeded ${data.cheatDays.length} cheat days.`);
    }

    // Insert daily logs
    if (data.dailyLogs && data.dailyLogs.length > 0) {
      await pool.query('DELETE FROM daily_logs WHERE user_id = $1', [userId]);
      for (const log of data.dailyLogs) {
        await pool.query(
          `INSERT INTO daily_logs (user_id, date, meal_type, food_name, brand_name, quantity, calories, protein, carbs, fats, calcium, iron, magnesium, potassium, zinc, consumed, is_junk_meal, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
          [
            userId, log.date, log.meal_type, log.food_name, log.brand_name || null, log.quantity || 0,
            log.calories || 0, log.protein || 0, log.carbs || 0, log.fats || 0,
            log.calcium || 0, log.iron || null, log.magnesium || null, log.potassium || null, log.zinc || null,
            log.consumed || false, log.is_junk_meal || false, log.sort_order || 0
          ]
        );
      }
      console.log(`Seeded ${data.dailyLogs.length} daily logs.`);
    }

    console.log('Seed completed successfully.');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await pool.end();
  }
}

seed();
