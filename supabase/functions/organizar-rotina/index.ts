// Edge Function "organizar-rotina" — o aluno descreve, em linguagem natural, o que
// quer mudar na Rotina (um horário só ou a rotina inteira) e a IA devolve a rotina
// COMPLETA já reorganizada, mais um resumo do que mudou. Não grava nada: a tela
// mostra a prévia e só salva quando o aluno aplica.
//
// Não é streaming — é uma resposta única em JSON (structured outputs), validada
// aqui antes de voltar pro site. Horários entram e saem em minutos desde 00:00
// (como na tabela rotina_blocos); pra IA eles viram "HH:MM".
//
// Segredo necessário (Dashboard → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY = chave da API da Anthropic (a mesma das outras funções)
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function erro(mensagem: string, status: number): Response {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

const TIPOS = ["sono", "estudo", "intervalo", "academia", "refeicao", "trabalho", "lazer", "outro"] as const;
type Tipo = (typeof TIPOS)[number];

interface BlocoEntrada {
  ref: string;
  tipo: string;
  titulo: string;
  inicio: number;
  fim: number;
}

interface Payload {
  pedido?: string;
  rotina?: BlocoEntrada[];
  /** Pedidos já atendidos nesta conversa (a `rotina` enviada já está com eles). */
  anteriores?: string[];
}

const SYSTEM = [
  "Você organiza a ROTINA DIÁRIA de um estudante de concursos públicos, dentro do site de estudos dele. A rotina é UMA só e vale igual todos os dias (não há variação por dia da semana).",
  "",
  "Cada bloco da rotina tem:",
  "- tipo: sono | estudo | intervalo | academia | refeicao | trabalho | lazer | outro",
  "- titulo: nome curto em português (até uns 40 caracteres). Pode ficar vazio quando o nome do tipo já basta.",
  "- inicio e fim: horário de 24h no formato HH:MM, de preferência em múltiplos de 5 minutos. inicio e fim nunca são iguais. Se o fim for menor que o início, o bloco atravessa a meia-noite (ex.: sono 22:30 → 06:00).",
  "- ref: o identificador do bloco atual de onde ele veio, copiado exatamente; null para bloco novo.",
  "",
  "Você recebe a rotina atual e o pedido do aluno. Devolva a rotina COMPLETA já ajustada: todos os blocos que devem existir depois da mudança. Bloco que não estiver na sua lista será apagado.",
  "",
  "Regras:",
  "- Faça o que o aluno pediu. Pedido pontual (mudar um horário, tirar ou incluir um bloco) → mexa só no necessário e devolva os demais blocos idênticos (mesma ref, título e horários). Pedido amplo (\"reorganiza tudo\", \"monta minha rotina\") → pode refazer à vontade.",
  "- Blocos não se sobrepõem. Se uma mudança empurrar outros blocos, ajuste os vizinhos em cascata e registre isso nas mudanças. Só ponha um bloco dentro de outro se o aluno pedir.",
  "- Um único bloco de sono (o da noite), a não ser que o aluno peça cochilo. A hora de acordar é o fim do sono.",
  "- Mantenha a ref de um bloco que só mudou de horário ou de nome. Ao dividir um bloco em dois, o primeiro fica com a ref e o segundo vai com null.",
  "- Estudo longo sem instrução de como dividir: blocos de até 1h30 com intervalos de 10 a 15 minutos entre eles.",
  "- Pedido vago: escolha o mais razoável e diga a suposição no resumo. Pedido impossível ou que não tem a ver com a rotina: devolva a rotina sem mudanças e explique no resumo.",
  "- Confira as contas antes de responder: durações, totais de horas que o aluno pediu (ex.: \"4h de estudo\") e se nada ficou sobreposto.",
  "",
  "Textos (português do Brasil, sem markdown):",
  "- resumo: 1 ou 2 frases dizendo o que foi feito, com as suposições que você fez.",
  "- mudancas: uma linha curta por mudança, como \"Almoço: 12:00–13:00 → 12:30–13:30\", \"Novo: Leitura 21:00–21:30\" ou \"Removido: Academia\". Lista vazia se nada mudou.",
].join("\n");

const SCHEMA = {
  type: "object",
  properties: {
    resumo: { type: "string" },
    mudancas: { type: "array", items: { type: "string" } },
    blocos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ref: { anyOf: [{ type: "string" }, { type: "null" }] },
          tipo: { type: "string", enum: [...TIPOS] },
          titulo: { type: "string" },
          inicio: { type: "string", description: "HH:MM (24h)" },
          fim: { type: "string", description: "HH:MM (24h)" },
        },
        required: ["ref", "tipo", "titulo", "inicio", "fim"],
        additionalProperties: false,
      },
    },
  },
  required: ["resumo", "mudancas", "blocos"],
  additionalProperties: false,
};

