require('dotenv').config(); // carrega as variáveis do .env

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

async function insertMensagem(data) {
  const {
    vendedor_id,
    contato,
    nome_contato,
    nome_grupo,
    mensagem,
    tipo,
    data_envio
  } = data;

  try {
    await pool.query(
      `INSERT INTO mensagens (
        vendedor_id, contato, nome_contato, nome_grupo, mensagem, tipo, data_envio
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [vendedor_id, contato, nome_contato, nome_grupo, mensagem, tipo, data_envio]
    );
  } catch (error) {
    console.error('Erro ao inserir no PostgreSQL:', error);
  }
}

module.exports = {
  insertMensagem
};
