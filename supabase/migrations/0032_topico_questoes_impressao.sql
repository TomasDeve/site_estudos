-- 0032 — Marcar questões para impressão.
-- Toda questão ganha uma caixinha discreta "imprimir". Marcada, ela entra na
-- seção "Impressão" (menu lateral), que junta as marcadas numa folha organizada
-- por matéria e assunto, pronta para imprimir — e onde depois dá para corrigir
-- (responder no site, ver o comentário, mandar pro resumo, tirar dúvida com IA).
-- Guardamos QUANDO foi marcada (null = não marcada), no banco e não no
-- localStorage, pra a lista ser a mesma no celular e no computador.
-- Idempotente. Rode no Supabase → SQL Editor (ou via migration).

ALTER TABLE topico_questoes
  ADD COLUMN IF NOT EXISTS imprimir_em timestamptz;

-- Número que a questão recebeu na folha impressa (null = ainda não impressa).
-- É gravado na hora de imprimir e não muda mais: desmarcar ou marcar outras
-- questões não renumera a folha que já está no papel, então a correção no site
-- continua batendo com o número impresso. Desmarcar a questão limpa o número.
ALTER TABLE topico_questoes
  ADD COLUMN IF NOT EXISTS impressao_numero integer;

-- A seção "Impressão" busca só as marcadas: índice parcial, minúsculo.
CREATE INDEX IF NOT EXISTS topico_questoes_imprimir_idx
  ON topico_questoes (user_id, imprimir_em)
  WHERE imprimir_em IS NOT NULL;
