"use strict";
/* Tabelas NBR 5410 (conferidas com a ABNT NBR 5410:2004), NBR 5419:2015, aterramento, DR, DPS, dispositivos de motores, sistemas de fornecimento e classes de consumo (REN ANEEL 1.000/2021) */
/* ============================================================
   TABELAS NBR 5410:2004 (condutor de cobre, isolação PVC 70 °C)
   ============================================================ */
const SEC=[1.5,2.5,4,6,10,16,25,35,50,70,95,120,150,185,240,300];
// Tabela 36 — ambiente 30 °C (solo 20 °C p/ método D); [2 condutores carregados, 3 condutores carregados]
const T36={
  A1:[[14.5,19.5,26,34,46,61,80,99,119,151,182,210,240,273,321,367],[13.5,18,24,31,42,56,73,89,108,136,164,188,216,245,286,328]],
  A2:[[14,18.5,25,32,43,57,75,92,110,139,167,192,219,248,291,334],[13,17.5,23,29,39,52,68,83,99,125,150,172,196,223,261,298]],
  B1:[[17.5,24,32,41,57,76,101,125,151,192,232,269,309,353,415,477],[15.5,21,28,36,50,68,89,110,134,171,207,239,275,314,370,426]],
  B2:[[16.5,23,30,38,52,69,90,111,133,168,201,232,265,300,351,401],[15,20,27,34,46,62,80,99,118,149,179,206,236,268,313,358]],
  C:[[19.5,27,36,46,63,85,112,138,168,213,258,299,344,392,461,530],[17.5,24,32,41,57,76,96,119,144,184,223,259,299,341,403,464]],
  D:[[22,29,38,47,63,81,104,125,148,183,216,246,278,312,361,408],[18,24,31,39,52,67,86,103,122,151,179,203,230,258,297,336]]
};
// Tabela 38 — métodos E, F e G, ambiente 30 °C (cobre, PVC 70 °C) — conferida com a ABNT NBR 5410:2004
const T38={
  E2:[22,30,40,51,70,94,119,148,180,232,282,328,379,434,514,593],
  E3:[18.5,25,34,43,60,80,101,126,153,196,238,276,319,364,430,497],
  F2:[22,31,41,53,73,99,131,162,196,251,304,352,406,463,546,629],
  F3t:[17,24,33,43,60,82,110,137,167,216,264,308,356,409,485,561],
  F3p:[18,25,34,45,63,85,114,143,174,225,275,321,372,427,507,587],
  Gh:[24,34,45,59,81,110,146,181,219,281,341,396,456,521,615,709],
  Gv:[21,29,39,51,71,97,130,162,197,254,311,362,419,480,569,659]
};
// Tabela 33 — métodos de referência (descrição resumida)
const METODOS={
  A1:"A1 — condutores isolados em eletroduto embutido em parede termicamente isolante",
  A2:"A2 — cabo multipolar em eletroduto embutido em parede termicamente isolante",
  B1:"B1 — condutores isolados em eletroduto aparente ou embutido em alvenaria, ou em canaleta/eletrocalha fechada",
  B2:"B2 — cabo multipolar em eletroduto aparente ou embutido em alvenaria",
  C:"C — cabos unipolares ou multipolar fixados diretamente em parede ou teto",
  D:"D — cabos em eletroduto enterrado no solo",
  E:"E — cabo multipolar ao ar livre (bandeja perfurada, leito, suportes)",
  F:"F — cabos unipolares justapostos ao ar livre (bandeja perfurada, leito, suportes)",
  G:"G — cabos unipolares espaçados ao ar livre"
};
// Tabela 40 — PVC
const T40_AR={10:1.22,15:1.17,20:1.12,25:1.06,30:1.00,35:0.94,40:0.87,45:0.79,50:0.71,55:0.61,60:0.50};
const T40_SOLO={10:1.10,15:1.05,20:1.00,25:0.95,30:0.89,35:0.84,40:0.77,45:0.71,50:0.63,55:0.55,60:0.45};
// Tabela 42 — fatores de agrupamento por forma de agrupamento (nº de circuitos 1..9+)
const T42={
  feixe:{t:"1 — em feixe: ao ar livre, sobre superfície, embutidos ou em conduto fechado (A a F)",v:[1,0.80,0.70,0.65,0.60,0.57,0.54,0.52,0.50]},
  parede:{t:"2 — camada única sobre parede, piso ou bandeja não perfurada (C)",v:[1,0.85,0.79,0.75,0.73,0.72,0.72,0.71,0.70]},
  teto:{t:"3 — camada única no teto (C)",v:[0.95,0.81,0.72,0.68,0.66,0.64,0.63,0.62,0.61]},
  bandeja:{t:"4 — camada única em bandeja perfurada (E, F)",v:[1,0.88,0.82,0.77,0.75,0.73,0.73,0.72,0.72]},
  leito:{t:"5 — camada única em leito, suporte etc. (E, F)",v:[1,0.87,0.82,0.80,0.80,0.79,0.79,0.78,0.78]}
};
function fca(n,arr="feixe"){n=Math.max(1,n|0);const r=(T42[arr]||T42.feixe);if(arr==="feixe"){if(n<=9)return r.v[n-1];if(n<=11)return 0.50;if(n<=15)return 0.45;if(n<=19)return 0.41;return 0.38;}return r.v[Math.min(n,9)-1];}
// Tabela 47 — seção mínima (cobre)
const SMIN={ilum:1.5,tug:2.5,tue:2.5,motor:2.5};
// Tabela 48 — neutro reduzido (só se permitido: circuito trifásico equilibrado, THD 3ª harm. ≤ 15 %)
const T48={35:25,50:25,70:35,95:50,120:70,150:70,185:95,240:120,300:150};
// Tabela 58 — condutor de proteção
function sPE(s){if(s<=16)return s;if(s<=35)return 16;const h=s/2;return SEC.find(x=>x>=h-1e-9)||SEC.at(-1);} // Tab. 58: S/2 é seção mínima → seção padronizada imediatamente superior (150 → 95, 185 → 95)
// Tabela 41 — fatores de correção para linhas subterrâneas com resistividade térmica do solo ≠ 2,5 K·m/W (método D)
// 0,5 e 0,7 K·m/W: extensão da IEC 60364-5-52, Tab. B.52.16 (dutos enterrados)
const T41=[[0.5,1.28],[0.7,1.20],[1,1.18],[1.5,1.10],[2,1.05],[2.5,1],[3,0.96]];
// Tabela 45 — agrupamento de linhas em eletrodutos enterrados (um cabo multipolar por eletroduto), por distância entre eletrodutos
const T45={nula:{t:"Nula (eletrodutos encostados)",v:[1,0.85,0.75,0.70,0.65,0.60]},"0.25":{t:"0,25 m",v:[1,0.90,0.85,0.80,0.80,0.80]},"0.5":{t:"0,5 m",v:[1,0.95,0.90,0.85,0.85,0.80]},"1.0":{t:"1,0 m",v:[1,0.95,0.95,0.90,0.90,0.90]}};
function fca45(n,esp="nula"){n=Math.max(1,n|0);const r=(T45[esp]||T45.nula).v;return n<=6?r[n-1]:Math.min(r[5],fca(n,"feixe"));} // acima de 6 circuitos: adota o menor entre a última linha e a Tab. 42 (a favor da segurança)
// Condutores isolados só em condutos fechados (6.2.11.1.1); demais métodos exigem cabos uni/multipolares
const MET_ISOLADO=["A1","B1"];
// NBR 5419-3:2015 — parâmetros por nível de proteção (Tab. 2: esfera rolante e malha; Tab. 4: espaçamento das descidas)
const NP5419={I:{r:20,m:5,d:10},II:{r:30,m:10,d:10},III:{r:45,m:15,d:15},IV:{r:60,m:20,d:20}};
// NBR 5419-2:2015, Anexo A — fator de localização Cd
const CD5419={0.25:"0,25 — cercada por objetos mais altos",0.5:"0,5 — cercada por objetos de mesma altura ou mais baixos",1:"1 — isolada, sem objetos nas vizinhanças",2:"2 — isolada no topo de colina ou monte"};
// Disjuntores padronizados
const BRK=[6,10,13,16,20,25,32,40,50,63,70,80,100,125,160,200,225,250,320,400,500,630,800];
// Proteção e partida de motores
const PROTS={dj:"Disjuntor termomagnético + relé térmico",fus:"Fusíveis + relé térmico",djm:"Disjuntor-motor"};
const PROTS_CURTO={dj:"Disjuntor + relé",fus:"Fusíveis + relé",djm:"Disjuntor-motor"};
const PARTIDAS={direta:"Direta",yd:"Estrela-triângulo",soft:"Soft-starter",inv:"Inversor de frequência"};
// Faixas de ajuste típicas de relés térmicos e disjuntores-motor (A) — confirmar no catálogo do fabricante
const FAIXAS=[[0.1,0.16],[0.16,0.25],[0.25,0.4],[0.4,0.63],[0.63,1],[1,1.6],[1.6,2.5],[2.5,4],[4,6.3],[6.3,10],[9,14],[13,18],[17,23],[20,25],[24,32],[32,40],[40,50],[48,65],[63,80],[80,104],[95,120],[110,140],[130,170],[160,200],[200,250],[250,320],[320,400]];
function faixa(x){const c=FAIXAS.filter(([a,b])=>x>=a&&x<=b);if(!c.length)return null;return c.reduce((best,r)=>Math.abs(Math.log(x/Math.sqrt(r[0]*r[1])))<Math.abs(Math.log(x/Math.sqrt(best[0]*best[1])))?r:best);}
// Correntes nominais padronizadas de fusíveis (Diazed/NH)
const FUS=[2,4,6,10,16,20,25,32,35,40,50,63,80,100,125,160,200,224,250,315,355,400,500,630];
// Dimensiona relé térmico, fusíveis, disjuntor-motor e contatores de um circuito de motor
// Correntes nominais padronizadas típicas (catálogo) para seleção de equipamentos
const CONT_STD=[9,12,18,25,32,40,50,65,80,95,115,150,185,225,265,330,400,500,630];   // contatores AC-3 (Ie, A)
const SOFT_STD=[10,17,24,30,37,45,61,85,105,130,171,200,255,312,365,412,480,604];   // soft-starters (A)
const INV_STD=[2.6,4.3,7,10,13,16,24,31,38,45,58.5,70.5,88,105,142,180,211,242,312,370,477,515,601]; // inversores, regime pesado (A)
const nxt=(arr,x)=>arr.find(v=>v>=x-1e-9)||null;
function fusTam(If){ // tamanhos e dados típicos de fusíveis
  if(If<=25)return {t:"Diazed DII",base:"base Diazed DII com anel e parafuso de ajuste",un:500,icu:50};
  if(If<=63)return {t:"Diazed DIII",base:"base Diazed DIII com anel e parafuso de ajuste",un:500,icu:50};
  if(If<=160)return {t:"NH00",base:"base NH00 unipolar",un:500,icu:120};
  if(If<=250)return {t:"NH1",base:"base NH1 unipolar",un:500,icu:120};
  if(If<=400)return {t:"NH2",base:"base NH2 unipolar",un:500,icu:120};
  return {t:"NH3",base:"base NH3 unipolar",un:500,icu:120};}
