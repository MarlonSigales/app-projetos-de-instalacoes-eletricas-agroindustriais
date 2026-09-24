"use strict";
/* Projeto Elétrico Agroindustrial — aplicação (depende de js/tabelas.js e js/vendor/pdf-lib.min.js) */
/* ============================================================
   ESTADO
   ============================================================ */
const ANEXOS=[
  {k:"art",t:"ART — Anotação de Responsabilidade Técnica",d:"ART de projeto registrada no CREA (PDF).",etapa:10},
  {k:"situacao",t:"Planta de situação",d:"Acessos, rede da distribuidora, ponto de derivação e posição do padrão de entrada.",etapa:2},
  {k:"arquitetonico",t:"Projeto arquitetônico / planta baixa com pontos",d:"Plantas com pontos de utilização, quadros, rotas de canaletas e baixadas.",etapa:7},
  {k:"unifilar",t:"Diagrama unifilar geral",d:"Do ponto de entrega aos quadros terminais.",etapa:7},
  {k:"multifilar",t:"Diagramas multifilares / força e comando dos motores",d:"Quadros de força (QF), partidas e intertravamentos.",etapa:7},
  {k:"detalhes",t:"Detalhes construtivos",d:"Entrada de serviço, medição, caixas de passagem, aterramento, SPDA.",etapa:7},
  {k:"convencoes",t:"Convenções / simbologia",d:"Legenda conforme NBR 5444 (opcional se já estiver nas pranchas).",etapa:7},
  {k:"outros",t:"Outros documentos",d:"Catálogos, laudos, estudo de proteção, fotos do local.",etapa:10}
];
function blank(){
  return {
    v:1,
    id:{cliente:"",obra:"",atividade:"",local:"",municipio:"",uc:"",distribuidora:"",rt:"",crea:"",art:"",projetista:"",data:new Date().toISOString().slice(0,10)},
    forn:{sistema:"380/220",atend:"BT",classe:"rural",subclasse:"Agroindustrial",tensaoPrim:13.8,subterraneo:false,modalidade:"",trafo:false,trafoKVA:"",rede:"",distRede:"",Lent:15,metEnt:"D",aterr:"TN-S",aerea:true,aq:"AQ2",spda:false,ra:30,ul:50,obs:""},
    par:{temp:30,tempSolo:20,metDist:"B1",metBaix:"B1",agrDist:"feixe",arrF:"trifolio",arrG:"horizontal",ipin:7,dvPartida:10,softLim:3,invLim:1.5,bobina:"220 Vca",icc:6,dpsSempre:false,dvTerm:4,dvTotal:5,dvEnt:1,rho:0.0206,curva:"C",curvaMotor:"D",reserva:20,sobra:10,neutroRed:false,ocupCan:40},
    quadros:[{nome:"QGBT",L:0,met:"B1"}],
    circ:[],
    canaletas:{},
    anexos:Object.fromEntries(ANEXOS.map(a=>[a.k,[]])),
    memo:{},
    precos:{},
    chk:{}
  };
}
function sample(){
  const s=blank();
  s.exemplo=true;
  s.id={cliente:"Agroindústria Exemplo Ltda. (dados fictícios)",obra:"Mini-indústria de beneficiamento de grãos",atividade:"Secagem, descascamento, moagem e ensacamento de grãos",local:"Estrada rural, km 8",municipio:"Pelotas/RS",uc:"0000000",distribuidora:"CEEE Equatorial",rt:"Nome do responsável técnico",crea:"RS000000",art:"",projetista:"Turma 2026.2",data:new Date().toISOString().slice(0,10)};
  s.forn={sistema:"380/220",atend:"BT",classe:"rural",subclasse:"Agroindustrial",tensaoPrim:13.8,subterraneo:false,modalidade:"Convencional monômia",trafo:false,trafoKVA:"",rede:"Rede secundária trifásica 380/220 V da distribuidora",distRede:"30 m",Lent:12,metEnt:"D",aterr:"TN-S",aerea:true,aq:"AQ2",spda:false,ra:30,ul:50,obs:"Padrão de entrada trifásico com medição direta, conforme categoria do RIC da distribuidora."};
  s.quadros=[{nome:"QGBT",L:0,met:"B1"},{nome:"QF-PROD",L:25,met:"D"},{nome:"QL-ADM",L:18,met:"D"}];
  const m=(nome,cv,eta,fp,ld,lb,fd=1,fu=0.87)=>({q:"QF-PROD",nome,tipo:"motor",lig:"3F",qtd:1,pot:cv,unid:"cv",fp,eta,fs:1.25,fu,fd,can:"CN-1",ld,lb,prot:"dj",partida:"direta",fusTipo:"gG"});
  s.circ=[
    Object.assign(m("Secador — ventilador",10,0.895,0.85,20,4),{partida:"yd",prot:"fus"}),
    m("Descascador",7.5,0.895,0.83,14,3),
    Object.assign(m("Moedor (moinho de martelos)",15,0.91,0.85,10,3),{partida:"soft"}),
    Object.assign(m("Ensacadeira com costuradora de sacaria",2,0.83,0.80,8,2.5,0.8),{prot:"djm"}),
    {q:"QF-PROD",nome:"Iluminação do galpão (LED 100 W)",tipo:"ilum",lig:"F+N",qtd:12,pot:100,unid:"W",fp:0.95,eta:1,fu:1,fd:1,can:"CN-1",ld:25,lb:4},
    {q:"QF-PROD",nome:"Tomada industrial 3P+T (manutenção)",tipo:"tue",lig:"3F+N",qtd:1,pot:3000,unid:"VA",fp:0.8,eta:1,fu:1,fd:0.5,can:"CN-1",ld:15,lb:1.5,local:"molhado"},
    {q:"QL-ADM",nome:"Iluminação escritório (LED 40 W)",tipo:"ilum",lig:"F+N",qtd:6,pot:40,unid:"W",fp:0.95,eta:1,fu:1,fd:1,can:"CN-2",ld:8,lb:3},
    {q:"QL-ADM",nome:"TUG escritório",tipo:"tug",lig:"F+N",qtd:6,pot:200,unid:"VA",fp:0.8,eta:1,fu:1,fd:0.7,can:"CN-2",ld:10,lb:1.5}
  ];
  return s;
}
let S;
const LSKEY="projeto-agro-eletrico-v2";
function load(){
  try{const raw=localStorage.getItem(LSKEY);if(raw){const d=JSON.parse(raw);S=normalizar(d);S.anexos=blank().anexos;return true;}}catch(e){}
  S=sample();return false;
}
let saveT;
function persist(){clearTimeout(saveT);saveT=setTimeout(()=>{try{const c=Object.assign({},S,{anexos:undefined});localStorage.setItem(LSKEY,JSON.stringify(c));}catch(e){}},300);}

/* ============================================================
   CÁLCULO
   ============================================================ */
const fmt=(x,d=1)=>isFinite(x)?Number(x).toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d}):"—";
const fmt0=x=>fmt(x,0);
const sec=s=>String(s).replace(".",",");
function fct(met){const p=S.par;return met==="D"?(T40_SOLO[p.tempSolo]??1):(T40_AR[p.temp]??1);}
function itab(met,nc,s){const i=SEC.indexOf(s);const p=S.par;
  if(T36[met])return T36[met][nc>=3?1:0][i];
  if(met==="E")return T38[nc>=3?"E3":"E2"][i];
  if(met==="F")return nc>=3?T38[p.arrF==="plano"?"F3p":"F3t"][i]:T38.F2[i];
  if(met==="G")return T38[p.arrG==="vertical"?"Gv":"Gh"][i];
  return T36.B1[nc>=3?1:0][i];}
function brkFor(ib,iz){return BRK.find(b=>b>=ib&&b<=iz);}
function condArea(d){return Math.PI*d*d/4;}
function eletroduto(conds){ // conds: array de seções
  const n=conds.length;const soma=conds.reduce((a,s)=>a+condArea(DEXT[s]||30),0);
  const tx=n===1?0.53:n===2?0.31:0.40;
  const e=ELETRODUTOS.find(([,di])=>condArea(di)*tx>=soma);
  return {nome:e?e[0]:"acima de DN 110 — dividir em 2 eletrodutos",soma,tx,ocup:e?soma/condArea(e[1]):null};
}
function neutro(s,lig){if(!LIG[lig].n)return 0;if(lig==="3F+N"&&S.par.neutroRed&&s>25)return T48[s]||s;return s;}

function sizeCable({ib,iuse,cosf,nc,vref,kdv,segs,smin,dvLim,start=null,prot="dj"}){
  // segs: [{met,fca,L}] ; retorna menor seção que atende capacidade, queda e coordenação
  const Ltot=segs.reduce((a,g)=>a+(+g.L||0),0);
  let crit="seção mínima (Tab. 47)";
  for(const s of SEC){
    if(s<smin)continue;
    const act=segs.filter(g=>(+g.L||0)>0);const use=act.length?act:segs.slice(0,1);
    const iz=Math.min(...use.map(g=>itab(g.met,nc,s)*fct(g.met)*g.fca));
    if(iz<ib){crit="capacidade de condução (Tab. 36/38/40/42)";continue;}
    const dv=kdv*S.par.rho*Ltot*iuse*cosf/s/vref*100;
    if(dv>dvLim){crit="queda de tensão (6.2.7)";continue;}
    const dvp=start?kdv*S.par.rho*Ltot*start.I*start.cos/s/vref*100:0;
    if(start&&dvp>start.lim){crit="queda na partida do motor (6.5.1.3.3)";continue;}
    const inom=prot==="dj"?brkFor(ib,iz):null;
    if(prot==="dj"&&!inom){crit="coordenação Ib ≤ In ≤ Iz (5.3.4)";continue;}
    return {s,iz,dv,dvp,inom,crit,Ltot};
  }
  return {s:null,iz:0,dv:NaN,inom:null,crit:"fora da faixa de tabela (> 300 mm²): dividir circuito ou usar condutores em paralelo",Ltot};
}

let R; // resultados
function calc(){
  const p=S.par, sys=SISTEMAS[S.forn.sistema];
  // agrupamento nas canaletas
  if(!sys){S.forn.sistema="380/220";return calc();}
  const cls=classificar();
  const grp={};S.circ.forEach(c=>{if(c.can&&(+c.ld||0)>0&&ligOK(c.lig,sys))grp[c.can]=(grp[c.can]||0)+1;});
  const out=S.circ.map((c,i)=>{
    const L=LIG[c.lig]||LIG["F+N"];const itSemN=S.forn.aterr==="IT"&&L.n;const ok=ligOK(c.lig,sys)&&!itSemN;
    const qtd=+c.qtd||0,pot=+c.pot||0,fp=Math.min(Math.max(+c.fp||1,0.1),1),eta=Math.min(Math.max(+c.eta||1,0.1),1);
    let P,Sva;
    if(c.tipo==="motor"){P=qtd*pot*(c.unid==="kW"?1000:735.5)/eta;Sva=P/fp;}
    else if(c.unid==="VA"){Sva=qtd*pot;P=Sva*fp;}
    else {P=qtd*pot*(c.unid==="kW"?1000:1);Sva=P/fp;}
    const Q=Math.sqrt(Math.max(Sva*Sva-P*P,0));
    const vref=ok?ligVolt(c.lig,sys):sys.vfn;
    const I=Sva/(L.div*vref);
    // 6.5.1.3.1: IB no mínimo igual à corrente nominal do motor (× fator de serviço, se explorado)
    const fs=c.tipo==="motor"?Math.max(+c.fs||1,1):1;const ib=I*fs;
    // 6.5.1.3.3: partida de um motor do circuito (Ip/In) com os demais em regime, FP de rotor bloqueado 0,3
    const mot=c.tipo==="motor"&&qtd>0;const partida=PARTIDAS[c.partida]?c.partida:"direta";const prot=mot&&PROTS[c.prot]?c.prot:"dj";
    const kp=partida==="yd"?(+p.ipin||7)/3:partida==="soft"?Math.min(+p.softLim||3,+p.ipin||7):partida==="inv"?(+p.invLim||1.5):(+p.ipin||7); // Ip efetiva / In
    const start=mot?{I:(I/qtd)*(kp+(qtd-1)),cos:0.3,lim:(+p.dvPartida||10)-(+p.dvEnt||0)}:null;
    const fcaD=fca(grp[c.can]||1,p.agrDist);
    const segs=[{met:p.metDist,fca:fcaD,L:+c.ld||0},{met:p.metBaix,fca:1,L:+c.lb||0}];
    const kdv=c.lig==="2F+N"&&sys.ang===180?1:L.kdv;
    const nc=c.lig==="2F+N"&&sys.ang===180?2:L.nc; // Tab. 46: monofásico a três condutores = 2 carregados
    const r=ok?sizeCable({ib,iuse:ib,cosf:fp,nc,vref,kdv,segs,smin:SMIN[c.tipo]||2.5,dvLim:+p.dvTerm,start,prot})
      :{s:null,iz:0,dv:NaN,inom:null,crit:itSemN?`circuito com neutro incompatível com esquema IT sem neutro distribuído`:`ligação ${L.txt} incompatível com o sistema ${sys.nome}`,Ltot:(+c.ld||0)+(+c.lb||0)};
    let sn=r.s?neutro(r.s,c.lig):0, spe=r.s?sPE(r.s):0;
    // TN-C: neutro e PE combinados (PEN) só com seção ≥ 10 mm² Cu (6.4.3.4.1)
    const pen=S.forn.aterr==="TN-C"&&sn>0&&r.s>=10;const penFalta=S.forn.aterr==="TN-C"&&sn>0&&r.s&&r.s<10;
    if(pen){sn=Math.max(sn,spe,10);spe=0;}
    const conds=r.s?[...Array(L.nf).fill(r.s),...(sn?[sn]:[]),...(spe?[spe]:[])]:[];
    const ed=r.s?eletroduto(conds):{nome:"—"};
    const curva=c.tipo==="motor"?p.curvaMotor:p.curva;
    const kWm=c.unid==="kW"?pot:pot*0.7355, cvm=c.unid==="kW"?pot/0.7355:pot;
    const mp=mot&&r.s?protMotor({In1:I/qtd,ib:ib/qtd,kp,partida,prot,fusTipo:c.fusTipo==="aM"?"aM":"gG",nf:L.nf,qtd,V:vref,kW:kWm,cv:cvm}):null;
    const dr=r.s?drCirc(c,ib,r.inom,L,partida):null;
    return {i,c,L,ok,mp,partida,prot,dr,pen,penFalta,P,S:Sva,Q,I,ib,vref,fcaD,nGrp:grp[c.can]||1,fct:fct(p.metDist),...r,sn,spe,conds,ed,curva,
      dem:P*(+c.fu||1)*(+c.fd||1)/1000, demQ:Q*(+c.fu||1)*(+c.fd||1)/1000};
  });
  // balanceamento de fases (maior carga primeiro, na fase/par menos carregado)
  const PH=FASES.slice(0,sys.fases);const ph={R:0,S:0,T:0};const order=[...out].sort((a,b)=>b.S-a.S);
  const pairs=sys.fases===3?[["R","S"],["S","T"],["T","R"]]:[["R","S"]];
  order.forEach(o=>{
    if(!o.ok){o.fases="";return;}
    const nf=o.L.nf;
    if(nf===3){PH.forEach(k=>ph[k]+=o.S/3);o.fases="RST";}
    else if(nf===2){const pr=pairs.reduce((b,pp)=>ph[pp[0]]+ph[pp[1]]<ph[b[0]]+ph[b[1]]?pp:b);ph[pr[0]]+=o.S/2;ph[pr[1]]+=o.S/2;o.fases=pr.join("");}
    else {const k=PH.reduce((b,x)=>ph[x]<ph[b]?x:b,PH[0]);ph[k]+=o.S;o.fases=k;}
  });
  // canaletas
  const cans={};
  out.forEach(o=>{if(!o.c.can||!(+o.c.ld>0))return;const k=o.c.can;cans[k]=cans[k]||{k,circ:[],area:0,maxL:0};cans[k].circ.push(o.i+1);cans[k].area+=o.conds.reduce((a,s)=>a+condArea(DEXT[s]||30),0);cans[k].maxL=Math.max(cans[k].maxL,+o.c.ld);});
  Object.values(cans).forEach(g=>{
    const tx=(+p.ocupCan||40)/100;const e=ELETROCALHAS.find(([w,h])=>w*h*tx>=g.area);
    g.dim=e?`${e[0]} × ${e[1]} mm`:"acima de 600 × 100 mm — dividir";g.ocup=e?g.area/(e[0]*e[1]):null;
    const meta=S.canaletas[g.k]||{};g.L=(+meta.L>0)?+meta.L:g.maxL;g.Lauto=!(+meta.L>0);g.fca=fca(g.circ.length,p.agrDist);
  });
  // demanda e alimentadores
  const inst=out.reduce((a,o)=>a+o.P,0)/1000;
  const dem=out.reduce((a,o)=>a+o.dem,0), demQ=out.reduce((a,o)=>a+o.demQ,0);
  const res=1+(+p.reserva||0)/100;
  const demS=Math.hypot(dem,demQ), fpG=demS>0?dem/demS:1;
  const cfg=feederCfg(sys);
  const Ient=demS*res*1000/(cfg.div*cfg.vref);
  const snd=(s)=>sys.fases===3&&S.par.neutroRed&&s>25?(T48[s]||s):s;
  const feeder=(I,L,met,lim,fp)=>{const r=sizeCable({ib:I,iuse:I/res,cosf:fp,nc:cfg.nc,vref:cfg.vref,kdv:cfg.kdv,segs:[{met,fca:1,L}],smin:2.5,dvLim:Math.max(lim,0.2)});
    r.nf=cfg.nf;r.polos=cfg.polos;
    if(r.s){const semN=S.forn.aterr==="IT";r.sn=semN?0:snd(r.s);r.spe=sPE(r.s);
      r.pen=!semN&&r.s>=10&&(S.forn.aterr==="TN-C"||(S.forn.aterr==="TN-C-S"&&penOk));
      if(r.pen){r.sn=Math.max(r.sn,r.spe,10);r.spe=0;}
      r.conds=[...Array(cfg.nf).fill(r.s),...(r.sn?[r.sn]:[]),...(r.spe?[r.spe]:[])];r.ed=eletroduto(r.conds);
      r.txt=`${cfg.nf} × ${sec(r.s)}${r.sn?` + ${sec(r.sn)}${r.pen?" (PEN)":""}`:""}${r.spe?` + ${sec(r.spe)}`:""}`;}return r;};
  let penOk=true;
  const ent=feeder(Ient,+S.forn.Lent||0,S.forn.metEnt,+p.dvEnt,fpG);penOk=false; // TN-C-S: PEN só no alimentador de entrada
  ent.I=Ient;ent.S=demS*res;
  const quadros=S.quadros.map(q=>{
    const cs=out.filter(o=>o.c.q===q.nome);
    const P=cs.reduce((a,o)=>a+o.dem,0),Qq=cs.reduce((a,o)=>a+o.demQ,0),Sq=Math.hypot(P,Qq)*res;
    const fpq=Sq>0?P*res/Sq:1;
    const I=Sq*1000/(cfg.div*cfg.vref);
    const maxT=cs.reduce((a,o)=>Math.max(a,o.dv||0),0);
    const lim=(+p.dvTotal)-(ent.dv||0)-maxT;
    const inst=cs.reduce((a,o)=>a+o.P,0)/1000;
    const f=(+q.L>0&&I>0)?feeder(I,+q.L,q.met,lim,fpq):null;
    const ph={R:0,S:0,T:0};cs.forEach(o=>{const n=o.fases.length;if(!n)return;o.fases.split("").forEach(k=>ph[k]+=o.S/n);});
    return {q,cs,P,Q:Qq,S:Sq,I,f,inst,maxT,ph,lim};
  });
  out.forEach(o=>{const q=quadros.find(x=>x.q.nome===o.c.q);const dvF=(q&&q.f?q.f.dv||0:0)+(ent.dv||0);o.dvTot=(o.dv||0)+dvF;o.dvOk=o.dvTot<=+p.dvTotal;
    if(o.c.tipo==="motor"&&o.s){o.dvpTot=o.dvp+dvF;o.dvpOk=o.dvpTot<=(+p.dvPartida||10);}else{o.dvpTot=null;o.dvpOk=true;}});
  const orf=out.filter(o=>!S.quadros.some(q=>q.nome===o.c.q));
  const incompat=out.filter(o=>!o.ok);
  const issues=[];const at=S.forn.aterr;
  if(at==="TN-C"&&out.some(o=>o.dr))issues.push("Há circuitos que exigem DR, mas no esquema TN-C o DR não pode fazer o seccionamento automático (5.1.2.2.4.2-f). Converta em TN-C-S imediatamente a montante do DR, separando PEN em N e PE.");
  if(at==="TN-C"&&out.some(o=>o.penFalta))issues.push(`Circuitos ${out.filter(o=>o.penFalta).map(o=>o.i+1).join(", ")} têm seção abaixo de 10 mm²: o PEN exige no mínimo 10 mm² Cu (6.4.3.4.1). Nesses circuitos, neutro e PE devem ser separados (TN-C-S a partir do quadro).`);
  if(at==="TN-C")issues.push("A NBR 5410 (5.4.3.6) manda separar o PEN em N e PE no ponto de entrada da edificação ou no quadro principal; o TN-C só é admitido nas exceções da própria norma.");
  if(at==="IT"||at==="IT-N")issues.push("Esquema IT: prever dispositivo supervisor de isolamento (DSI) com sinalização sonora e/ou visual (5.1.2.2.4.4-d) e verificar RA × Id ≤ UL.");
  if(at==="TT")issues.push(`Esquema TT: o seccionamento automático é feito por DR em todos os circuitos (5.1.2.2.4.3). Com RA = ${fmt(+S.forn.ra||0,1)} Ω e UL = ${S.forn.ul} V, IΔn ≤ ${fmt((+S.forn.ul||50)/Math.max(+S.forn.ra||1,0.1)*1000,0)} mA.`);
  const dps=dpsCalc(sys);
  if(cls.grupo==="B"&&inst>75)cls.avisos.push("Carga instalada acima de 75 kW: pela REN ANEEL nº 1.000/2021 (art. 23), o atendimento deve ser em tensão primária (Grupo A).");
  if(cls.grupo==="A"&&dem*res>2500&&(+S.forn.tensaoPrim||0)<69)cls.avisos.push("Demanda acima de 2.500 kW: a REN 1.000/2021 prevê conexão em tensão igual ou superior a 69 kV.");
  if(sys.fases<3&&out.some(o=>o.c.tipo==="motor"&&o.ok&&o.c.pot>=5))cls.avisos.push("Motores de 5 cv ou mais em sistema mono/bifásico: verifique o limite de potência por motor no RIC da distribuidora.");
  R={out,ph,PH,cans,inst,dem,demQ,demS,fpG,Ient,ent,quadros,res,orf,sys,cfg,cls,incompat,issues,dps};
  return R;
}

