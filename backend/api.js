const express = require('express');
const app = express();
const { insertMensagem } = require('./postgres');

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

app.post('/api/mensagens', async (req, res) => {
  try {
    await insertMensagem(req.body);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Erro na API:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => {
  console.log('API PostgreSQL rodando em http://localhost:3000');
});