// Esquemas de aterramento (NBR 5410, 4.2.2.2)
const ATERR={"TN-S":"TN-S — neutro e proteção separados em toda a instalação","TN-C-S":"TN-C-S — PEN até o QGBT, TN-S a partir dele","TN-C":"TN-C — neutro e proteção combinados (PEN)","TT":"TT — massas aterradas em eletrodo próprio","IT-N":"IT com neutro distribuído","IT":"IT sem neutro distribuído"};
// Locais para verificação de DR obrigatório (5.1.3.2.2)
const LOCAIS={seco:"Interno seco",banho:"Com banheira ou chuveiro",externo:"Área externa",alimExt:"Interno, pode alimentar equip. externo",molhado:"Cozinha, lavanderia, garagem, área molhada ou lavada"};
const IDR_STD=[25,40,63,80,100,125];
const IDN_STD=[30,100,300,500];
const DPS_UC=[175,275,320,385,440,460,600];
// DR: retorna {idn, motivo} ou null
function drCirc(c,ib,inom,L,partida){
  const f=S.forn,tom=c.tipo==="tug"||c.tipo==="tue";
  const res=f.classe==="residencial"||f.subclasse==="Residencial rural";
  let mot=null;
  if(c.local==="banho")mot="5.1.3.2.2-a (local com banheira ou chuveiro)";
  else if(c.local==="externo"&&tom)mot="5.1.3.2.2-b (tomadas em área externa)";
  else if(c.local==="alimExt"&&tom)mot="5.1.3.2.2-c (tomadas que podem alimentar equipamentos externos)";
  else if(c.local==="molhado"&&res)mot="5.1.3.2.2-d (local de habitação: cozinha, lavanderia, área molhada)";
  else if(c.local==="molhado"&&tom)mot="5.1.3.2.2-e (tomadas em cozinha, lavanderia, área molhada ou lavada)";
  else if(c.dr==="sim")mot="adotado em projeto";
  let idn=mot?30:null;
  if(f.aterr==="TT"&&!idn){const lim=(+f.ul||50)/Math.max(+f.ra||1,0.1)*1000;idn=[...IDN_STD].reverse().find(x=>x<=lim)||30;mot="5.1.2.2.4.3 (esquema TT: RA × IΔn ≤ UL)";}
  if(!idn)return null;
  const In=nxt(IDR_STD,Math.max(inom||0,ib));
  return {idn,mot,In,polos:(L.nf+(L.n?1:0))>2?4:2,tipo:partida==="inv"?"B":"A"};
}
// DPS no QGBT (5.4.2.1, 6.3.5.2)
function dpsCalc(sys){
  const f=S.forn,a=f.aterr;
  const req=(f.aerea&&(f.aq==="AQ2"||f.aq==="AQ3"))||f.aq==="AQ3";
  const Uo=sys.vfn,U=sys.vff||sys.vfn;
  const up=(Uo<=127||sys.fases===1)?1.5:2.5; // Tab. 31, categoria II
  const uc=x=>nxt(DPS_UC,x)||x;
  const nf=sys.fases===1?1:sys.fases;const mono=sys.fases===1;
  const cls1=!!f.spda;
  const Imodo=cls1?"Iimp ≥ 12,5 kA (10/350 µs)":"In ≥ 5 kA (8/20 µs)";
  const Inpe=cls1?(mono?"Iimp ≥ 25 kA":"Iimp ≥ 50 kA"):(mono?"In ≥ 10 kA (8/20 µs)":"In ≥ 20 kA (8/20 µs)");
  let itens,con;
  if(a==="TN-C"){con="conexão 1: fase–PEN";itens=[{n:nf,mod:"fase–PEN",uc:uc(1.1*Uo),i:Imodo}];}
  else if(a==="TT"){con="conexão 3: fase–neutro e neutro–PE";itens=[{n:nf,mod:"fase–neutro",uc:uc(1.1*Uo),i:Imodo},{n:1,mod:"neutro–PE",uc:uc(Uo),i:Inpe}];}
  else if(a==="IT"){con="conexão 1: fase–PE (sem neutro)";itens=[{n:nf,mod:"fase–PE",uc:uc(U),i:Imodo}];}
  else if(a==="IT-N"){con="conexão 2: fase–PE e neutro–PE";itens=[{n:nf,mod:"fase–PE",uc:uc(Math.sqrt(3)*Uo),i:Imodo},{n:1,mod:"neutro–PE",uc:uc(Uo),i:Imodo}];}
  else{con="conexão 2: fase–PE e neutro–PE";itens=[{n:nf,mod:"fase–PE",uc:uc(1.1*Uo),i:Imodo},{n:1,mod:"neutro–PE",uc:uc(Uo),i:Imodo}];}
  const motivo=req?(f.aq==="AQ3"?"5.4.2.1.1-b (região AQ3)":"5.4.2.1.1-a (linha aérea em região AQ2, mais de 25 dias de trovoada por ano)"):"";
  return {req,incl:req||!!S.par.dpsSempre,motivo,up,con,itens,cls1};
}
function fa(x){return fmt(x,x<1?2:(x%1?1:0));}
function protMotor({In1,ib,kp,partida,prot,fusTipo,nf,qtd,V,kW,cv}){
  const r={In1,Ip:In1*kp,partida,prot,V,kW,cv,nf,kp,itens:[]};
  // relé térmico: ajuste na corrente nominal do motor; na estrela-triângulo o relé fica no ramo do triângulo (In/√3)
  const Ir=partida==="yd"?In1/Math.sqrt(3):In1;
  if(prot!=="djm"){
    if(partida==="inv"){r.rele=null;r.releTxt="proteção de sobrecarga pelo inversor (parametrizar In do motor)";}
    else{const f=faixa(Ir);r.rele={Ir,f,qtd};r.releTxt=f?`relé ${fa(f[0])}–${fa(f[1])} A, ajuste ${fmt(Ir,1)} A${partida==="yd"?" (ramo triângulo)":""}`:`relé: ajuste ${fmt(Ir,1)} A (fora das faixas típicas)`;}
  }
  if(prot==="djm"){const f=faixa(In1);r.djm={Ir:In1,f};r.djmTxt=f?`disjuntor-motor ${fa(f[0])}–${fa(f[1])} A, ajuste ${fmt(In1,1)} A`:`disjuntor-motor: ajuste ${fmt(In1,1)} A (fora das faixas típicas)`;}
  if(prot==="fus"){
    let alvo,obs;
    const ibT=ib*qtd,IpT=r.Ip+(qtd-1)*In1; // circuito com qtd motores: um partindo, demais em regime
    if(partida==="inv"){alvo=ibT;obs="ultrarrápido (aR) conforme fabricante do inversor";}
    else if(fusTipo==="aM"){alvo=ibT;obs="aM (retardado para motores)";}
    else{const K=IpT<=40?0.5:IpT<=500?0.4:0.3;alvo=Math.max(ibT,K*IpT);obs=`gG, If ≥ ${fmt(K,1)} × Ip`;}
    const If=FUS.find(x=>x>=alvo);r.fus={If,n:nf,obs};r.fusTxt=If?`${nf} × fusível ${If} A ${obs}`:`fusível acima de 630 A`;}
  // contatores / chaves (AC-3)
  if(partida==="direta")r.cont=[{n:1,I:In1,t:"K1 (linha)"}];
  else if(partida==="yd")r.cont=[{n:1,I:In1/Math.sqrt(3),t:"K1 (linha)"},{n:1,I:In1/Math.sqrt(3),t:"K2 (triângulo)"},{n:1,I:In1/3,t:"K3 (estrela)"}];
  else r.cont=[];
  r.cont.forEach(k=>k.std=nxt(CONT_STD,k.I));
  if(r.rele)r.rele.cont=r.cont.length?r.cont[0].std:null;
  if(partida==="soft")r.soft={std:nxt(SOFT_STD,In1),I:In1};
  if(partida==="inv")r.inv={std:nxt(INV_STD,ib),I:ib};
  r.chave=r.soft?`soft-starter ${r.soft.std??"> 604"} A`:r.inv?`inversor ${r.inv.std??"> 601"} A`:"";
  r.contTxt=r.cont.map(k=>`${k.t.split(" ")[0]} ${k.std} A (≥ ${fmt(k.I,1)})`).join(", ");
  return r;
}
function drTxt(o){return o.dr?` + IDR ${o.dr.polos}P ${o.dr.In} A ${o.dr.idn} mA tipo ${o.dr.tipo}`:"";}
function protTxt(o){return protTxt0(o)+(o.s?drTxt(o):"");}
function protTxt0(o){
  if(!o.s)return "—";
  if(!o.mp)return o.inom?`${o.L.polos}P ${o.inom} A — ${o.curva}`:"—";
  const m=o.mp;const a=[];
  if(o.prot==="dj")a.push(`${o.L.polos}P ${o.inom} A — ${o.curva}`);
  if(o.prot==="fus")a.push(m.fusTxt);
  if(o.prot==="djm")a.push(m.djmTxt);
  if(m.releTxt)a.push(m.releTxt);
  return a.join(" + ");
}
// Diâmetro externo típico, cabo flexível 450/750 V PVC (mm) — catálogo
const DEXT={1.5:3.0,2.5:3.7,4:4.3,6:4.9,10:6.2,16:7.3,25:9.1,35:10.3,50:12.3,70:14.3,95:16.2,120:18.2,150:20.3,185:22.6,240:25.9,300:28.9};
// Eletroduto PVC rígido roscável — diâmetro interno de referência (mm)
const ELETRODUTOS=[["DN 20 (1/2\")",16.4],["DN 25 (3/4\")",21.3],["DN 32 (1\")",27.5],["DN 40 (1 1/4\")",36.1],["DN 50 (1 1/2\")",41.4],["DN 60 (2\")",52.8],["DN 75 (2 1/2\")",67.1],["DN 85 (3\")",79.6],["DN 110 (4\")",103.1]];
const ELETROCALHAS=[[50,50],[75,50],[100,50],[150,50],[200,50],[100,100],[150,100],[200,100],[300,100],[400,100],[500,100],[600,100]];
// Sistemas de fornecimento em tensão secundária
const SISTEMAS={
  "1F-127":{fases:1,vfn:127,vff:null,ang:0,nome:"Monofásico 127 V (F+N)"},
  "1F-220":{fases:1,vfn:220,vff:null,ang:0,nome:"Monofásico 220 V (F+N)"},
  "1F3-440/220":{fases:2,vfn:220,vff:440,ang:180,nome:"Monofásico a três fios 220/440 V (2F+N, rural)"},
  "2F-220/127":{fases:2,vfn:127,vff:220,ang:120,nome:"Bifásico 127/220 V (2F+N)"},
  "220/127":{fases:3,vfn:127,vff:220,ang:120,nome:"Trifásico 127/220 V (3F+N)"},
  "380/220":{fases:3,vfn:220,vff:380,ang:120,nome:"Trifásico 220/380 V (3F+N)"}
};
const FASES=["R","S","T"];
function ligOK(lig,sys){const L=LIG[lig];if(!L)return false;if(sys.fases===1)return lig==="F+N";return L.nf<=sys.fases;}
function ligVolt(lig,sys){const L=LIG[lig];return L.vref==="fn"?sys.vfn:sys.vff;}
// configuração do alimentador conforme o sistema
function feederCfg(sys){
  if(sys.fases===1)return {nf:1,nc:2,div:1,vref:sys.vfn,kdv:2,polos:1};
  if(sys.fases===2)return {nf:2,nc:sys.ang===180?2:3,div:2,vref:sys.vfn,kdv:sys.ang===180?1:2,polos:2}; // Tab. 46
  return {nf:3,nc:3,div:Math.sqrt(3),vref:sys.vff,kdv:Math.sqrt(3),polos:3};
}
// Classes e subclasses de consumo — REN ANEEL nº 1.000/2021
const CLASSES={
  residencial:{t:"Residencial",sub:["Residencial","Residencial baixa renda"]},
  industrial:{t:"Industrial",sub:["Industrial"]},
  comercial:{t:"Comercial, serviços e outras atividades",sub:["Comercial","Serviços de transporte, exceto tração elétrica","Serviços de comunicações e telecomunicações","Associações e entidades filantrópicas","Templos religiosos","Administração condominial","Iluminação em rodovias","Semáforos, radares e câmeras de monitoramento","Outros serviços e outras atividades"]},
  rural:{t:"Rural",sub:["Agropecuária rural","Agropecuária urbana","Residencial rural","Cooperativa de eletrificação rural","Agroindustrial","Serviço público de irrigação rural","Escola agrotécnica","Aquicultura"]},
  poder:{t:"Poder público",sub:["Poder público federal","Poder público estadual ou distrital","Poder público municipal"]},
  ilum:{t:"Iluminação pública",sub:["Iluminação pública"]},
  servpub:{t:"Serviço público",sub:["Tração elétrica","Água, esgoto e saneamento"]},
  proprio:{t:"Consumo próprio",sub:["Consumo próprio"]}
};
const SUBGRUPOS_A={A1:"A1 — tensão ≥ 230 kV",A2:"A2 — 88 kV a 138 kV",A3:"A3 — 69 kV",A3a:"A3a — 30 kV a 44 kV",A4:"A4 — 2,3 kV a 25 kV",AS:"AS — < 2,3 kV, sistema subterrâneo"};
function classificar(){
  const f=S.forn;const cl=CLASSES[f.classe]||CLASSES.rural;
  if(!cl.sub.includes(f.subclasse))f.subclasse=cl.sub[0];
  let grupo,sub,avisos=[];
  if(f.atend==="MT"){grupo="A";const v=+f.tensaoPrim||0;
    if(f.subterraneo&&v<2.3)sub="AS";else if(v>=230)sub="A1";else if(v>=88)sub="A2";else if(v>=69)sub="A3";else if(v>=30)sub="A3a";else if(v>=2.3)sub="A4";else sub="—";
    if(v>25&&v<30||v>44&&v<69||v>138&&v<230)avisos.push(`Tensão de ${v} kV fora das faixas padronizadas dos subgrupos; confirme com a distribuidora.`);
    if(sub==="—")avisos.push("Informe a tensão primária de fornecimento (kV).");}
  else{grupo="B";sub=f.classe==="residencial"?"B1":f.classe==="rural"?"B2":f.classe==="ilum"?"B4":"B3";}
  const mods=grupo==="A"?(["A3a","A4","AS"].includes(sub)?["Azul","Verde"]:["Azul"]):(f.subclasse==="Residencial baixa renda"||sub==="B4"?["Convencional monômia"]:["Convencional monômia","Branca"]);
  if(!mods.includes(f.modalidade))f.modalidade=mods[0];
  return {grupo,sub,mods,avisos,classeT:cl.t,subclasse:f.subclasse,modalidade:f.modalidade};
}
const LIG={
  "F+N":{nf:1,n:true,nc:2,vref:"fn",div:1,kdv:2,polos:1,txt:"F+N"},
  "F+F":{nf:2,n:false,nc:2,vref:"ff",div:1,kdv:2,polos:2,txt:"2F"},
  "2F+N":{nf:2,n:true,nc:3,vref:"fn",div:2,kdv:2,polos:2,txt:"2F+N"},
  "3F":{nf:3,n:false,nc:3,vref:"ff",div:Math.sqrt(3),kdv:Math.sqrt(3),polos:3,txt:"3F"},
  "3F+N":{nf:3,n:true,nc:3,vref:"ff",div:Math.sqrt(3),kdv:Math.sqrt(3),polos:3,txt:"3F+N"}
};
const TIPOS={ilum:"Iluminação",tug:"Tomadas de uso geral (TUG)",tue:"Tomada/uso específico (TUE)",motor:"Motor"};
const TIPO_CURTO={ilum:"Ilum.",tug:"TUG",tue:"TUE",motor:"Motor"};


