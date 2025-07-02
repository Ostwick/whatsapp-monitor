const { Client, LocalAuth } = require('whatsapp-web.js');
const { setTimeout } = require('timers/promises');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const DEFAULT_USER_ID = 'default';
const DEFAULT_API_ENDPOINT = 'http://api:3000/api/mensagens';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const BATCH_SIZE = 10;
const BATCH_INTERVAL_MS = 5000;
const MEMORY_LIMIT_MB = 280;
const MEMORY_CHECK_INTERVAL_MS = 30000;

console.log('Iniciando serviço WhatsApp...');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});


class WhatsAppService {
  constructor() {
    this.USER_ID = process.env.USER_ID || DEFAULT_USER_ID;
    this.API_ENDPOINT = process.env.API_ENDPOINT || DEFAULT_API_ENDPOINT;
    this.vendedorId = this.USER_ID;
    this.currentBatch = [];
    this.isProcessing = false;
    this.messageCount = 0;
    this.sessionPath = path.join('.wwebjs_auth', `session-${this.USER_ID}`);

    this.initializeClient();
    this.setupEventHandlers();
    this.startBatchProcessor();
    this.startMemoryMonitor();
    this.cleanSessionLocks();
  
    this.initialize();   
  }
  initializeClient() {
  console.log(`[${this.USER_ID}] Criando client WhatsApp...`);
  this.client = new Client({
    authStrategy: new LocalAuth({
      clientId: this.USER_ID,
      dataPath: this.sessionPath,
      dataPathCache: false
    }),
      puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--single-process',
          '--no-zygote',
          '--disable-gpu',
          `--user-data-dir=/tmp/chrome-${this.USER_ID}`,
          '--disable-extensions',
          '--disable-background-networking'
        ]
      },
      takeoverOnConflict: true,
      restartOnAuthFail: true
    });
    console.log(`[${this.USER_ID}] Cliente criado, chamando .initialize()...`);
  }

  cleanSessionLocks() {
    try {
      const locks = [
        path.join(this.sessionPath, 'SingletonLock'),
        path.join(this.sessionPath, '.session.lock')
      ];

      locks.forEach(lockPath => {
        if (fs.existsSync(lockPath)) {
          fs.unlinkSync(lockPath);
          console.log(`Removed session lock: ${lockPath}`);
        }
      });
    } catch (err) {
      console.error('Error cleaning session locks:', err);
    }
  }

  setupEventHandlers() {
    this.client.on('qr', (qr) => {
      console.log('\n\n=== WHATSAPP QR CODE ===');
      console.log(`Instance: ${this.USER_ID}`);
      console.log('Scan this QR code within 60 seconds:\n');
      qrcode.generate(qr, { small: true });
      this.saveQrToFile(qr).catch(console.error);
    });

    this.client.on('authenticated', () => {
      console.log(`\n[${this.USER_ID}] Authentication successful!`);
    });

    this.client.on('ready', () => {
      this.vendedorId = this.client.info?.wid?.user || this.USER_ID;
      console.log(`\n[${this.USER_ID}] Client ready! Vendor ID: ${this.vendedorId}`);
    });

    this.client.on('disconnected', (reason) => {
      console.log(`\n[${this.USER_ID}] Disconnected: ${reason}`);
      this.scheduleReconnect();
    });

    this.client.on('message_create', async (msg) => {
      try {
        const payload = await this.createMessagePayload(
          msg,
          msg.fromMe ? 'sent' : 'received'
        );
        this.queueMessage(payload);
      } catch (err) {
        console.error('Message processing error:', err);
      }
      
    });
    this.client.on('change_state', state => {
      console.log(`[${this.USER_ID}] State changed: ${state}`);
    });
    
    this.client.on('loading_screen', (percent, message) => {
      console.log(`[${this.USER_ID}] Loading... ${percent}% - ${message}`);
    });
    
    this.client.on('error', error => {
      console.error(`[${this.USER_ID}] WhatsApp Error:`, error);
    });
    
    this.client.on('auth_failure', msg => {
      console.error(`[${this.USER_ID}] Auth Failure:`, msg);
    });
  }

  async saveQrToFile(qr) {
    const qrPath = path.join(this.sessionPath, 'qr.txt');
    await fs.promises.writeFile(qrPath, qr);
    console.log(`\nQR code saved to: ${qrPath}\n`);
  }

  queueMessage(payload) {
    this.currentBatch.push(payload);
    this.messageCount++;

    if (this.currentBatch.length >= BATCH_SIZE) {
      this.processBatch();
    }
  }

  async createMessagePayload(message, direction) {
    const contato = message.fromMe ? message.to : message.from;
    const contatoInfo = await message.getContact();

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
      mensagem: message.body.substring(0, 4000),
      tipo: direction,
      data_envio: new Date().toISOString()
    };
  }

  startBatchProcessor() {
    setInterval(() => {
      if (this.currentBatch.length > 0 && !this.isProcessing) {
        this.processBatch();
      }
    }, BATCH_INTERVAL_MS).unref();
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
      this.currentBatch.unshift(...batchToSend);
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
      const usedMB = Math.round(memory.heapUsed / 1024 / 1024);
      
      if (usedMB > MEMORY_LIMIT_MB) {
        this.cleanupMemory();
      }
    }, MEMORY_CHECK_INTERVAL_MS).unref();
  }

  cleanupMemory() {
    console.warn('Performing memory cleanup...');
    if (global.gc) {
      global.gc();
    }

    if (this.client) {
      this.client.pupPage?.evaluate(() => window.clearCache?.());
    }
  }

  scheduleReconnect() {
    setTimeout(5000).then(() => {
      console.log(`Attempting to reconnect ${this.USER_ID}...`);
      this.client.initialize().catch(err => {
        console.error('Reconnect failed:', err);
        this.scheduleReconnect();
      });
    });
  }

  initialize() {
    this.cleanSessionLocks();

    this.client.initialize().catch(err => {
      console.error(`[${this.USER_ID}] Initialization error:`, err);
      this.scheduleReconnect();
    });
  }
}

// Singleton instance with cleanup
const instance = new WhatsAppService();

process.on('SIGINT', () => {
  console.log('Cleaning up before exit...');
  instance.client.destroy();
  process.exit();
});

module.exports = instance;
