require('dotenv').config();
const { Pool } = require('pg');
const { setTimeout } = require('timers/promises');

// Optimized connection pool
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  max: 10, // Increased for batch processing
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  application_name: 'whatsapp-monitor'
});

// Batch insert with retry logic
async function insertMensagens(batch, attempt = 1) {
  const client = await pool.connect().catch(err => {
    console.error('Connection error:', err);
    throw err;
  });

  try {
    await client.query('BEGIN');
    
    // Use parameterized query with VALUES list
    const values = batch.map((data, index) => 
      `($${index*7+1}, $${index*7+2}, $${index*7+3}, $${index*7+4}, $${index*7+5}, $${index*7+6}, $${index*7+7})`
    ).join(',');

    const queryText = `
      INSERT INTO mensagens (
        vendedor_id, contato, nome_contato, nome_grupo, mensagem, tipo, data_envio
      ) VALUES ${values}
    `;

    const params = batch.flatMap(data => [
      data.vendedor_id,
      data.contato,
      data.nome_contato || null,
      data.nome_grupo || null,
      data.mensagem?.substring(0, 4000) || '',
      data.tipo,
      data.data_envio || new Date().toISOString()
    ]);

    await client.query(queryText, params);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    
    if (attempt <= 3 && error.message.includes('connection')) {
      await setTimeout(1000 * attempt);
      return insertMensagens(batch, attempt + 1);
    }

    console.error('Batch insert failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Health check
async function checkHealth() {
  try {
    const res = await pool.query('SELECT 1');
    return res.rows.length === 1;
  } catch {
    return false;
  }
}

module.exports = {
  insertMensagens,
  checkHealth,
  pool
};
