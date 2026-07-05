# Estudos PMAL 2026 — Soldado (CFP)

Site de estudos para o concurso da **Polícia Militar de Alagoas (PMAL) 2026** — cargo **Soldado do Quadro de Praças (CFP)**, banca **Cebraspe**.

Site estático (HTML/CSS/JS puro), sem dependências e sem build. Todo o progresso é salvo no próprio navegador (`localStorage`).

## Como usar

Abra o arquivo [`index.html`](index.html) no navegador (duplo clique). Pronto.

> Opcional — servidor local:
> ```bash
> python -m http.server 5599
> ```
> e acesse `http://localhost:5599`.

## Funcionalidades

| Aba | O que faz |
|-----|-----------|
| **Central** | Contagem regressiva, % do edital dominado, dias concluídos e a "missão de hoje" |
| **Plano de 55 dias** | Roteiro dia a dia (diagnóstico → fundamentos → aprofundamento → simulados → véspera) |
| **Edital** | Conteúdo programático verticalizado com status por tópico (não estudado → estudando → revisar → dominado) |
| **Questões** | Itens Certo/Errado no estilo Cebraspe, com gabarito, justificativa e placar |
| **Flashcards** | Cartões de "lei seca" de alta incidência |
| **Estratégia** | Pesos estimados por matéria, táticas de prova e fases do concurso |

## Estrutura da prova (Soldado)

- **P1 — Objetiva (50 itens):** Português, Matemática (financeira), Informática, Conhecimentos de Alagoas
- **P2 — Objetiva (70 itens):** Legislação PM, Legislação Penal Especial, Direito Administrativo, Constitucional, Penal Militar, Processual Penal Militar, Processual Penal e Direitos Humanos
- **P3 — Discursiva:** redação dissertativa (até 30 linhas, 30 pontos)
- Demais fases eliminatórias: TAF, avaliação médica, psicológica, investigação social e toxicológico

## Estrutura de arquivos

```
index.html
assets/
  css/styles.css
  js/data.js    # todo o conteúdo (edital, plano, questões, flashcards)
  js/app.js     # renderização, navegação e persistência
```

## Observações

- Data da prova conforme o cronograma do Edital nº 1 – PMAL (19/03/2026): **19/07/2026** (editável no site).
- A distribuição de questões por matéria é uma **estimativa** — o edital informa apenas 50 itens básicos + 70 específicos.
