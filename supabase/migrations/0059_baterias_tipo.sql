-- Simulados ganham seção própria (/simulados), separada das baterias de uma matéria.
-- `tipo` diz em qual das duas a prova aparece; a correção e a grade são as mesmas.
alter table public.baterias
  add column if not exists tipo text not null default 'bateria'
  check (tipo in ('bateria', 'simulado'));

-- Os simulados completos que já existem (nome começa com "Simulado").
update public.baterias set tipo = 'simulado' where nome ilike 'Simulado%';
