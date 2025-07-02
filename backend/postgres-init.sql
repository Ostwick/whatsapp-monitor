CREATE TABLE IF NOT EXISTS mensagens (
  id SERIAL PRIMARY KEY,
  vendedor_id VARCHAR(50) NOT NULL,
  contato VARCHAR(50) NOT NULL,
  nome_contato VARCHAR(100),
  nome_grupo VARCHAR(100),
  mensagem TEXT,
  tipo VARCHAR(20) NOT NULL,
  data_envio TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_vendedor ON mensagens(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_contato ON mensagens(contato);
CREATE INDEX IF NOT EXISTS idx_mensagens_data ON mensagens(data_envio);
