const { Client, LocalAuth } = require('whatsapp-web.js');
const { setTimeout } = require('timers/promises');
const qrcode = require('qrcode-terminal');

const USER_ID = process.env.USER_ID || 'default';
const API_ENDPOINT = process.env.API_ENDPOINT || 'http://localhost:3000/api/mensagens';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

class WhatsAppService {
  constructor() {
    this.vendedorId = USER_ID;
    this.messageQueue = [];
    this.isProcessingQueue = false;
    
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: `.wwebjs_auth/session-${USER_ID}`
      }),
      puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--single-process',
          '--no-zygote',
          '--disable-gpu',
          '--disable-software-rasterizer'
        ]
      },
      takeoverOnConflict: true,
      restartOnAuthFail: true
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.on('ready', () => {
      if (this.client.info?.wid?.user) {
        this.vendedorId = this.client.info.wid.user;
      }
      console.log(`WhatsApp conectado - Vendedor ID: ${this.vendedorId}`);
    });

    this.client.on('message_create', async (msg) => {
      const direction = msg.fromMe ? 'sent' : 'received';
      this.messageQueue.push({ msg, direction });
      this.processQueue();
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

  async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const { msg, direction } = this.messageQueue.shift();
      try {
        await this.handleMessage(msg, direction);
      } catch (err) {
        console.error('Error processing message:', err);
      }
    }

    this.isProcessingQueue = false;
  }

  async processBatch() {
    if (this.messageQueue.length === 0) return;
    
    const batchSize = 10;
    const batch = this.messageQueue.splice(0, batchSize);
    try {
      await fetch(`${API_ENDPOINT}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch.map(item => this.createPayload(item)))
      });
    } catch (err) {
      this.messageQueue.unshift(...batch);
    }
  }

  async handleMessage(message, direction) {
    const contato = message.fromMe ? message.to : message.from;
    const contatoInfo = await message.getContact();
    const nomeContato = contatoInfo.name || contatoInfo.pushname || contatoInfo.number;
    const isGroup = contato.endsWith('@g.us');
    
    const nomeGrupo = isGroup ? (await message.getChat()).name : null;

    const payload = {
      vendedor_id: this.vendedorId,
      contato,
      nome_contato: nomeContato,
      nome_grupo: nomeGrupo,
      mensagem: message.body,
      tipo: direction,
      data_envio: new Date().toISOString()
    };

    await this.sendToApiWithRetry(payload);
    console.log(`[${direction}] ${nomeContato || contato}: ${message.body.substring(0, 50)}...`);
  }

  async sendToApiWithRetry(payload, attempt = 1) {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
    } catch (err) {
      if (attempt <= MAX_RETRIES) {
        await setTimeout(RETRY_DELAY * attempt);
        return this.sendToApiWithRetry(payload, attempt + 1);
      }
      console.error('Failed after retries:', err);
      throw err;
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

module.exports = new WhatsAppService();
