-- Configurações da matéria: quais blocos aparecem na página. Nem toda matéria
-- usa o registro geral de questões ou os resumos gerais — poder desligar o que
-- não usa deixa a página enxuta, com o edital mais perto do topo.
--
-- Padrão `true` para não mexer em nada no que já existe: quem não abrir as
-- configurações continua vendo a página inteira.

alter table public.materias
  add column mostrar_questoes_geral boolean not null default true,
  add column mostrar_resumos_geral boolean not null default true;
