require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

async function insertMensagens(batch) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const data of batch) {
      await client.query(
        `INSERT INTO mensagens (
          vendedor_id, contato, nome_contato, nome_grupo, mensagem, tipo, data_envio
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          data.vendedor_id,
          data.contato,
          data.nome_contato,
          data.nome_grupo,
          data.mensagem.substring(0, 4000),
          data.tipo,
          data.data_envio
        ]
      );
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Batch insert error:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  insertMensagem: (data) => insertMensagens([data]),
  insertMensagens,
  pool
};