/* ============================================================
   INFLUÊNCIAS EXTERNAS (NBR 5410, Tab. 32) → grau de proteção mínimo
   ============================================================ */
const INFL={
  seco:{t:"Interno seco (AD1, AE1)",ip:"IP20",ipQ:"IP40",cod:"AD1 · AE1",obs:"Ambiente interno seco, sem poeira significativa."},
  poeira:{t:"Poeira leve/média (AE4–AE5)",ip:"IP54",ipQ:"IP54",cod:"AE4 · AE5",obs:"Deposição de poeira (galpões, beneficiamento): invólucros com proteção contra poeira."},
  poeiraAlta:{t:"Poeira intensa (AE6)",ip:"IP65",ipQ:"IP65",cod:"AE6",obs:"Poeira intensa (moagem, secadores, silos): invólucros totalmente protegidos contra poeira."},
  umido:{t:"Úmido / respingos (AD3–AD4)",ip:"IP44",ipQ:"IP54",cod:"AD3 · AD4",obs:"Respingos e condensação: tomadas e luminárias com tampa e vedação."},
  lavado:{t:"Lavado com jatos (AD5–AD6)",ip:"IP65",ipQ:"IP66",cod:"AD5 · AD6",obs:"Lavagem com jatos d'água (salas de ordenha, abatedouros, laticínios)."},
  corrosivo:{t:"Corrosivo (AF2–AF3: amônia, aviários, pocilgas)",ip:"IP65",ipQ:"IP65",cod:"AF2 · AF3",obs:"Agentes corrosivos: invólucros em poliéster/policarbonato ou aço inox, ferragens inoxidáveis."},
  externo:{t:"Externo (AD4, AN2, AQ2)",ip:"IP65",ipQ:"IP65",cod:"AD4 · AN2 · AQ2",obs:"Exposto à chuva e radiação solar: materiais resistentes a UV."},
  animais:{t:"Presença de animais (BA, AL)",ip:"IP55",ipQ:"IP55",cod:"AL2 · BA5",obs:"Instalações para animais (5.1.3.2.2 e Seção 9): DR 30 mA, equipotencialização suplementar do piso."}
};
// Áreas com poeira combustível (NBR IEC 60079-10-2): grãos, farelos, rações, açúcar
const ZONAS={"":{t:"Não classificada",epl:"",rf:null},
  "22":{t:"Zona 22 — poeira só em operação anormal",epl:"EPL Dc (ou Db/Da), IP5X/IP6X",rf:1e-3},
  "21":{t:"Zona 21 — poeira ocasional em operação normal",epl:"EPL Db (ou Da), IP6X",rf:1e-1},
  "20":{t:"Zona 20 — nuvem de poeira contínua/frequente",epl:"EPL Da, IP6X",rf:1}};

