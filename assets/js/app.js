/* ===== PMAL Soldado 2026 — app ===== */
(function(){
  const D = window.DATA;
  const LS = "pmal_soldado_2026";
  const $  = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>[...el.querySelectorAll(s)];

  // ---------- estado persistente ----------
  const store = Object.assign({
    provaDate: D.concurso.dataProvaOficial, // editável
    topics:{},      // "editalId:idx" -> 0..3
    days:{},        // dia -> true (concluído)
    quiz:{acertos:0,erros:0,seen:[]}
  }, JSON.parse(localStorage.getItem(LS)||"{}"));
  const save = ()=>localStorage.setItem(LS,JSON.stringify(store));

  // ---------- gerador do plano de 55 dias ----------
  const TOTAL_DIAS = 55;
  function buildPlano(){
    const dias=[]; let sIdx=0;
    const simDays = new Set([7,14,21,28,35,42,49]);
    for(let d=1; d<=TOTAL_DIAS; d++){
      if(d===1){
        dias.push({dia:1,tipo:"diag",area:"D",titulo:"Diagnóstico e montagem da rotina",
          tarefas:[
            "Ler o edital verticalizado deste site inteiro (aba Edital)",
            "Fazer um mini-simulado de 20 questões para achar pontos fracos",
            "Definir horário fixo de estudo e marcar a data real da prova no topo"
          ]});
      } else if(d===TOTAL_DIAS){
        dias.push({dia:d,tipo:"vesp",area:"V",titulo:"Véspera — revisão leve e descanso",
          tarefas:[
            "Reler somente os flashcards de lei seca (aba Flashcards)",
            "Revisar seus grifos dos pontos marcados como 'revisar'",
            "Separar documentos e caneta; dormir cedo. Sem matéria nova!"
          ]});
      } else if(simDays.has(d)){
        const sem = d/7;
        dias.push({dia:d,tipo:"sim",area:"S",titulo:`Simulado + Redação — balanço da semana ${sem}`,
          tarefas:[
            "Simulado cronometrado: 60 itens Certo/Errado (aba Questões)",
            "Corrigir e refazer os erros anotando o porquê",
            "Escrever 1 redação dissertativa (até 30 linhas) sobre tema de segurança pública",
            "Marcar como 'revisar' os assuntos com mais erros"
          ]});
      } else {
        const s = D.sessoes[sIdx++] || D.sessoes[D.sessoes.length-1];
        const mat = D.edital.find(m=>m.id===s.editalId);
        dias.push({dia:d,tipo:"sessao",area:s.area,editalId:s.editalId,
          titulo:s.titulo, materia:mat?mat.nome:"", icone:mat?mat.icone:"📚",
          tarefas:s.tarefas});
      }
    }
    return dias;
  }
  const PLANO = buildPlano();

  // ---------- helpers ----------
  function diasRestantes(){
    const alvo=new Date(store.provaDate+"T00:00:00");
    const hoje=new Date(); hoje.setHours(0,0,0,0);
    return Math.round((alvo-hoje)/86400000);
  }
  function fmtData(iso){
    const d=new Date(iso+"T00:00:00");
    return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"});
  }
  function totalTopicos(){return D.edital.reduce((a,m)=>a+m.topicos.length,0);}
  function contaStatus(st){
    let n=0;
    D.edital.forEach(m=>m.topicos.forEach((_,i)=>{ if((store.topics[m.id+":"+i]||0)===st) n++; }));
    return n;
  }
  function matProgress(m){
    let dom=0,est=0;
    m.topicos.forEach((_,i)=>{const s=store.topics[m.id+":"+i]||0; if(s===3)dom++; else if(s>0)est++;});
    return {dom,est,total:m.topicos.length,pct:Math.round(dom/m.topicos.length*100)};
  }
  function diasFeitos(){return Object.values(store.days).filter(Boolean).length;}
  function toast(msg){
    let t=$("#toast"); t.textContent=msg; t.classList.add("show");
    clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),1800);
  }

  // ============================================================
  //  DASHBOARD
  // ============================================================
  function renderDash(){
    const dr=diasRestantes();
    const domin=contaStatus(3), total=totalTopicos();
    const pct=Math.round(domin/total*100);
    const feitos=diasFeitos();
    const acc = store.quiz.acertos+store.quiz.erros;
    const taxa = acc? Math.round(store.quiz.acertos/acc*100):0;

    const oficial = D.concurso.dataProvaOficial;
    const notaOficial = store.provaDate!==oficial
      ? `<div class="count-note">📌 Cronograma do edital: prova em ${fmtData(oficial)}. Ajuste acima se a data mudar.</div>`
      : `<div class="count-note">📌 Data conforme cronograma do edital (sujeita a alteração).</div>`;

    $("#view-dash").innerHTML = `
      <div class="page-head">
        <h2>Central de Comando</h2>
        <p>${D.concurso.nome} · Banca ${D.concurso.banca}. Foco total: os <b>70 itens</b> de conhecimentos específicos decidem a prova.</p>
      </div>

      <div class="hero">
        <div class="card count-box">
          <div class="count-num">${dr>=0?dr:0}</div>
          <div class="count-label">dias para a prova</div>
          <div class="count-date">Data da prova:
            <input type="date" id="provaInput" value="${store.provaDate}">
          </div>
          ${notaOficial}
        </div>
        <div class="card">
          <div class="ring-wrap">
            <div class="ring" style="--p:${pct}"><b>${pct}%</b><small>edital<br>dominado</small></div>
            <div>
              <div class="stat"><span class="n gold">${domin}/${total}</span><span class="l">tópicos dominados</span></div>
              <div style="height:12px"></div>
              <div class="stat"><span class="n blue">${feitos}/${TOTAL_DIAS}</span><span class="l">dias do plano concluídos</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid g-4">
        <div class="card stat"><span class="n gold">120</span><span class="l">itens objetivos (50+70)</span></div>
        <div class="card stat"><span class="n blue">${D.duracaoProva.split(" ")[0]}</span><span class="l">duração da prova</span></div>
        <div class="card stat"><span class="n green">${taxa}%</span><span class="l">acerto nos treinos</span></div>
        <div class="card stat"><span class="n">${contaStatus(2)}</span><span class="l">tópicos p/ revisar</span></div>
      </div>

      <div class="section-title">Missão de hoje</div>
      <div id="hojeBox"></div>

      <div class="section-title">Como você vence esta prova</div>
      <div class="card">
        <div class="info-row">
          <div class="info-item"><div class="k">Estilo da banca</div><div class="v">Certo / Errado</div></div>
          <div class="info-item"><div class="k">Penalidade</div><div class="v">Erro anula acerto</div></div>
          <div class="info-item"><div class="k">Discursiva</div><div class="v">Redação · 30 pts</div></div>
          <div class="info-item"><div class="k">Prioridade</div><div class="v">Legislação & Direito</div></div>
        </div>
        <p style="margin-top:14px;color:var(--txt-dim);font-size:14px">${D.concurso.estilo} Comece cada dia pela missão abaixo e mantenha a sequência do plano de 55 dias.</p>
      </div>
    `;
    $("#provaInput").addEventListener("change",e=>{store.provaDate=e.target.value;save();renderDash();});
    renderHoje();
  }

  function proximoDiaAberto(){
    const f=PLANO.find(d=>!store.days[d.dia]);
    return f||PLANO[PLANO.length-1];
  }
  function renderHoje(){
    const dia=proximoDiaAberto();
    const cls={sessao:dia.area==="P2"?"b-p2":"b-p1",sim:"b-sim",diag:"b-rev",vesp:"b-rev"}[dia.tipo]||"b-p1";
    const lab={P1:"Básicas",P2:"Específicas",S:"Simulado",D:"Diagnóstico",V:"Véspera"}[dia.area]||"";
    const rotina = dia.tipo==="sessao"
      ? `<div class="routine"><b>Rotina fixa do dia:</b> 30 min de Português · 20 questões Certo/Errado · revisão relâmpago (flashcards) do dia anterior.</div>` : "";
    $("#hojeBox").innerHTML = `
      <div class="card day-card ${dia.tipo==='sessao'?dia.area.toLowerCase():dia.tipo} open">
        <div class="day-head">
          <div class="day-n"><b>${dia.dia}</b><small>de ${TOTAL_DIAS}</small></div>
          <div class="day-title">
            <h4>${dia.icone||""} ${dia.titulo}</h4>
            <div class="sub"><span class="badge ${cls}">${lab}</span> ${dia.materia||""}</div>
          </div>
        </div>
        <div class="day-body">
          <ul>${dia.tarefas.map(t=>`<li>${t}</li>`).join("")}</ul>
          ${rotina}
          <button class="q-next show" style="margin-top:14px" id="concluirHoje">✓ Concluir dia ${dia.dia}</button>
        </div>
      </div>`;
    $("#concluirHoje").addEventListener("click",()=>{
      store.days[dia.dia]=true;save();
      toast(`Dia ${dia.dia} concluído! 💪`);
      renderDash();
    });
  }

  // ============================================================
  //  PLANO 55 DIAS
  // ============================================================
  let planoFiltro="todos";
  function renderPlano(){
    const done=diasFeitos();
    $("#view-plano").innerHTML = `
      <div class="page-head">
        <h2>Plano de ${TOTAL_DIAS} dias</h2>
        <p>Roteiro dia a dia com foco crescente. ${done} de ${TOTAL_DIAS} dias concluídos. Clique num dia para abrir as tarefas e marque o check ao terminar.</p>
      </div>
      <div class="plano-filters">
        ${["todos","P2","P1","sim"].map(f=>`<button class="chip ${planoFiltro===f?'active':''}" data-f="${f}">${({todos:'Todos os dias','P2':'Só específicas','P1':'Só básicas',sim:'Simulados'})[f]}</button>`).join("")}
      </div>
      <div id="planoList"></div>`;
    $$("#view-plano .chip").forEach(c=>c.addEventListener("click",()=>{planoFiltro=c.dataset.f;renderPlano();}));
    const list=$("#planoList");
    PLANO.filter(d=>{
      if(planoFiltro==="todos")return true;
      if(planoFiltro==="sim")return d.tipo==="sim";
      if(planoFiltro==="P2")return d.area==="P2";
      if(planoFiltro==="P1")return d.area==="P1";
    }).forEach(d=>list.appendChild(dayCard(d)));
  }
  function dayCard(d){
    const el=document.createElement("div");
    const typeCls = d.tipo==="sessao"?d.area.toLowerCase():d.tipo;
    const done=!!store.days[d.dia];
    const cls={sessao:d.area==="P2"?"b-p2":"b-p1",sim:"b-sim",diag:"b-rev",vesp:"b-rev"}[d.tipo]||"b-p1";
    const lab={P1:"Básicas",P2:"Específicas",S:"Simulado",D:"Diagnóstico",V:"Véspera"}[d.area]||"";
    el.className=`card day-card ${typeCls}`;
    el.innerHTML=`
      <div class="day-head">
        <div class="day-n"><b>${d.dia}</b><small>dia</small></div>
        <div class="day-title">
          <h4>${d.icone||""} ${d.titulo}</h4>
          <div class="sub"><span class="badge ${cls}">${lab}</span> ${d.materia||""}</div>
        </div>
        <input type="checkbox" class="day-check" ${done?"checked":""} title="Marcar dia como concluído">
      </div>
      <div class="day-body">
        <ul>${d.tarefas.map(t=>`<li>${t}</li>`).join("")}</ul>
        ${d.tipo==="sessao"?'<div class="routine"><b>Rotina fixa:</b> 30 min Português · 20 questões C/E · revisão dos flashcards.</div>':''}
      </div>`;
    el.querySelector(".day-head").addEventListener("click",e=>{
      if(e.target.classList.contains("day-check"))return;
      el.classList.toggle("open");
    });
    el.querySelector(".day-check").addEventListener("click",e=>{
      store.days[d.dia]=e.target.checked;save();
      toast(e.target.checked?`Dia ${d.dia} concluído!`:`Dia ${d.dia} reaberto`);
    });
    return el;
  }

  // ============================================================
  //  EDITAL VERTICALIZADO
  // ============================================================
  function renderEdital(){
    $("#view-edital").innerHTML=`
      <div class="page-head">
        <h2>Edital verticalizado</h2>
        <p>Todo o conteúdo programático do cargo de Soldado. Clique na bolinha para avançar o status de cada tópico. Sua meta: pintar tudo de verde.</p>
      </div>
      <div class="legend">
        <span><i style="background:var(--txt-mut)"></i> Não estudado</span>
        <span><i style="background:var(--amber)"></i> Estudando</span>
        <span><i style="background:var(--blue)"></i> Revisar</span>
        <span><i style="background:var(--green)"></i> Dominado</span>
      </div>
      <div class="grid g-2" style="margin-bottom:20px">
        <div class="card"><div class="section-title" style="margin:0 0 12px"><span class="badge b-p1">P1</span> Conhecimentos Básicos · 50 itens</div><div id="ed-p1"></div></div>
        <div class="card"><div class="section-title" style="margin:0 0 12px"><span class="badge b-p2">P2</span> Conhecimentos Específicos · 70 itens</div><div id="ed-p2"></div></div>
      </div>`;
    const p1=$("#ed-p1"), p2=$("#ed-p2");
    D.edital.forEach(m=>{(m.area==="P1"?p1:p2).appendChild(matBlock(m));});
  }
  function matBlock(m){
    const wrap=document.createElement("div");
    wrap.className="mat-block";
    const p=matProgress(m);
    wrap.innerHTML=`
      <div class="mat-head">
        <span class="ic">${m.icone}</span>
        <div style="flex:1">
          <h4>${m.nome}</h4>
          <div class="mat-bar"><span style="width:${p.pct}%"></span></div>
        </div>
        <div class="mat-progress">${p.dom}/${p.total}</div>
      </div>
      <div class="topics"></div>`;
    const topics=wrap.querySelector(".topics");
    m.topicos.forEach((t,i)=>{
      const key=m.id+":"+i; const st=store.topics[key]||0;
      const row=document.createElement("div");
      row.className="topic"; row.dataset.st=st;
      row.innerHTML=`<span class="dot" title="Clique para mudar o status"></span><span class="tx">${t}</span>`;
      row.querySelector(".dot").addEventListener("click",()=>{
        const ns=((store.topics[key]||0)+1)%4;
        store.topics[key]=ns; row.dataset.st=ns; save();
        const np=matProgress(m);
        wrap.querySelector(".mat-bar span").style.width=np.pct+"%";
        wrap.querySelector(".mat-progress").textContent=`${np.dom}/${np.total}`;
      });
      topics.appendChild(row);
    });
    wrap.querySelector(".mat-head").addEventListener("click",()=>wrap.classList.toggle("open"));
    return wrap;
  }

  // ============================================================
  //  QUESTÕES (Certo/Errado)
  // ============================================================
  let qOrder=[], qPos=0, qAnswered=false;
  function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;}
  function renderQuiz(reset){
    if(reset||!qOrder.length){qOrder=shuffle(D.questoes.map((_,i)=>i));qPos=0;}
    $("#view-quiz").innerHTML=`
      <div class="page-head">
        <h2>Banco de questões</h2>
        <p>Itens no estilo Cebraspe. Julgue cada afirmação como <b>Certo</b> ou <b>Errado</b> e leia a justificativa. Treine o olho para a “pegadinha” da palavra trocada.</p>
      </div>
      <div class="quiz-head">
        <div class="quiz-score">
          <div><b style="color:var(--green)" id="scAcertos">${store.quiz.acertos}</b><small>acertos</small></div>
          <div><b style="color:var(--red)" id="scErros">${store.quiz.erros}</b><small>erros</small></div>
          <div><b id="scTaxa">0%</b><small>aproveitamento</small></div>
        </div>
        <button class="chip" id="qReset">↺ Zerar placar</button>
      </div>
      <div class="card q-card" id="qCard"></div>`;
    $("#qReset").addEventListener("click",()=>{store.quiz={acertos:0,erros:0,seen:[]};save();renderQuiz(true);});
    drawQuestion();
  }
  function updTaxa(){
    const a=store.quiz.acertos+store.quiz.erros;
    $("#scTaxa").textContent=(a?Math.round(store.quiz.acertos/a*100):0)+"%";
    $("#scAcertos").textContent=store.quiz.acertos;
    $("#scErros").textContent=store.quiz.erros;
  }
  function drawQuestion(){
    qAnswered=false;
    const q=D.questoes[qOrder[qPos]];
    const mat=D.edital.find(m=>m.id===q.editalId);
    $("#qCard").innerHTML=`
      <div class="q-progress">Questão ${qPos+1} de ${qOrder.length}</div>
      <div class="q-tag"><span class="badge ${mat&&mat.area==='P2'?'b-p2':'b-p1'}">${mat?mat.nome:""}</span></div>
      <div class="q-enun">${q.enunciado}</div>
      <div class="q-btns">
        <button class="certo" data-v="true">CERTO</button>
        <button class="errado" data-v="false">ERRADO</button>
      </div>
      <div class="q-feedback" id="qFb"></div>
      <button class="q-next" id="qNext">Próxima questão →</button>`;
    updTaxa();
    $$("#qCard .q-btns button").forEach(b=>b.addEventListener("click",()=>answer(b.dataset.v==="true",q)));
    $("#qNext").addEventListener("click",()=>{qPos=(qPos+1)%qOrder.length;drawQuestion();});
  }
  function answer(val,q){
    if(qAnswered)return; qAnswered=true;
    const ok=val===q.gab;
    if(ok)store.quiz.acertos++; else store.quiz.erros++; save();
    const fb=$("#qFb");
    fb.className="q-feedback show "+(ok?"ok":"no");
    fb.innerHTML=`<b>${ok?"✓ Você acertou!":"✕ Não foi dessa vez."} Gabarito: ${q.gab?"CERTO":"ERRADO"}</b>${q.just}`;
    $("#qNext").classList.add("show");
    $$("#qCard .q-btns button").forEach(b=>b.style.opacity=.6);
    updTaxa();
  }

  // ============================================================
  //  FLASHCARDS
  // ============================================================
  let fcPos=0;
  function renderFlash(){
    fcPos=0;
    $("#view-flash").innerHTML=`
      <div class="page-head">
        <h2>Flashcards — lei seca</h2>
        <p>Pontos de altíssima incidência. Clique no cartão para ver a resposta. Ideal para revisão rápida em filas e intervalos.</p>
      </div>
      <div class="fc-stage">
        <div class="flashcard" id="fcCard">
          <div class="fc-inner">
            <div class="fc-face fc-front"><div class="lab">Pergunta</div><p id="fcFront"></p><div class="tip">clique para virar</div></div>
            <div class="fc-face fc-back"><div class="lab" style="color:#8fe0b0">Resposta</div><p id="fcBack"></p><div class="tip">clique para voltar</div></div>
          </div>
        </div>
        <div class="fc-nav">
          <button id="fcPrev">‹</button>
          <div class="fc-count" id="fcCount"></div>
          <button id="fcNext">›</button>
        </div>
      </div>`;
    const card=$("#fcCard");
    card.addEventListener("click",()=>card.classList.toggle("flip"));
    $("#fcPrev").addEventListener("click",()=>{fcPos=(fcPos-1+D.flashcards.length)%D.flashcards.length;drawFlash();});
    $("#fcNext").addEventListener("click",()=>{fcPos=(fcPos+1)%D.flashcards.length;drawFlash();});
    drawFlash();
  }
  function drawFlash(){
    const c=D.flashcards[fcPos];
    $("#fcCard").classList.remove("flip");
    $("#fcFront").textContent=c.f;
    $("#fcBack").textContent=c.v;
    $("#fcCount").textContent=`${fcPos+1} / ${D.flashcards.length}`;
  }

  // ============================================================
  //  ESTRATÉGIA
  // ============================================================
  function renderEstrategia(){
    const somaP1=D.pesos.filter(p=>p.area==="P1").reduce((a,p)=>a+p.qEst,0);
    const somaP2=D.pesos.filter(p=>p.area==="P2").reduce((a,p)=>a+p.qEst,0);
    const max=Math.max(...D.pesos.map(p=>p.qEst));
    $("#view-estrategia").innerHTML=`
      <div class="page-head">
        <h2>Estratégia & pesos</h2>
        <p>Onde investir seu tempo e como jogar o jogo da Cebraspe. A distribuição por matéria é uma <b>estimativa</b> (o edital só informa 50 básicos + 70 específicos).</p>
      </div>

      <div class="section-title">Peso estimado por matéria</div>
      <div class="card" style="margin-bottom:20px">
        <table>
          <thead><tr><th>Matéria</th><th>Prova</th><th>Questões (est.)</th><th style="width:35%">Peso</th></tr></thead>
          <tbody>
            ${D.pesos.slice().sort((a,b)=>b.qEst-a.qEst).map(p=>`
              <tr>
                <td>${p.materia}</td>
                <td><span class="badge ${p.area==='P2'?'b-p2':'b-p1'}">${p.area}</span></td>
                <td><b>${p.qEst}</b></td>
                <td><div class="bar"><span style="width:${p.qEst/max*100}%;background:${p.cor}"></span></div></td>
              </tr>`).join("")}
          </tbody>
        </table>
        <p style="margin-top:12px;font-size:12px;color:var(--txt-mut)">Básicas (P1) ≈ ${somaP1} · Específicas (P2) ≈ ${somaP2}. As específicas valem mais — é onde a aprovação se decide.</p>
      </div>

      <div class="section-title">Táticas de prova</div>
      <div class="grid g-2">
        ${D.dicas.map(d=>`<div class="card dica"><h4>▸ ${d.t}</h4><p>${d.c}</p></div>`).join("")}
      </div>

      <div class="section-title">Fases do concurso</div>
      <div class="card">
        <table>
          <thead><tr><th>Fase</th><th>Conteúdo</th><th>Itens</th><th>Caráter</th></tr></thead>
          <tbody>
            ${D.estrutura.map(e=>`<tr><td><b>${e.prova}</b></td><td>${e.area}</td><td>${e.itens??"—"}</td><td style="font-size:12px;color:var(--txt-dim)">${e.carater}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // ============================================================
  //  NAV
  // ============================================================
  const views={dash:renderDash,plano:renderPlano,edital:renderEdital,quiz:()=>renderQuiz(true),flash:renderFlash,estrategia:renderEstrategia};
  function go(v){
    $$(".view").forEach(el=>el.classList.remove("active"));
    $("#view-"+v).classList.add("active");
    $$(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.v===v));
    (views[v]||renderDash)();
    $(".sidebar").classList.remove("open");
    window.scrollTo(0,0);
    $("#mobTitle").textContent=$(`.nav button[data-v="${v}"]`).dataset.label;
  }
  $$(".nav button").forEach(b=>b.addEventListener("click",()=>go(b.dataset.v)));
  $("#menuBtn").addEventListener("click",()=>$(".sidebar").classList.toggle("open"));
  $("#resetAll").addEventListener("click",()=>{
    if(confirm("Isso apaga TODO o seu progresso (plano, edital, placar). Continuar?")){
      localStorage.removeItem(LS);location.reload();
    }
  });

  go("dash");
})();
