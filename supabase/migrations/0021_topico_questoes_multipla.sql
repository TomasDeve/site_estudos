-- 0021 — Suporte a questões de MÚLTIPLA ESCOLHA no caderno (topico_questoes).
-- Até aqui o caderno era só Certo/Errado (gabarito boolean). Agora cada questão
-- carrega um `tipo`:
--   'ce'       — mantém o modelo antigo (gabarito boolean, resposta boolean);
--   'multipla' — alternativas [{letra,texto}] + gabarito_letra ('A'..'E') e a
--                letra marcada pelo aluno em resposta_letra.
-- Idempotente. Rode no Supabase → SQL Editor (ou via migration).

ALTER TABLE topico_questoes
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'ce'
    CHECK (tipo IN ('ce', 'multipla'));

-- Alternativas da múltipla: array de { "letra": "A", "texto": "..." }. Vazio em C/E.
ALTER TABLE topico_questoes
  ADD COLUMN IF NOT EXISTS alternativas jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Letra correta (múltipla). Null em C/E.
ALTER TABLE topico_questoes
  ADD COLUMN IF NOT EXISTS gabarito_letra text;

-- Letra marcada pelo aluno (múltipla). Null = ainda não resolvida.
ALTER TABLE topico_questoes
  ADD COLUMN IF NOT EXISTS resposta_letra text;

-- Em múltipla o gabarito booleano não se aplica: passa a aceitar null.
ALTER TABLE topico_questoes ALTER COLUMN gabarito DROP NOT NULL;

-- Coerência: C/E exige gabarito boolean; múltipla exige gabarito_letra.
ALTER TABLE topico_questoes DROP CONSTRAINT IF EXISTS topico_questoes_tipo_gabarito_check;
ALTER TABLE topico_questoes ADD CONSTRAINT topico_questoes_tipo_gabarito_check
  CHECK (
    (tipo = 'ce' AND gabarito IS NOT NULL) OR
    (tipo = 'multipla' AND gabarito_letra IS NOT NULL)
  );