/* ============================================================
   CURTO-CIRCUITO, SELETIVIDADE, ATERRAMENTO
   ============================================================ */
const ICN_STD=[3,4.5,6,10,15,20,25,36,50,65,85,100];          // capacidades de interrupção padronizadas (kA)
const IM_CURVA={B:5,C:10,D:20};                                 // múltiplo de In para disparo magnético garantido (NBR NM 60898)
const RHO20=0.0178;                                             // cobre a 20 °C (Ω·mm²/m) — curto máximo
// Tab. 52 — seção mínima do condutor de aterramento enterrado (mm², cobre)
const TERRA_MIN={protegido:16,naoProtegido:25};

/* ============================================================
   CORREÇÃO DO FATOR DE POTÊNCIA (REN ANEEL 1.000/2021: FP de referência 0,92)
   ============================================================ */
const CAP_STD=[2.5,5,7.5,10,12.5,15,20,25,30,40,50,60,75,100,125,150,200,250,300]; // kvar

/* ============================================================
   SUBESTAÇÃO (NBR 14039) — valores típicos, confirmar com o RIC
   ============================================================ */
const TRAFO_STD=[15,30,45,75,112.5,150,225,300,500,750,1000,1500,2000,2500];       // kVA
const ELO_STD=[["1H",1],["2H",2],["3H",3],["5H",5],["6K",6],["8K",8],["10K",10],["12K",12],["15K",15],["20K",20],["25K",25],["30K",30],["40K",40],["50K",50],["65K",65],["80K",80],["100K",100]];
function paraRaiosUr(kV){return kV<=15?12:kV<=25?21:kV<=36?30:Math.ceil(kV*0.8);}    // Ur típica dos para-raios de distribuição (kV)

