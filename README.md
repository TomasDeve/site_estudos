# Meus Estudos — Plataforma de Concursos

Plataforma pessoal de estudos para concursos (v2, reescrita do zero): hub multi-concurso,
dashboard com progresso do edital, metas diárias em blocos com streak 🔥, edital
verticalizado com links por tópico, métricas de questões e importador do Qconcursos.

**Stack:** React 19 + Vite + TypeScript + Tailwind v4 · Supabase (Postgres + Auth, RLS) ·
TanStack Query · Recharts · deploy nginx via Docker (Easypanel).

## Rodando local

```bash
npm install
cp .env.example .env.local   # preencha com a URL e a publishable key do Supabase
npm run dev                  # http://localhost:5173
```

Scripts: `npm run dev` · `npm run build` (typecheck + bundle) · `npm test` (parser do Qconcursos).

## Banco (Supabase)

- Migrations em [`supabase/migrations/`](supabase/migrations/) (aplicadas no projeto `estudo_concurso`).
- Todas as tabelas com RLS `user_id = auth.uid()` — a anon key é pública por design.
- Matérias são um catálogo **global por usuário**: o progresso de tópicos vale para todos
  os concursos que usam a mesma matéria.
- Regra de ouro: consultas a tabelas de série temporal sempre por janela de datas
  (PostgREST corta em 1000 linhas — ver `src/lib/fetchAll.ts`).

## Deploy (Easypanel)

Build via `Dockerfile` (multi-stage: node build → nginx). Configurar no serviço os build args:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Primeiro acesso

1. Crie sua conta na tela de login ("Primeiro acesso") e confirme o e-mail.
2. Desative novos cadastros no dashboard Supabase (Auth → Sign In / Up).
3. Na Home, clique em **Importar PMAL + PC AL** para carregar o catálogo
   (22 matérias, 194 tópicos) e, se quiser, migre o progresso do site antigo
   colando o `localStorage` da versão v1.
