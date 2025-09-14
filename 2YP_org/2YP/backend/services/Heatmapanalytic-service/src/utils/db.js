const { Pool } = require('pg');

// Explicitly load .env file located one level above src
require('dotenv').config({ path: '../.env' });

// Debug logs to verify environment variables
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD, typeof process.env.DB_PASSWORD);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,  // Must be a string
  port: parseInt(process.env.DB_PORT, 10),
});

module.exports = pool;
