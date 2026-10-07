const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  connectionLimit: env.DB_POOL_SIZE,
  dateStrings: false,
  namedPlaceholders: true,
});

async function conectarBanco() {
  const conexao = await pool.getConnection();
  await conexao.ping();
  conexao.release();
  console.log('MySQL conectado');
}

module.exports = { pool, conectarBanco };
