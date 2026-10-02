"""Testes automáticos do Software de Apoio a Projetos de Instalações Elétricas Agroindustriais.

Carrega os scripts do app num motor V8 (sem navegador), com um DOM mínimo simulado, e verifica
cálculos, telas, importação/exportação, PDF e DXF em vários cenários.

Requisitos:  pip install mini-racer
Uso (na pasta raiz):  python testes/testar.py            → só verificações
                      python testes/testar.py --pdf      → também grava testes/saida/exemplo.pdf e planta.dxf
"""
import os
import sys
import time
import pathlib

try:
    from py_mini_racer import MiniRacer
except ImportError:
    sys.exit("Instale o motor JavaScript: pip install mini-racer")

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "testes" / "saida"

DOM = r"""
var __timers=[];function setTimeout(f){__timers.push(f);return __timers.length;}function clearTimeout(){}
function __flush(){let n=0;while(__timers.length&&n<1000){const f=__timers.shift();try{f();}catch(e){}n++;}}
function atob(b){const A="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";let o="",buf=0,n=0;for(const c of b){if(c==="=")break;const v=A.indexOf(c);if(v<0)continue;buf=(buf<<6)|v;n+=6;if(n>=8){n-=8;o+=String.fromCharCode((buf>>n)&255);}}return o;}
function El(id){this.id=id;this.innerHTML="";this.textContent="";this.hidden=false;this.value="";this.style={};this.dataset={};this.firstElementChild={style:{}};}
["setAttribute","removeAttribute","scrollIntoView","addEventListener","click","remove"].forEach(k=>El.prototype[k]=function(){});
El.prototype.appendChild=function(c){return c;};El.prototype.querySelector=function(){return null;};El.prototype.getBoundingClientRect=function(){return {left:0,top:0,bottom:0};};
El.prototype.matches=function(){return false;};El.prototype.contains=function(){return false;};
var __els={};var document={body:new El("body"),activeElement:null,getElementById:function(id){return __els[id]||(__els[id]=new El(id));},
  querySelector:function(){return null;},querySelectorAll:function(){return [];},addEventListener:function(){},createElement:function(t){return new El(t);}};
var window=globalThis;window.innerWidth=1400;window.addEventListener=function(){};window.scrollTo=function(){};var self=globalThis;
var __ls={};var localStorage={getItem:k=>__ls[k]??null,setItem:(k,v)=>{__ls[k]=String(v);},removeItem:k=>{delete __ls[k];}};
var location={protocol:"http:"};var navigator={};function Blob(parts,o){this.parts=parts;this.type=o&&o.type;}
var URL={createObjectURL:()=>"blob:x",revokeObjectURL:()=>{}};var __saida={};
"""

