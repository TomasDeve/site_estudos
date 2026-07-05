# Meus Estudos — Plataforma de Concursos

Plataforma pessoal de estudos para concursos públicos. Um **hub** lista os concursos e, ao entrar em cada um, você tem plano de estudos, edital verticalizado, banco de questões, flashcards e estratégia próprios.

O diferencial: **matérias em comum compartilham o progresso**. Português, Informática, Direito Constitucional, Administrativo, Direitos Humanos, Legislação Penal Especial e Processo Penal caem em vários concursos — você estuda uma vez e o progresso conta para todos.

Site estático (HTML/CSS/JS puro), sem dependências e sem build. Todo o progresso é salvo no navegador (`localStorage`).

## Concursos incluídos

- **PMAL 2026 — Soldado (CFP)** — Polícia Militar de Alagoas · Cebraspe. Completo (plano de 55 dias, edital, questões, flashcards).
- **PC AL — Polícia Civil de Alagoas** — provisório, aguardando edital. Já traz o núcleo comum para estudar desde já.

## Como usar

Abra o arquivo [`index.html`](index.html) no navegador (duplo clique).

> Opcional — servidor local:
> ```bash
> python -m http.server 5599
> ```

## Funcionalidades (por concurso)

| Aba | O que faz |
|-----|-----------|
| **Central** | Contagem regressiva, % do edital dominado, matérias em comum e "missão de hoje" |
| **Plano de estudos** | Roteiro dia a dia (diagnóstico → fundamentos → aprofundamento → simulados → véspera) |
| **Edital** | Conteúdo programático verticalizado com status por tópico; matérias comuns marcadas |
| **Questões** | Itens Certo/Errado no estilo Cebraspe, com gabarito, justificativa e placar |
| **Flashcards** | Cartões de "lei seca" de alta incidência |
| **Estratégia** | Pesos estimados por matéria, táticas de prova e fases do concurso |

## Estrutura de arquivos

```
index.html
assets/
  css/styles.css
  js/data.js    # catálogo de matérias + concursos (edital, plano, questões, flashcards)
  js/app.js     # hub, navegação por concurso, progresso compartilhado e persistência
```

## Como adicionar um novo concurso

Em `assets/js/data.js`:
1. Reutilize matérias do catálogo `materias` (ou crie novas). Matérias com o mesmo `id` compartilham progresso.
2. Adicione um objeto em `concursos[]` com `blocos` referenciando os ids das matérias.
3. Opcional: adicione `sessoes` (plano dia a dia), `pesos` e `estrutura`.

## Observações

- Datas e pesos por matéria são estimativas/provisórios até a confirmação de cada edital — todos editáveis/marcados no app.
