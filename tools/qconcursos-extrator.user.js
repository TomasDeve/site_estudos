// ==UserScript==
// @name         QConcursos → Banco de Questões (abrir comentários rápido)
// @namespace    meus-estudos.pmal
// @version      2.4.0
// @description  Abre os comentários de TODAS as questões da página de uma vez (em paralelo, rápido) pra você dar Ctrl+A/Ctrl+C e colar no chat da IA. Também abre os "Textos associados" (o enunciado-base escondido no "+") e os inclui no texto limpo. Copia um "texto limpo" pronto. Marca na página as questões que JÁ estão no seu banco (checa no Supabase) e as EXCLUI do texto limpo, pra você não recopiar. Modo "Copiar várias páginas": junta N questões novas (ex.: 100) passando as páginas sozinho e copia tudo no fim. NÃO responde nada nem revela gabarito — quem decide o gabarito pelos comentários é a IA, no chat.
// @match        https://www.qconcursos.com/questoes-de-concursos/questoes*
// @match        https://www.qconcursos.com/questoes-de-concursos/*/questoes*
// @match        https://www.qconcursos.com/questoes-de-concursos/*/questoes
// @run-at       document-idle
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @connect      fotpwillzkvgouvpbqxx.supabase.co
// ==/UserScript==

/*
 * Ideia: o trabalho pesado (ler comentários, decidir gabarito, escrever comentário) é da IA no chat.
 * O script só precisa deixar TODOS os comentários visíveis na página, o mais rápido possível.
 *
 * Como ficou rápido:
 *  - Abre a aba "Comentários" de todas as questões de uma vez (dispara o carregamento em paralelo)
 *    em vez de esperar questão por questão.
 *  - "Carregar mais" é feito em rodadas: a cada rodada clica em todos os botões visíveis de uma vez.
 *
 * Texto associado: várias questões têm um enunciado-base escondido atrás do botão "Texto associado +"
 * (uma passagem pra ler, ou uma imagem). O script abre esses blocos e inclui o texto (e as URLs das
 * imagens) no "texto limpo", como "Texto associado:". Se várias questões compartilham a mesma passagem,
 * o texto é escrito uma vez só e as seguintes viram "(igual ao da Questão N)" — pra não gastar token à toa.
 *
 * Anti-duplicata: ao abrir a página, o script pergunta ao seu banco (Supabase) quais destes IDs já
 * existem e marca cada questão repetida com um selo vermelho "⚠ Já no seu banco". No "Copiar texto limpo"
 * essas repetidas são EXCLUÍDAS — você nunca recopia o que já jogou lá (nem gasta token no chat com elas).
 *
 * Dois caminhos (você escolhe no painel):
 *  - "Abrir comentários": abre tudo e já deixa as questões SELECIONADAS. É só Ctrl+C (ou Ctrl+A) e colar.
 *    (Atenção: este caminho copia a página crua, NÃO filtra as repetidas — pra filtrar, use o texto limpo.)
 *  - "Copiar texto limpo": abre tudo, monta um texto enxuto (metadados + enunciado + alternativas +
 *    comentários), TIRA as que já estão no banco, e copia pro clipboard. É só colar (Ctrl+V). Recomendado.
 *
 * Várias páginas: "Questões novas (meta)" + "Copiar várias páginas" junta as questões novas página a página
 * (clica sozinho em "Próxima página" e retoma na página seguinte — estado no sessionStorage da aba) até
 * bater a meta ou acabar as páginas, e copia TUDO numa vez só, numerado em sequência. "Parar lote" encerra
 * e copia o que já juntou; "Copiar último lote de novo" recopia se o clipboard se perder.
 *
 * Ajuste no painel: "Páginas de comentários" = rodadas de "Carregar mais" (padrão 0 = abre uma vez só) e
 * "Comentários (máx)" = quantos comentários mantém no texto limpo (padrão 5, os mais curtidos). Menos
 * comentário = menos token no chat da IA, sem perder o gabarito (os mais curtidos já cravam).
 */