TESTES = r"""
(function(){
const falhas=[],ok=[];const t=(nome,cond,info="")=>{(cond?ok:falhas).push(nome+(cond?"":" → "+info));};
oferecer=async function(fn,blob){__saida[fn.split(".").pop()]=blob.parts[0];return true;};
const views=()=>{const e=[];STEPS.forEach((st,i)=>{cur=i;try{V[st.k]();}catch(x){e.push(st.k+": "+x.message);}});return e;};

// 1) exemplo
S=sample();calc();
t("exemplo: todas as etapas renderizam",views().length===0,views().join("; "));
t("exemplo: todos os circuitos com solução",R.out.every(o=>o.s));
t("exemplo: queda total dentro do limite",R.out.every(o=>o.dvOk));
t("sub-quadro: QF-PROD soma a carga do QD-SECADOR",R.quadros.find(q=>q.q.nome==="QF-PROD").S>R.quadros.find(q=>q.q.nome==="QD-SECADOR").S);
t("Tab. 58: PE de 150 mm² = 95 mm²",sPE(150)===95);
t("Tab. 41: FCRS 1,0 K·m/W = 1,18",Math.abs((S.par.rhoSolo=1,fcrho("D"))-1.18)<1e-9);S.par.rhoSolo=2.5;calc();
t("Icc decresce ao longo da cadeia",R.quadros.every(q=>!q.pai||q.iccMax<=R.quadros.find(z=>z.q.nome===q.pai).iccMax+1e-9));
t("seccionamento automático verificado em todos os circuitos",R.out.every(o=>o.sec&&o.sec.ok));
t("seletividade dos alimentadores internos ≥ 1,6",R.selet.filter(x=>x.quadro!==S.quadros[0].nome).every(x=>x.ok));
t("banco de capacitores dimensionado",R.fp.need&&R.fp.std>0&&R.fp.on);
t("aterramento com resistência estimada",R.terra.Rfinal>0);
t("análise de risco R1 calculada",R.spda.risco.nenhum.R1>0&&R.spda.risco.I.R1<R.spda.risco.nenhum.R1);
const m=materiais();
t("materiais: luminárias, tomadas, suportes, quadros, emergência",["Luminária LED","Tomada 2P+T","Suporte para eletrocalha","Quadro QGBT","emergência autônoma","Banco de capacitores","Barramento de equipotencialização"].every(k=>m.some(x=>x.d.includes(k))));
t("estimativa de horas positiva",(h=>h.eng>0&&h.serv>0&&h.impl>0)(horasEstimadas()));
const ex=exportObj(false),n=normalizar(JSON.parse(JSON.stringify(ex)));
t("JSON: ida e volta preserva quadros, ambientes e revisões",JSON.stringify(n.quadros)===JSON.stringify(S.quadros)&&JSON.stringify(n.ambientes)===JSON.stringify(S.ambientes)&&n.revisoes.length===S.revisoes.length);
const velho=JSON.parse(JSON.stringify(ex));velho.quadros.forEach(q=>{delete q.pai;delete q.infl;});delete velho.extras;delete velho.orc;delete velho.estrutura;delete velho.revisoes;velho.ambientes.forEach(a=>{delete a.infl;delete a.zona;});
t("JSON antigo é importado",(()=>{try{S=normalizar(velho);calc();return views().length===0;}catch(e){return false;}})());
const ciclo=JSON.parse(JSON.stringify(ex));ciclo.quadros[1].pai="QD-SECADOR";
t("ciclo entre quadros é desfeito",normalizar(ciclo).quadros[1].pai==="QGBT");
S=sample();calc();
t("NBR 5419-3: l1 da Fig. 3 para NP I e II",Math.abs(l1_5419("I",1000)-20)<1e-9&&Math.abs(l1_5419("II",1000)-9)<1e-9&&l1_5419("III",3000)===5);
t("NBR 5419-3: descida em cada canto e distância de segurança",R.spda.nDesc>=4&&R.spda.sSeg>0&&descidasPos(36,13,R.spda.nDesc).length===R.spda.nDesc);
t("NBR 5419-3: cobertura metálica sobre zona de poeira mantém a malha",R.spda.cobMetZona&&R.spda.captacao>0&&R.issues.some(x=>x.includes("Anexo D")));
t("preços de referência: todos os itens calculados têm estimativa",(c=>c.nEst>0&&c.m.filter(r=>r.ext==null).every(r=>r.pr>0))(custos()));
S.precos={[materiais()[0].key]:999};t("orçamento: hora pelo CUB e pelo técnico 40 h, tributos discriminados e lucro 40 %",(o=>Math.abs(o.srv[0].vh-295)<1e-6&&Math.abs(o.srv[1].vh-3800*1.8/200)<1e-6&&Math.abs(o.imp-16.33)<1e-9&&S.orc.lucro===40)(orcamento()));
t("inversor e soft-starter: referência WEG 5 cv",precoRef("cmd","Inversor de frequência — motor 5 cv / 3,68 kW","pç")===3600&&precoRef("cmd","Soft-starter trifásica — motor 5 cv / 3,68 kW","pç")===1700);
t("preço informado substitui a referência",materiais()[0].pu===999&&!materiais()[0].est);S.precos={};
t("NBR 5444: geometria dos símbolos (tomada a meia altura, quadro geral)",sim5444("tom",{alt:"media"}).some(g=>g.p&&g.f===true)&&sim5444("qdg").some(g=>g.p&&g.f===true));

// 2) projeto em branco
S=blank();calc();t("projeto em branco: etapas renderizam",views().length===0,views().join("; "));

// 3) média tensão e esquema TT
S=sample();S.forn.atend="MT";S.forn.aterr="TT";calc();
t("MT: transformador e Icc do secundário",R.mt&&R.mt.kva>=R.ent.S&&R.mt.icc>0);
t("MT/TT: etapas renderizam",views().length===0,views().join("; "));
t("TT: seccionamento por DR",R.out.filter(o=>o.sec).every(o=>o.sec.viaDR));
t("MT: subestação na lista de materiais",materiais().some(x=>x.g==="mt"));
S=sample();S.forn.atend="MT";S.par.tipoSub="abrigada";S.forn.iccMT=10;S.forn.Lmt=40;calc();
t("NBR 14039: classe 15 kV, cabo de MT por curto-circuito e disjuntor com relé",R.mt.cl.cls===15&&R.mt.sMT===50&&R.mt.disj&&materiais().some(x=>x.d.includes("Relé secundário")));
S.par.tipoSub="integrada";calc();t("NBR 14039: subestação integrada exige transformador a seco",R.mt.seco&&materiais().some(x=>x.d.includes("a seco")));

// 4) monofásico
S=sample();S.forn.sistema="1F-220";calc();t("monofásico: etapas renderizam (ligações incompatíveis sinalizadas)",views().length===0&&R.incompat.length>0,views().join("; "));

// 5) DXF
S=sample();calc();exportarDXF();const dx=__saida.dxf;
t("DXF gerado com cabeçalho e EOF",!!dx&&(s=>s.startsWith("0\r\nSECTION")&&s.trim().endsWith("EOF"))(String.fromCharCode.apply(null,Array.from(dx))));
return JSON.stringify({ok,falhas});
})()
"""


