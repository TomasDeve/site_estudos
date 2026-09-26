#!/usr/bin/env node
// ============================================================================
// Rotação de ângulos — Anki / PCPE
// ----------------------------------------------------------------------------
// Gira, por NÚCLEO (premissas que compartilham o mesmo data-real), qual ângulo
// fica visível: esconde o card ativo e mostra o PRÓXIMO da fila (A→B→C→A...),
// CARREGANDO o agendamento (SRS) pro card novo — então o intervalo continua
// crescendo e você nunca vê a mesma frase duas vezes seguidas.
//
// - NÃO usa IA. Fala só com o Anki (AnkiConnect). Custo em tokens = ZERO.
// - Genérico: descobre tudo lendo o Anki (modelo "Resumo Universal (Devv)" +
//   agrupamento por data-real). Caderno/premissa novos aparecem sozinhos.
// - Cadernos de QUESTÕES são PULADOS (lá você quer a questão real fixa).
// - Núcleo ainda "cheio" (com 2+ ativos) é ENXUGADO pra 1 no 1º encontro.
// - Tudo reversível: só suspende/reexibe, nada é apagado.
//
// USO:
//   node anki-rotacao.mjs                      -> menu interativo
//   node anki-rotacao.mjs --list               -> só lista os cadernos e sai
//   node anki-rotacao.mjs --materias=2,4 --escopo=hoje        -> pré-seleção (dry)
//   node anki-rotacao.mjs --materias=todos --escopo=todos --aplicar  -> aplica
// Flags: --escopo=hoje|todos (padrão hoje) · --dry (padrão) · --aplicar
// ============================================================================

import readline from "node:readline";

const MODEL = "Resumo Universal (Devv)";
const RAIZ = "PCPE";
const AC_URL = "http://localhost:8765";

// ---------- AnkiConnect ----------
async function AC(action, params = {}) {
  let r;
  try {
    r = await fetch(AC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: Buffer.from(JSON.stringify({ action, version: 6, params }), "utf-8"),
    });
  } catch (e) {
    throw new Error("Não consegui falar com o Anki. Ele está aberto? (AnkiConnect em " + AC_URL + ")");
  }
  const j = await r.json();
  if (j.error) throw new Error(action + ": " + j.error);
  return j.result;
}

// ---------- args ----------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
  })
);
const APLICAR = !!args.aplicar && !args.dry;

// ---------- helpers ----------
const reReal = /data-real="([^"]+)"/;
const reGab = /data-gab="([CE])"/;
const materiaDe = (deck) => (deck.split("::")[1] || "(raiz)");
const limpaNome = (s) => s.replace(/^\d+\s*-\s*/, "").replace(/^NO[ÇC][ÕO]ES DE\s+/i, "").trim();
const ask = (rl, q) => new Promise((res) => rl.question(q, res));

// ---------- carrega o universo (só leitura) ----------
async function carregar() {
  await AC("version"); // valida conexão
  const cards = await AC("findCards", { query: `deck:"${RAIZ}::*" note:"${MODEL}"` });
  if (!cards.length) throw new Error(`Nenhum card do modelo "${MODEL}" em ${RAIZ}.`);
  const info = await AC("cardsInfo", { cards });
  const dueSet = new Set(await AC("findCards", { query: `deck:"${RAIZ}::*" note:"${MODEL}" is:due` }));
  const notes = await AC("notesInfo", { notes: [...new Set(info.map((c) => c.note))] });
  const noteById = {};
  for (const n of notes) noteById[n.noteId] = n;

  // monta cada card com núcleo/gab/matéria
  const grupos = {}; // key note||nucleo -> {materia, deck, cards:[...]}
  for (const c of info) {
    if (/QUEST[ÕO]ES/i.test(c.deckName)) continue; // pula QUESTÕES
    const n = noteById[c.note];
    const fld = n.fields["Pergunta " + (c.ord + 1)];
    const html = fld ? fld.value : "";
    const mReal = html.match(reReal);
    if (!mReal) continue; // sem núcleo -> não é premissa C/E rotacionável
    const key = c.note + "||" + mReal[1];
    (grupos[key] ||= { materia: materiaDe(c.deckName), deck: c.deckName, cards: [] }).cards.push({
      cid: c.cardId,
      ord: c.ord,
      gab: (html.match(reGab) || [])[1] || "?",
      susp: c.queue === -1,
      due: dueSet.has(c.cardId),
      // agendamento (cardsInfo usa "interval"; a chave de escrita é "ivl")
      type: c.type, queue: c.queue, dueVal: c.due, ivl: c.interval,
      factor: c.factor, reps: c.reps, lapses: c.lapses, left: c.left,
    });
  }
  return grupos;
}

