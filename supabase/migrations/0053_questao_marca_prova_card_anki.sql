-- Grade de números da bateria (igual à da revisão semanal):
--   marca_prova: o que o aluno marcou no número da questão na prova impressa
--                ('duvida' = circulou, 'chute' = fez um quadrado);
--   card_anki:   estrela para virar card no Anki.
alter table public.topico_questoes
  add column if not exists marca_prova text check (marca_prova in ('duvida', 'chute')),
  add column if not exists card_anki boolean not null default false;
