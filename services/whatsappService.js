const { Client, LocalAuth } = require('whatsapp-web.js');
const fetch = require('node-fetch');
const qrcode = require('qrcode-terminal');
const API_ENDPOINT = process.env.API_ENDPOINT || 'http://api:3000/api/mensagens';
const USER_ID = process.env.USER_ID || 'default';
let vendedorId = USER_ID;

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: '.wwebjs_auth', 
    clientId: USER_ID
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox',
    '--disable-features=TranslateUI,BlinkGenPropertyTrees',
    '--disable-ipc-flooding-protection',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--js-flags=--max-old-space-size=256']
  }
});

client.on('ready', () => {
  if (client.info?.wid?.user) {
    vendedorId = client.info.wid.user;
  }
  console.log(`WhatsApp conectado - Vendedor ID: ${vendedorId}`);
});

async function handleMessage(message, direction) {
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
  
  // --- DEBUG LOG 1: See the data before it's sent ---
  console.log(`[${USER_ID}] Preparing to send payload to API:`, JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    // --- DEBUG LOG 2: See the API's response ---
    const responseBody = await response.text(); // Get the raw response text
    console.log(`[${USER_ID}] API Response Status: ${response.status}`);
    console.log(`[${USER_ID}] API Response Body: ${responseBody}`);

    if (!response.ok) {
        // The detailed response body will be included in the error
        throw new Error(`API returned status ${response.status}: ${responseBody}`);
    }

    console.log(`[${USER_ID}] Successfully processed message for: ${nomeContato}`);

  } catch (err) {
    // This will now be a very detailed error
    console.error(`[CRITICAL] Erro ao enviar mensagem para a API (${API_ENDPOINT}):`, err);
  }
}

client.on('message_create', async msg => {
  const direction = msg.fromMe ? 'sent' : 'received';
  await handleMessage(msg, direction);
});

client.on('qr', (qr) => {
  console.clear();
  console.log(`Escaneie o QR Code para conectar (${USER_ID}):`);
  qrcode.generate(qr, { small: true });
});

client.on('disconnected', reason => {
  console.log(`Sessão desconectada (${USER_ID}): ${reason}`);
});

client.initialize();