// ---------- agrega por matéria ----------
function porMateria(grupos) {
  const mat = {};
  for (const g of Object.values(grupos)) {
    const m = (mat[g.materia] ||= { materia: g.materia, nucleos: 0, dueNucleos: 0, cheios: 0 });
    m.nucleos++;
    const ativos = g.cards.filter((c) => !c.susp);
    if (ativos.some((c) => c.due)) m.dueNucleos++;
    if (ativos.length > 1) m.cheios++;
  }
  return Object.values(mat).sort((a, b) => a.materia.localeCompare(b.materia, "pt"));
}

// ---------- monta o plano ----------
function planejar(grupos, materiasSel, soHoje) {
  const rotacoes = []; // {A, B}
  const enxugar = []; // cids a suspender (1º enxugo)
  let pulados = 0;
  for (const g of Object.values(grupos)) {
    if (!materiasSel.has(g.materia)) continue;
    const ativos = g.cards.filter((c) => !c.susp);
    if (soHoje && !ativos.some((c) => c.due)) continue; // filtro "vencem hoje"
    if (ativos.length === 0) { pulados++; continue; }
    if (ativos.length > 1) {
      // ENXUGAR: mantém o melhor (due > C > menor ord), suspende o resto
      const keeper = ativos.slice().sort((a, b) =>
        (b.due - a.due) || ((b.gab === "C") - (a.gab === "C")) || (a.ord - b.ord))[0];
      for (const c of ativos) if (c.cid !== keeper.cid) enxugar.push(c.cid);
      continue;
    }
    // ROTACIONAR: 1 ativo -> mostra o próximo da fila
    const ordenados = g.cards.slice().sort((a, b) => a.ord - b.ord);
    if (ordenados.length < 2) { pulados++; continue; } // só 1 ângulo, nada a girar
    const A = ativos[0];
    const idx = ordenados.findIndex((c) => c.cid === A.cid);
    const B = ordenados[(idx + 1) % ordenados.length];
    rotacoes.push({ A, B, materia: g.materia });
  }
  return { rotacoes, enxugar, pulados };
}

// ---------- aplica (muta o Anki) ----------
async function aplicar({ rotacoes, enxugar }) {
  // 1) reexibe os cards que vão aparecer (B)
  const bIds = rotacoes.map((r) => r.B.cid);
  if (bIds.length) await AC("unsuspend", { cards: bIds });

  // 2) copia o agendamento de A -> B (SRS herdado), em um multi
  const setActions = [];
  const consertarDue = [];
  for (const { A, B } of rotacoes) {
    // "due" é dia-número (review, centenas/milhares) ou timestamp (aprendizado, ~1e9);
    // só é insano o negativo/absurdo (bug de deck filtrado, ex.: -99800).
    const dueSano = A.dueVal >= -30 && A.dueVal < 1e11;
    const factor = A.factor && A.factor >= 1300 ? A.factor : 2500;
    setActions.push({
      action: "setSpecificValueOfCard",
      params: {
        card: B.cid,
        keys: ["type", "queue", "due", "ivl", "factor", "reps", "lapses", "left"],
        newValues: [A.type, A.queue, dueSano ? A.dueVal : 0, A.ivl, factor, A.reps, A.lapses, A.left],
        warning_check: true,
      },
    });
    if (!dueSano) consertarDue.push(B.cid); // due bugado (deck filtrado) -> conserta p/ hoje
  }
  if (setActions.length) await AC("multi", { actions: setActions });
  if (consertarDue.length) await AC("setDueDate", { cards: consertarDue, days: "0" });

  // 3) esconde os antigos (A) + os que sobraram do enxugo
  const suspender = rotacoes.map((r) => r.A.cid).concat(enxugar);
  if (suspender.length) await AC("suspend", { cards: suspender });

  return { girados: rotacoes.length, enxugados: enxugar.length };
}

