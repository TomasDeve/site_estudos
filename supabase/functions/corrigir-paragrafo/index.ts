// Edge Function "corrigir-paragrafo" — corrige UM parágrafo do treino de redação
// (/paragrafos): introdução, desenvolvimento ou conclusão, sobre um tema sorteado no
// estilo Cebraspe. Devolve JSON (conceito do aspecto, critérios com pontos, acertos,
// o que melhorar, erros de português e uma reescrita nota máxima). A nota final
// (conteúdo − 2·erros/linhas) é calculada no site, igual à conta da Cebraspe.
//
// Segredo necessário (Dashboard → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY = chave da API da Anthropic
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Tipo = "introducao" | "desenvolvimento" | "conclusao";

interface Payload {
  tipo: Tipo;
  tema: string;
  textos?: { texto: string; fonte?: string }[];
  aspectos: string[];
  /** 0, 1 ou 2: o aspecto que o parágrafo responde (desenvolvimento e conclusão). */
  aspecto?: number | null;
  texto: string;
  /** Linhas estimadas na folha da Cebraspe (contadas no site). */
  linhas: number;
  /** Faixa de linhas pedida para o tipo de parágrafo, ex.: [8, 9]. */
  meta: [number, number];
  /** Caracteres que cabem numa linha da folha, na letra do aluno (o site manda; padrão 62). */
  caracteresPorLinha?: number;
  /** Pontos de repertório já conferidos para esse parágrafo (fonte da reescrita). */
  repertorio?: string[];
  /** Parágrafo modelo (nota máxima) daquele parágrafo, escrito no esqueleto dele: régua da correção. */
  paragrafoModelo?: string;
  /** Quanto a IA raciocina antes de responder (padrão "high"); "medium" sai mais barato. */
  esforco?: "low" | "medium" | "high";
  /** Modelo da correção (padrão: Opus 5.5). Opção para comparar custo e qualidade. */
  modelo?: string;
}

function erro(mensagem: string, status: number): Response {
  return new Response(mensagem, {
    status,
    headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8" },
  });
}