def main():
    ctx = MiniRacer()
    ctx.eval(DOM)
    for f in ["js/vendor/pdf-lib.min.js", "js/logos.js", "js/tabelas.js", "js/app.js", "js/servidor.js"]:
        ctx.eval((RAIZ / f).read_text(encoding="utf-8"), timeout_sec=30)
    import json
    r = json.loads(ctx.eval(TESTES, timeout_sec=120))
    for n in r["ok"]:
        print("  ok    ", n)
    for n in r["falhas"]:
        print("  FALHOU", n)
    if "--pdf" in sys.argv:
        SAIDA.mkdir(parents=True, exist_ok=True)
        ctx.eval(("S=sample();S.forn.atend='MT';S.par.tipoSub='abrigada';S.forn.iccMT=10;S.forn.Lmt=40;" if "--mt" in sys.argv else "S=sample();")+"cur=STEPS.length-1;render(true);var __fim=false,__erro=null;gerarPDF().then(()=>{__fim=true;},e=>{__erro=String(e);__fim=true;});")
        for _ in range(600):
            ctx.eval("__flush()")
            if ctx.eval("__fim"):
                break
            time.sleep(0.05)
        msg = ctx.eval("document.getElementById('pdfMsg').textContent")
        for ext in ["pdf", "dxf"]:
            hx = ctx.eval("(function(){const u=__saida['%s'];if(!u)return '';const h='0123456789abcdef';let a=[];for(let i=0;i<u.length;i++)a.push(h[u[i]>>4]+h[u[i]&15]);return a.join('');})()" % ext, timeout_sec=120)
            if hx:
                (SAIDA / f"exemplo.{ext}").write_bytes(bytes.fromhex(hx))
        print("  PDF:", msg, "→", SAIDA)
        if "Falha" in (msg or ""):
            r["falhas"].append("PDF: " + msg)
    print(f"\n{len(r['ok'])} verificações ok, {len(r['falhas'])} falha(s).", flush=True)
    os._exit(1 if r["falhas"] else 0)


if __name__ == "__main__":
    main()
