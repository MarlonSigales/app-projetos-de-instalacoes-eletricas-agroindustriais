"use strict";
/* Integração com api.php: salvar/abrir projetos na pasta projetos/ do servidor local.
   Só funciona quando o site é aberto por um servidor PHP (ex.: php -S localhost:8000). */
const SRV={ok:false};
async function api(acao,{metodo="GET",corpo=null,params={}}={}){
  const q=new URLSearchParams({acao,...params});
  const r=await fetch("api.php?"+q,{method:metodo,headers:corpo?{"Content-Type":"application/json"}:{},body:corpo?JSON.stringify(corpo):null});
  let d;try{d=await r.json();}catch(e){throw new Error("resposta inválida do servidor (o PHP está rodando?)");}
  if(!r.ok||d.erro)throw new Error(d.erro||("HTTP "+r.status));
  return d;
}
function srvMsg(t,tipo=""){const el=document.getElementById("srvStatus");el.className="note "+tipo;el.textContent=t;}
async function srvStatus(){
  if(location.protocol==="file:"){SRV.ok=false;srvMsg("Aberto como arquivo local: salvar em projetos/ exige o servidor PHP. Rode “php -S localhost:8000” nesta pasta e acesse http://localhost:8000. A exportação/importação .json continua funcionando.","warn");return;}
  try{const d=await api("status");SRV.ok=true;srvMsg(`Servidor PHP ${d.php} ativo. Pasta: ${d.pasta}${d.gravavel?"":" (sem permissão de escrita!)"}`,d.gravavel?"ok":"bad");srvListar();}
  catch(e){SRV.ok=false;srvMsg("api.php não respondeu: "+e.message,"bad");}
}
async function srvListar(){
  const tb=document.getElementById("srvLista");if(!SRV.ok){tb.innerHTML=`<tr><td colspan="4">Servidor indisponível.</td></tr>`;return;}
  try{const d=await api("listar");
    tb.innerHTML=d.projetos.length?d.projetos.map(p=>`<tr><td class="mono">${esc(p.arquivo)}</td><td>${esc(p.obra||"—")}</td><td class="mono">${esc(p.atualizado)}</td><td style="display:flex;gap:6px"><button class="btn small" type="button" data-srvabrir="${esc(p.arquivo)}">Abrir</button><button class="btn small danger" type="button" data-srvexcluir="${esc(p.arquivo)}">Excluir</button></td></tr>`).join(""):`<tr><td colspan="4">Nenhum projeto salvo ainda.</td></tr>`;
  }catch(e){tb.innerHTML=`<tr><td colspan="4">Erro: ${esc(e.message)}</td></tr>`;}
}
let excluirPendente=null;
document.addEventListener("click",async e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.id==="btnSrv"){const pn=document.getElementById("serverPanel");pn.hidden=!pn.hidden;b.setAttribute("aria-expanded",String(!pn.hidden));if(!pn.hidden){const n=document.getElementById("srvNome");if(!n.value)n.value=slug(S.id.obra);srvStatus();}return;}
  if(b.id==="btnSrvAtualizar"){srvListar();return;}
  if(b.id==="btnSrvSalvar"){
    if(!SRV.ok){toast("Servidor PHP indisponível.");return;}
    const nome=document.getElementById("srvNome").value.trim()||slug(S.id.obra);
    try{const d=await api("salvar",{metodo:"POST",corpo:{nome,projeto:exportObj(document.getElementById("srvAnexos").checked)}});toast("Salvo em projetos/"+d.arquivo);srvListar();}
    catch(err){toast("Não foi possível salvar: "+err.message);}return;}
  if(b.dataset.srvabrir){try{const d=await api("abrir",{params:{arquivo:b.dataset.srvabrir}});aplicarImport(d.projeto);document.getElementById("srvNome").value=b.dataset.srvabrir.replace(/\.json$/,"");}catch(err){toast("Não foi possível abrir: "+err.message);}return;}
  if(b.dataset.srvexcluir){const f=b.dataset.srvexcluir;
    if(excluirPendente!==f){excluirPendente=f;b.textContent="Confirmar exclusão";setTimeout(()=>{if(excluirPendente===f){excluirPendente=null;b.textContent="Excluir";}},4000);return;}
    excluirPendente=null;try{await api("excluir",{metodo:"POST",corpo:{arquivo:f}});toast("Excluído: "+f);srvListar();}catch(err){toast("Não foi possível excluir: "+err.message);}return;}
});
