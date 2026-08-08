// ==UserScript==
// @name         QConcursos → Banco de Questões (extrator em lote)
// @namespace    meus-estudos.pmal
// @version      1.1.0
// @description  Captura as questões da página do QConcursos (enunciado, alternativas, metadados e comentários dos colegas) e copia um JSON limpo pra colar no "Importar em lote" do seu site. NÃO responde nada — não toca nas suas estatísticas.
// @match        https://www.qconcursos.com/questoes-de-concursos/questoes*
// @run-at       document-idle
// @grant        GM_setClipboard
// ==/UserScript==

/*
 * Como funciona:
 *  - Lê cada .js-question-item já renderizado na página (enunciado/alternativas/metadados vêm de graça, sem revelar gabarito).
 *  - Abre a aba "Comentários" de cada questão e clica em "Carregar mais" algumas vezes pra pegar os
 *    comentários mais curtidos (onde os colegas quase sempre cravam o gabarito).
 *  - Monta um JSON e copia pro clipboard (e oferece baixar .json).
 *  - O GABARITO não sai daqui: quem lê os comentários e decide o gabarito é a IA, lá no tratamento do site.
 *
 * Ajuste rápido no painel: quantas "páginas" de comentários carregar por questão (padrão 3 = ~top 15-20).
 */
(function () {
  "use strict";

  const CONFIG = {
    paginasComentarios: 3, // cliques em "Carregar mais" por questão
    pausaEntreQuestoesMs: 350, // ritmo "humano" entre questões
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // espera uma condição virar verdadeira (polling) — pra lidar com carregamento assíncrono
  function waitFor(cond, timeout = 2800, interval = 120) {
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
      contexto: null,
      alternativas,
    };
  }

  async function carregarComentarios(item, qid, maxPaginas) {
    const link = item.querySelector('a[href="#question-belt-' + qid + '-comments-tab"]');
    if (!link) return [];
    link.click();
    const ct = document.querySelector("#question-belt-" + qid + "-comments-tab");
    if (!ct) return [];
    // espera aparecer algum comentário (ou desistir se a questão não tiver nenhum)
    await waitFor(() => ct.querySelector(".q-question-comment") || ct.querySelector(".js-load-more-btn"));
    for (let p = 0; p < maxPaginas; p++) {
      const btn = ct.querySelector(".js-load-more-btn");
      if (!btn || btn.offsetParent === null) break;
      const antes = ct.querySelectorAll(".q-question-comment").length;
      btn.click();
      await waitFor(() => {
        const b = ct.querySelector(".js-load-more-btn");
        return ct.querySelectorAll(".q-question-comment").length > antes || !b || b.offsetParent === null;
      });
    }
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

  function copiar(texto) {
    try {
      if (typeof GM_setClipboard === "function") { GM_setClipboard(texto, { type: "text", mimetype: "text/plain" }); return true; }
    } catch (_) {}
    if (navigator.clipboard) { navigator.clipboard.writeText(texto).catch(() => {}); return true; }
    return false;
  }

  function baixarJson(texto) {
    const blob = new Blob([texto], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "qconcursos-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
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
    '<button id="qc-go" style="width:100%;margin-top:6px;background:#e8a13a;color:#241a05;border:0;border-radius:10px;' +
    'padding:9px;font-weight:700;cursor:pointer">Capturar página</button>' +
    '<div id="qc-status" style="margin-top:8px;color:#aab6d6;font-size:12px;min-height:16px"></div>' +
    '<button id="qc-dl" style="display:none;width:100%;margin-top:6px;background:transparent;color:#e8a13a;' +
    'border:1px solid #33406b;border-radius:10px;padding:7px;cursor:pointer">Baixar .json</button>';
  document.body.appendChild(painel);

  const $ = (id) => painel.querySelector(id);
  const setStatus = (t) => { $("#qc-status").textContent = t; };
  let ultimoJson = "";

  $("#qc-go").addEventListener("click", async () => {
    const btn = $("#qc-go");
    btn.disabled = true; btn.style.opacity = ".6";
    CONFIG.paginasComentarios = Math.max(0, Math.min(10, parseInt($("#qc-pags").value, 10) || 0));
    try {
      const items = Array.from(document.querySelectorAll(".js-question-item"));
      if (!items.length) { setStatus("Nenhuma questão encontrada nesta página."); return; }
      const questoes = [];
      for (let i = 0; i < items.length; i++) {
        setStatus("Capturando " + (i + 1) + "/" + items.length + "…");
        const q = extrairQuestao(items[i]);
        q.comentarios = q.fonte_id ? await carregarComentarios(items[i], q.fonte_id, CONFIG.paginasComentarios) : [];
        questoes.push(q);
        await sleep(CONFIG.pausaEntreQuestoesMs);
      }
      const payload = { fonte: "qconcursos", capturado_em: new Date().toISOString(), url: location.href, total: questoes.length, questoes };
      ultimoJson = JSON.stringify(payload, null, 2);
      const copiou = copiar(ultimoJson);
      const comComentarios = questoes.filter((q) => q.comentarios.length).length;
      setStatus((copiou ? "✅ Copiado! " : "⚠️ Copie pelo botão abaixo. ") + questoes.length + " questões (" + comComentarios + " c/ comentários).");
      $("#qc-dl").style.display = "block";
    } catch (e) {
      setStatus("Erro: " + (e && e.message ? e.message : e));
    } finally {
      btn.disabled = false; btn.style.opacity = "1";
    }
  });

  $("#qc-dl").addEventListener("click", () => { if (ultimoJson) baixarJson(ultimoJson); });
})();
