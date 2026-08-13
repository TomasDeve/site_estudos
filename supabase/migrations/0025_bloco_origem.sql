-- Origem do bloco de Metas: distingue blocos planejados ('plano') dos criados
-- automaticamente ao registrar tempo no orçamento de horas ('estudo' = conteúdo,
-- 'revisao' = Anki). Os automáticos entram já concluídos, contam para a meta do
-- dia e, ao serem apagados, DEVOLVEM as horas aos baldes (via as sessões ligadas
-- pelo bloco_id). Blocos antigos e planejados ficam com 'plano' e não mudam.
alter table public.blocos_dia
  add column origem text not null default 'plano';
