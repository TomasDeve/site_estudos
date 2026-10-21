# Como a Cebraspe corrige a redação da PC PE (Agente e Escrivão)

Pesquisa de 21/10/2026, só com fontes oficiais. Base da IA que corrige os parágrafos
(`supabase/functions/corrigir-paragrafo`) e dos parágrafos modelo (`tools/paragrafos-modelos.txt`).

## 1. A regra do edital (PC PE 2026, item 9)

- **Prova:** redação sobre "tema relevante e atual na área de segurança pública", em **até 30 linhas**, valendo **30 pontos** (9.1).
- **O que avalia:** "o conteúdo (conhecimento do tema), a capacidade de expressão na modalidade escrita e o uso das normas do registro formal culto". O candidato deve produzir, "conforme o comando formulado pela banca examinadora, **texto dissertativo**, primando pela **coerência e pela coesão**" (9.8.4).
- **Duas avaliações** (9.8.4.1):
  - **Conteúdo:** feita por pelo menos 2 examinadores; se as notas divergirem mais de 25%, há uma terceira correção.
  - **Domínio da escrita.**
- **NC (nota de conteúdo), até 30:** soma "a apresentação e a estrutura textuais e o desenvolvimento do tema" (9.8.5 a).
- **NE (número de erros):** conta "aspectos de natureza gramatical, tais como: grafia, morfossintaxe e propriedade vocabular" (9.8.5 b).
- **Nota:** **NPD = NC − 6 × NE ÷ TL**, em que TL são as **linhas efetivamente escritas** (9.8.5 d).
- **Aprovação:** NPD ≥ 15 (9.8.5.1).
- **Nota zero:** fuga ao tema, texto em branco ou NPD negativa (9.8.5 e/f).
- **Texto desconsiderado:** o que for escrito fora do local ou passar da 30ª linha (9.8.5 c).
- **Prova anulada:** qualquer marca que identifique o candidato (9.5).

**Na prática:** cada erro custa 6 ÷ TL pontos. Numa redação de 30 linhas, cada erro tira 0,2 ponto, e 10 erros tiram 2 pontos. Escrever mais linhas dilui o desconto, mas o conteúdo continua sendo o que mais pesa.

## 2. Como a nota de conteúdo se divide (prova de 2024)

Os aspectos da proposta de 2024 valiam **10,00 + 8,50 + 10,00 = 28,50**. Os **1,50** restantes ficam com a **apresentação e a estrutura textual**: letra legível, respeito às margens e indicação de parágrafos com recuo regular.

**Padrão de resposta oficial de 2024** (Agente, cargo 1, e Escrivão, cargo 3). Os aspectos gerais (quesitos 2.1 e 2.3) seguem uma escala de 0 a 3:

| Conceito | O que significa |
|---|---|
| **0** | Não abordou o aspecto |
| **1** | Mencionou o aspecto, mas não o desenvolveu |
| **2** | Desenvolveu de forma insuficiente, inconsistente ou desarticulada do tema |
| **3** | Desenvolveu adequadamente, de forma articulada ao tema |

O **aspecto de exemplo** (quesito 2.2) tem escala própria e menor:

- **Agente**, de 0 a 2:
  - 0 = não exemplificou;
  - 1 = deu um exemplo eficaz, mas "deixou claro que ainda não foi implementado";
  - 2 = deu um exemplo eficaz **e já implementado**.
- **Escrivão**, de 0 a 1: citar **um modelo existente no Brasil** (o SUSP era o esperado) já dá a nota cheia.

Outras falas do padrão:
- "A abordagem dada ao tema pode variar."
- "O candidato pode escolher como fazê-lo na sua redação, **não havendo resposta única** considerada correta."
- O candidato deve "abordar o tema e os aspectos propostos, de maneira **clara e coerente**, empregando os **mecanismos de coesão textual** e a modalidade padrão".

**Lições:**
- Cada aspecto é corrigido separadamente. O corretor precisa **achar** cada um no texto, então use as palavras do enunciado.
- "Mencionar" vale 1 de 3. Para tirar 3, é preciso explicar (causa, consequência, dado, lei) e **ligar ao tema**.
- No aspecto de exemplo, o que conta é ele **existir e já estar implementado**, com nome e lugar. Exemplo hipotético ou que "ainda será criado" perde ponto.

## 3. O que a Cebraspe conta como erro (guia oficial "Prova de Redação — critérios de avaliação", Cebraspe, 2015)

**Apresentação (macroestrutura):**
- **Legibilidade:** a banca não avalia "perfeição caligráfica", e sim a distinção clara entre as letras. Letra de fôrma é aceita se as maiúsculas forem diferenciadas.
- **Rasuras:** a que impede a leitura conta erro. Para corrigir, passe **um traço simples** e escreva a forma certa em seguida, sem usar parênteses.
- **Margens:** distância regular e a menor possível. Nada pode passar das linhas da caixa de texto.
- **Parágrafos:** recuo de cerca de 2 cm, igual em todos os parágrafos.
- **Linhas:** a linha totalmente riscada não conta. O título é opcional, mas a linha dele conta e pode ter erro (por exemplo, ponto final no título).

**Desenvolvimento do tema:** avalia a coesão, a coerência e o conteúdo pedido no comando.

**Microestrutura (entra no NE):**
- **Grafia e acentuação**, pelo VOLP e pelos dicionários.
- **Morfossintaxe:** pontuação, emprego e colocação de termos, construção do período, concordância e regência. Esses erros são "**apenados quantas vezes ocorrerem** no texto".
- **Propriedade vocabular.**