/* ============================================================
   ETAPAS
   ============================================================ */
const STEPS=[
  {k:"id",t:"Identificação",s:"Cliente, obra, RT"},
  {k:"prel",t:"Informações preliminares",s:"Classe, alimentação, situação"},
  {k:"par",t:"Critérios de dimensionamento",s:"Métodos, temperatura, limites"},
  {k:"cargas",t:"Previsão de cargas",s:"Circuitos, P/S, FP, quantidades"},
  {k:"dim",t:"Condutores e proteção",s:"Bitolas, disjuntores, eletrodutos"},
  {k:"can",t:"Canaletas de distribuição",s:"Agrupamento e ocupação"},
  {k:"dem",t:"Demanda e entrada",s:"Quadros, alimentadores, fases"},
  {k:"des",t:"Desenhos",s:"Plantas, unifilar, multifilar"},
  {k:"memo",t:"Memorial descritivo",s:"Texto gerado e editável"},
  {k:"art",t:"ART e documentos",s:"ART, especificações, materiais"},
  {k:"fim",t:"Gerar projeto",s:"PDF completo"}
];
let cur=0;
function stepStatus(k){
  const a=S.anexos, id=S.id;
  switch(k){
    case "id":return id.cliente&&id.obra&&id.rt&&id.crea?"done":(id.cliente||id.obra?"part":"");
    case "prel":return a.situacao.length?"done":(S.forn.rede?"part":"");
    case "par":return "done";
    case "cargas":return S.circ.length?"done":"";
    case "dim":return R.out.length&&R.out.every(o=>o.s&&o.dvOk)?"done":(R.out.length?"part":"");
    case "can":return Object.keys(R.cans).length?(Object.values(R.cans).every(g=>g.ocup!==null)?"done":"part"):"";
    case "dem":return R.dem>0&&R.ent.s?"done":"";
    case "des":{const n=["arquitetonico","unifilar","multifilar","detalhes"].filter(x=>a[x].length).length;return n===4?"done":n?"part":"";}
    case "memo":return "done";
    case "art":return a.art.length?"done":"";
    default:return "";
  }
}
function renderSteps(){
  document.getElementById("stepList").innerHTML=STEPS.map((s,i)=>`<li><button type="button" data-step="${i}" ${i===cur?'aria-current="step"':""}><span class="n">${String(i+1).padStart(2,"0")}</span><span class="l">${s.t}<small>${s.s}</small></span><span class="d ${stepStatus(s.k)}" aria-hidden="true"></span></button></li>`).join("");
}
const esc=s=>String(s??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
function fld(path,label,{type="text",hint="",opts=null,step=null,ph=""}={}){
  const v=getP(path);
  let inp;
  if(opts)inp=`<select id="f-${path}" data-bind="${path}">${opts.map(([val,l])=>`<option value="${esc(val)}" ${String(v)===String(val)?"selected":""}>${esc(l)}</option>`).join("")}</select>`;
  else if(type==="textarea")inp=`<textarea id="f-${path}" data-bind="${path}" placeholder="${esc(ph)}">${esc(v)}</textarea>`;
  else inp=`<input id="f-${path}" data-bind="${path}" type="${type}" ${step?`step="${step}"`:""} value="${esc(v)}" placeholder="${esc(ph)}">`;
  return `<label class="f" for="f-${path}">${label}${inp}${hint?`<span class="h">${hint}</span>`:""}</label>`;
}
function getP(path){return path.split(".").reduce((o,k)=>o?.[k],S);}
function setP(path,val){const ks=path.split(".");let o=S;ks.slice(0,-1).forEach(k=>o=o[k]);const old=o[ks.at(-1)];o[ks.at(-1)]=(typeof old==="number")?(val===""?"":+val):(typeof old==="boolean"?!!val:val);}
function head(i,extra=""){const s=STEPS[i];return `<div class="sheet-head"><div><div class="tag">Etapa ${String(i+1).padStart(2,"0")} de ${STEPS.length}</div><h2>${s.t}</h2></div>${extra}</div>`;}
function nav(){return `<div class="nav"><button class="btn ghost" type="button" data-go="${cur-1}" ${cur===0?"hidden":""}>← ${cur>0?STEPS[cur-1].t:""}</button><span></span>${cur<STEPS.length-1?`<button class="btn primary" type="button" data-go="${cur+1}">${STEPS[cur+1].t} →</button>`:""}</div>`;}
function attBlock(k){
  const a=ANEXOS.find(x=>x.k===k);const files=S.anexos[k];
  return `<div class="att drop" data-drop="${k}"><div><div class="t">${a.t}</div><div class="d">${a.d} PDF, PNG ou JPG — arraste aqui ou selecione.</div></div>
  <div><button class="btn small" type="button" data-pick="${k}">Anexar arquivo</button><input type="file" id="pick-${k}" data-file="${k}" accept="application/pdf,image/png,image/jpeg" multiple></div>
  ${files.length?`<ul>${files.map((f,j)=>`<li><span>${esc(f.name)} · ${fmt(f.size/1024,0)} kB</span><button class="btn small danger" type="button" data-rmfile="${k}:${j}">Remover</button></li>`).join("")}</ul>`:""}</div>`;
}

const V={};
V.id=()=>`${head(0)}
<p class="intro">Dados básicos de identificação do projeto (item H da aula). Eles alimentam o carimbo, a capa, a carta à distribuidora e o memorial descritivo.</p>
<div class="grid wide">
${fld("id.cliente","Cliente / proprietário")}${fld("id.obra","Obra / empreendimento",{ph:"Ex.: Unidade de beneficiamento de grãos"})}
${fld("id.atividade","Atividade agroindustrial",{ph:"Ex.: secagem e armazenagem de grãos"})}${fld("id.local","Endereço / localização")}
${fld("id.municipio","Município / UF")}${fld("id.uc","Unidade consumidora (UC)")}
${fld("id.distribuidora","Distribuidora",{ph:"Ex.: CEEE Equatorial, RGE"})}${fld("id.data","Data",{type:"date"})}
</div>
<div class="block"><h3>Responsabilidade técnica</h3><div class="grid wide">
${fld("id.rt","Responsável técnico")}${fld("id.crea","Registro CREA")}${fld("id.art","Nº da ART",{hint:"Anexe a ART na etapa 10."})}${fld("id.projetista","Projetista / desenhista")}
</div></div>${nav()}`;

function dpsCard(){const d=R.dps;
  return `<p class="note ${d.req?"warn":""}">${d.req?`<b>DPS obrigatório</b> no QGBT: ${d.motivo}.`:d.incl?"<b>DPS incluído</b> por opção de projeto (não obrigatório pelas condições informadas).":"DPS não obrigatório pelas condições informadas (5.4.2.1.1)."}${d.incl?` ${d.cls1?"Classe I":"Classe II"}, ${d.con}: ${d.itens.map(it=>`${it.n} × ${it.mod} (Uc ≥ ${it.uc} V, ${it.i})`).join(" + ")}; Up ≤ ${fmt(d.up,1)} kV (Tab. 31, categoria II; Tab. 49).`:""}</p>`;}
function clsCard(){const c=R.cls,sys=R.sys;
  return `<div class="grid" style="margin-top:4px">
  <div class="card"><h3>Grupo</h3><div class="big">${c.grupo}</div><div class="mono" style="font-size:12px;color:var(--muted)">subgrupo ${c.sub}</div></div>
  <div class="card"><h3>Classe</h3><div style="font-weight:600">${esc(c.classeT)}</div><div style="font-size:12.5px;color:var(--muted)">${esc(c.subclasse)}</div></div>
  <div class="card"><h3>Tarifa</h3><div style="font-weight:600">${esc(c.modalidade)}</div><div style="font-size:12.5px;color:var(--muted)">${c.grupo==="A"?"com demanda contratada (mín. 30 kW)":"cobrança por consumo (kWh)"}</div></div>
  <div class="card"><h3>Alimentação</h3><div style="font-weight:600">${esc(sys.nome)}</div><div class="mono" style="font-size:12px;color:var(--muted)">${sys.fases} fase(s) · ${sys.vfn} V F-N${sys.vff?` · ${sys.vff} V F-F`:""}</div></div>
  </div>${c.avisos.map(a=>`<p class="note warn" style="margin-top:8px">${a}</p>`).join("")}`;}
V.prel=()=>`${head(1)}
<p class="intro">Informações preliminares (item A): classe do consumidor, condições de fornecimento informadas pela distribuidora, planta de situação e tipo de atendimento. Consulte o regulamento de instalações consumidoras (RIC) da distribuidora local.</p>
<div class="block" style="margin-top:0;border-top:0;padding-top:0"><h3>Classificação da unidade consumidora (REN ANEEL nº 1.000/2021)</h3>
<div class="grid wide">
${fld("forn.classe","Classe",{opts:Object.entries(CLASSES).map(([k,v])=>[k,v.t])})}
${fld("forn.subclasse","Subclasse",{opts:(CLASSES[S.forn.classe]||CLASSES.rural).sub.map(x=>[x,x])})}
${fld("forn.atend","Tensão de fornecimento",{opts:[["BT","Secundária, menor que 2,3 kV (Grupo B)"],["MT","Primária, 2,3 kV ou mais (Grupo A)"]]})}
${S.forn.atend==="MT"?fld("forn.tensaoPrim","Tensão primária nominal (kV)",{type:"number",step:"0.1",hint:"Ex.: 13,8 · 23,1 · 34,5 · 69"}):""}
${fld("forn.modalidade","Modalidade tarifária",{opts:R.cls.mods.map(x=>[x,x])})}
</div>
${S.forn.atend==="MT"?`<label class="chk"><input type="checkbox" data-bind="forn.subterraneo" ${S.forn.subterraneo?"checked":""}> Atendimento a partir de sistema subterrâneo em tensão secundária (subgrupo AS)</label>`:""}
<div data-live="cls">${clsCard()}</div>
</div>
<div class="block"><h3>Sistema de fornecimento</h3>
<div class="grid wide">
${fld("forn.sistema","Tipo de alimentação (tensão secundária)",{opts:Object.entries(SISTEMAS).map(([k,v])=>[k,v.nome]),hint:"Define as ligações possíveis dos circuitos e o alimentador de entrada."})}
${fld("forn.rede","Rede existente no local",{ph:"Ex.: rede MT 13,8 kV trifásica"})}${fld("forn.distRede","Distância até o ponto de derivação",{ph:"Ex.: 80 m"})}
${fld("forn.trafoKVA","Transformador próprio (kVA)",{type:"text",hint:"Deixe em branco se atendido em BT."})}
${fld("forn.aterr","Esquema de aterramento",{opts:Object.entries(ATERR),hint:"Padrão TN-S."})}
${S.forn.aterr==="TT"?fld("forn.ra","RA — resistência do eletrodo + PE das massas (Ω)",{type:"number",step:"0.1"})+fld("forn.ul","UL — tensão de contato limite (V)",{opts:[[50,"50 V (situação 1)"],[25,"25 V (situação 2)"]]}):""}
${fld("forn.aq","Descargas atmosféricas (Tab. 15)",{opts:[["AQ1","AQ1 — até 25 dias de trovoada por ano"],["AQ2","AQ2 — mais de 25 dias de trovoada por ano"],["AQ3","AQ3 — exposição direta"]]})}
</div></div>
<label class="chk"><input type="checkbox" data-bind="forn.aerea" ${S.forn.aerea?"checked":""}> Alimentação por linha total ou parcialmente aérea</label>
<label class="chk"><input type="checkbox" data-bind="forn.spda" ${S.forn.spda?"checked":""}> Edificação com SPDA ou sujeita a descargas diretas (DPS classe I)</label>
<label class="chk"><input type="checkbox" data-bind="par.dpsSempre" ${S.par.dpsSempre?"checked":""}> Incluir DPS mesmo quando não obrigatório</label>
<div data-live="dps">${dpsCard()}</div>
<div class="block">${fld("forn.obs","Observações sobre o fornecimento",{type:"textarea",ph:"Restrições da rede, garantia de suprimento, gerador de emergência, previsão de ampliação..."})}</div>
<div class="block"><h3>Anexo desta etapa</h3>${attBlock("situacao")}</div>${nav()}`;

V.par=()=>{const p=S.par;return `${head(2)}
<p class="intro">Critérios adotados em todo o dimensionamento. A distribuição horizontal segue em canaletas/eletrocalhas e cada ponto recebe uma baixada em eletroduto. O cálculo usa o trecho mais restritivo dos dois.</p>
<div class="grid wide">
${fld("par.metDist","Método de referência — distribuição (canaleta)",{opts:Object.entries(METODOS).map(([k,v])=>[k,v])})}
${fld("par.metBaix","Método de referência — baixada (eletroduto)",{opts:Object.entries(METODOS).map(([k,v])=>[k,v])})}
${fld("par.agrDist","Forma de agrupamento na distribuição — Tab. 42",{opts:Object.entries(T42).map(([k,v])=>[k,v.t])})}
${fld("par.arrF","Método F com 3 condutores carregados",{opts:[["trifolio","Trifólio"],["plano","Justapostos em plano"]]})}
${fld("par.arrG","Método G — disposição",{opts:[["horizontal","Espaçados na horizontal"],["vertical","Espaçados na vertical"]]})}
${fld("par.temp","Temperatura ambiente (°C) — Tab. 40",{opts:Object.keys(T40_AR).map(t=>[+t,`${t} °C  (FCT ${T40_AR[t].toFixed(2)})`])})}
${fld("par.tempSolo","Temperatura do solo (°C) — método D",{opts:Object.keys(T40_SOLO).map(t=>[+t,`${t} °C  (FCT ${T40_SOLO[t].toFixed(2)})`])})}
${fld("par.dvTerm","Queda máx. circuitos terminais (%)",{type:"number",step:"0.1",hint:"NBR 5410 6.2.7.2: 4 %."})}
${fld("par.dvTotal","Queda máx. total (%)",{type:"number",step:"0.1",hint:"6.2.7.1: 7 % a partir do transformador MT/BT próprio, do transformador da distribuidora quando o ponto de entrega for nele, ou do gerador próprio; 5 % a partir do ponto de entrega nos demais casos em tensão secundária."})}
${fld("par.dvEnt","Parcela para o alimentador de entrada (%)",{type:"number",step:"0.1"})}
${fld("par.ipin","Corrente de partida dos motores (Ip/In)",{type:"number",step:"0.1",hint:"Dado de placa/catálogo; partida direta típica 6 a 8."})}
${fld("par.bobina","Tensão de comando (bobinas dos contatores)",{opts:[["24 Vcc","24 Vcc"],["24 Vca","24 Vca"],["110 Vca","110 Vca"],["127 Vca","127 Vca"],["220 Vca","220 Vca"],["380 Vca","380 Vca"]]})}
${fld("par.icc","Corrente de curto-circuito presumida nos quadros (kA)",{type:"number",step:"0.5",hint:"Define a capacidade de interrupção mínima (Icn/Icu) dos disjuntores; obtenha do estudo de curto ou da distribuidora."})}
${fld("par.softLim","Soft-starter: limite de corrente na partida (× In)",{type:"number",step:"0.1",hint:"Ajuste típico 2 a 4 × In."})}
${fld("par.invLim","Inversor: corrente na partida (× In)",{type:"number",step:"0.1",hint:"Limitada pelo inversor; típico até 1,5 × In."})}
${fld("par.dvPartida","Queda máx. na partida do motor (%)",{type:"number",step:"0.5",hint:"6.5.1.3.3: 10 % nos terminais do dispositivo de partida (FP de rotor bloqueado 0,3)."})}
${fld("par.rho","Resistividade do cobre (Ω·mm²/m)",{type:"number",step:"0.0001",hint:"0,0206 ≈ cobre a 70 °C."})}
${fld("par.curva","Curva dos disjuntores (iluminação/tomadas)",{opts:[["B","B"],["C","C"],["D","D"]]})}
${fld("par.curvaMotor","Curva dos disjuntores de motores",{opts:[["C","C"],["D","D"]],hint:"Verifique a corrente de partida (Ip/In) na placa."})}
${fld("par.reserva","Reserva para ampliação (%)",{type:"number",step:"1"})}
${fld("par.sobra","Sobra de cabo na lista de materiais (%)",{type:"number",step:"1"})}
${fld("par.ocupCan","Ocupação máx. das canaletas (%)",{type:"number",step:"1",hint:"A NBR 5410 fixa taxa de ocupação só para eletrodutos (6.2.11.1.6). Para canaletas e eletrocalhas, 40 % é critério de projeto adotado; siga o fabricante."})}
</div>
<label class="chk"><input type="checkbox" data-bind="par.neutroRed" ${p.neutroRed?"checked":""}> Permitir neutro reduzido (Tab. 48, 6.2.6.2.6) em circuitos trifásicos com fase acima de 25 mm², presumivelmente equilibrados, 3ª harmônica até 15 % e neutro protegido contra sobrecorrentes</label>
<details><summary>Como o cálculo é feito</summary>
<div class="formula">1. Corrente:  I = S / V (F+N, 2F)   ·   I = S / (√3 · Vff) (3F)   ·   S = P / FP
   Motor:  P = cv × 735,5 / η   →   Ib = In × FS (6.5.1.3.1)
   Partida: ΔV% com I = Ip de um motor + In dos demais e cos φ = 0,3 ≤ 10 % (6.5.1.3.3)
2. Capacidade:  Iz = I(Tab. 36 ou 38) × FCT(Tab. 40) × FCA(Tab. 42) ≥ Ib, no pior trecho (canaleta ou baixada)
3. Queda:  ΔV% = k · ρ · L · Ib · cos φ / (S · V) × 100     (6.2.7.4; k = 2 F+N/2F, √3 trifásico, 1 no monofásico a 3 fios)
4. Proteção:  Ib ≤ In ≤ Iz (5.3.4)  — disjuntores NBR NM 60898 (I2 = 1,45 In)
5. Seção final = maior entre: mínima (Tab. 47), capacidade, queda, partida de motor e coordenação
   Condutores carregados pela Tab. 46 (monofásico a 3 condutores = 2; duas fases com neutro = 3)
6. Neutro = fase (6.2.6.2.2 e 6.2.6.2.4; Tab. 48 se permitido) · PE pela Tab. 58 (S/2 na seção padronizada mais próxima)
7. Eletroduto: ocupação ≤ 53 % (1 condutor), 31 % (2), 40 % (3 ou mais) — 6.2.11.1.6</div>
<p class="note" style="margin-top:8px">A queda de tensão usa o modelo resistivo (sem reatância), adequado até cerca de 25 mm². Em seções maiores, confira com a impedância do catálogo. Nos métodos E, F e G a tabela 38 considera cabos ao ar livre; para a forma de agrupamento, escolha a linha da Tab. 42 que corresponde à instalação.</p>
</details>
<details><summary>Ver tabelas de capacidade de condução usadas (A)</summary>
<p class="note" style="margin-bottom:8px">Cobre, isolação PVC 70 °C, ambiente 30 °C (solo 20 °C no método D). Confira os valores com o seu exemplar da NBR 5410 antes de usar em projeto real.</p>
<div class="tbl"><table><thead><tr><th>mm²</th>${["A1","A2","B1","B2","C","D"].map(m=>`<th class="r">${m} 2c</th><th class="r">${m} 3c</th>`).join("")}<th class="r">E 2c</th><th class="r">E 3c</th><th class="r">F 2c</th><th class="r">F 3c trif.</th><th class="r">F 3c plano</th><th class="r">G hor.</th><th class="r">G vert.</th></tr></thead>
<tbody>${SEC.map((x,i)=>`<tr><td class="mono">${sec(x)}</td>${["A1","A2","B1","B2","C","D"].map(m=>`<td class="num">${sec(T36[m][0][i])}</td><td class="num">${sec(T36[m][1][i])}</td>`).join("")}${["E2","E3","F2","F3t","F3p","Gh","Gv"].map(k=>`<td class="num">${sec(T38[k][i])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
<p class="note" style="margin-top:8px">Tab. 36: métodos A1 a D · Tab. 38: métodos E, F e G. Método G com 2 condutores carregados usa a coluna de 3 condutores (a favor da segurança).</p>
</details>${nav()}`;};

function circRow(c,i){
  const opt=(o,v)=>o.map(([a,b])=>`<option value="${a}" ${v===a?"selected":""}>${b}</option>`).join("");
  const unids=c.tipo==="motor"?[["cv","cv"],["kW","kW"]]:[["W","W"],["VA","VA"],["kW","kW"]];
  const qs=S.quadros.map(q=>[q.nome,q.nome]);
  return `<tr>
  <td class="num">${i+1}</td>
  <td><select data-c="${i}" data-f="q" aria-label="Quadro">${opt(qs,c.q)}</select></td>
  <td><input class="w-l" data-c="${i}" data-f="nome" value="${esc(c.nome)}" aria-label="Descrição"></td>
  <td><select data-c="${i}" data-f="tipo" data-re="1" aria-label="Tipo">${opt(Object.entries(TIPOS).map(([a,b])=>[a,TIPO_CURTO[a]]),c.tipo)}</select></td>
  <td><select data-c="${i}" data-f="lig" aria-label="Ligação" ${ligOK(c.lig,R.sys)?"":'style="border-color:var(--bad);color:var(--bad)"'}>${opt(Object.keys(LIG).filter(k=>ligOK(k,R.sys)||k===c.lig).map(k=>[k,`${LIG[k].txt} · ${ligOK(k,R.sys)?ligVolt(k,R.sys)+" V":"incompatível"}`]),c.lig)}</select></td>
  <td><input type="number" class="w-s" min="0" step="1" data-c="${i}" data-f="qtd" value="${c.qtd}" aria-label="Número de cargas"></td>
  <td><input type="number" min="0" step="any" data-c="${i}" data-f="pot" value="${c.pot}" aria-label="Potência unitária"></td>
  <td><select data-c="${i}" data-f="unid" aria-label="Unidade">${opt(unids,c.unid)}</select></td>
  <td><input type="number" class="w-s" min="0.1" max="1" step="0.01" data-c="${i}" data-f="fp" value="${c.fp}" aria-label="Fator de potência"></td>
  <td>${c.tipo==="motor"?`<input type="number" class="w-s" min="0.1" max="1" step="0.01" data-c="${i}" data-f="eta" value="${c.eta}" aria-label="Rendimento">`:`<span class="mono" style="color:var(--muted)">—</span>`}</td>
  <td>${c.tipo==="motor"?`<input type="number" class="w-s" min="1" max="1.5" step="0.05" data-c="${i}" data-f="fs" value="${c.fs??1.25}" aria-label="Fator de serviço">`:`<span class="mono" style="color:var(--muted)">—</span>`}</td>
  <td><input type="number" class="w-s" min="0" max="1" step="0.01" data-c="${i}" data-f="fu" value="${c.fu}" aria-label="Fator de utilização"></td>
  <td><input type="number" class="w-s" min="0" max="1" step="0.01" data-c="${i}" data-f="fd" value="${c.fd}" aria-label="Fator de demanda"></td>
  <td><select style="min-width:150px" data-c="${i}" data-f="local" aria-label="Local do circuito ${i+1}">${opt(Object.entries(LOCAIS),c.local||"seco")}</select></td>
  <td><select style="min-width:84px" data-c="${i}" data-f="dr" aria-label="DR do circuito ${i+1}">${opt([["auto","Norma"],["sim","Incluir"]],c.dr||"auto")}</select></td>
  <td><input class="w-s" data-c="${i}" data-f="can" value="${esc(c.can)}" aria-label="Canaleta"></td>
  <td><input type="number" class="w-s" min="0" step="0.5" data-c="${i}" data-f="ld" value="${c.ld}" aria-label="Comprimento na canaleta"></td>
  <td><input type="number" class="w-s" min="0" step="0.1" data-c="${i}" data-f="lb" value="${c.lb}" aria-label="Comprimento da baixada"></td>
  <td class="num" data-live="S${i}"></td><td class="num" data-live="I${i}"></td>
  <td><button class="btn small danger" type="button" data-del="${i}" aria-label="Remover circuito ${i+1}">✕</button></td></tr>`;
}
V.cargas=()=>`${head(3,`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn small" type="button" data-add="ilum">+ Iluminação</button><button class="btn small" type="button" data-add="tug">+ TUG</button><button class="btn small" type="button" data-add="tue">+ TUE</button><button class="btn small primary" type="button" data-add="motor">+ Motor</button></div>`)}
<p class="intro">Quantificação do sistema (item B). Cada linha é um circuito: informe o número de cargas iguais, a potência de cada uma em <b>W</b> (ativa), <b>VA</b> (aparente) ou <b>cv</b> (motor) e o fator de potência. Informe também a canaleta por onde o circuito passa, o trecho na canaleta e o comprimento da baixada em eletroduto.</p>
${S.exemplo?`<p class="note warn"><b>Exemplo carregado:</b> mini-indústria com secador, descascador, moedor e ensacadeira, dados fictícios; rendimentos e FP dos motores são ilustrativos. Use sempre os dados de placa. Para começar do zero, use “Projeto em branco”.</p>`:""}
<div class="block" style="margin-top:0;border-top:0;padding-top:0"><h3>Quadros de distribuição</h3>
<div class="tbl ct"><table><thead><tr><th>Quadro</th><th>Alimentador desde o QGBT (m)</th><th>Método</th><th></th></tr></thead><tbody>
${S.quadros.map((q,j)=>`<tr><td><input class="w-m" data-qd="${j}" data-f="nome" value="${esc(q.nome)}" aria-label="Nome do quadro"></td><td><input type="number" min="0" step="1" data-qd="${j}" data-f="L" value="${q.L}" aria-label="Comprimento do alimentador"> ${j===0?`<span class="h" style="color:var(--muted);font-size:11.5px">0 = quadro geral</span>`:""}</td><td><select data-qd="${j}" data-f="met" aria-label="Método do alimentador">${Object.keys(METODOS).map(m=>`<option ${q.met===m?"selected":""}>${m}</option>`).join("")}</select></td><td>${S.quadros.length>1?`<button class="btn small danger" type="button" data-delq="${j}">Remover</button>`:""}</td></tr>`).join("")}
</tbody></table></div><div><button class="btn small" type="button" id="addQ">+ Quadro</button></div></div>
${R.incompat.length?`<p class="note bad"><b>Ligação incompatível com o sistema ${esc(R.sys.nome)}:</b> circuitos ${R.incompat.map(o=>o.i+1).join(", ")}. Escolha outra ligação ou mude o tipo de alimentação na etapa 02.</p>`:""}
<div class="block"><h3>Circuitos</h3>
<div class="tbl ct"><table><thead><tr><th>#</th><th>Quadro</th><th>Descrição</th><th>Tipo</th><th>Ligação</th><th>Nº cargas</th><th>Pot. unit.</th><th>Unid.</th><th>FP</th><th>η</th><th title="Fator de serviço explorado (6.5.1.3.1)">FS</th><th>Fu</th><th>FD</th><th title="Local do ponto de utilização (5.1.3.2.2)">Local</th><th title="Dispositivo DR">DR</th><th>Canaleta</th><th>L can. (m)</th><th>L baix. (m)</th><th class="r">S (VA)</th><th class="r">Ib (A)</th><th></th></tr></thead>
<tbody>${S.circ.map(circRow).join("")||`<tr><td colspan="21" style="padding:18px;color:var(--muted)">Nenhum circuito. Use os botões acima para adicionar.</td></tr>`}</tbody></table></div>
<p class="note">Local e DR: o site aplica o DR de 30 mA onde a NBR 5410 exige (5.1.3.2.2: locais com banheira ou chuveiro; tomadas em área externa ou que alimentem equipamentos externos; cozinhas, lavanderias, áreas de serviço, garagens e áreas molhadas ou lavadas). “Incluir” força o DR em outros circuitos. No esquema TT o DR vale para todos os circuitos.</p>
<p class="note">FS = fator de serviço aplicado à corrente de projeto do motor. Padrão 1,25 (conservador); a NBR 5410 exige no mínimo In, multiplicada pelo FS quando ele for explorado (6.5.1.3.1). Fu = fator de utilização (motores operam abaixo da potência nominal; a aula sugere ~0,87 na falta de dados). FD = fator de demanda do circuito (tabelas da aula, AES Eletropaulo / NBR 5410). Ambos só afetam a demanda; condutores e disjuntores são dimensionados pela carga nominal.</p>
</div>${nav()}`;

function critPill(o){if(!o.s)return `<span class="pill bad">sem solução</span>`;const m={"capacidade":"cap.","queda na partida":"partida","queda":"queda","coordenação":"coord.","seção mínima":"mín."};const k=Object.keys(m).find(x=>o.crit.startsWith(x));return `<span class="pill ${k==="queda"||k==="queda na partida"?"warn":"ok"}" title="${esc(o.crit)}">${m[k]||o.crit}</span>`;}
function motorBlock(){const ms=R.out.filter(o=>o.c.tipo==="motor");
  const opt=(o,v)=>Object.entries(o).map(([a,b])=>`<option value="${a}" ${v===a?"selected":""}>${b}</option>`).join("");
  return `<div class="block" style="margin-top:16px;border-top:0;padding-top:0"><h3>Proteção e partida dos motores</h3>
  <div class="tbl ct"><table><thead><tr><th>#</th><th>Motor</th><th>Tipo de partida</th><th>Proteção</th><th>Fusível</th><th class="r">In (A)</th><th class="r">Ip partida (A)</th><th>Relé térmico / disjuntor-motor</th><th>Fusíveis</th><th>Contatores (AC-3) / chave</th></tr></thead><tbody>
  ${ms.map(o=>{const m=o.mp;return `<tr><td class="num">${o.i+1}</td><td>${esc(o.c.nome)}</td>
  <td><select style="min-width:150px" data-c="${o.i}" data-f="partida" aria-label="Tipo de partida do motor ${o.i+1}">${opt(PARTIDAS,o.partida)}</select></td>
  <td><select style="min-width:150px" data-c="${o.i}" data-f="prot" aria-label="Proteção do motor ${o.i+1}">${opt(PROTS_CURTO,o.prot)}</select></td>
  <td>${o.prot==="fus"&&o.partida!=="inv"?`<select style="min-width:64px" data-c="${o.i}" data-f="fusTipo" aria-label="Tipo de fusível">${opt({gG:"gG",aM:"aM"},o.c.fusTipo||"gG")}</select>`:`<span class="mono" style="color:var(--muted)">—</span>`}</td>
  <td class="num">${m?fmt(m.In1,1):"—"}</td><td class="num">${m?fmt(m.Ip,1):"—"}</td>
  <td class="mono" style="white-space:normal;min-width:240px">${m?(o.prot==="djm"?m.djmTxt:m.releTxt):"—"}</td>
  <td class="mono" style="white-space:normal;min-width:160px">${m&&m.fus?m.fusTxt:(o.prot==="dj"&&o.inom?`disjuntor ${o.L.polos}P ${o.inom} A ${o.curva}`:"—")}</td>
  <td class="mono" style="white-space:normal;min-width:160px">${m?[m.contTxt,m.chave].filter(Boolean).join(" · "):"—"}</td></tr>`;}).join("")}
  </tbody></table></div>
  <p class="note">Relé térmico ajustado na corrente nominal do motor; na estrela-triângulo ele fica no ramo do triângulo e é ajustado em In/√3. Se o FS de placa for explorado, o ajuste pode chegar a In × FS. Fusível gG: If ≥ K × Ip (K = 0,5 até 40 A; 0,4 até 500 A; 0,3 acima), critério prático a confirmar na curva tempo × corrente do fabricante. Contatores da estrela-triângulo: linha e triângulo ≥ In/√3, estrela ≥ In/3. Faixas de ajuste são valores típicos de catálogo.</p></div>`;}
V.dim=()=>{const p=S.par;return `${head(4)}
<p class="intro">Dimensionamento (item E) de cada circuito: seção de fase, neutro e PE, disjuntor e eletroduto da baixada. A coluna “Critério” indica qual verificação definiu a bitola.</p>
<div class="note">FCT = ${fct(p.metDist).toFixed(2)} (${p.temp} °C) · distribuição ${p.metDist} · baixada ${p.metBaix} · FCA pela quantidade de circuitos na mesma canaleta (Tab. 42) · ΔV terminal ≤ ${fmt(+p.dvTerm,1)} % · total ≤ ${fmt(+p.dvTotal,1)} %</div>
${R.issues.map(t=>`<p class="note warn" style="margin-top:8px">${t}</p>`).join("")}
${R.out.some(o=>o.dr)?`<p class="note" style="margin-top:8px">IDR nos circuitos ${R.out.filter(o=>o.dr).map(o=>`${o.i+1} (${o.dr.idn} mA)`).join(", ")}. Tipo A em geral; tipo B quando há inversor de frequência, por causa das correntes de fuga contínuas.</p>`:""}
${R.out.some(o=>o.c.tipo==="motor")?motorBlock():""}
<div class="tbl" style="margin-top:12px"><table><thead><tr><th>#</th><th>Circuito</th><th>Quadro</th><th>Fases</th><th class="r">P (W)</th><th class="r">S (VA)</th><th class="r">Ib (A)</th><th class="r">FCA</th><th class="r">Iz (A)</th><th>Fase / N / PE (mm²)</th><th>Proteção</th><th class="r">ΔV circ.</th><th class="r">ΔV total</th><th class="r">ΔV partida</th><th>Eletroduto baixada</th><th>Critério</th></tr></thead><tbody>
${R.out.map(o=>`<tr><td class="num">${o.i+1}</td><td>${esc(o.c.nome)}</td><td>${esc(o.c.q)}</td><td>${o.fases.split("").map(k=>`<span class="ph ${k}">${k}</span>`).join("")}</td>
<td class="num">${fmt0(o.P)}</td><td class="num">${fmt0(o.S)}</td><td class="num">${fmt(o.ib,1)}</td><td class="num">${o.fcaD.toFixed(2)}</td><td class="num">${o.s?fmt(o.iz,1):"—"}</td>
<td class="mono">${o.s?`${sec(o.s)} / ${o.sn?sec(o.sn):"—"} / ${sec(o.spe)}`:"—"}</td>
<td class="mono" style="white-space:normal;min-width:280px">${protTxt(o)}</td>
<td class="num">${o.s?fmt(o.dv,2)+" %":"—"}</td><td class="num">${o.s?`<span class="pill ${o.dvOk?"ok":"bad"}">${fmt(o.dvTot,2)} %</span>`:"—"}</td>
<td class="num">${o.dvpTot!=null?`<span class="pill ${o.dvpOk?"ok":"bad"}">${fmt(o.dvpTot,1)} %</span>`:"—"}</td><td class="mono">${o.ed.nome}</td><td>${critPill(o)}</td></tr>`).join("")}
</tbody></table></div>
${R.out.some(o=>!o.s)?`<p class="note bad" style="margin-top:10px"><b>Atenção:</b> há circuitos sem solução dentro da Tab. 36. Divida a carga em mais circuitos ou reveja a ligação.</p>`:""}
${R.out.some(o=>o.s&&!o.dvOk)?`<p class="note bad" style="margin-top:10px"><b>Queda total acima do limite</b> em circuitos marcados em vermelho: aumente a seção do alimentador do quadro, reduza a parcela da entrada ou aproxime o quadro das cargas.</p>`:""}
${R.out.some(o=>o.c.tipo==="motor")?`<p class="note" style="margin-top:10px">Motores: Ib = In × FS (6.5.1.3.1); queda na partida verificada com a corrente de cada tipo de partida e FP 0,3, limite ${fmt(+p.dvPartida,0)} % (6.5.1.3.3). Disjuntor termomagnético curva ${p.curvaMotor}. Com fusíveis ou disjuntor, a sobrecarga é protegida pelo relé térmico (6.5.1.4); com fusíveis, verifique no catálogo a coordenação fusível–contator–relé e a proteção do cabo contra curto-circuito (5.3.5). Verifique no RIC da distribuidora o limite de potência em partida direta.</p>`:""}
${nav()}`;};

V.can=()=>{const gs=Object.values(R.cans);return `${head(5)}
<p class="intro">Distribuição horizontal em canaletas/eletrocalhas. Os circuitos que compartilham uma canaleta formam um agrupamento: o FCA (Tab. 42) e a ocupação são calculados por canaleta.</p>
${gs.length?`<div class="tbl ct"><table><thead><tr><th>Canaleta</th><th>Circuitos</th><th class="r">Nº circ.</th><th class="r">FCA</th><th class="r">Área cabos (mm²)</th><th>Dimensão (L × A)</th><th class="r">Ocupação</th><th>Comprimento do trecho (m)</th></tr></thead><tbody>
${gs.map(g=>`<tr><td class="mono">${esc(g.k)}</td><td class="mono">${g.circ.join(", ")}</td><td class="num">${g.circ.length}</td><td class="num">${g.fca.toFixed(2)}</td><td class="num">${fmt0(g.area)}</td><td class="mono">${g.dim}</td><td class="num">${g.ocup!==null?fmt(g.ocup*100,1)+" %":"—"}</td>
<td><input type="number" min="0" step="0.5" data-can="${esc(g.k)}" value="${g.Lauto?"":g.L}" placeholder="${g.maxL} (auto)" aria-label="Comprimento da canaleta ${esc(g.k)}"></td></tr>`).join("")}
</tbody></table></div>
<p class="note" style="margin-top:10px">Comprimento automático = maior trecho informado entre os circuitos da canaleta. Informe o comprimento real da rota para a lista de materiais. Ocupação máxima adotada: ${S.par.ocupCan} %.</p>`:`<p class="note">Nenhum circuito com trecho em canaleta. Informe a canaleta e o comprimento na etapa 04.</p>`}
${nav()}`;};

V.dem=()=>{const sys=R.sys,e=R.ent,p=S.par;const vals=R.PH.map(k=>R.ph[k]);const maxPh=Math.max(...vals)||1,medPh=vals.reduce((a,b)=>a+b,0)/vals.length;
const deseq=medPh>0?(maxPh-medPh)/medPh*100:0;
return `${head(6)}
<p class="intro">Determinação da demanda e do padrão de atendimento (item C). Demanda = Σ P × Fu × FD de cada circuito, acrescida da reserva de ${p.reserva} %. A partir dela saem os alimentadores dos quadros e da entrada.</p>
<div class="grid">
<div class="card"><h3>Carga instalada</h3><div class="big">${fmt(R.inst,2)} <small style="font-size:16px">kW</small></div></div>
<div class="card"><h3>Demanda</h3><div class="big">${fmt(R.dem,2)} <small style="font-size:16px">kW</small></div><div class="mono" style="font-size:12px;color:var(--muted)">${fmt(R.demS,2)} kVA · FP ${fmt(R.fpG,2)}</div></div>
<div class="card"><h3>Fator de demanda</h3><div class="big">${R.inst>0?fmt(R.dem/R.inst,2):"—"}</div><div class="mono" style="font-size:12px;color:var(--muted)">D / P instalada</div></div>
<div class="card"><h3>Entrada c/ reserva</h3><div class="big">${fmt(e.S,1)} <small style="font-size:16px">kVA</small></div><div class="mono" style="font-size:12px;color:var(--muted)">${fmt(R.Ient,1)} A · ${esc(sys.nome)}</div></div>
</div>
<div style="margin-top:12px" data-live="cls">${clsCard()}</div>
<p class="note" style="margin-top:8px">Limites da REN ANEEL nº 1.000/2021 (art. 23): tensão secundária até 75 kW de carga instalada; tensão primária abaixo de 69 kV acima de 75 kW e demanda até 2.500 kW; 69 kV ou mais acima de 2.500 kW. A categoria do padrão de entrada segue o RIC da distribuidora. A REN 414/2010, citada em materiais antigos, foi substituída pela REN 1.000/2021.</p>
<div class="block"><h3>Alimentador de entrada (padrão/transformador → QGBT)</h3>
<div class="grid">${fld("forn.Lent","Comprimento (m)",{type:"number",step:"1"})}${fld("forn.metEnt","Método",{opts:Object.keys(METODOS).map(m=>[m,METODOS[m]])})}</div>
${e.s?`<div class="tbl"><table><thead><tr><th class="r">I (A)</th><th>Fase / N / PE (mm²)</th><th class="r">Iz (A)</th><th>Disjuntor geral</th><th class="r">ΔV</th><th>Eletroduto</th><th>Critério</th></tr></thead><tbody><tr><td class="num">${fmt(R.Ient,1)}</td><td class="mono">${e.txt}</td><td class="num">${fmt(e.iz,1)}</td><td class="mono">${e.polos}P ${e.inom} A</td><td class="num">${fmt(e.dv,2)} %</td><td class="mono">${e.ed.nome}</td><td>${critPill(e)}</td></tr></tbody></table></div>`:`<p class="note bad">${R.Ient>0?e.crit:"Sem cargas cadastradas."}</p>`}
</div>
<div class="block"><h3>Quadros de distribuição</h3>
<div class="tbl"><table><thead><tr><th>Quadro</th><th class="r">P inst. (kW)</th><th class="r">Demanda c/ res. (kVA)</th><th class="r">I (A)</th><th>Alimentador (mm²)</th><th>Disjuntor</th><th class="r">ΔV alim.</th><th>Eletroduto</th>${R.PH.map(k=>`<th class="r">${k} (VA)</th>`).join("")}</tr></thead><tbody>
${R.quadros.map(q=>`<tr><td class="mono">${esc(q.q.nome)}</td><td class="num">${fmt(q.inst,2)}</td><td class="num">${fmt(q.S,2)}</td><td class="num">${fmt(q.I,1)}</td>
<td class="mono">${q.f?(q.f.s?q.f.txt:"sem solução"):"— (no QGBT)"}</td><td class="mono">${q.f&&q.f.inom?`${q.f.polos}P ${q.f.inom} A`:"—"}</td><td class="num">${q.f&&q.f.s?fmt(q.f.dv,2)+" %":"—"}</td><td class="mono">${q.f&&q.f.s?q.f.ed.nome:"—"}</td>
${R.PH.map(k=>`<td class="num">${fmt0(q.ph[k])}</td>`).join("")}</tr>`).join("")}
</tbody></table></div>
${R.orf.length?`<p class="note bad">Circuitos em quadro inexistente: ${R.orf.map(o=>o.i+1).join(", ")}.</p>`:""}
</div>
<div class="block"><h3>Proteção contra surtos no QGBT</h3><div data-live="dps">${dpsCard()}</div></div>
<div class="block"><h3>Equilíbrio de fases</h3>
<div class="bars" style="max-width:520px">${R.PH.map(k=>`<div class="bar"><span class="ph ${k}">${k}</span><div class="track"><div class="fill ${k}" style="width:${(R.ph[k]/maxPh*100).toFixed(1)}%"></div></div><span class="mono" style="text-align:right">${fmt(R.ph[k]/1000,2)} kVA</span></div>`).join("")}</div>
${sys.fases===1?`<p class="note">Sistema monofásico: toda a carga fica na fase R.</p>`:`<p class="note ${deseq>10?"warn":"ok"}">Desequilíbrio máximo em relação à média: <b>${fmt(deseq,1)} %</b>. Circuitos monofásicos e bifásicos foram distribuídos automaticamente, do maior para o menor, na fase menos carregada. A coluna “Fases” da etapa 05 mostra a atribuição.</p>`}
</div>${nav()}`;};

V.des=()=>`${head(7)}
<p class="intro">Desenhos das plantas (item D), quadros e diagramas (item F) e detalhes construtivos (item G). Anexe as pranchas produzidas em CAD. Elas entram no PDF final na ordem da documentação do projeto.</p>
<div style="display:flex;flex-direction:column;gap:10px">${["arquitetonico","unifilar","multifilar","detalhes","convencoes"].map(attBlock).join("")}</div>
<p class="note" style="margin-top:12px">Confira nas pranchas: pontos de utilização e quadros (NBR 5444), rotas das canaletas com a identificação usada aqui (${Object.keys(R.cans).join(", ")||"—"}), baixadas com o diâmetro calculado e o unifilar com as mesmas bitolas e disjuntores da etapa 05.</p>${nav()}`;

/* ---------- memorial descritivo (texto gerado) ---------- */
function memoAuto(){
  const id=S.id,f=S.forn,p=S.par,sys=SISTEMAS[f.sistema];
  const nm=R.out.filter(o=>o.c.tipo==="motor");
  return {
    obj:`O presente memorial descreve o projeto das instalações elétricas de baixa tensão da obra "${id.obra||"—"}", de propriedade de ${id.cliente||"—"}, localizada em ${id.local||"—"}, ${id.municipio||"—"}${id.uc?`, unidade consumidora nº ${id.uc}`:""}. A atividade desenvolvida no local é: ${id.atividade||"—"}.`,
    normas:`O projeto foi elaborado conforme: ABNT NBR 5410:2004 (Instalações elétricas de baixa tensão); ABNT NBR 14039 (Instalações elétricas de média tensão, quando aplicável); ABNT NBR 5419 (Proteção contra descargas atmosféricas); ABNT NBR 5444 (simbologia); NR-10 (Segurança em instalações e serviços em eletricidade); NR-12 (Segurança no trabalho em máquinas e equipamentos); Resolução Normativa ANEEL nº 1.000/2021; e o Regulamento de Instalações Consumidoras da ${id.distribuidora||"distribuidora local"}.`,
    forn:`A unidade consumidora é da classe ${R.cls.classeT}, subclasse ${R.cls.subclasse}, Grupo ${R.cls.grupo}, subgrupo ${R.cls.sub}, modalidade tarifária ${R.cls.modalidade.toLowerCase()}, conforme a REN ANEEL nº 1.000/2021. O fornecimento será em ${f.atend==="MT"?`tensão primária de ${fmt(+f.tensaoPrim,1)} kV, com transformador próprio${f.trafoKVA?` de ${f.trafoKVA} kVA`:""}`:"tensão secundária"}, alimentação ${sys.nome}, 60 Hz. ${f.rede?`Rede existente: ${f.rede}${f.distRede?`, a ${f.distRede} do ponto de derivação`:""}.`:""} A carga instalada é de ${fmt(R.inst,2)} kW e a demanda calculada é de ${fmt(R.dem,2)} kW (${fmt(R.demS,2)} kVA, FP ${fmt(R.fpG,2)}); com reserva de ${p.reserva} % para ampliações, a potência de alimentação adotada é de ${fmt(R.ent.S,2)} kVA. ${f.obs||""}`,
    dist:`A partir do quadro geral de baixa tensão (QGBT) partem os alimentadores dos quadros ${S.quadros.slice(1).map(q=>q.nome).join(", ")||"terminais"}. Os circuitos terminais são conduzidos horizontalmente em canaletas/eletrocalhas (${Object.values(R.cans).map(g=>`${g.k}: ${g.dim}`).join("; ")||"—"}), método de referência ${p.metDist}, e descem até os pontos de utilização em eletrodutos (baixadas), método ${p.metBaix}. Foram considerados temperatura ambiente de ${p.temp} °C e fatores de agrupamento conforme a Tabela 42 da NBR 5410.`,
    cond:`Serão utilizados condutores de cobre com isolação em PVC 70 °C, 450/750 V (circuitos internos) e 0,6/1 kV nos trechos enterrados ou sujeitos a umidade. Seções mínimas: 1,5 mm² para iluminação e 2,5 mm² para força. Cores: neutro azul-claro; condutor de proteção verde-amarelo ou verde; fases em preto, vermelho ou branco, mantendo a mesma cor para cada fase em toda a instalação. A queda de tensão foi limitada a ${fmt(+p.dvTerm,1)} % nos circuitos terminais e a ${fmt(+p.dvTotal,1)} % no total.`,
    prot:`${(()=>{const d=R.out.filter(o=>o.dr),dp=R.dps;return `${d.length?`Recebem dispositivo diferencial-residual (IDR) os circuitos ${d.map(o=>`${o.i+1} (${o.dr.idn} mA, ${o.dr.mot})`).join("; ")}. `:""}${dp.incl?`No QGBT serão instalados DPS ${dp.cls1?"classe I":"classe II"}, ${dp.con}, nível de proteção Up ≤ ${fmt(dp.up,1)} kV (Tab. 31, categoria II), ${dp.req?`obrigatórios conforme ${dp.motivo}`:"adotados em projeto"}. `:`DPS não obrigatório pelas condições informadas (5.4.2.1.1). `}`;})()}Cada circuito é protegido por disjuntor termomagnético (curva ${p.curva} para iluminação e tomadas, curva ${p.curvaMotor} para motores), coordenado com o condutor (Ib ≤ In ≤ Iz). O QGBT recebe DPS classe adequada coordenado com o esquema de aterramento.${nm.length?` Os ${nm.length} motores terão proteção contra sobrecarga por relé térmico ou disjuntor-motor e partida conforme o RIC da distribuidora.`:""}`,
    aterr:`O esquema de aterramento adotado é ${ATERR[f.aterr]||f.aterr}. ${({"TN-S":"Os condutores neutro e de proteção são distintos em toda a instalação, com o neutro aterrado na origem.","TN-C-S":"O condutor PEN do alimentador de entrada é separado em neutro e PE no QGBT, que acumula a função de BEP; daí em diante o esquema é TN-S (5.4.3.6).","TN-C":"As funções de neutro e proteção são combinadas no condutor PEN, com seção mínima de 10 mm² Cu (6.4.3.4.1), identificado em azul-claro com anilhas verde-amarelo (6.1.5.3.3). Não se admite DR como dispositivo de seccionamento automático nesse esquema (5.1.2.2.4.2-f).","TT":`As massas são ligadas a eletrodo de aterramento próprio, e o seccionamento automático é feito por dispositivos DR, atendendo RA × IΔn ≤ UL (5.1.2.2.4.3), com RA = ${fmt(+f.ra||0,1)} Ω e UL = ${f.ul} V.`,"IT-N":"A alimentação é isolada da terra ou aterrada por impedância elevada, com neutro distribuído; deve haver dispositivo supervisor de isolamento (DSI) com sinalização da primeira falta (5.1.2.2.4.4).","IT":"A alimentação é isolada da terra ou aterrada por impedância elevada, sem neutro distribuído; deve haver dispositivo supervisor de isolamento (DSI) com sinalização da primeira falta (5.1.2.2.4.4)."})[f.aterr]||""} A malha de aterramento será interligada ao barramento de equipotencialização principal (BEP), ao qual se conectam estruturas metálicas, silos, secadores, carcaças de motores, eletrocalhas e o SPDA, quando houver.`,
    custo:(()=>{const c=custos();return `A estimativa de custo dos materiais relacionados na lista de materiais totaliza ${brl(c.tot)}, assim distribuída: ${Object.keys(GRUPOS).filter(g=>c.por[g]!=null).map(g=>`${GRUPOS[g]}, ${brl(c.por[g]||0)}`).join("; ")}.${c.semPreco?` ${c.semPreco} de ${c.m.length} itens estão sem preço informado e não entram no total.`:""} Os valores não incluem mão de obra, frete, impostos nem BDI, e devem ser atualizados por cotação na data da execução.`;})(),
    doc:`Integram este projeto: ART, carta de solicitação à distribuidora, memorial descritivo, memorial de cálculo, plantas, quadros de distribuição de cargas, diagramas unifilar e multifilar, detalhes construtivos, especificações técnicas e lista de materiais. A aprovação pela distribuidora não exime o responsável técnico da responsabilidade pelo projeto.`
  };
}
const MEMO_T={obj:"1. Objetivo e identificação",normas:"2. Normas e regulamentos",forn:"3. Fornecimento de energia",dist:"4. Distribuição interna",cond:"5. Condutores",prot:"6. Proteção",aterr:"7. Aterramento e equipotencialização",custo:"8. Estimativa de custo dos materiais",doc:"9. Documentação do projeto"};
function memoText(k){return S.memo[k]??memoAuto()[k];}
V.memo=()=>`${head(8)}
<p class="intro">Memorial descritivo (item H). O texto é gerado a partir dos dados e cálculos e se atualiza sozinho. Se você editar uma seção, ela passa a ser sua e deixa de acompanhar os cálculos, até você clicar em “Restaurar texto gerado”.</p>
<div style="display:flex;flex-direction:column;gap:14px">${Object.entries(MEMO_T).map(([k,t])=>`<label class="f" for="memo-${k}"><span style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b style="color:var(--ink);font-weight:600">${t}</b>${S.memo[k]!=null?`<button class="btn small ghost" type="button" data-memoreset="${k}">Restaurar texto gerado</button>`:`<span class="pill ok">automático</span>`}</span><textarea id="memo-${k}" data-memo="${k}">${esc(memoText(k))}</textarea></label>`).join("")}</div>${nav()}`;

/* ---------- materiais ---------- */
const GRUPOS={cab:"Condutores",cond:"Eletrodutos e eletrocalhas",prot:"Proteção (disjuntores, fusíveis, DR, DPS)",cmd:"Comando e partida de motores",qd:"Quadros e supervisão"};
function materiais(){
  const p=S.par,f=S.forn,sob=1+(+p.sobra||0)/100,sys=R.sys,M={};
  const add=(g,d,un,q,ci)=>{const k=g+"|"+d;M[k]=M[k]||{g,d,un,q:0,c:new Set()};M[k].q+=q;if(ci)M[k].c.add(ci);};
  const icc=fmt(+p.icc||6,1).replace(",0","");
  const djDesc=(pol,In,curva,V)=>`Disjuntor termomagnético ${pol}P ${In} A${curva?` curva ${curva}`:""}, Un ≥ ${V} V, capacidade de interrupção ≥ ${icc} kA${In<=63?" (NBR NM 60898 / IEC 60947-2)":" — caixa moldada (NBR IEC 60947-2)"}`;
  const idrDesc=(d,V)=>`Interruptor diferencial-residual (IDR) ${d.polos}P ${d.In} A, IΔn ${d.idn} mA, tipo ${d.tipo}, Un ≥ ${V} V (NBR NM 61008)`;
  R.out.forEach(o=>{if(!o.s)return;const L=((+o.c.ld||0)+(+o.c.lb||0))*sob;const ci=o.i+1;
    add("cab",`Cabo de cobre flexível ${sec(o.s)} mm² 450/750 V — fase`,"m",L*o.L.nf);
    if(o.sn)add("cab",`Cabo de cobre flexível ${sec(o.sn)} mm² 450/750 V — ${o.pen?"PEN (azul-claro com anilhas verde-amarelo)":"neutro (azul-claro)"}`,"m",L);
    if(o.spe)add("cab",`Cabo de cobre flexível ${sec(o.spe)} mm² 450/750 V — proteção (verde-amarelo)`,"m",L);
    if(+o.c.lb>0)add("cond",`Eletroduto PVC rígido ${o.ed.nome}`,"m",(+o.c.lb)*sob);
    const V=o.vref;
    if(o.inom)add("prot",djDesc(o.L.polos,o.inom,o.curva,V),"pç",1,ci);
    if(o.dr)add("prot",idrDesc(o.dr,V),"pç",1,ci);
    const m=o.mp;if(m){const q=+o.c.qtd||1;const mot=`motor ${fmt(m.cv,m.cv%1?1:0)} cv / ${fmt(m.kW,2)} kW, ${V} V`;
      if(m.rele&&m.rele.f)add("cmd",`Relé de sobrecarga tripolar classe 10, faixa ${fa(m.rele.f[0])}–${fa(m.rele.f[1])} A (ajuste ${fmt(m.rele.Ir,1)} A${o.partida==="yd"?", ramo triângulo":""}), Ue ${V} V, sensível à falta de fase${m.rele.cont?`, acoplável ao contator de ${m.rele.cont} A`:""}`,"pç",q,ci);
      if(m.djm&&m.djm.f)add("prot",`Disjuntor-motor tripolar, faixa ${fa(m.djm.f[0])}–${fa(m.djm.f[1])} A (ajuste ${fmt(m.djm.Ir,1)} A), disparo magnético incorporado, Ue ${V} V, Icu ≥ ${icc} kA — ${mot}`,"pç",q,ci);
      if(m.fus&&m.fus.If){const t=fusTam(m.fus.If);const tipo=o.partida==="inv"?"ultrarrápido aR":(o.c.fusTipo==="aM"?"aM":"gG");
        add("prot",`Fusível ${tipo} ${m.fus.If} A, ${t.t}, Un ${t.un} V, capacidade de interrupção ${t.icu} kA`,"pç",m.fus.n*q,ci);
        add("prot",`${t.base[0].toUpperCase()+t.base.slice(1)}, para fusível de ${m.fus.If} A, ${t.un} V`,"pç",m.fus.n*q,ci);}
      m.cont.forEach(k=>add("cmd",`Contator tripolar AC-3, Ie ${k.std??"> 630"} A em ${V} V (calculado ≥ ${fmt(k.I,1)} A), bobina ${p.bobina} 60 Hz, 1NA+1NF — ${k.t}`,"pç",k.n*q,ci));
      if(m.soft)add("cmd",`Soft-starter ${m.nf===3?"trifásica":"monofásica"}, In ${m.soft.std??"> 604"} A (calculado ≥ ${fmt(m.soft.I,1)} A), Ue ${V} V 60 Hz, rampa de tensão com limitação de corrente em ${fmt(+p.softLim||3,1)} × In, bypass incorporado — ${mot}`,"pç",q,ci);
      if(m.inv)add("cmd",`Inversor de frequência, entrada ${m.nf===3?"trifásica":"monofásica"} ${V} V 60 Hz, saída trifásica, corrente de saída ${m.inv.std??"> 601"} A em regime pesado (calculado ≥ ${fmt(m.inv.I,1)} A = In × FS), sobrecarga 150 % por 60 s, com reatância de rede ou filtro conforme fabricante — ${mot}`,"pç",q,ci);}});
  const Vf=sys.vff||sys.vfn;
  const fe=(fd,L,nome)=>{if(!fd||!fd.s)return;const l=L*sob;
    add("cab",`Cabo de cobre flexível ${sec(fd.s)} mm² 0,6/1 kV — fase (alimentador)`,"m",fd.nf*l);
    if(fd.sn)add("cab",`Cabo de cobre flexível ${sec(fd.sn)} mm² 0,6/1 kV — ${fd.pen?"PEN (azul-claro com anilhas verde-amarelo)":"neutro"} (alimentador)`,"m",l);
    if(fd.spe)add("cab",`Cabo de cobre flexível ${sec(fd.spe)} mm² 0,6/1 kV — proteção (alimentador)`,"m",l);
    add("cond",`Eletroduto ${fd.ed.nome} — alimentador ${nome}`,"m",l);add("prot",djDesc(fd.polos,fd.inom,"",fd.nf===3?Vf:sys.vfn)+` — geral ${nome}`,"pç",1);};
  fe(R.ent,+f.Lent||0,"do QGBT");R.quadros.forEach(q=>fe(q.f,+q.q.L||0,q.q.nome));
  Object.values(R.cans).forEach(g=>add("cond",`Eletrocalha/canaleta ${g.dim} com tampa (${g.k})`,"m",g.L*sob));
  const d=R.dps;if(d.incl)d.itens.forEach(it=>add("prot",`DPS ${d.cls1?"classe I":"classe II"} (IEC 61643-1), modo ${it.mod}, Uc ≥ ${it.uc} V, ${it.i}, Up ≤ ${fmt(d.up,1)} kV — QGBT, ${d.con}`,"pç",it.n));
  if(f.aterr==="IT"||f.aterr==="IT-N")add("qd",`Dispositivo supervisor de isolamento (DSI) para rede IT ${Vf} V, com sinalização sonora e visual (5.1.2.2.4.4-d)`,"pç",1);
  add("qd",`Quadros de distribuição metálicos IP54, barramentos F/N/PE, ${sys.nome} (${S.quadros.map(q=>q.nome).join(", ")})`,"pç",S.quadros.length);
  const ordem=Object.keys(GRUPOS);
  const num=t=>{const m=t.match(/(\d+(?:,\d+)?) mm²/);return m?parseFloat(m[1].replace(",",".")):0;};
  return Object.values(M).sort((a,b)=>ordem.indexOf(a.g)-ordem.indexOf(b.g)||(a.g==="cab"?num(a.d)-num(b.d):0)||a.d.localeCompare(b.d)).map(x=>{
    const ref=x.c.size?` — circ. ${[...x.c].sort((a,b)=>a-b).join(", ")}`:"";const key=x.g+"|"+x.d;const pu=+(S.precos||{})[key]||0;const q=x.un==="m"?Math.ceil(x.q):x.q;
    return {d:x.d+ref,un:x.un,q,key,g:x.g,pu,sub:pu*q};});
}
const brl=v=>isFinite(v)?v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}):"—";
function custos(){const m=materiais();const tot=m.reduce((a,r)=>a+r.sub,0);const semPreco=m.filter(r=>!r.pu).length;const por={};m.forEach(r=>por[r.g]=(por[r.g]||0)+r.sub);return {m,tot,semPreco,por};}
const ESPEC=[
  ["Condutores","Cobre eletrolítico têmpera mole, classe 5 (flexível), isolação PVC 70 °C, 450/750 V (NBR NM 247-3) nos circuitos internos; 0,6/1 kV (NBR 7288) em trechos enterrados."],
  ["Eletrodutos","PVC rígido roscável antichama (NBR 15465) para baixadas aparentes ou embutidas; PEAD corrugado em trechos enterrados, com caixas de passagem a cada mudança de direção."],
  ["Canaletas / eletrocalhas","Aço galvanizado a fogo, tipo U lisa com tampa, com aterramento contínuo ao BEP; suportes a cada 1,5 m no máximo, conforme fabricante."],
  ["Disjuntores","Termomagnéticos NBR NM 60898 até 63 A e NBR IEC 60947-2 (caixa moldada) acima de 63 A; capacidade de interrupção compatível com a corrente de curto-circuito no ponto."],
  ["Dispositivos DR","Interruptor ou disjuntor diferencial residual, IΔn ≤ 30 mA, onde exigido pela NBR 5410."],
  ["DPS","Dispositivo de proteção contra surtos no QGBT, classe e tensão compatíveis com o esquema de aterramento."],
  ["Quadros","Metálicos, grau de proteção mínimo IP54 em ambiente agroindustrial com poeira, com barramentos de fase, neutro e terra identificados e espaço de reserva."],
  ["Motores","Partida e proteção conforme o RIC da distribuidora e NR-12: contatores AC-3, relés térmicos de sobrecarga classe 10, disjuntores-motor ou fusíveis coordenados, soft-starters e inversores conforme o quadro de proteção dos motores, e botoeiras de emergência."]
];
V.art=()=>{const m=materiais();return `${head(9)}
<p class="intro">Especificações técnicas (item J), lista de materiais (item K) e ART (item L). A lista de materiais é gerada a partir dos cálculos, com sobra de ${S.par.sobra} % nos cabos, eletrodutos e canaletas.</p>
<div class="block" style="margin-top:0;border-top:0;padding-top:0"><h3>ART e outros documentos</h3>${attBlock("art")}${attBlock("outros")}</div>
<div class="block"><h3>Lista de materiais e custos</h3>
<p class="note">Preencha o preço unitário de cada item (R$). Subtotais, total por grupo e total geral são somados automaticamente e entram no memorial descritivo e na lista de materiais do PDF.</p>
<div class="tbl ct"><table><thead><tr><th>Item</th><th>Descrição</th><th>Un.</th><th class="r">Qtd.</th><th class="r">Preço unit. (R$)</th><th class="r">Subtotal</th></tr></thead><tbody>
${Object.keys(GRUPOS).map(g=>{const rows=m.filter(r=>r.g===g);if(!rows.length)return "";return `<tr class="sub"><td></td><td colspan="5">${GRUPOS[g]}</td></tr>`+rows.map(r=>{const i=m.indexOf(r);return `<tr><td class="num">${i+1}</td><td style="white-space:normal;min-width:320px">${esc(r.d)}</td><td>${r.un}</td><td class="num">${r.q}</td><td><input type="number" min="0" step="0.01" class="w-m" data-preco="${esc(r.key)}" value="${r.pu||""}" placeholder="0,00" aria-label="Preço unitário do item ${i+1}"></td><td class="num" data-live="sub${i}">${r.pu?brl(r.sub):"—"}</td></tr>`;}).join("")+`<tr><td></td><td colspan="4" style="text-align:right;color:var(--muted)">Subtotal — ${GRUPOS[g]}</td><td class="num" data-live="grp-${g}">${brl(rows.reduce((a,r)=>a+r.sub,0))}</td></tr>`;}).join("")}
<tr class="sub"><td></td><td colspan="4" style="text-align:right">TOTAL DE MATERIAIS</td><td class="num" data-live="totmat">${brl(m.reduce((a,r)=>a+r.sub,0))}</td></tr>
</tbody></table></div><p class="note" data-live="sempreco">${m.filter(r=>!r.pu).length} de ${m.length} itens sem preço informado.</p></div>
<div class="block"><h3>Especificações técnicas</h3><div class="tbl"><table><tbody>${ESPEC.map(([a,b])=>`<tr><td style="white-space:normal;font-weight:600;width:170px">${a}</td><td style="white-space:normal">${b}</td></tr>`).join("")}</tbody></table></div></div>
${nav()}`;};

/* ---------- checklist final ---------- */
function pendencias(){
  const a=S.anexos,id=S.id;
  return [
    ["Identificação do cliente e da obra",!!(id.cliente&&id.obra)],
    ["Responsável técnico e CREA",!!(id.rt&&id.crea)],
    ["Planta de situação",a.situacao.length>0],
    ["Circuitos cadastrados",S.circ.length>0],
    ["Ligações compatíveis com o sistema",R.incompat.length===0],
    ["Todos os circuitos com solução",R.out.length>0&&R.out.every(o=>o.s)],
    ["Queda de tensão total dentro do limite",R.out.length>0&&R.out.every(o=>o.dvOk)],
    ["Queda na partida dos motores ≤ limite",R.out.every(o=>o.dvpOk)],
    ["Planta baixa com pontos",a.arquitetonico.length>0],
    ["Diagrama unifilar",a.unifilar.length>0],
    ["Diagramas multifilares / comando",a.multifilar.length>0],
    ["Detalhes construtivos",a.detalhes.length>0],
    ["ART anexada",a.art.length>0]
  ];
}
V.fim=()=>{const pd=pendencias(),ok=pd.filter(x=>x[1]).length;return `${head(10)}
<p class="intro">O PDF segue o fluxo da Aula 2 (slide 7), na mesma ordem do material de referência da Bysol. Cada seção abre com uma página separadora que indica a etapa e o que ela contém. Itens ainda não anexados aparecem como folha de pendência.</p>
<div class="grid wide">
<div class="card"><h3>Verificação</h3><ul class="pend">${pd.map(([t,v])=>`<li class="${v?"ok":""}">${t}</li>`).join("")}</ul></div>
<div class="card"><h3>Ordem do documento</h3><ol style="margin:0;padding-left:20px;font-size:13px;display:flex;flex-direction:column;gap:2px">
<li>ART (item L)</li><li>Solicitação à distribuidora</li><li>Memorial descritivo (item H)</li><li>Memorial de cálculo: cargas, demanda, condutores, condutos, proteções (item I)</li><li>Plantas: situação e plantas baixas (item D)</li><li>Quadros de distribuição de cargas (item F)</li><li>Diagrama unifilar (item F)</li><li>Diagramas multifilares (item F)</li><li>Detalhes construtivos e convenções (item G)</li><li>Especificações técnicas (item J)</li><li>Lista de materiais (item K)</li></ol><p style="font-size:12px;color:var(--muted);margin-top:6px">Antes de tudo: capa e sumário. Outros anexos, se houver, vão ao final.</p></div>
</div>
<div class="block"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn primary" type="button" id="btnPdf">Gerar projeto completo (PDF)</button><span class="mono" style="font-size:12px;color:var(--muted)">${ok}/${pd.length} itens verificados</span></div>
<div class="progress" id="pdfProg" hidden><div></div></div><p class="note" id="pdfMsg" hidden></p></div>${nav()}`;};

/* ============================================================
   RENDER
   ============================================================ */
function renderStamp(){const id=S.id;document.getElementById("stamp").innerHTML=`<div>Obra</div><div>${esc(id.obra||"—")}</div><div>Cliente</div><div>${esc(id.cliente||"—")}</div><div>RT</div><div>${esc(id.rt||"—")} ${id.crea?`· CREA ${esc(id.crea)}`:""}</div><div>Data</div><div class="mono">${esc(id.data||"—")}</div>`;}
function renderSummary(){
  const maxPh=Math.max(...R.PH.map(k=>R.ph[k]))||1;const pd=pendencias();
  document.getElementById("summary").innerHTML=`
  <div class="card"><h3>Resumo</h3><dl class="kv">
  <dt>Circuitos</dt><dd>${S.circ.length}</dd><dt>Carga instalada</dt><dd>${fmt(R.inst,2)} kW</dd><dt>Demanda</dt><dd>${fmt(R.dem,2)} kW</dd>
  <dt>Potência aparente</dt><dd>${fmt(R.demS,2)} kVA</dd><dt>FP global</dt><dd>${fmt(R.fpG,2)}</dd><dt>Entrada (c/ reserva)</dt><dd>${fmt(R.Ient,1)} A</dd>
  <dt>Classificação</dt><dd>${R.cls.grupo} · ${R.cls.sub}</dd><dt>Disjuntor geral</dt><dd>${R.ent.inom?`${R.ent.polos}P ${R.ent.inom} A`:"—"}</dd><dt>Alimentador geral</dt><dd>${R.ent.s?`${sec(R.ent.s)} mm²`:"—"}</dd></dl></div>
  <div class="card"><h3>Fases (kVA)</h3><div class="bars">${R.PH.map(k=>`<div class="bar"><span class="ph ${k}">${k}</span><div class="track"><div class="fill ${k}" style="width:${(R.ph[k]/maxPh*100).toFixed(1)}%"></div></div><span class="mono" style="text-align:right">${fmt(R.ph[k]/1000,2)}</span></div>`).join("")}</div></div>
  <div class="card"><h3>Pendências</h3><ul class="pend">${pd.map(([t,v])=>`<li class="${v?"ok":""}">${t}</li>`).join("")}</ul></div>`;
}
function liveCells(){R.out.forEach(o=>{const a=document.querySelector(`[data-live="S${o.i}"]`),b=document.querySelector(`[data-live="I${o.i}"]`);if(a)a.textContent=fmt0(o.S);if(b)b.textContent=fmt(o.ib,1);});}
function render(keepScroll){calc();renderSteps();renderStamp();renderSummary();
  const sh=document.getElementById("sheet");sh.innerHTML=V[STEPS[cur].k]();liveCells();
  if(!keepScroll)sh.scrollIntoView({block:"start",behavior:"auto"});}
function soft(){calc();renderSteps();renderStamp();renderSummary();liveCells();
  document.querySelectorAll('[data-live="cls"]').forEach(el=>el.innerHTML=clsCard());
  document.querySelectorAll('[data-live="dps"]').forEach(el=>el.innerHTML=dpsCard());
  // atualiza textos automáticos do memorial sem perder foco
  if(STEPS[cur].k==="memo"){const au=memoAuto();Object.keys(MEMO_T).forEach(k=>{if(S.memo[k]==null){const t=document.getElementById("memo-"+k);if(t&&document.activeElement!==t)t.value=au[k];}});}
  if(!document.getElementById("jsonPanel").hidden)atualizarJsonOut();
  persist();}
function toast(m){const t=document.getElementById("toast");t.textContent=m;t.hidden=false;clearTimeout(t._t);t._t=setTimeout(()=>t.hidden=true,3200);}

/* ============================================================
   EVENTOS
   ============================================================ */
document.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.step!=null){cur=+b.dataset.step;render();try{localStorage.setItem(LSKEY+"-step",cur);}catch(_){}return;}
  if(b.dataset.go!=null){cur=+b.dataset.go;render();try{localStorage.setItem(LSKEY+"-step",cur);}catch(_){}window.scrollTo({top:0});return;}
  if(b.dataset.add){const t=b.dataset.add;const q=S.quadros.at(-1).nome;
    const base={ilum:{nome:"Iluminação",lig:"F+N",qtd:10,pot:100,unid:"W",fp:0.95},tug:{nome:"Tomadas de uso geral",lig:"F+N",qtd:6,pot:200,unid:"VA",fp:0.8,fd:0.7},tue:{nome:"Tomada de uso específico",lig:"F+F",qtd:1,pot:2000,unid:"W",fp:0.9},motor:{nome:"Motor",lig:"3F",qtd:1,pot:5,unid:"cv",fp:0.83,eta:0.87,fs:1.25,fu:0.87,prot:"dj",partida:"direta",fusTipo:"gG"}}[t];
    const sy=SISTEMAS[S.forn.sistema];if(!ligOK(base.lig,sy))base.lig=["3F","2F+N","F+F","F+N"].find(l=>ligOK(l,sy)&&(t!=="motor"||l!=="2F+N"))||"F+N";
    S.circ.push(Object.assign({q,tipo:t,eta:1,fu:1,fd:1,can:"CN-1",ld:10,lb:3},base));S.exemplo=S.exemplo&&true;persist();render(true);return;}
  if(b.dataset.del!=null){S.circ.splice(+b.dataset.del,1);persist();render(true);return;}
  if(b.id==="addQ"){S.quadros.push({nome:"QD-"+S.quadros.length,L:20,met:"B1"});persist();render(true);return;}
  if(b.dataset.delq!=null){const j=+b.dataset.delq;const nm=S.quadros[j].nome;S.quadros.splice(j,1);S.circ.forEach(c=>{if(c.q===nm)c.q=S.quadros[0].nome;});persist();render(true);return;}
  if(b.dataset.pick){document.getElementById("pick-"+b.dataset.pick).click();return;}
  if(b.dataset.rmfile){const [k,j]=b.dataset.rmfile.split(":");S.anexos[k].splice(+j,1);render(true);return;}
  if(b.dataset.memoreset){delete S.memo[b.dataset.memoreset];persist();render(true);return;}
  if(b.id==="btnPdf"){gerarPDF();return;}
  if(b.id==="btnSample"){S=sample();cur=3;persist();render();toast("Exemplo da mini-indústria carregado (dados fictícios).");return;}
  if(b.id==="btnNew"){S=blank();cur=0;persist();render();toast("Projeto em branco criado.");return;}
  if(b.id==="btnSave"){salvarJSON();return;}
  if(b.id==="btnOpen"){document.getElementById("fileOpen").click();return;}
  if(b.id==="btnTxt"){const pn=document.getElementById("jsonPanel");pn.hidden=!pn.hidden;b.setAttribute("aria-expanded",String(!pn.hidden));if(!pn.hidden)atualizarJsonOut();return;}
  if(b.id==="btnCopy"){const ta=document.getElementById("jsonOut");atualizarJsonOut();navigator.clipboard?.writeText(ta.value).then(()=>toast("JSON copiado."),()=>{ta.focus();ta.select();toast("Selecionado: use Ctrl+C para copiar.");})??(ta.select(),toast("Selecionado: use Ctrl+C para copiar."));return;}
  if(b.id==="btnImpTxt"){importarTexto(document.getElementById("jsonIn").value);return;}
});
document.addEventListener("input",e=>{
  const t=e.target;
  if(t.dataset.bind){setP(t.dataset.bind,t.type==="checkbox"?t.checked:t.value);soft();return;}
  if(t.dataset.c!=null){const c=S.circ[+t.dataset.c];const f=t.dataset.f;const num=["qtd","pot","fp","eta","fs","fu","fd","ld","lb"].includes(f);c[f]=num?(t.value===""?0:+t.value):t.value;soft();return;}
  if(t.dataset.qd!=null){const q=S.quadros[+t.dataset.qd];const f=t.dataset.f;if(f==="nome"){const old=q.nome;q.nome=t.value;S.circ.forEach(c=>{if(c.q===old)c.q=t.value;});}else q[f]=f==="L"?+t.value||0:t.value;soft();return;}
  if(t.dataset.can!=null){S.canaletas[t.dataset.can]={L:+t.value||0};soft();return;}
  if(t.dataset.memo){S.memo[t.dataset.memo]=t.value;persist();return;}
  if(t.dataset.preco!=null){S.precos=S.precos||{};const v=parseFloat(t.value);if(isFinite(v)&&v>0)S.precos[t.dataset.preco]=v;else delete S.precos[t.dataset.preco];
    const c=custos();c.m.forEach((r,i)=>{const el=document.querySelector(`[data-live="sub${i}"]`);if(el)el.textContent=r.pu?brl(r.sub):"—";});
    Object.keys(GRUPOS).forEach(g=>{const el=document.querySelector(`[data-live="grp-${g}"]`);if(el)el.textContent=brl(c.por[g]||0);});
    const tt=document.querySelector('[data-live="totmat"]');if(tt)tt.textContent=brl(c.tot);const sp=document.querySelector('[data-live="sempreco"]');if(sp)sp.textContent=`${c.semPreco} de ${c.m.length} itens sem preço informado.`;
    persist();return;}
});
document.addEventListener("change",e=>{
  const t=e.target;
  if(t.dataset.c!=null&&(t.dataset.re||t.dataset.f==="tipo")){const c=S.circ[+t.dataset.c];if(c.tipo==="motor"){c.unid="cv";c.eta=c.eta<1?c.eta:0.87;c.fu=0.87;c.fs=1.25;c.prot=c.prot||"dj";c.partida=c.partida||"direta";c.fusTipo=c.fusTipo||"gG";if(c.lig==="F+N"&&ligOK("3F",SISTEMAS[S.forn.sistema]))c.lig="3F";}else if(c.unid==="cv"){c.unid="W";c.eta=1;}persist();render(true);return;}
  if(t.dataset.c!=null&&["prot","partida","fusTipo","local","dr"].includes(t.dataset.f)){render(true);return;}
  if(t.dataset.bind||t.dataset.qd!=null||t.dataset.c!=null){if(t.tagName==="SELECT"||t.type==="checkbox"||t.dataset.qd!=null){render(true);}return;}
  if(t.dataset.file){addFiles(t.dataset.file,t.files);t.value="";return;}
  if(t.id==="fileOpen"){abrirJSON(t.files[0]);t.value="";}
  if(t.id==="jsonAnexos"){atualizarJsonOut();}
});
document.addEventListener("dragover",e=>{const d=e.target.closest("[data-drop]");if(d){e.preventDefault();d.classList.add("over");}});
document.addEventListener("dragleave",e=>{const d=e.target.closest("[data-drop]");if(d)d.classList.remove("over");});
document.addEventListener("drop",e=>{const d=e.target.closest("[data-drop]");if(d){e.preventDefault();d.classList.remove("over");addFiles(d.dataset.drop,e.dataTransfer.files);}});

function readB64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});}
async function addFiles(k,files){
  let n=0;
  for(const f of files){const ok=/pdf$/i.test(f.type)||/\.pdf$/i.test(f.name)||/image\/(png|jpe?g)/i.test(f.type);
    if(!ok){toast(`“${f.name}” não é PDF, PNG ou JPG.`);continue;}
    S.anexos[k].push({name:f.name,type:f.type||(/\.pdf$/i.test(f.name)?"application/pdf":""),size:f.size,b64:await readB64(f)});n++;}
  render(true);if(n)toast(`${n} arquivo(s) anexado(s).`);
}
const b64ToBytes=b=>{const s=atob(b);const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;};

// Download local: cria um link temporário para o arquivo gerado no navegador
async function oferecer(filename,data){
  try{
    const blob=data instanceof Blob?data:new Blob([data],{type:/\.json$/i.test(filename)?"application/json":"application/octet-stream"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);toast("Arquivo salvo: "+filename);return true;
  }catch(err){toast("Não foi possível salvar o arquivo: "+(err&&err.message||err));return false;}
}
function slug(s){return (s||"projeto").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,60)||"projeto";}
function exportObj(comAnexos=true){const o=JSON.parse(JSON.stringify(S));o.formato="projeto-eletrico-agro";o.v=2;o.exportadoEm=new Date().toISOString();if(!comAnexos)o.anexos=blank().anexos;return o;}
function atualizarJsonOut(){const ta=document.getElementById("jsonOut");if(ta)ta.value=JSON.stringify(exportObj(document.getElementById("jsonAnexos")?.checked),null,2);}
function salvarJSON(){oferecer(`${slug(S.id.obra)}.json`,JSON.stringify(exportObj(true),null,2));}
function normalizar(d){
  if(!d||typeof d!=="object"||!Array.isArray(d.circ)||!d.id)throw new Error("estrutura");
  const b=blank();
  const n=Object.assign(b,d,{id:Object.assign(b.id,d.id),forn:Object.assign(b.forn,d.forn||{}),par:Object.assign(b.par,d.par||{}),canaletas:d.canaletas||{},memo:d.memo||{},chk:d.chk||{}});
  if(!SISTEMAS[n.forn.sistema])n.forn.sistema="380/220";if(!CLASSES[n.forn.classe])n.forn.classe="rural";if(!T42[n.par.agrDist])n.par.agrDist="feixe";if(!METODOS[n.par.metDist])n.par.metDist="B1";if(!METODOS[n.par.metBaix])n.par.metBaix="B1";
  n.quadros=Array.isArray(d.quadros)&&d.quadros.length?d.quadros.map(q=>({nome:String(q.nome||"QD"),L:+q.L||0,met:METODOS[q.met]?q.met:"B1"})):b.quadros;
  n.precos=d.precos&&typeof d.precos==="object"?d.precos:{};if(!ATERR[n.forn.aterr])n.forn.aterr="TN-S";
  const def={local:"seco",dr:"auto",q:n.quadros[0].nome,nome:"Circuito",tipo:"tug",lig:"F+N",qtd:1,pot:100,unid:"VA",fp:0.8,eta:1,fs:1,fu:1,fd:1,can:"CN-1",ld:0,lb:0};
  n.circ=d.circ.map(c=>{const x=Object.assign({},def,c.tipo==="motor"?{fs:1.25,prot:"dj",partida:"direta",fusTipo:"gG"}:{},c);if(!TIPOS[x.tipo])x.tipo="tug";if(!LIG[x.lig])x.lig="F+N";["qtd","pot","fp","eta","fs","fu","fd","ld","lb"].forEach(k=>x[k]=+x[k]||0);if(!n.quadros.some(q=>q.nome===x.q))x.q=n.quadros[0].nome;return x;});
  n.anexos=Object.assign(b.anexos,{});
  if(d.anexos)for(const k of Object.keys(n.anexos))if(Array.isArray(d.anexos[k]))n.anexos[k]=d.anexos[k].filter(f=>f&&f.b64&&f.name);
  delete n.formato;delete n.exportadoEm;n.v=1;
  return n;
}
function aplicarImport(d){S=normalizar(d);cur=0;persist();render();const na=Object.values(S.anexos).reduce((a,l)=>a+l.length,0);toast(`Projeto importado: ${S.circ.length} circuitos${na?`, ${na} anexo(s)`:""}.`);}
async function abrirJSON(f){if(!f)return;try{aplicarImport(JSON.parse(await f.text()));}catch(e){toast("Arquivo inválido: use um .json exportado por esta ferramenta.");}}
function importarTexto(t){try{aplicarImport(JSON.parse(t));document.getElementById("jsonIn").value="";}catch(e){toast("Texto inválido: cole o JSON completo exportado por esta ferramenta.");}}

/* ============================================================
   PDF
   ============================================================ */
const WIN=new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
function pt(s){s=String(s??"").replace(/≤/g,"<=").replace(/≥/g,">=").replace(/Δ/g,"dV").replace(/√3/g,"raiz(3)").replace(/√/g,"raiz").replace(/Ω/g,"ohm").replace(/η/g,"rend.").replace(/φ/g,"phi").replace(/→/g,"->").replace(/←/g,"<-").replace(/✕/g,"x").replace(/ | /g," ");
  let o="";for(const ch of s){const c=ch.codePointAt(0);o+=(c<256||WIN.has(ch))?ch:"?";}return o;}
async function gerarPDF(){
  const prog=document.getElementById("pdfProg"),msg=document.getElementById("pdfMsg");
  const setP=(x,m)=>{prog.hidden=false;prog.firstElementChild.style.width=(x*100)+"%";if(m){msg.hidden=false;msg.className="note";msg.textContent=m;}};
  if(!window.PDFLib){msg.hidden=false;msg.className="note bad";msg.textContent="A biblioteca de PDF não carregou. Verifique se o arquivo js/vendor/pdf-lib.min.js está na pasta.";return;}
  try{
  calc();setP(0.05,"Montando documentos gerados...");
  const {PDFDocument,StandardFonts,rgb}=PDFLib;
  const doc=await PDFDocument.create();
  doc.setTitle(pt(`Projeto elétrico — ${S.id.obra||"obra"}`));doc.setAuthor(pt(S.id.rt||""));doc.setCreator("Projeto Elétrico Agroindustrial");
  const F=await doc.embedFont(StandardFonts.Helvetica),FB=await doc.embedFont(StandardFonts.HelveticaBold);
  const INK=rgb(0.09,0.13,0.11),MUT=rgb(0.38,0.44,0.41),ACC=rgb(0.05,0.42,0.31),LN=rgb(0.8,0.85,0.82),BG=rgb(0.94,0.96,0.95);
  const A4=[595.28,841.89],A4L=[841.89,595.28];
  const gen=new Set(); // páginas geradas (recebem carimbo/numeração)
  const toc=[]; // [titulo, indicePagina]
  let pg,y,W,H,M=46,curTitle="";
  function newPage(land=false,title=curTitle){pg=doc.addPage(land?A4L:A4);[W,H]=land?A4L:A4;y=H-M-18;gen.add(doc.getPageCount()-1);curTitle=title;pg._title=title;return pg;}
  function wrap(t,font,size,maxW){const out=[];for(const para of pt(t).split("\n")){let line="";for(const w of para.split(/ +/)){const tst=line?line+" "+w:w;if(font.widthOfTextAtSize(tst,size)>maxW&&line){out.push(line);line=w;}else line=tst;}out.push(line);}return out;}
  function ensure(h,land){if(y-h<M+24)newPage(land??(W>H));}
  function text(t,{size=10,font=F,color=INK,x=M,maxW=W-2*M,gap=4,lead=1.35}={}){const ls=wrap(t,font,size,maxW);for(const l of ls){ensure(size*lead);pg.drawText(l,{x,y:y-size,size,font,color});y-=size*lead;}y-=gap;}
  function h1(t,land=false){newPage(land,t);pg.drawText(pt(t),{x:M,y:y-18,size:18,font:FB,color:INK});y-=26;pg.drawRectangle({x:M,y:y,width:W-2*M,height:1.5,color:ACC});y-=14;}
  function h2(t){ensure(40);y-=4;pg.drawText(pt(t),{x:M,y:y-12,size:12,font:FB,color:ACC});y-=20;}
  function table(cols,rows,{size=7.5,land=W>H}={}){
    const tw=W-2*M;const ws=cols.map(c=>c.w*tw);const pad=3,lead=size*1.25;
    const drawHead=()=>{const hl=cols.map((c,i)=>wrap(c.h,FB,size,ws[i]-2*pad));const hh=Math.max(...hl.map(l=>l.length))*lead+2*pad;ensure(hh+lead*2,land);pg.drawRectangle({x:M,y:y-hh,width:tw,height:hh,color:BG});let x=M;hl.forEach((ls,i)=>{ls.forEach((l,j)=>{const tw2=FB.widthOfTextAtSize(l,size);const xx=cols[i].a==="r"?x+ws[i]-pad-tw2:x+pad;pg.drawText(l,{x:xx,y:y-pad-size-(j*lead),size,font:FB,color:MUT});});x+=ws[i];});y-=hh;};
    drawHead();
    for(const r of rows){const bold=r._b;const cells=r.map((v,i)=>wrap(v,bold?FB:F,size,ws[i]-2*pad));const rh=Math.max(...cells.map(l=>l.length))*lead+2*pad;
      if(y-rh<M+24){newPage(land);drawHead();}
      if(bold)pg.drawRectangle({x:M,y:y-rh,width:tw,height:rh,color:BG});
      let x=M;cells.forEach((ls,i)=>{ls.forEach((l,j)=>{const f=bold?FB:F;const tw2=f.widthOfTextAtSize(l,size);const xx=cols[i].a==="r"?x+ws[i]-pad-tw2:x+pad;pg.drawText(l,{x:xx,y:y-pad-size-(j*lead),size,font:f,color:INK});});x+=ws[i];});
      y-=rh;pg.drawLine({start:{x:M,y},end:{x:M+tw,y},thickness:0.4,color:LN});}
    y-=10;
  }
  function kv(pairs){table([{h:"Item",w:0.35},{h:"Valor",w:0.65}],pairs,{size:9});}
  function pendencia(titulo,desc){newPage(false,titulo);pg.drawText(pt(titulo),{x:M,y:y-18,size:18,font:FB,color:INK});y-=40;pg.drawRectangle({x:M,y:y-70,width:W-2*M,height:70,borderColor:rgb(0.6,0.36,0),borderWidth:1.2,color:rgb(0.97,0.92,0.84)});pg.drawText(pt("DOCUMENTO PENDENTE"),{x:M+14,y:y-26,size:12,font:FB,color:rgb(0.6,0.36,0)});pg.drawText(pt(desc),{x:M+14,y:y-46,size:9.5,font:F,color:INK});}
  const id=S.id,sys=R.sys,p=S.par;

  // CAPA
  newPage(false,"Capa");
  pg.drawRectangle({x:M,y:H-M-6,width:W-2*M,height:3,color:ACC});
  pg.drawText(pt("PROJETO DE INSTALAÇÕES ELÉTRICAS"),{x:M,y:H-M-40,size:11,font:FB,color:ACC});
  let yy=H-M-80;for(const l of wrap(id.obra||"Obra",FB,26,W-2*M)){pg.drawText(l,{x:M,y:yy,size:26,font:FB,color:INK});yy-=32;}
  for(const l of wrap(id.atividade||"",F,12,W-2*M)){pg.drawText(l,{x:M,y:yy,size:12,font:F,color:MUT});yy-=16;}
  y=yy-30;kv([["Cliente",id.cliente||"—"],["Local",`${id.local||"—"} — ${id.municipio||""}`],["Unidade consumidora",id.uc||"—"],["Distribuidora",id.distribuidora||"—"],["Classificação",`${R.cls.classeT} / ${R.cls.subclasse} — Grupo ${R.cls.grupo}, subgrupo ${R.cls.sub}, ${R.cls.modalidade}`],["Alimentação",sys.nome],["Carga instalada",`${fmt(R.inst,2)} kW`],["Demanda (c/ reserva)",`${fmt(R.ent.S,2)} kVA`],["Responsável técnico",`${id.rt||"—"} — CREA ${id.crea||"—"}`],["ART",id.art||"—"],["Data",id.data||"—"]]);
  const sumIndex=1; // sumário será inserido aqui depois

  // ===== SEPARADORES (fluxo da Aula 2, slide 7) =====
  const CO=await doc.embedFont(StandardFonts.Courier);
  const SBG=rgb(0.059,0.239,0.18),SAMB=rgb(0.949,0.698,0.2),SCR=rgb(0.957,0.937,0.886),SSOFT=rgb(0.624,0.769,0.702),SDIM=rgb(0.114,0.353,0.271);
  const FLUXO=["ART","Solicitação","Mem. descr.","Mem. cálc.","Plantas","Quadros","Unifilar","Multifilar","Detalhes","Especif.","Materiais"];
  let nSep=0;const totSep=FLUXO.length+(S.anexos.outros.length?1:0);
  function separador(titulo,item,desc,itens,fi){
    nSep++;const [w,h]=A4;const page=doc.addPage(A4);toc.push([titulo,doc.getPageCount()-1]);
    page.drawRectangle({x:0,y:0,width:w,height:h,color:SBG});page.drawRectangle({x:0,y:0,width:31,height:h,color:SAMB});
    const num=String(nSep).padStart(2,"0");const ns=290;page.drawText(num,{x:w-22-FB.widthOfTextAtSize(num,ns),y:h-300,size:ns,font:FB,color:SDIM});
    const x=68;page.drawText(pt(`SEÇÃO ${num} DE ${String(totSep).padStart(2,"0")}  ·  AULA 2 — ${item.toUpperCase()}`),{x,y:h-74,size:9.5,font:CO,color:SAMB});
    page.drawText(pt("Etapa do projeto"),{x,y:h-330,size:24,font:F,color:SSOFT});
    const maxw=w-x-56;let fs=38;const T=pt(titulo.toUpperCase());let ls=wrap(T,FB,fs,maxw);while(ls.length>2&&fs>24){fs-=2;ls=wrap(T,FB,fs,maxw);}
    let yy=h-380;ls.forEach(l=>{page.drawText(l,{x,y:yy,size:fs,font:FB,color:SCR});yy-=fs*1.12;});
    page.drawRectangle({x,y:yy+fs*0.45,width:86,height:5,color:SAMB});yy-=18;
    wrap(desc,F,12,maxw).forEach(l=>{page.drawText(l,{x,y:yy,size:12,font:F,color:SCR});yy-=17;});
    yy-=22;page.drawText(pt("O QUE ESTA SEÇÃO CONTÉM"),{x,y:yy,size:9,font:CO,color:SAMB});yy-=20;
    itens.forEach(it=>{wrap(it,F,10.5,maxw-16).forEach((l,j)=>{if(j===0)page.drawCircle({x:x+3,y:yy+3.5,size:2.4,color:SAMB});page.drawText(l,{x:x+14,y:yy,size:10.5,font:F,color:SCR});yy-=15;});yy-=3;});
    const fy=78,gw=(w-x-56)/FLUXO.length;page.drawText(pt("FLUXO DO PROJETO (AULA 2, SLIDE 7)"),{x,y:fy+30,size:7,font:CO,color:SSOFT});
    FLUXO.forEach((l,k)=>{const cx=x+k*gw;page.drawRectangle({x:cx,y:fy+10,width:gw-3,height:6,color:k===fi?SAMB:(k<fi?SSOFT:SDIM)});page.drawText(pt(l),{x:cx,y:fy-2,size:6.3,font:k===fi?FB:F,color:k===fi?SCR:SSOFT});});
    page.drawText(pt(`${S.id.obra||"Projeto elétrico"}  ·  ${S.id.cliente||""}`).slice(0,100),{x,y:40,size:8,font:F,color:SSOFT});
  }
  const arqs=k=>S.anexos[k].length?S.anexos[k].map(f=>"Arquivo anexado: "+f.name):["Pendente: nenhum arquivo anexado"];

  // 1 · ART
  setP(0.1);
  const anexar=async(k,titulo)=>{
    const fs=S.anexos[k];if(!fs.length)return false;
    for(const f of fs){const bytes=b64ToBytes(f.b64);
      try{
        if(/pdf/i.test(f.type)||/\.pdf$/i.test(f.name)){const src=await PDFDocument.load(bytes,{ignoreEncryption:true});const ps=await doc.copyPages(src,src.getPageIndices());ps.forEach(pp=>doc.addPage(pp));}
        else{const img=/png/i.test(f.type)?await doc.embedPng(bytes):await doc.embedJpg(bytes);const land=img.width>img.height;const [pw,ph]=land?A4L:A4;const page=doc.addPage([pw,ph]);const sc=Math.min((pw-60)/img.width,(ph-80)/img.height);page.drawImage(img,{x:(pw-img.width*sc)/2,y:(ph-img.height*sc)/2-6,width:img.width*sc,height:img.height*sc});page.drawText(pt(`${titulo} — ${f.name}`),{x:30,y:ph-28,size:9,font:FB,color:MUT});}
      }catch(err){pendencia(titulo,`Não foi possível ler "${f.name}" (arquivo protegido ou corrompido).`);}
    }return true;};
  separador("Anotação de Responsabilidade Técnica","Item L","Documento registrado no CREA que vincula o responsável técnico ao projeto. É o primeiro documento entregue à distribuidora.",[`Responsável técnico: ${id.rt||"—"} — CREA ${id.crea||"—"}`,`ART nº ${id.art||"não informado"}`,...arqs("art")],0);
  if(!(await anexar("art","ART — Anotação de Responsabilidade Técnica")))pendencia("ART — Anotação de Responsabilidade Técnica","Anexe a ART de projeto registrada no CREA na etapa 10.");

  // 2 · SOLICITAÇÃO
  setP(0.2);
  separador("Solicitação à distribuidora","Carta de solicitação","Carta que encaminha o projeto para análise e aprovação, com os dados de enquadramento da unidade consumidora.",[`Destinatário: ${id.distribuidora||"distribuidora local"}`,`Classe ${R.cls.classeT} / ${R.cls.subclasse} — Grupo ${R.cls.grupo}, subgrupo ${R.cls.sub}`,`Carga instalada ${fmt(R.inst,2)} kW · demanda com reserva ${fmt(R.ent.S,2)} kVA`,`Alimentação: ${sys.nome}`],1);
  h1("Carta de solicitação à distribuidora");
  const hoje=new Date((id.data||new Date().toISOString().slice(0,10))+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"});
  text(`${id.municipio||"Município"}, ${hoje}.`,{gap:14});
  text(`À ${id.distribuidora||"Distribuidora"}`,{font:FB});text("Setor de análise de projetos particulares",{gap:14});
  text(`Assunto: solicitação de análise e aprovação de projeto elétrico — ${id.obra||"obra"}${id.uc?`, UC ${id.uc}`:""}.`,{font:FB,gap:12});
  text(`Prezados, encaminhamos para análise e aprovação o projeto das instalações elétricas da obra "${id.obra||"—"}", de propriedade de ${id.cliente||"—"}, localizada em ${id.local||"—"}, ${id.municipio||"—"}. A instalação possui carga instalada de ${fmt(R.inst,2)} kW e demanda prevista de ${fmt(R.ent.S,2)} kVA, classe ${R.cls.classeT}, subclasse ${R.cls.subclasse}, Grupo ${R.cls.grupo} (subgrupo ${R.cls.sub}), com atendimento em ${S.forn.atend==="MT"?`tensão primária de ${fmt(+S.forn.tensaoPrim,1)} kV e transformador próprio${S.forn.trafoKVA?` de ${S.forn.trafoKVA} kVA`:""}`:"tensão secundária"}, alimentação ${sys.nome}.`,{gap:10});
  text("Seguem anexos: ART, memorial descritivo, memorial de cálculo, plantas, quadros de distribuição de cargas, diagramas, detalhes, especificações e lista de materiais.",{gap:10});
  text("Colocamo-nos à disposição para esclarecimentos.",{gap:40});
  text("_______________________________________",{gap:2});text(id.rt||"Responsável técnico",{font:FB,gap:2});text(`CREA ${id.crea||"—"}${id.art?` · ART ${id.art}`:""}`,{color:MUT});

  // 3 · MEMORIAL DESCRITIVO
  setP(0.3,"Escrevendo memoriais...");
  separador("Memorial descritivo","Item H","Descreve o projeto e justifica as soluções adotadas: identificação, normas, fornecimento, distribuição, condutores, proteção e aterramento.",Object.values(MEMO_T),2);
  h1("Memorial descritivo");
  Object.entries(MEMO_T).forEach(([k,t])=>{h2(t);text(memoText(k),{size:10,gap:6});});

  // 4 · MEMORIAL DE CÁLCULO
  separador("Memorial de cálculo","Item I","Cálculos que sustentam o projeto: previsão de cargas, demanda, dimensionamento de condutores, condutos e dispositivos de proteção.",[`${R.out.length} circuitos em ${S.quadros.length} quadro(s)`,`Demanda ${fmt(R.dem,2)} kW · ${fmt(R.demS,2)} kVA · FP ${fmt(R.fpG,2)}`,`Métodos de referência: distribuição ${p.metDist}, baixadas ${p.metBaix}`,`Alimentador geral: ${R.ent.s?R.ent.txt+" mm², disjuntor "+R.ent.polos+"P "+R.ent.inom+" A":"sem solução"}`,`${Object.keys(R.cans).length} canaleta(s) de distribuição`],3);
  h1("Memorial de cálculo");
  h2("Critérios adotados");
  kv([["Norma","ABNT NBR 5410:2004 — condutor de cobre, isolação PVC 70 °C (Tab. 36 e 38)"],["Alimentação",sys.nome],["Método — distribuição",METODOS[p.metDist]],["Agrupamento na distribuição",T42[p.agrDist].t],["Método — baixadas",METODOS[p.metBaix]],["Temperatura ambiente / solo",`${p.temp} °C (FCT ${fct(p.metDist).toFixed(2)}) / ${p.tempSolo} °C`],["Queda de tensão admissível",`terminais ${fmt(+p.dvTerm,1)} % · total ${fmt(+p.dvTotal,1)} % · entrada ${fmt(+p.dvEnt,1)} %`],["Resistividade",`${p.rho} ohm·mm²/m`],["Reserva",`${p.reserva} %`]]);
  h2("Equações");
  text("S = P / FP;  I = S / V (F+N e 2F);  I = S / (raiz(3) · Vff) (3F).  Motor: P = cv × 735,5 / rend.;  Ib = In × FS (6.5.1.3.1); partida: dV com Ip de um motor e cos phi = 0,3 <= "+fmt(+p.dvPartida,0)+" % (6.5.1.3.3), Ip/In = "+fmt(+p.ipin,1)+".",{size:9});
  text("Iz = I(Tab. 36/38) × FCT(Tab. 40) × FCA(Tab. 42) >= Ib no trecho mais restritivo;  dV% = k · rho · L · Ib · cos phi / (S · V) × 100 (6.2.7.4);  Ib <= In <= Iz (5.3.4).",{size:9});
  text("Demanda = soma(P × Fu × FD); potência de alimentação = demanda × (1 + reserva). Neutro: Tab. 48. Condutor de proteção: Tab. 58. Eletrodutos: ocupação <= 53 % / 31 % / 40 % (6.2.11.1.6).",{size:9,gap:8});
  h1("Previsão de cargas e demanda",true);
  table([{h:"#",w:.03,a:"r"},{h:"Circuito",w:.2},{h:"Quadro",w:.07},{h:"Tipo",w:.06},{h:"Ligação",w:.05},{h:"Nº",w:.035,a:"r"},{h:"Pot. unit.",w:.07,a:"r"},{h:"FP",w:.04,a:"r"},{h:"η",w:.04,a:"r"},{h:"P (W)",w:.07,a:"r"},{h:"Q (var)",w:.07,a:"r"},{h:"S (VA)",w:.07,a:"r"},{h:"Fu",w:.035,a:"r"},{h:"FD",w:.035,a:"r"},{h:"Demanda (kW)",w:.075,a:"r"},{h:"Fases",w:.035}],
    [...R.out.map(o=>[o.i+1,o.c.nome,o.c.q,TIPO_CURTO[o.c.tipo],o.L.txt,o.c.qtd,`${fmt(+o.c.pot,+o.c.pot%1?2:0)} ${o.c.unid}`,fmt(+o.c.fp,2),o.c.tipo==="motor"?fmt(+o.c.eta,2):"—",fmt0(o.P),fmt0(o.Q),fmt0(o.S),fmt(+o.c.fu,2),fmt(+o.c.fd,2),fmt(o.dem,2),o.fases]),
     Object.assign(["","TOTAL","","","","","","","",fmt0(R.inst*1000),"",fmt0(R.out.reduce((a,o)=>a+o.S,0)),"","",fmt(R.dem,2),""],{_b:true})]);
  kv([["Carga instalada",`${fmt(R.inst,2)} kW`],["Demanda ativa / reativa",`${fmt(R.dem,2)} kW / ${fmt(R.demQ,2)} kvar`],["Demanda aparente / FP global",`${fmt(R.demS,2)} kVA / ${fmt(R.fpG,2)}`],["Fator de demanda global",R.inst>0?fmt(R.dem/R.inst,2):"—"],["Potência de alimentação (c/ reserva)",`${fmt(R.ent.S,2)} kVA`],["Corrente da entrada",`${fmt(R.Ient,1)} A — ${sys.nome}`],[`Carga por fase ${R.PH.join(" / ")}`,R.PH.map(k=>fmt(R.ph[k]/1000,2)).join(" / ")+" kVA"],["Classificação",`${R.cls.classeT} / ${R.cls.subclasse} — Grupo ${R.cls.grupo}, subgrupo ${R.cls.sub}, tarifa ${R.cls.modalidade}`],["Enquadramento (REN 1.000/2021, art. 23)",R.inst>75?"Carga instalada > 75 kW: tensão primária":"Carga instalada <= 75 kW: tensão secundária"]]);
  h1("Dimensionamento de condutores, condutos e proteções",true);
  table([{h:"#",w:.03,a:"r"},{h:"Circuito",w:.14},{h:"Quadro",w:.065},{h:"Ib (A)",w:.055,a:"r"},{h:"FCT",w:.04,a:"r"},{h:"FCA",w:.04,a:"r"},{h:"Iz (A)",w:.055,a:"r"},{h:"Fase/N/PE (mm²)",w:.09},{h:"Proteção",w:.135},{h:"L can.+baix. (m)",w:.06,a:"r"},{h:"dV circ.",w:.05,a:"r"},{h:"dV total",w:.05,a:"r"},{h:"dV partida",w:.05,a:"r"},{h:"Eletroduto baixada",w:.075},{h:"Critério",w:.06}],
    R.out.map(o=>[o.i+1,o.c.nome,o.c.q,fmt(o.ib,1),o.fct.toFixed(2),o.fcaD.toFixed(2),o.s?fmt(o.iz,1):"—",o.s?`${sec(o.s)} / ${o.sn?sec(o.sn):"-"} / ${sec(o.spe)}`:"sem solução",protTxt(o),`${o.c.ld}+${o.c.lb}`,o.s?fmt(o.dv,2)+" %":"—",o.s?fmt(o.dvTot,2)+" %":"—",o.dvpTot!=null?fmt(o.dvpTot,1)+" %":"—",o.ed.nome,o.crit.split(" (")[0]]));
  const motores=R.out.filter(o=>o.mp);
  h2("Aterramento, DR e DPS");
  kv([["Esquema de aterramento",ATERR[S.forn.aterr]],["Circuitos com IDR",R.out.filter(o=>o.dr).map(o=>`${o.i+1}: ${o.dr.polos}P ${o.dr.In} A ${o.dr.idn} mA tipo ${o.dr.tipo} — ${o.dr.mot}`).join("; ")||"nenhum"],["DPS no QGBT",R.dps.incl?`${R.dps.cls1?"classe I":"classe II"}, ${R.dps.con}; ${R.dps.itens.map(it=>`${it.n} × ${it.mod}, Uc >= ${it.uc} V, ${it.i}`).join(" + ")}; Up <= ${fmt(R.dps.up,1)} kV — ${R.dps.req?R.dps.motivo:"adotado em projeto"}`:"não obrigatório (5.4.2.1.1)"],...R.issues.map(t=>["Observação",t])]);
  if(motores.length){h2("Proteção e partida dos motores");
    table([{h:"#",w:.03,a:"r"},{h:"Motor",w:.17},{h:"Partida",w:.09},{h:"Proteção",w:.1},{h:"In (A)",w:.05,a:"r"},{h:"Ip (A)",w:.05,a:"r"},{h:"Relé térmico / disj.-motor",w:.18},{h:"Fusíveis / disjuntor",w:.16},{h:"Contatores AC-3 / chave",w:.17}],
      motores.map(o=>{const m=o.mp;return [o.i+1,o.c.nome,PARTIDAS[o.partida],PROTS_CURTO[o.prot],fmt(m.In1,1),fmt(m.Ip,1),o.prot==="djm"?m.djmTxt:m.releTxt,m.fus?m.fusTxt:(o.inom?`${o.L.polos}P ${o.inom} A ${o.curva}`:"—"),[m.contTxt,m.chave].filter(Boolean).join("; ")];}));
    text("Relé ajustado em In do motor (In/raiz(3) no ramo triângulo da estrela-triângulo). Fusível gG: If >= K × Ip (K = 0,5 / 0,4 / 0,3), critério prático a confirmar na curva do fabricante. FS aplicado à corrente de projeto: "+fmt(motores[0].c.fs??1.25,2)+" (padrão conservador).",{size:8.5,color:MUT});}
  h2("Canaletas de distribuição");
  table([{h:"Canaleta",w:.1},{h:"Circuitos",w:.25},{h:"Nº",w:.06,a:"r"},{h:"FCA",w:.07,a:"r"},{h:"Área de cabos (mm²)",w:.13,a:"r"},{h:"Dimensão",w:.17},{h:"Ocupação",w:.1,a:"r"},{h:"Comprimento (m)",w:.12,a:"r"}],
    Object.values(R.cans).map(g=>[g.k,g.circ.join(", "),g.circ.length,g.fca.toFixed(2),fmt0(g.area),g.dim,g.ocup!==null?fmt(g.ocup*100,1)+" %":"—",fmt(g.L,1)]));
  h2("Alimentadores");
  const fr=(nome,f,I,L,met)=>[nome,fmt(I,1),L,met,f&&f.s?f.txt:"—",f&&f.s?fmt(f.iz,1):"—",f&&f.inom?`${f.polos}P ${f.inom} A`:"—",f&&f.s?fmt(f.dv,2)+" %":"—",f&&f.s?f.ed.nome:"—"];
  table([{h:"Alimentador",w:.14},{h:"I (A)",w:.07,a:"r"},{h:"L (m)",w:.06,a:"r"},{h:"Método",w:.06},{h:"Condutores (mm²)",w:.18},{h:"Iz (A)",w:.08,a:"r"},{h:"Disjuntor",w:.1},{h:"dV",w:.07,a:"r"},{h:"Eletroduto",w:.24}],
    [fr("Entrada → QGBT",R.ent,R.Ient,S.forn.Lent,S.forn.metEnt),...R.quadros.filter(q=>q.f).map(q=>fr(`QGBT → ${q.q.nome}`,q.f,q.I,q.q.L,q.q.met))]);

  // 5 · PLANTAS
  setP(0.45,"Incluindo plantas e diagramas...");
  separador("Plantas","Item D","Planta de situação e plantas baixas com pontos de utilização, quadros, rotas de canaletas e baixadas.",[...arqs("situacao").map(x=>"Situação — "+x),...arqs("arquitetonico").map(x=>"Plantas baixas — "+x)],4);
  if(!(await anexar("situacao","Planta de situação")))pendencia("Planta de situação","Anexe a planta de situação na etapa 02.");
  if(!(await anexar("arquitetonico","Plantas baixas com pontos")))pendencia("Plantas baixas com pontos","Anexe as plantas com pontos, quadros e rotas na etapa 08.");

  // 6 · QUADROS DE DISTRIBUIÇÃO DE CARGAS
  separador("Quadros de distribuição de cargas","Item F","Tabelas de cada quadro com a distribuição dos circuitos pelas fases, seções, disjuntores e eletrodutos.",R.quadros.filter(q=>q.cs.length).map(q=>`${q.q.nome}: ${q.cs.length} circuito(s), ${fmt(q.S,2)} kVA com reserva`),5);
  h1("Quadros de distribuição de cargas",true);
  R.quadros.forEach(q=>{if(!q.cs.length)return;h2(`${q.q.nome}${q.f&&q.f.inom?` — disjuntor geral ${q.f.polos}P ${q.f.inom} A, alimentador ${sec(q.f.s)} mm²`:""}`);
    const rows=q.cs.map(o=>{const n=o.fases.length;const v=k=>o.fases.includes(k)?fmt0(o.S/n):"";return [o.i+1,o.c.nome,fmt0(o.S),...R.PH.map(v),o.s?sec(o.s):"—",protTxt(o),o.ed.nome];});
    rows.push(Object.assign(["","TOTAL",fmt0(q.cs.reduce((a,o)=>a+o.S,0)),...R.PH.map(k=>fmt0(q.ph[k])),"","",""],{_b:true}));
    const wph=0.24/R.PH.length;table([{h:"Circ.",w:.05,a:"r"},{h:"Descrição",w:.28},{h:"S total (VA)",w:.08,a:"r"},...R.PH.map(k=>({h:`${k} (VA)`,w:wph,a:"r"})),{h:"Seção (mm²)",w:.07},{h:"Proteção",w:.17},{h:"Eletroduto",w:.11}],rows);});

  // 7 · UNIFILAR
  setP(0.6);
  separador("Diagrama unifilar","Item F","Representa a instalação em uma linha por circuito, do ponto de entrega aos quadros terminais, com manobra e proteção.",arqs("unifilar"),6);
  if(!(await anexar("unifilar","Diagrama unifilar geral")))pendencia("Diagrama unifilar geral","Anexe o diagrama unifilar na etapa 08.");
  // 8 · MULTIFILAR
  separador("Diagramas multifilares","Item F","Cada condutor desenhado: quadros de força, partidas de motores e intertravamentos. É o documento usado na montagem.",arqs("multifilar"),7);
  if(!(await anexar("multifilar","Diagramas multifilares / força e comando")))pendencia("Diagramas multifilares / força e comando","Anexe os diagramas dos quadros e motores na etapa 08.");
  // 9 · DETALHES E CONVENÇÕES
  separador("Detalhes construtivos e convenções","Item G","Detalhes de entrada de serviço, medição, caixas de passagem, aterramento e SPDA, e a legenda de símbolos (NBR 5444).",[...arqs("detalhes").map(x=>"Detalhes — "+x),...(S.anexos.convencoes.length?arqs("convencoes").map(x=>"Convenções — "+x):["Convenções: incluídas nas pranchas"])],8);
  if(!(await anexar("detalhes","Detalhes construtivos")))pendencia("Detalhes construtivos","Anexe os detalhes de entrada, medição e aterramento na etapa 08.");
  await anexar("convencoes","Convenções");

  // 10 · ESPECIFICAÇÕES
  setP(0.8,"Especificações e lista de materiais...");
  separador("Especificações técnicas","Item J","Tipos de materiais e requisitos mínimos de cada componente, admitindo similares com a mesma especificação técnica.",ESPEC.map(e=>e[0]),9);
  h1("Especificações técnicas");
  ESPEC.forEach(([a,b])=>{h2(a);text(b,{size:10});});

  // 11 · LISTA DE MATERIAIS
  const listaMat=materiais();
  separador("Lista de materiais","Item K","Materiais do projeto com especificação e quantidade estimada a partir dos comprimentos informados.",[`${listaMat.length} itens`,`Total estimado: ${brl(custos().tot)}`,`Sobra considerada: ${p.sobra} %`,"Conferir quantidades no levantamento em planta"],10);
  h1("Lista de materiais");
  const cst=custos();const rowsM=[];
  Object.keys(GRUPOS).forEach(g=>{const rs=listaMat.filter(r=>r.g===g);if(!rs.length)return;rowsM.push(Object.assign(["",GRUPOS[g],"","","",""],{_b:true}));
    rs.forEach(r=>rowsM.push([listaMat.indexOf(r)+1,r.d,r.un,r.q,r.pu?brl(r.pu):"—",r.pu?brl(r.sub):"—"]));
    rowsM.push(["",`Subtotal — ${GRUPOS[g]}`,"","","",brl(cst.por[g]||0)]);});
  rowsM.push(Object.assign(["","TOTAL DE MATERIAIS","","","",brl(cst.tot)],{_b:true}));
  table([{h:"Item",w:.06,a:"r"},{h:"Descrição",w:.56},{h:"Un.",w:.05},{h:"Qtd.",w:.07,a:"r"},{h:"Preço unit.",w:.12,a:"r"},{h:"Subtotal",w:.14,a:"r"}],rowsM,{size:8});
  if(cst.semPreco)text(`${cst.semPreco} de ${listaMat.length} itens sem preço informado (não somados).`,{size:8.5,color:MUT});
  text("Quantidades estimadas a partir dos comprimentos informados, com sobra de "+p.sobra+" %. Conferir no levantamento em planta.",{size:8.5,color:MUT});

  // 12 · OUTROS
  if(S.anexos.outros.length){separador("Outros anexos","Complementares","Catálogos, laudos, estudos e demais documentos de apoio.",arqs("outros"),10);await anexar("outros","Outros anexos");}

  // SUMÁRIO (inserido na posição 1)
  setP(0.92,"Numerando folhas...");
  const sp=doc.insertPage(sumIndex,A4);
  const shift=i=>i>=sumIndex?i+1:i;
  const genS=new Set([...gen].map(shift));genS.add(sumIndex);
  let sy=841.89-M-18;sp.drawText(pt("Sumário"),{x:M,y:sy-18,size:18,font:FB,color:INK});sy-=26;sp.drawRectangle({x:M,y:sy,width:595.28-2*M,height:1.5,color:ACC});sy-=22;
  toc.forEach(([t,i],k)=>{const n=String(shift(i)+1);sp.drawText(String(k+1).padStart(2,"0"),{x:M,y:sy,size:10.5,font:FB,color:ACC});sp.drawText(pt(t),{x:M+26,y:sy,size:10.5,font:F,color:INK});sp.drawText(n,{x:595.28-M-F.widthOfTextAtSize(n,10.5),y:sy,size:10.5,font:F,color:INK});sy-=18;});
  // carimbo e numeração
  const N=doc.getPageCount();
  doc.getPages().forEach((pp,i)=>{const {width:w}=pp.getSize();const lab=pt(`Folha ${i+1}/${N}`);
    if(genS.has(i)){pp.drawLine({start:{x:M,y:M-4},end:{x:w-M,y:M-4},thickness:0.6,color:LN});pp.drawText(pt(`${S.id.obra||"Projeto elétrico"} — ${S.id.cliente||""}`).slice(0,110),{x:M,y:M-16,size:7.5,font:F,color:MUT});pp.drawText(pt(`RT: ${S.id.rt||"—"} · CREA ${S.id.crea||"—"}`),{x:M,y:M-26,size:7.5,font:F,color:MUT});}
    pp.drawText(lab,{x:w-M-F.widthOfTextAtSize(lab,7.5),y:genS.has(i)?M-16:12,size:7.5,font:F,color:MUT});});
  const bytes=await doc.save();
  setP(1,`PDF pronto: ${N} folhas, ${fmt(bytes.length/1048576,1)} MB.`);
  await oferecer(`Projeto_eletrico_${slug(S.id.obra)}.pdf`,new Blob([bytes],{type:"application/pdf"}));
  }catch(err){console.error(err);msg.hidden=false;msg.className="note bad";msg.textContent="Falha ao gerar o PDF: "+(err&&err.message||err);}
}

/* ============================================================
   INÍCIO
   ============================================================ */
const had=load();
try{const st=+localStorage.getItem(LSKEY+"-step");if(had&&st>=0&&st<STEPS.length)cur=st;else cur=had?0:3;}catch(e){cur=3;}
render(true);
