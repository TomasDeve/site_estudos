-- 0046 — Ciclo de estudos em fila (Painel).
-- O ciclo é uma fila fixa de blocos (matéria + tempo sugerido + atividade), por
-- concurso. Você "sobe" um item da fila para o dia de estudo; o bloco do plano
-- guarda de qual item e de qual volta veio. Feito → o item sai da volta; o dia
-- acabou sem fazer → o bloco é apagado e o item volta pra fila. Quando todos os
-- itens da volta são feitos, começa a volta seguinte.
-- O recado "para a próxima vez" (pedido ao concluir um bloco) fica por matéria
-- no concurso e vira o detalhe do próximo bloco dela.
-- Idempotente. Rode no Supabase → SQL Editor (ou npx supabase db query --linked).

alter table public.concursos
  -- [{ "id": "…", "materia_id": "uuid", "minutos": 60, "atividade": "teoria" }, …]
  add column if not exists ciclo_fila jsonb not null default '[]'::jsonb,
  add column if not exists ciclo_volta integer not null default 1;

alter table public.plano_horas
  add column if not exists ciclo_item text,
  add column if not exists ciclo_volta integer;

create index if not exists plano_horas_ciclo_item_idx
  on public.plano_horas (ciclo_item)
  where ciclo_item is not null;

alter table public.concurso_materias
  add column if not exists proximo_estudo text not null default '';