**Erros recorrentes listados pela banca:**
- **Abreviações e siglas:** abreviação informal (p/, vc, tb, pq); sigla com ponto; falta de ponto em abreviatura (etc., Dr.).
- **Translineação:** palavra dividida no fim da linha sem hífen.
- **Pontuação no início da linha.**
- **Vírgula ausente:**
  - em **oração adverbial deslocada**, de qualquer tamanho;
  - em **locução adverbial deslocada com 3 ou mais palavras**;
  - em expressões de conclusão, explicação, retificação ou ratificação, que sempre vão entre vírgulas.
- **Estrangeirismo, neologismo ou expressão coloquial sem marca** (aspas ou sublinhado).
- **Pronomes:**
  - "esse" no lugar de "este" para o tempo ou o lugar atual ("neste século");
  - "cujo" sem ideia de posse;
  - **"onde"** para algo que não é lugar;
  - relativo sem a preposição exigida pela regência ("o documento **a que** fiz referência").
- **Diálogo com o leitor** (função apelativa: "veja que…").
- **Palavras repetidas de forma viciosa no mesmo parágrafo.**
- **Expressões coloquiais** ("bola da vez", "estar a mil").
- **Parônimos:** tráfico ≠ tráfego, comprimento ≠ cumprimento, eminente ≠ iminente, autuar ≠ atuar, deferir ≠ diferir.
- **Expressões confundidas:**
  - acerca de / a cerca de / há cerca de;
  - a fim de / afim;
  - à medida que / na medida em que;
  - ao encontro de / de encontro a;
  - ao invés de / em vez de;
  - onde / aonde;
  - tampouco / tão pouco;
  - sob / sobre.
- **Formas não dicionarizadas:** "muita das vezes" (o certo é "muitas vezes") e "vez que" (o certo é "uma vez que").

## 4. Como o site converte a nota

O espelho da banca tem o quesito 1 (apresentação) e um quesito 2.x **por aspecto**, pontuado só pelo conceito. **Não há quesito separado de repertório, estilo ou estrutura do parágrafo**: tudo isso já está dentro do conceito. Por isso, no treino, a nota de conteúdo (0 a 10) sai **só do conceito**:

| Conceito | Nota de conteúdo |
|---|---|
| 3 | 10 |
| 2 | ≈ 6,7 |
| 1 | ≈ 3,3 |
| 0 | 0 |

Os erros descontam pela conta da banca (2 × NE ÷ TL, em escala 10). Os critérios mostrados (ok / parcial / faltou) são só o diagnóstico do que pesou.

**Por que mudou (21/10):** antes, a nota somava abordagem (6) + repertório (2) + estrutura (2). A IA quase nunca dava os 4 pontos extras, e até o parágrafo modelo, com conceito 3, ficava em 8. Depois da troca, o modelo tira 10, e o parágrafo fraco dele continua em ~5. Não é conversão oficial publicada: é a proporção do conceito, coerente com o espelho.

## 5. Como isso vira regra nos parágrafos modelo

- **Texto expositivo em 3ª pessoa,** sem "eu", sem opinião e sem conversar com o leitor.
- **Abertura com as palavras do aspecto,** para o corretor achar o quesito, seguindo o esqueleto dele:
  - "Inicialmente, cabe destacar que…";
  - "Posteriormente, vale dissertar sobre…";
  - "Por fim, é preciso…".
- **Desenvolver = afirmar + explicar com informação concreta + fechar ligando ao tema.** Informação concreta é lei pelo nome e ano, dado redondo com fonte ou exemplo com nome, lugar e resultado. Só mencionar dá conceito 1.
- **Aspecto de exemplo:** pelo menos 2 exemplos **já implementados**, com nome, lugar e efeito.
- **Português:**
  - estrangeirismos entre aspas ("bullying", "fintechs", "laranjas");
  - vírgula depois de adjunto adverbial deslocado ("Em 2025, …", "Em Pernambuco, …");
  - nada de "onde" fora de lugar;
  - sem palavras repetidas no mesmo parágrafo.
- **Números:** no máximo um dado por parágrafo, arredondado e com fonte na primeira vez. Os 1,50 de apresentação dependem de letra, margens e recuo, que só aparecem no papel.

## Fontes

- [Edital nº 1 – PC PE 2026, abertura (Cebraspe)](https://cdn.cebraspe.org.br/concursos/PC_PE_26/arquivos/D70610824B6BDD9266B820E9F9E5A3527D9125712B300C4F3A4A49DB948553E2.html), item 9.
- [Padrão de resposta da prova discursiva, PC PE 2024, cargo 1 (Agente)](https://cdn.cebraspe.org.br/concursos/PC_PE_23/arquivos/PC_PE_23_PADRAO_PRELIMINAR_DE_RESPOSTAS_CARGO_1.PDF).
- [Padrão de resposta da prova discursiva, PC PE 2024, cargo 3 (Escrivão)](https://cdn.cebraspe.org.br/concursos/PC_PE_23/arquivos/PC_PE_23_PADRAO_PRELIMINAR_DE_RESPOSTAS_CARGO_3.PDF).
- [Prova de Redação — critérios de avaliação (Cebraspe, 2015)](https://cdn.cebraspe.org.br/arquivos/PAS/Guia/Prova_de_Redacao_do_PAS_V11.pdf), com os critérios de apresentação e microestrutura usados pela banca.
- Apoio, não oficial: [Estratégia — Redação PF e PRF](https://portal.estrategia.com/concursos/seguranca/redacao-pf-e-prf-como-fazer-uma-redacao-nota-maxima/), que estima a estrutura em cerca de 5% da nota, em linha com os 1,50 de 30 da PC PE 2024.