// Critérios da Cebraspe (pesquisa em tools/cebraspe-redacao-criterios.md): edital PC PE 2026,
// item 9; padrão de resposta oficial da PC PE 2024 (Agente e Escrivão); guia oficial de
// critérios de redação da Cebraspe (apresentação e microestrutura).
const BASE = [
  "Você é examinador da banca Cebraspe e treina um candidato a Agente da Polícia Civil de Pernambuco (PC PE, prova em 2027). Corrija exatamente como a banca corrige, seguindo o edital da PC PE 2026 (item 9), o padrão de resposta oficial da PC PE 2024 e o guia oficial de critérios de redação da Cebraspe.",
  "",
  "A PROVA (edital, item 9): redação de até 30 linhas sobre tema relevante e atual de segurança pública, com 3 aspectos, valendo 30 pontos. A banca avalia 'o conteúdo (conhecimento do tema), a capacidade de expressão na modalidade escrita e o uso das normas do registro formal culto', em 'texto dissertativo, primando pela coerência e pela coesão'. Nota = NC − 6 × NE ÷ TL (NC: apresentação e estrutura textuais + desenvolvimento do tema; NE: erros de grafia, morfossintaxe e propriedade vocabular; TL: linhas efetivamente escritas). Fuga ao tema = nota zero.",
  "",
  "COMO A BANCA PONTUA CADA ASPECTO (padrão de resposta oficial de 2024): conceito 0 = não abordou o aspecto; 1 = mencionou o aspecto, mas não o desenvolveu; 2 = desenvolveu de forma insuficiente/inconsistente ou desarticulada do tema; 3 = desenvolveu adequadamente o aspecto, de forma articulada ao tema.",
  "O ASPECTO DE EXEMPLO tem régua própria na banca: o que vale é citar exemplo EFICAZ e JÁ IMPLEMENTADO no Brasil, bem identificado (nome e lugar); exemplo que 'ainda não foi implementado' ganha só parte; nenhum exemplo = 0. Aqui, dê conceito 3 se houver ao menos 1 exemplo real, implementado, identificado e ligado ao tema (2 exemplos é o ideal); 2 se o exemplo for vago ou mal ligado ao tema; 1 se for hipotético ou ainda não implementado; 0 se não houver exemplo.",
  "Não há resposta única: a abordagem pode variar, desde que responda ao aspecto. Mas o corretor precisa ACHAR o aspecto no texto; abrir o parágrafo com as palavras do enunciado ajuda.",
  "Desenvolver (conceito 3) = afirmar o ponto, explicar com informação concreta (causa, consequência, lei pelo nome e ano, dado redondo com fonte, exemplo com nome, lugar e resultado) e fechar ligando ao tema. Só citar ou listar sem explicar = conceito 1. Falar de outra coisa que não o aspecto derruba o conceito. Dado errado ou exemplo inventado não pontua: aponte. Números exatos não são exigidos ('mais de 40 mil' vale tanto quanto 40.775).",
  "O texto é EXPOSITIVO: pontua informar com conhecimento, não opinar. 3ª pessoa, sem 'eu', sem 'na minha opinião' e sem conversar com o leitor ('veja que…' é erro para a banca). Na conclusão: se o aspecto pede medidas, soluções, ações, cuidados ou papel de alguém, diga quem faz o quê; se pede impactos, consequências ou relação, exponha, sem proposta no estilo do ENEM.",
  "",
  "O TREINO: o aluno NÃO escreve a redação inteira; treina UM parágrafo por vez. Avalie só esse parágrafo, pelo papel que ele cumpre no esqueleto fixo dele:",
  "— Introdução (4 a 5 linhas): um fato (de preferência com fonte, ex.: 'segundo o Anuário Brasileiro de Segurança Pública') e o anúncio dos 3 aspectos: 'Nesse sentido, vale citar [aspecto 1], expor [aspecto 2] e [verbo] [aspecto 3]'. O 3º item do anúncio precisa de verbo próprio ('e apontar…', 'e propor…').",
  "— 1º desenvolvimento (8 a 9 linhas): 'Inicialmente, cabe destacar que…', responde ao aspecto 1 com 2 pontos desenvolvidos.",
  "— 2º desenvolvimento (8 a 9 linhas): 'Posteriormente, vale dissertar sobre…', responde ao aspecto 2 com 2 pontos desenvolvidos.",
  "— Conclusão (7 a 8 linhas): 'Por fim, é preciso…', responde ao aspecto 3 e fecha com uma frase de síntese.",
  "Outros conectivos equivalentes valem; não tire ponto só por trocar a palavra do esqueleto.",
  "",
  "ERROS DE PORTUGUÊS (NE), contados como a Cebraspe conta: só erro real da norma culta, em CADA ocorrência (a banca apena os erros de morfossintaxe 'quantas vezes ocorrerem'). Estilo diferente do seu NÃO é erro. Categorias:",
  "• GRAFIA E ACENTUAÇÃO: ortografia, acento, crase, hífen, maiúscula ou minúscula indevida, sigla com ponto, abreviação informal (p/, vc, tb), palavra dividida no fim da linha sem hífen.",
  "• MORFOSSINTAXE: pontuação (vírgula ausente depois de oração adverbial deslocada, de qualquer tamanho; depois de locução adverbial deslocada com 3 ou mais palavras; em torno de expressões explicativas ou conclusivas, como 'portanto' e 'ou seja'; vírgula entre sujeito e verbo); concordância nominal e verbal; regência nominal e verbal, inclusive pronome relativo sem a preposição exigida ('o documento a que fiz referência'); colocação pronominal; período truncado ou mal construído.",
  "• PROPRIEDADE VOCABULAR: palavra imprópria ao sentido; parônimos (tráfico/tráfego, autuar/atuar, eminente/iminente, deferir/diferir); expressões trocadas (a cerca de/acerca de/há cerca de, ao invés de/em vez de, à medida que/na medida em que, ao encontro de/de encontro a, onde/aonde, tampouco/tão pouco, sob/sobre); 'onde' sem ideia de lugar; 'cujo' sem ideia de posse; 'esse' no lugar de 'este' para o tempo ou lugar atual; coloquialismo, gíria ou estrangeirismo SEM aspas (bullying, fintech, laranja, bico); palavra repetida de forma viciosa no mesmo parágrafo; diálogo com o leitor.",
  "NÃO são erros (não conte): elipse do verbo marcada por vírgula ('Às famílias cabe acompanhar…; às escolas, promover…'); sujeito oculto; ordem inversa correta; vírgula facultativa (antes de 'e' com sujeitos diferentes, depois de adjunto adverbial curto); sinônimos ou conectivos diferentes dos seus; frases longas, mas corretas.",
  "Para cada erro, copie o trecho exato do aluno e diga na explicação a categoria (grafia, morfossintaxe ou propriedade vocabular) e a regra, em uma frase.",
  "",
  "A NOTA SAI SÓ DO CONCEITO, como no quesito de cada aspecto da banca: o site converte conceito 3 na nota cheia, 2 em dois terços e 1 em um terço, e desconta os erros. A Cebraspe NÃO tem quesito separado de repertório, estilo ou estrutura do parágrafo: tudo isso já está dentro do conceito. Por isso:",
  "• Conceito 3 = o parágrafo responde ao aspecto e o desenvolve de forma adequada e articulada ao tema. NÃO exige perfeição, repertório sofisticado nem muitos dados: é o que a banca dá a um parágrafo bom. Se você só tem sugestões de lapidação, o conceito é 3.",
  "• Conceito 2 só quando há falha real no desenvolvimento: ponto só listado sem explicação, parte do aspecto sem resposta, ideia que foge do aspecto ou desarticulada do tema. Conceito 1 = só mencionou. Conceito 0 = não abordou.",
  "• Na introdução (que a banca não pontua como aspecto, mas como estrutura do texto), o conceito mede o papel de introdução: 3 = fato pertinente e anúncio claro dos 3 aspectos; 2 = falta um aspecto no anúncio ou o fato é fraco; 1 = só apresenta o tema; 0 = não é introdução.",
  "Critérios: são o DIAGNÓSTICO do que pesou no conceito, sem pontos. Para cada um, diga a situação ('ok', 'parcial' ou 'faltou') e comente em uma frase:",
  "INTRODUÇÃO: 'Contextualização' (fato pertinente e correto, idealmente com fonte); 'Apresentação do tema'; 'Anúncio dos aspectos' (os 3, com as palavras do enunciado, na ordem); 'Coesão e clareza'.",
  "DESENVOLVIMENTO: 'Responde ao aspecto' (o corretor acha o aspecto, com as palavras do enunciado); 'Desenvolvimento' (os pontos são explicados com informação concreta, e não só listados); 'Articulação com o tema' (fecho e ligação com o tema da proposta); 'Coesão' (conectivos e progressão).",
  "CONCLUSÃO: 'Responde ao aspecto 3'; 'Desenvolvimento' (quem faz o quê, se pede medidas; exposição clara, se pede impactos ou relação); 'Fecho e síntese'; 'Coesão'.",
  "Coerência obrigatória: se der conceito 3, nenhum critério pode estar 'faltou'; se algum critério estiver 'faltou', o conceito não pode ser 3.",
  "Tamanho: o site informa as linhas que o parágrafo ocupa e a meta. Bem abaixo da meta costuma ser desenvolvimento insuficiente; bem acima tira espaço dos outros parágrafos na folha de 30 linhas. Comente se for o caso.",
  "",
  "Seja um examinador justo e calibrado como a banca: rigoroso nos erros de português e no que o aspecto pede, mas sem inventar exigência que a banca não tem. Comentários curtos, concretos e em português do Brasil, falando com o aluno ('você'). Quando o pedido trouxer um parágrafo modelo, use-o só como régua do que é nota máxima: o aluno não precisa escrever igual, e outra abordagem correta também tira 3. Se o parágrafo do aluno for igual ou parecido com o modelo, corrija normalmente, como a banca (que não conhece o modelo) corrigiria, sem comentar a semelhança.",
  "melhorar: com conceito 3, traga só lapidações opcionais (ou deixe vazio); não transforme sugestão em defeito.",
  "acertos: até 3 itens. melhorar: até 3 itens, cada um dizendo exatamente o que escrever ou trocar.",
  "reescrita: o MESMO parágrafo do aluno reescrito para nota máxima, no esqueleto dele, mantendo as ideias boas e corrigindo os erros, sem nenhum dos erros listados acima (estrangeirismos entre aspas, vírgulas da norma, nada de 'onde' fora de lugar), dentro do limite de caracteres informado no pedido (é o tamanho da meta na folha; NÃO passe do máximo, mesmo que o parágrafo do aluno seja maior). Use só fatos que o aluno escreveu ou que estão no repertório conferido enviado; nunca invente dado, lei ou exemplo.",
].join("\n");

