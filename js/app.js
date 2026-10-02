"use strict";
/* Projeto Elétrico Agroindustrial — aplicação (depende de js/tabelas.js e js/vendor/pdf-lib.min.js) */
/* ============================================================
   ESTADO
   ============================================================ */
const ANEXOS=[
  {k:"art",t:"ART — Anotação de Responsabilidade Técnica",d:"ART de projeto registrada no CREA (PDF).",etapa:10},
  {k:"situacao",t:"Planta de situação",d:"Acessos, rede da distribuidora, ponto de derivação e posição do padrão de entrada.",etapa:2},
  {k:"arquitetonico",t:"Projeto arquitetônico / planta baixa com pontos",d:"Plantas com pontos de utilização, quadros, rotas de canaletas e baixadas.",etapa:7},
  {k:"luminotecnico",t:"Projeto luminotécnico",d:"Plantas de iluminação, iluminâncias e memória de cálculo por ambiente.",etapa:7},
  {k:"spda",t:"Projeto de SPDA",d:"Análise de risco e documentação do sistema de proteção contra descargas atmosféricas.",etapa:7},
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
    projetos:{eletrico:true,luminotecnico:false,spda:false},
    forn:{sistema:"380/220",atend:"BT",classe:"rural",subclasse:"Agroindustrial",tensaoPrim:13.8,subterraneo:false,modalidade:"",trafo:false,trafoKVA:"",rede:"",distRede:"",Lent:15,metEnt:"D",aterr:"TN-S",aerea:true,aq:"AQ2",spda:false,rhoEletrica:"",ra:30,ul:50,obs:""},
    par:{temp:30,tempSolo:20,rhoSolo:2.5,metDist:"B1",metBaix:"B1",agrDist:"feixe",espEnt:"nula",arrF:"trifolio",arrG:"horizontal",ipin:7,dvPartida:10,simular:true,softLim:3,invLim:1.5,bobina:"220 Vca",icc:6,dpsSempre:false,dvTerm:4,dvTotal:5,dvEnt:1,rho:0.0206,curva:"C",curvaMotor:"D",reserva:20,sobra:10,neutroRed:false,ocupCan:40},
    quadros:[{nome:"QGBT",L:0,met:"B1",pai:""}],
    ambientes:[],
    circ:[],
    canaletas:{},
    anexos:Object.fromEntries(ANEXOS.map(a=>[a.k,[]])),
    memo:{},
    precos:{},
    extras:[],
    orc:{pdf:false,servicos:SERVICOS_PADRAO.map(s=>Object.assign({},s)),despesas:0,lucro:20,impostos:0,validade:30,obs:""},
    estrutura:{L:0,W:0,H:0,ng:"",cd:0.5,np:"III"},
    chk:{}
  };
}
const SERVICOS_PADRAO=[
  {cat:"eng",d:"Engenharia — projeto, memoriais e ART",h:0,vh:0},
  {cat:"serv",d:"Serviço — execução e montagem da instalação",h:0,vh:0},
  {cat:"impl",d:"Implantação — testes, comissionamento e partida assistida",h:0,vh:0}
];
const CAT_SERV={eng:"Engenharia",serv:"Serviço / execução",impl:"Implantação / comissionamento",outro:"Outro"};
function sample(){
  const s=blank();
  s.exemplo=true;
  s.id={cliente:"Agroindústria Exemplo Ltda. (dados fictícios)",obra:"Mini-indústria de beneficiamento de grãos",atividade:"Secagem, descascamento, moagem e ensacamento de grãos",local:"Estrada rural, km 8",municipio:"Pelotas/RS",uc:"0000000",distribuidora:"CEEE Equatorial",rt:"Nome do responsável técnico",crea:"RS000000",art:"",projetista:"Turma 2026.2",data:new Date().toISOString().slice(0,10)};
  s.projetos={eletrico:true,luminotecnico:true,spda:true};
  s.forn={sistema:"380/220",atend:"BT",classe:"rural",subclasse:"Agroindustrial",tensaoPrim:13.8,subterraneo:false,modalidade:"Convencional monômia",trafo:false,trafoKVA:"",rede:"Rede secundária trifásica 380/220 V da distribuidora",distRede:"30 m",Lent:12,metEnt:"D",aterr:"TN-S",aerea:true,aq:"AQ2",spda:true,rhoEletrica:"",ra:30,ul:50,obs:"Padrão de entrada trifásico com medição direta, conforme categoria do RIC da distribuidora."};
  s.quadros=[{nome:"QGBT",L:0,met:"B1",pai:""},{nome:"QF-PROD",L:25,met:"D",pai:"QGBT"},{nome:"QL-ADM",L:18,met:"D",pai:"QGBT"},{nome:"QD-SECADOR",L:15,met:"B1",pai:"QF-PROD"}];
  s.ambientes=[
    {id:"secagem",nome:"Galpão de secagem",comprimento:24,largura:12,altura:6,lux:200,lm:4000,w:40,uf:0.65,mf:0.8,espTomadas:5,espLum:1.5},
    {id:"moagem",nome:"Sala de moagem",comprimento:12,largura:8,altura:4,lux:300,lm:4000,w:40,uf:0.6,mf:0.8,espTomadas:5,espLum:1.5},
    {id:"escritorio",nome:"Escritório",comprimento:6,largura:5,altura:3,lux:500,lm:3600,w:36,uf:0.65,mf:0.8,espTomadas:5,espLum:1.5}
  ];
  const m=(nome,cv,eta,fp,ld,lb,fd=1,fu=0.87)=>({q:"QF-PROD",nome,tipo:"motor",lig:"3F",qtd:1,pot:cv,unid:"cv",fp,eta,fs:1.25,fu,fd,can:"CN-1",ld,lb,prot:"dj",partida:"direta",fusTipo:"gG"});
  s.circ=[
    Object.assign(m("Secador — ventilador",10,0.895,0.85,8,4),{q:"QD-SECADOR",can:"CN-3",partida:"yd",prot:"fus"}),
    Object.assign(m("Secador — rosca de descarga",3,0.86,0.82,10,3),{q:"QD-SECADOR",can:"CN-3"}),
    m("Descascador",7.5,0.895,0.83,14,3),
    Object.assign(m("Moedor (moinho de martelos)",15,0.91,0.85,10,3),{partida:"soft"}),
    Object.assign(m("Ensacadeira com costuradora de sacaria",2,0.83,0.80,8,2.5,0.8),{prot:"djm"}),
    {q:"QF-PROD",nome:"Iluminação do galpão (LED)",tipo:"ilum",lig:"F+N",qtd:12,pot:40,unid:"W",fp:0.95,eta:1,fu:1,fd:1,can:"CN-1",ld:25,lb:4,ambiente:"secagem"},
    {q:"QF-PROD",nome:"Tomada industrial 3P+T (manutenção)",tipo:"tue",lig:"3F+N",qtd:1,pot:3000,unid:"VA",fp:0.8,eta:1,fu:1,fd:0.5,can:"CN-1, CN-2",ld:15,lb:1.5,local:"molhado"},
    {q:"QL-ADM",nome:"Iluminação escritório (LED)",tipo:"ilum",lig:"F+N",qtd:6,pot:36,unid:"W",fp:0.95,eta:1,fu:1,fd:1,can:"CN-2",ld:8,lb:3,ambiente:"escritorio"},
    {q:"QL-ADM",nome:"TUG escritório",tipo:"tug",lig:"F+N",qtd:6,pot:200,unid:"VA",fp:0.8,eta:1,fu:1,fd:0.7,can:"CN-2",ld:10,lb:1.5,ambiente:"escritorio"}
  ];
  s.extras=[
    {g:"cond",d:"Caixa de passagem em alumínio 200 × 200 × 100 mm com tampa",un:"pç",q:6,pu:85},
    {g:"qd",d:"Botoeira de emergência tipo cogumelo com trava, 1NF (NR-12)",un:"pç",q:5,pu:120},
    {g:"extra",d:"Placas de identificação de quadros e circuitos (acrílico gravado)",un:"cj",q:1,pu:350}
  ];
  s.orc={pdf:true,servicos:[
    {cat:"eng",d:"Engenharia — projeto, memoriais e ART",h:40,vh:180},
    {cat:"serv",d:"Serviço — execução e montagem da instalação",h:160,vh:75},
    {cat:"impl",d:"Implantação — testes, comissionamento e partida assistida",h:16,vh:150}
  ],despesas:1500,lucro:20,impostos:8,validade:30,obs:"Valores de exemplo, fictícios. Preços de materiais a confirmar por cotação."};
  s.estrutura={L:36,W:12,H:7,ng:5,cd:0.5,np:"III"};
  s.forn.rhoEletrica=350;
  return s;
}
// créditos do software (contracapa do PDF, rodapé da página e LICENCA.txt)
const CREDITOS={
  software:"Software de Apoio a Projetos de Instalações Elétricas Agroindustriais",
  lab:"Laboratório de Instrumentação Agrícola",
  resp:["Marlon Soares Sigales","Ádamo de Souza Araújo","Ricardo Scherer Pohndorf"],
  repo:"https://github.com/MarlonSigales/app-projetos-de-instalacoes-eletricas-agroindustriais",
  licenca:"Uso livre e gratuito, por conta e risco do utilizador. O software é fornecido no estado em que se encontra, sem garantia de qualquer natureza; os autores e a UFPel não se responsabilizam por danos ou prejuízos decorrentes do seu uso. Os resultados são de apoio ao projeto e devem ser verificados por profissional legalmente habilitado, que responde tecnicamente pelo projeto. Não são permitidas modificações, redistribuição de versões modificadas ou obras derivadas fora do repositório original (github.com/MarlonSigales/app-projetos-de-instalacoes-eletricas-agroindustriais); sugestões e contribuições devem ser feitas no repositório oficial."
};
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
// FCRS — resistividade térmica do solo no método D (Tab. 41, referência 2,5 K·m/W); interpolação linear entre os pontos tabelados
function fcrho(met){
  if(met!=="D")return 1;
  const rho=Math.max(T41[0][0],+S.par.rhoSolo||2.5);
  for(let i=1;i<T41.length;i++)if(rho<=T41[i][0]){const [x0,y0]=T41[i-1],[x1,y1]=T41[i];return y0+(y1-y0)*(rho-x0)/(x1-x0);}
  return T41.at(-1)[1];
}
// FCA do trecho de distribuição: Tab. 45 se enterrado (método D), Tab. 42 nos demais
function fcaDist(n){return S.par.metDist==="D"?fca45(n,S.par.espEnt):fca(n,S.par.agrDist);}
function canaletaLista(valor){return [...new Set(String(valor||"").split(",").map(x=>x.trim()).filter(Boolean))];}
/* ---------- hierarquia de quadros: o primeiro é o QGBT; os demais são alimentados por um quadro "pai" ---------- */
function paiDe(q){if(!q||q===S.quadros[0])return null;return S.quadros.find(x=>x!==q&&x.nome===q.pai)||S.quadros[0];}
function cadeia(q){const c=[];let x=q;while(x&&c.length<60&&!c.includes(x)){c.push(x);x=paiDe(x);}return c;} // do quadro até o QGBT
function descendentes(q){return S.quadros.filter(x=>x!==q&&cadeia(x).includes(q));}
function nivelQ(q){return cadeia(q).length-1;}
function origemQ(q){const p=paiDe(q);return p?p.nome:"";}
function distQGBT(q){return cadeia(q).reduce((a,x)=>a+(x===S.quadros[0]?0:Math.max(0,+x.L||0)),0);} // soma dos trechos até o QGBT
function quadrosEmArvore(){const out=[];const vis=new Set();const rec=(q)=>{if(vis.has(q))return;vis.add(q);out.push(q);S.quadros.filter(x=>x!==q&&paiDe(x)===q).forEach(rec);};rec(S.quadros[0]);S.quadros.forEach(q=>{if(!vis.has(q))out.push(q);});return out;}
function calcularAmbiente(a){
  const L=Math.max(0,+a.comprimento||0),W=Math.max(0,+a.largura||0),H=Math.max(0,+a.altura||0);
  const area=L*W,perimetro=2*(L+W),hm=Math.max(0.5,H-0.8);
  const espT=Math.max(0.5,+a.espTomadas||5),espL=Math.max(0.5,+a.espLum||1.5);
  const tomadas=area>0?Math.max(1,Math.ceil(perimetro/espT)):0; // 9.5.2.2.1: no mínimo um ponto por cômodo
  const uf=Math.max(0.1,+a.uf||0.65),mf=Math.max(0.1,+a.mf||0.8),lm=Math.max(1,+a.lm||0);
  const porFluxo=area>0?Math.ceil(area*(+a.lux||0)/(lm*uf*mf)):0;
  const porEspacamento=area>0?Math.ceil(L/(espL*hm))*Math.ceil(W/(espL*hm)):0;
  const luminarias=Math.max(porFluxo,porEspacamento);
  const em=area>0?luminarias*lm*uf*mf/area:0; // iluminância média mantida obtida
  const k=area>0&&hm>0?area/(hm*(L+W)):0; // índice do recinto (para escolher o FU na tabela do fabricante)
  return {area,perimetro,hm,tomadas,luminarias,potencia:luminarias*(+a.w||0),porFluxo,porEspacamento,em,k,dens:area>0?luminarias*(+a.w||0)/area:0};
}
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
    const iz=Math.min(...use.map(g=>itab(g.met,nc,s)*fct(g.met)*fcrho(g.met)*g.fca));
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
  const grp={};S.circ.forEach(c=>{if((+c.ld||0)>0&&ligOK(c.lig,sys))canaletaLista(c.can).forEach(k=>grp[k]=(grp[k]||0)+1);});
  const out=S.circ.map((c,i)=>{
    const L=LIG[c.lig]||LIG["F+N"];const itSemN=S.forn.aterr==="IT"&&L.n;const ok=ligOK(c.lig,sys)&&!itSemN;
    const ambiente=S.ambientes.find(a=>a.id===c.ambiente),calcAmb=ambiente?calcularAmbiente(ambiente):null;
    const qtd=calcAmb&&(c.tipo==="ilum"||c.tipo==="tug")?(c.tipo==="ilum"?calcAmb.luminarias:calcAmb.tomadas):(+c.qtd||0),pot=calcAmb&&c.tipo==="ilum"?(+ambiente.w||0):(+c.pot||0),fp=Math.min(Math.max(+c.fp||1,0.1),1),eta=Math.min(Math.max(+c.eta||1,0.1),1);
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
    const canais=canaletaLista(c.can);
    const fcaD=canais.length?Math.min(...canais.map(k=>fcaDist(grp[k]||1))):1;
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
    return {i,c:Object.assign({},c,{qtd,pot,ambienteId:ambiente?.id||"",ambienteNome:ambiente?.nome||""}),L,ok,mp,partida,prot,dr,pen,penFalta,P,S:Sva,Q,I,ib,vref,fcaD,nGrp:canais.length?Math.max(...canais.map(k=>grp[k]||1)):1,canais,fct:Math.min(fct(p.metDist),fct(p.metBaix)),fcRho:Math.min(fcrho(p.metDist),fcrho(p.metBaix)),...r,sn,spe,conds,ed,curva,
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
  out.forEach(o=>{if(!o.canais.length||!(+o.c.ld>0))return;o.canais.forEach(k=>{cans[k]=cans[k]||{k,circ:[],area:0,maxL:0};if(!cans[k].circ.includes(o.i+1)){cans[k].circ.push(o.i+1);cans[k].area+=o.conds.reduce((a,s)=>a+condArea(DEXT[s]||30),0);}cans[k].maxL=Math.max(cans[k].maxL,+o.c.ld);});});
  Object.values(cans).forEach(g=>{
    const tx=(+p.ocupCan||40)/100;const e=ELETROCALHAS.find(([w,h])=>w*h*tx>=g.area);
    g.dim=e?`${e[0]} × ${e[1]} mm`:"acima de 600 × 100 mm — dividir";g.ocup=e?g.area/(e[0]*e[1]):null;
    const meta=S.canaletas[g.k]||{};g.L=(+meta.L>0)?+meta.L:g.maxL;g.Lauto=!(+meta.L>0);g.fca=fcaDist(g.circ.length);
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
  // quadros: carga própria e carga agregada (próprios circuitos + sub-quadros alimentados a partir dele)
  const quadros=S.quadros.map(q=>{
    const cs=out.filter(o=>o.c.q===q.nome);
    const ph={R:0,S:0,T:0};cs.forEach(o=>{const n=o.fases.length;if(!n)return;o.fases.split("").forEach(k=>ph[k]+=o.S/n);});
    return {q,cs,Pp:cs.reduce((a,o)=>a+o.dem,0),Qp:cs.reduce((a,o)=>a+o.demQ,0),instP:cs.reduce((a,o)=>a+o.P,0)/1000,maxTp:cs.reduce((a,o)=>Math.max(a,o.dv||0),0),ph};
  });
  const qOf=new Map(quadros.map(x=>[x.q,x]));
  quadros.forEach(x=>{const sub=[x,...descendentes(x.q).map(d=>qOf.get(d))];
    x.pai=origemQ(x.q);x.nivel=nivelQ(x.q);x.filhos=S.quadros.filter(d=>d!==x.q&&paiDe(d)===x.q).map(d=>d.nome);
    x.P=sub.reduce((a,y)=>a+y.Pp,0);x.Q=sub.reduce((a,y)=>a+y.Qp,0);x.inst=sub.reduce((a,y)=>a+y.instP,0);x.maxT=Math.max(...sub.map(y=>y.maxTp));
    x.phT={R:0,S:0,T:0};sub.forEach(y=>FASES.forEach(k=>x.phT[k]+=y.ph[k]));
    x.S=Math.hypot(x.P,x.Q)*res;x.Sp=Math.hypot(x.Pp,x.Qp)*res;x.I=x.S*1000/(cfg.div*cfg.vref);});
  // alimentadores de cima para baixo: a queda de cada trecho soma-se à dos trechos a montante
  [...quadros].sort((a,b)=>a.nivel-b.nivel).forEach(x=>{
    const pai=paiDe(x.q),xp=pai?qOf.get(pai):null;const dvAcima=xp?(xp.dvAcum||0):0;
    x.lim=(+p.dvTotal)-(ent.dv||0)-dvAcima-x.maxT;
    const Lq=Math.max(0,+x.q.L||0),fpq=x.S>0?x.P*res/x.S:1;
    x.f=(pai&&Lq>0&&x.I>0)?feeder(x.I,Lq,x.q.met,x.lim,fpq):null;
    x.dvAcum=dvAcima+(x.f&&x.f.s?x.f.dv||0:0);});
  out.forEach(o=>{const q=quadros.find(x=>x.q.nome===o.c.q);const dvF=(q?q.dvAcum||0:0)+(ent.dv||0);o.dvTot=(o.dv||0)+dvF;o.dvOk=o.dvTot<=+p.dvTotal;
    if(o.c.tipo==="motor"&&o.s){o.dvpTot=o.dvp+dvF;o.dvpOk=o.dvpTot<=(+p.dvPartida||10);}else{o.dvpTot=null;o.dvpOk=true;}});
  const orf=out.filter(o=>!S.quadros.some(q=>q.nome===o.c.q));
  const incompat=out.filter(o=>!o.ok);
  const issues=[];const at=S.forn.aterr;
  if(at==="TN-C"&&out.some(o=>o.dr))issues.push("Há circuitos que exigem DR, mas no esquema TN-C o DR não pode fazer o seccionamento automático (5.1.2.2.4.2-f). Converta em TN-C-S imediatamente a montante do DR, separando PEN em N e PE.");
  if(at==="TN-C"&&out.some(o=>o.penFalta))issues.push(`Circuitos ${out.filter(o=>o.penFalta).map(o=>o.i+1).join(", ")} têm seção abaixo de 10 mm²: o PEN exige no mínimo 10 mm² Cu (6.4.3.4.1). Nesses circuitos, neutro e PE devem ser separados (TN-C-S a partir do quadro).`);
  if(at==="TN-C")issues.push("A NBR 5410 (5.4.3.6) manda separar o PEN em N e PE no ponto de entrada da edificação ou no quadro principal; o TN-C só é admitido nas exceções da própria norma.");
  if(at==="IT"||at==="IT-N")issues.push("Esquema IT: prever dispositivo supervisor de isolamento (DSI) com sinalização sonora e/ou visual (5.1.2.2.4.4-d) e verificar RA × Id ≤ UL.");
  if(at==="TT")issues.push(`Esquema TT: o seccionamento automático é feito por DR em todos os circuitos (5.1.2.2.4.3). Com RA = ${fmt(+S.forn.ra||0,1)} Ω e UL = ${S.forn.ul} V, IΔn ≤ ${fmt((+S.forn.ul||50)/Math.max(+S.forn.ra||1,0.1)*1000,0)} mA.`);
  if([p.metDist,p.metBaix].includes("D")&&((+p.rhoSolo||0)<0.5||(+p.rhoSolo||0)>3))issues.push("Resistividade térmica fora da faixa tabelada de 0,5 a 3 K·m/W (Tab. 41 e IEC 60364-5-52, Tab. B.52.16); o fator foi limitado ao extremo mais próximo e requer validação técnica.");
  const metCabo=[p.metDist,p.metBaix].filter(m=>!MET_ISOLADO.includes(m));
  if(metCabo.length)issues.push(`Método(s) ${[...new Set(metCabo)].join(", ")}: condutores isolados só podem ser instalados em condutos fechados (6.2.11.1.1). Nesses trechos use cabos uni ou multipolares (0,6/1 kV); a lista de materiais já especifica cabos 0,6/1 kV para eles.`);
  if(p.metDist==="D"&&Object.values(grp).some(n=>n>6))issues.push("Mais de 6 circuitos em um mesmo trecho enterrado: a Tab. 45 vai até 6; foi adotado o menor entre a última linha e a Tab. 42. Prefira dividir a rota.");
  // 5.3.5.5.2: integral de Joule do dispositivo ≤ k²S² (k = 115, cobre/PVC — Tab. 30)
  const icc=(+p.icc||0)*1000,sMin=Math.min(...out.filter(o=>o.s).map(o=>o.s));
  const cc=isFinite(sMin)&&icc>0?{s:sMin,k2s2:(115*sMin)**2,t:(115*sMin/icc)**2}:null;
  if(cc&&cc.t<0.1)issues.push(`Curto-circuito (5.3.5.5.2): com Icc = ${fmt(+p.icc,1)} kA, o menor condutor (${sec(cc.s)} mm²) suporta k²S² = ${fmt0(cc.k2s2)} A²s, equivalente a ${fmt(cc.t*1000,1)} ms. Confirme no catálogo que a energia específica passante (I²t) dos disjuntores é menor que esse valor (disjuntores com classe de limitação 3 em geral atendem).`);
  const dps=dpsCalc(sys);
  if(cls.grupo==="B"&&inst>75)cls.avisos.push("Carga instalada acima de 75 kW: pela REN ANEEL nº 1.000/2021 (art. 23), o atendimento deve ser em tensão primária (Grupo A).");
  if(cls.grupo==="A"&&dem*res>2500&&(+S.forn.tensaoPrim||0)<69)cls.avisos.push("Demanda acima de 2.500 kW: a REN 1.000/2021 prevê conexão em tensão igual ou superior a 69 kV.");
  if(sys.fases<3&&out.some(o=>o.c.tipo==="motor"&&o.ok&&o.c.pot>=5))cls.avisos.push("Motores de 5 cv ou mais em sistema mono/bifásico: verifique o limite de potência por motor no RIC da distribuidora.");
  R={out,ph,PH,cans,inst,dem,demQ,demS,fpG,Ient,ent,quadros,res,orf,sys,cfg,cls,incompat,issues,dps,cc,spda:spdaCalc()};
  return R;
}
// SPDA — área de exposição e número de eventos perigosos (NBR 5419-2, Anexo A) e geometria pelo nível de proteção (NBR 5419-3)
function spdaCalc(){
  const e=S.estrutura||{},L=Math.max(0,+e.L||0),W=Math.max(0,+e.W||0),H=Math.max(0,+e.H||0);
  const np=NP5419[e.np]?e.np:"III",g=NP5419[np];
  const Ad=L*W+2*3*H*(L+W)+Math.PI*(3*H)**2;
  const ng=+e.ng||0,cd=+e.cd||0.5,Nd=ng*Ad*cd*1e-6;
  const per=2*(L+W),nDesc=per>0?Math.max(2,Math.ceil(per/g.d)):0;
  const linhasL=W>0?Math.ceil(W/g.m)+1:0,linhasW=L>0?Math.ceil(L/g.m)+1:0;
  const captacao=linhasL*L+linhasW*W,descidas=nDesc*H,anel=L>0&&W>0?2*(L+W+4):0; // anel a ~1 m das fundações
  const re=L>0&&W>0?Math.sqrt((L+2)*(W+2)/Math.PI):0; // raio médio equivalente do anel (arranjo B)
  const rho=+S.forn.rhoEletrica||0;
  const l1=np==="III"||np==="IV"?5:null; // NP I e II: l1 depende de ρ (Fig. 3 da NBR 5419-3)
  return {ok:L>0&&W>0&&H>0,L,W,H,np,g,Ad,ng,cd,Nd,per,nDesc,linhasL,linhasW,captacao,descidas,anel,re,rho,l1,anelOk:l1!=null?re>=l1:null};
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
  {k:"orc",t:"Orçamento",s:"Serviços, horas, lucro"},
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
    case "orc":{const o=orcamento();return o.mo>0&&o.semPreco===0?"done":(o.mo>0||o.tot>0?"part":"");}
    default:return "";
  }
}
function renderSteps(){
  document.getElementById("stepList").innerHTML=STEPS.map((s,i)=>`<li><button type="button" data-step="${i}" ${i===cur?'aria-current="step"':""}><span class="n">${String(i+1).padStart(2,"0")}</span><span class="l">${s.t}<small>${s.s}</small></span><span class="d ${stepStatus(s.k)}" aria-hidden="true"></span></button></li>`).join("");
}
const esc=s=>String(s??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
function fld(path,label,{type="text",hint="",opts=null,step=null,ph="",tip=null}={}){
  const v=getP(path);const t=tip??TIPS[path];
  let inp;
  if(opts)inp=`<select id="f-${path}" data-bind="${path}">${opts.map(([val,l])=>`<option value="${esc(val)}" ${String(v)===String(val)?"selected":""}>${esc(l)}</option>`).join("")}</select>`;
  else if(type==="textarea")inp=`<textarea id="f-${path}" data-bind="${path}" placeholder="${esc(ph)}">${esc(v)}</textarea>`;
  else inp=`<input id="f-${path}" data-bind="${path}" type="${type}" ${step?`step="${step}"`:""} value="${esc(v)}" placeholder="${esc(ph)}">`;
  return `<label class="f" for="f-${path}"${t?` data-tip="${esc(t)}"`:""}><span>${label}${t?tipI():""}</span>${inp}${hint?`<span class="h">${hint}</span>`:""}</label>`;
}
const tipI=()=>`<span class="tipq" aria-hidden="true">?</span>`;
// cabeçalho de tabela com balão de ajuda
const thT=(txt,tip,cls="")=>`<th${cls?` class="${cls}"`:""}${tip?` data-tip="${esc(tip)}"`:""}>${txt}</th>`;
// checkbox com balão
const chkT=(path,label,tip)=>`<label class="chk"${tip?` data-tip="${esc(tip)}"`:""}><input type="checkbox" data-bind="${path}" ${getP(path)?"checked":""}> <span>${label}${tip?tipI():""}</span></label>`;

/* ---------- balões de ajuda (aparecem ao passar o mouse ou ao focar o campo) ---------- */
const TIPS={
  "id.cliente":"Nome completo ou razão social do proprietário da instalação, como consta na conta de energia ou no contrato.",
  "id.obra":"Nome curto do empreendimento. Aparece na capa, no carimbo de todas as folhas e no nome do PDF.",
  "id.atividade":"Processo produtivo do local (ex.: secagem de grãos, ordenha, frigorífico). Ajuda a justificar fatores de demanda e o tipo de ambiente.",
  "id.local":"Endereço ou referência de acesso (estrada, km, coordenadas). Vai para a planta de situação e para a carta à distribuidora.",
  "id.municipio":"Município e UF, ex.: Pelotas/RS.",
  "id.uc":"Número da unidade consumidora na conta de energia. Em ligação nova, deixe em branco.",
  "id.distribuidora":"Concessionária que atende o local. Define o RIC (regulamento de instalações consumidoras) a seguir.",
  "id.data":"Data de emissão do projeto. Aparece na capa, na carta e no carimbo.",
  "id.rt":"Engenheiro responsável pelo projeto, que assina a ART.",
  "id.crea":"Número de registro do responsável técnico no CREA, com a UF.",
  "id.art":"Número da ART de projeto registrada no CREA. Se ainda não emitida, deixe em branco: o PDF gera um modelo didático.",
  "id.projetista":"Quem elaborou os desenhos e cálculos, se for diferente do responsável técnico.",
  "forn.classe":"Classe de consumo da REN ANEEL nº 1.000/2021. Atividades agroindustriais costumam ser Rural (subclasse Agroindustrial) ou Industrial.",
  "forn.subclasse":"Subclasse dentro da classe escolhida. Define o subgrupo B (B1, B2, B3) e as modalidades tarifárias possíveis.",
  "forn.atend":"Secundária: rede de baixa tensão da distribuidora (Grupo B). Primária: subestação própria em média tensão (Grupo A), obrigatória acima de 75 kW de carga instalada.",
  "forn.tensaoPrim":"Tensão nominal da rede primária em kV, informada pela distribuidora. Define o subgrupo A.",
  "forn.modalidade":"Forma de cobrança da energia. As opções mudam conforme o grupo e a subclasse.",
  "forn.sistema":"Tensões disponíveis no secundário (da distribuidora ou do transformador próprio). Limita as ligações possíveis dos circuitos.",
  "forn.rede":"Descreva a rede existente perto da obra (ex.: rede MT 13,8 kV trifásica, rede BT 380/220 V).",
  "forn.distRede":"Distância do poste de derivação até o padrão de entrada. Texto livre, ex.: 30 m.",
  "forn.trafoKVA":"Potência do transformador próprio, se houver. Em atendimento em BT, deixe em branco.",
  "forn.aterr":"Esquema de aterramento (NBR 5410, 4.2.2.2). Define DR, DPS, PEN e o texto do memorial. Na dúvida, TN-S.",
  "forn.ra":"Esquema TT: soma da resistência do eletrodo de aterramento com a dos condutores de proteção das massas, em ohms. Medida em campo.",
  "forn.ul":"Tensão de contato limite. 50 V em locais secos (situação 1); 25 V em locais molhados, com animais ou contato com o solo (situação 2).",
  "forn.rhoEletrica":"Resistividade elétrica do solo em Ω·m, medida pelo método de Wenner. Usada no eletrodo de aterramento do SPDA (NBR 5419-3).",
  "forn.aq":"Exposição a descargas atmosféricas (Tab. 15). No RS a maioria das regiões tem mais de 25 dias de trovoada por ano (AQ2).",
  "forn.obs":"Restrições da rede, gerador de emergência, previsão de ampliação ou outros dados de fornecimento.",
  "forn.Lent":"Comprimento do alimentador do padrão de entrada (ou transformador) até o QGBT, em metros.",
  "forn.metEnt":"Método de instalação do alimentador de entrada (Tab. 33). Enterrado = D.",
  "par.metDist":"Como os circuitos correm na distribuição horizontal (Tab. 33). Canaleta fechada ou eletrocalha com tampa = B1; enterrado = D; leito ou bandeja perfurada = E/F.",
  "par.metBaix":"Método das descidas até os pontos (Tab. 33). Eletroduto aparente ou embutido em alvenaria = B1.",
  "par.agrDist":"Disposição dos cabos agrupados na canaleta (Tab. 42). Não vale para o método D, que usa a Tab. 45.",
  "par.espEnt":"Somente para distribuição enterrada (método D): distância entre os eletrodutos de circuitos diferentes (Tab. 45).",
  "par.arrF":"Método F com 3 condutores carregados: cabos em trifólio ou lado a lado em plano (Tab. 38).",
  "par.arrG":"Método G: cabos unipolares espaçados na horizontal ou na vertical (Tab. 38).",
  "par.temp":"Temperatura ambiente máxima onde passam os cabos. Galpões com secadores e fornos costumam passar de 30 °C (Tab. 40).",
  "par.tempSolo":"Temperatura do solo na profundidade dos eletrodutos, para o método D (Tab. 40). Referência 20 °C.",
  "par.rhoSolo":"Resistividade TÉRMICA do solo em K·m/W (não é a resistividade elétrica). Solo úmido ≈ 1; normal 2,5; seco/arenoso 3 (Tab. 41).",
  "par.dvTerm":"Limite de queda de tensão nos circuitos terminais. A NBR 5410 (6.2.7.2) recomenda no máximo 4 %.",
  "par.dvTotal":"Queda total máxima: 5 % a partir do ponto de entrega em BT; 7 % a partir do transformador próprio ou gerador (6.2.7.1).",
  "par.dvEnt":"Parte da queda total reservada ao alimentador do padrão até o QGBT.",
  "par.ipin":"Relação corrente de partida / corrente nominal (Ip/In) da placa do motor. Partida direta típica: 6 a 8.",
  "par.bobina":"Tensão das bobinas dos contatores e do circuito de comando.",
  "par.icc":"Corrente de curto-circuito presumida nos quadros, em kA. Obtenha da distribuidora ou do estudo de curto. Define a capacidade de interrupção dos disjuntores.",
  "par.softLim":"Limite de corrente ajustado na soft-starter, em múltiplos de In. Típico 2 a 4.",
  "par.invLim":"Corrente de partida com inversor de frequência, em múltiplos de In. Típico até 1,5.",
  "par.dvPartida":"Queda máxima admitida durante a partida dos motores (6.5.1.3.3): 10 %.",
  "par.rho":"Resistividade do cobre na temperatura de operação. 0,0206 Ω·mm²/m corresponde a ~70 °C.",
  "par.curva":"Curva de disparo dos disjuntores de iluminação e tomadas. C é o padrão; B para cargas resistivas puras.",
  "par.curvaMotor":"Curva dos disjuntores de circuitos de motores. D suporta correntes de partida mais altas.",
  "par.reserva":"Acréscimo sobre a demanda para ampliações futuras. Afeta alimentadores e entrada.",
  "par.sobra":"Acréscimo nas quantidades de cabos, eletrodutos e canaletas da lista de materiais (perdas, curvas e emendas).",
  "par.ocupCan":"Taxa máxima de ocupação das canaletas/eletrocalhas. Critério de projeto: 40 % é usual.",
  "estrutura.L":"Comprimento total da edificação a proteger, em metros (maior dimensão em planta).",
  "estrutura.W":"Largura total da edificação a proteger, em metros.",
  "estrutura.H":"Altura máxima da edificação (cumeeira, silo ou chaminé mais alto), em metros.",
  "estrutura.ng":"Densidade de descargas atmosféricas para a terra (descargas/km²/ano), do mapa da NBR 5419-2 (Anexo F) ou do INPE para o município.",
  "estrutura.cd":"Fator de localização da estrutura em relação ao entorno (NBR 5419-2, Tab. A.1).",
  "estrutura.np":"Nível de proteção resultante da análise de risco (NBR 5419-2). Define malha, esfera rolante e espaçamento das descidas.",
  "orc.despesas":"Gastos diretos não incluídos na lista: deslocamento, diárias, taxa da ART, aluguel de equipamentos, frete.",
  "orc.lucro":"Margem de lucro da empresa, aplicada sobre o custo direto (materiais + serviços + despesas).",
  "orc.impostos":"Impostos que incidem sobre o preço de venda (ISS, PIS, COFINS, Simples etc.). O preço final é calculado por dentro: (custo + lucro) / (1 − impostos).",
  "orc.validade":"Prazo de validade da proposta, em dias.",
  "orc.obs":"Condições comerciais: forma de pagamento, prazo de execução, o que não está incluso."
};
// dicas por coluna das tabelas editáveis (resolvidas pelo atributo data-f)
const TIPS_COL={
  c:{q:"Quadro de onde sai o circuito. Para um circuito filho de um quadro intermediário, escolha esse quadro.",nome:"Descrição curta da carga (ex.: Iluminação galpão, Motor do elevador de canecas).",ambiente:"Vincule iluminação ou TUG a um ambiente para usar a quantidade calculada pelas dimensões. 'Manual' = você informa a quantidade.",tipo:"Iluminação, TUG, TUE ou motor. Define a seção mínima (Tab. 47) e as regras de proteção.",lig:"Fases e neutro do circuito. Só aparecem as ligações possíveis no sistema escolhido.",qtd:"Quantidade de cargas iguais no circuito (luminárias, tomadas, motores).",pot:"Potência de UMA carga, na unidade ao lado. Motor: potência de placa (cv ou kW).",unid:"Unidade da potência unitária.",fp:"Fator de potência da carga (placa ou catálogo). LED ≈ 0,95; TUG 0,8.",eta:"Rendimento do motor (placa). Usado para obter a potência elétrica absorvida.",fs:"Fator de serviço do motor, se explorado. A corrente de projeto é In × FS (6.5.1.3.1).",fu:"Fator de utilização: fração da potência nominal usada em regime. Só afeta a demanda.",fd:"Fator de demanda do circuito. Só afeta a demanda, não a bitola.",local:"Local do ponto de utilização. Define o DR obrigatório (5.1.3.2.2).",dr:"'Norma' aplica o DR onde a NBR 5410 exige; 'Incluir' força o DR neste circuito.",can:"Canaleta(s) percorrida(s), separadas por vírgula (ex.: CN-1, CN-2). Cada canaleta compartilhada entra no agrupamento.",ld:"Comprimento do circuito dentro da(s) canaleta(s), do quadro até a baixada, em metros.",lb:"Comprimento da baixada em eletroduto até o ponto, em metros.",partida:"Tipo de partida do motor. Afeta a corrente de partida e a queda de tensão.",prot:"Dispositivo de proteção do motor contra curto-circuito e sobrecarga.",fusTipo:"gG: uso geral; aM: retardado, só proteção contra curto-circuito de motores."},
  qd:{nome:"Nome do quadro (ex.: QF-PROD). Renomear atualiza os circuitos e sub-quadros ligados a ele.",pai:"Quadro de onde sai o alimentador deste quadro. Escolha um quadro intermediário para criar um sub-quadro (circuitos filhos).",L:"Comprimento do alimentador desde o quadro de origem, em metros (não desde o QGBT, se a origem for outro quadro).",met:"Método de instalação do alimentador (Tab. 33)."},
  amb:{nome:"Nome do ambiente.",comprimento:"Comprimento interno do ambiente, em metros.",largura:"Largura interna do ambiente, em metros.",altura:"Pé-direito ou altura de montagem das luminárias, em metros. Hm = altura − 0,80 m (plano de trabalho).",lux:"Iluminância mantida exigida para a tarefa (NBR ISO/CIE 8995-1).",lm:"Fluxo luminoso de uma luminária, em lúmens (catálogo).",w:"Potência de uma luminária, em watts.",uf:"Fator de utilização da luminária, tirado da tabela do fabricante com o índice do recinto K.",mf:"Fator de manutenção: perda de fluxo por sujeira e envelhecimento. Ambiente com poeira: 0,6 a 0,7.",espTomadas:"Espaçamento máximo entre tomadas ao longo do perímetro, em metros (9.5.2.2.1 usa 5 m em habitações).",espLum:"Relação máxima espaçamento / altura útil (S/Hm) da luminária, conforme catálogo. Típico 1,0 a 1,5."},
  ext:{g:"Grupo da lista de materiais em que o item aparece.",d:"Descrição completa do material, com especificação técnica.",un:"Unidade (m, pç, cj, kg, vb).",q:"Quantidade.",pu:"Preço unitário em reais."},
  srv:{cat:"Engenharia, serviço/execução, implantação ou outro.",d:"Descrição do serviço.",h:"Horas previstas para o serviço.",vh:"Valor da hora, em reais (custo da equipe ou valor de referência do CREA/IBAPE/sindicato)."}
};
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
<div class="block" style="margin-top:0;border-top:0;padding-top:0"><h3>Escopo a incluir no relatório</h3>
<p class="note">O projeto de instalações elétricas e dimensionamento é sempre incluído. Selecione abaixo os projetos complementares.</p>
${chkT("projetos.luminotecnico","Projeto luminotécnico","Inclui o cálculo de iluminação pelo método dos lúmens por ambiente (etapa 08) e a prancha luminotécnica no PDF.")}
${chkT("projetos.spda","SPDA e análise de risco NBR 5419","Inclui o pré-dimensionamento do SPDA (NBR 5419-2 e 5419-3) a partir das dimensões da estrutura (etapa 08) e marca a edificação como sujeita a descargas diretas (DPS classe I).")}
</div>
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
function spdaCard(){const s=R.spda;
  if(!s.ok)return `<p class="note warn">Informe comprimento, largura e altura da estrutura para dimensionar o SPDA.</p>`;
  return `<div class="tbl"><table><tbody>
  <tr><td>Área de exposição equivalente A<sub>D</sub> = L·W + 6H(L+W) + π(3H)²</td><td class="num">${fmt0(s.Ad)} m²</td></tr>
  <tr><td>Eventos perigosos por ano N<sub>D</sub> = N<sub>G</sub> · A<sub>D</sub> · C<sub>D</sub> · 10⁻⁶</td><td class="num">${s.ng?fmt(s.Nd,4)+" /ano":"informe N<sub>G</sub>"}</td></tr>
  <tr><td>NP ${s.np}: raio da esfera rolante / malha de captação (Tab. 2)</td><td class="num">${s.g.r} m / ${s.g.m} × ${s.g.m} m</td></tr>
  <tr><td>Descidas: espaçamento médio ${s.g.d} m (Tab. 4) no perímetro de ${fmt0(s.per)} m</td><td class="num">${s.nDesc} descidas</td></tr>
  <tr><td>Captação em malha (${s.linhasL} × ${fmt(s.L,1)} m + ${s.linhasW} × ${fmt(s.W,1)} m) + descidas (${s.nDesc} × ${fmt(s.H,1)} m)</td><td class="num">${fmt0(s.captacao+s.descidas)} m</td></tr>
  <tr><td>Eletrodo em anel (arranjo B) a ~1 m da fundação · raio médio r<sub>e</sub></td><td class="num">${fmt0(s.anel)} m · r<sub>e</sub> ${fmt(s.re,1)} m</td></tr>
  <tr><td>Comprimento mínimo l<sub>1</sub> do eletrodo (Fig. 3)</td><td class="num">${s.l1!=null?`${s.l1} m — <span class="pill ${s.anelOk?"ok":"bad"}">${s.anelOk?"r<sub>e</sub> ≥ l<sub>1</sub>":"acrescentar eletrodos"}</span>`:`NP ${s.np}: depende de ρ${s.rho?` = ${fmt0(s.rho)} Ω·m`:" (informe na etapa 02)"}`}</td></tr>
  <tr><td>Seções mínimas (Tab. 6 e 7): captação e descidas / aterramento</td><td class="num">Cu 35 mm² / Cu 50 mm²</td></tr>
  </tbody></table></div>
  <p class="note" style="margin-top:8px">Interligar o SPDA ao BEP e instalar DPS classe I no QGBT (NBR 5419-4 e NBR 5410 6.3.5.2.4). Silos e estruturas metálicas contínuas podem ser componentes naturais da captação e das descidas (NBR 5419-3), se atenderem às espessuras e à continuidade elétrica exigidas. Cabos e conectores do SPDA entram na lista de materiais.</p>`;}
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
${S.projetos.spda?fld("forn.rhoEletrica","Resistividade elétrica do solo (Ω·m)",{type:"number",step:"1",hint:"Dado de campo para aterramento/SPDA; não é o fator térmico de ampacidade nem a resistência RA."}):""}
${fld("forn.aq","Descargas atmosféricas (Tab. 15)",{opts:[["AQ1","AQ1 — até 25 dias de trovoada por ano"],["AQ2","AQ2 — mais de 25 dias de trovoada por ano"],["AQ3","AQ3 — exposição direta"]]})}
</div></div>
${chkT("forn.aerea","Alimentação por linha total ou parcialmente aérea","Marque se o ramal ou a rede que chega à edificação é aérea em algum trecho. Com AQ2, torna o DPS obrigatório (5.4.2.1.1).")}
${chkT("forn.spda","Edificação com SPDA ou sujeita a descargas diretas (DPS classe I)","Com SPDA, o DPS do QGBT deve ser classe I, ensaiado com impulso 10/350 µs (6.3.5.2.4).")}
${chkT("par.dpsSempre","Incluir DPS mesmo quando não obrigatório","Recomendado em instalações rurais com motores e eletrônica (inversores, controladores), mesmo fora dos casos obrigatórios.")}
<div data-live="dps">${dpsCard()}</div>
<div class="block">${fld("forn.obs","Observações sobre o fornecimento",{type:"textarea",ph:"Restrições da rede, garantia de suprimento, gerador de emergência, previsão de ampliação..."})}</div>
<div class="block"><h3>Anexo desta etapa</h3>${attBlock("situacao")}</div>${nav()}`;

V.par=()=>{const p=S.par;return `${head(2)}
<p class="intro">Critérios adotados em todo o dimensionamento. A distribuição horizontal segue em canaletas/eletrocalhas e cada ponto recebe uma baixada em eletroduto. O cálculo usa o trecho mais restritivo dos dois.</p>
<div class="grid wide">
${fld("par.metDist","Método de referência — distribuição (canaleta)",{opts:Object.entries(METODOS).map(([k,v])=>[k,v])})}
${fld("par.metBaix","Método de referência — baixada (eletroduto)",{opts:Object.entries(METODOS).map(([k,v])=>[k,v])})}
${p.metDist==="D"?fld("par.espEnt","Distância entre eletrodutos enterrados — Tab. 45",{opts:Object.entries(T45).map(([k,v])=>[k,v.t]),hint:"Distribuição enterrada: o agrupamento segue a Tab. 45 (um cabo por eletroduto)."}):fld("par.agrDist","Forma de agrupamento na distribuição — Tab. 42",{opts:Object.entries(T42).map(([k,v])=>[k,v.t])})}
${fld("par.arrF","Método F com 3 condutores carregados",{opts:[["trifolio","Trifólio"],["plano","Justapostos em plano"]]})}
${fld("par.arrG","Método G — disposição",{opts:[["horizontal","Espaçados na horizontal"],["vertical","Espaçados na vertical"]]})}
${fld("par.temp","Temperatura ambiente (°C) — Tab. 40",{opts:Object.keys(T40_AR).map(t=>[+t,`${t} °C  (FCT ${T40_AR[t].toFixed(2)})`])})}
${fld("par.tempSolo","Temperatura do solo (°C) — método D",{opts:Object.keys(T40_SOLO).map(t=>[+t,`${t} °C  (FCT ${T40_SOLO[t].toFixed(2)})`])})}
${fld("par.rhoSolo","Resistividade térmica do solo (K·m/W) — método D",{type:"number",step:"0.1",hint:"NBR 5410 Tab. 41 (1 a 3 K·m/W, referência 2,5), estendida a 0,5 e 0,7 pela IEC 60364-5-52 Tab. B.52.16; interpolação linear."})}
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
${chkT("par.neutroRed","Permitir neutro reduzido (Tab. 48, 6.2.6.2.6) em circuitos trifásicos com fase acima de 25 mm², presumivelmente equilibrados, 3ª harmônica até 15 % e neutro protegido contra sobrecorrentes","Não marque se houver inversores, iluminação LED/fluorescente em grande quantidade ou outras cargas não lineares: a 3ª harmônica soma no neutro.")}
<details><summary>Como o cálculo é feito</summary>
<div class="formula">1. Corrente:  I = S / V (F+N, 2F)   ·   I = S / (√3 · Vff) (3F)   ·   S = P / FP
   Motor:  P = cv × 735,5 / η   →   Ib = In × FS (6.5.1.3.1)
   Partida: ΔV% com I = Ip de um motor + In dos demais e cos φ = 0,3 ≤ 10 % (6.5.1.3.3)
2. Capacidade:  Iz = I(Tab. 36 ou 38) × FCT (Tab. 40) × FCRS (Tab. 41, método D) × FCA (Tab. 42; Tab. 45 se enterrado) ≥ Ib, no pior trecho
   Canaletas: o circuito que percorre várias seções (CN-1, CN-2) usa o menor FCA entre elas
   Sub-quadros: o alimentador de um quadro soma a demanda dos quadros alimentados por ele; ΔV acumula pela cadeia
3. Queda:  ΔV% = k · ρ · L · Ib · cos φ / (S · V) × 100     (6.2.7.4; k = 2 F+N/2F, √3 trifásico, 1 no monofásico a 3 fios)
4. Proteção:  Ib ≤ In ≤ Iz (5.3.4)  — disjuntores NBR NM 60898 (I2 = 1,45 In)
5. Seção final = maior entre: mínima (Tab. 47), capacidade, queda, partida de motor e coordenação
   Condutores carregados pela Tab. 46 (monofásico a 3 condutores = 2; duas fases com neutro = 3)
6. Neutro = fase (6.2.6.2.2 e 6.2.6.2.4; Tab. 48 se permitido) · PE pela Tab. 58 (S/2 arredondado para a seção padronizada superior)
7. Eletroduto: ocupação ≤ 53 % (1 condutor), 31 % (2), 40 % (3 ou mais) — 6.2.11.1.6
8. Curto-circuito: I²t do dispositivo ≤ k²S², k = 115 (cobre/PVC) — 5.3.5.5.2</div>
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
  <td><select style="min-width:130px" data-c="${i}" data-f="ambiente" aria-label="Ambiente do circuito">${opt([["","Manual"],...S.ambientes.map(a=>[a.id,a.nome])],c.ambiente||"")}</select></td>
  <td><select data-c="${i}" data-f="tipo" data-re="1" aria-label="Tipo">${opt(Object.entries(TIPOS).map(([a,b])=>[a,TIPO_CURTO[a]]),c.tipo)}</select></td>
  <td><select data-c="${i}" data-f="lig" aria-label="Ligação" ${ligOK(c.lig,R.sys)?"":'style="border-color:var(--bad);color:var(--bad)"'}>${opt(Object.keys(LIG).filter(k=>ligOK(k,R.sys)||k===c.lig).map(k=>[k,`${LIG[k].txt} · ${ligOK(k,R.sys)?ligVolt(k,R.sys)+" V":"incompatível"}`]),c.lig)}</select></td>
  <td><input type="number" class="w-s" min="0" step="1" data-c="${i}" data-f="qtd" value="${R.out[i]?.c.qtd??c.qtd}" ${c.ambiente&&(c.tipo==="ilum"||c.tipo==="tug")?'readonly data-tip="Quantidade calculada pelas dimensões do ambiente (etapa 08). Para digitar, mude o ambiente para Manual."':""} aria-label="Número de cargas"></td>
  <td><input type="number" min="0" step="any" data-c="${i}" data-f="pot" value="${R.out[i]?.c.pot??c.pot}" ${c.ambiente&&c.tipo==="ilum"?'readonly data-tip="Potência por luminária definida no ambiente (etapa 08)."':""} aria-label="Potência unitária"></td>
  <td><select data-c="${i}" data-f="unid" aria-label="Unidade">${opt(unids,c.unid)}</select></td>
  <td><input type="number" class="w-s" min="0.1" max="1" step="0.01" data-c="${i}" data-f="fp" value="${c.fp}" aria-label="Fator de potência"></td>
  <td>${c.tipo==="motor"?`<input type="number" class="w-s" min="0.1" max="1" step="0.01" data-c="${i}" data-f="eta" value="${c.eta}" aria-label="Rendimento">`:`<span class="mono" style="color:var(--muted)">—</span>`}</td>
  <td>${c.tipo==="motor"?`<input type="number" class="w-s" min="1" max="1.5" step="0.05" data-c="${i}" data-f="fs" value="${c.fs??1.25}" aria-label="Fator de serviço">`:`<span class="mono" style="color:var(--muted)">—</span>`}</td>
  <td><input type="number" class="w-s" min="0" max="1" step="0.01" data-c="${i}" data-f="fu" value="${c.fu}" aria-label="Fator de utilização"></td>
  <td><input type="number" class="w-s" min="0" max="1" step="0.01" data-c="${i}" data-f="fd" value="${c.fd}" aria-label="Fator de demanda"></td>
  <td><select style="min-width:150px" data-c="${i}" data-f="local" aria-label="Local do circuito ${i+1}">${opt(Object.entries(LOCAIS),c.local||"seco")}</select></td>
  <td><select style="min-width:84px" data-c="${i}" data-f="dr" aria-label="DR do circuito ${i+1}">${opt([["auto","Norma"],["sim","Incluir"]],c.dr||"auto")}</select></td>
  <td><input class="w-m" data-c="${i}" data-f="can" value="${esc(c.can)}" aria-label="Canaleta(s), separadas por vírgula"></td>
  <td><input type="number" class="w-s" min="0" step="0.5" data-c="${i}" data-f="ld" value="${c.ld}" aria-label="Comprimento na canaleta"></td>
  <td><input type="number" class="w-s" min="0" step="0.1" data-c="${i}" data-f="lb" value="${c.lb}" aria-label="Comprimento da baixada"></td>
  <td class="num" data-live="S${i}"></td><td class="num" data-live="I${i}"></td>
  <td><button class="btn small danger" type="button" data-del="${i}" aria-label="Remover circuito ${i+1}">✕</button></td></tr>`;
}
V.cargas=()=>`${head(3,`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn small" type="button" data-add="ilum">+ Iluminação</button><button class="btn small" type="button" data-add="tug">+ TUG</button><button class="btn small" type="button" data-add="tue">+ TUE</button><button class="btn small primary" type="button" data-add="motor">+ Motor</button></div>`)}
<p class="intro">Quantificação do sistema (item B). Vincule circuitos de iluminação ou TUG a um ambiente para usar a quantidade calculada pelas dimensões. Na canaleta, liste as seções percorridas separadas por vírgula (ex.: CN-1, CN-2); o agrupamento considera cada seção compartilhada.</p>
${S.exemplo?`<p class="note warn"><b>Exemplo carregado:</b> mini-indústria com secador, descascador, moedor e ensacadeira, dados fictícios; rendimentos e FP dos motores são ilustrativos. Use sempre os dados de placa. Para começar do zero, use “Projeto em branco”.</p>`:""}
<div class="block" style="margin-top:0;border-top:0;padding-top:0"><h3>Quadros de distribuição</h3>
<div class="tbl ct"><table><thead><tr>${thT("Quadro",TIPS_COL.qd.nome)}${thT("Alimentado por",TIPS_COL.qd.pai)}${thT("Alimentador desde a origem (m)",TIPS_COL.qd.L)}${thT("Método",TIPS_COL.qd.met)}${thT("Distância total ao QGBT","Soma dos trechos de alimentador do QGBT até este quadro, passando pelos quadros intermediários. Calculada automaticamente.","r")}<th></th></tr></thead><tbody>
${quadrosEmArvore().map(q=>{const j=S.quadros.indexOf(q),niv=nivelQ(q);const proib=new Set([q,...descendentes(q)]);
  return `<tr><td style="padding-left:${7+niv*16}px">${niv?`<span class="mono" style="color:var(--muted)">└ </span>`:""}<input class="w-m" data-qd="${j}" data-f="nome" value="${esc(q.nome)}" aria-label="Nome do quadro"></td>
  <td>${j===0?`<span class="mono" style="color:var(--muted)">entrada (padrão)</span>`:`<select data-qd="${j}" data-f="pai" aria-label="Quadro de origem de ${esc(q.nome)}">${S.quadros.filter(x=>!proib.has(x)).map(x=>`<option value="${esc(x.nome)}" ${origemQ(q)===x.nome?"selected":""}>${esc(x.nome)}</option>`).join("")}</select>`}</td>
  <td>${j===0?`<span class="mono" style="color:var(--muted)">0 — quadro geral</span>`:`<input type="number" min="0" step="1" data-qd="${j}" data-f="L" value="${q.L}" aria-label="Comprimento do alimentador de ${esc(q.nome)}">`}</td>
  <td>${j===0?"":`<select data-qd="${j}" data-f="met" aria-label="Método do alimentador">${Object.keys(METODOS).map(m=>`<option ${q.met===m?"selected":""}>${m}</option>`).join("")}</select>`}</td>
  <td class="num">${j===0?"—":fmt(distQGBT(q),0)+" m"}</td>
  <td>${j>0?`<button class="btn small danger" type="button" data-delq="${j}">Remover</button>`:""}</td></tr>`;}).join("")}
</tbody></table></div><p class="note">Cada quadro é alimentado por um quadro de origem: o QGBT ou um quadro intermediário (sub-quadro). O comprimento é o do trecho desde a origem; a distância ao QGBT é a soma dos trechos. O alimentador de um quadro intermediário é dimensionado com a demanda dele mais a dos sub-quadros, e a queda de tensão se acumula ao longo da cadeia.</p><div><button class="btn small" type="button" id="addQ" data-tip="Cria um quadro alimentado pelo QGBT. Depois escolha outro quadro em 'Alimentado por' para torná-lo sub-quadro.">+ Quadro</button></div></div>
${R.incompat.length?`<p class="note bad"><b>Ligação incompatível com o sistema ${esc(R.sys.nome)}:</b> circuitos ${R.incompat.map(o=>o.i+1).join(", ")}. Escolha outra ligação ou mude o tipo de alimentação na etapa 02.</p>`:""}
<div class="block"><h3>Circuitos</h3>
<div class="tbl ct"><table><thead><tr><th>#</th>${[["Quadro","q"],["Descrição","nome"],["Ambiente","ambiente"],["Tipo","tipo"],["Ligação","lig"],["Nº cargas","qtd"],["Pot. unit.","pot"],["Unid.","unid"],["FP","fp"],["η","eta"],["FS","fs"],["Fu","fu"],["FD","fd"],["Local","local"],["DR","dr"],["Canaleta(s)","can"],["L can. (m)","ld"],["L baix. (m)","lb"]].map(([t,k])=>thT(t,TIPS_COL.c[k])).join("")}${thT("S (VA)","Potência aparente total do circuito, calculada.","r")}${thT("Ib (A)","Corrente de projeto do circuito, calculada (motores: In × FS).","r")}<th></th></tr></thead>
<tbody>${S.circ.map(circRow).join("")||`<tr><td colspan="22" style="padding:18px;color:var(--muted)">Nenhum circuito. Use os botões acima para adicionar.</td></tr>`}</tbody></table></div>
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
<div class="note">FCT mín. = ${Math.min(fct(p.metDist),fct(p.metBaix)).toFixed(2)} · FCRS = ${Math.min(fcrho(p.metDist),fcrho(p.metBaix)).toFixed(2)} (${p.rhoSolo} K·m/W, método D, Tab. 41) · métodos ${p.metDist}/${p.metBaix} · FCA por seção de canaleta compartilhada (${p.metDist==="D"?"Tab. 45":"Tab. 42"}) · ΔV terminal ≤ ${fmt(+p.dvTerm,1)} % · total ≤ ${fmt(+p.dvTotal,1)} %</div>
${R.issues.map(t=>`<p class="note warn" style="margin-top:8px">${t}</p>`).join("")}
${R.out.some(o=>o.dr)?`<p class="note" style="margin-top:8px">IDR nos circuitos ${R.out.filter(o=>o.dr).map(o=>`${o.i+1} (${o.dr.idn} mA)`).join(", ")}. Tipo A em geral; tipo B quando há inversor de frequência, por causa das correntes de fuga contínuas.</p>`:""}
${R.out.some(o=>o.c.tipo==="motor")?motorBlock():""}
<div class="tbl" style="margin-top:12px"><table><thead><tr><th>#</th><th>Circuito</th><th>Quadro</th><th>Fases</th><th class="r">P (W)</th><th class="r">S (VA)</th><th class="r">Ib (A)</th><th class="r">FCT/FCRS</th><th class="r">FCA</th><th class="r">Iz (A)</th><th>Fase / N / PE (mm²)</th><th>Proteção</th><th class="r">ΔV circ.</th><th class="r">ΔV total</th><th class="r">ΔV partida</th><th>Eletroduto baixada</th><th>Critério</th></tr></thead><tbody>
${R.out.map(o=>`<tr><td class="num">${o.i+1}</td><td>${esc(o.c.nome)}</td><td>${esc(o.c.q)}</td><td>${o.fases.split("").map(k=>`<span class="ph ${k}">${k}</span>`).join("")}</td>
<td class="num">${fmt0(o.P)}</td><td class="num">${fmt0(o.S)}</td><td class="num">${fmt(o.ib,1)}</td><td class="num">${o.fct.toFixed(2)} / ${o.fcRho.toFixed(2)}</td><td class="num">${o.fcaD.toFixed(2)}</td><td class="num">${o.s?fmt(o.iz,1):"—"}</td>
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
<p class="intro">Distribuição horizontal em canaletas/eletrocalhas. Os circuitos que compartilham uma canaleta formam um agrupamento: o FCA (${S.par.metDist==="D"?"Tab. 45, trecho enterrado":"Tab. 42"}) e a ocupação são calculados por canaleta. Um circuito pode percorrer várias canaletas (informe “CN-1, CN-2” na etapa 04): ele entra no agrupamento de cada uma e usa o menor FCA.</p>
${gs.length?`<div class="tbl ct"><table><thead><tr>${thT("Canaleta","Identificação da seção de canaleta, como digitada na etapa 04.")}${thT("Circuitos","Circuitos que passam por esta seção.")}${thT("Nº circ.","Número de circuitos agrupados nesta seção.","r")}${thT("FCA","Fator de correção de agrupamento desta seção.","r")}${thT("Área cabos (mm²)","Soma das áreas externas dos condutores (diâmetros típicos de catálogo).","r")}${thT("Dimensão (L × A)","Menor eletrocalha padronizada que respeita a ocupação máxima adotada.")}${thT("Ocupação","Área dos cabos / área interna da eletrocalha.","r")}${thT("Comprimento do trecho (m)","Comprimento real da rota desta seção, para a lista de materiais. Em branco = maior trecho informado nos circuitos.")}</tr></thead><tbody>
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
<div class="tbl"><table><thead><tr>${thT("Quadro","Quadros em árvore: os recuados são sub-quadros alimentados pelo quadro acima.")}${thT("Origem","Quadro de onde sai o alimentador.")}${thT("P inst. (kW)","Carga instalada do quadro, incluindo os sub-quadros.","r")}${thT("Demanda c/ res. (kVA)","Demanda do quadro e dos sub-quadros, com reserva. É a base do alimentador.","r")}${thT("I (A)","Corrente do alimentador.","r")}<th>Alimentador (mm²)</th><th>Disjuntor</th>${thT("ΔV alim.","Queda de tensão neste trecho de alimentador.","r")}${thT("ΔV acumulada","Queda da entrada até este quadro, somando os trechos a montante.","r")}<th>Eletroduto</th>${R.PH.map(k=>thT(`${k} (VA)`,"Carga da fase, incluindo sub-quadros.","r")).join("")}</tr></thead><tbody>
${quadrosEmArvore().map(qq=>R.quadros.find(x=>x.q===qq)).filter(Boolean).map(q=>`<tr><td class="mono" style="padding-left:${7+q.nivel*16}px">${q.nivel?"└ ":""}${esc(q.q.nome)}</td><td class="mono">${esc(q.pai||"entrada")}</td><td class="num">${fmt(q.inst,2)}</td><td class="num">${fmt(q.S,2)}</td><td class="num">${fmt(q.I,1)}</td>
<td class="mono">${q.f?(q.f.s?q.f.txt:"sem solução"):(q.pai?"— (L = 0)":"— (QGBT)")}</td><td class="mono">${q.f&&q.f.inom?`${q.f.polos}P ${q.f.inom} A`:"—"}</td><td class="num">${q.f&&q.f.s?fmt(q.f.dv,2)+" %":"—"}</td><td class="num">${fmt((R.ent.dv||0)+(q.dvAcum||0),2)} %</td><td class="mono">${q.f&&q.f.s?q.f.ed.nome:"—"}</td>
${R.PH.map(k=>`<td class="num">${fmt0(q.phT[k])}</td>`).join("")}</tr>`).join("")}
</tbody></table></div>
${R.quadros.some(q=>q.filhos.length&&q.pai)?`<p class="note">Sub-quadros: ${R.quadros.filter(q=>q.filhos.length&&q.pai).map(q=>`${esc(q.q.nome)} alimenta ${q.filhos.map(esc).join(", ")}`).join("; ")}. A demanda dos sub-quadros foi somada sem fator de diversidade entre quadros (a favor da segurança).</p>`:""}
${R.orf.length?`<p class="note bad">Circuitos em quadro inexistente: ${R.orf.map(o=>o.i+1).join(", ")}.</p>`:""}
</div>
<div class="block"><h3>Proteção contra surtos no QGBT</h3><div data-live="dps">${dpsCard()}</div></div>
<div class="block"><h3>Equilíbrio de fases</h3>
<div class="bars" style="max-width:520px">${R.PH.map(k=>`<div class="bar"><span class="ph ${k}">${k}</span><div class="track"><div class="fill ${k}" style="width:${(R.ph[k]/maxPh*100).toFixed(1)}%"></div></div><span class="mono" style="text-align:right">${fmt(R.ph[k]/1000,2)} kVA</span></div>`).join("")}</div>
${sys.fases===1?`<p class="note">Sistema monofásico: toda a carga fica na fase R.</p>`:`<p class="note ${deseq>10?"warn":"ok"}">Desequilíbrio máximo em relação à média: <b>${fmt(deseq,1)} %</b>. Circuitos monofásicos e bifásicos foram distribuídos automaticamente, do maior para o menor, na fase menos carregada. A coluna “Fases” da etapa 05 mostra a atribuição.</p>`}
</div>${nav()}`;};

function ambienteRow(a,i){const c=calcularAmbiente(a);return `<tr>
<td><input class="w-m" data-amb="${i}" data-f="nome" value="${esc(a.nome)}" aria-label="Nome do ambiente"></td>
<td><input type="number" min="0" step="0.1" data-amb="${i}" data-f="comprimento" value="${a.comprimento}" aria-label="Comprimento em metros"></td>
<td><input type="number" min="0" step="0.1" data-amb="${i}" data-f="largura" value="${a.largura}" aria-label="Largura em metros"></td>
<td><input type="number" min="0" step="0.1" data-amb="${i}" data-f="altura" value="${a.altura}" aria-label="Altura em metros"></td>
<td><input type="number" min="0" step="10" data-amb="${i}" data-f="lux" value="${a.lux}" aria-label="Iluminância alvo em lux"></td>
<td><input type="number" min="1" step="100" data-amb="${i}" data-f="lm" value="${a.lm}" aria-label="Fluxo luminoso por luminária em lúmens"></td>
<td><input type="number" min="1" step="1" data-amb="${i}" data-f="w" value="${a.w}" aria-label="Potência por luminária em watts"></td>
<td><input type="number" min="0.1" max="1" step="0.05" data-amb="${i}" data-f="uf" value="${a.uf}" aria-label="Fator de utilização"></td>
<td><input type="number" min="0.1" max="1" step="0.05" data-amb="${i}" data-f="mf" value="${a.mf}" aria-label="Fator de manutenção"></td>
<td><input type="number" min="0.5" step="0.1" data-amb="${i}" data-f="espTomadas" value="${a.espTomadas}" aria-label="Espaçamento máximo de tomadas em metros"></td>
<td><input type="number" min="0.5" step="0.1" data-amb="${i}" data-f="espLum" value="${a.espLum}" aria-label="Relação máxima S sobre Hm"></td>
<td class="num" data-live="amb-area-${i}">${fmt0(c.area)} m²</td><td class="num" data-live="amb-k-${i}">${fmt(c.k,2)}</td><td class="num" data-live="amb-tug-${i}">${c.tomadas}</td><td class="num" data-live="amb-lum-${i}">${c.luminarias}</td><td class="num" data-live="amb-em-${i}">${fmt0(c.em)} lx</td>
<td><button class="btn small danger" type="button" data-delamb="${i}" aria-label="Remover ambiente">Remover</button></td></tr>`;}
V.des=()=>`${head(7)}
<p class="intro">Desenhos das plantas (item D), quadros e diagramas (item F) e detalhes construtivos (item G). Anexe as pranchas produzidas em CAD. Elas entram no PDF final na ordem da documentação do projeto.</p>
<div class="block" style="margin-top:0;border-top:0;padding-top:0"><h3>Ambientes e dimensões</h3>
<p class="note">Tomadas TUG: contagem geométrica por perímetro e espaçamento adotado, no mínimo uma por ambiente (9.5.2.2.1). Iluminação: método dos lúmens, N = E × A / (φ × FU × FM), e espaçamento máximo S/Hm; a altura define Hm = altura − 0,8 m. Iluminâncias de referência: NBR ISO/CIE 8995-1 (ex.: depósitos 100–200 lx, processamento industrial 300 lx, escritórios 500 lx). Vincule os circuitos de iluminação e TUG a um ambiente na etapa 04 para usar estas quantidades.</p>
<div class="tbl ct"><table><thead><tr>${[["Ambiente","nome"],["Comp. (m)","comprimento"],["Larg. (m)","largura"],["Alt. (m)","altura"],["Lux","lux"],["lm/luminária","lm"],["W/luminária","w"],["FU","uf"],["FM","mf"],["Esp. TUG (m)","espTomadas"],["S/Hm máx.","espLum"]].map(([t,k])=>thT(t,TIPS_COL.amb[k])).join("")}${thT("Área","Comprimento × largura.","r")}${thT("K","Índice do recinto K = A / (Hm × (C + L)). Use-o para ler o FU na tabela da luminária.","r")}${thT("TUG","Número de tomadas de uso geral calculado.","r")}${thT("Luminárias","Maior valor entre o método dos lúmens e o espaçamento máximo.","r")}${thT("Em obtida","Iluminância média mantida com o número de luminárias adotado. Deve ser ≥ ao valor exigido.","r")}<th></th></tr></thead><tbody>
${S.ambientes.map(ambienteRow).join("")||`<tr><td colspan="17" style="padding:12px;color:var(--muted)">Nenhum ambiente cadastrado.</td></tr>`}
</tbody></table></div><button class="btn small" type="button" id="addAmb">+ Ambiente</button></div>
<div style="display:flex;flex-direction:column;gap:10px">${["arquitetonico","unifilar","multifilar","detalhes","convencoes"].map(attBlock).join("")}</div>
${S.projetos.luminotecnico?`<div class="block"><h3>Projeto luminotécnico</h3>${attBlock("luminotecnico")}</div>`:""}
${S.projetos.spda?`<div class="block"><h3>Projeto de SPDA — NBR 5419:2015</h3>
<p class="note">Pré-dimensionamento pelo método das malhas (NBR 5419-3) para o nível de proteção adotado, e número anual de eventos perigosos N<sub>D</sub> (NBR 5419-2, Anexo A). O nível de proteção deve sair da análise de risco completa (R1 ≤ 10⁻⁵), que exige dados de ocupação, perdas e linhas de serviço não tratados aqui.</p>
<div class="grid">${fld("estrutura.L","Comprimento da estrutura (m)",{type:"number",step:"0.1"})}${fld("estrutura.W","Largura da estrutura (m)",{type:"number",step:"0.1"})}${fld("estrutura.H","Altura máxima (m)",{type:"number",step:"0.1"})}${fld("estrutura.ng","N<sub>G</sub> (descargas/km²/ano)",{type:"number",step:"0.1",ph:"mapa NBR 5419-2"})}${fld("estrutura.cd","Localização — C<sub>D</sub>",{opts:Object.entries(CD5419)})}${fld("estrutura.np","Nível de proteção adotado",{opts:Object.keys(NP5419).map(k=>[k,`NP ${k}`])})}</div>
<div data-live="spda">${spdaCard()}</div>
${attBlock("spda")}</div>`:""}
<label class="chk" style="margin-top:12px"><input type="checkbox" data-bind="par.simular" ${S.par.simular!==false?"checked":""}> Gerar documentos simulados para os anexos ausentes (ART modelo, planta de situação, planta baixa esquemática, unifilar, força e comando, detalhes e convenções), marcados em vermelho para correção</label>
<p class="note" style="margin-top:12px">Confira nas pranchas: pontos de utilização e quadros (NBR 5444), rotas das canaletas com a identificação usada aqui (${Object.keys(R.cans).join(", ")||"—"}), baixadas com o diâmetro calculado e o unifilar com as mesmas bitolas e disjuntores da etapa 05.</p>${nav()}`;

/* ---------- memorial descritivo (texto gerado) ---------- */
function memoAuto(){
  const id=S.id,f=S.forn,p=S.par,sys=SISTEMAS[f.sistema];
  const nm=R.out.filter(o=>o.c.tipo==="motor");
  return {
    obj:`O presente memorial descreve o projeto das instalações elétricas de baixa tensão da obra "${id.obra||"—"}", de propriedade de ${id.cliente||"—"}, localizada em ${id.local||"—"}, ${id.municipio||"—"}${id.uc?`, unidade consumidora nº ${id.uc}`:""}. A atividade desenvolvida no local é: ${id.atividade||"—"}.`,
    normas:`O projeto foi elaborado conforme: ABNT NBR 5410:2004 (Instalações elétricas de baixa tensão); ABNT NBR 14039 (Instalações elétricas de média tensão, quando aplicável); ABNT NBR 5419:2015, partes 1 a 4 (Proteção contra descargas atmosféricas)${S.projetos.luminotecnico?"; ABNT NBR ISO/CIE 8995-1 (Iluminação de ambientes de trabalho)":""}; ABNT NBR 5444 (simbologia, como referência gráfica); NR-10 (Segurança em instalações e serviços em eletricidade); NR-12 (Segurança no trabalho em máquinas e equipamentos); Resolução Normativa ANEEL nº 1.000/2021; e o Regulamento de Instalações Consumidoras da ${id.distribuidora||"distribuidora local"}.`,
    forn:`A unidade consumidora é da classe ${R.cls.classeT}, subclasse ${R.cls.subclasse}, Grupo ${R.cls.grupo}, subgrupo ${R.cls.sub}, modalidade tarifária ${R.cls.modalidade.toLowerCase()}, conforme a REN ANEEL nº 1.000/2021. O fornecimento será em ${f.atend==="MT"?`tensão primária de ${fmt(+f.tensaoPrim,1)} kV, com transformador próprio${f.trafoKVA?` de ${f.trafoKVA} kVA`:""}`:"tensão secundária"}, alimentação ${sys.nome}, 60 Hz. ${f.rede?`Rede existente: ${f.rede}${f.distRede?`, a ${f.distRede} do ponto de derivação`:""}.`:""} A carga instalada é de ${fmt(R.inst,2)} kW e a demanda calculada é de ${fmt(R.dem,2)} kW (${fmt(R.demS,2)} kVA, FP ${fmt(R.fpG,2)}); com reserva de ${p.reserva} % para ampliações, a potência de alimentação adotada é de ${fmt(R.ent.S,2)} kVA. ${f.obs||""}`,
    dist:(()=>{const s0=S.quadros[0],dir=S.quadros.filter(q=>paiDe(q)===s0),sub=S.quadros.filter(q=>paiDe(q)&&paiDe(q)!==s0);
      return `A partir do quadro geral de baixa tensão (${s0.nome}) partem os alimentadores dos quadros ${dir.map(q=>`${q.nome} (${fmt(+q.L||0,0)} m)`).join(", ")||"terminais"}.${sub.length?` ${sub.length>1?"Os sub-quadros":"O sub-quadro"} ${sub.map(q=>`${q.nome}, alimentado pelo ${origemQ(q)} (${fmt(+q.L||0,0)} m; ${fmt(distQGBT(q),0)} m de rota até o ${s0.nome})`).join("; ")}, ${sub.length>1?"recebem":"recebe"} seus circuitos filhos; o alimentador do quadro intermediário foi dimensionado com a soma das demandas dele e dos sub-quadros, e a queda de tensão foi verificada ao longo de toda a cadeia.`:""} Os circuitos terminais são conduzidos horizontalmente em canaletas/eletrocalhas (${Object.values(R.cans).map(g=>`${g.k}: ${g.dim}`).join("; ")||"—"}), método de referência ${p.metDist}, e descem até os pontos de utilização em eletrodutos (baixadas), método ${p.metBaix}. Circuitos que percorrem mais de uma seção de canaleta foram verificados com o agrupamento mais severo entre elas. Foram considerados temperatura ambiente de ${p.temp} °C (Tabela 40), resistividade térmica do solo de ${p.rhoSolo} K·m/W no método D (Tabela 41) e fatores de agrupamento por trecho conforme a Tabela ${p.metDist==="D"?"45":"42"} da NBR 5410.`;})(),
    cond:`Serão utilizados condutores de cobre com isolação em PVC 70 °C, 450/750 V (circuitos internos) e 0,6/1 kV nos trechos enterrados ou sujeitos a umidade. Seções mínimas: 1,5 mm² para iluminação e 2,5 mm² para força. Cores: neutro azul-claro; condutor de proteção verde-amarelo ou verde; fases em preto, vermelho ou branco, mantendo a mesma cor para cada fase em toda a instalação. A queda de tensão foi limitada a ${fmt(+p.dvTerm,1)} % nos circuitos terminais e a ${fmt(+p.dvTotal,1)} % no total.`,
    prot:`${(()=>{const d=R.out.filter(o=>o.dr),dp=R.dps;return `${d.length?`Recebem dispositivo diferencial-residual (IDR) os circuitos ${d.map(o=>`${o.i+1} (${o.dr.idn} mA, ${o.dr.mot})`).join("; ")}. `:""}${dp.incl?`No QGBT serão instalados DPS ${dp.cls1?"classe I":"classe II"}, ${dp.con}, nível de proteção Up ≤ ${fmt(dp.up,1)} kV (Tab. 31, categoria II), ${dp.req?`obrigatórios conforme ${dp.motivo}`:"adotados em projeto"}. `:`DPS não obrigatório pelas condições informadas (5.4.2.1.1). `}`;})()}Cada circuito é protegido por disjuntor termomagnético (curva ${p.curva} para iluminação e tomadas, curva ${p.curvaMotor} para motores), coordenado com o condutor (Ib ≤ In ≤ Iz). O QGBT recebe DPS classe adequada coordenado com o esquema de aterramento.${nm.length?` Os ${nm.length} motores terão proteção contra sobrecarga por relé térmico ou disjuntor-motor e partida conforme o RIC da distribuidora.`:""}`,
    aterr:`O esquema de aterramento adotado é ${ATERR[f.aterr]||f.aterr}. ${({"TN-S":"Os condutores neutro e de proteção são distintos em toda a instalação, com o neutro aterrado na origem.","TN-C-S":"O condutor PEN do alimentador de entrada é separado em neutro e PE no QGBT, que acumula a função de BEP; daí em diante o esquema é TN-S (5.4.3.6).","TN-C":"As funções de neutro e proteção são combinadas no condutor PEN, com seção mínima de 10 mm² Cu (6.4.3.4.1), identificado em azul-claro com anilhas verde-amarelo (6.1.5.3.3). Não se admite DR como dispositivo de seccionamento automático nesse esquema (5.1.2.2.4.2-f).","TT":`As massas são ligadas a eletrodo de aterramento próprio, e o seccionamento automático é feito por dispositivos DR, atendendo RA × IΔn ≤ UL (5.1.2.2.4.3), com RA = ${fmt(+f.ra||0,1)} Ω e UL = ${f.ul} V.`,"IT-N":"A alimentação é isolada da terra ou aterrada por impedância elevada, com neutro distribuído; deve haver dispositivo supervisor de isolamento (DSI) com sinalização da primeira falta (5.1.2.2.4.4).","IT":"A alimentação é isolada da terra ou aterrada por impedância elevada, sem neutro distribuído; deve haver dispositivo supervisor de isolamento (DSI) com sinalização da primeira falta (5.1.2.2.4.4)."})[f.aterr]||""} A malha de aterramento será interligada ao barramento de equipotencialização principal (BEP), ao qual se conectam estruturas metálicas, silos, secadores, carcaças de motores, eletrocalhas e o SPDA, quando houver.`,
    lum:(()=>{const a=S.ambientes;return `O dimensionamento da iluminação seguiu o método dos lúmens, N = E × A / (φ × FU × FM), com iluminâncias de referência da ABNT NBR ISO/CIE 8995-1 e limitação do espaçamento entre luminárias pela relação S/Hm do fabricante, adotando-se o maior dos dois resultados. ${a.map(x=>{const c=calcularAmbiente(x);return `${x.nome}: ${fmt0(c.area)} m², ${x.lux} lx exigidos, ${c.luminarias} luminárias de ${fmt0(+x.lm)} lm / ${fmt0(+x.w)} W, iluminância média mantida de ${fmt0(c.em)} lx, densidade de ${fmt(c.dens,1)} W/m²`;}).join("; ")||"Nenhum ambiente cadastrado"}. Os fatores de utilização devem ser confirmados nas tabelas fotométricas das luminárias escolhidas.`;})(),
    spda:(()=>{const s=R.spda;if(!s.ok)return "As dimensões da estrutura não foram informadas; o SPDA será dimensionado após o levantamento.";return `O sistema de proteção contra descargas atmosféricas foi pré-dimensionado conforme a ABNT NBR 5419:2015 para a estrutura de ${fmt(s.L,1)} × ${fmt(s.W,1)} m e altura de ${fmt(s.H,1)} m. A área de exposição equivalente é de ${fmt0(s.Ad)} m²${s.ng?` e, com NG = ${fmt(s.ng,1)} descargas/km²/ano e CD = ${fmt(s.cd,2)}, o número anual de eventos perigosos é ND = ${fmt(s.Nd,4)}`:""} (NBR 5419-2, Anexo A). Adotou-se nível de proteção ${s.np}, com captação em malha de ${s.g.m} × ${s.g.m} m (esfera rolante de ${s.g.r} m), ${s.nDesc} condutores de descida espaçados em média ${s.g.d} m, condutores de cobre de 35 mm² na captação e nas descidas, e eletrodo de aterramento em anel (arranjo B) em cobre nu de 50 mm², interligado ao BEP. Na entrada de energia serão instalados DPS classe I. O nível de proteção deve ser confirmado pela análise de risco completa (R1 ≤ 10⁻⁵) antes da execução.`;})(),
    custo:(()=>{const c=custos(),o=orcamento();return `A estimativa de custo dos materiais relacionados na lista de materiais totaliza ${brl(c.tot)}, assim distribuída: ${Object.keys(GRUPOS).filter(g=>c.por[g]!=null).map(g=>`${GRUPOS[g]}, ${brl(c.por[g]||0)}`).join("; ")}.${c.semPreco?` ${c.semPreco} de ${c.m.length} itens estão sem preço informado e não entram no total.`:""}${o.mo>0||o.desp>0?` Os serviços de engenharia, execução e implantação somam ${brl(o.mo)} (${fmt(o.horas,0)} h)${o.desp?` e as despesas diretas ${brl(o.desp)}`:""}, resultando em custo direto de ${brl(o.direto)}; com lucro de ${fmt(+S.orc.lucro||0,1)} %${+S.orc.impostos?` e impostos de ${fmt(+S.orc.impostos,1)} % sobre o preço de venda`:""}, o valor global estimado é de ${brl(o.pv)}.`:" Os valores não incluem mão de obra, frete, impostos nem BDI."} Os preços devem ser atualizados por cotação na data da execução.`;})(),
    doc:`Integram este projeto: ART, carta de solicitação à distribuidora, memorial descritivo, memorial de cálculo, plantas, quadros de distribuição de cargas, diagramas unifilar e multifilar, detalhes construtivos, especificações técnicas e lista de materiais. A aprovação pela distribuidora não exime o responsável técnico da responsabilidade pelo projeto.`
  };
}
// seções do memorial; luminotécnico e SPDA só entram quando estão no escopo (etapa 01)
function memoT(){const ks=[["obj","Objetivo e identificação"],["normas","Normas e regulamentos"],["forn","Fornecimento de energia"],["dist","Distribuição interna"],["cond","Condutores"],["prot","Proteção"],["aterr","Aterramento e equipotencialização"],...(S.projetos.luminotecnico?[["lum","Projeto luminotécnico"]]:[]),...(S.projetos.spda?[["spda","Proteção contra descargas atmosféricas (SPDA)"]]:[]),["custo","Estimativa de custo"],["doc","Documentação do projeto"]];
  return Object.fromEntries(ks.map(([k,t],i)=>[k,`${i+1}. ${t}`]));}
function memoText(k){return S.memo[k]??memoAuto()[k];}
V.memo=()=>`${head(8)}
<p class="intro">Memorial descritivo (item H). O texto é gerado a partir dos dados e cálculos e se atualiza sozinho. Se você editar uma seção, ela passa a ser sua e deixa de acompanhar os cálculos, até você clicar em “Restaurar texto gerado”.</p>
<div style="display:flex;flex-direction:column;gap:14px">${Object.entries(memoT()).map(([k,t])=>`<label class="f" for="memo-${k}"><span style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b style="color:var(--ink);font-weight:600">${t}</b>${S.memo[k]!=null?`<button class="btn small ghost" type="button" data-memoreset="${k}">Restaurar texto gerado</button>`:`<span class="pill ok">automático</span>`}</span><textarea id="memo-${k}" data-memo="${k}">${esc(memoText(k))}</textarea></label>`).join("")}</div>${nav()}`;

/* ---------- materiais ---------- */
const GRUPOS={cab:"Condutores",cond:"Eletrodutos e eletrocalhas",prot:"Proteção (disjuntores, fusíveis, DR, DPS)",cmd:"Comando e partida de motores",qd:"Quadros e supervisão",spda:"SPDA e aterramento (NBR 5419)",extra:"Materiais adicionais"};
function materiais(){
  const p=S.par,f=S.forn,sob=1+(+p.sobra||0)/100,sys=R.sys,M={};
  const add=(g,d,un,q,ci)=>{const k=g+"|"+d;M[k]=M[k]||{g,d,un,q:0,c:new Set()};M[k].q+=q;if(ci)M[k].c.add(ci);};
  // 6.2.11.1.1: condutor isolado 450/750 V só se todos os trechos do circuito forem em conduto fechado (A1/B1)
  const isol=o=>[(+o.c.ld>0)&&p.metDist,(+o.c.lb>0)&&p.metBaix].filter(Boolean).every(m=>MET_ISOLADO.includes(m));
  const cabo=o=>isol(o)?"Cabo de cobre flexível {s} mm² 450/750 V":"Cabo de cobre flexível {s} mm² 0,6/1 kV";
  const icc=fmt(+p.icc||6,1).replace(",0","");
  const djDesc=(pol,In,curva,V)=>`Disjuntor termomagnético ${pol}P ${In} A${curva?` curva ${curva}`:""}, Un ≥ ${V} V, capacidade de interrupção ≥ ${icc} kA${In<=63?" (NBR NM 60898 / IEC 60947-2)":" — caixa moldada (NBR IEC 60947-2)"}`;
  const idrDesc=(d,V)=>`Interruptor diferencial-residual (IDR) ${d.polos}P ${d.In} A, IΔn ${d.idn} mA, tipo ${d.tipo}, Un ≥ ${V} V (NBR NM 61008)`;
  R.out.forEach(o=>{if(!o.s)return;const L=((+o.c.ld||0)+(+o.c.lb||0))*sob;const ci=o.i+1;const cb=s=>cabo(o).replace("{s}",sec(s));
    add("cab",`${cb(o.s)} — fase`,"m",L*o.L.nf);
    if(o.sn)add("cab",`${cb(o.sn)} — ${o.pen?"PEN (azul-claro com anilhas verde-amarelo)":"neutro (azul-claro)"}`,"m",L);
    if(o.spe)add("cab",`${cb(o.spe)} — proteção (verde-amarelo)`,"m",L);
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
  // SPDA (NBR 5419-3): quantidades estimadas pelo método das malhas
  const sp=R.spda;if(S.projetos.spda&&sp.ok){
    add("spda",`Cabo de cobre nu 35 mm² — captação em malha ${sp.g.m} × ${sp.g.m} m e descidas (NBR 5419-3, Tab. 6)`,"m",(sp.captacao+sp.descidas)*sob);
    add("spda","Cabo de cobre nu 50 mm² — eletrodo de aterramento em anel, enterrado a ≥ 0,5 m (NBR 5419-3, Tab. 7)","m",sp.anel*sob);
    add("spda","Caixa de inspeção de aterramento com conector de medição (desconexão), uma por descida","pç",sp.nDesc);
    add("spda","Eletroduto de PVC rígido para proteção mecânica das descidas junto ao solo (≈ 2,5 m por descida; ver medidas contra tensão de toque na NBR 5419-3)","m",sp.nDesc*2.5*sob);
    add("spda","Suportes/fixadores para condutor de captação e descida, a cada 1 m (conforme fabricante)","pç",Math.ceil(sp.captacao+sp.descidas));
    add("spda","Conector de emenda/derivação para malha de captação (tipo split-bolt ou solda exotérmica)","pç",sp.linhasL*sp.linhasW+2*sp.nDesc);
    add("spda","Barramento de equipotencialização principal (BEP) com interligação do SPDA, PE e massas","pç",1);}
  const ordem=Object.keys(GRUPOS);
  const num=t=>{const m=t.match(/(\d+(?:,\d+)?) mm²/);return m?parseFloat(m[1].replace(",",".")):0;};
  const auto=Object.values(M).sort((a,b)=>ordem.indexOf(a.g)-ordem.indexOf(b.g)||(a.g==="cab"?num(a.d)-num(b.d):0)||a.d.localeCompare(b.d)).map(x=>{
    const ref=x.c.size?` — circ. ${[...x.c].sort((a,b)=>a-b).join(", ")}`:"";const key=x.g+"|"+x.d;const pu=+(S.precos||{})[key]||0;const q=x.un==="m"?Math.ceil(x.q):x.q;
    return {d:x.d+ref,un:x.un,q,key,g:x.g,pu,sub:pu*q};});
  // materiais inseridos manualmente: entram no grupo escolhido, depois dos itens calculados
  const ext=(S.extras||[]).map((x,j)=>{const q=+x.q||0,pu=+x.pu||0;return {d:x.d||"(sem descrição)",un:x.un||"pç",q,key:"extra|"+j,g:GRUPOS[x.g]?x.g:"extra",pu,sub:pu*q,ext:j};});
  return ordem.flatMap(g=>[...auto.filter(r=>r.g===g),...ext.filter(r=>r.g===g)]);
}
const brl=v=>isFinite(v)?v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}):"—";
function custos(){const m=materiais();const tot=m.reduce((a,r)=>a+r.sub,0);const semPreco=m.filter(r=>!r.pu).length;const por={};m.forEach(r=>por[r.g]=(por[r.g]||0)+r.sub);return {m,tot,semPreco,por};}
// Orçamento: materiais + serviços (horas × valor/hora) + despesas → custo direto; lucro sobre o custo; impostos "por dentro" no preço de venda
function orcamento(){
  const c=custos(),o=S.orc||{};
  const srv=(o.servicos||[]).map(s=>({...s,h:+s.h||0,vh:+s.vh||0,sub:(+s.h||0)*(+s.vh||0)}));
  const porCat={};srv.forEach(s=>porCat[s.cat]=(porCat[s.cat]||0)+s.sub);
  const mo=srv.reduce((a,s)=>a+s.sub,0),horas=srv.reduce((a,s)=>a+s.h,0),desp=+o.despesas||0;
  const direto=c.tot+mo+desp,lucro=direto*(+o.lucro||0)/100,imp=Math.min(Math.max(+o.impostos||0,0),99);
  const pv=(direto+lucro)/(1-imp/100);
  return {...c,mat:c.tot,srv,porCat,mo,horas,desp,direto,lucro,impV:pv-direto-lucro,imp,pv,margem:pv>0?lucro/pv:0};
}
const espec=()=>[...ESPEC,
  ...(S.projetos.luminotecnico?[["Iluminação","Luminárias LED com fluxo, potência e fotometria iguais ou superiores às do cálculo luminotécnico; IP65 em áreas com poeira ou lavagem; IRC ≥ 80; driver com fator de potência ≥ 0,92 (NBR ISO/CIE 8995-1)."]]:[]),
  ...(S.projetos.spda?[["SPDA","Captação e descidas em cobre nu ≥ 35 mm²; aterramento em anel de cobre nu ≥ 50 mm² enterrado a ≥ 0,5 m; conexões por solda exotérmica ou conectores ensaiados; caixas de inspeção com conector de medição em cada descida; equipotencialização ao BEP (NBR 5419-3 e 5419-4)."]]:[])];
const ESPEC=[
  ["Condutores","Cobre eletrolítico têmpera mole, classe 5 (flexível), isolação PVC 70 °C: condutores isolados 450/750 V (NBR NM 247-3) somente em eletrodutos e canaletas fechadas; cabos 0,6/1 kV (NBR 7288) em trechos enterrados, em bandejas, leitos, eletrocalhas abertas ou fixados em paredes (6.2.11.1.1)."],
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
<p class="note">Os itens calculados vêm do dimensionamento; preencha só o preço unitário (R$). Use “+ Material adicional” para incluir o que o cálculo não gera (caixas de passagem, botoeiras, placas, abraçadeiras, mão de obra terceirizada por item etc.): escolha o grupo, descreva, informe unidade, quantidade e preço. Subtotais e totais são somados automaticamente e entram no memorial, no orçamento e no PDF.</p>
<div class="tbl ct"><table><thead><tr><th>Item</th>${thT("Descrição","Itens calculados: especificação gerada pelo dimensionamento. Itens adicionais (fundo destacado): descrição livre, editável.")}${thT("Un.",TIPS_COL.ext.un)}${thT("Qtd.","Itens calculados: quantidade estimada pelos comprimentos, com sobra. Itens adicionais: digite a quantidade.","r")}${thT("Preço unit. (R$)",TIPS_COL.ext.pu,"r")}${thT("Subtotal","Quantidade × preço unitário.","r")}<th></th></tr></thead><tbody>
${Object.keys(GRUPOS).map(g=>{const rows=m.filter(r=>r.g===g);if(!rows.length)return "";return `<tr class="sub"><td></td><td colspan="6">${GRUPOS[g]}</td></tr>`+rows.map(r=>{const i=m.indexOf(r);
  if(r.ext!=null){const j=r.ext,x=S.extras[j];return `<tr style="background:var(--accent-soft)"><td class="num">${i+1}</td><td style="min-width:320px"><div style="display:flex;gap:6px"><select data-ext="${j}" data-f="g" aria-label="Grupo do material adicional" style="max-width:150px">${Object.entries(GRUPOS).map(([k,v])=>`<option value="${k}" ${x.g===k?"selected":""}>${esc(v)}</option>`).join("")}</select><input data-ext="${j}" data-f="d" value="${esc(x.d)}" placeholder="Descrição e especificação do material" aria-label="Descrição do material adicional"></div></td>
  <td><input class="w-s" data-ext="${j}" data-f="un" value="${esc(x.un)}" aria-label="Unidade"></td><td><input type="number" min="0" step="any" class="w-s" data-ext="${j}" data-f="q" value="${x.q}" aria-label="Quantidade"></td>
  <td><input type="number" min="0" step="0.01" class="w-m" data-ext="${j}" data-f="pu" value="${x.pu||""}" placeholder="0,00" aria-label="Preço unitário do material adicional"></td><td class="num" data-live="sub${i}">${r.pu?brl(r.sub):"—"}</td><td><button class="btn small danger" type="button" data-delext="${j}" aria-label="Remover material adicional">✕</button></td></tr>`;}
  return `<tr><td class="num">${i+1}</td><td style="white-space:normal;min-width:320px">${esc(r.d)}</td><td>${r.un}</td><td class="num">${r.q}</td><td><input type="number" min="0" step="0.01" class="w-m" data-preco="${esc(r.key)}" value="${r.pu||""}" placeholder="0,00" aria-label="Preço unitário do item ${i+1}"></td><td class="num" data-live="sub${i}">${r.pu?brl(r.sub):"—"}</td><td></td></tr>`;}).join("")+`<tr><td></td><td colspan="4" style="text-align:right;color:var(--muted)">Subtotal — ${GRUPOS[g]}</td><td class="num" data-live="grp-${g}">${brl(rows.reduce((a,r)=>a+r.sub,0))}</td><td></td></tr>`;}).join("")}
<tr class="sub"><td></td><td colspan="4" style="text-align:right">TOTAL DE MATERIAIS</td><td class="num" data-live="totmat">${brl(m.reduce((a,r)=>a+r.sub,0))}</td><td></td></tr>
</tbody></table></div>
<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn small" type="button" id="addExt" data-tip="Inclui uma linha livre na lista de materiais, para itens que o cálculo automático não gera.">+ Material adicional</button><p class="note" data-live="sempreco" style="flex:1">${m.filter(r=>!r.pu).length} de ${m.length} itens sem preço informado.</p></div></div>
<div class="block"><h3>Especificações técnicas</h3><div class="tbl"><table><tbody>${espec().map(([a,b])=>`<tr><td style="white-space:normal;font-weight:600;width:170px">${a}</td><td style="white-space:normal">${b}</td></tr>`).join("")}</tbody></table></div></div>
${nav()}`;};

/* ---------- orçamento: materiais + horas de engenharia, serviço e implantação + lucro ---------- */
function orcResumo(o){return `<div class="tbl"><table><tbody>
  <tr><td>Materiais (etapa 10${o.semPreco?`, ${o.semPreco} itens sem preço`:""})</td><td class="num" data-live="orc-mat">${brl(o.mat)}</td></tr>
  ${Object.entries(CAT_SERV).filter(([k])=>o.porCat[k]).map(([k,v])=>`<tr><td>${v}</td><td class="num">${brl(o.porCat[k])}</td></tr>`).join("")}
  <tr><td>Serviços — total (${fmt(o.horas,1)} h)</td><td class="num" data-live="orc-mo">${brl(o.mo)}</td></tr>
  <tr><td>Despesas diretas</td><td class="num">${brl(o.desp)}</td></tr>
  <tr class="sub"><td>Custo direto</td><td class="num" data-live="orc-dir">${brl(o.direto)}</td></tr>
  <tr><td>Lucro (${fmt(+S.orc.lucro||0,1)} % sobre o custo direto)</td><td class="num">${brl(o.lucro)}</td></tr>
  <tr><td>Impostos (${fmt(o.imp,1)} % sobre o preço de venda)</td><td class="num">${brl(o.impV)}</td></tr>
  <tr class="sub"><td>PREÇO DE VENDA</td><td class="num" data-live="orc-pv" style="font-size:15px">${brl(o.pv)}</td></tr>
  <tr><td>Margem de lucro sobre o preço de venda</td><td class="num">${fmt(o.margem*100,1)} %</td></tr>
  </tbody></table></div>`;}
V.orc=()=>{const o=orcamento(),srv=S.orc.servicos;return `${head(10)}
<p class="intro">Orçamento completo da obra. Os materiais vêm da etapa 10 (calculados e adicionais). Os campos abaixo são opcionais: preencha as horas e o valor da hora de engenharia, de execução e de implantação, as despesas, o lucro e os impostos. O preço de venda é (custo direto + lucro) / (1 − impostos).</p>
<div class="block" style="margin-top:0;border-top:0;padding-top:0"><h3>Horas de engenharia, serviço e implantação</h3>
<div class="tbl ct"><table><thead><tr>${thT("Categoria",TIPS_COL.srv.cat)}${thT("Descrição",TIPS_COL.srv.d)}${thT("Horas",TIPS_COL.srv.h,"r")}${thT("Valor da hora (R$)",TIPS_COL.srv.vh,"r")}${thT("Subtotal","Horas × valor da hora.","r")}<th></th></tr></thead><tbody>
${srv.map((s,j)=>`<tr><td><select data-srv="${j}" data-f="cat" aria-label="Categoria do serviço">${Object.entries(CAT_SERV).map(([k,v])=>`<option value="${k}" ${s.cat===k?"selected":""}>${v}</option>`).join("")}</select></td>
<td><input class="w-l" style="width:320px" data-srv="${j}" data-f="d" value="${esc(s.d)}" aria-label="Descrição do serviço"></td>
<td><input type="number" min="0" step="0.5" data-srv="${j}" data-f="h" value="${s.h||""}" placeholder="0" aria-label="Horas"></td>
<td><input type="number" min="0" step="0.01" class="w-m" data-srv="${j}" data-f="vh" value="${s.vh||""}" placeholder="0,00" aria-label="Valor da hora"></td>
<td class="num" data-live="srv${j}">${brl((+s.h||0)*(+s.vh||0))}</td><td><button class="btn small danger" type="button" data-delsrv="${j}" aria-label="Remover serviço">✕</button></td></tr>`).join("")||`<tr><td colspan="6" style="color:var(--muted);padding:12px">Nenhum serviço. Use o botão abaixo.</td></tr>`}
</tbody></table></div>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn small" type="button" id="addSrv" data-tip="Inclui outra linha de serviço (ex.: desenhista, eletricista auxiliar, plantão de partida).">+ Serviço</button>${srv.length?"":`<button class="btn small ghost" type="button" id="srvPadrao">Restaurar engenharia, serviço e implantação</button>`}</div>
<p class="note">Referências para o valor da hora: custo da equipe com encargos, tabela de honorários do sindicato/CREA ou valores praticados na região. Para estimar horas de engenharia, considere o número de circuitos (${S.circ.length}), quadros (${S.quadros.length}) e projetos complementares incluídos.</p></div>
<div class="block"><h3>Despesas, lucro e impostos</h3><div class="grid">
${fld("orc.despesas","Despesas diretas (R$)",{type:"number",step:"0.01"})}${fld("orc.lucro","Lucro da empresa (%)",{type:"number",step:"0.5"})}${fld("orc.impostos","Impostos sobre a venda (%)",{type:"number",step:"0.1"})}${fld("orc.validade","Validade da proposta (dias)",{type:"number",step:"1"})}
</div>${fld("orc.obs","Condições comerciais / observações",{type:"textarea",ph:"Forma de pagamento, prazo de execução, itens não inclusos..."})}
${chkT("orc.pdf","Incluir o orçamento no PDF do projeto","Acrescenta uma seção de orçamento após a lista de materiais. Desmarque se o PDF for enviado à distribuidora sem valores.")}</div>
<div class="block"><h3>Resumo do orçamento</h3><div data-live="orc">${orcResumo(o)}</div></div>
${nav()}`;};

/* ---------- checklist final ---------- */
function pendencias(){
  const a=S.anexos,id=S.id;
  return [
    ["Identificação do cliente e da obra",!!(id.cliente&&id.obra)],
    ["Responsável técnico e CREA",!!(id.rt&&id.crea)],
    ["Ambientes e dimensões cadastrados",S.ambientes.length>0],
    ["Projeto luminotécnico com ambientes",!S.projetos.luminotecnico||S.ambientes.length>0],
    ["SPDA pré-dimensionado (estrutura e NG)",!S.projetos.spda||(R.spda.ok&&R.spda.ng>0)],
    ["Análise de risco NBR 5419-2 anexada",!S.projetos.spda||S.anexos.spda.length>0],
    ["Iluminância obtida ≥ exigida nos ambientes",!S.projetos.luminotecnico||S.ambientes.every(a=>{const c=calcularAmbiente(a);return c.area===0||c.em>=(+a.lux||0)-0.5;})],
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
V.fim=()=>{const pd=pendencias(),ok=pd.filter(x=>x[1]).length;return `${head(11)}
<p class="intro">O PDF segue o fluxo da Aula 2 (slide 7), na mesma ordem do material de referência da Bysol. Cada seção abre com uma página separadora que indica a etapa e o que ela contém. Itens ainda não anexados aparecem como folha de pendência.</p>
<div class="grid wide">
<div class="card"><h3>Verificação</h3><ul class="pend">${pd.map(([t,v])=>`<li class="${v?"ok":""}">${t}</li>`).join("")}</ul></div>
<div class="card"><h3>Ordem do documento</h3><ol style="margin:0;padding-left:20px;font-size:13px;display:flex;flex-direction:column;gap:2px">
<li>ART (item L)</li><li>Solicitação à distribuidora</li><li>Memorial descritivo (item H)</li><li>Memorial de cálculo: cargas, demanda, condutores, condutos, proteções (item I)</li><li>Plantas: situação e plantas baixas (item D)</li><li>Quadros de distribuição de cargas (item F)</li><li>Diagrama unifilar (item F)</li><li>Diagramas multifilares (item F)</li><li>Detalhes construtivos e convenções (item G)</li><li>Especificações técnicas (item J)</li><li>Lista de materiais (item K)</li>${S.orc.pdf?"<li>Orçamento (materiais, serviços e lucro)</li>":""}</ol><p style="font-size:12px;color:var(--muted);margin-top:6px">Antes de tudo: capa e sumário. Outros anexos, se houver, vão ao final.</p></div>
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
  <dt>Classificação</dt><dd>${R.cls.grupo} · ${R.cls.sub}</dd><dt>Disjuntor geral</dt><dd>${R.ent.inom?`${R.ent.polos}P ${R.ent.inom} A`:"—"}</dd><dt>Alimentador geral</dt><dd>${R.ent.s?`${sec(R.ent.s)} mm²`:"—"}</dd>${(()=>{const o=orcamento();return o.tot>0||o.mo>0?`<dt>Materiais</dt><dd>${brl(o.mat)}</dd><dt>Preço de venda</dt><dd>${brl(o.pv)}</dd>`:"";})()}</dl></div>
  <div class="card"><h3>Fases (kVA)</h3><div class="bars">${R.PH.map(k=>`<div class="bar"><span class="ph ${k}">${k}</span><div class="track"><div class="fill ${k}" style="width:${(R.ph[k]/maxPh*100).toFixed(1)}%"></div></div><span class="mono" style="text-align:right">${fmt(R.ph[k]/1000,2)}</span></div>`).join("")}</div></div>
  <div class="card"><h3>Pendências</h3><ul class="pend">${pd.map(([t,v])=>`<li class="${v?"ok":""}">${t}</li>`).join("")}</ul></div>`;
}
function liveCells(){R.out.forEach(o=>{const a=document.querySelector(`[data-live="S${o.i}"]`),b=document.querySelector(`[data-live="I${o.i}"]`),q=document.querySelector(`[data-c="${o.i}"][data-f="qtd"]`);if(a)a.textContent=fmt0(o.S);if(b)b.textContent=fmt(o.ib,1);if(q)q.value=o.c.qtd;});
  S.ambientes.forEach((a,i)=>{const c=calcularAmbiente(a);const set=(k,v)=>{const el=document.querySelector(`[data-live="amb-${k}-${i}"]`);if(el)el.textContent=v;};
    set("area",`${fmt0(c.area)} m²`);set("k",fmt(c.k,2));set("tug",c.tomadas);set("lum",c.luminarias);set("em",`${fmt0(c.em)} lx`);
    const em=document.querySelector(`[data-live="amb-em-${i}"]`);if(em)em.style.color=c.area>0&&c.em<(+a.lux||0)-0.5?"var(--bad)":"";});}
// totais de materiais e orçamento sem redesenhar a página (mantém o foco no campo em edição)
function atualizarTotais(){
  const c=custos();c.m.forEach((r,i)=>{const el=document.querySelector(`[data-live="sub${i}"]`);if(el)el.textContent=r.pu?brl(r.sub):"—";});
  Object.keys(GRUPOS).forEach(g=>{const el=document.querySelector(`[data-live="grp-${g}"]`);if(el)el.textContent=brl(c.por[g]||0);});
  const tt=document.querySelector('[data-live="totmat"]');if(tt)tt.textContent=brl(c.tot);const sp=document.querySelector('[data-live="sempreco"]');if(sp)sp.textContent=`${c.semPreco} de ${c.m.length} itens sem preço informado.`;
  (S.orc.servicos||[]).forEach((s,j)=>{const el=document.querySelector(`[data-live="srv${j}"]`);if(el)el.textContent=brl((+s.h||0)*(+s.vh||0));});
  const ob=document.querySelector('[data-live="orc"]');if(ob)ob.innerHTML=orcResumo(orcamento());
  renderSteps();renderSummary();persist();}
function render(keepScroll){calc();esconderTip();renderSteps();renderStamp();renderSummary();
  const sh=document.getElementById("sheet");sh.innerHTML=V[STEPS[cur].k]();liveCells();
  if(!keepScroll)sh.scrollIntoView({block:"start",behavior:"auto"});}
function soft(){calc();renderSteps();renderStamp();renderSummary();liveCells();
  document.querySelectorAll('[data-live="cls"]').forEach(el=>el.innerHTML=clsCard());
  document.querySelectorAll('[data-live="dps"]').forEach(el=>el.innerHTML=dpsCard());
  document.querySelectorAll('[data-live="spda"]').forEach(el=>el.innerHTML=spdaCard());
  document.querySelectorAll('[data-live="orc"]').forEach(el=>el.innerHTML=orcResumo(orcamento()));
  // atualiza textos automáticos do memorial sem perder foco
  if(STEPS[cur].k==="memo"){const au=memoAuto();Object.keys(memoT()).forEach(k=>{if(S.memo[k]==null){const t=document.getElementById("memo-"+k);if(t&&document.activeElement!==t)t.value=au[k];}});}
  if(!document.getElementById("jsonPanel").hidden)atualizarJsonOut();
  persist();}
function toast(m){const t=document.getElementById("toast");t.textContent=m;t.hidden=false;clearTimeout(t._t);t._t=setTimeout(()=>t.hidden=true,3200);}
/* balão de ajuda: um único elemento flutuante, posicionado junto ao campo (não é cortado pelas tabelas com rolagem) */
const tipBox=Object.assign(document.createElement("div"),{className:"tipbox",id:"tipbox",hidden:true});tipBox.setAttribute("role","tooltip");document.body.appendChild(tipBox);
let tipAlvo=null;
function tipDe(el){
  if(!el||!el.closest)return null;
  const d=el.closest("[data-tip]");if(d)return {el:d,t:d.dataset.tip};
  const c=el.closest("[data-f]");if(!c)return null;const f=c.dataset.f;
  const grp=c.dataset.c!=null?"c":c.dataset.qd!=null?"qd":c.dataset.amb!=null?"amb":c.dataset.ext!=null?"ext":c.dataset.srv!=null?"srv":null;
  const t=grp&&TIPS_COL[grp][f];return t?{el:c,t}:null;
}
function mostrarTip(el,t){
  if(tipAlvo&&tipAlvo!==el)tipAlvo.removeAttribute("aria-describedby");
  tipAlvo=el;tipBox.textContent=t;tipBox.hidden=false;
  const inp=el.matches("input,select,textarea")?el:el.querySelector("input,select,textarea");if(inp)inp.setAttribute("aria-describedby","tipbox");
  const r=el.getBoundingClientRect(),bw=tipBox.offsetWidth,bh=tipBox.offsetHeight;
  const x=Math.min(Math.max(8,r.left),window.innerWidth-bw-8);let y=r.top-bh-8;if(y<8)y=r.bottom+8;
  tipBox.style.left=x+"px";tipBox.style.top=y+"px";}
function esconderTip(){if(tipAlvo){tipAlvo.querySelector?.("[aria-describedby='tipbox']")?.removeAttribute("aria-describedby");tipAlvo.removeAttribute?.("aria-describedby");}tipAlvo=null;tipBox.hidden=true;}
document.addEventListener("mouseover",e=>{const r=tipDe(e.target);if(r){if(r.el!==tipAlvo)mostrarTip(r.el,r.t);}else if(!tipAlvo||!tipAlvo.contains(document.activeElement))esconderTip();});
document.addEventListener("focusin",e=>{const r=tipDe(e.target);r?mostrarTip(r.el,r.t):esconderTip();});
document.addEventListener("focusout",()=>setTimeout(()=>{if(!tipAlvo||!tipAlvo.contains(document.activeElement))esconderTip();},0));
document.addEventListener("keydown",e=>{if(e.key==="Escape")esconderTip();});
window.addEventListener("scroll",esconderTip,{passive:true,capture:true});

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
  if(b.id==="addAmb"){const i=S.ambientes.length+1;S.ambientes.push({id:`amb-${Date.now()}`,nome:`Ambiente ${i}`,comprimento:6,largura:5,altura:3,lux:300,lm:4000,w:40,uf:0.6,mf:0.8,espTomadas:5,espLum:1.5});persist();render(true);return;}
  if(b.dataset.delamb!=null){const a=S.ambientes.splice(+b.dataset.delamb,1)[0];S.circ.forEach(c=>{if(c.ambiente===a.id)c.ambiente="";});persist();render(true);return;}
  if(b.dataset.del!=null){S.circ.splice(+b.dataset.del,1);persist();render(true);return;}
  if(b.id==="addQ"){let n=S.quadros.length,nm;do nm="QD-"+n++;while(S.quadros.some(q=>q.nome===nm));S.quadros.push({nome:nm,L:20,met:"B1",pai:S.quadros[0].nome});persist();render(true);return;}
  if(b.dataset.delq!=null){const j=+b.dataset.delq;if(j===0)return;const q=S.quadros[j],nm=q.nome,dest=origemQ(q)||S.quadros[0].nome;
    S.quadros.forEach(x=>{if(x!==q&&x.pai===nm)x.pai=dest;}); // sub-quadros passam para a origem do quadro removido
    S.quadros.splice(j,1);S.circ.forEach(c=>{if(c.q===nm)c.q=dest;});persist();render(true);toast(`Quadro ${nm} removido: circuitos e sub-quadros transferidos para ${dest}.`);return;}
  if(b.id==="addExt"){S.extras.push({g:"extra",d:"",un:"pç",q:1,pu:0});persist();render(true);setTimeout(()=>document.querySelector(`[data-ext="${S.extras.length-1}"][data-f="d"]`)?.focus(),0);return;}
  if(b.dataset.delext!=null){S.extras.splice(+b.dataset.delext,1);persist();render(true);return;}
  if(b.id==="addSrv"){S.orc.servicos.push({cat:"outro",d:"",h:0,vh:0});persist();render(true);return;}
  if(b.id==="srvPadrao"){S.orc.servicos=SERVICOS_PADRAO.map(s=>Object.assign({},s));persist();render(true);return;}
  if(b.dataset.delsrv!=null){S.orc.servicos.splice(+b.dataset.delsrv,1);persist();render(true);return;}
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
  if(t.dataset.bind){setP(t.dataset.bind,t.type==="checkbox"?t.checked:t.value);if(t.dataset.bind==="projetos.spda"&&t.checked)S.forn.spda=true;soft();return;}
  if(t.dataset.amb!=null){const a=S.ambientes[+t.dataset.amb],f=t.dataset.f;const num=["comprimento","largura","altura","lux","lm","w","uf","mf","espTomadas","espLum"].includes(f);a[f]=num?(t.value===""?0:+t.value):t.value;soft();return;}
  if(t.dataset.c!=null){const c=S.circ[+t.dataset.c];const f=t.dataset.f;const num=["qtd","pot","fp","eta","fs","fu","fd","ld","lb"].includes(f);c[f]=num?(t.value===""?0:+t.value):t.value;soft();return;}
  if(t.dataset.qd!=null){const q=S.quadros[+t.dataset.qd];const f=t.dataset.f;
    if(f==="nome"){const old=q.nome;q.nome=t.value;S.circ.forEach(c=>{if(c.q===old)c.q=t.value;});S.quadros.forEach(x=>{if(x!==q&&x.pai===old)x.pai=t.value;});}
    else q[f]=f==="L"?+t.value||0:t.value;soft();return;}
  if(t.dataset.can!=null){S.canaletas[t.dataset.can]={L:+t.value||0};soft();return;}
  if(t.dataset.memo){S.memo[t.dataset.memo]=t.value;persist();return;}
  if(t.dataset.preco!=null){S.precos=S.precos||{};const v=parseFloat(t.value);if(isFinite(v)&&v>0)S.precos[t.dataset.preco]=v;else delete S.precos[t.dataset.preco];atualizarTotais();return;}
  if(t.dataset.ext!=null){const x=S.extras[+t.dataset.ext],f=t.dataset.f;if(f==="g")return;x[f]=["q","pu"].includes(f)?(parseFloat(t.value)||0):t.value;atualizarTotais();return;}
  if(t.dataset.srv!=null){const s=S.orc.servicos[+t.dataset.srv],f=t.dataset.f;s[f]=["h","vh"].includes(f)?(parseFloat(t.value)||0):t.value;atualizarTotais();return;}
});
document.addEventListener("change",e=>{
  const t=e.target;
  if(t.dataset.c!=null&&(t.dataset.re||t.dataset.f==="tipo")){const c=S.circ[+t.dataset.c];if(c.tipo==="motor"){c.unid="cv";c.eta=c.eta<1?c.eta:0.87;c.fu=0.87;c.fs=1.25;c.prot=c.prot||"dj";c.partida=c.partida||"direta";c.fusTipo=c.fusTipo||"gG";if(c.lig==="F+N"&&ligOK("3F",SISTEMAS[S.forn.sistema]))c.lig="3F";}else if(c.unid==="cv"){c.unid="W";c.eta=1;}persist();render(true);return;}
  if(t.dataset.c!=null&&["prot","partida","fusTipo","local","dr","ambiente"].includes(t.dataset.f)){render(true);return;}
  if(t.dataset.ext!=null&&t.dataset.f==="g"){S.extras[+t.dataset.ext].g=t.value;persist();render(true);return;}
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
  const n=Object.assign(b,d,{id:Object.assign(b.id,d.id),projetos:Object.assign(b.projetos,{...(d.projetos||{}),spda:d.projetos?.spda??!!d.forn?.spda}),forn:Object.assign(b.forn,d.forn||{}),par:Object.assign(b.par,d.par||{}),canaletas:d.canaletas||{},memo:d.memo||{},chk:d.chk||{}});
  if(!SISTEMAS[n.forn.sistema])n.forn.sistema="380/220";if(!CLASSES[n.forn.classe])n.forn.classe="rural";if(!T42[n.par.agrDist])n.par.agrDist="feixe";if(!METODOS[n.par.metDist])n.par.metDist="B1";if(!METODOS[n.par.metBaix])n.par.metBaix="B1";
  if(!T45[n.par.espEnt])n.par.espEnt="nula";
  n.quadros=Array.isArray(d.quadros)&&d.quadros.length?d.quadros.map((q,j)=>({nome:String(q.nome||"QD"),L:j===0?0:+q.L||0,met:METODOS[q.met]?q.met:"B1",pai:j===0?"":String(q.pai||d.quadros[0].nome||"QGBT")})):b.quadros;
  {const S0=S;S={quadros:n.quadros};n.quadros.forEach((q,j)=>{if(j&&(!n.quadros.some(x=>x!==q&&x.nome===q.pai)||!cadeia(q).includes(n.quadros[0])))q.pai=n.quadros[0].nome;});S=S0;} // origem inexistente ou ciclo → QGBT
  n.extras=Array.isArray(d.extras)?d.extras.map(x=>({g:GRUPOS[x.g]?x.g:"extra",d:String(x.d||""),un:String(x.un||"pç"),q:+x.q||0,pu:+x.pu||0})):[];
  n.orc=Object.assign(b.orc,d.orc||{});n.orc.servicos=Array.isArray(d.orc?.servicos)?d.orc.servicos.map(s=>({cat:CAT_SERV[s.cat]?s.cat:"outro",d:String(s.d||""),h:+s.h||0,vh:+s.vh||0})):b.orc.servicos;
  n.estrutura=Object.assign(b.estrutura,d.estrutura||{});if(!NP5419[n.estrutura.np])n.estrutura.np="III";
  n.ambientes=Array.isArray(d.ambientes)?d.ambientes.map((a,i)=>Object.assign({id:`amb-${i+1}`,nome:`Ambiente ${i+1}`,comprimento:0,largura:0,altura:3,lux:300,lm:4000,w:40,uf:0.6,mf:0.8,espTomadas:5,espLum:1.5},a,{id:String(a.id||`amb-${i+1}`)})):[];
  n.precos=d.precos&&typeof d.precos==="object"?d.precos:{};if(!ATERR[n.forn.aterr])n.forn.aterr="TN-S";
  const def={local:"seco",dr:"auto",q:n.quadros[0].nome,nome:"Circuito",tipo:"tug",lig:"F+N",qtd:1,pot:100,unid:"VA",fp:0.8,eta:1,fs:1,fu:1,fd:1,can:"CN-1",ld:0,lb:0,ambiente:""};
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
function pt(s){s=String(s??"").replace(/≤/g,"<=").replace(/≥/g,">=").replace(/Δ/g,"dV").replace(/√3/g,"raiz(3)").replace(/√/g,"raiz").replace(/Ω/g,"ohm").replace(/η/g,"rend.").replace(/φ/g,"phi").replace(/→/g,"->").replace(/←/g,"<-").replace(/✕/g,"x").replace(/−/g,"-").replace(/⁻¹/g,"^-1").replace(/⁻⁵/g,"^-5").replace(/⁻⁶/g,"^-6").replace(/ | /g," ");
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

  // CAPA — mesmas cores das capas de seção: verde, faixa âmbar e creme
  const CO=await doc.embedFont(StandardFonts.Courier);
  const CV=rgb(0.059,0.239,0.18),CA=rgb(0.949,0.698,0.2),CC=rgb(0.957,0.937,0.886),CS=rgb(0.624,0.769,0.702),CD=rgb(0.114,0.353,0.271);
  const dT=(pp,s,x,y,size,font,color)=>pp.drawText(pt(s),{x,y,size,font,color});
  const dTC=(pp,s,cx,y,size,font,color)=>{const t=pt(s);pp.drawText(t,{x:cx-font.widthOfTextAtSize(t,size)/2,y,size,font,color});};
  const dTR=(pp,s,xr,y,size,font,color)=>{const t=pt(s);pp.drawText(t,{x:xr-font.widthOfTextAtSize(t,size),y,size,font,color});};
  const aneis=(pp,cx,cy,rs)=>rs.forEach(r=>pp.drawCircle({x:cx,y:cy,size:r,borderColor:CD,borderWidth:0.8}));
  const dataLonga=new Date((id.data||new Date().toISOString().slice(0,10))+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"});
  {newPage(false,"Capa");const X=58,XR=W-40;
    pg.drawRectangle({x:0,y:0,width:W,height:H,color:CV});aneis(pg,W-20,H-250,[110,150,190,230]);
    // cabeçalho
    dT(pg,"PROJETO DE INSTALAÇÕES ELÉTRICAS",X,H-52,9,CO,CA);dTR(pg,`REV. 00  ·  ${id.data||""}`,XR,H-52,8,CO,CS);
    pg.drawLine({start:{x:X,y:H-64},end:{x:XR,y:H-64},thickness:0.6,color:CD});
    // título
    let yy=H-128;let fs=30,ls=wrap(id.obra||"Obra",FB,fs,XR-X-60);while(ls.length>3&&fs>20){fs-=2;ls=wrap(id.obra||"Obra",FB,fs,XR-X-60);}
    ls.forEach(l=>{pg.drawText(l,{x:X,y:yy,size:fs,font:FB,color:CC});yy-=fs*1.12;});
    pg.drawRectangle({x:X,y:yy+fs*0.35,width:70,height:4,color:CA});yy-=16;
    wrap(id.atividade||"",F,12,XR-X-60).slice(0,2).forEach(l=>{pg.drawText(l,{x:X,y:yy,size:12,font:F,color:CS});yy-=16;});
    // escopo
    yy-=14;let cx=X;[["INSTALAÇÕES ELÉTRICAS","NBR 5410"],S.projetos.luminotecnico&&["LUMINOTÉCNICO","NBR ISO/CIE 8995-1"],S.projetos.spda&&["SPDA","NBR 5419"]].filter(Boolean).forEach(([a,n])=>{
      const t=pt(a),w1=FB.widthOfTextAtSize(t,8),w2=CO.widthOfTextAtSize(pt(n),7),cw=w1+w2+26;
      pg.drawRectangle({x:cx,y:yy-7,width:cw,height:20,borderColor:CA,borderWidth:0.9});pg.drawText(t,{x:cx+8,y:yy,size:8,font:FB,color:CC});pg.drawText(pt(n),{x:cx+18+w1,y:yy,size:7,font:CO,color:CA});cx+=cw+8;});
    // números-chave
    yy-=40;const fh=66,cw=(XR-X)/4,nSub=R.quadros.filter(q=>q.nivel>1).length;
    pg.drawLine({start:{x:X,y:yy},end:{x:XR,y:yy},thickness:0.6,color:CD});pg.drawLine({start:{x:X,y:yy-fh},end:{x:XR,y:yy-fh},thickness:0.6,color:CD});
    [[fmt(R.inst,2),"kW","CARGA INSTALADA"],[fmt(R.ent.S,2),"kVA","DEMANDA C/ RESERVA"],[String(S.quadros.length),nSub?`(${nSub} sub)`:"","QUADROS"],[String(R.out.length),"","CIRCUITOS"]].forEach(([v,u,l],k)=>{
      const x0=X+k*cw+(k?14:0);if(k)pg.drawLine({start:{x:X+k*cw,y:yy-10},end:{x:X+k*cw,y:yy-fh+10},thickness:0.6,color:CD});
      pg.drawText(pt(v),{x:x0,y:yy-36,size:22,font:FB,color:CC});if(u)pg.drawText(pt(u),{x:x0+FB.widthOfTextAtSize(pt(v),22)+4,y:yy-36,size:9,font:F,color:CS});
      pg.drawText(pt(l),{x:x0,y:yy-54,size:7,font:CO,color:CA});});
    // dados do projeto em duas colunas
    yy-=fh+22;const gw=(XR-X-24)/2;
    const col=(x,rows)=>{let y2=yy;rows.forEach(([l,v])=>{pg.drawText(pt(l),{x,y:y2,size:6.5,font:CO,color:CS});const vl=wrap(v||"—",F,9.5,gw).slice(0,2);vl.forEach((t,j)=>pg.drawText(t,{x,y:y2-13-j*12,size:9.5,font:F,color:CC}));y2-=13+vl.length*12+7;pg.drawLine({start:{x,y:y2+4},end:{x:x+gw,y:y2+4},thickness:0.4,color:CD});y2-=6;});};
    col(X,[["CLIENTE / PROPRIETÁRIO",id.cliente],["LOCALIZAÇÃO",[id.local,id.municipio].filter(Boolean).join(" — ")],["UNIDADE CONSUMIDORA",id.uc],["DISTRIBUIDORA",id.distribuidora],["CLASSIFICAÇÃO (REN ANEEL 1.000/2021)",`${R.cls.classeT} / ${R.cls.subclasse} — Grupo ${R.cls.grupo}, subgrupo ${R.cls.sub}`]]);
    col(X+gw+24,[["ALIMENTAÇÃO",sys.nome],["ATENDIMENTO",S.forn.atend==="MT"?`Tensão primária ${fmt(+S.forn.tensaoPrim,1)} kV — ${R.cls.modalidade}`:`Tensão secundária — ${R.cls.modalidade}`],["ESQUEMA DE ATERRAMENTO",ATERR[S.forn.aterr]],["AMBIENTES",`${S.ambientes.length} ambiente(s), ${fmt0(S.ambientes.reduce((a,x)=>a+calcularAmbiente(x).area,0))} m²`],["ART",id.art||"a emitir"]]);
    // rodapé creme: responsabilidade técnica
    const fb=128,rw=(XR-X)/3;pg.drawRectangle({x:0,y:0,width:W,height:fb,color:CC});
    [["RESPONSÁVEL TÉCNICO",id.rt||"—",`CREA ${id.crea||"—"}`],["PROJETISTA",id.projetista||id.rt||"—",""],["EMISSÃO",dataLonga,"Revisão 00"]].forEach(([l,v,s2],k)=>{const x=X+k*rw;
      pg.drawText(pt(l),{x,y:fb-32,size:6.5,font:CO,color:CD});wrap(v,FB,10.5,rw-14).slice(0,2).forEach((t,j)=>pg.drawText(t,{x,y:fb-48-j*13,size:10.5,font:FB,color:CV}));if(s2)pg.drawText(pt(s2),{x,y:fb-78,size:8.5,font:F,color:CD});});
    pg.drawLine({start:{x:X,y:30},end:{x:XR,y:30},thickness:0.5,color:CS});
    dT(pg,"DOCUMENTO TÉCNICO  ·  CONFERIR PREMISSAS, PRANCHAS E DADOS DE CAMPO",X,16,7,CO,CD);
    pg.drawRectangle({x:0,y:0,width:22,height:H,color:CA});}
  const sumIndex=1; // sumário será inserido aqui depois

  // ===== DOCUMENTOS SIMULADOS (quando o anexo não foi enviado) =====
  const simOn=S.par.simular!==false;
  const RED=rgb(0.82,0.08,0.08),RSOFT=rgb(0.99,0.9,0.9),GR=rgb(0.45,0.5,0.48),LG=rgb(0.93,0.95,0.94);
  const A3L=[1190.55,841.89];
  const T=(pp,str,x,y,size=8,font=F,color=INK)=>pp.drawText(pt(str),{x,y,size,font,color});
  const TC=(pp,str,cx,y,size=8,font=F,color=INK)=>{const t=pt(str);pp.drawText(t,{x:cx-font.widthOfTextAtSize(t,size)/2,y,size,font,color});};
  const Ln=(pp,x1,y1,x2,y2,th=1,color=INK,dash)=>pp.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:th,color,dashArray:dash});
  const Bx=(pp,x,y,w,h,o={})=>pp.drawRectangle({x,y,width:w,height:h,borderColor:o.bc||INK,borderWidth:o.bw??1,color:o.fill});
  const Ci=(pp,x,y,r,o={})=>pp.drawCircle({x,y,size:r,borderColor:o.bc||INK,borderWidth:o.bw??1,color:o.fill});
  const redU=(pp,x,y,w)=>Ln(pp,x,y-2,x+w,y-2,1.2,RED);
  const TW=(pp,str,x,y,maxW,size=7,font=F,color=INK,lead=1.25)=>{wrap(str,font,size,maxW).forEach((l,i)=>pp.drawText(l,{x,y:y-i*size*lead,size,font,color}));return wrap(str,font,size,maxW).length;};
  function simPage(size,titulo){
    const pp=doc.addPage(size);const [w,h]=size;
    pp.drawText("SIMULADO",{x:w*0.2,y:h*0.25,size:Math.min(w,h)*0.22,font:FB,color:RED,opacity:0.06,rotate:PDFLib.degrees(30)});
    Bx(pp,14,14,w-28,h-28,{bc:RED,bw:2.4});
    pp.drawRectangle({x:14,y:h-40,width:w-28,height:26,color:RED});
    T(pp,w<700?"DOCUMENTO SIMULADO — gerado com os dados do projeto. Corrigir e substituir.":"DOCUMENTO SIMULADO — gerado automaticamente com os dados do projeto. Revisar, corrigir e substituir pelo documento definitivo.",24,h-31,9,FB,rgb(1,1,1));
    T(pp,titulo.toUpperCase(),24,h-62,14,FB,INK);
    return {pp,w,h};
  }
  function carimbo(pp,w,titulo,prancha){
    const bw=330,bh=108,x=w-14-bw,y=14;Bx(pp,x,y,bw,bh,{bw:1.2,fill:rgb(1,1,1)});
    const rows=[["Obra",id.obra||"—"],["Cliente",id.cliente||"—"],["Resp. técnico",`${id.rt||"—"} · CREA ${id.crea||"—"}`],["Conteúdo",titulo],["Escala / data","Sem escala (croqui) · "+(id.data||"")]];
    rows.forEach(([k,v],i)=>{const yy=y+bh-16-i*18;T(pp,k,x+6,yy,6.5,F,MUT);T(pp,String(v).slice(0,62),x+72,yy,7.5,i===3?FB:F,INK);Ln(pp,x,yy-5,x+bw,yy-5,0.4,LN);});
    T(pp,"PRANCHA",x+6,y+8,6,F,MUT);T(pp,prancha,x+50,y+6,10,FB,INK);T(pp,"SIMULADA — corrigir",x+bw-110,y+7,8,FB,RED);
  }
  const reg=(t)=>toc.length; // placeholder
  // ---- ART simulada
  function simART(){
    const {pp,w,h}=simPage(A4,"Modelo didático de ART — sem validade");
    let y=h-90;
    T(pp,"Este modelo reproduz os campos típicos de uma ART de projeto para fins de aula. A ART oficial deve ser emitida no sistema do CREA.",40,y,8.5,F,MUT);y-=24;
    const sec2=(tit,campos)=>{pp.drawRectangle({x:40,y:y-4,width:w-80,height:16,color:LG});T(pp,tit,46,y,9,FB,INK);y-=22;
      campos.forEach(([k,v,red])=>{T(pp,k,46,y,8,F,MUT);const vv=v||"A PREENCHER";T(pp,vv,190,y,9,red||!v?FB:F,red||!v?RED:INK);if(red||!v)redU(pp,190,y,Math.min(F.widthOfTextAtSize(pt(vv),9)+6,w-240));y-=17;});y-=6;};
    sec2("1. Contratado",[["Profissional",id.rt],["Registro CREA",id.crea],["Título profissional","A PREENCHER",true],["Empresa contratada","A PREENCHER",true]]);
    sec2("2. Contratante",[["Nome / razão social",id.cliente],["CPF / CNPJ","A PREENCHER",true],["Endereço",[id.local,id.municipio].filter(Boolean).join(" — ")]]);
    sec2("3. Identificação da obra/serviço",[["Proprietário",id.cliente],["Endereço da obra",[id.local,id.municipio].filter(Boolean).join(" — ")],["Unidade consumidora",id.uc],["Finalidade",id.atividade||id.obra]]);
    sec2("4. Atividade técnica",[["Atividade","Projeto de instalações elétricas de baixa tensão"],["Descrição",id.obra],["Quantidade",`${fmt(R.inst,2)} kW de carga instalada`],["Demanda com reserva",`${fmt(R.ent.S,2)} kVA`]]);
    sec2("5. Dados da ART",[["Número da ART",id.art],["Tipo","Prestação de serviço — obra/serviço",true],["Valor do contrato / honorários","A PREENCHER",true],["Data de início / previsão de término","A PREENCHER",true]]);
    y-=30;Ln(pp,60,y,260,y,0.8);Ln(pp,w-260,y,w-60,y,0.8);TC(pp,id.rt||"Profissional",160,y-12,8);TC(pp,id.cliente||"Contratante",w-160,y-12,8);
    T(pp,"Campos sublinhados em vermelho foram preenchidos por suposição ou estão em branco: corrigir antes de emitir.",40,50,8,FB,RED);
  }
  // ---- Planta de situação
  function simSituacao(){
    const {pp,w,h}=simPage(A3L,"Planta de situação (croqui)");
    const f=S.forn;
    // via e rede
    pp.drawRectangle({x:60,y:120,width:w-440,height:46,color:rgb(0.88,0.88,0.86)});T(pp,`Via de acesso — ${id.local||"endereço a preencher"}`,80,138,10,FB,GR);
    Ln(pp,60,190,w-380,190,1.4,ACC,[6,4]);T(pp,`Rede da distribuidora (${f.rede||"tipo a informar"}) — ${id.distribuidora||""}`,80,196,8,F,ACC);
    for(let x=90;x<w-380;x+=150){Ci(pp,x,190,5,{fill:rgb(1,1,1),bc:ACC,bw:1.4});}
    const px=390;Ci(pp,px,190,7,{fill:RSOFT,bc:RED,bw:1.6});T(pp,"Poste de derivação (ponto de entrega)",px-60,176,7.5,FB,RED);
    // lote e edificação
    Bx(pp,120,230,w-560,480,{bc:GR,bw:1.2});T(pp,"Limite do terreno",130,700,8,F,GR);
    Bx(pp,300,380,w-860,240,{bw:2,fill:LG});TC(pp,id.obra||"Edificação",300+(w-860)/2,500,11,FB);TC(pp,id.atividade||"",300+(w-860)/2,484,8,F,MUT);
    // padrão e alimentador
    Bx(pp,px-18,236,36,30,{bw:1.4,fill:rgb(1,1,1)});TC(pp,"PE",px,247,8,FB);T(pp,"Padrão de entrada / medição",px+24,246,7.5);
    Ln(pp,px,197,px,236,1.2,INK,[3,2]);T(pp,`Ramal de ligação — ${f.distRede||"distância a confirmar"}`,px+8,212,7.5,FB,RED);redU(pp,px+8,212,190);
    const qx=320,qy=400;Bx(pp,qx,qy,26,18,{fill:INK});T(pp,"QGBT",qx,qy+24,8,FB);
    Ln(pp,px,266,px,qy+9,1.6);Ln(pp,px,qy+9,qx+26,qy+9,1.6);
    T(pp,`Alimentador de entrada: ${R.ent.s?R.ent.txt+" mm²":"—"}, ${R.ent.ed?R.ent.ed.nome:""}, ${f.Lent} m, método ${f.metEnt}`,px+8,330,7.5,F,INK);
    // quadros: cada um ligado à sua origem (QGBT ou quadro intermediário); x proporcional à distância total de rota até o QGBT
    const pos=new Map([[S.quadros[0],{x:qx,y:qy}]]);
    quadrosEmArvore().slice(1).forEach((q,i)=>{const pq=pos.get(paiDe(q))||pos.get(S.quadros[0]);const x=Math.min(w-420,Math.max(pq.x+50,qx+60+distQGBT(q)*5)),y=Math.max(260,620-i*48);pos.set(q,{x,y});
      Bx(pp,x,y,26,18,{fill:INK});T(pp,q.nome,x,y+24,8,FB);Ln(pp,pq.x+13,pq.y+(y>pq.y?18:0),pq.x+13,y+9,0.8,INK,[4,3]);Ln(pp,pq.x+13,y+9,x,y+9,0.8,INK,[4,3]);
      T(pp,`${origemQ(q)} -> ${q.nome}: ${fmt(+q.L||0,0)} m`,x+32,y+9,7,F,MUT);if(paiDe(q)!==S.quadros[0])T(pp,`rota até o QGBT: ${fmt(distQGBT(q),0)} m`,x+32,y,6.5,F,MUT);});
    // norte
    const nx=w-420,ny=640;Ln(pp,nx,ny,nx,ny+50,1.4);pp.drawSvgPath(`M ${nx} ${-(ny+60)} L ${nx-7} ${-(ny+44)} L ${nx+7} ${-(ny+44)} Z`,{color:INK});TC(pp,"N",nx,ny+64,10,FB);
    T(pp,"Orientação, distâncias e posição da rede são supostas: conferir em levantamento de campo.",60,90,9,FB,RED);
    carimbo(pp,w,"Planta de situação","SIT-01");
  }
  // ---- Planta baixa esquemática
  function simPlanta(){
    const {pp,w,h}=simPage(A3L,"Planta baixa esquemática — pontos, quadros e rotas");
    const X0=60,Y0=140,BW=w-460,BH=h-230;Bx(pp,X0,Y0,BW,BH,{bw:2.2});T(pp,id.obra||"Edificação",X0+8,Y0+BH-14,9,FB,GR);
    const somaL=S.ambientes.reduce((n,a)=>n+Math.max(0,+a.comprimento||0),0),maxW=Math.max(0,...S.ambientes.map(a=>+a.largura||0));
    const escala=Math.min((BW-40)/Math.max(somaL,1),(BH-110)/Math.max(maxW,1));
    const canaletas=Object.values(R.cans),yTronco=Y0+BH-55;
    if(canaletas.length){Bx(pp,X0+12,yTronco-8,42,18,{fill:INK});TC(pp,"QGBT",X0+33,yTronco-3,6.5,FB,rgb(1,1,1));}
    canaletas.slice(0,8).forEach((g,i)=>{const y=yTronco-i*19,x1=X0+64,x2=X0+BW-14;Ln(pp,x1,y,x2,y,2.2,ACC);T(pp,`${g.k} — ${g.circ.join(", ")} · ${g.dim}`,x1+4,y+4,6.5,FB,ACC);});
    let xRoom=X0+20;
    S.ambientes.forEach((a,i)=>{
      const L=Math.max(0,+a.comprimento||0),W=Math.max(0,+a.largura||0),rw=Math.max(42,L*escala),rh=Math.max(36,W*escala),ry=Y0+28;
      Bx(pp,xRoom,ry,rw,rh,{bc:GR,bw:1.1,fill:LG});
      T(pp,a.nome.slice(0,32),xRoom+5,ry+rh-12,7,FB,INK);T(pp,`${fmt(L,1)} × ${fmt(W,1)} m · H ${fmt(+a.altura||0,1)} m`,xRoom+5,ry+rh-23,6,F,MUT);
      const oc=R.out.filter(o=>o.c.ambiente===a.id),lights=oc.filter(o=>o.c.tipo==="ilum"),tugs=oc.filter(o=>o.c.tipo==="tug");
      const nLight=Math.max(0,...lights.map(o=>+o.c.qtd||0)),nTug=Math.max(0,...tugs.map(o=>+o.c.qtd||0));
      const cols=Math.max(1,Math.ceil(Math.sqrt(nLight*Math.max(L,0.1)/Math.max(W,0.1)))),rows=Math.ceil(nLight/cols);
      for(let j=0;j<nLight;j++){const cx=xRoom+rw*(j%cols+0.5)/cols,cy=ry+rh*(Math.floor(j/cols)+0.5)/Math.max(rows,1);Ci(pp,cx,cy,4);Ln(pp,cx-3,cy-3,cx+3,cy+3,0.6);Ln(pp,cx-3,cy+3,cx+3,cy-3,0.6);}
      for(let j=0;j<nTug;j++){const cx=xRoom+rw*(j+1)/(nTug+1);Bx(pp,cx-3,ry+2,6,6,{fill:rgb(1,1,1),bc:INK,bw:0.8});}
      const canaisAmb=[...new Set(oc.flatMap(o=>o.canais))].join(", ");if(canaisAmb)T(pp,`Canaleta: ${canaisAmb}`,xRoom+5,ry+rh+7,6.5,FB,ACC);
      const rota=canaletas.find(g=>oc.some(o=>o.canais.includes(g.k)));if(rota){const y=yTronco-canaletas.indexOf(rota)*19;Ln(pp,xRoom+rw/2,y,xRoom+rw/2,ry+rh,0.7,ACC,[3,2]);}
      T(pp,`TUG ${nTug} · luminárias ${nLight}`,xRoom+5,ry-10,6.5,FB,MUT);xRoom+=rw+3;
    });
    if(!S.ambientes.length)T(pp,"Cadastre ambientes e dimensões na etapa Desenhos para distribuir os pontos em escala.",X0+20,Y0+BH/2,9,FB,RED);
    // legenda
    const lx=X0+BW+30;let ly=h-110;T(pp,"Legenda",lx,ly,10,FB);ly-=20;
    [["ilum","Ponto de iluminação"],["tug","Tomada de uso geral"],["tue","Tomada de uso específico"],["motor","Motor"]].forEach(([t,l])=>{if(t==="ilum"){Ci(pp,lx+6,ly+3,6);Ln(pp,lx+2,ly-1,lx+10,ly+7,0.8);Ln(pp,lx+2,ly+7,lx+10,ly-1,0.8);}else if(t==="motor"){Ci(pp,lx+6,ly+3,7);TC(pp,"M",lx+6,ly,7,FB);}else Bx(pp,lx+1,ly-2,10,10,{fill:t==="tue"?INK:rgb(1,1,1)});T(pp,l,lx+22,ly,8);ly-=20;});
    Ln(pp,lx,ly+3,lx+14,ly+3,3,ACC);T(pp,"Eletrocalha / canaleta",lx+22,ly,8);ly-=18;Ln(pp,lx,ly+3,lx+14,ly+3,0.8,INK,[2,2]);T(pp,"Baixada em eletroduto",lx+22,ly,8);ly-=18;T(pp,"Número vermelho = circuito",lx,ly,8,FB,RED);ly-=26;
    T(pp,"Circuitos",lx,ly,10,FB);ly-=16;R.out.forEach(o=>{if(ly<150)return;T(pp,`${o.i+1} — ${o.c.nome}`.slice(0,48),lx,ly,7);ly-=11;});
    T(pp,"Croqui proporcional aos ambientes informados; confirmar cotas, posições e critérios no projeto executivo.",60,90,9,FB,RED);
    carimbo(pp,w,"Planta baixa esquemática","PB-01");
  }
  function simLuminotecnico(){
    const {pp,w,h}=simPage(A3L,"Projeto luminotécnico — distribuição por ambiente");
    const somaL=S.ambientes.reduce((n,a)=>n+Math.max(0,+a.comprimento||0),0),maxW=Math.max(0,...S.ambientes.map(a=>+a.largura||0));
    const escala=Math.min((w-100)/Math.max(somaL,1),(h-300)/Math.max(maxW,1));let x=50;
    T(pp,"Método dos lúmens, N = E × A / (phi × FU × FM), e espaçamento máximo S/Hm por ambiente. Iluminâncias de referência: NBR ISO/CIE 8995-1.",50,h-94,9,FB);
    S.ambientes.forEach(a=>{
      const c=calcularAmbiente(a),rw=Math.max(45,(+a.comprimento||0)*escala),rh=Math.max(38,(+a.largura||0)*escala),y=220;
      Bx(pp,x,y,rw,rh,{bc:GR,bw:1.2,fill:LG});T(pp,a.nome.slice(0,38),x+5,y+rh-14,7,FB);
      T(pp,`${fmt(+a.comprimento||0,1)} × ${fmt(+a.largura||0,1)} m · H ${fmt(+a.altura||0,1)} m`,x+5,y+rh-25,6,F,MUT);
      const cols=Math.max(1,Math.ceil(Math.sqrt(c.luminarias*Math.max(+a.comprimento||0,0.1)/Math.max(+a.largura||0,0.1)))),rows=Math.ceil(c.luminarias/cols);
      for(let i=0;i<c.luminarias;i++){const cx=x+rw*(i%cols+0.5)/cols,cy=y+rh*(Math.floor(i/cols)+0.5)/Math.max(rows,1);Ci(pp,cx,cy,5);Ln(pp,cx-3,cy-3,cx+3,cy+3,0.7);Ln(pp,cx-3,cy+3,cx+3,cy-3,0.7);}
      T(pp,`${a.lux} lx exig. · Em ${fmt0(c.em)} lx · ${c.luminarias} lum. · ${fmt0(c.potencia)} W`,x,y-14,7,FB,c.em>=(+a.lux||0)-0.5?ACC:RED);
      T(pp,`${fmt0(c.area)} m² · K ${fmt(c.k,2)} · FU ${fmt(+a.uf,2)} · FM ${fmt(+a.mf,2)} · ${fmt(a.lm,0)} lm / peça · ${fmt(c.dens,1)} W/m²`,x,y-25,6.5,F,MUT);
      x+=rw+5;
    });
    if(!S.ambientes.length)T(pp,"Sem ambientes cadastrados: incluir dimensões e parâmetros para dimensionar luminárias.",50,h-130,10,FB,RED);
    T(pp,"Estudo preliminar: confirmar iluminância, refletâncias, luminária e uniformidade conforme uso e norma aplicável.",50,80,8,FB,RED);
    carimbo(pp,w,"Luminotécnico","LUM-01");
  }
  function simSpda(){
    const sp=R.spda,{pp,w,h}=simPage(A3L,sp.ok?`SPDA — pré-dimensionamento NBR 5419-3, NP ${sp.np} (método das malhas)`:"Análise de risco e projeto de SPDA — dados pendentes");
    // planta: contorno da estrutura, malha de captação, descidas e anel de aterramento
    const X0=60,Y0=150,AW=560,AH=h-300;
    if(sp.ok){const e=Math.min(AW/(sp.L+4),AH/(sp.W+4)),ox=X0+(AW-sp.L*e)/2,oy=Y0+(AH-sp.W*e)/2,bw=sp.L*e,bh=sp.W*e;
      const MAR=rgb(0.55,0.35,0.15),ax=ox-e,ay=oy-e,aw=bw+2*e,ah=bh+2*e; // anel a ~1 m
      [[ax,ay,ax+aw,ay],[ax+aw,ay,ax+aw,ay+ah],[ax+aw,ay+ah,ax,ay+ah],[ax,ay+ah,ax,ay]].forEach(([x1,y1,x2,y2])=>Ln(pp,x1,y1,x2,y2,1.4,MAR,[6,3]));
      Bx(pp,ox,oy,bw,bh,{bw:2,fill:LG});
      for(let k=0;k<sp.linhasL;k++){const yy=oy+bh*k/Math.max(sp.linhasL-1,1);Ln(pp,ox,yy,ox+bw,yy,1.1,ACC);}
      for(let k=0;k<sp.linhasW;k++){const xx=ox+bw*k/Math.max(sp.linhasW-1,1);Ln(pp,xx,oy,xx,oy+bh,1.1,ACC);}
      // descidas distribuídas pelo perímetro, começando pelos cantos
      const per=2*(bw+bh),pts=[];for(let k=0;k<sp.nDesc;k++){let d=per*k/sp.nDesc;if(d<bw)pts.push([ox+d,oy]);else if((d-=bw)<bh)pts.push([ox+bw,oy+d]);else if((d-=bh)<bw)pts.push([ox+bw-d,oy+bh]);else pts.push([ox,oy+bh-(d-bw)]);}
      pts.forEach(([x,y],k)=>{Ci(pp,x,y,5,{fill:RED,bc:RED});T(pp,`D${k+1}`,x+6,y+5,6.5,FB,RED);});
      T(pp,`${fmt(sp.L,1)} m`,ox+bw/2-12,oy-e-14,8,FB);T(pp,`${fmt(sp.W,1)} m`,ox+bw+e+6,oy+bh/2,8,FB);
      T(pp,`Malha ${sp.g.m} × ${sp.g.m} m (cobre 35 mm²)`,X0,Y0-22,8,FB,ACC);T(pp,`${sp.nDesc} descidas (D) · anel tracejado: cobre nu 50 mm² a ~1 m da fundação`,X0,Y0-34,8,FB,rgb(0.55,0.35,0.15));}
    else T(pp,"Informe comprimento, largura e altura da estrutura na etapa 08 para desenhar a malha.",X0,Y0+AH/2,10,FB,RED);
    // resultados
    const xr=680;let y=h-100;T(pp,"Resultados",xr,y,11,FB);y-=18;
    const rs=sp.ok?[["Área de exposição AD (NBR 5419-2, A.2)",`${fmt0(sp.Ad)} m²`],["NG / CD",sp.ng?`${fmt(sp.ng,1)} /km²/ano · ${fmt(sp.cd,2)}`:"NG A INFORMAR"],["Eventos perigosos ND = NG·AD·CD·10^-6",sp.ng?`${fmt(sp.Nd,4)} /ano`:"—"],["Nível de proteção adotado",`NP ${sp.np} (confirmar pela análise de risco)`],["Esfera rolante / malha (Tab. 2)",`${sp.g.r} m / ${sp.g.m} × ${sp.g.m} m`],["Descidas (Tab. 4)",`${sp.nDesc} un., espaçamento médio ${sp.g.d} m`],["Condutores captação + descidas",`${fmt0(sp.captacao+sp.descidas)} m de Cu 35 mm²`],["Anel de aterramento (arranjo B)",`${fmt0(sp.anel)} m de Cu nu 50 mm² · re ${fmt(sp.re,1)} m`],["Comprimento mínimo l1 (Fig. 3)",sp.l1!=null?`${sp.l1} m — ${sp.anelOk?"re >= l1, atende":"re < l1: acrescentar eletrodos"}`:`depende de rho${sp.rho?` = ${fmt0(sp.rho)} ohm·m`:" (não informada)"}`]]:[];
    rs.forEach(([k,v])=>{T(pp,k,xr,y,7.5,F,MUT);T(pp,v,xr+190,y,7.5,FB,/INFORMAR|acrescentar/.test(v)?RED:INK);Ln(pp,xr,y-4,w-30,y-4,0.3,LN);y-=15;});
    y-=10;T(pp,"Análise de risco completa (NBR 5419-2) — dados ainda necessários",xr,y,9,FB,RED);y-=16;
    const pend=[
      [!!sp.ng,"Densidade de descargas NG do local (mapa NBR 5419-2 ou INPE)."],
      [sp.ok,"Dimensões totais e altura máxima da estrutura."],
      [true,"Fator de localização CD (entorno)."],
      [false,"Uso e ocupação: número de pessoas, tempo de permanência, animais."],
      [false,"Risco de incêndio/explosão (grãos, pó combustível), perdas especiais."],
      [false,"Linhas de energia e telecomunicações: tipo, comprimento, blindagem."],
      [!!sp.rho,"Resistividade elétrica do solo (Wenner) para o eletrodo."],
      [false,"Medidas existentes e cálculo de R1 <= 10^-5 com as componentes RA, RB, RC, RM, RU, RV, RW, RZ."]];
    pend.forEach(([ok,t])=>{T(pp,ok?"INFORMADO":"PENDENTE",xr,y,7,FB,ok?ACC:RED);y-=TW(pp,t,xr+62,y,w-xr-100,7.5)*9.5+4;});
    T(pp,"Pré-dimensionamento: o nível de proteção e as medidas devem ser confirmados pela análise de risco e pelo projeto executivo do SPDA (NBR 5419-2/3/4).",54,105,8,FB,RED);
    carimbo(pp,w,sp.ok?`SPDA — NP ${sp.np}`:"SPDA — pendente","SPDA-01");
  }
  // ---- Unifilar
  const brkSym=(pp,x,y)=>{Bx(pp,x-6,y-22,12,22,{fill:rgb(1,1,1)});Ln(pp,x-6,y-22,x+6,y,0.8);};
  const carga=(pp,x,y,o)=>{const t=o.c.tipo;if(t==="motor"){Ci(pp,x,y,10,{fill:rgb(1,1,1)});TC(pp,"M",x,y-3,9,FB);}else if(t==="ilum"){Ci(pp,x,y,8);Ln(pp,x-6,y-6,x+6,y+6,0.8);Ln(pp,x-6,y+6,x+6,y-6,0.8);}else{Bx(pp,x-8,y-8,16,16,{fill:t==="tue"?INK:rgb(1,1,1)});}};
  function simUnifilar(){
    // geral
    let {pp,w,h}=simPage(A3L,"Diagrama unifilar geral");
    const y0=h-150,f=S.forn,e=R.ent;
    Ci(pp,80,y0,14);TC(pp,"~",80,y0-4,12,FB);TC(pp,`Rede ${id.distribuidora||""}`,80,y0-30,8,FB);TC(pp,R.sys.nome,80,y0-41,7,F,MUT);
    Ln(pp,94,y0,170,y0,1.4);Bx(pp,170,y0-14,40,28,{fill:rgb(1,1,1)});TC(pp,"kWh",190,y0-4,9,FB);TC(pp,"Medição",190,y0-28,7,F,MUT);
    Ln(pp,210,y0,260,y0,1.4);Bx(pp,260,y0-12,34,24,{fill:rgb(1,1,1)});Ln(pp,260,y0-12,294,y0+12,0.8);TC(pp,e.inom?`DG ${e.polos}P ${e.inom} A`:"DG",277,y0+18,8,FB);
    Ln(pp,294,y0,400,y0,2);T(pp,e.s?`${e.txt} mm² — ${e.ed.nome}`:"—",300,y0+6,7.5);T(pp,`${f.Lent} m`,300,y0-12,7,F,MUT);
    const bx=400,by1=y0+40,by2=Math.max(140,y0-90-S.quadros.length*80);pp.drawRectangle({x:bx-3,y:by2,width:6,height:by1-by2,color:INK});TC(pp,"QGBT",bx,by1+8,10,FB);
    // DPS
    if(R.dps.incl){const yd=y0-50;Ln(pp,bx,yd,bx-80,yd,1);Bx(pp,bx-110,yd-12,30,24,{fill:rgb(1,1,1)});TC(pp,"DPS",bx-95,yd-4,8,FB);Ln(pp,bx-95,yd-12,bx-95,yd-34,1);[0,1,2].forEach(k=>Ln(pp,bx-103+k*2,yd-34-k*4,bx-87-k*2,yd-34-k*4,1));T(pp,`${R.dps.itens.map(it=>it.n+"x "+it.mod).join(" + ")}; Up <= ${fmt(R.dps.up,1)} kV`,bx-170,yd-50,7);}
    // alimentadores
    // alimentadores em árvore: os do QGBT saem do barramento; os de sub-quadros saem do quadro de origem
    const caixa=new Map();
    quadrosEmArvore().slice(1).map(qq=>R.quadros.find(x=>x.q===qq)).forEach((q,i)=>{const y=y0-90-i*80;
      const org=caixa.get(paiDe(q.q)),sx=org?org.x+45:bx,bxq=Math.min(w-110,sx+300);caixa.set(q.q,{x:bxq,y});
      if(org)Ln(pp,sx,org.y-16,sx,y,1.2);Ln(pp,sx,y,sx+60,y,1.2);
      if(q.f){brkSym(pp,sx+72,y+11);T(pp,`${q.f.polos}P ${q.f.inom||"—"} A`,sx+60,y+16,7.5,FB);}
      Ln(pp,sx+78,y,bxq,y,1.4);
      TW(pp,q.f&&q.f.s?`${q.f.txt} mm² — ${q.f.ed.nome} — ${q.pai} -> ${q.q.nome}: ${fmt(+q.q.L||0,0)} m`:(q.f?"sem solução":"L = 0"),sx+100,y+5,bxq-sx-106,7);
      Bx(pp,bxq,y-16,90,32,{bw:1.6,fill:LG});TC(pp,q.q.nome,bxq+45,y-4,10,FB);TC(pp,`${fmt(q.S,2)} kVA${q.filhos.length?" (c/ sub)":""}`,bxq+45,y-26,7,F,MUT);});
    const q0=R.quadros[0];if(q0&&q0.cs.length){const y=by2+10;T(pp,`${q0.cs.length} circuito(s) alimentados diretamente pelo ${q0.q.nome}: ver prancha do quadro.`,bx+20,y,8,F,MUT);}
    T(pp,"Aterramento: "+ATERR[f.aterr],60,70,8);carimbo(pp,w,"Unifilar geral","UNI-01");
    // por quadro
    let pr=2;
    R.quadros.forEach(q=>{if(!q.cs.length)return;const per=14;for(let k=0;k<q.cs.length;k+=per){const cs=q.cs.slice(k,k+per);
      ({pp,w,h}=simPage(A3L,`Diagrama unifilar — ${q.q.nome}${q.cs.length>per?` (${k/per+1})`:""}`));
      const yb=h-130,x1=90,x2=w-90,sp=(x2-x1)/cs.length;
      pp.drawRectangle({x:x1-10,y:yb-3,width:x2-x1+20,height:6,color:INK});T(pp,`Barramento ${q.q.nome} — ${R.sys.nome}${q.f&&q.f.s?` — alimentador ${q.f.txt} mm², ${q.f.polos}P ${q.f.inom} A`:""}`,x1-10,yb+12,9,FB);
      cs.forEach((o,j)=>{const x=x1+sp*j+sp/2;Ln(pp,x,yb,x,yb-20,1);brkSym(pp,x,yb-20);let y=yb-42;
        if(o.dr){Ln(pp,x,y,x,y-8,1);Bx(pp,x-9,y-26,18,18,{fill:rgb(1,1,1)});TC(pp,"DR",x,y-20,6.5,FB);y-=26;}
        if(o.mp){Ln(pp,x,y,x,y-8,1);Bx(pp,x-9,y-26,18,18,{fill:LG});TC(pp,o.partida==="inv"?"INV":o.partida==="soft"?"SS":o.partida==="yd"?"Y-D":"K",x,y-20,6,FB);y-=26;}
        Ln(pp,x,y,x,yb-190,1);carga(pp,x,yb-200,o);
        let ty=yb-225;const mw=sp-8;
        T(pp,`C${o.i+1}`,x-mw/2,ty,8,FB,RED);ty-=11;
        ty-=TW(pp,o.c.nome,x-mw/2,ty,mw,6.5,FB)*8+2;
        ty-=TW(pp,`${fmt(o.P/1000,2)} kW · ${o.fases} · Ib ${fmt(o.ib,1)} A`,x-mw/2,ty,mw,6)*7.5+2;
        ty-=TW(pp,o.s?`F/N/PE ${sec(o.s)}/${o.sn?sec(o.sn):"-"}/${o.spe?sec(o.spe):"PEN"} mm² · ${o.ed.nome}`:"sem solução",x-mw/2,ty,mw,6)*7.5+2;
        ty-=TW(pp,protTxt(o),x-mw/2,ty,mw,6,F,ACC)*7.5+2;
        TW(pp,o.s?`dV ${fmt(o.dvTot,2)} %`:"",x-mw/2,ty,mw,6,F,MUT);});
      T(pp,"Diagrama gerado dos cálculos: conferir numeração, bornes e identificação dos dispositivos.",60,70,8,FB,RED);carimbo(pp,w,`Unifilar ${q.q.nome}`,`UNI-${String(pr++).padStart(2,"0")}`);}});
  }
  // ---- Multifilar / força e comando
  function simMultifilar(){
    const ms=R.out.filter(o=>o.mp);
    if(!ms.length){const {pp,w}=simPage(A4L,"Diagramas multifilares");T(pp,"Não há motores no projeto: diagramas de força e comando não se aplicam.",60,440,11);carimbo(pp,w,"Multifilar","MUL-01");return;}
    ms.forEach((o,k)=>{const {pp,w,h}=simPage(A4L,`Força e comando — C${o.i+1} ${o.c.nome}`);const m=o.mp;
      const xs=[90,120,150].slice(0,o.L.nf),top=h-100;T(pp,"FORÇA",60,top+6,9,FB);
      xs.forEach((x,i)=>{TC(pp,["L1","L2","L3"][i],x,top-2,8,FB);Ln(pp,x,top-8,x,120,1);});
      const x0=xs[0]-14,wd=xs[xs.length-1]-xs[0]+28;
      const blk=(y,lab,sub,fill=rgb(1,1,1))=>{Bx(pp,x0,y,wd,26,{fill,bw:1.2});TC(pp,lab,x0+wd/2,y+10,8,FB);if(sub)T(pp,sub,x0+wd+10,y+9,7.5);};
      let y=top-60;
      blk(y,o.prot==="fus"?"F1-F3":o.prot==="djm"?"Q1":"Q1",o.prot==="fus"?m.fusTxt:o.prot==="djm"?m.djmTxt:`Disjuntor ${o.L.polos}P ${o.inom} A curva ${o.curva}`);y-=50;
      if(o.dr){blk(y,"DR",`IDR ${o.dr.polos}P ${o.dr.In} A ${o.dr.idn} mA tipo ${o.dr.tipo}`);y-=50;}
      if(o.partida==="direta"||o.partida==="yd"){blk(y,"K1",`K1 ${m.cont[0].std} A AC-3 (linha)`,LG);y-=50;}
      if(m.rele&&m.rele.f){blk(y,"F7",m.releTxt);y-=50;}
      if(o.partida==="soft"){blk(y,"SOFT",`Soft-starter ${m.soft.std} A`,LG);y-=50;}
      if(o.partida==="inv"){blk(y,"INV",`Inversor ${m.inv.std} A`,LG);y-=50;}
      const mx=xs[Math.floor(xs.length/2)];Ci(pp,mx,95,22,{fill:rgb(1,1,1),bw:1.4});TC(pp,"M",mx,97,11,FB);TC(pp,o.L.nf===3?"3~":"1~",mx,84,8);
      T(pp,`${fmt(m.cv,m.cv%1?1:0)} cv / ${fmt(m.kW,2)} kW · ${o.vref} V · In ${fmt(m.In1,1)} A`,mx+30,92,8);
      if(o.partida==="yd"){Bx(pp,300,y+10,70,24,{fill:LG});TC(pp,`K2 ${m.cont[1].std} A`,335,y+19,7.5,FB);Bx(pp,300,y-30,70,24,{fill:LG});TC(pp,`K3 ${m.cont[2].std} A`,335,y-21,7.5,FB);
        Ln(pp,x0+wd,y+22,300,y+22,0.8,INK,[3,2]);Ln(pp,370,y+22,400,y+22,0.8);T(pp,"K2: triângulo (W2-U2-V2)",405,y+19,7.5);Ln(pp,370,y-18,400,y-18,0.8);T(pp,"K3: estrela (fecha U2-V2-W2)",405,y-21,7.5);}
      // comando
      const cx=w-300;T(pp,`COMANDO — ${S.par.bobina}`,cx-40,top+6,9,FB);Ln(pp,cx,top-8,cx,110,1);TC(pp,"L",cx,top-2,8,FB);TC(pp,"N",cx,100,8,FB);
      const el=(y,lab,fill=rgb(1,1,1))=>{Bx(pp,cx-45,y,90,18,{fill,bw:1});TC(pp,lab,cx,y+6,7,FB);};
      let yc=top-50;el(yc,"F0 fusível cmd.");yc-=34;
      if(o.partida==="soft"||o.partida==="inv"){el(yc,"S0 emergência NF");yc-=34;el(yc,"S1 liga → DI1");yc-=34;el(yc,o.partida==="inv"?"Inversor (DI)":"Soft (DI)",LG);
        TW(pp,"Liga/desliga e emergência pelas entradas digitais do equipamento; parametrizar corrente nominal, rampas e proteções conforme o manual do fabricante.",cx+60,top-220,180,7.5);}
      else{if(m.rele&&m.rele.f){el(yc,"F7 95-96 NF");yc-=34;}el(yc,"S0 desliga NF");yc-=34;el(yc,"S1 liga NA");Bx(pp,cx+60,yc,70,18);TC(pp,"K1 13-14 selo",cx+95,yc+6,7,FB);Ln(pp,cx+45,yc+9,cx+60,yc+9,0.8);yc-=34;
        if(o.partida==="yd"){el(yc,"KT temporizador",LG);yc-=34;el(yc,"K1 · K2 · K3 bobinas",LG);TW(pp,"Sequência: S1 energiza K1 e K3 (estrela) e KT; após o tempo, KT desliga K3 e liga K2 (triângulo). K2 e K3 com intertravamento elétrico (contatos NF).",cx+60,top-300,180,7.5);}
        else el(yc,"K1 bobina A1-A2",LG);}
      T(pp,"Diagrama esquemático gerado dos cálculos: conferir bornes, numeração e intertravamentos.",60,40,8,FB,RED);carimbo(pp,w,`Força e comando C${o.i+1}`,`MUL-${String(k+1).padStart(2,"0")}`);});
  }
  // ---- Detalhes
  function simDetalhes(){
    const {pp,w,h}=simPage(A3L,"Detalhes construtivos típicos");const e=R.ent;
    const fr=(x,t)=>{Bx(pp,x,120,340,h-230,{bc:GR});T(pp,t,x+10,h-128,10,FB);};
    // 1 padrão de entrada
    fr(40,"1 — Padrão de entrada e medição");Ln(pp,120,160,120,h-150,5,GR);T(pp,"Poste / pontalete",130,h-160,7.5,F,MUT);
    Bx(pp,160,420,110,140,{bw:1.4,fill:LG});TC(pp,"Caixa de medição",215,540,8,FB);Bx(pp,190,470,50,40,{fill:rgb(1,1,1)});TC(pp,"kWh",215,486,8,FB);Bx(pp,195,430,40,26,{fill:rgb(1,1,1)});TC(pp,e.inom?`DG ${e.inom} A`:"DG",215,440,7,FB);
    Ln(pp,215,420,215,200,2);T(pp,`Eletroduto de descida ${e.ed?e.ed.nome:""}`,222,320,7.5);Ln(pp,60,200,360,200,1.2,GR);T(pp,"Nível do solo",64,188,7,F,MUT);
    Ln(pp,300,200,300,150,3,RED);T(pp,"Haste de aterramento",306,170,7.5,FB,RED);redU(pp,306,170,80);Ln(pp,215,260,300,200,1,ACC);T(pp,`Condutor de aterramento ${e.spe?sec(e.spe):(e.sn?sec(e.sn):"—")} mm² Cu`,230,238,7);
    T(pp,"Altura da caixa: 1,50 m (confirmar no RIC)",60,140,7.5,FB,RED);redU(pp,60,140,170);
    // 2 baixada
    const x2=410;fr(x2,"2 — Eletrocalha e baixada em eletroduto");const g=Object.values(R.cans)[0];
    Bx(pp,x2+40,h-230,260,26,{fill:LG,bw:1.4});T(pp,`Eletrocalha ${g?g.dim:"—"} com tampa, aço galvanizado`,x2+44,h-240,7.5);
    Ln(pp,x2+170,h-230,x2+170,330,2);T(pp,`Eletroduto ${(R.out.find(o=>o.s)||{ed:{nome:"—"}}).ed.nome}`,x2+178,500,7.5);
    Bx(pp,x2+150,300,40,30,{fill:rgb(1,1,1)});TC(pp,"Caixa 4x2",x2+170,285,7.5);Ln(pp,x2+40,200,x2+300,200,1.2,GR);
    Ln(pp,x2+220,200,x2+220,300,0.6,RED,[2,2]);T(pp,"1,10 m (tomada) — confirmar",x2+224,250,7.5,FB,RED);
    T(pp,"Suportes da eletrocalha a cada 1,5 m (máx.)",x2+40,h-270,7.5);T(pp,"Aterramento contínuo da eletrocalha ao BEP",x2+40,h-282,7.5);
    // 3 aterramento
    const x3=780;fr(x3,"3 — Aterramento e BEP");Ln(pp,x3+20,420,x3+320,420,1.2,GR);T(pp,"Nível do solo",x3+24,408,7,F,MUT);
    [0,1,2].forEach(k=>{const x=x3+70+k*100;Ln(pp,x,420,x,300,4,GR);Ci(pp,x,420,6,{fill:LG});});Ln(pp,x3+70,410,x3+270,410,1.4,ACC);
    T(pp,"3 hastes cobreadas 5/8\" x 2,4 m, espaçamento >= 2,4 m",x3+30,280,7.5,FB,RED);redU(pp,x3+30,280,240);
    Bx(pp,x3+120,560,100,26,{fill:LG});TC(pp,"BEP",x3+170,570,9,FB);Ln(pp,x3+170,560,x3+170,420,1.4,ACC);
    T(pp,`Esquema ${S.forn.aterr}`,x3+30,620,8,FB);T(pp,"Ligar ao BEP: PE/PEN do QGBT, massas, eletrocalhas,",x3+30,605,7.5);T(pp,"estruturas metálicas, silos, secador e SPDA.",x3+30,594,7.5);
    T(pp,"Resistência de aterramento e número de hastes a definir por medição/projeto.",x3+30,250,7.5,FB,RED);
    T(pp,"Detalhes típicos: dimensões e alturas supostas; ajustar ao RIC da distribuidora e ao projeto executivo.",60,90,9,FB,RED);
    carimbo(pp,w,"Detalhes construtivos","DET-01");
  }
  // ---- Convenções
  function simConv(){
    const {pp,w,h}=simPage(A4,"Convenções e simbologia");let y=h-100;
    const it=[["QD","Quadro de distribuição",(x,y)=>pp.drawRectangle({x:x-8,y:y-6,width:16,height:14,color:INK})],["ilum","Ponto de iluminação",(x,y)=>{Ci(pp,x,y,6);Ln(pp,x-4,y-4,x+4,y+4,0.8);Ln(pp,x-4,y+4,x+4,y-4,0.8);}],["tug","Tomada de uso geral",(x,y)=>Bx(pp,x-5,y-5,10,10)],["tue","Tomada de uso específico",(x,y)=>Bx(pp,x-5,y-5,10,10,{fill:INK})],["M","Motor",(x,y)=>{Ci(pp,x,y,8);TC(pp,"M",x,y-3,8,FB);}],
      ["dj","Disjuntor termomagnético",(x,y)=>{Bx(pp,x-5,y-9,10,18,{fill:rgb(1,1,1)});Ln(pp,x-5,y-9,x+5,y+9,0.8);}],["dr","Interruptor diferencial-residual (DR)",(x,y)=>{Bx(pp,x-9,y-9,18,18);TC(pp,"DR",x,y-3,6.5,FB);}],["dps","Dispositivo de proteção contra surtos (DPS)",(x,y)=>{Bx(pp,x-9,y-7,18,14);TC(pp,"DPS",x,y-3,5.5,FB);}],
      ["k","Contator / chave de partida",(x,y)=>{Bx(pp,x-9,y-7,18,14,{fill:LG});TC(pp,"K",x,y-3,7,FB);}],["f7","Relé térmico de sobrecarga",(x,y)=>{Bx(pp,x-9,y-7,18,14);TC(pp,"F7",x,y-3,6.5,FB);}],["kwh","Medidor de energia",(x,y)=>{Bx(pp,x-10,y-7,20,14);TC(pp,"kWh",x,y-3,5.5,FB);}],
      ["can","Eletrocalha / canaleta",(x,y)=>Ln(pp,x-12,y,x+12,y,3,ACC)],["ed","Eletroduto (baixada)",(x,y)=>Ln(pp,x-12,y,x+12,y,0.8,INK,[2,2])],["gnd","Aterramento",(x,y)=>{Ln(pp,x,y+8,x,y,1);[0,1,2].forEach(k=>Ln(pp,x-8+k*3,y-k*3,x+8-k*3,y-k*3,1));}]];
    it.forEach(([,l,fn])=>{fn(80,y+3);T(pp,l,110,y,10);Ln(pp,50,y-10,w-50,y-10,0.3,LN);y-=30;});
    T(pp,"Simbologia simplificada inspirada na NBR 5444: substituir pela legenda padronizada do escritório.",50,60,8.5,FB,RED);
  }
  // ===== SEPARADORES (fluxo da Aula 2, slide 7) =====
  const SBG=rgb(0.059,0.239,0.18),SAMB=rgb(0.949,0.698,0.2),SCR=rgb(0.957,0.937,0.886),SSOFT=rgb(0.624,0.769,0.702),SDIM=rgb(0.114,0.353,0.271);
  const FLUXO=["ART","Solicitação","Mem. descr.","Mem. cálc.","Plantas",...(S.projetos.luminotecnico?["Luminot."]:[]),...(S.projetos.spda?["SPDA"]:[]),"Quadros","Unifilar","Multifilar","Detalhes","Especif.","Materiais",...(S.orc.pdf?["Orçamento"]:[]),...(S.anexos.outros.length?["Outros"]:[])];
  const FLUXO_TITULO={"Anotação de Responsabilidade Técnica":"ART","Solicitação à distribuidora":"Solicitação","Memorial descritivo":"Mem. descr.","Memorial de cálculo":"Mem. cálc.","Plantas":"Plantas","Projeto luminotécnico":"Luminot.","Análise de risco e projeto de SPDA":"SPDA","Quadros de distribuição de cargas":"Quadros","Diagrama unifilar":"Unifilar","Diagramas multifilares":"Multifilar","Detalhes construtivos e convenções":"Detalhes","Especificações técnicas":"Especif.","Lista de materiais":"Materiais","Orçamento":"Orçamento","Outros anexos":"Outros"};
  let nSep=0;const totSep=FLUXO.length;
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
    const fluxoAtivo=FLUXO.indexOf(FLUXO_TITULO[titulo]);FLUXO.forEach((l,k)=>{const cx=x+k*gw;page.drawRectangle({x:cx,y:fy+10,width:gw-3,height:6,color:k===fluxoAtivo?SAMB:(k<fluxoAtivo?SSOFT:SDIM)});page.drawText(pt(l),{x:cx,y:fy-2,size:6.3,font:k===fluxoAtivo?FB:F,color:k===fluxoAtivo?SCR:SSOFT});});
    page.drawText(pt(`${S.id.obra||"Projeto elétrico"}  ·  ${S.id.cliente||""}`).slice(0,100),{x,y:40,size:8,font:F,color:SSOFT});
  }
  const arqs=k=>S.anexos[k].length?S.anexos[k].map(f=>"Arquivo anexado: "+f.name):[simOn?"Documento SIMULADO gerado com os dados do projeto — corrigir e substituir":"Pendente: nenhum arquivo anexado"];

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
  if(!(await anexar("art","ART — Anotação de Responsabilidade Técnica"))){if(simOn)simART();else pendencia("ART — Anotação de Responsabilidade Técnica","Anexe a ART de projeto registrada no CREA na etapa 10.");};

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
  separador("Memorial descritivo","Item H","Descreve o projeto e justifica as soluções adotadas: identificação, normas, fornecimento, distribuição, condutores, proteção e aterramento.",Object.values(memoT()),2);
  h1("Memorial descritivo");
  Object.entries(memoT()).forEach(([k,t])=>{h2(t);text(memoText(k),{size:10,gap:6});});

  // 4 · MEMORIAL DE CÁLCULO
  separador("Memorial de cálculo","Item I","Cálculos que sustentam o projeto: previsão de cargas, demanda, dimensionamento de condutores, condutos e dispositivos de proteção.",[`${R.out.length} circuitos em ${S.quadros.length} quadro(s)`,`Demanda ${fmt(R.dem,2)} kW · ${fmt(R.demS,2)} kVA · FP ${fmt(R.fpG,2)}`,`Métodos de referência: distribuição ${p.metDist}, baixadas ${p.metBaix}`,`Alimentador geral: ${R.ent.s?R.ent.txt+" mm², disjuntor "+R.ent.polos+"P "+R.ent.inom+" A":"sem solução"}`,`${Object.keys(R.cans).length} canaleta(s) de distribuição`],3);
  h1("Memorial de cálculo");
  h2("Critérios adotados");
  kv([["Norma","ABNT NBR 5410:2004 — condutor de cobre, isolação PVC 70 °C (Tab. 36 e 38)"],["Alimentação",sys.nome],["Método — distribuição",METODOS[p.metDist]],["Agrupamento na distribuição",p.metDist==="D"?`Tab. 45 — eletrodutos enterrados, distância ${T45[p.espEnt].t}`:`Tab. 42 — ${T42[p.agrDist].t}`],["Método — baixadas",METODOS[p.metBaix]],["Temperatura ambiente / solo",`${p.temp} °C (FCT ${Math.min(fct(p.metDist),fct(p.metBaix)).toFixed(2)}) / ${p.tempSolo} °C`],["Queda de tensão admissível",`terminais ${fmt(+p.dvTerm,1)} % · total ${fmt(+p.dvTotal,1)} % · entrada ${fmt(+p.dvEnt,1)} %`],["Resistividade elétrica do cobre",`${p.rho} ohm·mm²/m`],["Resistividade térmica do solo",`${p.rhoSolo} K·m/W · FCRS ${Math.min(fcrho(p.metDist),fcrho(p.metBaix)).toFixed(2)} (NBR 5410 Tab. 41; IEC 60364-5-52 Tab. B.52.16 abaixo de 1 K·m/W)`],["Resistividade elétrica do solo",`${S.forn.rhoEletrica||"não informada"} ohm·m`],["Curto-circuito presumido",R.cc?`${fmt(+p.icc,1)} kA · menor condutor ${sec(R.cc.s)} mm²: k²S² = ${fmt0(R.cc.k2s2)} A²s (k = 115) — I²t do disjuntor deve ser menor (5.3.5.5.2)`:`${fmt(+p.icc,1)} kA`],["Reserva",`${p.reserva} %`]]);
  h2("Equações");
  text("S = P / FP;  I = S / V (F+N e 2F);  I = S / (raiz(3) · Vff) (3F).  Motor: P = cv × 735,5 / rend.;  Ib = In × FS (6.5.1.3.1); partida: dV com Ip de um motor e cos phi = 0,3 <= "+fmt(+p.dvPartida,0)+" % (6.5.1.3.3), Ip/In = "+fmt(+p.ipin,1)+".",{size:9});
  text("Iz = I(Tab. 36/38) × FCT (Tab. 40) × FCRS (Tab. 41, método D) × FCA (Tab. 42; Tab. 45 se enterrado) >= Ib no trecho mais restritivo; circuitos em várias canaletas usam o menor FCA; dV% = k · rho(cobre) · L · Ib · cos phi / (S · V) × 100 (6.2.7.4); Ib <= In <= Iz (5.3.4).",{size:9});
  text("Demanda = soma(P × Fu × FD); potência de alimentação = demanda × (1 + reserva). Alimentador de quadro intermediário: demanda própria + sub-quadros; dV total = entrada + trechos de alimentador até o quadro + circuito. Neutro: Tab. 48. Condutor de proteção: Tab. 58 (S/2 arredondado para cima). Eletrodutos: ocupação <= 53 % / 31 % / 40 % (6.2.11.1.6).",{size:9,gap:8});
  h1("Previsão de cargas e demanda",true);
  table([{h:"#",w:.03,a:"r"},{h:"Circuito",w:.2},{h:"Quadro",w:.07},{h:"Tipo",w:.06},{h:"Ligação",w:.05},{h:"Nº",w:.035,a:"r"},{h:"Pot. unit.",w:.07,a:"r"},{h:"FP",w:.04,a:"r"},{h:"η",w:.04,a:"r"},{h:"P (W)",w:.07,a:"r"},{h:"Q (var)",w:.07,a:"r"},{h:"S (VA)",w:.07,a:"r"},{h:"Fu",w:.035,a:"r"},{h:"FD",w:.035,a:"r"},{h:"Demanda (kW)",w:.075,a:"r"},{h:"Fases",w:.035}],
    [...R.out.map(o=>[o.i+1,o.c.nome,o.c.q,TIPO_CURTO[o.c.tipo],o.L.txt,o.c.qtd,`${fmt(+o.c.pot,+o.c.pot%1?2:0)} ${o.c.unid}`,fmt(+o.c.fp,2),o.c.tipo==="motor"?fmt(+o.c.eta,2):"—",fmt0(o.P),fmt0(o.Q),fmt0(o.S),fmt(+o.c.fu,2),fmt(+o.c.fd,2),fmt(o.dem,2),o.fases]),
     Object.assign(["","TOTAL","","","","","","","",fmt0(R.inst*1000),"",fmt0(R.out.reduce((a,o)=>a+o.S,0)),"","",fmt(R.dem,2),""],{_b:true})]);
  kv([["Carga instalada",`${fmt(R.inst,2)} kW`],["Demanda ativa / reativa",`${fmt(R.dem,2)} kW / ${fmt(R.demQ,2)} kvar`],["Demanda aparente / FP global",`${fmt(R.demS,2)} kVA / ${fmt(R.fpG,2)}`],["Fator de demanda global",R.inst>0?fmt(R.dem/R.inst,2):"—"],["Potência de alimentação (c/ reserva)",`${fmt(R.ent.S,2)} kVA`],["Corrente da entrada",`${fmt(R.Ient,1)} A — ${sys.nome}`],[`Carga por fase ${R.PH.join(" / ")}`,R.PH.map(k=>fmt(R.ph[k]/1000,2)).join(" / ")+" kVA"],["Classificação",`${R.cls.classeT} / ${R.cls.subclasse} — Grupo ${R.cls.grupo}, subgrupo ${R.cls.sub}, tarifa ${R.cls.modalidade}`],["Enquadramento (REN 1.000/2021, art. 23)",R.inst>75?"Carga instalada > 75 kW: tensão primária":"Carga instalada <= 75 kW: tensão secundária"]]);
  h1("Dimensionamento de condutores, condutos e proteções",true);
  table([{h:"#",w:.03,a:"r"},{h:"Circuito",w:.14},{h:"Quadro",w:.065},{h:"Ib (A)",w:.055,a:"r"},{h:"FCT/FCRS",w:.05,a:"r"},{h:"FCA",w:.04,a:"r"},{h:"Iz (A)",w:.055,a:"r"},{h:"Fase/N/PE (mm²)",w:.09},{h:"Proteção",w:.135},{h:"L can.+baix. (m)",w:.06,a:"r"},{h:"dV circ.",w:.05,a:"r"},{h:"dV total",w:.05,a:"r"},{h:"dV partida",w:.05,a:"r"},{h:"Eletroduto baixada",w:.075},{h:"Critério",w:.06}],
    R.out.map(o=>[o.i+1,o.c.nome,o.c.q,fmt(o.ib,1),`${o.fct.toFixed(2)}/${o.fcRho.toFixed(2)}`,o.fcaD.toFixed(2),o.s?fmt(o.iz,1):"—",o.s?`${sec(o.s)} / ${o.sn?sec(o.sn):"-"} / ${sec(o.spe)}`:"sem solução",protTxt(o),`${o.c.ld}+${o.c.lb}`,o.s?fmt(o.dv,2)+" %":"—",o.s?fmt(o.dvTot,2)+" %":"—",o.dvpTot!=null?fmt(o.dvpTot,1)+" %":"—",o.ed.nome,o.crit.split(" (")[0]]));
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
  const fr=(nome,f,I,L,met,dvAc)=>[nome,fmt(I,1),L,met,f&&f.s?f.txt:"—",f&&f.s?fmt(f.iz,1):"—",f&&f.inom?`${f.polos}P ${f.inom} A`:"—",f&&f.s?fmt(f.dv,2)+" %":"—",fmt(dvAc,2)+" %",f&&f.s?f.ed.nome:"—"];
  table([{h:"Alimentador",w:.16},{h:"I (A)",w:.06,a:"r"},{h:"L (m)",w:.05,a:"r"},{h:"Método",w:.06},{h:"Condutores (mm²)",w:.18},{h:"Iz (A)",w:.07,a:"r"},{h:"Disjuntor",w:.09},{h:"dV trecho",w:.07,a:"r"},{h:"dV acumulada",w:.08,a:"r"},{h:"Eletroduto",w:.18}],
    [fr(`Entrada → ${S.quadros[0].nome}`,R.ent,R.Ient,S.forn.Lent,S.forn.metEnt,R.ent.dv||0),...quadrosEmArvore().map(qq=>R.quadros.find(x=>x.q===qq)).filter(q=>q&&q.f).map(q=>fr(`${q.pai} → ${q.q.nome}`,q.f,q.I,q.q.L,q.q.met,(R.ent.dv||0)+(q.dvAcum||0)))]);
  if(R.quadros.some(q=>q.filhos.length&&q.pai))text("Quadros intermediários: "+R.quadros.filter(q=>q.filhos.length&&q.pai).map(q=>`${q.q.nome} alimenta ${q.filhos.join(", ")} (alimentador dimensionado com a demanda própria e dos sub-quadros: ${fmt(q.S,2)} kVA)`).join("; ")+".",{size:8.5,color:MUT});

  // 5 · PLANTAS
  setP(0.45,"Incluindo plantas e diagramas...");
  separador("Plantas","Item D","Planta de situação e plantas baixas com pontos de utilização, quadros, rotas de canaletas e baixadas.",[...arqs("situacao").map(x=>"Situação — "+x),...arqs("arquitetonico").map(x=>"Plantas baixas — "+x)],4);
  if(!(await anexar("situacao","Planta de situação")))simOn?simSituacao():pendencia("Planta de situação","Anexe a planta de situação na etapa 02.");
  if(!(await anexar("arquitetonico","Plantas baixas com pontos")))simOn?simPlanta():pendencia("Plantas baixas com pontos","Anexe as plantas com pontos, quadros e rotas na etapa 08.");
  if(S.projetos.luminotecnico){separador("Projeto luminotécnico","Item D","Cálculo de iluminação por ambiente e distribuição das luminárias a partir das dimensões e premissas informadas.",[`${S.ambientes.length} ambiente(s)`,...S.ambientes.map(a=>{const c=calcularAmbiente(a);return `${a.nome}: ${fmt0(c.area)} m², ${a.lux} lux, ${c.luminarias} luminárias, ${fmt0(c.potencia)} W`;})],FLUXO.indexOf("Luminot."));if(!(await anexar("luminotecnico","Projeto luminotécnico")))simOn?simLuminotecnico():pendencia("Projeto luminotécnico","Anexe a prancha e a memória luminotécnica.");}
  if(S.projetos.spda){separador("Análise de risco e projeto de SPDA","NBR 5419","Pré-dimensionamento do SPDA pelo método das malhas (NBR 5419-3) para o nível de proteção adotado e número de eventos perigosos (NBR 5419-2). A análise de risco completa confirma o nível.",[...(R.spda.ok?[`Estrutura ${fmt(R.spda.L,1)} × ${fmt(R.spda.W,1)} × ${fmt(R.spda.H,1)} m · AD ${fmt0(R.spda.Ad)} m²${R.spda.ng?` · ND ${fmt(R.spda.Nd,4)}/ano`:""}`,`NP ${R.spda.np}: malha ${R.spda.g.m} × ${R.spda.g.m} m, ${R.spda.nDesc} descidas, anel de aterramento`]:["Dimensões da estrutura não informadas"]),...arqs("spda")],FLUXO.indexOf("SPDA"));if(!(await anexar("spda","Projeto de SPDA"))||R.spda.ok)simOn||R.spda.ok?simSpda():pendencia("Projeto de SPDA","Anexe a análise de risco e o projeto SPDA validados.");}

  // 6 · QUADROS DE DISTRIBUIÇÃO DE CARGAS
  separador("Quadros de distribuição de cargas","Item F","Tabelas de cada quadro com a distribuição dos circuitos pelas fases, seções, disjuntores e eletrodutos.",R.quadros.filter(q=>q.cs.length).map(q=>`${q.q.nome}: ${q.cs.length} circuito(s), ${fmt(q.S,2)} kVA com reserva`),5);
  h1("Quadros de distribuição de cargas",true);
  quadrosEmArvore().map(qq=>R.quadros.find(x=>x.q===qq)).forEach(q=>{if(!q||!q.cs.length)return;h2(`${q.q.nome}${q.pai?` (alimentado pelo ${q.pai})`:""}${q.f&&q.f.inom?` — disjuntor geral ${q.f.polos}P ${q.f.inom} A, alimentador ${sec(q.f.s)} mm²`:""}`);
    if(q.filhos.length)text(`Alimenta também os sub-quadros: ${q.filhos.join(", ")}.`,{size:8.5,color:MUT});
    const rows=q.cs.map(o=>{const n=o.fases.length;const v=k=>o.fases.includes(k)?fmt0(o.S/n):"";return [o.i+1,o.c.nome,fmt0(o.S),...R.PH.map(v),o.s?sec(o.s):"—",protTxt(o),o.ed.nome];});
    rows.push(Object.assign(["","TOTAL",fmt0(q.cs.reduce((a,o)=>a+o.S,0)),...R.PH.map(k=>fmt0(q.ph[k])),"","",""],{_b:true}));
    const wph=0.24/R.PH.length;table([{h:"Circ.",w:.05,a:"r"},{h:"Descrição",w:.28},{h:"S total (VA)",w:.08,a:"r"},...R.PH.map(k=>({h:`${k} (VA)`,w:wph,a:"r"})),{h:"Seção (mm²)",w:.07},{h:"Proteção",w:.17},{h:"Eletroduto",w:.11}],rows);});

  // 7 · UNIFILAR
  setP(0.6);
  separador("Diagrama unifilar","Item F","Representa a instalação em uma linha por circuito, do ponto de entrega aos quadros terminais, com manobra e proteção.",arqs("unifilar"),6);
  if(!(await anexar("unifilar","Diagrama unifilar geral")))simOn?simUnifilar():pendencia("Diagrama unifilar geral","Anexe o diagrama unifilar na etapa 08.");
  // 8 · MULTIFILAR
  separador("Diagramas multifilares","Item F","Cada condutor desenhado: quadros de força, partidas de motores e intertravamentos. É o documento usado na montagem.",arqs("multifilar"),7);
  if(!(await anexar("multifilar","Diagramas multifilares / força e comando")))simOn?simMultifilar():pendencia("Diagramas multifilares / força e comando","Anexe os diagramas dos quadros e motores na etapa 08.");
  // 9 · DETALHES E CONVENÇÕES
  separador("Detalhes construtivos e convenções","Item G","Detalhes de entrada de serviço, medição, caixas de passagem, aterramento e SPDA, e a legenda de símbolos (NBR 5444).",[...arqs("detalhes").map(x=>"Detalhes — "+x),...(S.anexos.convencoes.length?arqs("convencoes").map(x=>"Convenções — "+x):["Convenções: incluídas nas pranchas"])],8);
  if(!(await anexar("detalhes","Detalhes construtivos")))simOn?simDetalhes():pendencia("Detalhes construtivos","Anexe os detalhes de entrada, medição e aterramento na etapa 08.");
  if(!(await anexar("convencoes","Convenções"))&&simOn)simConv();

  // 10 · ESPECIFICAÇÕES
  setP(0.8,"Especificações e lista de materiais...");
  separador("Especificações técnicas","Item J","Tipos de materiais e requisitos mínimos de cada componente, admitindo similares com a mesma especificação técnica.",espec().map(e=>e[0]),9);
  h1("Especificações técnicas");
  espec().forEach(([a,b])=>{h2(a);text(b,{size:10});});

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

  // 12 · ORÇAMENTO (opcional)
  if(S.orc.pdf){const o=orcamento();
    separador("Orçamento","Complementar","Custo estimado da obra: materiais da lista, horas de engenharia, execução e implantação, despesas, lucro e impostos.",[`Materiais: ${brl(o.mat)}`,`Serviços: ${brl(o.mo)} (${fmt(o.horas,1)} h)`,`Preço de venda: ${brl(o.pv)}`,`Validade: ${S.orc.validade||30} dias`],FLUXO.indexOf("Orçamento"));
    h1("Orçamento");
    h2("Materiais por grupo");
    table([{h:"Grupo",w:.7},{h:"Valor",w:.3,a:"r"}],[...Object.keys(GRUPOS).filter(g=>o.por[g]).map(g=>[GRUPOS[g],brl(o.por[g])]),Object.assign(["Total de materiais",brl(o.mat)],{_b:true})],{size:9});
    if(o.semPreco)text(`${o.semPreco} item(ns) da lista de materiais sem preço informado: não somados.`,{size:8.5,color:MUT});
    if(o.srv.length){h2("Engenharia, serviços e implantação");
      table([{h:"Categoria",w:.2},{h:"Descrição",w:.4},{h:"Horas",w:.1,a:"r"},{h:"R$/h",w:.14,a:"r"},{h:"Subtotal",w:.16,a:"r"}],[...o.srv.map(s=>[CAT_SERV[s.cat]||s.cat,s.d||"—",fmt(s.h,1),brl(s.vh),brl(s.sub)]),Object.assign(["Total","",fmt(o.horas,1),"",brl(o.mo)],{_b:true})],{size:9});}
    h2("Composição do preço");
    kv([["Materiais",brl(o.mat)],["Serviços (engenharia, execução, implantação)",brl(o.mo)],["Despesas diretas",brl(o.desp)],["Custo direto",brl(o.direto)],[`Lucro (${fmt(+S.orc.lucro||0,1)} % sobre o custo direto)`,brl(o.lucro)],[`Impostos (${fmt(o.imp,1)} % sobre o preço de venda)`,brl(o.impV)],Object.assign(["PREÇO DE VENDA",brl(o.pv)],{_b:true}),["Validade da proposta",`${S.orc.validade||30} dias a partir de ${id.data||"—"}`]]);
    text("Preço de venda = (custo direto + lucro) / (1 − impostos). Valores estimados; preços de materiais sujeitos a cotação na data da compra.",{size:8.5,color:MUT});
    if(S.orc.obs)text(S.orc.obs,{size:9.5});}

  // 13 · OUTROS
  if(S.anexos.outros.length){separador("Outros anexos","Complementares","Catálogos, laudos, estudos e demais documentos de apoio.",arqs("outros"),10);await anexar("outros","Outros anexos");}

  // CONTRACAPA — créditos do software, licença e logotipos
  {const pp=doc.addPage(A4),[w,h]=A4,cx=(w-22)/2,X=48,XR=w-62;
    pp.drawRectangle({x:0,y:0,width:w,height:h,color:CV});pp.drawRectangle({x:w-22,y:0,width:22,height:h,color:CA});
    const L=typeof LOGOS!=="undefined"?LOGOS:{};const img=async k=>{try{return L[k]?await doc.embedPng(b64ToBytes(L[k])):null;}catch(e){return null;}};
    const emblema=(x,y,r,sig,nome)=>{pp.drawCircle({x,y,size:r,color:CC,borderColor:CA,borderWidth:1.5});dTC(pp,sig,x,y-r*0.12,r*0.5,FB,CV);const fz=Math.min(r*0.13,1.6*r/CO.widthOfTextAtSize(pt(nome),1));dTC(pp,nome,x,y-r*0.5,fz,CO,CD);};
    dT(pp,"SOFTWARE DE APOIO A PROJETOS",X,h-52,9,CO,CA);dTR(pp,"UFPEL  ·  ENGENHARIA AGRÍCOLA",XR,h-52,8,CO,CS);
    pp.drawLine({start:{x:X,y:h-64},end:{x:XR,y:h-64},thickness:0.6,color:CD});
    // destaque: Laboratório de Instrumentação Agrícola
    const ly=h-262,lr=118;aneis(pp,cx,ly,[lr+22,lr+52,lr+82]);
    const lia=await img("lia");if(lia){pp.drawCircle({x:cx,y:ly,size:lr+5,color:rgb(1,1,1),borderColor:CA,borderWidth:3});pp.drawImage(lia,{x:cx-lr,y:ly-lr,width:2*lr,height:2*lr});}else emblema(cx,ly,lr,"LIA","INSTRUMENTAÇÃO AGRÍCOLA");
    let yy=ly-lr-48;dTC(pp,CREDITOS.lab,cx,yy,15,FB,CC);yy-=16;dTC(pp,"Engenharia Agrícola  ·  Centro de Engenharias  ·  Universidade Federal de Pelotas",cx,yy,9,F,CS);
    yy-=22;pp.drawRectangle({x:cx-35,y:yy,width:70,height:4,color:CA});
    yy-=30;dTC(pp,"Desenvolvido utilizando o",cx,yy,11,F,CS);yy-=22;
    wrap(CREDITOS.software,FB,16,XR-X-40).forEach(l=>{dTC(pp,l,cx,yy,16,FB,CC);yy-=20;});
    yy-=14;dTC(pp,"RESPONSÁVEIS",cx,yy,7.5,CO,CA);yy-=17;dTC(pp,CREDITOS.resp.join("   ·   "),cx,yy,10.5,F,CC);
    // licença
    yy-=26;const lt=wrap(CREDITOS.licenca,F,7.8,XR-X-28),bh=lt.length*10.4+30;
    pp.drawRectangle({x:X,y:yy-bh,width:XR-X,height:bh,borderColor:CD,borderWidth:0.8});
    dT(pp,"LICENÇA DE USO",X+14,yy-16,7.5,CO,CA);lt.forEach((l,j)=>pp.drawText(l,{x:X+14,y:yy-30-j*10.4,size:7.8,font:F,color:CS}));
    // faixa creme com os logotipos institucionais
    const fb=118;pp.drawRectangle({x:0,y:0,width:w-22,height:fb,color:CC});
    const slots=[["ufpel","UFPel","UNIVERSIDADE FEDERAL DE PELOTAS"],["ceng","CEng","CENTRO DE ENGENHARIAS"],["ea","EA","ENGENHARIA AGRÍCOLA"]],sw=(XR-X)/3,lh=58;
    for(let k=0;k<slots.length;k++){const [key,sig,nome]=slots[k],sx=X+sw*k+sw/2,sy=fb-24-lh;const im=await img(key);
      if(im){const sc=Math.min(lh/im.height,(sw-24)/im.width);pp.drawImage(im,{x:sx-im.width*sc/2,y:sy+(lh-im.height*sc)/2,width:im.width*sc,height:im.height*sc});}
      else emblema(sx,sy+lh/2,lh/2,sig,nome);
      if(k)pp.drawLine({start:{x:X+sw*k,y:sy+4},end:{x:X+sw*k,y:sy+lh-4},thickness:0.5,color:CS});}
    pp.drawLine({start:{x:X,y:30},end:{x:XR,y:30},thickness:0.5,color:CS});
    dT(pp,CREDITOS.repo.replace(/^https:\/\//,""),X,16,7,CO,CD);dTR(pp,`Gerado em ${new Date().toLocaleDateString("pt-BR")}`,XR,16,7,CO,CD);}

  // SUMÁRIO (inserido na posição 1)
  setP(0.92,"Numerando folhas...");
  const sp=doc.insertPage(sumIndex,A4);
  const shift=i=>i>=sumIndex?i+1:i;
  const genS=new Set([...gen].map(shift));genS.add(sumIndex);genS.delete(0); // capa sem rodapé
  let sy=841.89-M-18;sp.drawText(pt("Sumário"),{x:M,y:sy-18,size:18,font:FB,color:INK});sy-=26;sp.drawRectangle({x:M,y:sy,width:595.28-2*M,height:1.5,color:ACC});sy-=22;
  toc.forEach(([t,i],k)=>{const n=String(shift(i)+1);sp.drawText(String(k+1).padStart(2,"0"),{x:M,y:sy,size:10.5,font:FB,color:ACC});sp.drawText(pt(t),{x:M+26,y:sy,size:10.5,font:F,color:INK});sp.drawText(n,{x:595.28-M-F.widthOfTextAtSize(n,10.5),y:sy,size:10.5,font:F,color:INK});sy-=18;});
  // carimbo e numeração
  const N=doc.getPageCount();
  doc.getPages().forEach((pp,i)=>{const {width:w}=pp.getSize();const lab=pt(`Folha ${i+1}/${N}`);
    if(genS.has(i)){pp.drawLine({start:{x:M,y:M-4},end:{x:w-M,y:M-4},thickness:0.6,color:LN});pp.drawText(pt(`${S.id.obra||"Projeto elétrico"} — ${S.id.cliente||""}`).slice(0,110),{x:M,y:M-16,size:7.5,font:F,color:MUT});pp.drawText(pt(`RT: ${S.id.rt||"—"} · CREA ${S.id.crea||"—"}`),{x:M,y:M-26,size:7.5,font:F,color:MUT});}
    if(i>0&&i<N-1)pp.drawText(lab,{x:w-M-F.widthOfTextAtSize(lab,7.5),y:genS.has(i)?M-16:12,size:7.5,font:F,color:MUT});}); // capa e contracapa sem número
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
