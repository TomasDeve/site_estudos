-- 0028 — Grifos (sublinhados) do aluno nas questões.
-- O usuário pode selecionar trechos do "Texto associado" e do enunciado e sublinhar,
-- igual faz na prova. Cada grifo é um intervalo de caracteres [início, fim) dentro do
-- texto daquele campo. Guardamos por campo, num jsonb:
--   { "texto_associado": [[12,20],[35,48]], "enunciado": [[0,7]] }
-- Fica no banco (não no localStorage) pra sincronizar entre celular e computador.
-- Idempotente. Rode no Supabase → SQL Editor (ou via migration).

ALTER TABLE topico_questoes
  ADD COLUMN IF NOT EXISTS grifos jsonb;
