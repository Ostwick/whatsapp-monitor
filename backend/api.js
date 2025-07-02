const express = require('express');
const rateLimit = require('express-rate-limit');
const { insertMensagens } = require('./postgres');

const app = express();

// Enhanced security
app.use(helmet({
  contentSecurityPolicy: false, // Disable if not using web views
  hsts: { maxAge: 31536000, includeSubDomains: true }
}));

// Strict request handling
app.use(express.json({ 
  limit: '10kb',
  strict: true 
}));

// Aggressive rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150, // 150 requests/minute
  message: 'Too many requests',
  skip: (req) => req.ip === '127.0.0.1' // Allow local healthchecks
});
app.use(limiter);

// Efficient logging middleware
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const duration = process.hrtime(start);
    console.log(`[${req.method}] ${req.url} - ${res.statusCode} (${(duration[0] * 1000 + duration[1] / 1e6).toFixed(2)}ms)`);
  });
  next();
});

// Batch endpoint with payload validation
app.post('/api/mensagens/batch', async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ success: false, error: 'Payload must be an array' });
  }

  try {
    // Process in chunks to prevent memory spikes
    const BATCH_SIZE = 25;
    for (let i = 0; i < req.body.length; i += BATCH_SIZE) {
      const batchChunk = req.body.slice(i, i + BATCH_SIZE);
      await insertMensagens(batchChunk);
    }
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Batch processing error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      retriable: err.message.includes('connection')
    });
  }
});

// Lightweight health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    db: process.env.PGHOST ? 'connected' : 'disconnected'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    requestId: req.id 
  });
});

module.exports = app;
