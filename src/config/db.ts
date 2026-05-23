import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Verify connection on startup
pool.connect((err, _client, release) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1); // Exit if DB is unreachable on startup
  } else {
    console.log('Database connected successfully');
    release();
  }
});

export default pool;
