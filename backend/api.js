const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { insertMensagem } = require('./postgres');

const app = express();

app.use(helmet());
app.use(express.json({ limit: '10kb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});
app.use(limiter);

app.use((req, res, next) => {
  const memoryUsage = process.memoryUsage();
  console.log(`[${req.method}] ${req.url} | RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`);
  next();
});

app.post('/api/mensagens/batch', async (req, res) => {
  try {
    await insertMensagem(req.body);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Batch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

module.exports = app;
