-- 0020 — Novo sistema "Refazer questão futuramente" + categoria 'real' (Questões Reais)
-- Rode no Supabase → SQL Editor (uma vez). Idempotente.

-- Marca de "refazer futuramente" e link da versão reformulada para a original.
ALTER TABLE topico_questoes ADD COLUMN IF NOT EXISTS refazer boolean NOT NULL DEFAULT false;
ALTER TABLE topico_questoes ADD COLUMN IF NOT EXISTS reformulada_de uuid
  REFERENCES topico_questoes(id) ON DELETE SET NULL;

-- Libera a categoria 'real' (Questões Reais) no CHECK de categorias.
ALTER TABLE topico_questoes DROP CONSTRAINT IF EXISTS topico_questoes_categoria_check;
ALTER TABLE topico_questoes ADD CONSTRAINT topico_questoes_categoria_check
  CHECK (categoria IN ('ia', 'real', 'baseada_questoes', 'doutrina_jurisprudencia'));
