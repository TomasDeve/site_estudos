-- Refina a dificuldade percebida de 3 para 4 níveis, para uma escolha mais fina:
-- Difícil / Médio Difícil / Médio Fácil / Fácil.
-- O 'medio' antigo (marcação de teste) passa a 'medio_facil'; os demais valores
-- ('facil', 'dificil') seguem válidos.

alter table public.topico_questoes drop constraint topico_questoes_dificuldade_check;

update public.topico_questoes set dificuldade = 'medio_facil' where dificuldade = 'medio';

alter table public.topico_questoes
  add constraint topico_questoes_dificuldade_check
  check (dificuldade in ('facil','medio_facil','medio_dificil','dificil'));
