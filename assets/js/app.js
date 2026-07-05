/* ===== Meus Estudos — plataforma multi-concurso ===== */
(function(){
  const D  = window.DATA;
  const LS = "estudos_concursos_v2";
  const $  = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>[...el.querySelectorAll(s)];

  // ---------- estado persistente ----------
  const store = Object.assign({
    lastConcurso:null,
    topics:{},   // "materiaId:idx" -> 0..3   (GLOBAL: compartilhado entre concursos)
    cc:{}        // concursoId -> { provaDate, days:{}, quiz:{acertos,erros} }
  }, JSON.parse(localStorage.getItem(LS)||"{}"));
  const save = ()=>localStorage.setItem(LS,JSON.stringify(store));

  function ccState(id){
    if(!store.cc[id]){
      const c=getConc(id);
      store.cc[id]={ provaDate:(c&&c.dataProvaOficial)||"", days:{}, quiz:{acertos:0,erros:0} };
    }
    return store.cc[id];
  }

  // ---------- catálogo / helpers ----------
  const getConc = id => D.concursos.find(c=>c.id===id);
  const mat     = id => D.materias[id];

  const usage={};
  D.concursos.forEach(c=>c.blocos.forEach(b=>b.materias.forEach(m=>{usage[m]=(usage[m]||0)+1;})));
  const isComum = id => (usage[id]||0)>1;

  const concMaterias = c => c.blocos.reduce((a,b)=>a.concat(b.materias),[]);
  const totalTopicos = c => concMaterias(c).reduce((a,id)=>a+mat(id).topicos.length,0);
  function contaStatus(c,st){
    let n=0;
    concMaterias(c).forEach(id=>mat(id).topicos.forEach((_,i)=>{ if((store.topics[id+":"+i]||0)===st)n++; }));
    return n;
  }
  function matProgress(id){
    const m=mat(id); let dom=0,est=0;
    m.topicos.forEach((_,i)=>{const s=store.topics[id+":"+i]||0; if(s===3)dom++; else if(s>0)est++;});
    return {dom,est,total:m.topicos.length,pct:Math.round(dom/m.topicos.length*100)};
  }
  const concQuestoes = c => { const s=new Set(concMaterias(c)); return D.questoes.filter(q=>s.has(q.materiaId)); };
  const concFlashcards = c => { const s=new Set(concMaterias(c)); return D.flashcards.filter(f=>s.has(f.materiaId)); };

  function diasRestantes(id){
    const st=ccState(id); if(!st.provaDate)return null;
    const alvo=new Date(st.provaDate+"T00:00:00"); const hoje=new Date(); hoje.setHours(0,0,0,0);
    return Math.round((alvo-hoje)/86400000);
  }
  function fmtData(iso){ if(!iso)return "—";
    return new Date(iso+"T00:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"}); }
  function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show");
    clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),1800); }

  const NAV=[
    {v:"dash",label:"Central",ico:"🎯"},
    {v:"plano",label:"Plano de estudos",ico:"🗓️"},
    {v:"edital",label:"Edital",ico:"📋"},
    {v:"quiz",label:"Questões",ico:"✍️"},
    {v:"flash",label:"Flashcards",ico:"🃏"},
    {v:"estrategia",label:"Estratégia",ico:"♟️"}
  ];

  let active=null;   // concurso ativo (id) ou null = hub
  let PLANO=[];

  // ---------- gerador do plano ----------
  function buildPlano(c){
    const T=c.totalDias||0; if(!T || !c.sessoes.length) return [];
    const dias=[]; let sIdx=0;
    const sim=new Set(); for(let d=7; d<T; d+=7) sim.add(d);
    for(let d=1; d<=T; d++){
      if(d===1){
        dias.push({dia:1,tipo:"diag",area:"D",titulo:"Diagnóstico e montagem da rotina",tarefas:[
          "Ler o edital verticalizado deste concurso inteiro (aba Edital)",
          "Fazer um mini-simulado de 20 questões para achar pontos fracos",
          "Definir horário fixo de estudo e confirmar a data da prova no topo"]});
      } else if(d===T){
        dias.push({dia:d,tipo:"vesp",area:"V",titulo:"Véspera — revisão leve e descanso",tarefas:[
          "Reler somente os flashcards de lei seca (aba Flashcards)",
          "Revisar seus grifos dos pontos marcados como 'revisar'",
          "Separar documentos e caneta; dormir cedo. Sem matéria nova!"]});
      } else if(sim.has(d)){
        dias.push({dia:d,tipo:"sim",area:"S",titulo:`Simulado + Redação — balanço da semana ${d/7}`,tarefas:[
          "Simulado cronometrado: 60 itens Certo/Errado (aba Questões)",
          "Corrigir e refazer os erros anotando o porquê",
          "Escrever 1 redação dissertativa (até 30 linhas)",
          "Marcar como 'revisar' os assuntos com mais erros"]});
      } else {
        const s=c.sessoes[sIdx++]||c.sessoes[c.sessoes.length-1];
        const m=mat(s.materiaId);
        dias.push({dia:d,tipo:"sessao",area:s.area,materiaId:s.materiaId,titulo:s.titulo,
          materia:m?m.nome:"",icone:m?m.icone:"📚",tarefas:s.tarefas});
      }
    }
    return dias;
  }
  const diasFeitos = id => Object.values(ccState(id).days).filter(Boolean).length;

  // ============================================================
  //  HUB
  // ============================================================
  function renderHub(){
    const comuns = Object.keys(usage).filter(id=>usage[id]>1);
    $("#view-hub").innerHTML=`
      <div class="page-head">
        <h2>Olá, ${D.plataforma.dono} 👋</h2>
        <p>Sua central de estudos para concursos. Escolha um concurso para entrar. As matérias em comum compartilham o progresso — <b>estudou uma vez, conta para todos</b>.</p>
      </div>
      <div class="grid g-2" id="hubCards"></div>
      <div class="section-title">Núcleo comum</div>
      <div class="card">
        <p style="color:var(--txt-dim);font-size:14px">Estas ${comuns.length} matérias caem em mais de um dos seus concursos. O que você marcar em um aparece marcado no outro:</p>
        <div class="shared-list">
          ${comuns.map(id=>{const p=matProgress(id);return `<span class="shared-pill">${mat(id).icone} ${mat(id).nome} <b>${p.pct}%</b></span>`;}).join("")}
        </div>
      </div>`;
    const box=$("#hubCards");
    D.concursos.forEach(c=>box.appendChild(concursoCard(c)));
    $("#mobTitle").textContent="Meus Estudos";
  }
  function concursoCard(c){
    const el=document.createElement("div");
    el.className="card conc-card";
    el.style.setProperty("--accent",c.cor);
    const dom=contaStatus(c,3), tot=totalTopicos(c), pct=tot?Math.round(dom/tot*100):0;
    const dr=diasRestantes(c.id);
    const emBreve=c.status==="em_breve";
    const nq=concQuestoes(c).length;
    el.innerHTML=`
      <div class="conc-top">
        <div class="conc-ic" style="background:${c.cor}22;border-color:${c.cor}66">${c.icone}</div>
        <div style="flex:1">
          <h3>${c.nome}</h3>
          <div class="conc-org">${c.orgao} · ${c.banca}</div>
        </div>
        <span class="badge ${emBreve?'b-rev':'b-sim'}">${emBreve?'Em breve':'Ativo'}</span>
      </div>
      <div class="mat-bar" style="margin:14px 0 6px"><span style="width:${pct}%;background:${c.cor}"></span></div>
      <div class="conc-stats">
        <span><b>${pct}%</b> edital</span>
        <span><b>${dr!=null?dr:'—'}</b> dias restantes</span>
        <span><b>${nq}</b> questões</span>
      </div>
      <button class="conc-enter" style="background:${c.cor}">Entrar &rarr;</button>`;
    el.querySelector(".conc-enter").addEventListener("click",()=>openConcurso(c.id));
    el.addEventListener("click",e=>{ if(!e.target.closest(".conc-enter")) openConcurso(c.id); });
    return el;
  }

  // ============================================================
  //  SIDEBAR
  // ============================================================
  function renderSideHub(){
    $("#sideTop").innerHTML=`
      <div class="brand">
        <div class="shield">🎯</div>
        <h1>${D.plataforma.nome}<span>${D.plataforma.sub}</span></h1>
      </div>
      <div class="brand-sub">${D.concursos.length} concursos · progresso compartilhado</div>`;
    $("#nav").innerHTML="";
  }
  function renderSideConcurso(){
    const c=getConc(active);
    $("#sideTop").innerHTML=`
      <button class="back-btn" id="backHub">← Concursos</button>
      <div class="brand" style="margin-top:14px">
        <div class="shield" style="background:linear-gradient(160deg,${c.cor},#0008)">${c.icone}</div>
        <h1>${c.curto}<span>${c.banca}</span></h1>
      </div>`;
    $("#nav").innerHTML=NAV.map(n=>`<button data-v="${n.v}"><span class="ico">${n.ico}</span> ${n.label}</button>`).join("");
    $("#backHub").addEventListener("click",openHub);
    $$("#nav button").forEach(b=>b.addEventListener("click",()=>go(b.dataset.v)));
  }

  // ============================================================
  //  DASHBOARD
  // ============================================================
  function renderDash(){
    const c=getConc(active), st=ccState(active);
    const dr=diasRestantes(active);
    const dom=contaStatus(c,3), tot=totalTopicos(c), pct=tot?Math.round(dom/tot*100):0;
    const feitos=diasFeitos(active);
    const acc=st.quiz.acertos+st.quiz.erros;
    const taxa=acc?Math.round(st.quiz.acertos/acc*100):0;
    const emBreve=c.status==="em_breve";
    const nComuns=concMaterias(c).filter(isComum).length;

    const dataBox = `
      <div class="count-date">Data da prova:
        <input type="date" id="provaInput" value="${st.provaDate}">
      </div>
      <div class="count-note">📌 ${c.notaData||""}</div>`;

    $("#view-dash").innerHTML=`
      <div class="page-head">
        <h2>${c.curto} — Central</h2>
        <p>${c.nome} · Banca ${c.banca}. ${emBreve?'Concurso em preparação: foque no núcleo comum, que já conta para os seus outros concursos.':'Itens Certo/Errado — cada erro anula um acerto.'}</p>
      </div>
      <div class="hero">
        <div class="card count-box">
          <div class="count-num">${dr!=null?(dr>=0?dr:0):'—'}</div>
          <div class="count-label">${dr!=null?'dias para a prova':'defina a data da prova'}</div>
          ${dataBox}
        </div>
        <div class="card">
          <div class="ring-wrap">
            <div class="ring" style="--p:${pct}"><b>${pct}%</b><small>edital<br>dominado</small></div>
            <div>
              <div class="stat"><span class="n gold">${dom}/${tot}</span><span class="l">tópicos dominados</span></div>
              <div style="height:12px"></div>
              <div class="stat"><span class="n blue">${nComuns}</span><span class="l">matérias em comum</span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="grid g-4">
        <div class="card stat"><span class="n gold">${concQuestoes(c).length}</span><span class="l">questões disponíveis</span></div>
        <div class="card stat"><span class="n blue">${c.totalDias||'—'}</span><span class="l">dias no plano</span></div>
        <div class="card stat"><span class="n green">${taxa}%</span><span class="l">acerto nos treinos</span></div>
        <div class="card stat"><span class="n">${contaStatus(c,2)}</span><span class="l">tópicos p/ revisar</span></div>
      </div>
      <div class="section-title">Missão de hoje</div>
      <div id="hojeBox"></div>`;
    $("#provaInput").addEventListener("change",e=>{st.provaDate=e.target.value;save();renderDash();});
    renderHoje();
  }
  function renderHoje(){
    const c=getConc(active);
    if(!PLANO.length){
      $("#hojeBox").innerHTML=`
        <div class="card">
          <p style="color:var(--txt-dim);font-size:14px">Ainda não há um plano dia a dia para <b>${c.curto}</b> (aguardando edital/data). Enquanto isso, adiante o <b>núcleo comum</b> na aba <b>Edital</b> — cada tópico marcado aqui já conta para os seus outros concursos. 💪</p>
          <button class="q-next show" style="margin-top:14px" id="goEdital">Ir para o Edital →</button>
        </div>`;
      $("#goEdital").addEventListener("click",()=>go("edital"));
      return;
    }
    const dia=PLANO.find(d=>!ccState(active).days[d.dia])||PLANO[PLANO.length-1];
    const cls={sessao:dia.area==="P2"?"b-p2":"b-p1",sim:"b-sim",diag:"b-rev",vesp:"b-rev"}[dia.tipo]||"b-p1";
    const lab={P1:"Básicas",P2:"Específicas",S:"Simulado",D:"Diagnóstico",V:"Véspera"}[dia.area]||"";
    const rotina=dia.tipo==="sessao"
      ?`<div class="routine"><b>Rotina fixa:</b> 30 min de Português · 20 questões Certo/Errado · revisão relâmpago (flashcards) do dia anterior.</div>`:"";
    $("#hojeBox").innerHTML=`
      <div class="card day-card ${dia.tipo==='sessao'?dia.area.toLowerCase():dia.tipo} open">
        <div class="day-head">
          <div class="day-n"><b>${dia.dia}</b><small>de ${c.totalDias}</small></div>
          <div class="day-title"><h4>${dia.icone||""} ${dia.titulo}</h4>
            <div class="sub"><span class="badge ${cls}">${lab}</span> ${dia.materia||""}</div></div>
        </div>
        <div class="day-body">
          <ul>${dia.tarefas.map(t=>`<li>${t}</li>`).join("")}</ul>${rotina}
          <button class="q-next show" style="margin-top:14px" id="concluirHoje">✓ Concluir dia ${dia.dia}</button>
        </div>
      </div>`;
    $("#concluirHoje").addEventListener("click",()=>{ ccState(active).days[dia.dia]=true;save();toast(`Dia ${dia.dia} concluído! 💪`);renderDash(); });
  }

  // ============================================================
  //  PLANO
  // ============================================================
  let planoFiltro="todos";
  function renderPlano(){
    const c=getConc(active);
    if(!PLANO.length){
      $("#view-plano").innerHTML=`
        <div class="page-head"><h2>Plano de estudos</h2>
        <p>O plano dia a dia de <b>${c.curto}</b> será liberado quando você definir a data da prova / sair o edital.</p></div>
        <div class="card"><p style="color:var(--txt-dim)">Por enquanto, o melhor uso do seu tempo é adiantar o <b>núcleo comum</b> (Português, Informática, Constitucional, Administrativo, Direitos Humanos, Legislação Penal Especial e Processo Penal). Você já está estudando para o PMAL — esses tópicos são os mesmos. Vá para a aba <b>Edital</b> e siga marcando.</p>
        <button class="q-next show" style="margin-top:14px" id="goEdital2">Abrir Edital →</button></div>`;
      $("#goEdital2").addEventListener("click",()=>go("edital"));
      return;
    }
    const done=diasFeitos(active);
    $("#view-plano").innerHTML=`
      <div class="page-head"><h2>Plano de ${c.totalDias} dias</h2>
        <p>Roteiro dia a dia com foco crescente. ${done} de ${c.totalDias} dias concluídos. Clique num dia para abrir as tarefas e marque o check ao terminar.</p></div>
      <div class="plano-filters">
        ${["todos","P2","P1","sim"].map(f=>`<button class="chip ${planoFiltro===f?'active':''}" data-f="${f}">${({todos:'Todos os dias','P2':'Só específicas','P1':'Só básicas',sim:'Simulados'})[f]}</button>`).join("")}
      </div><div id="planoList"></div>`;
    $$("#view-plano .chip").forEach(ch=>ch.addEventListener("click",()=>{planoFiltro=ch.dataset.f;renderPlano();}));
    const list=$("#planoList");
    PLANO.filter(d=>{
      if(planoFiltro==="todos")return true;
      if(planoFiltro==="sim")return d.tipo==="sim";
      return d.area===planoFiltro;
    }).forEach(d=>list.appendChild(dayCard(d)));
  }
  function dayCard(d){
    const c=getConc(active), el=document.createElement("div");
    const typeCls=d.tipo==="sessao"?d.area.toLowerCase():d.tipo;
    const done=!!ccState(active).days[d.dia];
    const cls={sessao:d.area==="P2"?"b-p2":"b-p1",sim:"b-sim",diag:"b-rev",vesp:"b-rev"}[d.tipo]||"b-p1";
    const lab={P1:"Básicas",P2:"Específicas",S:"Simulado",D:"Diagnóstico",V:"Véspera"}[d.area]||"";
    el.className=`card day-card ${typeCls}`;
    el.innerHTML=`
      <div class="day-head">
        <div class="day-n"><b>${d.dia}</b><small>dia</small></div>
        <div class="day-title"><h4>${d.icone||""} ${d.titulo}</h4>
          <div class="sub"><span class="badge ${cls}">${lab}</span> ${d.materia||""}</div></div>
        <input type="checkbox" class="day-check" ${done?"checked":""} title="Marcar dia como concluído">
      </div>
      <div class="day-body">
        <ul>${d.tarefas.map(t=>`<li>${t}</li>`).join("")}</ul>
        ${d.tipo==="sessao"?'<div class="routine"><b>Rotina fixa:</b> 30 min Português · 20 questões C/E · revisão dos flashcards.</div>':''}
      </div>`;
    el.querySelector(".day-head").addEventListener("click",e=>{ if(!e.target.classList.contains("day-check")) el.classList.toggle("open"); });
    el.querySelector(".day-check").addEventListener("click",e=>{ ccState(active).days[d.dia]=e.target.checked;save();toast(e.target.checked?`Dia ${d.dia} concluído!`:`Dia ${d.dia} reaberto`); });
    return el;
  }

  // ============================================================
  //  EDITAL
  // ============================================================
  function renderEdital(){
    const c=getConc(active);
    $("#view-edital").innerHTML=`
      <div class="page-head"><h2>Edital verticalizado — ${c.curto}</h2>
        <p>Clique na bolinha para avançar o status de cada tópico. Matérias marcadas com <span class="comum-tag">comum</span> compartilham progresso com seus outros concursos.</p></div>
      <div class="legend">
        <span><i style="background:var(--txt-mut)"></i> Não estudado</span>
        <span><i style="background:var(--amber)"></i> Estudando</span>
        <span><i style="background:var(--blue)"></i> Revisar</span>
        <span><i style="background:var(--green)"></i> Dominado</span>
      </div>
      <div id="editalBlocos"></div>`;
    const box=$("#editalBlocos");
    c.blocos.forEach(b=>{
      const wrap=document.createElement("div");
      wrap.className="card";
      wrap.style.marginBottom="18px";
      wrap.innerHTML=`<div class="section-title" style="margin:0 0 12px"><span class="badge ${b.badge}">${b.badge==='b-sh'?'Comum':(b.badge==='b-p1'?'P1':'P2')}</span> ${b.titulo}</div><div class="bl-mats"></div>`;
      const mb=wrap.querySelector(".bl-mats");
      b.materias.forEach(id=>mb.appendChild(matBlock(id)));
      box.appendChild(wrap);
    });
  }
  function matBlock(id){
    const m=mat(id), wrap=document.createElement("div");
    wrap.className="mat-block";
    const p=matProgress(id);
    wrap.innerHTML=`
      <div class="mat-head">
        <span class="ic">${m.icone}</span>
        <div style="flex:1">
          <h4>${m.nome} ${isComum(id)?'<span class="comum-tag">comum</span>':''}</h4>
          <div class="mat-bar"><span style="width:${p.pct}%"></span></div>
        </div>
        <div class="mat-progress">${p.dom}/${p.total}</div>
      </div><div class="topics"></div>`;
    const topics=wrap.querySelector(".topics");
    m.topicos.forEach((t,i)=>{
      const key=id+":"+i, stv=store.topics[key]||0;
      const row=document.createElement("div");
      row.className="topic"; row.dataset.st=stv;
      row.innerHTML=`<span class="dot" title="Clique para mudar o status"></span><span class="tx">${t}</span>`;
      row.querySelector(".dot").addEventListener("click",()=>{
        const ns=((store.topics[key]||0)+1)%4;
        store.topics[key]=ns; row.dataset.st=ns; save();
        const np=matProgress(id);
        wrap.querySelector(".mat-bar span").style.width=np.pct+"%";
        wrap.querySelector(".mat-progress").textContent=`${np.dom}/${np.total}`;
      });
      topics.appendChild(row);
    });
    wrap.querySelector(".mat-head").addEventListener("click",()=>wrap.classList.toggle("open"));
    return wrap;
  }

  // ============================================================
  //  QUESTÕES
  // ============================================================
  let qOrder=[],qPos=0,qAnswered=false,qBank=[];
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
  function renderQuiz(reset){
    const c=getConc(active), st=ccState(active);
    qBank=concQuestoes(c);
    if(reset||!qOrder.length){qOrder=shuffle(qBank.map((_,i)=>i));qPos=0;}
    $("#view-quiz").innerHTML=`
      <div class="page-head"><h2>Banco de questões — ${c.curto}</h2>
        <p>Itens no estilo Cebraspe das matérias deste concurso. Julgue como <b>Certo</b> ou <b>Errado</b> e leia a justificativa.</p></div>
      <div class="quiz-head">
        <div class="quiz-score">
          <div><b style="color:var(--green)" id="scAcertos">${st.quiz.acertos}</b><small>acertos</small></div>
          <div><b style="color:var(--red)" id="scErros">${st.quiz.erros}</b><small>erros</small></div>
          <div><b id="scTaxa">0%</b><small>aproveitamento</small></div>
        </div>
        <button class="chip" id="qReset">↺ Zerar placar</button>
      </div>
      <div class="card q-card" id="qCard"></div>`;
    $("#qReset").addEventListener("click",()=>{st.quiz={acertos:0,erros:0};save();renderQuiz(true);});
    drawQuestion();
  }
  function updTaxa(){
    const st=ccState(active), a=st.quiz.acertos+st.quiz.erros;
    $("#scTaxa").textContent=(a?Math.round(st.quiz.acertos/a*100):0)+"%";
    $("#scAcertos").textContent=st.quiz.acertos; $("#scErros").textContent=st.quiz.erros;
  }
  function drawQuestion(){
    qAnswered=false;
    const q=qBank[qOrder[qPos]], m=mat(q.materiaId);
    $("#qCard").innerHTML=`
      <div class="q-progress">Questão ${qPos+1} de ${qOrder.length}</div>
      <div class="q-tag"><span class="badge ${isComum(q.materiaId)?'b-sh':'b-p2'}">${m.nome}${isComum(q.materiaId)?' · comum':''}</span></div>
      <div class="q-enun">${q.enunciado}</div>
      <div class="q-btns"><button class="certo" data-v="true">CERTO</button><button class="errado" data-v="false">ERRADO</button></div>
      <div class="q-feedback" id="qFb"></div>
      <button class="q-next" id="qNext">Próxima questão →</button>`;
    updTaxa();
    $$("#qCard .q-btns button").forEach(b=>b.addEventListener("click",()=>answer(b.dataset.v==="true",q)));
    $("#qNext").addEventListener("click",()=>{qPos=(qPos+1)%qOrder.length;drawQuestion();});
  }
  function answer(val,q){
    if(qAnswered)return; qAnswered=true;
    const st=ccState(active), ok=val===q.gab;
    if(ok)st.quiz.acertos++; else st.quiz.erros++; save();
    const fb=$("#qFb"); fb.className="q-feedback show "+(ok?"ok":"no");
    fb.innerHTML=`<b>${ok?"✓ Você acertou!":"✕ Não foi dessa vez."} Gabarito: ${q.gab?"CERTO":"ERRADO"}</b>${q.just}`;
    $("#qNext").classList.add("show");
    $$("#qCard .q-btns button").forEach(b=>b.style.opacity=.6);
    updTaxa();
  }

  // ============================================================
  //  FLASHCARDS
  // ============================================================
  let fcPos=0,fcBank=[];
  function renderFlash(){
    const c=getConc(active); fcBank=concFlashcards(c); fcPos=0;
    $("#view-flash").innerHTML=`
      <div class="page-head"><h2>Flashcards — lei seca</h2>
        <p>Pontos de altíssima incidência das matérias de <b>${c.curto}</b>. Clique no cartão para ver a resposta.</p></div>
      <div class="fc-stage">
        <div class="flashcard" id="fcCard"><div class="fc-inner">
          <div class="fc-face fc-front"><div class="lab">Pergunta</div><p id="fcFront"></p><div class="tip">clique para virar</div></div>
          <div class="fc-face fc-back"><div class="lab" style="color:#8fe0b0">Resposta</div><p id="fcBack"></p><div class="tip">clique para voltar</div></div>
        </div></div>
        <div class="fc-nav"><button id="fcPrev">‹</button><div class="fc-count" id="fcCount"></div><button id="fcNext">›</button></div>
      </div>`;
    $("#fcCard").addEventListener("click",e=>e.currentTarget.classList.toggle("flip"));
    $("#fcPrev").addEventListener("click",()=>{fcPos=(fcPos-1+fcBank.length)%fcBank.length;drawFlash();});
    $("#fcNext").addEventListener("click",()=>{fcPos=(fcPos+1)%fcBank.length;drawFlash();});
    drawFlash();
  }
  function drawFlash(){
    const c=fcBank[fcPos];
    $("#fcCard").classList.remove("flip");
    $("#fcFront").textContent=c.f; $("#fcBack").textContent=c.v;
    $("#fcCount").textContent=`${fcPos+1} / ${fcBank.length}`;
  }

  // ============================================================
  //  ESTRATÉGIA
  // ============================================================
  function renderEstrategia(){
    const c=getConc(active);
    const temPesos=c.pesos&&c.pesos.length;
    const max=temPesos?Math.max(...c.pesos.map(p=>p.qEst)):1;
    const somaP1=temPesos?c.pesos.filter(p=>p.area==="P1").reduce((a,p)=>a+p.qEst,0):0;
    const somaP2=temPesos?c.pesos.filter(p=>p.area==="P2").reduce((a,p)=>a+p.qEst,0):0;
    $("#view-estrategia").innerHTML=`
      <div class="page-head"><h2>Estratégia & pesos — ${c.curto}</h2>
        <p>Onde investir seu tempo e como jogar o jogo da banca.</p></div>
      ${temPesos?`
      <div class="section-title">Peso estimado por matéria</div>
      <div class="card" style="margin-bottom:20px">
        <table><thead><tr><th>Matéria</th><th>Prova</th><th>Questões (est.)</th><th style="width:35%">Peso</th></tr></thead><tbody>
          ${c.pesos.slice().sort((a,b)=>b.qEst-a.qEst).map(p=>`<tr><td>${p.materia}</td><td><span class="badge ${p.area==='P2'?'b-p2':'b-p1'}">${p.area}</span></td><td><b>${p.qEst}</b></td><td><div class="bar"><span style="width:${p.qEst/max*100}%;background:${p.cor}"></span></div></td></tr>`).join("")}
        </tbody></table>
        <p style="margin-top:12px;font-size:12px;color:var(--txt-mut)">Básicas (P1) ≈ ${somaP1} · Específicas (P2) ≈ ${somaP2}. A distribuição por matéria é uma estimativa — o edital informa apenas os totais.</p>
      </div>`:`
      <div class="card" style="margin-bottom:20px"><p style="color:var(--txt-dim)">A distribuição de questões por matéria será detalhada quando sair o edital de ${c.curto}. Enquanto isso, priorize o núcleo comum de Direito.</p></div>`}

      <div class="section-title">Táticas de prova</div>
      <div class="grid g-2">${D.dicas.map(d=>`<div class="card dica"><h4>▸ ${d.t}</h4><p>${d.c}</p></div>`).join("")}</div>

      <div class="section-title">Fases do concurso</div>
      <div class="card"><table><thead><tr><th>Fase</th><th>Conteúdo</th><th>Itens</th><th>Caráter</th></tr></thead><tbody>
        ${c.estrutura.map(e=>`<tr><td><b>${e.prova}</b></td><td>${e.area}</td><td>${e.itens??"—"}</td><td style="font-size:12px;color:var(--txt-dim)">${e.carater}</td></tr>`).join("")}
      </tbody></table></div>`;
  }

  // ============================================================
  //  NAV / ROTEAMENTO
  // ============================================================
  const views={dash:renderDash,plano:renderPlano,edital:renderEdital,quiz:()=>renderQuiz(true),flash:renderFlash,estrategia:renderEstrategia};
  function go(v){
    $$(".view").forEach(el=>el.classList.remove("active"));
    $("#view-"+v).classList.add("active");
    $$("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.v===v));
    (views[v]||renderDash)();
    $(".sidebar").classList.remove("open"); window.scrollTo(0,0);
    const item=NAV.find(n=>n.v===v);
    $("#mobTitle").textContent=(getConc(active)?getConc(active).curto+" · ":"")+(item?item.label:"");
  }
  function openConcurso(id){
    active=id; store.lastConcurso=id; save();
    PLANO=buildPlano(getConc(id));
    planoFiltro="todos"; qOrder=[];
    renderSideConcurso();
    go("dash");
  }
  function openHub(){
    active=null; PLANO=[];
    $$(".view").forEach(el=>el.classList.remove("active"));
    $("#view-hub").classList.add("active");
    renderSideHub(); renderHub(); window.scrollTo(0,0);
    $(".sidebar").classList.remove("open");
  }

  $("#menuBtn").addEventListener("click",()=>$(".sidebar").classList.toggle("open"));
  $("#resetAll").addEventListener("click",()=>{
    if(confirm("Isso apaga TODO o seu progresso de todos os concursos. Continuar?")){ localStorage.removeItem(LS); location.reload(); }
  });

  openHub();
})();