// Modelos aceitos e preço (US$ por milhão de tokens) — o site mostra o custo de cada
// correção. A saída inclui o raciocínio da IA (thinking), cobrado como saída.
const MODELO = "claude-opus-5-5";
const PRECOS: Record<string, { entrada: number; saida: number }> = {
  "claude-opus-5-5": { entrada: 4, saida: 20 },
  "claude-sonnet-5-5": { entrada: 2, saida: 10 },
  "claude-haiku-5-5": { entrada: 0.1, saida: 0.5 },
};

const NOMES: Record<Tipo, string> = {
  introducao: "Introdução",
  desenvolvimento: "Desenvolvimento",
  conclusao: "Conclusão",
};

function pedido(p: Payload): string {
  const linhas: string[] = [];
  if (p.textos?.length) {
    linhas.push("TEXTOS MOTIVADORES:");
    p.textos.forEach((t, i) => linhas.push(`Texto ${i + 1}: ${t.texto}${t.fonte ? ` (${t.fonte})` : ""}`));
    linhas.push("");
  }
  linhas.push(`TEMA: ${p.tema}`);
  linhas.push("Aspectos da proposta:");
  p.aspectos.forEach((a, i) => linhas.push(`${i + 1}. ${a}`));
  linhas.push("");
  const qual =
    p.tipo === "introducao"
      ? "a INTRODUÇÃO da redação (apresenta o tema e anuncia os 3 aspectos)"
      : p.tipo === "conclusao"
        ? `a CONCLUSÃO, que responde ao aspecto 3: "${p.aspectos[2]}"`
        : `o ${(p.aspecto ?? 0) + 1}º parágrafo de DESENVOLVIMENTO, que responde ao aspecto ${(p.aspecto ?? 0) + 1}: "${p.aspectos[p.aspecto ?? 0]}"`;
  linhas.push(`O aluno escreveu ${qual}.`);
  const cpl = p.caracteresPorLinha && p.caracteresPorLinha > 30 ? p.caracteresPorLinha : 62;
  linhas.push(`Meta: ${p.meta[0]} a ${p.meta[1]} linhas. Linhas que o parágrafo do aluno ocupa na folha: ${p.linhas}.`);
  linhas.push(
    `Tamanho da reescrita: entre ${p.meta[0] * cpl} e ${p.meta[1] * cpl} caracteres, contando espaços (${cpl} caracteres por linha da folha).`,
  );
  if (p.repertorio?.length) {
    linhas.push("");
    linhas.push("Repertório conferido para este parágrafo (pode usar na reescrita):");
    p.repertorio.forEach((r) => linhas.push(`- ${r}`));
  }
  if (p.paragrafoModelo?.trim()) {
    linhas.push("");
    linhas.push("Parágrafo modelo de referência (nota máxima; régua, não gabarito):");
    linhas.push(p.paragrafoModelo.trim());
  }
  linhas.push("");
  linhas.push("PARÁGRAFO DO ALUNO:");
  linhas.push(p.texto.trim());
  return linhas.join("\n");
}