/* ============================================================
   NBR 5419-2:2015 — análise de risco R1 (perda de vida humana), tabelas dos Anexos A, B e C
   ============================================================ */
const R5419={
  PB:{nenhum:1,IV:0.2,III:0.1,II:0.05,I:0.02},                         // Tab. B.2
  PEB:{nenhum:1,IV:0.05,III:0.05,II:0.02,I:0.01},                       // Tab. B.7 (DPS classe I coordenados com o NP)
  PTA:{"1":"1 — nenhuma medida","0.1":"0,1 — avisos de alerta","0.01":"0,01 — isolação elétrica ou equipotencialização do solo","0":"0 — barreiras ou estrutura usada como descida"},
  rt:{"1e-2":"10⁻² — terra agrícola, concreto","1e-3":"10⁻³ — mármore, cerâmica","1e-4":"10⁻⁴ — cascalho, carpete","1e-5":"10⁻⁵ — asfalto, madeira, linóleo"},
  rp:{"1":"1 — nenhuma providência","0.5":"0,5 — extintores, hidrantes, alarme manual, rota de fuga","0.2":"0,2 — extinção automática ou alarme automático"},
  rf:{"1":"1 — explosão: zonas 0/20 ou explosivos","0.1":"10⁻¹ — explosão zonas 1/21 · incêndio alto","0.01":"10⁻² — risco de incêndio normal","0.001":"10⁻³ — zonas 2/22 · incêndio baixo","0":"0 — sem risco de incêndio"},
  hz:{"1":"1 — sem perigo especial","2":"2 — baixo pânico (até 2 pavimentos, < 100 pessoas)","5":"5 — pânico médio ou evacuação difícil","10":"10 — alto nível de pânico"},
  LF:{"0.1":"10⁻¹ — risco de explosão, hospital, hotel, escola","0.05":"5×10⁻² — entretenimento público, igreja, museu","0.02":"2×10⁻² — industrial, comercial","0.01":"10⁻² — outros (rural, depósitos)"},
  CI:{aerea:["Aérea",1],enterrada:["Enterrada",0.5],malha:["Enterrada em malha de aterramento",0.01]},
  CE:{rural:["Rural",1],suburbano:["Suburbano",0.5],urbano:["Urbano",0.1],urbanoAlto:["Urbano, edifícios > 20 m",0.01]},
  CT:{bt:["Linha BT",1],at:["Linha AT com transformador AT/BT",0.2]},
  LT:1e-2,RT:1e-5
};

/* ============================================================
   PRODUTIVIDADE DE MÃO DE OBRA (h por unidade) — referências típicas de orçamento, ajustar à equipe
   ============================================================ */
const PROD={caboFino:0.04,caboMedio:0.08,caboGrosso:0.15,eletrodutoAparente:0.30,eletrodutoEmbutido:0.40,eletrodutoEnterrado:0.20,
  eletrocalha:0.50,ponto:0.60,disjuntor:0.30,dr:0.40,quadroBase:4,quadroCirc:0.40,motorDireta:3,motorEspecial:6,spdaCabo:0.15,haste:1.0,
  capacitor:6,emergencia:0.5,teste:0.5,engBase:16,engCirc:0.6,engQuadro:2,engLum:8,engSpda:12,engMT:16,implBase:8,implMotor:1.5};
