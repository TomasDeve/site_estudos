-- 0023 — Seleção de assuntos (tópicos) por concurso.
--
-- A matéria é ÚNICA e compartilhada entre concursos: o progresso dos tópicos, as
-- questões e os resumos valem para TODOS os concursos que a usam. Mas cada
-- concurso cobra um recorte diferente do edital da mesma matéria (ex.: em Direito
-- Constitucional, o PMAL vê 5 assuntos e a PC-AL vê só "Direitos e garantias
-- fundamentais" e "Segurança pública").
--
-- Esta coluna guarda, POR VÍNCULO concurso↔matéria, QUAIS tópicos daquela matéria
-- entram naquele concurso — e em que ORDEM devem aparecer:
--   NULL   = todos os tópicos da matéria (comportamento padrão/antigo).
--   uuid[] = apenas esses tópicos, exatamente nessa ordem.
--
-- Não há FK nos elementos do array (o Postgres não faz FK por elemento); o app
-- ignora ids que não existam mais. Idempotente. Rode no Supabase → SQL Editor.

ALTER TABLE public.concurso_materias
  ADD COLUMN IF NOT EXISTS topicos_incluidos uuid[];

COMMENT ON COLUMN public.concurso_materias.topicos_incluidos IS
  'Tópicos (da matéria) que entram neste concurso, na ordem de exibição. NULL = todos.';