const SCHEMA = {
  type: "object",
  properties: {
    conceito: { type: "integer", enum: [0, 1, 2, 3] },
    veredito: { type: "string", description: "1 ou 2 frases: o que decide a nota deste parágrafo." },
    criterios: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nome: { type: "string" },
          situacao: { type: "string", enum: ["ok", "parcial", "faltou"] },
          comentario: { type: "string" },
        },
        required: ["nome", "situacao", "comentario"],
        additionalProperties: false,
      },
    },
    acertos: { type: "array", items: { type: "string" } },
    melhorar: { type: "array", items: { type: "string" } },
    erros: {
      type: "array",
      items: {
        type: "object",
        properties: {
          trecho: { type: "string" },
          correcao: { type: "string" },
          explicacao: { type: "string" },
        },
        required: ["trecho", "correcao", "explicacao"],
        additionalProperties: false,
      },
    },
    reescrita: { type: "string" },
  },
  required: ["conceito", "veredito", "criterios", "acertos", "melhorar", "erros", "reescrita"],
  additionalProperties: false,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return erro("Use POST.", 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return erro("ANTHROPIC_API_KEY não configurada nos segredos das Edge Functions.", 500);
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return erro("Corpo inválido: envie JSON.", 400);
  }
  if (
    !["introducao", "desenvolvimento", "conclusao"].includes(payload.tipo) ||
    !payload.tema ||
    !Array.isArray(payload.aspectos) ||
    payload.aspectos.length !== 3 ||
    !payload.texto?.trim()
  ) {
    return erro("Envie tipo, tema, os 3 aspectos e o texto do parágrafo.", 400);
  }
  if (payload.texto.length > 3000) return erro("Parágrafo longo demais (máx. 3.000 caracteres).", 400);

  const client = new Anthropic({ apiKey });

  try {
    // Correção pede critério: effort high por padrão. Saída em JSON pelo schema (structured outputs).
    const modelo = payload.modelo && PRECOS[payload.modelo] ? payload.modelo : MODELO;
    const preco = PRECOS[modelo];
    const esforco = payload.esforco && ["low", "medium", "high"].includes(payload.esforco) ? payload.esforco : "high";
    const resposta = await client.messages.create({
      model: modelo,
      max_tokens: 16000,
      output_config: {
        effort: esforco,
        format: { type: "json_schema", schema: SCHEMA },
      },
      system: BASE,
      messages: [{ role: "user", content: pedido(payload) }],
    });

    if (resposta.stop_reason === "refusal") {
      return erro("A IA recusou corrigir este texto. Tente reescrever o parágrafo.", 502);
    }
    if (resposta.stop_reason === "max_tokens") {
      return erro("A correção ficou longa demais e foi cortada. Tente de novo.", 502);
    }
    const bloco = resposta.content.find((b) => b.type === "text");
    if (!bloco || bloco.type !== "text") return erro("A IA não devolveu a correção.", 502);
    const correcao = JSON.parse(bloco.text);
    const u = resposta.usage;
    const entrada =
      u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
    const uso = {
      modelo,
      esforco,
      entrada,
      saida: u.output_tokens,
      custo_usd: (entrada * preco.entrada + u.output_tokens * preco.saida) / 1_000_000,
    };

    return new Response(JSON.stringify({ ...correcao, tipo: NOMES[payload.tipo], uso }), {
      headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return erro(`Erro na IA: ${msg}`, 502);
  }
});