// ---------- impressão do menu ----------
function imprimeMenu(mats) {
  console.log(`\n=== Rotação de ângulos — ${RAIZ} ===`);
  console.log("Escolha os cadernos (números por vírgula), ou:  todos  |  hoje (só os que vencem hoje)\n");
  mats.forEach((m, i) => {
    const cheios = m.cheios ? ` · ${m.cheios} p/ enxugar` : "";
    console.log(
      ` ${String(i + 1).padStart(2)}) ${limpaNome(m.materia).padEnd(34)} ` +
      `(${m.nucleos} núcleos · ${m.dueNucleos} vencem hoje${cheios})`
    );
  });
}

// ---------- resumo do plano ----------
function imprimePlano(plano, soHoje) {
  const porMat = {};
  for (const r of plano.rotacoes) porMat[r.materia] = (porMat[r.materia] || 0) + 1;
  console.log(`\n--- Plano (${soHoje ? "só os que vencem hoje" : "todos os núcleos"}) ---`);
  for (const m of Object.keys(porMat).sort((a, b) => a.localeCompare(b, "pt")))
    console.log(`  ↻ ${limpaNome(m).padEnd(34)} ${porMat[m]} núcleos girados`);
  console.log(`  girar: ${plano.rotacoes.length} núcleos | enxugar (1ª vez): ${plano.enxugar.length} premissas | pular: ${plano.pulados} núcleos`);
}

// ============================ MAIN ============================
(async () => {
  let grupos;
  try {
    grupos = await carregar();
  } catch (e) {
    console.error("\n⛔ " + e.message + "\n");
    process.exit(1);
  }
  const mats = porMateria(grupos);

  if (args.list) {
    if (args.json) {
      console.log(JSON.stringify(mats.map((m, i) => ({
        i: i + 1, nome: limpaNome(m.materia), materia: m.materia,
        nucleos: m.nucleos, due: m.dueNucleos, cheios: m.cheios,
      }))));
      return;
    }
    imprimeMenu(mats); console.log(); return;
  }

  // ----- seleção de matérias e escopo -----
  let selNums, escopoArg = (args.escopo || "").toString().toLowerCase();
  const interativo = args.materias === undefined;
  let rl;
  if (interativo) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    imprimeMenu(mats);
    selNums = (await ask(rl, "\n> ")).trim();
  } else {
    selNums = args.materias.toString().trim();
  }

  // resolve a seleção -> conjunto de matérias + soHoje
  let soHoje = escopoArg === "hoje";
  let materiasSel;
  const low = selNums.toLowerCase();
  if (low === "todos") {
    materiasSel = new Set(mats.map((m) => m.materia));
    if (!escopoArg) soHoje = false;
  } else if (low === "hoje") {
    materiasSel = new Set(mats.filter((m) => m.dueNucleos > 0).map((m) => m.materia));
    soHoje = true;
  } else {
    const idxs = selNums.split(/[,\s]+/).map((x) => parseInt(x, 10) - 1).filter((i) => i >= 0 && i < mats.length);
    materiasSel = new Set(idxs.map((i) => mats[i].materia));
    if (!escopoArg && interativo) {
      const resp = (await ask(rl, "\nGirar [t]odos os núcleos desses ou só os que [v]encem hoje? (t/v) ")).trim().toLowerCase();
      soHoje = resp !== "t"; // padrão: só hoje
    } else if (!escopoArg) {
      soHoje = true;
    }
  }

  if (!materiasSel.size) {
    console.log("\nNenhum caderno selecionado. Nada a fazer.\n");
    if (rl) rl.close();
    return;
  }

  const plano = planejar(grupos, materiasSel, soHoje);
  imprimePlano(plano, soHoje);

  if (plano.rotacoes.length === 0 && plano.enxugar.length === 0) {
    console.log("\nNada para girar/enxugar nesse recorte.\n");
    if (rl) rl.close();
    return;
  }

  // ----- aplicar? -----
  let vai = APLICAR;
  if (interativo) {
    const c = (await ask(rl, "\nAplicar? (s/n) ")).trim().toLowerCase();
    vai = c === "s" || c === "sim";
  }
  if (rl) rl.close();

  if (!vai) {
    console.log("\n(prévia — nada foi alterado. Rode com --aplicar, ou responda 's', para valer.)\n");
    return;
  }

  const res = await aplicar(plano);
  console.log(`\n✅ Pronto: ${res.girados} núcleos girados (ângulo novo + agenda mantida)` +
    (res.enxugados ? `, ${res.enxugados} premissas enxugadas` : "") + ".");
  console.log("   Reverter é sempre possível no Browse: is:suspended → Toggle Suspend.\n");
})();
