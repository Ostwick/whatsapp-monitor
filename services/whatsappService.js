const { Client, LocalAuth } = require('whatsapp-web.js');
const fetch = require('node-fetch');
const qrcode = require('qrcode-terminal');

let vendedorId = 'desconhecido';

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'vendedor-001' // você pode personalizar este ID por instância
  }),
  puppeteer: {
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

// Mostra o QR Code no terminal
client.on('qr', (qr) => {
  console.clear();
  console.log('Escaneie o QR Code abaixo para conectar o WhatsApp:');
  qrcode.generate(qr, { small: true });
});

// Define o vendedorId quando a sessão está pronta
client.on('ready', () => {
  vendedorId = client.info.wid.user;
  console.log(`Cliente do WhatsApp está pronto! Vendedor ID: ${vendedorId}`);
});

// Captura mensagens enviadas e recebidas
client.on('message_create', async msg => {
  const direction = msg.fromMe ? 'sent' : 'received';
  await handleMessage(msg, direction);
});

// Informa quando a sessão for desconectada
client.on('disconnected', (reason) => {
  console.log(`Desconectado do WhatsApp: ${reason}`);
});

// Lógica de envio para API
async function handleMessage(message, direction) {
  const contato = message.from;
  const contatoInfo = await message.getContact();
  const nomeContato = contatoInfo.name || contatoInfo.pushname || contatoInfo.number;
  const isGroup = contato.endsWith('@g.us');
  const nomeGrupo = isGroup ? (await message.getChat()).name : null;

  const payload = {
    vendedor_id: vendedorId,
    contato: contato,
    nome_contato: nomeContato,
    nome_grupo: nomeGrupo,
    mensagem: message.body,
    tipo: direction,
    data_envio: new Date().toISOString()
  };

  try {
    await fetch('http://localhost:3000/api/mensagens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log(`[${direction}] ${nomeContato || contato}: ${message.body}`);
  } catch (err) {
    console.error('Erro ao enviar mensagem para a API:', err.message);
  }
}

client.initialize();
