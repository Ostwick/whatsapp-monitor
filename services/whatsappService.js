const { Client, LocalAuth } = require('whatsapp-web.js');
const fetch = require('node-fetch');
const qrcode = require('qrcode-terminal');
const API_ENDPOINT = process.env.API_ENDPOINT || 'http://api:3000/api/mensagens';
const USER_ID = process.env.USER_ID || 'default';

const SESSIONS = [
    'filial-ms',
    'filial-mt',
    'filial-go',
    'filial-pr',
    'sul',
    'sudeste',
    'vhf-sp',
    'vans-sp',
    'norte',
    'nordeste',
    'mg',
    'projetos',
    'comex1',
    'comex2',
    'comex3'
];

const activeClients = new Map();

async function handleMessage(message, direction, vendedorId) {
  const contato = message.fromMe ? message.to : message.from;
  const contatoInfo = await message.getContact();
  const nomeContato = contatoInfo.name || contatoInfo.pushname || contatoInfo.number;
  const isGroup = contato.endsWith('@g.us');
  const nomeGrupo = isGroup ? (await message.getChat()).name : null;
  let vendedorId = USER_ID;

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
        throw new Error(`API returned status ${response.status}: ${responseBody}`);
    }

  } catch (err) {
    console.error(`[CRITICAL] Erro ao enviar mensagem para a API (${API_ENDPOINT}):`, err);
  }
}

function initializeClient(USER_ID) {
    console.log(`[${USER_ID}] Initializing client...`);

    const client = new Client({
        authStrategy: new LocalAuth({
            dataPath: '.wwebjs_auth',
            clientId: USER_ID // Crucial: Uses the specific ID for the session folder
        }),
        puppeteer: {
            // Your optimized puppeteer args are still good
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--single-process',
              '--disable-gpu'
            ]
          }
    });

    // Store the client in the map
    activeClients.set(USER_ID, client);

    // --- Event Listeners ---
    // We must attach listeners to *this specific* client instance.

    client.on('qr', (qr) => {
        console.log(`\n\n--- QR CODE FOR: ${USER_ID} ---\n`);
        qrcode.generate(qr, { small: true });
        console.log(`\n--- END QR CODE FOR: ${USER_ID} ---\n\n`);
    });

    client.on('ready', () => {
        // Determine the actual Vendedor ID from the client info if available
        let actualVendedorId = USER_ID;
        if (client.info?.wid?.user) {
            actualVendedorId = client.info.wid.user;
        }
        console.log(`[${USER_ID}] WhatsApp conectado - Vendedor ID: ${actualVendedorId}`);
        
        // Update the map with the actual ID for later reference if needed
        activeClients.set(USER_ID, { client, vendedorId: actualVendedorId });
    });

    client.on('message_create', async msg => {
        // Retrieve the Vendedor ID when a message arrives
        const clientData = activeClients.get(USER_ID);
        const vendedorId = clientData.vendedorId || USER_ID;

        const direction = msg.fromMe ? 'sent' : 'received';
        await handleMessage(msg, direction, vendedorId);
    });

    client.on('disconnected', reason => {
        console.log(`[${USER_ID}] Sessão desconectada: ${reason}`);
    });

    client.initialize();
}

// --- Main Loop ---
console.log("Starting WhatsApp Manager...");
SESSIONS.forEach(userId => {
    initializeClient(userId);
});
