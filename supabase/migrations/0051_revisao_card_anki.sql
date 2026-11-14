-- Revisão semanal: depois de responder, o aluno marca a premissa para virar card no Anki.
-- A estrela aparece ao lado do número da premissa; a skill revisao-semanal lista as marcadas.
alter table public.revisao_semanal_itens
  add column if not exists card_anki boolean not null default false;
