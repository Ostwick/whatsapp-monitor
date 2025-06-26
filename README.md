# 📲 WhatsApp Monitor

Este projeto é uma aplicação Node.js que utiliza a biblioteca [`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js) para monitorar mensagens enviadas e recebidas por uma instância do WhatsApp Web. As mensagens são registradas em um banco de dados PostgreSQL para fins de análise, histórico e integração com sistemas internos.

---

## 🚀 Funcionalidades

- Captura de mensagens **recebidas** e **enviadas**
- Identificação do **nome salvo do contato**
- Suporte a grupos (com nome do grupo)
- Armazenamento das mensagens em **PostgreSQL**
- Exibição do QR Code diretamente no terminal
- Operação em **modo headless** (sem abrir janela)
- Separação de variáveis sensíveis via `.env`

---

## 🧠 Pré-requisitos

- Node.js v18 ou superior
- PostgreSQL
- Git e npm

---

## ⚙️ Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/whatsapp-monitor.git
cd whatsapp-monitor

# Instale as dependências
npm install
```

---

## 🔐 Configuração

1. Crie um arquivo `.env` com base no `.env.example`:

```bash
cp .env.example .env
```

2. Edite o arquivo `.env` com suas credenciais do PostgreSQL:

```env
PGUSER= seuusuario
PGPASSWORD= suasenha
PGHOST= endereco
PGDATABASE= nomedobanco
PGPORT= porta
```

---

## ▶️ Como usar

```bash
npm run api
```

- Um QR Code será exibido no terminal.
- Escaneie com o WhatsApp do vendedor para iniciar o monitoramento.
- O sistema começará a registrar mensagens no banco de dados automaticamente.

---

## 🧾 Estrutura da Tabela no PostgreSQL

Certifique-se de que a tabela `mensagens` está criada assim:

```sql
CREATE TABLE IF NOT EXISTS mensagens (
  id SERIAL PRIMARY KEY,
  vendedor_id TEXT,
  contato TEXT,
  nome_contato TEXT,
  nome_grupo TEXT,
  mensagem TEXT,
  tipo TEXT, -- 'sent' ou 'received'
  data_envio TIMESTAMP
);
```

---

## 📁 Estrutura recomendada

```
whatsapp-monitor/
├── backend/
│   ├── api.js
│   ├── postgres.js
├── services/
│   └── whatsappService.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

---

## 🛡️ Segurança

- O arquivo `.env` está incluído no `.gitignore` para proteger credenciais.

---

## 🐳 Docker (opcional)

O projeto pode ser containerizado com `Docker` e `docker-compose` para rodar múltiplas instâncias simultâneas (um por vendedor).