(function () {
  "use strict";

  const CONFIG = {
    paginasComentarios: 0, // rodadas de "Carregar mais" (0 = abre uma vez só, sem carregar mais)
    maxComentarios: 5,     // no texto limpo, mantém só os N comentários mais curtidos por questão
  };

  // Supabase do site de estudos — só a URL + a chave PUBLICÁVEL (a mesma que já vai no bundle do site,
  // não é segredo). Usada só pra checar quais IDs desta página já estão no seu banco (função
  // qconcursos_filtrar_existentes, que só responde "destes, quais existem" — não devolve sua base).
  const SUPA = {
    url: "https://fotpwillzkvgouvpbqxx.supabase.co",
    anon: "sb_publishable_9Ch3MuUqIwFTjgbogz-2uA_L4jZQpog",
  };
  const existentes = new Set(); // IDs (string) desta página que já estão no banco

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // espera uma condição virar verdadeira (polling) — pra lidar com carregamento assíncrono
  function waitFor(cond, timeout = 4000, interval = 120) {
    return new Promise((res) => {
      const t0 = Date.now();
      (function loop() {
        let ok = false;
        try { ok = cond(); } catch (_) {}
        if (ok || Date.now() - t0 > timeout) return res(ok);
        setTimeout(loop, interval);
      })();
    });
  }

  // "Ano: 2026 Banca: CEBRASPE Órgão: ... Prova: ..." -> objeto
  function parseInfo(t) {
    const grab = (re) => { const m = t.match(re); return m ? m[1].trim() : null; };
    const anoS = grab(/Ano:\s*(\d{4})/i);
    return {
      ano: anoS ? parseInt(anoS, 10) : null,
      banca: grab(/Banca:\s*(.+?)(?:\s+[ÓO]rg[ãa]o:|\s+Prova:|$)/i),
      orgao: grab(/[ÓO]rg[ãa]o:\s*(.+?)(?:\s+Prova:|$)/i),
      prova: grab(/Prova:\s*(.+?)$/i),
      cargo: null,
    };
  }

  function idDaQuestao(item) {
    const belt = item.querySelector('[id^="question-belt-"]');
    if (belt) { const m = belt.id.match(/question-belt-(\d+)/); if (m) return m[1]; }
    const dq = item.querySelector("[data-question-id]");
    return dq ? dq.getAttribute("data-question-id") : null;
  }

  // ---------- Texto associado (enunciado-base do botão "Texto associado +") ----------
  // Estrutura no QConcursos: um link <a class="q-link collapsed" data-toggle="collapse"
  // href="#question-{id}-text"> abre um <div id="question-{id}-text" class="collapse"> com a passagem.
  // O conteúdo normalmente já está no DOM (mesmo colapsado), então dá pra ler direto.

  // Devolve o <div> do texto associado da questão (ou null).
  function boxTextoAssociado(item, qid) {
    if (qid) {
      const byId = document.getElementById("question-" + qid + "-text");
      if (byId) return byId;
    }
    const toggle = item.querySelector('a[data-toggle="collapse"][href^="#question-"][href$="-text"]');
    const href = toggle && toggle.getAttribute("href");
    return href && href.startsWith("#") ? document.querySelector(href) : null;
  }

  // Texto limpo do texto associado (+ URLs de imagens, já que muitas passagens são imagem). null se não houver.
  function lerTextoAssociado(item, qid) {
    const box = boxTextoAssociado(item, qid);
    if (!box) return null;
    let txt = (box.innerText || box.textContent || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const imgs = [...new Set(Array.from(box.querySelectorAll("img")).map((im) => im.src).filter(Boolean))];
    if (imgs.length) {
      const marca = imgs.map((u) => "[imagem: " + u + "]").join("\n");
      txt = txt ? txt + "\n" + marca : marca;
    }
    return txt || null;
  }

  // Abre (clica) os "Textos associados" que estão fechados. Serve pra dois casos:
  //  - garantir o conteúdo mesmo quando ele só carrega ao abrir (sob demanda);
  //  - deixar a passagem visível pro Ctrl+A/Ctrl+C do "Abrir comentários" pegar na cópia crua.
  // O "texto limpo" já lê o DOM direto, então nem depende disto — mas não custa.
  async function expandirTextosAssociados(onStatus) {
    const toggles = Array.from(
      document.querySelectorAll('a[data-toggle="collapse"][href^="#question-"][href$="-text"]')
    );
    const fechados = toggles.filter((t) => t.classList.contains("collapsed")); // Bootstrap: fechado = classe "collapsed"
    if (!fechados.length) return 0;
    if (onStatus) onStatus("Abrindo textos associados… (" + fechados.length + ")");
    fechados.forEach((t) => t.click());
    // espera algum box ganhar conteúdo/ficar visível (cobre carregamento sob demanda)
    await waitFor(() =>
      fechados.some((t) => {
        const href = t.getAttribute("href") || "";
        const box = href.startsWith("#") ? document.querySelector(href) : null;
        return box && (box.textContent || "").trim().length > 0 && box.offsetParent !== null;
      }), 3000
    );
    return fechados.length;
  }

  function extrairQuestao(item) {
    const qid = idDaQuestao(item);
    const infoT = (item.querySelector(".q-question-info")?.innerText || "").replace(/\s+/g, " ").trim();
    const bcRaw = (item.querySelector(".q-question-breadcrumb")?.innerText || "").trim();
    const bcLines = bcRaw.split("\n").map((s) => s.replace(/,\s*$/, "").trim())
      .filter((s) => s && !/^\(\s*\d*\s*assuntos?\s*\)$/i.test(s)); // tira o marcador "( N assuntos)"
    const disciplina = bcLines[0] || null;
    const assunto = bcLines.join(" > ") || null;
    const enunciado = (item.querySelector(".q-question-enunciation")?.innerText || "")
      .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    const isMult = !!item.querySelector(".js-question-is-multiple-choice");
    // Em C/E não há alternativas A–E (o item é julgado Certo/Errado). Em múltipla, a letra vem do value do
    // input; o texto vem do label, tirando só o rótulo "A " (letra + espaço) sem corromper o conteúdo.
    const alternativas = !isMult ? [] : Array.from(item.querySelectorAll(".q-question-options label.js-choose-alternative"))
      .map((l) => ({
        letra: (l.querySelector("input.js-question-answer")?.value || "").trim(),
        texto: (l.innerText || "").replace(/\s+/g, " ").replace(/^[A-E][)\.]?\s+/, "").trim(),
      }))
      .filter((a) => a.texto);
    return {
      fonte_id: qid,
      codigo: qid ? "Q" + qid : null,
      tipo: isMult ? "multipla" : "ce",
      ...parseInfo(infoT),
      disciplina,
      assunto,
      enunciado,
      contexto: lerTextoAssociado(item, qid),
      alternativas,
    };
  }

  // Lê os comentários JÁ carregados de um container (sem carregar mais) — limpa e deduplica.
  function lerComentarios(ct) {
    const limpar = (t) => {
      let s = (t || "").replace(/\s+/g, " ").trim();
      s = s.replace(/^\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4}\s+às\s+\d{1,2}:\d{2}\s*/i, ""); // data repetida no início
      s = s.replace(/\s*Gostei\s*\(\d+\).*$/i, "").replace(/\s*Responder\s*$/i, "").trim(); // rodapé de ações
      return s;
    };
    const vistos = new Set();
    return Array.from(ct.querySelectorAll(".q-question-comment"))
      .map((c) => {
        const likeTxt = c.querySelector(".js-like-comment-btn")?.innerText || "";
        return {
          autor: (c.querySelector(".q-question-comment-user-name")?.innerText || "").trim(),
          data: (c.querySelector(".q-question-comment-date")?.innerText || "").trim(),
          likes: parseInt((likeTxt.match(/\((\d+)\)/) || [])[1] || "0", 10),
          texto: limpar(c.querySelector(".q-question-comment-text, .q-question-comment-body")?.innerText || ""),
        };
      })
      .filter((c) => {
        if (!c.texto) return false;
        const chave = c.autor + "|" + c.texto.slice(0, 60); // dedup dos repetidos do "carregar mais"
        if (vistos.has(chave)) return false;
        vistos.add(chave);
        return true;
      });
  }

  /**
   * O coração da versão rápida: abre a aba de comentários de TODAS as questões de uma vez e
   * carrega N páginas em rodadas paralelas. Não espera questão por questão.
   */
  async function abrirComentarios(maxPaginas, onStatus) {
    const items = Array.from(document.querySelectorAll(".js-question-item"));
    if (!items.length) return { total: 0, comComentarios: 0 };

    // 1) Abre a aba "Comentários" de cada questão (dispara o carregamento de todas em paralelo).
    const containers = [];
    for (const item of items) {
      const qid = idDaQuestao(item);
      if (!qid) continue;
      const link = item.querySelector('a[href="#question-belt-' + qid + '-comments-tab"]');
      if (link) link.click();
      const ct = document.querySelector("#question-belt-" + qid + "-comments-tab");
      if (ct) containers.push(ct);
    }
    if (onStatus) onStatus("Abrindo comentários…");
    // espera a 1ª leva aparecer em pelo menos uma questão (ou o botão de carregar mais surgir)
    await waitFor(() =>
      containers.some((ct) => ct.querySelector(".q-question-comment") || ct.querySelector(".js-load-more-btn"))
    );

    // 2) "Carregar mais" em rodadas: a cada rodada, clica em todos os botões visíveis de uma vez.
    for (let p = 0; p < maxPaginas; p++) {
      const botoes = containers
        .map((ct) => ct.querySelector(".js-load-more-btn"))
        .filter((b) => b && b.offsetParent !== null);
      if (!botoes.length) break;
      if (onStatus) onStatus("Carregando mais comentários… (" + (p + 1) + "/" + maxPaginas + ")");
      const antes = containers.map((ct) => ct.querySelectorAll(".q-question-comment").length);
      botoes.forEach((b) => b.click());
      // segue quando crescer em algum container ou quando não sobrar botão visível
      await waitFor(() =>
        containers.some((ct, i) => ct.querySelectorAll(".q-question-comment").length > antes[i]) ||
        containers.every((ct) => { const b = ct.querySelector(".js-load-more-btn"); return !b || b.offsetParent === null; })
      );
    }

    const comComentarios = containers.filter((ct) => ct.querySelector(".q-question-comment")).length;
    return { total: items.length, comComentarios };
  }

  // Seleciona só a região das questões (com os comentários abertos) — pro Ctrl+C sair limpo,
  // sem o cabeçalho/menu/rodapé do site. O usuário ainda pode dar Ctrl+A pra pegar tudo.
  function selecionarQuestoes() {
    const items = document.querySelectorAll(".js-question-item");
    if (!items.length) return;
    const range = document.createRange();
    range.setStartBefore(items[0]);
    range.setEndAfter(items[items.length - 1]);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Texto enxuto e legível pra colar no chat (independe do Ctrl+A pegar tudo certo).
  // Monta os blocos das questões desta página. Serve pra página única e pro modo "várias páginas":
  //  - numInicial: nº da 1ª questão (continua a numeração entre páginas);
  //  - limite: máx. de questões a pegar desta página (pra parar exato em 100, p.ex.);
  //  - vistosCtx: texto associado -> nº da 1ª questão que o trouxe (objeto, pra persistir entre páginas);
  //  - jaPegos: IDs já capturados em páginas anteriores (não duplica se a lista mexer).
  function montarBlocos({ numInicial = 1, limite = Infinity, vistosCtx = {}, jaPegos = new Set() } = {}) {
    const todos = Array.from(document.querySelectorAll(".js-question-item"));
    // Pula as que já estão no seu banco (não recopiar → não gastar token à toa) e as já pegas antes.
    const novos = todos.filter((item) => {
      const id = String(idDaQuestao(item) || "");
      return !existentes.has(id) && !jaPegos.has(id);
    });
    const puladas = todos.length - novos.length;
    const items = novos.slice(0, limite);
    const ids = [];
    const blocos = items.map((item, idx) => {
      const i = numInicial - 1 + idx;
      if (idDaQuestao(item)) ids.push(String(idDaQuestao(item)));
      const q = extrairQuestao(item);
      const ct = q.fonte_id ? document.querySelector("#question-belt-" + q.fonte_id + "-comments-tab") : null;
      // Mantém só os mais curtidos (os que cravam o gabarito) — enxuga o texto colado no chat.
      const comentarios = (ct ? lerComentarios(ct) : [])
        .slice()
        .sort((a, b) => b.likes - a.likes)
        .slice(0, CONFIG.maxComentarios);
      const L = [];
      L.push("### Questão " + (i + 1) + (q.codigo ? " — " + q.codigo : ""));
      const meta = [q.banca, q.ano, q.orgao, q.prova].filter(Boolean).join(" · ");
      if (meta) L.push(meta);
      if (q.assunto) L.push("Assunto: " + q.assunto);
      L.push("Tipo: " + (q.tipo === "multipla" ? "Múltipla escolha" : "Certo/Errado"));
      if (q.contexto) {
        const chaveCtx = hashTexto(q.contexto);
        const jaVisto = vistosCtx[chaveCtx];
        if (jaVisto) {
          L.push("Texto associado: (igual ao da Questão " + jaVisto + ")");
        } else {
          vistosCtx[chaveCtx] = i + 1;
          L.push("Texto associado:");
          L.push(q.contexto);
        }
      }
      L.push("Enunciado: " + q.enunciado);
      if (q.alternativas.length) {
        L.push("Alternativas:");
        q.alternativas.forEach((a) => L.push("  " + a.letra + ") " + a.texto));
      }
      if (comentarios.length) {
        L.push("Comentários dos colegas (" + comentarios.length + "):");
        comentarios.forEach((c) => L.push("  - [" + c.likes + "❤ · " + c.autor + (c.data ? " · " + c.data : "") + "] " + c.texto));
      } else {
        L.push("Comentários: (nenhum carregado)");
      }
      return L.join("\n");
    });
    return { blocos, ids, puladas, total: todos.length };
  }

  const CAB_IA = "(A IA decide o gabarito pelos comentários; o gabarito NÃO aparece nesta página.)";
  const SEPARADOR = "\n\n──────────\n\n";

  // Texto enxuto e legível pra colar no chat (independe do Ctrl+A pegar tudo certo) — só esta página.
  function montarTextoLimpo() {
    const { blocos, puladas } = montarBlocos();
    const cab =
      "Questões capturadas do QConcursos — " + location.href + "\n" + CAB_IA +
      (puladas ? "\n(" + puladas + " questão(ões) já no banco foram excluídas — só vão as novas.)" : "");
    if (!blocos.length) {
      return cab + "\n\nTodas as questões desta página já estão no seu banco. Nada novo pra colar. 🎉";
    }
    return cab + "\n\n" + blocos.join(SEPARADOR);
  }

  // hash curtinho (djb2) — chave do texto associado sem guardar a passagem inteira no storage
  function hashTexto(t) {
    let h = 5381;
    for (let k = 0; k < t.length; k++) h = ((h << 5) + h + t.charCodeAt(k)) | 0;
    return "h" + (h >>> 0).toString(36) + "_" + t.length;
  }

  // ---------- Modo "várias páginas" (ex.: 100 questões = 5 páginas de 20) ----------
  // O estado vai no sessionStorage (vale só nesta aba e sobrevive à troca de página). A cada página:
  // checa o banco → abre comentários/textos → junta os blocos novos → clica em "Próxima página".
  // Na nova página o script retoma sozinho. Ao bater a meta (ou acabar as páginas) copia TUDO de uma vez.
  const JOB_KEY = "qc-extrator-lote";
  const MAX_PAGINAS_LOTE = 50; // trava de segurança

  function lerJob() {
    try { return JSON.parse(sessionStorage.getItem(JOB_KEY) || "null"); } catch (_) { return null; }
  }
  function salvarJob(job) {
    try { sessionStorage.setItem(JOB_KEY, JSON.stringify(job)); return true; } catch (_) { return false; }
  }
  function apagarJob() {
    try { sessionStorage.removeItem(JOB_KEY); } catch (_) {}
  }

  let pararPedido = false; // botão "Parar lote" — encerra ao fim da página atual

  function linkProximaPagina() {
    const a = document.querySelector("a.q-next[rel='next'], a.q-next");
    if (!a || a.classList.contains("disabled") || a.getAttribute("aria-disabled") === "true") return null;
    const href = a.getAttribute("href");
    return href && href !== "#" ? new URL(href, location.href).href : null;
  }

  function textoDoJob(job) {
    const cab =
      "Questões capturadas do QConcursos — " + job.paginas.length + " página(s), " + job.blocos.length + " questão(ões) nova(s)\n" +
      "Páginas: " + job.paginas.map((p) => p.url).join(" | ") + "\n" + CAB_IA +
      (job.puladas ? "\n(" + job.puladas + " questão(ões) já no banco foram excluídas — só vão as novas.)" : "");
    if (!job.blocos.length) return cab + "\n\nNenhuma questão nova nas páginas percorridas. 🎉";
    return cab + "\n\n" + job.blocos.join(SEPARADOR);
  }

  function finalizarJob(job, motivo, setStatus) {
    apagarJob();
    mostrarParar(false);
    const ok = copiar(textoDoJob(job));
    try { sessionStorage.setItem(JOB_KEY + "-ultimo", JSON.stringify(job)); } catch (_) {} // pra "Copiar de novo"
    setStatus((ok ? "✅ Copiado: " : "⚠️ Não consegui copiar — use \"Copiar último lote\": ") +
      job.blocos.length + " questão(ões) de " + job.paginas.length + " página(s) (" + job.puladas +
      " já no banco, excluídas). " + motivo + " Cole no chat (Ctrl+V).");
  }

  // Processa a página atual dentro do lote e decide: próxima página ou fim.
  async function passoDoJob(job, setStatus) {
    CONFIG.maxComentarios = job.maxComentarios;
    await waitFor(() => document.querySelector(".js-question-item"), 8000);
    const pg = job.paginas.length + 1;
    const pre = "Lote " + job.blocos.length + "/" + job.meta + " · pág. " + pg + " — ";
    const st = (t) => setStatus(pre + t);
    await marcarExistentes(st);
    await abrirComentarios(job.pagsComentarios, st);
    await expandirTextosAssociados(st);
    // espera um tiquinho pros comentários que ainda estão chegando (os mais lentos)
    await sleep(job.esperaMs);
    const falta = job.meta - job.blocos.length;
    const res = montarBlocos({
      numInicial: job.blocos.length + 1,
      limite: falta,
      vistosCtx: job.vistosCtx,
      jaPegos: new Set(job.ids),
    });
    job.blocos.push(...res.blocos);
    job.ids.push(...res.ids);
    job.puladas += existentes.size;
    job.paginas.push({ url: location.href, novas: res.blocos.length });

    if (pararPedido) return finalizarJob(job, "Lote parado por você.", setStatus);
    if (job.blocos.length >= job.meta) return finalizarJob(job, "Meta de " + job.meta + " atingida.", setStatus);
    const prox = linkProximaPagina();
    if (!prox) return finalizarJob(job, "Acabaram as páginas.", setStatus);
    if (job.paginas.length >= MAX_PAGINAS_LOTE) return finalizarJob(job, "Parei no limite de " + MAX_PAGINAS_LOTE + " páginas.", setStatus);
    if (!salvarJob(job)) return finalizarJob(job, "Storage cheio — copiei o que deu.", setStatus);
    setStatus("Lote " + job.blocos.length + "/" + job.meta + " — indo pra página " + (pg + 1) + "…");
    location.href = prox;
  }

  function copiar(texto) {
    try {
      if (typeof GM_setClipboard === "function") { GM_setClipboard(texto, { type: "text", mimetype: "text/plain" }); return true; }
    } catch (_) {}
    if (navigator.clipboard) { navigator.clipboard.writeText(texto).catch(() => {}); return true; }
    return false;
  }

  // ---------- Checagem "já está no meu banco?" ----------
  // POST na função RPC do Supabase. Usa GM_xmlhttpRequest (fura CORS/CSP da página); cai pro fetch se faltar.
  function supaRpc(fn, body) {
    return new Promise((resolve, reject) => {
      const url = SUPA.url + "/rest/v1/rpc/" + fn;
      const headers = { apikey: SUPA.anon, Authorization: "Bearer " + SUPA.anon, "Content-Type": "application/json" };
      const data = JSON.stringify(body);
      if (typeof GM_xmlhttpRequest === "function") {
        GM_xmlhttpRequest({
          method: "POST", url, headers, data,
          onload: (r) => {
            if (r.status < 200 || r.status >= 300) return reject(new Error("HTTP " + r.status));
            try { resolve(JSON.parse(r.responseText)); } catch (e) { reject(e); }
          },
          onerror: () => reject(new Error("erro de rede")),
          ontimeout: () => reject(new Error("timeout")),
        });
      } else {
        fetch(url, { method: "POST", headers, body: data })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
          .then(resolve).catch(reject);
      }
    });
  }

  // Consulta o banco e marca (selo vermelho + contorno) as questões da página que já existem.
  async function marcarExistentes(onStatus) {
    const items = Array.from(document.querySelectorAll(".js-question-item"));
    const ids = [...new Set(items.map(idDaQuestao).filter(Boolean))];
    if (!ids.length) return { total: 0, existentes: 0 };
    if (onStatus) onStatus("Checando quais já estão no seu banco…");
    let res;
    try {
      res = await supaRpc("qconcursos_filtrar_existentes", { ids });
    } catch (e) {
      if (onStatus) onStatus("⚠️ Não consegui checar o banco (" + (e.message || e) + "). Segue sem marcar.");
      return { total: items.length, existentes: 0, erro: true };
    }
    existentes.clear();
    (res || []).forEach((id) => existentes.add(String(id)));
    for (const item of items) {
      const id = String(idDaQuestao(item) || "");
      let selo = item.querySelector(".qc-badge-existe");
      if (id && existentes.has(id)) {
        if (!selo) {
          selo = document.createElement("div");
          selo.className = "qc-badge-existe";
          selo.textContent = "⚠ Já no seu banco (Q" + id + ")";
          selo.style.cssText = "display:inline-block;margin:6px 0;padding:4px 10px;background:#7a1020;" +
            "color:#ffd7dd;border:1px solid #b3283f;border-radius:8px;font:700 12px system-ui,sans-serif";
          item.prepend(selo);
        }
        item.style.outline = "2px solid #b3283f";
        item.style.outlineOffset = "2px";
      } else if (selo) {
        selo.remove();
        item.style.outline = "";
      }
    }
    if (onStatus) onStatus("✅ " + existentes.size + " de " + ids.length + " já no banco (marcadas). Serão excluídas do texto limpo.");
    return { total: items.length, existentes: existentes.size };
  }

  // ---------- UI ----------
  const painel = document.createElement("div");
  painel.style.cssText =
    "position:fixed;right:16px;bottom:16px;z-index:99999;background:#0f1830;color:#e8edf7;" +
    "border:1px solid #33406b;border-radius:14px;padding:12px 14px;width:250px;font:13px/1.4 system-ui,sans-serif;" +
    "box-shadow:0 10px 30px rgba(0,0,0,.45)";
  painel.innerHTML =
    '<div style="font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:6px">📥 Extrator QConcursos</div>' +
    '<label style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin:6px 0;color:#aab6d6">' +
    'Páginas de comentários <input id="qc-pags" type="number" min="0" max="10" value="' + CONFIG.paginasComentarios +
    '" style="width:52px;background:#1b2547;border:1px solid #33406b;color:#e8edf7;border-radius:8px;padding:4px 6px"></label>' +
    '<label style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin:6px 0;color:#aab6d6">' +
    'Comentários (máx) <input id="qc-maxc" type="number" min="1" max="20" value="' + CONFIG.maxComentarios +
    '" style="width:52px;background:#1b2547;border:1px solid #33406b;color:#e8edf7;border-radius:8px;padding:4px 6px"></label>' +
    '<button id="qc-abrir" style="width:100%;margin-top:6px;background:#e8a13a;color:#241a05;border:0;border-radius:10px;' +
    'padding:9px;font-weight:700;cursor:pointer">Abrir comentários</button>' +
    '<button id="qc-copiar" style="width:100%;margin-top:6px;background:transparent;color:#e8a13a;' +
    'border:1px solid #33406b;border-radius:10px;padding:7px;cursor:pointer">Copiar texto limpo</button>' +
    '<div style="margin-top:10px;padding-top:8px;border-top:1px solid #33406b;color:#aab6d6;font-weight:700">Várias páginas</div>' +
    '<label style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin:6px 0;color:#aab6d6">' +
    'Questões novas (meta) <input id="qc-meta" type="number" min="1" max="1000" value="100"' +
    ' style="width:52px;background:#1b2547;border:1px solid #33406b;color:#e8edf7;border-radius:8px;padding:4px 6px"></label>' +
    '<button id="qc-lote" style="width:100%;margin-top:6px;background:#3a8be8;color:#fff;border:0;border-radius:10px;' +
    'padding:9px;font-weight:700;cursor:pointer">Copiar várias páginas</button>' +
    '<button id="qc-parar" data-sempre="1" style="display:none;width:100%;margin-top:6px;background:transparent;color:#ffcf6b;' +
    'border:1px solid #8a6a1f;border-radius:10px;padding:7px;cursor:pointer">Parar lote e copiar o que já tem</button>' +
    '<button id="qc-ultimo" style="width:100%;margin-top:6px;background:transparent;color:#9cc4ff;' +
    'border:1px solid #33406b;border-radius:10px;padding:7px;cursor:pointer">Copiar último lote de novo</button>' +
    '<button id="qc-checar" style="width:100%;margin-top:6px;background:transparent;color:#ff9db0;' +
    'border:1px solid #b3283f;border-radius:10px;padding:7px;cursor:pointer">Rechecar já importadas</button>' +
    '<div id="qc-status" style="margin-top:8px;color:#aab6d6;font-size:12px;min-height:16px"></div>';
  document.body.appendChild(painel);

  const $ = (id) => painel.querySelector(id);
  const setStatus = (t) => { $("#qc-status").textContent = t; };
  const lerPaginas = () => Math.max(0, Math.min(10, parseInt($("#qc-pags").value, 10) || 0));
  const lerMaxComentarios = () => Math.max(1, Math.min(20, parseInt($("#qc-maxc").value, 10) || CONFIG.maxComentarios));

  let ocupado = false;
  async function comLock(fn) {
    if (ocupado) return;
    ocupado = true;
    const botoes = painel.querySelectorAll("button:not([data-sempre])");
    botoes.forEach((b) => { b.disabled = true; b.style.opacity = ".6"; });
    try {
      await fn();
    } catch (e) {
      setStatus("Erro: " + (e && e.message ? e.message : e));
    } finally {
      ocupado = false;
      botoes.forEach((b) => { b.disabled = false; b.style.opacity = "1"; });
    }
  }

  $("#qc-abrir").addEventListener("click", () => comLock(async () => {
    const r = await abrirComentarios(lerPaginas(), setStatus);
    if (!r.total) { setStatus("Nenhuma questão encontrada nesta página."); return; }
    await expandirTextosAssociados(setStatus); // deixa as passagens visíveis pra entrarem no Ctrl+C
    selecionarQuestoes();
    setStatus("✅ " + r.total + " questões abertas (" + r.comComentarios + " c/ comentários) e já selecionadas. Ctrl+C e cole no chat — ou Ctrl+A pra pegar tudo.");
  }));

  $("#qc-copiar").addEventListener("click", () => comLock(async () => {
    CONFIG.maxComentarios = lerMaxComentarios();
    if (!existentes.size) await marcarExistentes(setStatus); // garante o filtro antes de copiar
    const r = await abrirComentarios(lerPaginas(), setStatus);
    if (!r.total) { setStatus("Nenhuma questão encontrada nesta página."); return; }
    await expandirTextosAssociados(setStatus); // garante os textos associados (inclusive os que carregam sob demanda)
    const novas = r.total - existentes.size;
    const ok = copiar(montarTextoLimpo());
    setStatus((ok ? "✅ Texto limpo copiado" : "⚠️ Não consegui copiar (selecione e copie na mão)") +
      " — " + novas + " nova(s) de " + r.total + " (" + existentes.size + " já no banco, excluídas). Cole no chat (Ctrl+V).");
  }));

  $("#qc-checar").addEventListener("click", () => comLock(async () => {
    await marcarExistentes(setStatus);
  }));

  const mostrarParar = (sim) => { $("#qc-parar").style.display = sim ? "block" : "none"; };

  $("#qc-lote").addEventListener("click", () => comLock(async () => {
    const meta = Math.max(1, Math.min(1000, parseInt($("#qc-meta").value, 10) || 100));
    const job = {
      meta,
      pagsComentarios: lerPaginas(),
      maxComentarios: lerMaxComentarios(),
      esperaMs: 1500,
      blocos: [], ids: [], vistosCtx: {}, paginas: [], puladas: 0,
    };
    pararPedido = false;
    mostrarParar(true);
    await passoDoJob(job, setStatus);
  }));

  $("#qc-parar").addEventListener("click", () => {
    pararPedido = true;
    if (!ocupado) { // entre páginas (nada rodando): encerra com o que está salvo
      const job = lerJob();
      if (job) finalizarJob(job, "Lote parado por você.", setStatus);
      mostrarParar(false);
    } else {
      setStatus("Vou parar ao terminar esta página…");
    }
  });

  $("#qc-ultimo").addEventListener("click", () => {
    let job = null;
    try { job = JSON.parse(sessionStorage.getItem(JOB_KEY + "-ultimo") || "null"); } catch (_) {}
    if (!job) { setStatus("Nenhum lote feito nesta aba ainda."); return; }
    const ok = copiar(textoDoJob(job));
    setStatus(ok ? "✅ Último lote copiado de novo (" + job.blocos.length + " questões)." : "⚠️ Não consegui copiar.");
  });

  // Ao abrir a página: se tem lote em andamento, continua sozinho; senão só checa o banco
  // (marca as repetidas de vermelho, sem gastar token do chat).
  const jobPendente = lerJob();
  if (jobPendente) {
    $("#qc-meta").value = jobPendente.meta;
    mostrarParar(true);
    comLock(async () => { await passoDoJob(jobPendente, setStatus); });
  } else {
    comLock(async () => { await marcarExistentes(setStatus); });
  }
})();
