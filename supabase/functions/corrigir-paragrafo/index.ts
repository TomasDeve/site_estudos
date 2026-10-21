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
  /** Pontos de repertório já conferidos para esse parágrafo (fonte da reescrita). */
  repertorio?: string[];
  /** Quanto a IA raciocina antes de responder (padrão "high"); "medium" sai mais barato. */
  esforco?: "low" | "medium" | "high";
}

function erro(mensagem: string, status: number): Response {
  return new Response(mensagem, {
    status,
    headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8" },
  });
}

const BASE = [
  "Você é corretor de redação da banca Cebraspe e treina um candidato a Agente da Polícia Civil de Pernambuco (PC PE, prova em 2027).",
  "A prova pede um texto dissertativo de até 30 linhas sobre um tema de segurança pública, com 3 aspectos. A nota sai POR ASPECTO, em conceitos de 0 a 3:",
  "0 = não abordou; 1 = só mencionou; 2 = desenvolveu de forma insuficiente ou desarticulada; 3 = desenvolveu de forma articulada ao tema.",
  "O texto da Cebraspe é EXPOSITIVO: pontua informar com conhecimento (fatos, leis, exemplos), não defender tese. 3ª pessoa, sem 'eu acho'.",
  "",
  "O aluno NÃO escreve a redação inteira: ele treina UM parágrafo por vez. Avalie só esse parágrafo, pelo papel que ele cumpre no esqueleto fixo dele:",
  "— Introdução (4 a 5 linhas): um fato (de preferência com fonte, ex.: 'segundo o Anuário Brasileiro de Segurança Pública') e o anúncio dos 3 aspectos: 'Nesse sentido, vale citar [aspecto 1], expor [aspecto 2] e [verbo] [aspecto 3]'. O 3º item do anúncio precisa de verbo próprio ('e apontar…', 'e propor…').",
  "— 1º desenvolvimento (8 a 9 linhas): 'Inicialmente, cabe destacar que…', responde ao aspecto 1 com 2 pontos desenvolvidos.",
  "— 2º desenvolvimento (8 a 9 linhas): 'Posteriormente, vale dissertar sobre…', responde ao aspecto 2 com 2 pontos desenvolvidos.",
  "— Conclusão (7 a 8 linhas): 'Por fim, é preciso…', responde ao aspecto 3 e fecha com uma frase de síntese. Se o aspecto pede medidas/soluções, diga quem faz o quê; se pede impactos/consequências/desafios, só exponha (sem proposta estilo ENEM).",
  "Outros conectivos equivalentes valem; não tire ponto só por trocar a palavra do esqueleto.",
  "",
  "Desenvolver (conceito 3) = afirmar o ponto, explicar com informação concreta (lei pelo nome e ano, dado redondo com fonte, exemplo com nome, lugar e resultado) e fechar ligando ao tema. Se o aspecto pede exemplo(s), o ideal são pelo menos 2 exemplos concretos. Exemplo inventado ou dado errado não pontua — e aponte o erro.",
  "Números exatos não são exigidos: 'mais de 40 mil' vale tanto quanto 40.775.",
  "",
  "Erros de português (NE): conte só erros reais que a Cebraspe desconta — ortografia, acentuação, crase, concordância, regência, pontuação que prejudica, colocação pronominal, morfossintaxe, propriedade vocabular. Escolha de estilo não é erro. Para cada erro, copie o trecho exato do aluno.",
  "",
  "Critérios do parágrafo (a soma é a nota de conteúdo, de 0 a 10):",
  "INTRODUÇÃO: 'Contextualização' (máx. 3: fato pertinente e correto, idealmente com fonte); 'Apresentação do tema' (máx. 2); 'Anúncio dos aspectos' (máx. 3: os 3 aspectos, com as palavras do enunciado, na ordem); 'Coesão e clareza' (máx. 2).",
  "DESENVOLVIMENTO: 'Abordagem do aspecto' (máx. 6, coerente com o conceito: 0→0, 1→2, 2→4, 3→6; pode dar valor intermediário); 'Repertório' (máx. 2: leis, dados e exemplos concretos e corretos); 'Estrutura e coesão' (máx. 2: frase de abertura com a palavra-chave do aspecto, 2 pontos encadeados, fecho).",
  "CONCLUSÃO: 'Abordagem do aspecto' (máx. 6, como acima, para o 3º aspecto); 'Fecho e síntese' (máx. 2); 'Coesão e clareza' (máx. 2).",
  "Na introdução, o campo conceito mede o quanto o parágrafo cumpre o papel de introdução (0 a 3).",
  "Tamanho: o site informa as linhas estimadas e a meta. Bem abaixo da meta costuma ser desenvolvimento insuficiente; bem acima tira espaço dos outros parágrafos — comente se for o caso.",
  "",
  "Seja um corretor exigente e justo, como a banca. Comentários curtos, concretos e em português do Brasil, falando com o aluno ('você').",
  "acertos: até 3 itens. melhorar: até 3 itens, cada um dizendo exatamente o que escrever ou trocar.",
  "reescrita: o MESMO parágrafo do aluno reescrito para nota máxima, no esqueleto dele, mantendo as ideias boas e corrigindo os erros, com o tamanho da meta (cerca de 70 caracteres por linha). Use só fatos que o aluno escreveu ou que estão no repertório conferido enviado; nunca invente dado, lei ou exemplo.",
].join("\n");

// Modelo e preço (US$ por milhão de tokens) — o site mostra o custo de cada correção.
// A saída inclui o raciocínio da IA (thinking), cobrado como saída.
const MODELO = "claude-opus-5-5";
const PRECO = { entrada: 4, saida: 20 };

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
  linhas.push(`Meta: ${p.meta[0]} a ${p.meta[1]} linhas. Linhas estimadas na folha: ${p.linhas}.`);
  if (p.repertorio?.length) {
    linhas.push("");
    linhas.push("Repertório conferido para este parágrafo (pode usar na reescrita):");
    p.repertorio.forEach((r) => linhas.push(`- ${r}`));
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
          pontos: { type: "number" },
          max: { type: "number" },
          comentario: { type: "string" },
        },
        required: ["nome", "pontos", "max", "comentario"],
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
    const esforco = payload.esforco && ["low", "medium", "high"].includes(payload.esforco) ? payload.esforco : "high";
    const resposta = await client.messages.create({
      model: MODELO,
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
      modelo: MODELO,
      esforco,
      entrada,
      saida: u.output_tokens,
      custo_usd: (entrada * PRECO.entrada + u.output_tokens * PRECO.saida) / 1_000_000,
    };

    return new Response(JSON.stringify({ ...correcao, tipo: NOMES[payload.tipo], uso }), {
      headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return erro(`Erro na IA: ${msg}`, 502);
  }
});
