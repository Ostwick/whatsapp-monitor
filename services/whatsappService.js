const { Client, LocalAuth } = require('whatsapp-web.js');
const { setTimeout } = require('timers/promises');
const qrcode = require('qrcode-terminal');

const USER_ID = process.env.USER_ID || 'default';
const API_ENDPOINT = process.env.API_ENDPOINT || 'http://localhost:3000/api/mensagens';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 5000; // 5 seconds

class WhatsAppService {
  constructor() {
    this.vendedorId = USER_ID;
    this.currentBatch = [];
    this.isProcessing = false;
    this.messageCount = 0;
    
    // Memory optimization
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: `.wwebjs_auth/session-${USER_ID}`,
        dataPathCache: false // Disable session caching
      }),
      puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        headless: 'new', // New headless mode
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--single-process',
          '--no-zygote',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions',
          '--disable-setuid-sandbox',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--js-flags="--max-old-space-size=256"'
        ]
      },
      takeoverOnConflict: true,
      restartOnAuthFail: true,
      ffmpegPath: false // Disable ffmpeg if not needed
    });

    this.setupEventHandlers();
    this.startBatchProcessor();
    this.startMemoryMonitor();
  }

  setupEventHandlers() {
    this.client.on('ready', () => {
      if (this.client.info?.wid?.user) {
        this.vendedorId = this.client.info.wid.user;
      }
      console.log(`WhatsApp conectado - Vendedor ID: ${this.vendedorId}`);
    });

    this.client.on('message_create', async (msg) => {
      try {
        const direction = msg.fromMe ? 'sent' : 'received';
        const payload = await this.createMessagePayload(msg, direction);
        
        this.currentBatch.push(payload);
        this.messageCount++;
        
        // Process immediately if batch is full
        if (this.currentBatch.length >= BATCH_SIZE) {
          this.processBatch();
        }
      } catch (err) {
        console.error('Message processing error:', err);
      }
    });

    this.client.on('qr', (qr) => {
      console.clear();
      console.log(`Escaneie o QR Code para conectar (${USER_ID}):`);
      qrcode.generate(qr, { small: true });
    });

    this.client.on('disconnected', (reason) => {
      console.log(`Sessão desconectada (${USER_ID}): ${reason}`);
      this.scheduleReconnect();
    });
  }

  async createMessagePayload(message, direction) {
    const contato = message.fromMe ? message.to : message.from;
    const contatoInfo = await message.getContact();
    
    // Only get group info if needed
    let nomeGrupo = null;
    const isGroup = contato.endsWith('@g.us');
    if (isGroup) {
      const chat = await message.getChat();
      nomeGrupo = chat.name;
    }

    return {
      vendedor_id: this.vendedorId,
      contato,
      nome_contato: contatoInfo.name || contatoInfo.pushname || contatoInfo.number,
      nome_grupo: nomeGrupo,
      mensagem: message.body.substring(0, 4000), // Truncate long messages
      tipo: direction,
      data_envio: new Date().toISOString()
    };
  }

  startBatchProcessor() {
    setInterval(() => {
      if (this.currentBatch.length > 0 && !this.isProcessing) {
        this.processBatch();
      }
    }, BATCH_INTERVAL).unref(); // Allow process to exit despite interval
  }

  async processBatch() {
    if (this.isProcessing || this.currentBatch.length === 0) return;
    
    this.isProcessing = true;
    const batchToSend = this.currentBatch.splice(0, BATCH_SIZE);
    
    try {
      await this.sendBatchToApi(batchToSend);
      console.log(`[BATCH] Sent ${batchToSend.length} messages (Total: ${this.messageCount})`);
    } catch (err) {
      console.error('Batch failed, requeuing:', err);
      this.currentBatch.unshift(...batchToSend); // Requeue failed items
    } finally {
      this.isProcessing = false;
    }
  }

  async sendBatchToApi(batch) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${API_ENDPOINT}/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return;
      } catch (err) {
        if (attempt === MAX_RETRIES) throw err;
        await setTimeout(RETRY_DELAY * attempt);
      }
    }
  }

  startMemoryMonitor() {
    setInterval(() => {
      const memory = process.memoryUsage();
      const rss = Math.round(memory.rss / 1024 / 1024);
      const heap = Math.round(memory.heapUsed / 1024 / 1024);
      
      console.log(`[MEMORY] RSS: ${rss}MB | Heap: ${heap}MB | Messages: ${this.messageCount}`);
      
      if (memory.heapUsed > 300 * 1024 * 1024) { // 300MB
        this.cleanupMemory();
      }
    }, 30000).unref();
  }

  cleanupMemory() {
    console.warn('Performing memory cleanup...');
    if (global.gc) {
      global.gc();
    }
    // Clear any cached data
    if (this.client) {
      this.client.pupPage?.evaluate(() => window.clearCache?.());
    }
  }

  scheduleReconnect() {
    setTimeout(5000).then(() => {
      console.log(`Attempting to reconnect ${USER_ID}...`);
      this.client.initialize().catch(err => {
        console.error('Reconnect failed:', err);
        this.scheduleReconnect();
      });
    });
  }

  initialize() {
    this.client.initialize().catch(err => {
      console.error('Initialization failed:', err);
      this.scheduleReconnect();
    });
  }
}

// Singleton with cleanup
const instance = new WhatsAppService();
process.on('SIGINT', () => {
  console.log('Cleaning up before exit...');
  instance.client.destroy();
  process.exit();
});

module.exports = instance;
