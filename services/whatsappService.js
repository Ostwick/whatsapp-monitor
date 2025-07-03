const { Client, LocalAuth } = require('whatsapp-web.js');
const fetch = require('node-fetch');
const qrcode = require('qrcode-terminal');
const API_ENDPOINT = process.env.API_ENDPOINT || 'http://api:3000/api/mensagens';
const USER_ID = process.env.USER_ID || 'default'; // Nome da instância
let vendedorId = USER_ID; // Esse valor pode ser sobrescrito após login

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: `.wwebjs_auth/session-${USER_ID}` // Sessões independentes por usuário
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox']
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
  
  try {
    // --- FIX: Use the API_ENDPOINT variable here ---
    const response = await fetch(API_ENDPOINT, { // Use the variable
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    // It's good practice to check if the request was successful
    if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
    }

    console.log(`[${direction}] ${nomeContato || contato}: ${message.body}`);
  } catch (err) {
    console.error(`Erro ao enviar mensagem para a API (${API_ENDPOINT}):`, err.message);
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
