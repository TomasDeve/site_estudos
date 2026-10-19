# Meus Estudos — Plataforma de Concursos

Plataforma pessoal de estudos para concursos. Cada concurso tem o seu edital
verticalizado; o foco atual é a **PC PE 2026** (Agente e Escrivão).

**Seções do concurso:**

- **Painel** — status do edital, plano dos próximos dias em blocos de 30 min (com
  "Concluir dia" e sequência 🔥), ciclo das matérias, desempenho em questões e o
  tempo estudado nos últimos 7 dias (vem dos blocos marcados como feitos).
- **Conteúdos** — matérias e assuntos do edital: status de cada assunto, caderno
  de questões, textos/resumos (leitor com marca-texto), links e PDFs.
- **Questões** — todas as questões misturadas, com filtro padrão (aba própria).
- **Impressão** — questões marcadas, em folha pronta para imprimir (aba própria).
- **Informações** — ficha do edital (vagas, datas, divisão da prova, TAF).

**Stack:** React 19 + Vite + TypeScript + Tailwind v4 · Supabase (Postgres + Auth, RLS) ·
TanStack Query · Recharts · deploy nginx via Docker (Easypanel).

## Rodando local

```bash
npm install
cp .env.example .env.local   # preencha com a URL e a publishable key do Supabase
npm run dev                  # http://localhost:5173
```

Scripts: `npm run dev` · `npm run build` (typecheck + bundle) · `npm test` (vitest).

## Banco (Supabase)

- Migrations em [`supabase/migrations/`](supabase/migrations/) (aplicadas no projeto `estudo_concurso`).
- Todas as tabelas com RLS `user_id = auth.uid()` — a anon key é pública por design.
- Matérias são um catálogo **global por usuário**: o progresso de tópicos vale para todos
  os concursos que usam a mesma matéria; cada concurso guarda o seu recorte do edital.
- Regra de ouro: consultas a tabelas de série temporal sempre por janela de datas
  (PostgREST corta em 1000 linhas — ver `src/lib/fetchAll.ts`). Listas grandes trazem
  só as colunas leves; conteúdo pesado (texto de lei, enunciado) vem sob demanda.
- Seções que saíram do site (Metas, Ciclo, Métricas, Áudios, Rotina, Banco de questões,
  metas por assunto, sistema de horas) deixaram as tabelas intactas no banco.

## Deploy (Easypanel)

Build via `Dockerfile` (multi-stage: node build → nginx). Configurar no serviço os build args:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
