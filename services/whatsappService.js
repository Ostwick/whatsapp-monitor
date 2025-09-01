process.setMaxListeners(30)
const { Client, LocalAuth } = require('whatsapp-web.js');
const fetch = require('node-fetch');
const qrcode = require('qrcode-terminal');

const API_ENDPOINT = process.env.API_ENDPOINT || 'http://api:3000/api/mensagens';

const SESSIONS = [
    'filial-ms', 'filial-mt', 'filial-go', 'filial-pr', 'sul', 'sudeste', 
    'vhf-sp', 'vans-sp', 'norte', 'nordeste', 'mg', 'projetos', 
    'comex1', 'comex2', 'comex3'
];

const activeClients = new Map();

async function handleMessage(message, direction, vendedorId) {
  const contato = message.fromMe ? message.to : message.from;
  const contatoInfo = await message.getContact();
  const nomeContato = contatoInfo.name || contatoInfo.pushname || contatoInfo.number;
  const isGroup = contato.endsWith('@g.us');
  const nomeGrupo = isGroup ? (await message.getChat()).name : null;

  const payload = {
    vendedor_id: vendedorId,
    contato,
    nome_contato: nomeContato,
    nome_grupo: nomeGrupo,
    mensagem: message.body,
    tipo: direction,
    data_envio: new Date().toISOString()
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(`API returned status ${response.status}: ${responseBody}`);
    }
  } catch (err) {
    console.error(`[CRITICAL][${vendedorId}] Erro ao enviar mensagem para a API (${API_ENDPOINT}):`, err);
  }
}

function initializeClient(sessionId) { 
    console.log(`[${sessionId}] Initializing client...`);

    const client = new Client({
        authStrategy: new LocalAuth({
            dataPath: '.wwebjs_auth',
            clientId: sessionId 
        }),
        puppeteer: {
            dumpio: true,
            headless: true,
            args: [
              '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote',
              '--disable-gpu'
            ]
          }
    });

    activeClients.set(sessionId, { 
        client: client, 
        vendedorId: sessionId
    });

    client.on('qr', (qr) => {
        console.log(`\n\n--- QR CODE FOR: ${sessionId} ---\n`);
        qrcode.generate(qr, { small: true });
        console.log(`\n--- END QR CODE FOR: ${sessionId} ---\n\n`);
    });

    client.on('ready', () => {
        const loggedInUser = client.info?.wid?.user || sessionId;
        console.log(`[${sessionId}] WhatsApp conectado - Vendedor ID: ${loggedInUser}`);
        
        activeClients.get(sessionId).vendedorId = loggedInUser;
    });

    client.on('message_create', async msg => {
        const clientData = activeClients.get(sessionId);
        await handleMessage(msg, (msg.fromMe ? 'sent' : 'received'), clientData.vendedorId);
    });

    client.on('disconnected', reason => {
        console.log(`[${sessionId}] Sessão desconectada: ${reason}`);
    });

    client.initialize();
}

const STAGGER_DELAY_MS = 15000; // 15 seconds

const startManager = async () => {
    console.log("Starting WhatsApp Manager with staggered client initialization...");
    for (const sessionId of SESSIONS) {
        initializeClient(sessionId);
        console.log(`[MANAGER] Waiting ${STAGGER_DELAY_MS / 1000} seconds before starting next client...`);
        await new Promise(resolve => setTimeout(resolve, STAGGER_DELAY_MS));
    }
    console.log("[MANAGER] All clients have been initialized.");
};

startManager();
