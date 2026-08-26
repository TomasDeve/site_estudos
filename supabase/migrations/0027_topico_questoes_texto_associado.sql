-- 0027 — Texto associado (enunciado-base) das questões.
-- No QConcursos, muitas questões têm um "Texto associado" escondido atrás de um botão "+":
-- uma passagem pra ler (ou uma imagem) que várias questões compartilham. Isso é DIFERENTE do
-- `contexto`, que guarda o comando/cabeçalho curto da banca ("julgue o item a seguir").
-- Aqui damos um campo próprio ao texto associado, pra o site poder exibi-lo num bloco colapsável
-- (igual ao QConcursos) sem misturar com o comando.
-- Idempotente. Rode no Supabase → SQL Editor (ou via migration).

-- Caderno estudável.
ALTER TABLE topico_questoes
  ADD COLUMN IF NOT EXISTS texto_associado text;

-- Staging da importação (histórico/curadoria).
ALTER TABLE questoes_importadas
  ADD COLUMN IF NOT EXISTS texto_associado text;