interface Saida {
  resumo: string;
  mudancas: string[];
  blocos: { ref: string | null; tipo: Tipo; titulo: string; inicio: string; fim: string }[];
}

/** 390 → "06:30". */
function hhmm(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "6:30" / "06:30" → 390; "24:00" → 0; inválido → null. */
function minutos(v: string): number | null {
  const m = /^\s*(\d{1,2})[:h](\d{2})\s*$/.exec(v);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (mm > 59 || h > 24 || (h === 24 && mm > 0)) return null;
  return (h * 60 + mm) % 1440;
}

function mensagemDoAluno(p: Payload, rotina: BlocoEntrada[], pedido: string): string {
  const linhas = rotina.length
    ? rotina
        .slice()
        .sort((a, b) => a.inicio - b.inicio)
        .map(
          (b) =>
            `- ref ${b.ref} · ${b.tipo} · "${(b.titulo ?? "").slice(0, 60)}" · ${hhmm(b.inicio)}–${hhmm(b.fim)}`,
        )
    : ["(vazia — o aluno ainda não tem nenhum bloco)"];
  const anteriores = (p.anteriores ?? [])
    .map((a) => a.trim().slice(0, 1000))
    .filter(Boolean)
    .slice(-6);
  return [
    "Rotina atual:",
    ...linhas,
    "",
    ...(anteriores.length
      ? [
          "Pedidos anteriores desta conversa (a rotina acima já está com eles):",
          ...anteriores.map((a) => `- ${a}`),
          "",
        ]
      : []),
    "Pedido do aluno:",
    pedido,
  ].join("\n");
}

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

  const pedido = (payload.pedido ?? "").trim().slice(0, 2000);
  if (pedido.length < 3) return erro("Descreva o que você quer mudar na rotina.", 400);
  if (!Array.isArray(payload.rotina)) return erro("Envie `rotina` (lista de blocos).", 400);

  const rotina = payload.rotina
    .filter(
      (b) =>
        b &&
        typeof b.ref === "string" &&
        Number.isFinite(b.inicio) &&
        Number.isFinite(b.fim),
    )
    .slice(0, 60);
  const refsValidas = new Set(rotina.map((b) => b.ref));

  const client = new Anthropic({ apiKey });

  let resposta: Anthropic.Beta.BetaMessage;
  try {
    // Opus 5.5 com esforço médio: reorganizar horários pede conta certa (somas,
    // cascata, sobreposição). Fallback do servidor: se a IA recusar por engano, a
    // própria API refaz no modelo recomendado.
    resposta = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: mensagemDoAluno(payload, rotina, pedido) }],
    });
  } catch (err) {
    return erro(`A IA não respondeu: ${err instanceof Error ? err.message : String(err)}`, 502);
  }

  if (resposta.stop_reason === "refusal") {
    return erro("A IA recusou esse pedido. Tente descrever de outro jeito.", 422);
  }
  if (resposta.stop_reason === "max_tokens") {
    return erro("A resposta da IA veio cortada. Tente um pedido mais curto.", 502);
  }

  const texto = resposta.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("")
    .trim();
  let saida: Saida;
  try {
    saida = JSON.parse(texto);
  } catch {
    return erro("A IA devolveu uma rotina ilegível. Tente de novo.", 502);
  }

  // Confere tudo antes de devolver: horário válido, tipo conhecido, ref existente.
  const blocos = [];
  for (const b of saida.blocos ?? []) {
    const inicio = minutos(b.inicio);
    const fim = minutos(b.fim);
    if (inicio === null || fim === null || inicio === fim) {
      return erro(`A IA devolveu um horário inválido (${b.inicio}–${b.fim}). Tente de novo.`, 502);
    }
    blocos.push({
      ref: b.ref && refsValidas.has(b.ref) ? b.ref : null,
      tipo: (TIPOS as readonly string[]).includes(b.tipo) ? b.tipo : "outro",
      titulo: (b.titulo ?? "").trim().slice(0, 60),
      inicio,
      fim,
    });
  }

  return new Response(
    JSON.stringify({
      resumo: (saida.resumo ?? "").trim(),
      mudancas: (saida.mudancas ?? []).map((m) => m.trim()).filter(Boolean),
      blocos: blocos.slice(0, 60),
    }),
    {
      headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    },
  );
});
