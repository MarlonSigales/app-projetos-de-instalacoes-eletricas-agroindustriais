"use strict";
/* ============================================================
   Sistema fotovoltaico off-grid — UFPel · Engenharia Agrícola
   Dimensionamento pelo pior caso (mês de menor irradiação), JSON e PDF
   ============================================================ */
const FORMATO = "offgrid-agro", VERSAO = 1, LS = "offgrid-agro-v1";
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DIAS_MES = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344]; // dias representativos (Klein)

/* --------- tipos de bateria: curva ciclos × profundidade de descarga (pontos típicos de catálogo) --------- */
const TIPOS = {
  li: { nome: "Lítio LiFePO4 (com BMS)", dod: 0.8, dodMax: 0.9, eta: 0.95, vidaCal: 12, cCarga: 0.5, vMin: 0.90, vChg: 1.18, ftemp: 1.0, vCorte: 0.86, vcel: 3.2, dvCel: 0.03,
        ocv: [[0, 2.8], [0.05, 3.0], [0.1, 3.2], [0.2, 3.22], [0.3, 3.25], [0.4, 3.26], [0.5, 3.27], [0.6, 3.28], [0.7, 3.30], [0.8, 3.32], [0.9, 3.34], [1, 3.40]],
        curva: [[0.3, 12000], [0.5, 9000], [0.8, 6000], [1.0, 3500]],
        unid: { nome: "Bateria LiFePO4 51,2 V 100 Ah (5,12 kWh) rack", v: 51.2, ah: 100, ri: 20, imax: 100, ipico: 150, tpico: 10, cca: 0, bms: "integrado" },
        obs: "Aceita descarga profunda e carga rápida; exige BMS com comunicação com o inversor e fusível de alta capacidade de interrupção (classe T ou NH)." },
  pb: { nome: "Chumbo-ácido estacionária ventilada", dod: 0.5, dodMax: 0.8, eta: 0.85, vidaCal: 5, cCarga: 0.1, vMin: 0.875, vChg: 1.2, ftemp: 0.9, vCorte: 0.875, vcel: 2, dvCel: 0.05,
        ocv: [[0, 1.98], [0.25, 2.01], [0.5, 2.04], [0.75, 2.075], [1, 2.108]],
        curva: [[0.2, 1800], [0.5, 800], [0.8, 450]],
        unid: { nome: "Bateria estacionária 12 V 220 Ah (C20)", v: 12, ah: 220, ri: 4, imax: 220, ipico: 1100, tpico: 5, cca: 0, bms: "nao" },
        obs: "Mais barata por kWh nominal, mas só deve descer até ~50%; emite hidrogênio na carga (sala ventilada) e perde vida rápido se ficar descarregada." },
  agm: { nome: "Chumbo-ácido VRLA (AGM/Gel)", dod: 0.5, dodMax: 0.7, eta: 0.85, vidaCal: 6, cCarga: 0.2, vMin: 0.875, vChg: 1.2, ftemp: 0.9, vCorte: 0.875, vcel: 2, dvCel: 0.05,
        ocv: [[0, 1.98], [0.25, 2.02], [0.5, 2.05], [0.75, 2.09], [1, 2.13]],
        curva: [[0.2, 1500], [0.5, 650], [0.8, 350]],
        unid: { nome: "Bateria VRLA AGM 12 V 200 Ah (C20)", v: 12, ah: 200, ri: 3.5, imax: 200, ipico: 1000, tpico: 5, cca: 0, bms: "nao" },
        obs: "Selada, sem manutenção de eletrólito; sensível a sobretemperatura e a sobrecarga." }
};
const INV_COM = [1000, 1500, 2000, 3000, 3500, 5000, 6000, 8000, 10000, 12000];
const DISJ = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250];
const FUS_PV = [10, 12, 15, 16, 20, 25, 30, 32];
const FUS_BAT = [63, 80, 100, 125, 160, 200, 250, 300, 355, 400, 500, 630];
const SEC = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];
const IZ = [17.5, 24, 32, 41, 57, 76, 101, 125, 151, 192, 232, 269, 309, 353, 415]; // NBR 5410 Tab. 36, B1, 2 condutores carregados, Cu/PVC

/* --------- preços de referência (out/2026); editáveis --------- */
function precosPadrao() {
  return {
    mod: { d: "Módulo fotovoltaico 550 W monocristalino", un: "pç", pu: 850, f: "Clarke Energia, mai/2026: R$ 750–1.500 (550 W)" },
    bat_li: { d: "Bateria LiFePO4 51,2 V 100 Ah 5,12 kWh", un: "pç", pu: 6989, f: "Meu Gerador, out/2026 (Dyness DLC5.0C, Pix)" },
    bat_pb: { d: "Bateria estacionária 12 V 220 Ah", un: "pç", pu: 1559, f: "Atacadão das Baterias, out/2026 (Freedom DF4100)" },
    bat_agm: { d: "Bateria VRLA AGM 12 V 200 Ah", un: "pç", pu: 1900, f: "estimativa – confirmar cotação" },
    ctrl: { d: "Controlador de carga MPPT 60 A 12/24/48 V (Voc 250 V)", un: "pç", pu: 1032, f: "Minha Casa Solar, out/2026 (SRNE MC4860N25)" },
    inv: { d: "Inversor off-grid senoidal pura 5 kW 48 V (carregador)", un: "pç", pu: 3951, f: "Meu Gerador, out/2026 (MUST PV30-5048)" },
    estr: { d: "Estrutura de fixação (por módulo)", un: "pç", pu: 180, f: "estimativa – confirmar cotação" },
    sbox: { d: "String box CC (seccionadora + DPS CC + fusíveis gPV)", un: "pç", pu: 650, f: "estimativa – confirmar cotação" },
    fusbat: { d: "Fusível NH/classe T + base para banco de baterias", un: "cj", pu: 350, f: "estimativa – confirmar cotação" },
    seccc: { d: "Seccionadora CC de bateria (chave rotativa)", un: "pç", pu: 280, f: "estimativa – confirmar cotação" },
    disjcc: { d: "Disjuntor CC 2P (controlador/inversor)", un: "pç", pu: 120, f: "estimativa – confirmar cotação" },
    barra: { d: "Barramento CC (+/−) isolado com tampa", un: "cj", pu: 260, f: "estimativa – confirmar cotação" },
    shunt: { d: "Monitor de bateria com shunt", un: "pç", pu: 450, f: "estimativa – confirmar cotação" },
    qdca: { d: "Quadro CA: disjuntores, DR 30 mA, DPS CA, barramentos", un: "cj", pu: 750, f: "estimativa – confirmar cotação" },
    ats: { d: "Chave de transferência automática (ATS) com intertravamento", un: "pç", pu: 1200, f: "estimativa – confirmar cotação" },
    rev: { d: "Chave reversora manual 1-0-2 com intertravamento", un: "pç", pu: 420, f: "estimativa – confirmar cotação" },
    cabo_fv: { d: "Cabo solar 1,8 kV CC (preço por m·mm²)", un: "m·mm²", pu: 1.6, f: "estimativa – confirmar cotação" },
    cabo_bat: { d: "Cabo flexível 1 kV para bateria (preço por m·mm²)", un: "m·mm²", pu: 1.4, f: "estimativa – confirmar cotação" },
    cabo_ca: { d: "Cabo flexível 750 V/1 kV CA (preço por m·mm²)", un: "m·mm²", pu: 1.1, f: "estimativa – confirmar cotação" },
    mc4: { d: "Conectores MC4 (par)", un: "par", pu: 18, f: "estimativa – confirmar cotação" },
    terra: { d: "Aterramento: haste 5/8\" × 2,4 m, cabo 16 mm², conexões", un: "cj", pu: 380, f: "estimativa – confirmar cotação" },
    abrigo: { d: "Abrigo/rack ventilado para baterias e equipamentos", un: "cj", pu: 900, f: "estimativa – confirmar cotação" },
    supercap: { d: "Módulo supercapacitor 16 V 500 F (ESR ≈ 2 mΩ, balanceamento interno)", un: "pç", pu: 3500, f: "estimativa – confirmar cotação" },
    supercap58: { d: "Módulo supercapacitor 16 V 58 F (ESR ≈ 22 mΩ, balanceamento interno)", un: "pç", pu: 1600, f: "estimativa – confirmar cotação" },
    precarga: { d: "Kit de pré-carga do banco capacitivo (resistor de potência, chave, fusível)", un: "cj", pu: 250, f: "estimativa – confirmar cotação" },
    bms_ext: { d: "BMS para células LiFePO4 com balanceamento ativo e comunicação", un: "pç", pu: 1800, f: "estimativa – confirmar cotação" },
    comm: { d: "Cabos/hub de comunicação BMS ↔ inversor (CAN/RS485)", un: "cj", pu: 150, f: "estimativa – confirmar cotação" },
    bal_pb: { d: "Balanceador/equalizador para baterias de 12 V em série", un: "pç", pu: 450, f: "estimativa – confirmar cotação" }
  };
}
function moPadrao() {
  return { heng: 12, peng: 200, hele: 24, pele: 120, haux: 24, paux: 45, km: 120, pkm: 1.8, desp: 300, bdi: 20, imp: 10,
           f: "Hora de eletricista com NR-10: R$ 150–250; residencial R$ 80–150 (TáContratado, set/2026). Engenharia e auxiliar: estimativa – ajuste à sua região." };
}

/* --------- estado --------- */
function novo() {
  return {
    formato: FORMATO, versao: VERSAO,
    id: { cliente: "", obra: "", local: "", municipio: "", rt: "", crea: "", data: new Date().toISOString().slice(0, 10) },
    local: { lat: "", lon: "", fonte: "", estacao: "", municipio: "", dist: "", rows: [], sel: 3, consultado: "", obs: "" },
    temp: { tmin: 0, tmax: 35 },
    cargas: [],
    crit: { vbanco: "auto", aut: 2, fnub: 0, nnub: 6, hfalta: 0, nfalta: 0, drec: 0, tbat: 25, tpart: 0.5, bat: "li", dod: 0.8, ftemp: 1.0, etaInv: 0.92, etaCabo: 0.97, pr: 0.80, vac: 220, fases: 1 },
    eq: {
      mod: { nome: "Módulo 550 W mono (144 células)", p: 550, voc: 49.6, vmp: 41.96, isc: 14.0, imp: 13.11, bvoc: -0.27, fusmax: 25 },
      bat: Object.assign({}, TIPOS.li.unid),
      ctrl: { nome: "Controlador MPPT 60 A (Voc 250 V)", imax: 60, vocmax: 250, p48: 3200 },
      inv: { nome: "Inversor off-grid 5 kW 48 V senoidal pura", p: 5000, surto: 2.0, eta: 0.92, carr: 60, vcorte: 0 }
    },
    backup: { tipo: "gerador", chave: "auto", pger: 0 },
    cabos: { lfv: 25, lbat: 2, lca: 20, dvfv: 2, dvbat: 1, dvca: 2 },
    estado: { ocv: "", cmed: "", rmed: "", ccamed: "", vmax: "", vmin: "", nivel: "celula", idade: "", ciclos: "" },
    precos: precosPadrao(), mo: moPadrao(), exemplo: false
  };
}
/* exemplo: sítio leiteiro na região de Pelotas (irradiação horizontal ilustrativa; consultar o SunData) */
function exemplo() {
  const s = novo();
  s.exemplo = true;
  s.id = { cliente: "Sítio Exemplo (dados fictícios)", obra: "Sistema off-grid para ordenha e resfriamento de leite", local: "Colônia, interior", municipio: "Pelotas/RS", rt: "Turma 2026.2", crea: "", data: new Date().toISOString().slice(0, 10) };
  s.local.lat = -31.6; s.local.lon = -52.45;
  s.local.fonte = "Exemplo de aula (irradiação horizontal ilustrativa; planos inclinados calculados pela ferramenta)";
  s.local.estacao = "Exemplo – região de Pelotas"; s.local.municipio = "Pelotas, RS"; s.local.dist = "—";
  const H = [6.40, 5.80, 4.90, 3.80, 2.90, 2.40, 2.60, 3.30, 4.10, 5.30, 6.30, 6.70];
  s.local.rows = linhasInclinadas(H, -31.6); s.local.sel = 3;
  s.local.obs = "Substitua estes valores pela consulta ao CRESESB/SunData da coordenada da obra.";
  s.temp = { tmin: -2, tmax: 36 };
  s.cargas = [
    { nome: "Ordenhadeira (motor 1 cv)", tipo: "CA", q: 1, w: 900, h: 2, fs: 1, kp: 5, crit: 1 },
    { nome: "Resfriador de leite (compressor)", tipo: "CA", q: 1, w: 1100, h: 6, fs: 1, kp: 5, crit: 1 },
    { nome: "Bomba d'água 1/2 cv", tipo: "CA", q: 1, w: 450, h: 1.5, fs: 1, kp: 4, crit: 1 },
    { nome: "Iluminação LED (galpão e casa)", tipo: "CA", q: 10, w: 15, h: 5, fs: 1, kp: 1, crit: 1 },
    { nome: "Geladeira residencial", tipo: "CA", q: 1, w: 150, h: 10, fs: 1, kp: 4, crit: 1 },
    { nome: "TV, roteador e carregadores", tipo: "CA", q: 1, w: 120, h: 6, fs: 1, kp: 1, crit: 0 },
    { nome: "Cerca elétrica (12 V CC)", tipo: "CC", q: 1, w: 5, h: 24, fs: 1, kp: 1, crit: 1 }
  ];
  s.backup = { tipo: "gerador", chave: "auto", pger: 0 };
  Object.assign(s.crit, { aut: 2, fnub: 0, nnub: 6, hfalta: 0, nfalta: 0, drec: 0, tbat: 25, tpart: 0.5 });
  s.estado = { ocv: 52.9, cmed: 97, rmed: 23, ccamed: "", vmax: 3.315, vmin: 3.29, nivel: "celula", idade: 1, ciclos: 320 };
  return s;
}

let S = carregar() || novo(), cur = 0;
function carregar() { try { const t = localStorage.getItem(LS); if (!t) return null; const o = JSON.parse(t); return o && o.formato === FORMATO ? mesclar(o) : null; } catch (e) { return null; } }
function persist() { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} }
function mesclar(o) { const b = novo(); const m = (a, c) => { for (const k in c) { if (c[k] && typeof c[k] === "object" && !Array.isArray(c[k]) && a[k] && typeof a[k] === "object") m(a[k], c[k]); else a[k] = c[k]; } return a; }; return m(b, o); }

/* --------- utilidades --------- */
const $ = (q, r = document) => r.querySelector(q);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const n = v => { const x = parseFloat(String(v).replace(",", ".")); return isFinite(x) ? x : 0; };
const fmt = (v, d = 1) => isFinite(v) ? Number(v).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";
const fmt0 = v => fmt(v, 0);
const brl = v => isFinite(v) ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
const pct = v => fmt(v * 100, 0) + "%";
const prox = (lista, v) => lista.find(x => x >= v - 1e-9) ?? null;
function getP(path) { return path.split(".").reduce((o, k) => o?.[k], S); }
function setP(path, val) { const ks = path.split("."); const last = ks.pop(); const o = ks.reduce((a, k) => a[k], S); o[last] = val; }
function toast(m) { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 3500); }

/* ============================================================
   IRRADIAÇÃO: SunData (parser), NASA POWER e transposição
   ============================================================ */
function lerSunData(txt) {
  const t = String(txt || "").replace(/ /g, " ").replace(/\r/g, "");
  const blocos = t.split(/Esta[çc][ãa]o\s*:/i);
  const lista = [];
  const reLin = /(Plano Horizontal|[ÂA]ngulo igual (?:a|à) latitude|Maior m[ée]dia anual|Maior m[íi]nimo mensal)[\s|]*(\d{1,2})\s*°?\s*([NS])?[\s|]*((?:-?\d+[.,]\d+[\s|]*){12,14})/gi;
  const partes = blocos.length > 1 ? blocos.slice(1).map(b => "Estação:" + b) : [t];
  for (const b of partes) {
    const rows = []; let m; reLin.lastIndex = 0;
    while ((m = reLin.exec(b))) {
      const nums = m[4].match(/-?\d+[.,]\d+/g).map(x => parseFloat(x.replace(",", ".")));
      const meses = nums.slice(0, 12);
      rows.push({ nome: normNome(m[1]), ang: parseInt(m[2], 10), dir: m[3] || "N", m: meses, media: nums[12] ?? media(meses), delta: nums[13] ?? (Math.max(...meses) - Math.min(...meses)) });
    }
    if (!rows.length) continue;
    const g = (re) => { const x = b.match(re); return x ? x[1].trim() : ""; };
    lista.push({
      estacao: g(/Esta[çc][ãa]o\s*:\s*\|?\s*([^\n|]+)/i),
      municipio: g(/Munic[íi]pio\s*:\s*\|?\s*([^\n|]+)/i),
      lat: g(/Latitude\s*:?\s*\|?\s*([\d.,]+\s*°?\s*[NS]?)/i),
      lon: g(/Longitude\s*:?\s*\|?\s*([\d.,]+\s*°?\s*[OWL]?)/i),
      dist: g(/Dist[âa]ncia[^:]*:\s*\|?\s*([\d.,]+\s*km)/i),
      rows: ordenar(rows)
    });
  }
  return lista;
}
function normNome(s) { s = s.toLowerCase(); if (s.includes("horizontal")) return "Plano Horizontal"; if (s.includes("latitude")) return "Ângulo igual a latitude"; if (s.includes("média") || s.includes("media")) return "Maior média anual"; return "Maior mínimo mensal"; }
function ordenar(rows) { const ord = ["Plano Horizontal", "Ângulo igual a latitude", "Maior média anual", "Maior mínimo mensal"]; return ord.map(o => rows.find(r => r.nome === o)).filter(Boolean); }
const media = a => a.reduce((x, y) => x + y, 0) / a.length;

/* transposição horizontal → inclinado (Liu-Jordan isotrópico, difusa de Erbs mensal, albedo 0,2), face voltada ao equador */
function inclinado(H, latDeg, beta, rho = 0.2) {
  const r = Math.PI / 180, phi = latDeg * r, b = beta * r, sul = latDeg < 0;
  return H.map((h, i) => {
    const d = DIAS_MES[i], dec = 23.45 * r * Math.sin(2 * Math.PI * (284 + d) / 365);
    const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(dec))));
    const H0 = 24 * 3600 * 1367 / Math.PI * (1 + 0.033 * Math.cos(2 * Math.PI * d / 365)) * (Math.cos(phi) * Math.cos(dec) * Math.sin(ws) + ws * Math.sin(phi) * Math.sin(dec)) / 3.6e6;
    const kt = Math.min(0.8, Math.max(0.1, h / H0));
    const fd = ws <= 81.4 * r ? 1.391 - 3.560 * kt + 4.189 * kt * kt - 2.137 * kt ** 3 : 1.311 - 3.022 * kt + 3.427 * kt * kt - 1.821 * kt ** 3;
    const pb = sul ? phi + b : phi - b;
    const wsl = Math.min(ws, Math.acos(Math.max(-1, Math.min(1, -Math.tan(pb) * Math.tan(dec)))));
    const Rb = (Math.cos(pb) * Math.cos(dec) * Math.sin(wsl) + wsl * Math.sin(pb) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec) * Math.sin(ws) + ws * Math.sin(phi) * Math.sin(dec));
    return h * ((1 - fd) * Math.max(0, Rb) + fd * (1 + Math.cos(b)) / 2 + rho * (1 - Math.cos(b)) / 2);
  });
}
function linhasInclinadas(H, lat) {
  const lin = (nome, ang, m) => ({ nome, ang, dir: lat < 0 ? "N" : "S", m: m.map(v => Math.round(v * 100) / 100), media: Math.round(media(m) * 100) / 100, delta: Math.round((Math.max(...m) - Math.min(...m)) * 100) / 100 });
  let bMed = 0, vMed = -1, bMin = 0, vMin = -1;
  for (let b = 0; b <= 70; b++) { const m = inclinado(H, lat, b), a = media(m), mi = Math.min(...m); if (a > vMed) { vMed = a; bMed = b; } if (mi > vMin) { vMin = mi; bMin = b; } }
  const la = Math.round(Math.abs(lat));
  return [lin("Plano Horizontal", 0, H), lin("Ângulo igual a latitude", la, inclinado(H, lat, la)), lin("Maior média anual", bMed, inclinado(H, lat, bMed)), lin("Maior mínimo mensal", bMin, inclinado(H, lat, bMin))];
}
async function buscarSunData() {
  const lat = n(S.local.lat), lon = n(S.local.lon), msg = $("#irrMsg");
  if (!lat || !lon) { toast("Informe a latitude e a longitude (ou use a localização atual)."); return; }
  msg.className = "note"; msg.textContent = "Consultando o CRESESB/SunData pelo servidor local…";
  try {
    const r = await fetch(`sundata.php?lat=${lat}&lon=${lon}`, { cache: "no-store" });
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("json")) throw new Error("o servidor PHP local não está ativo (abra com  php -S localhost:8000  na pasta do app)");
    const j = await r.json();
    if (!j.ok) throw new Error(j.erro || "falha na consulta");
    const est = lerSunData(j.texto);
    if (!est.length) throw new Error("a página do SunData respondeu, mas a tabela não foi reconhecida");
    S._estacoes = est; aplicarEstacao(0, "CRESESB/SunData (consulta automática em " + new Date().toLocaleDateString("pt-BR") + ")");
    msg.className = "note ok"; msg.innerHTML = `<b>CRESESB/SunData:</b> ${est.length} estação(ões) próximas encontradas. Selecionada a mais próxima; troque abaixo se quiser.`;
  } catch (e) {
    msg.className = "note warn";
    msg.innerHTML = `<b>CRESESB indisponível por aqui:</b> ${esc(e.message)}. Use a <b>consulta manual</b> (abrir o SunData, copiar a tabela e colar abaixo) ou a alternativa <b>NASA POWER</b>.`;
  }
  render();
}
function aplicarEstacao(i, fonte) {
  const e = S._estacoes[i]; if (!e) return;
  Object.assign(S.local, { estacao: e.estacao, municipio: e.municipio, dist: e.dist, rows: e.rows, fonte, consultado: new Date().toISOString() });
  S.local.sel = Math.max(0, e.rows.findIndex(r => r.nome === "Maior mínimo mensal"));
  persist();
}
async function buscarNASA() {
  const lat = n(S.local.lat), lon = n(S.local.lon), msg = $("#irrMsg");
  if (!lat || !lon) { toast("Informe a latitude e a longitude."); return; }
  msg.className = "note"; msg.textContent = "Consultando a NASA POWER (climatologia mensal)…";
  try {
    const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN,T2M_MIN,T2M_MAX&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;
    const j = await (await fetch(url)).json();
    const p = j.properties.parameter, k = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const H = k.map(m => p.ALLSKY_SFC_SW_DWN[m]);
    S.local.rows = linhasInclinadas(H, lat); S.local.sel = 3;
    S.local.fonte = "NASA POWER (climatologia; planos inclinados calculados pela ferramenta) — alternativa ao CRESESB";
    S.local.estacao = "Ponto da grade NASA POWER"; S.local.municipio = ""; S.local.dist = "—"; S.local.consultado = new Date().toISOString();
    if (p.T2M_MIN) S.temp.tmin = Math.floor(Math.min(...k.map(m => p.T2M_MIN[m])) - 3);
    if (p.T2M_MAX) S.temp.tmax = Math.ceil(Math.max(...k.map(m => p.T2M_MAX[m])) + 3);
    msg.className = "note ok"; msg.innerHTML = "<b>NASA POWER:</b> irradiação horizontal mensal recebida; as linhas inclinadas foram calculadas. Para o projeto oficial, confira com o CRESESB.";
    persist();
  } catch (e) { msg.className = "note bad"; msg.textContent = "Falha na NASA POWER: " + e.message; }
  render();
}
function usarLocalizacao() {
  if (!navigator.geolocation) { toast("Navegador sem geolocalização."); return; }
  navigator.geolocation.getCurrentPosition(p => { S.local.lat = +p.coords.latitude.toFixed(4); S.local.lon = +p.coords.longitude.toFixed(4); persist(); render(); toast("Localização obtida: " + S.local.lat + ", " + S.local.lon); },
    e => toast("Não foi possível obter a localização (" + e.message + "). Digite a coordenada."), { enableHighAccuracy: true, timeout: 12000 });
}
function colarSunData() {
  const t = $("#colar").value; const est = lerSunData(t);
  if (!est.length) { toast("Tabela não reconhecida. Copie da linha do nome da estação até a linha “Maior mínimo mensal”."); return; }
  S._estacoes = est; aplicarEstacao(0, "CRESESB/SunData (tabela colada em " + new Date().toLocaleDateString("pt-BR") + ")"); render(); toast("Tabela do SunData lida: " + est.length + " estação(ões).");
}
function sunDataURL() { return "https://cresesb.cepel.br/index.php?section=sundata"; }

/* ============================================================
   CÁLCULOS
   ============================================================ */
function ciclos(dod, curva) {
  const c = curva.slice().sort((a, b) => a[0] - b[0]); const d = Math.max(0.05, Math.min(1, dod));
  let i = c.findIndex(p => p[0] >= d); if (i <= 0) i = 1; if (i === -1) i = c.length - 1;
  const [x0, y0] = c[i - 1], [x1, y1] = c[i];
  const k = Math.log(y1 / y0) / Math.log(x1 / x0); return y0 * Math.pow(d / x0, k);
}
function secao(I, L, V, dv, min) {
  const sdv = V > 0 && dv > 0 ? 2 * L * I / (56 * V * dv / 100) : 0;
  const iA = IZ.findIndex(z => z >= I);
  const sA = iA >= 0 ? SEC[iA] : 300;
  const s = SEC.find(x => x >= Math.max(sdv, sA, min || 0)) ?? 300;
  const dvReal = V > 0 ? 2 * L * I / (56 * s) / V * 100 : 0;
  return { s, sdv, sA, dv: dvReal, iz: IZ[SEC.indexOf(s)] ?? null };
}
const critica = l => !(l.crit === 0 || l.crit === false || l.crit === "0");
function ocvCel(T, soc) { const t = T.ocv; soc = Math.max(0, Math.min(1, soc)); for (let i = 1; i < t.length; i++) if (soc <= t[i][0]) { const [s0, v0] = t[i - 1], [s1, v1] = t[i]; return v0 + (v1 - v0) * (soc - s0) / (s1 - s0); } return t[t.length - 1][1]; }
function socOcv(T, v) { const t = T.ocv; if (v <= t[0][1]) return 0; for (let i = 1; i < t.length; i++) if (v <= t[i][1]) { const [s0, v0] = t[i - 1], [s1, v1] = t[i]; return s0 + (s1 - s0) * (v - v0) / (v1 - v0); } return 1; }
function estadoBat(R) {
  const e = S.estado || {}, T = R.T, ub = S.eq.bat, o = { tem: false };
  if (n(e.ocv) > 0) { o.tem = true; o.vcel = n(e.ocv) / R.ncelU; o.soc = socOcv(T, o.vcel); o.dod = 1 - o.soc; }
  if (n(e.cmed) > 0) { o.tem = true; o.sohC = n(e.cmed) / n(ub.ah); }
  if (n(e.rmed) > 0 && n(ub.ri) > 0) { o.tem = true; o.sohR = Math.max(0, Math.min(1, 1 - 0.2 * (n(e.rmed) - n(ub.ri)) / n(ub.ri))); }
  if (n(e.ccamed) > 0 && n(ub.cca) > 0) { o.tem = true; o.sohCCA = Math.min(1, n(e.ccamed) / n(ub.cca)); }
  const sohs = [["capacidade", o.sohC], ["resistência interna", o.sohR], ["CCA", o.sohCCA]].filter(x => x[1] != null);
  if (sohs.length) { const m = sohs.reduce((a, b) => b[1] < a[1] ? b : a); o.soh = Math.min(1, m[1]); o.sohFonte = m[0]; }
  if (o.soc != null) {
    const soh = o.soh ?? 1, rb = (n(e.rmed) || n(ub.ri)) / 1000 * R.bNs / R.bNp + R.Rcabo;
    o.soe = o.soc * soh * R.CinstWh;
    o.util = Math.max(0, o.soc - (1 - R.dod)) * soh * R.CinstWh;
    o.autH = R.Ebat > 0 ? o.util / R.Ebat * 24 : 0;
    o.vbank = ocvCel(T, o.soc) * R.ncel;
    o.sopV = rb > 0 ? R.vCorte * Math.max(0, o.vbank - R.vCorte) / rb : 0;
    o.sopBMS = n(ub.ipico) > 0 ? R.vCorte * n(ub.ipico) * R.bNp : Infinity;
    o.sop = Math.min(o.sopV, o.sopBMS); o.sopLim = o.sopBMS < o.sopV ? "limite de pico do BMS" : "resistência interna";
    o.sopAc = o.sop * n(S.eq.inv.eta);
  }
  if (n(e.vmax) > 0 && n(e.vmin) > 0) { o.tem = true; o.dv = n(e.vmax) - n(e.vmin); o.dvLim = e.nivel === "celula" ? T.dvCel : T.dvCel * R.ncelU; o.balOk = o.dv <= o.dvLim; }
  const idade = n(e.idade);
  o.anosProj = Math.max(0, R.vida - idade);
  if (o.soh != null && idade > 0 && o.soh < 1) { o.perdaAno = (1 - o.soh) / idade; o.anosTend = Math.max(0, (o.soh - 0.8) / o.perdaAno); }
  o.anosRest = Math.min(o.anosProj, o.anosTend ?? Infinity);
  if (n(e.ciclos) > 0) { o.ciclos = n(e.ciclos); o.cicRest = Math.max(0, R.ciclos - o.ciclos); }
  return o;
}
function calcular() {
  const R = { avisos: [], ok: [] };
  const c = S.crit, T = TIPOS[c.bat] || TIPOS.li, eq = S.eq;
  /* irradiação: pior caso */
  const rows = S.local.rows || [];
  const row = rows[S.local.sel] || rows[rows.length - 1];
  R.row = row;
  if (row) {
    R.hsp = Math.min(...row.m); R.mesCrit = row.m.indexOf(R.hsp); R.hspMed = row.media;
    if (row.nome !== "Maior mínimo mensal") R.avisos.push(`A linha selecionada é “${row.nome}”. Para off-grid, o critério é o pior caso: use a linha “Maior mínimo mensal”, que maximiza o mês mais fraco.`);
  } else { R.hsp = 0; R.avisos.push("Sem dados de irradiação: consulte o CRESESB na etapa 02."); }
  /* cargas */
  let ECA = 0, ECC = 0, Psim = 0, Pinst = 0, Pmot = 0, Pcc = 0;
  R.cargas = S.cargas.map(l => { const e = n(l.q) * n(l.w) * n(l.h); if (l.tipo === "CC") { ECC += e; Pcc += n(l.q) * n(l.w); } else { ECA += e; Psim += n(l.q) * n(l.w) * Math.min(1, Math.max(0, n(l.fs) || 1)); Pinst += n(l.q) * n(l.w); if (n(l.kp) > 1) Pmot = Math.max(Pmot, n(l.w) * (n(l.kp) - 1)); } return { ...l, e }; });
  Object.assign(R, { ECA, ECC, Psim, Pinst, Pcc });
  R.surto = Psim + Pmot;
  R.Ebat = ECC / c.etaCabo + ECA / (c.etaInv * c.etaCabo);
  R.Efv = R.Ebat / T.eta;
  /* tensão do banco */
  const Pinv0 = 1.25 * Psim;
  let Vb = c.vbanco === "auto" ? (Pinv0 <= 1500 ? 12 : Pinv0 <= 3000 ? 24 : 48) : n(c.vbanco);
  if (c.bat === "li" && n(eq.bat.v) > 40) Vb = 48;
  R.Vb = Vb; R.VbAuto = c.vbanco === "auto";
  /* banco de baterias */
  const dod = Math.min(T.dodMax, Math.max(0.1, n(c.dod) || T.dod));
  if (n(c.dod) > T.dodMax) R.avisos.push(`DoD de ${pct(n(c.dod))} acima do limite recomendado para ${T.nome} (${pct(T.dodMax)}); foi usado ${pct(T.dodMax)}.`);
  R.dod = dod; R.T = T;
  /* autonomia: o maior entre a sequência de dias nublados e a falta da concessionária (cargas críticas) */
  const ft = n(c.ftemp) || 1, Nn = Math.max(0, n(c.aut)), fn = Math.min(0.9, Math.max(0, n(c.fnub)));
  R.EcritBat = R.cargas.filter(l => critica(l)).reduce((a, l) => a + (l.tipo === "CC" ? l.e / c.etaCabo : l.e / (c.etaInv * c.etaCabo)), 0);
  R.EautNub = R.Ebat * Nn * (1 - fn);
  R.EautFalta = R.EcritBat * Math.max(0, n(c.hfalta)) / 24;
  R.Eaut = Math.max(R.EautNub, R.EautFalta, S.backup.tipo === "rede" ? 0 : R.Ebat) || R.Ebat * 0.5;
  R.autGov = R.Eaut === R.EautNub ? "nub" : R.Eaut === R.EautFalta ? "falta" : "min";
  if (R.autGov === "min") R.avisos.push(S.backup.tipo === "rede" ? "Sem dias nublados nem horas de falta informados: banco dimensionado para meio dia de consumo." : "Autonomia abaixo de 1 dia: em sistema isolado o banco precisa ao menos atravessar um dia inteiro; foi usado 1 dia de consumo.");
  R.autEq = R.Ebat > 0 ? R.Eaut / R.Ebat : 0;
  R.Cwh = R.Eaut / (dod * ft);
  R.Cah = R.Cwh / Vb;
  R.bNs = Math.max(1, Math.round(Vb / n(eq.bat.v)));
  R.bNp = Math.max(1, Math.ceil(R.Cah / n(eq.bat.ah)));
  R.bN = R.bNs * R.bNp;
  R.CinstAh = R.bNp * n(eq.bat.ah); R.CinstWh = R.CinstAh * R.bNs * n(eq.bat.v);
  R.dodDia = R.Ebat / R.CinstWh; R.dodAut = R.Eaut / R.CinstWh; R.dodNub = R.EautNub / R.CinstWh; R.dodFalta = R.EautFalta / R.CinstWh;
  R.autReal = R.CinstWh * dod * ft / R.Ebat;
  R.faltaReal = R.EcritBat > 0 ? R.CinstWh * dod * ft / R.EcritBat * 24 : 0;
  /* vida útil: dano acumulado (Palmgren-Miner) dos ciclos diários e dos eventos profundos, corrigido pela temperatura */
  R.ciclos = ciclos(R.dodDia, T.curva);
  const tb = n(c.tbat) || 25; R.tb = tb; R.fT = tb > 25 ? Math.pow(2, (tb - 25) / 10) : 1;
  const nNub = Math.max(0, n(c.nnub)), nFal = Math.max(0, n(c.nfalta));
  R.miner = [{ ev: "Ciclo diário (noite)", n: Math.max(0, 365 - nNub * Math.max(1, Nn)), dod: R.dodDia }];
  if (nNub > 0 && R.EautNub > 0) R.miner.push({ ev: `Sequência de ${fmt(Nn, 1)} dia(s) nublado(s)`, n: nNub, dod: Math.min(1, Math.max(R.dodDia, R.dodNub)) });
  if (nFal > 0 && R.EautFalta > 0) R.miner.push({ ev: `Falta da concessionária (${fmt(n(c.hfalta), 0)} h)`, n: nFal, dod: Math.min(1, R.dodFalta) });
  R.miner.forEach(x => { x.N = ciclos(Math.max(0.05, x.dod), T.curva); x.dano = x.n / x.N; });
  R.danoAno = R.miner.reduce((a, x) => a + x.dano, 0);
  R.cicEqAno = R.miner.reduce((a, x) => a + x.n * x.dod, 0);
  R.vidaCic = R.danoAno > 0 ? 1 / R.danoAno / R.fT : 99; R.vidaCal = T.vidaCal / R.fT;
  R.vida = Math.min(R.vidaCic, R.vidaCal);
  if (R.fT > 1.4) R.avisos.push(`Abrigo das baterias a ${tb} °C: a vida cai para ${pct(1 / R.fT)} da vida a 25 °C. Ventile e sombreie o abrigo.`);
  R.icMax = T.cCarga * R.CinstAh;
  if (c.bat !== "li" && R.bNp > 4) R.avisos.push(`${R.bNp} fileiras de baterias de chumbo em paralelo: acima de 3–4 fileiras a corrente se divide mal. Prefira elementos de 2 V de maior capacidade ou tensão de banco maior.`);
  /* gerador FV + MPPT */
  const m = eq.mod, ct = eq.ctrl, tmin = n(S.temp.tmin), tmax = n(S.temp.tmax);
  R.vocMax = n(m.voc) * (1 + n(m.bvoc) / 100 * (tmin - 25));
  R.vmpQ = n(m.vmp) * (1 + n(m.bvoc) / 100 * (tmax + 30 - 25));
  R.vChg = Vb * T.vChg;
  R.Erec = n(c.drec) > 0 ? R.Eaut / n(c.drec) / T.eta : 0;
  R.Pnec = R.hsp > 0 ? (R.Efv + R.Erec) / (R.hsp * n(c.pr)) : 0;
  R.Nnec = Math.ceil(R.Pnec / n(m.p));
  R.NsMin = Math.ceil((R.vChg + 5) / R.vmpQ); R.NsMax = Math.floor(n(ct.vocmax) / R.vocMax);
  if (R.NsMin > R.NsMax) { R.avisos.push(`Não há número de módulos em série que atenda o controlador: mínimo ${R.NsMin} (tensão de carga) e máximo ${R.NsMax} (Voc a ${tmin} °C ≤ ${ct.vocmax} V). Escolha controlador de Voc maior ou outro módulo.`); R.Ns = Math.max(1, R.NsMax); }
  else { let best = null; for (let k = R.NsMin; k <= R.NsMax; k++) { const tot = k * Math.ceil(Math.max(1, R.Nnec) / k); if (!best || tot < best.tot || (tot === best.tot && k > best.k)) best = { k, tot }; } R.Ns = best.k; }
  R.Nstr = Math.max(1, Math.ceil(Math.max(1, R.Nnec) / R.Ns)); R.Nmod = R.Ns * R.Nstr; R.Pfv = R.Nmod * n(m.p);
  R.vocArr = R.vocMax * R.Ns; R.vmpArr = n(m.vmp) * R.Ns;
  R.pCtrl = n(ct.p48) * Vb / 48;
  R.nCtrl = R.Nstr;
  for (let k = 1; k <= R.Nstr; k++) { const sc = Math.ceil(R.Nstr / k), pk = sc * R.Ns * n(m.p); if (pk <= R.pCtrl * 1.001 && pk / Vb <= n(ct.imax) * 1.001) { R.nCtrl = k; break; } }
  R.strCtrl = Math.ceil(R.Nstr / R.nCtrl);
  R.iCtrl = R.strCtrl * R.Ns * n(m.p) / Vb;
  if (R.iCtrl > n(ct.imax) * 1.001) R.avisos.push(`Cada controlador receberia ${fmt(R.iCtrl)} A, acima de ${ct.imax} A: aumente o número de controladores.`);
  R.iChgTot = R.Pfv / Vb;
  if (R.iChgTot > R.icMax * 1.05) R.avisos.push(`Corrente de carga do gerador FV (${fmt0(R.iChgTot)} A) acima do recomendado para o banco (${fmt0(R.icMax)} A = ${T.cCarga} C): limite a corrente no controlador ou aumente o banco.`);
  R.prodMes = row ? row.m.map(h => R.Pfv * h * n(c.pr)) : [];
  R.sobra = R.hsp > 0 ? R.Pfv * R.hsp * n(c.pr) / R.Efv - 1 : 0;
  R.excBat = (R.Pfv * R.hsp * n(c.pr) - R.Efv) * T.eta;
  R.tRec = R.excBat > 1 ? R.Eaut / R.excBat : Infinity;
  if (R.tRec > 15 && S.backup.tipo === "nenhum") R.avisos.push(`No pior mês o gerador FV leva ${isFinite(R.tRec) ? fmt0(R.tRec) : "∞"} dias para recarregar o banco após o evento de autonomia; sem fonte reserva, um segundo evento nesse período derruba o sistema. Use “dias para recuperar” (etapa 04) ou uma fonte reserva.`);
  /* inversor */
  const iv = eq.inv;
  R.PinvNec = Pinv0; R.invN = Math.max(1, Math.ceil(R.PinvNec / n(iv.p))); R.Pinv = R.invN * n(iv.p);
  R.surtoInv = R.Pinv * n(iv.surto);
  if (R.surtoInv < R.surto) R.avisos.push(`Surto de partida estimado (${fmt0(R.surto)} W) maior que o suportado pelo inversor (${fmt0(R.surtoInv)} W): use inversor maior, partida suave nos motores ou não ligue motores simultaneamente.`);
  R.iDcInv = R.Pinv / (n(iv.eta) * Vb * T.vMin);
  R.vac = n(c.vac) || 220; R.iAc = R.Pinv / (R.vac * (n(c.fases) === 3 ? Math.sqrt(3) : 1));
  if (n(iv.p) && Math.abs(n(eq.inv.vdc || Vb) - Vb) > 1) {}
  /* transferência e gerador */
  const b = S.backup;
  R.pCarr = Math.min(n(iv.carr) || 60, R.icMax) * Vb * T.vChg / 0.9;
  R.pGerRec = 1.25 * (Psim + R.pCarr);
  R.sGerRec = R.pGerRec / 0.8;
  R.iGer = R.sGerRec / (R.vac * (n(c.fases) === 3 ? Math.sqrt(3) : 1));
  R.iChave = 1.25 * Math.max(R.iAc, b.tipo === "nenhum" ? 0 : R.iGer);
  R.inChave = prox([25, 32, 40, 63, 80, 100, 125, 160, 250], R.iChave);
  R.polos = n(c.fases) === 3 ? 4 : 2;
  /* proteções e cabos */
  const P = [];
  const isc = n(m.isc);
  R.fusStr = R.strCtrl >= 3;
  if (R.fusStr) { const lo = 1.5 * isc, hi = Math.min(2.4 * isc, n(m.fusmax) || 99); const f = FUS_PV.find(x => x >= lo && x <= hi) ?? FUS_PV.find(x => x >= lo); R.inFusStr = f; P.push(["String FV", "Fusível gPV por string (+ e −)", `${f} A · ${R.vocArr > 600 ? "1000" : "600"} Vcc`, `1,5·Isc = ${fmt(lo)} A ≤ In ≤ ${fmt(hi)} A (fusível máx. do módulo); obrigatório com 3+ strings em paralelo (NBR 16690)`]); }
  R.inSecFV = prox([16, 25, 32, 40, 63, 80, 100, 125], 1.25 * isc * R.strCtrl);
  P.push(["String box", "Seccionadora CC sob carga", `${R.inSecFV} A · ≥ ${R.vocArr > 600 ? "1000" : "600"} Vcc`, `In ≥ 1,25·Isc·strings = ${fmt(1.25 * isc * R.strCtrl)} A; Ucc ≥ Voc,máx = ${fmt0(R.vocArr)} V`]);
  R.ucpv = R.vocArr <= 500 ? 600 : R.vocArr <= 950 ? 1000 : 1500;
  P.push(["String box", "DPS CC classe II (+, −, PE)", `Ucpv ${R.ucpv} V · In 20 kA`, `Ucpv ≥ Voc,máx do arranjo (${fmt0(R.vocArr)} V a ${tmin} °C)`]);
  R.cFV = secao(1.25 * isc, n(S.cabos.lfv), R.vmpArr, n(S.cabos.dvfv), 4);
  if (R.strCtrl > 1) R.cArr = secao(1.25 * isc * R.strCtrl, 3, R.vmpArr, 0.5, 4);
  R.inDjCtrl = prox(DISJ, 1.25 * R.iCtrl);
  P.push(["Controlador → barramento CC", `Disjuntor CC 2P (${R.nCtrl}×)`, `${R.inDjCtrl} A · ≥ ${Vb * 1.5 >= 60 ? 125 : 60} Vcc`, `In ≥ 1,25·Ictrl = ${fmt(1.25 * R.iCtrl)} A`]);
  R.cCtrl = secao(1.25 * R.iCtrl, n(S.cabos.lbat), Vb, n(S.cabos.dvbat), 6);
  R.inDjInv = prox(DISJ, 1.25 * R.iDcInv / R.invN) ?? 250;
  P.push(["Inversor → barramento CC", `Disjuntor/fusível CC (${R.invN}×)`, `${R.inDjInv} A`, `Icc do inversor = P/(η·Vmín) = ${fmt0(R.iDcInv / R.invN)} A; In ≥ 1,25·I`]);
  R.cInv = secao(1.25 * R.iDcInv / R.invN, n(S.cabos.lbat), Vb, n(S.cabos.dvbat), 10);
  R.iBat = Math.max(R.iDcInv + R.Pcc / Vb, R.iChgTot);
  R.inFusBat = prox(FUS_BAT, 1.25 * R.iBat) ?? 630;
  P.push(["Banco de baterias", "Fusível principal (NH gG ou classe T p/ lítio) + seccionadora", `${R.inFusBat} A · Icu ≥ Icc da bateria`, `In ≥ 1,25·máx(descarga ${fmt0(R.iDcInv + R.Pcc / Vb)} A; carga ${fmt0(R.iChgTot)} A)`]);
  R.cBat = secao(1.25 * R.iBat, n(S.cabos.lbat), Vb, n(S.cabos.dvbat), 16);
  R.barra = Math.ceil(1.25 * R.iBat / 2);
  P.push(["Barramento CC", "Barramentos + e − em cobre, isolados", `≥ ${R.barra} mm² (2 A/mm²)`, `Corrente ≥ ${fmt0(1.25 * R.iBat)} A; um único ponto de conexão para cada polo`]);
  if (R.Pcc > 0) P.push(["Cargas CC", "Fusível/disjuntor CC por circuito", `${prox(DISJ, 1.25 * R.Pcc / Vb)} A`, `I = ${fmt(R.Pcc / Vb)} A`]);
  R.inDjAc = prox(DISJ, 1.25 * R.iAc / 1) ?? 125;
  P.push(["Saída CA do inversor", `Disjuntor ${R.polos}P curva C`, `${R.inDjAc} A`, `I saída = ${fmt(R.iAc)} A`]);
  P.push(["Quadro CA", `DR ${R.polos}P 30 mA tipo A + DPS CA classe II`, `${prox([25, 40, 63, 80, 100], R.inDjAc)} A · DPS 275 V 20 kA`, "Proteção de pessoas e de surtos nos circuitos de saída"]);
  R.cAc = secao(1.25 * R.iAc, n(S.cabos.lca), R.vac, n(S.cabos.dvca), 2.5);
  if (b.tipo !== "nenhum") P.push(["Transferência", b.chave === "auto" ? `Chave de transferência automática (ATS) ${R.polos}P` : `Chave reversora manual 1-0-2 ${R.polos}P`, `${R.inChave} A`, `In ≥ 1,25·máx(I inversor ${fmt(R.iAc)} A; I ${b.tipo} ${fmt(R.iGer)} A); comuta fase e neutro; intertravamento mecânico`]);
  P.push(["Aterramento", "Equipotencialização de estruturas, carcaças e racks ao BEP", "PE ≥ 6 mm² Cu; aterramento ≥ 16 mm²", "Moldura dos módulos, estrutura, string box, controlador, inversor e rack de baterias no mesmo eletrodo"]);
  /* picos de partida: queda de tensão no banco, limite do BMS e banco capacitivo */
  const ub = eq.bat;
  R.ncelU = Math.max(1, Math.round(n(ub.v) / T.vcel)); R.ncel = R.ncelU * R.bNs;
  R.Vnom = R.bNs * n(ub.v);
  R.Vref = ocvCel(T, 1 - dod) * R.ncel;
  R.vCorte = n(iv.vcorte) || R.Vnom * T.vCorte;
  R.Rcabo = 2 * n(S.cabos.lbat) / (56 * R.cBat.s);
  R.Rbanco = n(ub.ri) / 1000 * R.bNs / R.bNp + R.Rcabo;
  R.Ipk = R.surto / (n(iv.eta) * R.Vref) + R.Pcc / R.Vref;
  R.Vsag = R.Vref - R.Ipk * R.Rbanco;
  R.Iunid = R.Ipk / R.bNp;
  R.tPart = n(c.tpart) || 0.5;
  R.marg = 0.02 * R.Vnom;
  R.IlimV = R.Rbanco > 0 ? Math.max(0, (R.Vref - R.vCorte - R.marg) / R.Rbanco) : Infinity;
  R.tOk = !(n(ub.tpico) > 0 && R.tPart > n(ub.tpico));
  R.IlimBMS = (R.tOk ? n(ub.ipico) || Infinity : n(ub.imax) || Infinity) * R.bNp;
  R.Ibat = Math.min(R.IlimV, R.IlimBMS);
  R.Iexc = Math.max(0, R.Ipk - R.Ibat);
  R.dVadm = Math.max(0.1, R.Vref - R.vCorte - R.marg);
  R.Ccap = R.Iexc * R.tPart / R.dVadm;
  R.capNec = R.Iexc > 0;
  R.Cregra = R.surto / 1000 * Math.pow(12 / R.Vref, 2);
  R.vChgMax = Math.max(R.vChg, R.Vnom * (c.bat === "li" ? 1.125 : 1.2));
  R.capNs = Math.ceil(R.vChgMax * 1.05 / 16);
  // módulo: [F, ESR mΩ, chave de preço]; C ≥ I_exc·t/(ΔV − I_exc·ESR_banco) — a ESR consome parte da queda admissível
  const opc = [[58, 22, "supercap58"], [500, 2.1, "supercap"]].map(([f, esr, k]) => {
    let np = 0;
    if (R.capNec) for (let j = 1; j <= 60; j++) { const esrB = esr / 1000 * R.capNs / j, folga = R.dVadm - R.Iexc * esrB; if (folga > 0 && j * f / R.capNs >= R.Iexc * R.tPart / folga) { np = j; break; } }
    return { f, esr, k, np, custo: np ? np * R.capNs * n(S.precos[k]?.pu) : Infinity };
  });
  const ch = R.capNec ? opc.reduce((a, b) => b.custo < a.custo ? b : a) : opc[1];
  R.capMod = ch.f; R.capEsr = ch.esr; R.capKey = ch.k; R.capCstr = ch.f / R.capNs; R.capNp = ch.np; R.capC = R.capNp * R.capCstr;
  R.capEsrB = R.capNp ? R.capEsr / 1000 * R.capNs / R.capNp : 0;
  R.Ccap = R.capNec ? R.Iexc * R.tPart / Math.max(1e-6, R.dVadm - R.Iexc * R.capEsrB) : 0;
  R.capE = 0.5 * R.capC * (R.Vref ** 2 - (R.Vref - R.dVadm) ** 2);
  R.Rpre = R.Vref / 5; R.tPre = 5 * R.Rpre * R.capC;
  R.cca = n(ub.cca) > 0 ? { banco: n(ub.cca) * R.bNp, ok: R.Iunid <= n(ub.cca) } : null;
  if (R.capNec) {
    R.avisos.push(`Pico de partida de ${fmt0(R.Ipk)} A no banco: sem reforço a tensão cai para ${fmt(R.Vsag, 2)} V, abaixo do mínimo seguro de ${fmt(R.vCorte + R.marg, 2)} V (corte do inversor ${fmt(R.vCorte, 1)} V + margem de 2%)${R.Iunid > n(ub.ipico) ? ` e cada bateria passaria de ${fmt0(R.Iunid)} A, acima do pico do BMS (${ub.ipico} A)` : ""}. Opções: partida suave/inversor de frequência no motor, banco maior ou banco capacitivo de ${fmt(R.Ccap, 1)} F (${R.capNs}S × ${R.capNp}P módulos 16 V ${R.capMod} F).`);
    P.push(["Banco capacitivo (picos)", `Supercapacitores ${R.capNs}S × ${R.capNp}P (16 V ${R.capMod} F) + pré-carga + fusível`, `${fmt(R.capC, 1)} F · ≥ ${fmt0(R.vChgMax * 1.05)} V`, `C ≥ I_exc·t/(ΔV − I_exc·ESR) = ${fmt(R.Ccap, 1)} F (ESR do banco ${fmt(R.capEsrB * 1000, 1)} mΩ); pré-carga ≈ ${fmt(R.Rpre, 1)} Ω (5 A), ${fmt0(R.tPre)} s; fusível ≥ ${fmt0(1.25 * R.Iexc)} A`]);
  }
  /* BMS e balanceamento */
  R.bms = [];
  const Icont = Math.max(R.iDcInv + R.Pcc / Vb, R.iChgTot);
  R.balI = 0.03 * R.CinstAh / 4;
  R.balCom = [0.5, 1, 2, 4, 5, 10].find(x => x >= R.balI) ?? 10;
  if (c.bat === "li") {
    if (ub.bms === "externo") {
      R.bmsS = Math.round(R.Vnom / 3.2); R.bmsI = Math.ceil(1.25 * Icont / 10) * 10;
      R.bms.push(["bad", "BMS obrigatório", `Células LiFePO4 avulsas: BMS ${R.bmsS}S com corrente ≥ ${R.bmsI} A (1,25 × ${fmt0(Icont)} A), proteções de sobretensão, subtensão, sobrecorrente, curto e temperatura por célula, e comunicação com inversor e controlador.`]);
      R.bms.push(["warn", "Balanceamento ativo", `Corrigir 3% de desequilíbrio em 4 h de absorção: I_bal = 0,03 × ${fmt0(R.CinstAh)} Ah / 4 h = ${fmt(R.balI, 1)} A → balanceador ativo ≥ ${R.balCom} A. Balanceamento passivo (30–100 mA) não dá conta acima de ~100 Ah.`]);
      P.push(["Banco de baterias", `BMS ${R.bmsS}S + balanceador ativo`, `≥ ${R.bmsI} A · balanceamento ≥ ${R.balCom} A`, "Desliga carga/descarga por célula; comunicação CAN/RS485 com o inversor"]);
    } else {
      R.bms.push(["ok", "BMS integrado", "Cada módulo rack tem BMS próprio (proteção e balanceamento passivo das 16 células). Não precisa de BMS externo."]);
      if (R.bNp > 1) R.bms.push(["warn", "Comunicação entre módulos", `${R.bNp} módulos em paralelo: ligue-os em mestre/escravo (cabo de link) e o mestre ao inversor por CAN/RS485, com o protocolo do fabricante. Assim o inversor recebe a corrente máxima de carga/descarga e o SOC real.`]);
      if (R.bNs > 1) R.bms.push(["bad", "Série de módulos", "Módulos rack de 48 V normalmente NÃO podem ser ligados em série: confirme no manual."]);
      if (Icont / R.bNp > n(ub.imax)) R.avisos.push(`Corrente contínua por módulo de lítio (${fmt0(Icont / R.bNp)} A) acima do limite do BMS (${ub.imax} A): aumente o número de módulos em paralelo.`);
    }
  } else {
    R.balN = R.bNs >= 2 ? R.bNs - 1 : 0;
    R.bms.push(["ok", "BMS", "Chumbo-ácido não exige BMS: a proteção vem do controlador (tensões de absorção/flutuação com compensação de temperatura) e do corte por subtensão do inversor. Recomenda-se monitor com shunt para SOC."]);
    if (R.balN) R.bms.push(["warn", "Balanceador/equalizador", `${R.bNs} baterias de ${n(ub.v)} V em série: use ${R.balN} balanceador(es), um em cada ponto médio entre baterias, para que nenhuma fique sobrecarregada enquanto outra fica descarregada. Corrente necessária ≈ 0,03 × ${fmt0(R.CinstAh)} Ah / 4 h = ${fmt(R.balI, 1)} A.`]);
    if (c.bat === "pb") R.bms.push(["warn", "Carga de equalização", "Estacionária ventilada: programe carga de equalização (≈ 2,45–2,50 V/célula, 1–3 h) a cada 30 dias e confira densidade e nível do eletrólito."]);
  }
  R.prot = P;
  if (R.vocArr > n(ct.vocmax)) R.avisos.push(`Voc do arranjo a ${tmin} °C (${fmt0(R.vocArr)} V) acima do limite do controlador (${ct.vocmax} V).`);
  /* materiais e custos */
  R.mat = materiais(R); R.custo = custos(R.mat);
  R.indic = { rsWp: R.custo.total / R.Pfv, rsKwh: R.custo.total / (R.CinstWh / 1000), trocas: Math.max(0, Math.ceil(25 / R.vida) - 1) };
  const pb = S.precos["bat_" + c.bat]; R.indic.custo25 = R.custo.total + R.indic.trocas * R.bN * (pb ? n(pb.pu) : 0);
  R.indic.lcoe = R.indic.custo25 / ((R.ECA + R.ECC) * 365 * 25 / 1000);
  R.est = estadoBat(R);
  return R;
}
function materiais(R) {
  const p = S.precos, b = S.crit.bat, L = [];
  const add = (g, k, q, extra) => { if (q > 0) L.push({ g, k, d: (p[k]?.d || k) + (extra ? " — " + extra : ""), un: p[k]?.un || "pç", q, pu: n(p[k]?.pu) }); };
  add("Geração", "mod", R.Nmod, `${R.Ns} em série × ${R.Nstr} strings`);
  add("Geração", "estr", R.Nmod);
  add("Geração", "mc4", R.Nstr * 2 + 2);
  add("Armazenamento", "bat_" + b, R.bN, `${R.bNs}S × ${R.bNp}P`);
  add("Conversão", "ctrl", R.nCtrl);
  add("Conversão", "inv", R.invN);
  add("Proteção CC", "sbox", R.nCtrl, `seccionadora ${R.inSecFV} A, DPS ${R.ucpv} V${R.fusStr ? `, fusíveis ${R.inFusStr} A` : ""}`);
  add("Proteção CC", "disjcc", R.nCtrl + R.invN);
  add("Proteção CC", "fusbat", 1, `${R.inFusBat} A`);
  add("Proteção CC", "seccc", 1);
  add("Proteção CC", "barra", 1, `≥ ${R.barra} mm²`);
  add("Proteção CC", "shunt", 1);
  if (R.capNec) { add("Proteção CC", R.capKey, R.capNs * R.capNp, `${R.capNs}S × ${R.capNp}P = ${fmt(R.capC, 1)} F`); add("Proteção CC", "precarga", 1, `R ≈ ${fmt(R.Rpre, 1)} Ω`); }
  if (b === "li" && S.eq.bat.bms === "externo") add("Armazenamento", "bms_ext", 1, `${R.bmsS}S ${R.bmsI} A, balanceamento ativo ${R.balCom} A`);
  if (b === "li" && S.eq.bat.bms !== "externo" && R.bNp > 1) add("Armazenamento", "comm", 1);
  if (b !== "li" && R.balN > 0) add("Armazenamento", "bal_pb", R.balN);
  add("Quadro CA", "qdca", 1, `disjuntor ${R.inDjAc} A, DR 30 mA, DPS 275 V`);
  if (S.backup.tipo !== "nenhum") add("Quadro CA", S.backup.chave === "auto" ? "ats" : "rev", 1, `${R.inChave} A ${R.polos}P`);
  add("Cabos", "cabo_fv", 2 * n(S.cabos.lfv) * R.Nstr * R.cFV.s, `${R.Nstr}×2 condutores ${R.cFV.s} mm² × ${S.cabos.lfv} m`);
  add("Cabos", "cabo_bat", 2 * n(S.cabos.lbat) * (R.cBat.s + R.cInv.s * R.invN + R.cCtrl.s * R.nCtrl), `bateria ${R.cBat.s} · inversor ${R.cInv.s} · controlador ${R.cCtrl.s} mm²`);
  add("Cabos", "cabo_ca", 3 * n(S.cabos.lca) * R.cAc.s, `F+N+PE ${R.cAc.s} mm² × ${S.cabos.lca} m`);
  add("Infraestrutura", "terra", 1);
  add("Infraestrutura", "abrigo", 1);
  return L;
}
function custos(L) {
  const mo = S.mo, eq = L.reduce((a, x) => a + x.q * x.pu, 0);
  const sv = n(mo.heng) * n(mo.peng) + n(mo.hele) * n(mo.pele) + n(mo.haux) * n(mo.paux);
  const desl = n(mo.km) * n(mo.pkm) + n(mo.desp);
  const base = eq + sv + desl, bdi = base * n(mo.bdi) / 100, imp = (base + bdi) * n(mo.imp) / 100;
  return { eq, sv, desl, bdi, imp, total: base + bdi + imp };
}

/* ============================================================
   ESQUEMA ELÉTRICO (primitivas → SVG e PDF)
   ============================================================ */
function esquema(R) {
  const P = []; const L = (x1, y1, x2, y2, c = "k", w = 1.6, d) => P.push({ t: "l", x1, y1, x2, y2, c, w, d });
  const B = (x, y, w, h, t, sub, c = "k") => P.push({ t: "r", x, y, w, h, c, txt: t, sub });
  const T = (x, y, s, sz = 11, a = "m", b = false, c = "k") => P.push({ t: "t", x, y, s, sz: Math.max(sz, 10), a, b, c });
  const fus = (x, y) => { P.push({ t: "r", x: x - 5, y: y - 12, w: 10, h: 24, c: "k" }); L(x, y - 12, x, y + 12, "k", 1); };
  const disj = (x, y, lab) => { L(x, y - 14, x, y - 6); L(x, y + 6, x, y + 14); L(x - 6, y + 6, x + 4, y - 8, "k", 1.6); T(x + 10, y + 4, lab, 9, "s"); };
  const terra = (x, y) => { L(x, y, x, y + 8, "g"); L(x - 8, y + 8, x + 8, y + 8, "g"); L(x - 5, y + 11, x + 5, y + 11, "g"); L(x - 2, y + 14, x + 2, y + 14, "g"); };
  const W = 1100, H = 620;
  T(W / 2, 22, `Diagrama unifilar — sistema off-grid ${fmt(R.Pfv / 1000, 2)} kWp · banco ${R.Vb} V ${fmt0(R.CinstAh)} Ah · inversor ${fmt(R.Pinv / 1000, 1)} kW`, 14, "m", true);
  // arranjo FV
  for (let s = 0; s < Math.min(R.Nstr, 4); s++) { const x = 40 + s * 46; for (let k = 0; k < 3; k++) P.push({ t: "pv", x, y: 50 + k * 34 }); L(x + 16, 50 + 3 * 34, x + 16, 200, "r"); }
  T(130, 170 + 50, `${R.Nstr} string(s) × ${R.Ns} módulos de ${S.eq.mod.p} W`, 10, "m", true);
  T(130, 234, `Voc,máx ${fmt0(R.vocArr)} V · Isc ${fmt(n(S.eq.mod.isc))} A`, 9);
  L(56, 200, 56 + 46 * (Math.min(R.Nstr, 4) - 1), 200, "r");
  L(130, 200, 130, 260, "r"); T(150, 252, `cabo ${R.cFV.s} mm² · ${S.cabos.lfv} m`, 9, "s");
  // string box
  B(80, 262, 170, 120, "STRING BOX", "");
  if (R.fusStr) { fus(115, 300); T(115, 330, `gPV ${R.inFusStr} A`, 8); }
  disj(165, 300, `${R.inSecFV} A`); T(165, 330, "seccionadora", 8);
  P.push({ t: "dps", x: 220, y: 300 }); T(220, 340, `DPS ${R.ucpv} V`, 8); terra(220, 352);
  L(165, 382, 165, 420, "r"); L(165, 420, 300, 420, "r");
  // controlador
  B(300, 395, 130, 60, "CONTROLADOR MPPT", `${R.nCtrl}× ${S.eq.ctrl.imax} A`);
  L(430, 425, 520, 425, "r"); T(475, 418, `${R.inDjCtrl} A`, 9);
  // barramento CC
  L(520, 300, 520, 560, "r", 6); L(545, 300, 545, 560, "b", 6); T(520, 290, "+", 13, "m", true, "r"); T(545, 290, "−", 13, "m", true, "b");
  T(532, 578, `barramento CC ≥ ${R.barra} mm²`, 9);
  // bateria
  L(545, 500, 600, 500, "b"); L(520, 520, 600, 520, "r");
  fus(620, 520); T(620, 546, `fusível ${R.inFusBat} A`, 8);
  L(625, 520, 660, 520, "r"); L(600, 500, 660, 500, "b");
  P.push({ t: "bat", x: 680, y: 490 }); T(735, 545, `${R.bN}× ${n(S.eq.bat.v)} V ${n(S.eq.bat.ah)} Ah (${R.bNs}S×${R.bNp}P)`, 9, "m", true); T(735, 559, `${fmt(R.CinstWh / 1000, 1)} kWh · DoD ${pct(R.dod)}`, 9);
  // inversor
  L(520, 330, 600, 330, "r"); L(545, 350, 600, 350, "b"); T(570, 322, `${R.inDjInv} A`, 9);
  B(600, 310, 150, 60, "INVERSOR OFF-GRID", `${R.invN}× ${fmt(n(S.eq.inv.p) / 1000, 1)} kW · ${R.Vb} Vcc`);
  L(750, 340, 800, 340, "k"); T(775, 332, `${R.cAc.s} mm²`, 9);
  // transferência
  const tem = S.backup.tipo !== "nenhum";
  if (tem) {
    B(800, 300, 110, 80, S.backup.chave === "auto" ? "ATS" : "REVERSORA", `${R.inChave} A ${R.polos}P`);
    B(800, 120, 110, 60, S.backup.tipo === "gerador" ? "GERADOR" : "REDE", S.backup.tipo === "gerador" ? `≥ ${fmt(R.sGerRec / 1000, 1)} kVA` : "concessionária");
    L(855, 180, 855, 300, "k"); T(860, 240, "fonte 2", 9, "s");
    L(910, 340, 950, 340, "k");
  } else L(800, 340, 950, 340, "k");
  // QDCA
  B(950, 280, 130, 200, "QUADRO CA", "");
  disj(985, 330, `${R.inDjAc} A`); T(1040, 360, "DR 30 mA", 9); T(1040, 375, "DPS 275 V", 9);
  for (let k = 0; k < 4; k++) { L(965 + k * 30, 420, 965 + k * 30, 470, "k", 1); T(965 + k * 30, 478, `C${k + 1}`, 8); }
  terra(1015, 485);
  // aterramento geral
  L(40, 600, 1080, 600, "g", 2, [6, 4]); T(560, 615, "PE / equipotencialização — estruturas, string box, controlador, inversor, rack de baterias e quadro ao BEP", 9, "m", false, "g");
  for (const x of [130, 365, 675, 1015]) L(x, x === 1015 ? 500 : (x === 130 ? 382 : x === 365 ? 455 : 570), x, 600, "g", 1, [3, 3]);
  return { P, W, H };
}
const COR = { k: "#17221d", r: "#b5452f", b: "#2f5fb5", g: "#1f7a3d" };
function esquemaSVG(R) {
  const { P, W, H } = esquema(R); let o = `<svg class="schem" viewBox="0 0 ${W} ${H + 10}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagrama unifilar do sistema off-grid">`;
  for (const p of P) {
    if (p.t === "l") o += `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="${COR[p.c]}" stroke-width="${p.w}" ${p.d ? `stroke-dasharray="${p.d.join(" ")}"` : ""}/>`;
    else if (p.t === "r") o += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#fff" stroke="${COR[p.c]}" stroke-width="1.5"/>` + (p.txt ? `<text x="${p.x + p.w / 2}" y="${p.y + 18}" text-anchor="middle" font-size="11" font-weight="700" fill="#17221d" font-family="Arial">${esc(p.txt)}</text>` : "") + (p.sub ? `<text x="${p.x + p.w / 2}" y="${p.y + 34}" text-anchor="middle" font-size="10" fill="#5a6a62" font-family="Arial">${esc(p.sub)}</text>` : "");
    else if (p.t === "t") o += `<text x="${p.x}" y="${p.y}" text-anchor="${p.a === "m" ? "middle" : "start"}" font-size="${p.sz}" ${p.b ? 'font-weight="700"' : ""} fill="${COR[p.c]}" font-family="Arial">${esc(p.s)}</text>`;
    else if (p.t === "pv") o += `<rect x="${p.x}" y="${p.y}" width="32" height="26" fill="#dbe7f7" stroke="#2f5fb5"/><line x1="${p.x}" y1="${p.y + 26}" x2="${p.x + 32}" y2="${p.y}" stroke="#2f5fb5"/><line x1="${p.x + 16}" y1="${p.y + 26}" x2="${p.x + 16}" y2="${p.y + 34}" stroke="#b5452f" stroke-width="1.6"/>`;
    else if (p.t === "bat") { for (let k = 0; k < 4; k++) o += `<line x1="${p.x + k * 22}" y1="${p.y}" x2="${p.x + k * 22}" y2="${p.y + 40}" stroke="#17221d" stroke-width="3"/><line x1="${p.x + k * 22 + 8}" y1="${p.y + 10}" x2="${p.x + k * 22 + 8}" y2="${p.y + 30}" stroke="#17221d" stroke-width="6"/>`; }
    else if (p.t === "dps") o += `<rect x="${p.x - 9}" y="${p.y - 16}" width="18" height="32" fill="#fff" stroke="#17221d" stroke-width="1.5"/><polyline points="${p.x - 4},${p.y - 8} ${p.x + 3},${p.y} ${p.x - 3},${p.y} ${p.x + 4},${p.y + 8}" fill="none" stroke="#b5452f" stroke-width="1.6"/><line x1="${p.x}" y1="${p.y + 16}" x2="${p.x}" y2="${p.y + 52}" stroke="#1f7a3d"/>`;
  }
  return o + "</svg>";
}

/* ============================================================
   GRÁFICOS SVG
   ============================================================ */
function barrasSVG(vals, { cor = "#0e6a4e", alvo = null, alvoTxt = "", destacar = -1, un = "", rotulos = MESES, h = 220, dec = 2, outra = null } = {}) {
  const W = 680, pad = 44, ch = h - 50, max = Math.max(...vals, alvo || 0, ...(outra || [0])) * 1.12 || 1, bw = (W - pad - 10) / vals.length;
  let o = `<svg class="chart" viewBox="0 0 ${W} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  for (let k = 0; k <= 4; k++) { const y = 14 + ch - ch * k / 4; o += `<line x1="${pad}" x2="${W - 8}" y1="${y}" y2="${y}" stroke="currentColor" opacity=".12"/><text x="${pad - 6}" y="${y + 4}" text-anchor="end">${fmt(max * k / 4, max > 50 ? 0 : 1)}</text>`; }
  vals.forEach((v, i) => { const bh = ch * v / max, x = pad + i * bw + 4, y = 14 + ch - bh; o += `<rect x="${x}" y="${y}" width="${bw - 8}" height="${bh}" fill="${i === destacar ? "#b3261e" : cor}" rx="2"/><text x="${x + (bw - 8) / 2}" y="${y - 4}" text-anchor="middle" class="${i === destacar ? "lbl" : ""}">${fmt(v, dec)}</text><text x="${x + (bw - 8) / 2}" y="${h - 18}" text-anchor="middle">${rotulos[i]}</text>`; });
  if (outra) { const pts = outra.map((v, i) => `${pad + i * bw + bw / 2},${14 + ch - ch * v / max}`).join(" "); o += `<polyline points="${pts}" fill="none" stroke="#9a5a00" stroke-width="2.5"/>`; }
  if (alvo != null) { const y = 14 + ch - ch * alvo / max; o += `<line x1="${pad}" x2="${W - 8}" y1="${y}" y2="${y}" stroke="#b3261e" stroke-dasharray="6 4" stroke-width="1.6"/><text x="${W - 10}" y="12" text-anchor="end" class="lbl" style="fill:#b3261e">- - - ${esc(alvoTxt)}</text>`; }
  return o + `<text x="8" y="12">${esc(un)}</text></svg>`;
}
function vidaSVG(R) {
  const W = 680, Hh = 240, pad = 56, ch = 175, curva = R.T.curva, xs = []; for (let d = 0.1; d <= 1.0001; d += 0.02) xs.push(d);
  const ys = xs.map(d => ciclos(d, curva)), lim = R.T.vidaCal * 365, max = Math.max(...ys, lim) * 1.1;
  const X = d => pad + (W - pad - 15) * (d - 0.1) / 0.9, Y = v => 18 + ch - ch * v / max;
  let o = `<svg class="chart" viewBox="0 0 ${W} ${Hh}" xmlns="http://www.w3.org/2000/svg">`;
  for (let k = 0; k <= 4; k++) { const v = max * k / 4; o += `<line x1="${pad}" x2="${W - 10}" y1="${Y(v)}" y2="${Y(v)}" stroke="currentColor" opacity=".12"/><text x="${pad - 6}" y="${Y(v) + 4}" text-anchor="end">${fmt0(v)}</text>`; }
  for (const d of [0.2, 0.4, 0.6, 0.8, 1.0]) o += `<text x="${X(d)}" y="${Hh - 12}" text-anchor="middle">${pct(d)}</text>`;
  o += `<line x1="${pad}" x2="${W - 10}" y1="${Y(lim)}" y2="${Y(lim)}" stroke="#9a5a00" stroke-dasharray="6 4"/><text x="${pad + 8}" y="${Y(lim) + 14}" style="fill:#9a5a00">vida de calendário ${R.T.vidaCal} anos = ${fmt0(lim)} ciclos (1/dia)</text>`;
  o += `<polyline points="${xs.map((d, i) => `${X(d)},${Y(ys[i])}`).join(" ")}" fill="none" stroke="#0e6a4e" stroke-width="2.5"/>`;
  const dd = Math.max(0.1, Math.min(1, R.dodDia)); o += `<circle cx="${X(dd)}" cy="${Y(R.ciclos)}" r="7" fill="#b3261e"/><text x="${X(dd) + 12}" y="${Y(R.ciclos) - 12}" class="lbl">DoD diário ${pct(R.dodDia)} → ${fmt0(R.ciclos)} ciclos → vida ${fmt(R.vida, 1)} anos</text>`;
  o += `<line x1="${X(R.dod)}" x2="${X(R.dod)}" y1="18" y2="${18 + ch}" stroke="#b3261e" stroke-dasharray="3 3" opacity=".6"/><text x="${X(R.dod) + 4}" y="${18 + ch - 6}" style="fill:#b3261e">DoD máx. ${pct(R.dod)}</text>`;
  return o + `<text x="8" y="12">ciclos até 80% da capacidade × profundidade de descarga</text></svg>`;
}

/* ============================================================
   INTERFACE
   ============================================================ */
const STEPS = [
  { k: "id", t: "Identificação", s: "Cliente, obra, RT" },
  { k: "irr", t: "Local e irradiação", s: "CRESESB · pior caso" },
  { k: "carg", t: "Cargas", s: "Consumo diário e picos" },
  { k: "crit", t: "Critérios e equipamentos", s: "Autonomia, DoD, catálogos" },
  { k: "bat", t: "Banco de baterias", s: "Autonomia, vida, picos, BMS" },
  { k: "sta", t: "Estado da bateria", s: "SOC, SOH, SoE, SoP, SoB, CCA" },
  { k: "fv", t: "Gerador FV e controlador", s: "Módulos, strings, MPPT" },
  { k: "inv", t: "Inversor e transferência", s: "Potência, surto, ATS" },
  { k: "prot", t: "Proteções e barramentos", s: "CC, CA, cabos, terra" },
  { k: "esq", t: "Esquema elétrico", s: "Unifilar" },
  { k: "cus", t: "Materiais e custos", s: "Lista, mão de obra, BDI" },
  { k: "fim", t: "Relatório", s: "PDF e JSON" }
];
let R = calcular();
function fld(path, label, { type = "number", step = "any", opts = null, hint = "", ph = "" } = {}) {
  const v = getP(path);
  let inp;
  if (opts) inp = `<select data-bind="${path}">${opts.map(([k, t]) => `<option value="${esc(k)}" ${String(v) === String(k) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
  else inp = `<input data-bind="${path}" type="${type}" ${type === "number" ? `step="${step}"` : ""} value="${esc(v)}" placeholder="${esc(ph)}">`;
  return `<label class="f">${esc(label)}${inp}${hint ? `<span class="h">${hint}</span>` : ""}</label>`;
}
const card = (t, v, s = "") => `<div class="card"><div class="t">${t}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`;
const avisos = () => R.avisos.length ? R.avisos.map(a => `<p class="note warn">${a}</p>`).join("") : "";
const formula = s => `<div class="formula">${s}</div>`;
function stepStatus(k) {
  switch (k) {
    case "id": return S.id.cliente && S.id.obra ? "done" : (S.id.cliente || S.id.obra ? "part" : "");
    case "irr": return S.local.rows?.length ? (R.row?.nome === "Maior mínimo mensal" ? "done" : "part") : "";
    case "carg": return S.cargas.length ? "done" : "";
    case "crit": return "done";
    case "sta": return R.est?.tem ? "done" : "";
    case "bat": case "fv": case "inv": case "prot": case "esq": case "cus": return S.local.rows?.length && S.cargas.length ? (R.avisos.length ? "part" : "done") : "";
    default: return "";
  }
}
function render() {
  R = calcular();
  $("#stepList").innerHTML = STEPS.map((s, i) => `<li><button type="button" data-step="${i}" ${i === cur ? 'aria-current="step"' : ""}><span class="n">${String(i + 1).padStart(2, "0")}</span><span class="l">${s.t}<small>${s.s}</small></span><span class="d ${stepStatus(s.k)}" aria-hidden="true"></span></button></li>`).join("");
  $("#stamp").innerHTML = [["Cliente", S.id.cliente || "—"], ["Obra", S.id.obra || "—"], ["Local", S.id.municipio || "—"], ["Data", S.id.data]].map(([a, b]) => `<div>${a}</div><div>${esc(b)}</div>`).join("");
  $("#sheet").innerHTML = `<div class="sheet-head"><h2>${STEPS[cur].t}</h2><span class="tag">Etapa ${String(cur + 1).padStart(2, "0")} de ${STEPS.length}</span></div>` + VIEWS[STEPS[cur].k]() +
    `<div class="nav"><button class="btn small" type="button" data-nav="-1" ${cur === 0 ? "disabled" : ""}>← Anterior</button><button class="btn small primary" type="button" data-nav="1" ${cur === STEPS.length - 1 ? "disabled" : ""}>Próxima →</button></div>`;
  $("#summary").innerHTML = resumo();
}
function resumo() {
  const ok = S.local.rows?.length && S.cargas.length;
  return `<div class="card"><h3>Pior caso</h3><div class="big">${ok ? fmt(R.hsp, 2) : "—"}</div><p class="step-hint">kWh/m²·dia em ${ok ? MESES[R.mesCrit] : "—"} (${esc(R.row?.nome || "sem dados")}${R.row ? ", " + R.row.ang + "°" : ""})</p></div>
  <div class="card"><h3>Sistema</h3><dl class="kv">
  <dt>Consumo</dt><dd>${fmt((R.ECA + R.ECC) / 1000, 2)} kWh/dia</dd>
  <dt>Gerador FV</dt><dd>${ok ? fmt(R.Pfv / 1000, 2) + " kWp" : "—"}</dd>
  <dt>Módulos</dt><dd>${ok ? R.Nmod + " (" + R.Ns + "S×" + R.Nstr + "P)" : "—"}</dd>
  <dt>Banco</dt><dd>${ok ? R.Vb + " V · " + fmt0(R.CinstAh) + " Ah" : "—"}</dd>
  <dt>Energia útil</dt><dd>${ok ? fmt(R.CinstWh * R.dod / 1000, 1) + " kWh" : "—"}</dd>
  <dt>Autonomia</dt><dd>${ok ? fmt(R.autReal, 1) + " dias" : "—"}</dd>
  <dt>Vida banco</dt><dd>${ok ? fmt(R.vida, 1) + " anos" : "—"}</dd>
  <dt>Capacitor</dt><dd>${ok ? (R.capNec ? fmt(R.capC, 1) + " F" : "dispensável") : "—"}</dd>
  <dt>Controlador</dt><dd>${ok ? R.nCtrl + "× " + S.eq.ctrl.imax + " A" : "—"}</dd>
  <dt>Inversor</dt><dd>${ok ? R.invN + "× " + fmt(n(S.eq.inv.p) / 1000, 1) + " kW" : "—"}</dd>
  <dt>Investimento</dt><dd>${ok ? brl(R.custo.total) : "—"}</dd></dl></div>
  <div class="card"><h3>Pendências</h3><ul class="pend">${[["Coordenada da obra", n(S.local.lat) && n(S.local.lon)], ["Irradiação do CRESESB", /CRESESB/.test(S.local.fonte)], ["Linha “Maior mínimo mensal”", R.row?.nome === "Maior mínimo mensal"], ["Cargas cadastradas", S.cargas.length > 0], ["Sem alertas de cálculo", !R.avisos.length]].map(([t, b]) => `<li class="${b ? "ok" : ""}">${t}</li>`).join("")}</ul></div>`;
}
const VIEWS = {
  id: () => `<p class="intro">Dados que vão para o carimbo e para a capa do relatório.</p><div class="grid">${fld("id.cliente", "Cliente / proprietário", { type: "text" })}${fld("id.obra", "Obra / finalidade", { type: "text" })}${fld("id.local", "Localidade", { type: "text" })}${fld("id.municipio", "Município/UF", { type: "text" })}${fld("id.rt", "Responsável técnico", { type: "text" })}${fld("id.crea", "CREA/CFT", { type: "text" })}${fld("id.data", "Data", { type: "date" })}</div>
  <p class="note">Off-grid é para onde a rede não chega ou é cara de estender: bombeamento, ordenha, cercas, telemetria e moradias isoladas. O sistema precisa fechar a conta <b>no pior mês do ano</b>, sem ajuda da rede.</p>`,
  irr: () => {
    const rows = S.local.rows || [];
    const est = S._estacoes || [];
    return `<p class="intro">A irradiação vem do <b>CRESESB/SunData</b> (CEPEL). Para sistema isolado usamos o <b>pior caso</b>: a linha <b>“Maior mínimo mensal”</b> (inclinação que maximiza o mês mais fraco) e, nela, o <b>menor valor mensal</b>, nunca a média anual.</p>
    <div class="grid">${fld("local.lat", "Latitude (°, sul negativo)", { step: "0.0001", ph: "-31.7700" })}${fld("local.lon", "Longitude (°, oeste negativo)", { step: "0.0001", ph: "-52.3400" })}</div>
    <div class="actions"><button class="btn small" type="button" id="btnGeo">Usar localização atual</button><button class="btn small primary" type="button" id="btnSun">Buscar no CRESESB (automático)</button><button class="btn small ghost" type="button" id="btnNasa">Alternativa: NASA POWER</button><a class="btn small ghost" href="${sunDataURL()}" target="_blank" rel="noopener">Abrir o SunData no navegador</a></div>
    <p class="note" id="irrMsg">A busca automática usa o proxy <span class="mono">sundata.php</span> (requer o app rodando com <span class="mono">php -S localhost:8000</span>). Sem PHP, abra o SunData, consulte a coordenada, copie a tabela de resultado e cole abaixo.</p>
    <details><summary>Consulta manual: colar a tabela do SunData</summary><p class="step-hint">No SunData: informe latitude (Sul) e longitude (Oeste) em graus decimais → Buscar → selecione o texto da estação (do nome até a linha “Maior mínimo mensal”) → copie e cole aqui.</p><textarea id="colar" placeholder="Estação: ...  Município: ...  Plano Horizontal 0° N 6,30 5,73 ... Maior mínimo mensal 52° N ..."></textarea><div class="actions"><button class="btn small primary" type="button" id="btnColar">Ler tabela colada</button></div></details>
    ${est.length > 1 ? `<div class="block"><h3>Estações próximas</h3><div class="tbl"><table><thead><tr><th></th><th>Estação</th><th>Município</th><th>Distância</th></tr></thead><tbody>${est.map((e, i) => `<tr><td><button class="btn small ghost" type="button" data-est="${i}">Usar</button></td><td>${esc(e.estacao)}</td><td>${esc(e.municipio)}</td><td>${esc(e.dist)}</td></tr>`).join("")}</tbody></table></div></div>` : ""}
    ${rows.length ? `<div class="block"><h3>Irradiação solar diária média mensal [kWh/m²·dia]</h3><p class="step-hint">Fonte: ${esc(S.local.fonte)}${S.local.estacao ? " · " + esc(S.local.estacao) : ""}${S.local.dist && S.local.dist !== "—" ? " · " + esc(S.local.dist) : ""}</p>
    <div class="tbl"><table><thead><tr><th>Usar</th><th>Ângulo</th><th class="r">Incl.</th>${MESES.map(m => `<th class="r">${m}</th>`).join("")}<th class="r">Média</th><th class="r">Mínimo</th></tr></thead><tbody>${rows.map((r, i) => { const mi = Math.min(...r.m), im = r.m.indexOf(mi); return `<tr class="${i === S.local.sel ? "sel" : ""}"><td><input type="radio" name="rowsel" data-row="${i}" ${i === S.local.sel ? "checked" : ""} style="width:auto"></td><td>${esc(r.nome)}</td><td class="num">${r.ang}° ${r.dir || ""}</td>${r.m.map((v, j) => `<td class="num ${j === im && i === S.local.sel ? "min" : ""}">${fmt(v, 2)}</td>`).join("")}<td class="num">${fmt(r.media, 2)}</td><td class="num"><b>${fmt(mi, 2)}</b></td></tr>`; }).join("")}</tbody></table></div>
    ${barrasSVG(R.row.m, { destacar: R.mesCrit, alvo: R.row.media, alvoTxt: "média anual " + fmt(R.row.media, 2) + " (NÃO usar)", un: "kWh/m²·dia — " + R.row.nome + " " + R.row.ang + "°" })}
    <div class="res">${card("HSP de projeto", fmt(R.hsp, 2), `${MESES[R.mesCrit]} · pior mês`)}${card("Média anual", fmt(R.hspMed, 2), "só para comparação")}${card("Diferença", pct(R.hspMed / R.hsp - 1), "quanto faltaria se usasse a média")}${card("Inclinação", R.row.ang + "°", "voltada para o " + (n(S.local.lat) < 0 ? "norte" : "sul"))}</div></div>` : ""}
    <div class="block"><h3>Temperaturas de projeto (correção de tensão dos módulos)</h3><div class="grid">${fld("temp.tmin", "Temperatura mínima do ar (°C)", { hint: "eleva o Voc: limite do controlador" })}${fld("temp.tmax", "Temperatura máxima do ar (°C)", { hint: "célula ≈ ar + 30 °C: reduz o Vmp" })}</div></div>
    ${S.local.obs ? `<p class="note warn">${esc(S.local.obs)}</p>` : ""}`;
  },
  carg: () => `<p class="intro">Liste cada equipamento com potência, horas de uso por dia e fator de partida (Ip/In para motores e compressores). A energia diária define bateria e gerador FV; a potência simultânea e o surto definem o inversor.</p>
    <div class="tbl ct"><table><thead><tr><th>Equipamento</th><th>CA/CC</th><th class="r">Qtd</th><th class="r">W unit.</th><th class="r">h/dia</th><th class="r">Simult.</th><th class="r">Ip/In</th><th>Crítica</th><th class="r">Wh/dia</th><th></th></tr></thead><tbody>
    ${S.cargas.map((l, i) => `<tr><td><input class="w-l" data-c="${i}" data-f="nome" type="text" value="${esc(l.nome)}"></td><td><select data-c="${i}" data-f="tipo"><option ${l.tipo === "CA" ? "selected" : ""}>CA</option><option ${l.tipo === "CC" ? "selected" : ""}>CC</option></select></td><td><input class="w-s" data-c="${i}" data-f="q" type="number" step="1" value="${l.q}"></td><td><input data-c="${i}" data-f="w" type="number" value="${l.w}"></td><td><input class="w-s" data-c="${i}" data-f="h" type="number" step="0.1" value="${l.h}"></td><td><input class="w-s" data-c="${i}" data-f="fs" type="number" step="0.1" value="${l.fs}"></td><td><input class="w-s" data-c="${i}" data-f="kp" type="number" step="0.5" value="${l.kp}"></td><td style="text-align:center"><input type="checkbox" style="width:auto" data-c="${i}" data-f="crit" ${critica(l) ? "checked" : ""} title="mantida durante falta da concessionária"></td><td class="num">${fmt0(R.cargas[i].e)}</td><td><button class="btn small danger" type="button" data-del="${i}">Remover</button></td></tr>`).join("")}
    <tr class="sub"><td colspan="8">Total (CA ${fmt0(R.ECA)} Wh · CC ${fmt0(R.ECC)} Wh)</td><td class="num">${fmt0(R.ECA + R.ECC)}</td><td></td></tr></tbody></table></div>
    <div class="actions"><button class="btn small" type="button" id="addC">+ Equipamento</button></div>
    <div class="res">${card("Consumo diário", fmt((R.ECA + R.ECC) / 1000, 2) + " kWh", "Σ qtd × W × h")}${card("Retirado da bateria", fmt(R.Ebat / 1000, 2) + " kWh", "inclui perdas de inversor e cabos")}${card("Potência simultânea", fmt0(R.Psim) + " W", "cargas CA × simultaneidade")}${card("Surto de partida", fmt0(R.surto) + " W", "simultânea + maior motor × (Ip/In − 1)")}</div>
    ${formula(`E_bat = E_CC/η_cabos + E_CA/(η_inv·η_cabos) = ${fmt0(R.ECC)}/${S.crit.etaCabo} + ${fmt0(R.ECA)}/(${S.crit.etaInv}·${S.crit.etaCabo}) = ${fmt0(R.Ebat)} Wh/dia`)}
    <p class="note"><b>Crítica:</b> carga que precisa continuar ligada durante falta da concessionária (sistemas com rede como reserva) — define a energia da autonomia por falta. Consumo crítico retirado da bateria: <b>${fmt0(R.EcritBat)} Wh/dia</b>.</p>
    <p class="note">Ip/In típico: resistivo 1 · geladeira/freezer 3–5 · compressor e motor de indução 5–7 · bomba submersa 4–6. Na dúvida, meça a corrente de partida ou consulte a placa (código de letra NEMA).</p>`,
  crit: () => { const T = R.T; return `<p class="intro">Critérios do pior caso e dados de catálogo. Os valores padrão vêm de equipamentos reais pesquisados em out/2026 – troque pelos do fabricante escolhido.</p>
    <div class="block"><h3>Critérios</h3><div class="grid">
    ${fld("crit.bat", "Tecnologia da bateria", { opts: Object.entries(TIPOS).map(([k, v]) => [k, v.nome]) })}
    ${fld("crit.dod", "Profundidade de descarga máx. (0–1)", { step: "0.05", hint: `recomendado ${pct(T.dod)} · limite ${pct(T.dodMax)}` })}
    ${fld("crit.ftemp", "Fator de temperatura da bateria", { step: "0.05", hint: "chumbo a 10 °C ≈ 0,9 da capacidade" })}
    ${fld("crit.vbanco", "Tensão do banco (V)", { opts: [["auto", "Automática (pela potência)"], ["12", "12 V"], ["24", "24 V"], ["48", "48 V"]] })}
    ${fld("crit.pr", "Fator de desempenho do FV (PR)", { step: "0.01", hint: "temperatura, sujeira, descasamento, MPPT: 0,75–0,85" })}
    ${fld("crit.etaInv", "Rendimento do inversor", { step: "0.01" })}
    ${fld("crit.etaCabo", "Rendimento dos cabos", { step: "0.01" })}
    ${fld("crit.vac", "Tensão de saída CA (V)", { opts: [["127", "127 V"], ["220", "220 V"]] })}
    ${fld("crit.fases", "Fases da saída", { opts: [["1", "Monofásica"], ["3", "Trifásica"]] })}</div>
    <p class="note">${esc(T.obs)}</p></div>
    <div class="block"><h3>Autonomia e confiabilidade</h3><div class="grid">
    ${fld("crit.aut", "Dias nublados consecutivos (autonomia)", { step: "0.5", hint: "maior sequência esperada; RS no inverno: 3–5 (série do INMET)" })}
    ${fld("crit.fnub", "Geração em dia nublado (fração do pior mês)", { step: "0.05", hint: "0 = conservador; nublado típico 0,1–0,3" })}
    ${fld("crit.nnub", "Sequências nubladas por ano", { step: "1", hint: "eventos de descarga profunda (vida útil)" })}
    ${fld("crit.hfalta", "Horas máx. sem energia da concessionária", { step: "1", hint: "híbrido/backup: maior falta contínua (cargas críticas)" })}
    ${fld("crit.nfalta", "Faltas longas por ano", { step: "1", hint: "DEC/FEC da distribuidora ou histórico" })}
    ${fld("crit.drec", "Dias para recuperar o banco (0 = não considerar)", { step: "1", hint: "sobredimensiona o FV para recarregar após o evento; usual 7–14" })}
    ${fld("crit.tbat", "Temperatura média do abrigo das baterias (°C)", { step: "1", hint: "cada +10 °C acima de 25 °C reduz a vida à metade" })}
    ${fld("crit.tpart", "Duração do pico de partida (s)", { step: "0.1", hint: "compressor/motor direto: 0,3–1 s" })}</div></div>
    <div class="block"><h3>Módulo fotovoltaico</h3><div class="grid">${fld("eq.mod.nome", "Modelo", { type: "text" })}${fld("eq.mod.p", "Pmáx (W)")}${fld("eq.mod.voc", "Voc (V)")}${fld("eq.mod.vmp", "Vmp (V)")}${fld("eq.mod.isc", "Isc (A)")}${fld("eq.mod.imp", "Imp (A)")}${fld("eq.mod.bvoc", "Coef. temp. Voc (%/°C)", { step: "0.01" })}${fld("eq.mod.fusmax", "Fusível máx. em série (A)")}</div></div>
    <div class="block"><h3>Bateria (unidade)</h3><div class="grid">${fld("eq.bat.nome", "Modelo", { type: "text" })}${fld("eq.bat.v", "Tensão nominal (V)", { step: "0.1" })}${fld("eq.bat.ah", "Capacidade (Ah, C20/C10)")}${fld("eq.bat.ri", "Resistência interna (mΩ)", { step: "0.1", hint: "catálogo ou medida com a bateria nova" })}${fld("eq.bat.imax", "Corrente máx. contínua de descarga (A)")}${fld("eq.bat.ipico", "Corrente de pico (A)", { hint: "limite do BMS/fabricante" })}${fld("eq.bat.tpico", "Duração do pico (s)", { step: "0.5" })}${fld("eq.bat.cca", "CCA (A, só chumbo; 0 = não informado)", { hint: "30 s a −18 °C até 7,2 V (12 V)" })}${S.crit.bat === "li" ? fld("eq.bat.bms", "BMS", { opts: [["integrado", "Integrado no módulo (rack)"], ["externo", "Externo (células avulsas)"]] }) : ""}</div><div class="actions"><button class="btn small ghost" type="button" id="batPadrao">Usar bateria padrão desta tecnologia</button></div></div>
    <div class="block"><h3>Controlador de carga MPPT</h3><div class="grid">${fld("eq.ctrl.nome", "Modelo", { type: "text" })}${fld("eq.ctrl.imax", "Corrente máx. de carga (A)")}${fld("eq.ctrl.vocmax", "Voc máx. de entrada (V)")}${fld("eq.ctrl.p48", "Potência FV máx. em 48 V (W)", { hint: "proporcional à tensão do banco" })}</div></div>
    <div class="block"><h3>Inversor off-grid</h3><div class="grid">${fld("eq.inv.nome", "Modelo", { type: "text" })}${fld("eq.inv.p", "Potência contínua (W)")}${fld("eq.inv.surto", "Fator de surto (× P, ~5 s)", { step: "0.1" })}${fld("eq.inv.eta", "Rendimento", { step: "0.01" })}${fld("eq.inv.carr", "Carregador CA (A)", { hint: "recarga pelo gerador" })}${fld("eq.inv.vcorte", "Corte por subtensão (V; 0 = automático)", { step: "0.1", hint: `automático: ${fmt(R.Vnom * R.T.vCorte, 1)} V` })}</div></div>`; },
  bat: () => { const c = S.crit, gov = { nub: "dias nublados", falta: "falta da concessionária", min: "mínimo de meio dia" }[R.autGov]; return `<p class="intro">O banco cobre o <b>maior</b> de dois eventos: <b>${fmt(n(c.aut), 1)} dia(s) nublado(s)</b> seguidos${n(c.fnub) > 0 ? ` (gerando ${pct(n(c.fnub))} do pior mês)` : ""} ou <b>${fmt0(n(c.hfalta))} h sem a concessionária</b> alimentando só as cargas críticas, descendo no máximo até o DoD de projeto. Governa: <b>${gov}</b>.</p>
    ${formula(`E_nublado = E_bat × N_nub × (1 − f_nub) = ${fmt0(R.Ebat)} × ${fmt(n(c.aut), 1)} × (1 − ${fmt(n(c.fnub), 2)}) = ${fmt0(R.EautNub)} Wh
E_falta   = E_crít × h_falta / 24 = ${fmt0(R.EcritBat)} × ${fmt0(n(c.hfalta))} / 24 = ${fmt0(R.EautFalta)} Wh
C [Wh] = máx(E_nublado; E_falta) / (DoD × f_temp) = ${fmt0(R.Eaut)} / (${fmt(R.dod, 2)} × ${c.ftemp}) = ${fmt0(R.Cwh)} Wh
C [Ah] = C[Wh] / V_banco = ${fmt0(R.Cwh)} / ${R.Vb} = ${fmt0(R.Cah)} Ah
Série = V_banco / V_unid = ${R.Vb} / ${n(S.eq.bat.v)} → ${R.bNs}    Paralelo = C / Ah_unid = ${fmt0(R.Cah)} / ${n(S.eq.bat.ah)} → ${R.bNp}`)}
    <div class="res">${card("Baterias", R.bN + " un.", `${R.bNs} série × ${R.bNp} paralelo`)}${card("Capacidade instalada", fmt0(R.CinstAh) + " Ah", fmt(R.CinstWh / 1000, 1) + " kWh nominais")}${card("DoD diário", pct(R.dodDia), "consumo de 1 dia / capacidade")}${card("DoD no evento", pct(R.dodAut), `limite ${pct(R.dod)}`)}${card("Dias nublados suportados", fmt(R.autReal, 1) + " dias", "consumo total, sem sol")}${card("Falta suportada", R.EcritBat > 0 ? fmt0(R.faltaReal) + " h" : "—", "só cargas críticas")}${card("Recarga após o evento", isFinite(R.tRec) ? fmt(R.tRec, 1) + " dias" : "∞", "no pior mês, só com o FV")}${card("Corrente de carga máx.", fmt0(R.icMax) + " A", R.T.cCarga + " C")}</div>
    ${R.tRec > 15 ? `<p class="note warn">Depois de um evento de autonomia, o excedente do pior mês (${fmt0(R.excBat)} Wh/dia) leva ${isFinite(R.tRec) ? fmt0(R.tRec) : "∞"} dias para recarregar o banco. ${S.backup.tipo !== "nenhum" ? "A fonte reserva cobre essa recarga." : "Sem fonte reserva, considere “dias para recuperar” na etapa 04."}</p>` : ""}
    <div class="block"><h3>Vida útil — dano acumulado (Palmgren-Miner) e temperatura</h3>
    ${formula(`Dano/ano = Σ n_i / N(DoD_i)    vida_ciclos = 1 / (Dano/ano × f_T)    vida_calendário = ${R.T.vidaCal} / f_T
f_T = 2^((T − 25)/10) = 2^((${R.tb} − 25)/10) = ${fmt(R.fT, 2)}    vida = mín(${fmt(R.vidaCic, 1)}; ${fmt(R.vidaCal, 1)}) = ${fmt(R.vida, 1)} anos`)}
    <div class="tbl"><table><thead><tr><th>Evento</th><th class="r">n/ano</th><th class="r">DoD</th><th class="r">Ciclos N(DoD)</th><th class="r">Dano/ano</th></tr></thead><tbody>${R.miner.map(x => `<tr><td>${esc(x.ev)}</td><td class="num">${fmt0(x.n)}</td><td class="num">${pct(x.dod)}</td><td class="num">${fmt0(x.N)}</td><td class="num">${fmt(x.dano * 100, 2)}%</td></tr>`).join("")}<tr class="sub"><td colspan="4">Total (${fmt0(R.cicEqAno)} ciclos equivalentes/ano)</td><td class="num">${fmt(R.danoAno * 100, 2)}%</td></tr></tbody></table></div>
    <div class="res">${card("Vida por ciclos", fmt(R.vidaCic, 1) + " anos", "Miner, corrigida por f_T")}${card("Vida de calendário", fmt(R.vidaCal, 1) + " anos", `a ${R.tb} °C`)}${card("Vida útil", fmt(R.vida, 1) + " anos", R.vidaCic > R.vidaCal ? "limitada pelo calendário" : "limitada pelos ciclos")}${card("Fim de vida", "SOH 80%", "capacidade restante")}</div>
    ${vidaSVG(R)}<p class="step-hint">Curva típica de catálogo (ciclos até 80% da capacidade × DoD, a 25 °C).</p></div>
    <div class="block"><h3>Picos de partida: queda de tensão, BMS e capacitor</h3>
    ${formula(`I_pico = P_surto/(η·V_ref) = ${fmt0(R.surto)}/(${S.eq.inv.eta}·${fmt(R.Vref, 1)}) = ${fmt0(R.Ipk)} A   (V_ref = OCV no DoD máx.)
R_banco = R_i·Ns/Np + R_cabos = ${n(S.eq.bat.ri)}·${R.bNs}/${R.bNp} mΩ + ${fmt(R.Rcabo * 1000, 2)} mΩ = ${fmt(R.Rbanco * 1000, 2)} mΩ
V_queda = V_ref − I_pico·R_banco = ${fmt(R.Vref, 1)} − ${fmt0(R.Ipk)}·${fmt(R.Rbanco, 4)} = ${fmt(R.Vsag, 1)} V   (corte do inversor ${fmt(R.vCorte, 1)} V)
I_bateria,máx = mín[(V_ref − V_corte − 2%·V_nom)/R_banco; Np·I_pico,BMS] = mín(${isFinite(R.IlimV) ? fmt0(R.IlimV) : "∞"}; ${isFinite(R.IlimBMS) ? fmt0(R.IlimBMS) : "∞"}) = ${isFinite(R.Ibat) ? fmt0(R.Ibat) : "∞"} A
C_cap ≥ I_exc·t/(ΔV − I_exc·ESR) = ${fmt0(R.Iexc)}·${R.tPart}/(${fmt(R.dVadm, 2)} − ${fmt0(R.Iexc)}·${fmt(R.capEsrB, 4)}) = ${fmt(R.Ccap, 1)} F     (regra do som automotivo: 1 F/kW em 12 V → ${fmt(R.Cregra, 2)} F em ${fmt0(R.Vref)} V)`)}
    <div class="res">${card("Pico no banco", fmt0(R.Ipk) + " A", `${fmt0(R.Iunid)} A por bateria`)}${card("Tensão no pico", fmt(R.Vsag, 1) + " V", `corte ${fmt(R.vCorte, 1)} V`)}${card("Pico do BMS/bateria", fmt0(n(S.eq.bat.ipico)) + " A", `por ${n(S.eq.bat.tpico)} s`)}${card("Banco capacitivo", R.capNec ? fmt(R.capC, 1) + " F" : "não necessário", R.capNec ? `${R.capNs}S × ${R.capNp}P · 16 V ${R.capMod} F` : "o banco segura o pico")}${R.cca ? card("CCA do banco", fmt0(R.cca.banco) + " A", R.cca.ok ? "atende o pico" : "abaixo do pico") : ""}</div>
    <p class="note ${R.capNec ? "warn" : "ok"}">${R.capNec ? `Supercapacitor em paralelo com o banco fornece o excedente durante a partida (como no som automotivo). Exige <b>pré-carga</b> (≈ ${fmt(R.Rpre, 1)} Ω, ${fmt0(R.tPre)} s) antes de fechar — ligar descarregado equivale a um curto —, ESR baixa (a ESR do banco capacitivo precisa ser bem menor que a resistência do banco de baterias, senão ele não assume corrente), fusível próprio e tensão nominal ≥ ${fmt0(R.vChgMax * 1.05)} V (tensão de carga). Antes, avalie partida suave ou inversor de frequência no motor: costuma ser mais barato.` : `Banco de ${R.bNp} ${R.bNp > 1 ? "baterias em paralelo" : "bateria"} com ${fmt(R.Rbanco * 1000, 2)} mΩ segura o pico com folga: capacitor dispensável. Em sistemas de 12 V com chumbo e motores grandes (alta corrente, baixa tensão), o capacitor costuma ser necessário — é a lógica do som automotivo.`}</p></div>
    <div class="block"><h3>BMS e balanceamento</h3>${R.bms.map(([st, t, x]) => `<p class="note ${st}"><b>${t}:</b> ${x}</p>`).join("")}</div>
    <div class="block"><h3>Comparação das tecnologias para este consumo</h3><div class="tbl"><table><thead><tr><th>Tecnologia</th><th class="r">DoD</th><th class="r">kWh</th><th class="r">DoD/dia</th><th class="r">Vida</th><th class="r">Trocas/25 a</th></tr></thead><tbody>${Object.entries(TIPOS).map(([k, T]) => { const cw = R.Eaut / (T.dod * T.ftemp), dd = R.Ebat / cw, v = Math.min(ciclos(dd, T.curva) / 365 / R.fT, T.vidaCal / R.fT); return `<tr class="${k === S.crit.bat ? "sel" : ""}"><td>${esc(T.nome)}</td><td class="num">${pct(T.dod)}</td><td class="num">${fmt(cw / 1000, 1)}</td><td class="num">${pct(dd)}</td><td class="num">${fmt(v, 1)}</td><td class="num">${Math.max(0, Math.ceil(25 / v) - 1)}</td></tr>`; }).join("")}</tbody></table></div></div>${avisos()}`; },
  sta: () => { const o = R.est, ub = S.eq.bat; return `<p class="intro">Diagnóstico do banco instalado a partir de medições de campo: <b>SOC</b>, <b>SOH</b>, <b>SoE</b>, <b>SoP</b>, <b>SoB</b> e <b>CCA</b>, e a vida útil restante. Deixe em branco o que não foi medido.</p>
    <div class="block"><h3>Medições</h3><div class="grid">
    ${fld("estado.ocv", `Tensão em repouso por bateria (V)`, { step: "0.01", hint: `bateria de ${n(ub.v)} V, ≥ 2 h sem carga/descarga` })}
    ${fld("estado.cmed", "Capacidade medida (Ah)", { step: "0.1", hint: `ensaio de descarga; nominal ${n(ub.ah)} Ah` })}
    ${fld("estado.rmed", "Resistência interna medida (mΩ)", { step: "0.1", hint: `nova: ${n(ub.ri)} mΩ (catálogo)` })}
    ${fld("estado.ccamed", "CCA medido (A)", { hint: "testador de condutância; chumbo de 12 V" })}
    ${fld("estado.vmax", "Maior tensão entre células/baterias (V)", { step: "0.001" })}
    ${fld("estado.vmin", "Menor tensão entre células/baterias (V)", { step: "0.001" })}
    ${fld("estado.nivel", "Medição feita em", { opts: [["celula", "Células"], ["bateria", "Baterias/módulos"]] })}
    ${fld("estado.idade", "Idade do banco (anos)", { step: "0.1" })}
    ${fld("estado.ciclos", "Ciclos registrados (BMS/monitor)", { step: "1" })}</div></div>
    ${o.tem ? `<div class="res">
    ${o.soc != null ? card("SOC", pct(o.soc), `OCV ${fmt(o.vcel, 3)} V/célula`) + card("DoD atual", pct(o.dod), "1 − SOC") : ""}
    ${o.soh != null ? card("SOH", pct(o.soh), "pior indicador: " + o.sohFonte) : ""}
    ${o.sohC != null ? card("SOH capacidade", pct(o.sohC), `${fmt(n(S.estado.cmed), 1)} / ${n(ub.ah)} Ah`) : ""}
    ${o.sohR != null ? card("SOH resistência", pct(o.sohR), `${fmt(n(S.estado.rmed), 1)} mΩ (fim de vida em ${fmt(2 * n(ub.ri), 1)} mΩ)`) : ""}
    ${o.sohCCA != null ? card("SOH CCA", pct(o.sohCCA), `${fmt0(n(S.estado.ccamed))} / ${fmt0(n(ub.cca))} A`) : ""}
    ${o.soe != null ? card("SoE", fmt(o.soe / 1000, 1) + " kWh", "energia armazenada agora") + card("Energia utilizável", fmt(o.util / 1000, 1) + " kWh", `até o DoD de projeto · ${fmt0(o.autH)} h de consumo`) : ""}
    ${o.sop != null ? card("SoP", fmt(o.sop / 1000, 1) + " kW", `limitado por ${o.sopLim} · surto exigido ${fmt(R.surto / 1000, 1)} kW`) : ""}
    ${o.dv != null ? card("SoB (ΔV)", fmt(o.dv * 1000, 0) + " mV", `${o.balOk ? "equilibrado" : "desbalanceado"} · limite ${fmt(o.dvLim * 1000, 0)} mV`) : ""}
    ${card("Vida restante", isFinite(o.anosRest) ? fmt(o.anosRest, 1) + " anos" : "—", o.anosTend != null ? `projeto ${fmt(o.anosProj, 1)} · tendência do SOH ${fmt(o.anosTend, 1)}` : "pelo projeto")}
    ${o.cicRest != null ? card("Ciclos restantes", fmt0(o.cicRest), `no DoD diário (${fmt0(o.ciclos)} feitos)`) : ""}</div>
    ${o.dv != null ? `<p class="note ${o.balOk ? "ok" : "warn"}">${o.balOk ? "Banco equilibrado." : "Desbalanceamento acima do limite: verifique o balanceador/BMS, faça carga de absorção prolongada (lítio) ou equalização (chumbo ventilado) e confira conexões e temperatura das unidades."}</p>` : ""}
    ${o.soh != null && o.soh < 0.8 ? `<p class="note bad">SOH abaixo de 80%: fim de vida. Planeje a troca do banco inteiro (não misture baterias novas e velhas).</p>` : ""}
    ${formula(`SOC: tabela OCV × SOC da tecnologia (${R.T.nome})${R.T === TIPOS.li ? " — LiFePO4 tem curva plana: prefira o SOC do BMS/shunt" : ""}
SOH = mín(C_medida/C_nominal; 1 − 0,2·(R_medida − R_nova)/R_nova; CCA_medido/CCA_nominal)
SoE = SOC × SOH × E_nominal          SoP = mín[V_corte·(V_ocv − V_corte)/R_banco; V_corte·Np·I_pico,BMS]
SoB: ΔV = V_máx − V_mín ≤ ΔV_lim     Vida restante = mín(vida_projeto − idade; (SOH − 0,8)/perda_anual)`)}` : `<p class="note">Informe ao menos uma medição para ver o diagnóstico.</p>`}
    <div class="block"><h3>Indicadores de estado da bateria</h3><div class="tbl prot"><table><thead><tr><th>Sigla</th><th>Significado</th><th>Como medir / usar</th></tr></thead><tbody>
    ${[["SOC", "State of Charge — estado de carga (% da capacidade atual)", "Contagem de Ah (shunt ou BMS); tensão em repouso (OCV) no chumbo. Base do controle de carga e do corte."], ["DoD", "Depth of Discharge — profundidade de descarga = 1 − SOC", "Define ciclos e vida; projeto: lítio 80%, chumbo 50%."], ["SOH", "State of Health — capacidade atual / nominal", "Ensaio de descarga, resistência interna ou CCA; fim de vida em 80%."], ["SoE", "State of Energy — energia disponível (Wh)", "SOC × SOH × energia nominal; autonomia real hoje."], ["SoP", "State of Power — potência máxima que o banco entrega sem cair abaixo da tensão de corte", "V_corte·(OCV − V_corte)/R_i; compara com o surto dos motores."], ["SoB", "State of Balance — equilíbrio entre células/baterias em série", "Diferença de tensão em repouso; LiFePO4 ≤ 30 mV/célula, chumbo ≤ 50 mV/célula."], ["CCA", "Cold Cranking Amps — corrente por 30 s a −18 °C até 7,2 V (bateria de 12 V)", "Testador de condutância; indica resistência interna e sulfatação do chumbo."], ["Ri", "Resistência interna", "Medidor AC 1 kHz ou degrau de corrente ΔV/ΔI; dobrar o valor de nova ≈ fim de vida."], ["Ciclos eq.", "Ciclos equivalentes = Ah descarregados / capacidade nominal", "Registrados pelo BMS; somam o dano real de uso."]].map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table></div></div>`; },
  fv: () => `<p class="intro">O gerador FV precisa repor, <b>no mês de menor irradiação</b>, a energia retirada da bateria mais as perdas de carga e descarga.</p>
    ${formula(`E_FV = E_bat / η_bat = ${fmt0(R.Ebat)} / ${R.T.eta} = ${fmt0(R.Efv)} Wh/dia
P_FV = E_FV / (HSP_mín × PR) = ${fmt0(R.Efv)} / (${fmt(R.hsp, 2)} × ${S.crit.pr}) = ${fmt0(R.Pnec)} W  →  ${R.Nnec} módulos de ${S.eq.mod.p} W
Voc,máx = Voc·[1 + β·(T_mín − 25)] = ${S.eq.mod.voc}·[1 + ${S.eq.mod.bvoc}%·(${S.temp.tmin} − 25)] = ${fmt(R.vocMax, 2)} V  →  Ns ≤ ${S.eq.ctrl.vocmax}/${fmt(R.vocMax, 2)} = ${R.NsMax}
Vmp,quente = Vmp·[1 + β·(T_máx + 30 − 25)] = ${fmt(R.vmpQ, 2)} V  →  Ns ≥ (V_carga ${fmt(R.vChg, 1)} + 5)/${fmt(R.vmpQ, 2)} = ${R.NsMin}`)}
    <div class="res">${card("Módulos", R.Nmod, `${R.Ns} em série × ${R.Nstr} strings`)}${card("Potência instalada", fmt(R.Pfv / 1000, 2) + " kWp", `necessário ${fmt(R.Pnec / 1000, 2)} kWp`)}${card("Voc,máx do arranjo", fmt0(R.vocArr) + " V", `a ${S.temp.tmin} °C (limite ${S.eq.ctrl.vocmax} V)`)}${card("Controladores", R.nCtrl + "×", `${R.strCtrl} string(s) cada · ${fmt(R.iCtrl)} A de ${S.eq.ctrl.imax} A`)}${card("Folga no pior mês", pct(R.sobra), "produção / necessidade − 1")}${card("Área aprox.", fmt(R.Nmod * 2.6, 0) + " m²", "≈ 2,6 m² por módulo de 550 W")}</div>
    <div class="block"><h3>Produção mensal estimada × necessidade</h3>${barrasSVG(R.prodMes.map(v => v / 1000), { destacar: R.mesCrit, alvo: R.Efv / 1000, alvoTxt: "necessidade " + fmt(R.Efv / 1000, 2) + " kWh/dia", un: "kWh/dia gerados (P_FV × HSP × PR)" })}<p class="step-hint">Nos meses fortes sobra energia (o controlador corta a carga quando a bateria enche). Esse é o preço do off-grid: dimensionar pelo pior mês.</p></div>${avisos()}`,
  inv: () => { const b = S.backup; return `<p class="intro">O inversor alimenta as cargas CA a partir do banco. Ele é dimensionado pela potência simultânea com folga e precisa suportar o surto de partida dos motores.</p>
    ${formula(`P_inv ≥ 1,25 × P_simultânea = 1,25 × ${fmt0(R.Psim)} = ${fmt0(R.PinvNec)} W  →  ${R.invN}× ${fmt0(n(S.eq.inv.p))} W
Surto: P_sim + maior motor × (Ip/In − 1) = ${fmt0(R.surto)} W ≤ ${fmt0(R.surtoInv)} W (${S.eq.inv.surto} × P)
I_cc = P_inv / (η × V_mín) = ${fmt0(R.Pinv)} / (${S.eq.inv.eta} × ${fmt(R.Vb * R.T.vMin, 1)}) = ${fmt0(R.iDcInv)} A    I_ca = ${fmt(R.iAc)} A`)}
    <div class="res">${card("Inversor", R.invN + "× " + fmt(n(S.eq.inv.p) / 1000, 1) + " kW", "onda senoidal pura")}${card("Entrada CC", R.Vb + " V", fmt0(R.iDcInv) + " A máx.")}${card("Saída CA", S.crit.vac + " V", fmt(R.iAc) + " A")}${card("Surto exigido", fmt0(R.surto) + " W", R.surto <= R.surtoInv ? "atendido" : "NÃO atendido")}</div>
    <div class="block"><h3>Segunda fonte e transferência</h3><div class="grid">${fld("backup.tipo", "Fonte reserva", { opts: [["nenhum", "Nenhuma"], ["gerador", "Gerador a combustível"], ["rede", "Rede da concessionária"]] })}${fld("backup.chave", "Tipo de chave", { opts: [["auto", "Automática (ATS)"], ["manual", "Manual (reversora 1-0-2)"]] })}</div>
    ${b.tipo !== "nenhum" ? `${formula(`Gerador ≥ 1,25 × (P_sim + P_carregador) = 1,25 × (${fmt0(R.Psim)} + ${fmt0(R.pCarr)}) = ${fmt0(R.pGerRec)} W  →  ${fmt(R.sGerRec / 1000, 1)} kVA (fp 0,8)
Chave: In ≥ 1,25 × máx(I_inv ${fmt(R.iAc)} A; I_gerador ${fmt(R.iGer)} A) = ${fmt(R.iChave)} A  →  ${R.inChave} A, ${R.polos} polos`)}
    <div class="two"><p class="note ok"><b>Automática (ATS):</b> para cargas que não podem esperar alguém: resfriamento de leite, bombeamento, aviário, incubadora. Comuta sozinha na falta da fonte principal ou com bateria baixa (contato seco do inversor dá a partida no gerador).</p><p class="note"><b>Manual (reversora 1-0-2):</b> mais barata e simples; posição 0 entre as fontes. Serve quando há pessoa no local e a carga tolera a interrupção.</p></div>
    <p class="note warn">Em qualquer caso: <b>intertravamento mecânico</b> (as duas fontes nunca em paralelo), comutação de <b>fase e neutro</b> (cada fonte tem sua ligação neutro-terra) e, se a fonte reserva for a rede, chave homologada pela distribuidora para impedir injeção na rede.</p>` : `<p class="note">Sem fonte reserva, a autonomia de ${S.crit.aut} dia(s) é a única proteção contra sequências de dias nublados. Considere pelo menos uma tomada para gerador portátil com reversora manual.</p>`}</div>${avisos()}`; },
  prot: () => `<p class="intro">Proteções e seções no padrão do projeto elétrico: cada trecho com dispositivo e critério. Lado CC conforme NBR 16690; lado CA conforme NBR 5410.</p>
    <div class="tbl prot"><table><thead><tr><th>Trecho</th><th>Dispositivo</th><th>Especificação</th><th>Critério</th></tr></thead><tbody>${R.prot.map(p => `<tr><td><b>${esc(p[0])}</b></td><td>${esc(p[1])}</td><td class="mono">${esc(p[2])}</td><td>${esc(p[3])}</td></tr>`).join("")}</tbody></table></div>
    <div class="block"><h3>Cabos (capacidade NBR 5410 Tab. 36 B1 e queda de tensão)</h3><div class="grid">${fld("cabos.lfv", "Módulos → controlador (m)")}${fld("cabos.lbat", "Controlador/inversor → bateria (m)")}${fld("cabos.lca", "Inversor → quadro CA (m)")}${fld("cabos.dvfv", "Queda máx. FV (%)", { step: "0.5" })}${fld("cabos.dvbat", "Queda máx. bateria (%)", { step: "0.5" })}${fld("cabos.dvca", "Queda máx. CA (%)", { step: "0.5" })}</div>
    <div class="tbl"><table><thead><tr><th>Trecho</th><th class="r">I projeto (A)</th><th class="r">L (m)</th><th class="r">V</th><th class="r">S por queda</th><th class="r">S por capacidade</th><th class="r">Seção</th><th class="r">ΔV real</th></tr></thead><tbody>
    ${[["String FV", 1.25 * n(S.eq.mod.isc), S.cabos.lfv, R.vmpArr, R.cFV], R.cArr ? ["Arranjo (string box → MPPT)", 1.25 * n(S.eq.mod.isc) * R.strCtrl, 3, R.vmpArr, R.cArr] : null, ["Controlador → barramento", 1.25 * R.iCtrl, S.cabos.lbat, R.Vb, R.cCtrl], ["Inversor → barramento", 1.25 * R.iDcInv / R.invN, S.cabos.lbat, R.Vb, R.cInv], ["Banco → barramento", 1.25 * R.iBat, S.cabos.lbat, R.Vb, R.cBat], ["Inversor → quadro CA", 1.25 * R.iAc, S.cabos.lca, R.vac, R.cAc]].filter(Boolean).map(([t, i, l, v, c]) => `<tr><td>${t}</td><td class="num">${fmt(i)}</td><td class="num">${fmt(n(l), 1)}</td><td class="num">${fmt0(v)}</td><td class="num">${fmt(c.sdv, 1)}</td><td class="num">${fmt(c.sA, 1)}</td><td class="num"><b>${c.s} mm²</b></td><td class="num">${fmt(c.dv, 2)}%</td></tr>`).join("")}</tbody></table></div>
    ${formula("S_queda = 2·L·I / (56·ΔV)   (cobre, ida e volta)        S_capacidade: menor seção com Iz ≥ I")}</div>
    <div class="block"><h3>Seguranças obrigatórias</h3><ul class="pend">${["Fusível no polo positivo do banco o mais perto possível da bateria (curto em bateria de lítio passa de vários kA)", "Seccionadora CC do banco e da string box para manutenção sem arco", "DPS CC na string box e DPS CA no quadro, aterrados no mesmo BEP", "Barramentos CC isolados com tampa; polaridade identificada (vermelho +, preto/azul −)", "Banco em abrigo ventilado (chumbo: hidrogênio), longe de faíscas, com sinalização de risco elétrico e químico", "DR 30 mA nos circuitos CA de tomadas e áreas molhadas (ordenha, lavagem)", "Intertravamento mecânico entre inversor e fonte reserva", "Equipotencialização das molduras, estruturas e racks; SPDA se a análise de risco (NBR 5419) indicar"].map(t => `<li class="ok">${t}</li>`).join("")}</ul></div>${avisos()}`,
  esq: () => `<p class="intro">Diagrama unifilar gerado a partir dos cálculos (vermelho: positivo CC; azul: negativo CC; verde: proteção/terra). Vai para o PDF em página A4 paisagem.</p>${esquemaSVG(R)}
    <p class="note">Convenções: as cores e a numeração seguem o projeto elétrico principal. Para o projeto executivo, detalhe a string box, o quadro CC e o quadro CA em pranchas próprias (NBR 5444).</p>`,
  cus: () => { const C = R.custo; return `<p class="intro">Quantidades vêm do dimensionamento; preços de referência de out/2026 com a fonte de cada um. Edite o preço unitário para a sua cotação.</p>
    <div class="tbl ct"><table><thead><tr><th>Grupo</th><th>Item</th><th class="r">Qtd</th><th>Un.</th><th class="r">Preço unit.</th><th class="r">Total</th></tr></thead><tbody>${R.mat.map(m => `<tr><td>${esc(m.g)}</td><td style="white-space:normal">${esc(m.d)}</td><td class="num">${fmt(m.q, m.q % 1 ? 1 : 0)}</td><td>${esc(m.un)}</td><td><input type="number" step="0.01" data-pu="${m.k}" value="${n(S.precos[m.k]?.pu)}"></td><td class="num">${brl(m.q * m.pu)}</td></tr>`).join("")}<tr class="sub"><td colspan="5">Equipamentos e materiais</td><td class="num">${brl(C.eq)}</td></tr></tbody></table></div>
    <div class="block"><h3>Mão de obra e despesas</h3><div class="grid">${fld("mo.heng", "Horas de engenharia (projeto, ART, comissionamento)")}${fld("mo.peng", "R$/h engenharia")}${fld("mo.hele", "Horas de eletricista (NR-10)")}${fld("mo.pele", "R$/h eletricista")}${fld("mo.haux", "Horas de auxiliar")}${fld("mo.paux", "R$/h auxiliar")}${fld("mo.km", "Deslocamento total (km)")}${fld("mo.pkm", "R$/km")}${fld("mo.desp", "Outras despesas (R$)")}${fld("mo.bdi", "BDI / lucro (%)")}${fld("mo.imp", "Impostos (%)")}</div><p class="step-hint">${esc(S.mo.f)}</p></div>
    <div class="res">${card("Equipamentos", brl(C.eq))}${card("Serviços", brl(C.sv))}${card("Deslocamento e despesas", brl(C.desl))}${card("BDI + impostos", brl(C.bdi + C.imp))}${card("Total", brl(C.total))}${card("R$/Wp", fmt(R.indic.rsWp, 2))}${card("R$/kWh armazenado", fmt0(R.indic.rsKwh))}${card("Custo da energia (25 anos)", "R$ " + fmt(R.indic.lcoe, 2) + "/kWh", `${R.indic.trocas} troca(s) do banco`)}</div>
    <details><summary>Fontes dos preços de referência</summary><ul>${Object.values(S.precos).map(p => `<li>${esc(p.d)}: ${brl(n(p.pu))} — ${esc(p.f)}</li>`).join("")}</ul></details>`; },
  fim: () => `<p class="intro">Salve o projeto em JSON para editar depois e gere o relatório em PDF com memória de cálculo, esquema, lista de materiais e custos.</p>
    <div class="actions"><button class="btn primary" type="button" id="btnPdf">Gerar relatório PDF</button><button class="btn" type="button" id="btnSave2">Exportar JSON</button></div><div class="progress"><div id="pdfProg"></div></div><p class="note" id="pdfMsg">O PDF inclui: identificação, irradiação (pior caso), cargas, banco de baterias e vida útil, gerador FV, controlador, inversor, transferência, proteções, cabos, diagrama unifilar, materiais e custos.</p>
    ${avisos() || '<p class="note ok">Sem alertas de cálculo.</p>'}`
};

/* --------- eventos --------- */
document.addEventListener("click", e => {
  const b = e.target.closest("button, [data-step]"); if (!b) return;
  if (b.dataset.step != null) { cur = +b.dataset.step; render(); window.scrollTo({ top: 0 }); return; }
  if (b.dataset.nav) { cur = Math.max(0, Math.min(STEPS.length - 1, cur + +b.dataset.nav)); render(); window.scrollTo({ top: 0 }); return; }
  if (b.dataset.del != null) { S.cargas.splice(+b.dataset.del, 1); persist(); render(); return; }
  if (b.dataset.est != null) { aplicarEstacao(+b.dataset.est, S.local.fonte); render(); return; }
  switch (b.id) {
    case "addC": S.cargas.push({ nome: "Novo equipamento", tipo: "CA", q: 1, w: 100, h: 1, fs: 1, kp: 1, crit: 1 }); break;
    case "btnGeo": usarLocalizacao(); return;
    case "btnSun": buscarSunData(); return;
    case "btnNasa": buscarNASA(); return;
    case "btnColar": colarSunData(); return;
    case "batPadrao": S.eq.bat = Object.assign({}, TIPOS[S.crit.bat].unid); break;
    case "btnSave": case "btnSave2": salvarJSON(); return;
    case "btnOpen": $("#fileOpen").click(); return;
    case "btnSample": if (!S.cargas.length || confirm("Substituir o projeto atual pelo exemplo?")) { S = exemplo(); cur = 1; toast("Exemplo carregado (irradiação ilustrativa: consulte o CRESESB para um projeto real)."); } break;
    case "btnNew": if (confirm("Começar um projeto em branco?")) { S = novo(); cur = 0; } break;
    case "btnPdf": gerarPDF(); return;
    default: return;
  }
  persist(); render();
});
let deb;
document.addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.bind) { const old = getP(t.dataset.bind); setP(t.dataset.bind, t.type === "number" ? (t.value === "" ? "" : n(t.value)) : t.value);
    if (t.dataset.bind === "crit.bat" && old !== t.value) { S.eq.bat = Object.assign({}, TIPOS[t.value].unid); S.crit.dod = TIPOS[t.value].dod; S.crit.ftemp = TIPOS[t.value].ftemp; } }
  else if (t.dataset.c != null) { const l = S.cargas[+t.dataset.c]; l[t.dataset.f] = t.type === "checkbox" ? (t.checked ? 1 : 0) : t.type === "number" ? n(t.value) : t.value; }
  else if (t.dataset.row != null) S.local.sel = +t.dataset.row;
  else if (t.dataset.pu) S.precos[t.dataset.pu].pu = n(t.value);
  else if (t.id === "fileOpen") { abrirJSON(t.files[0]); return; }
  else return;
  persist(); clearTimeout(deb); deb = setTimeout(render, 10);
});
function salvarJSON() {
  const o = Object.assign({}, S); delete o._estacoes;
  o.resultados = { hsp: R.hsp, mesCritico: MESES[R.mesCrit], consumoWh: R.ECA + R.ECC, ebatWh: R.Ebat, pfvW: R.Pfv, modulos: R.Nmod, serie: R.Ns, strings: R.Nstr, bancoV: R.Vb, bancoAh: R.CinstAh, baterias: R.bN, dodDiario: R.dodDia, autonomiaDias: R.autReal, faltaHoras: R.faltaReal, recargaDias: isFinite(R.tRec) ? R.tRec : null, vidaAnos: R.vida, vidaCiclosAnos: R.vidaCic, vidaCalendarioAnos: R.vidaCal, picoA: R.Ipk, quedaV: R.Vsag, capacitorF: R.capNec ? R.capC : 0, estado: { soc: R.est.soc ?? null, soh: R.est.soh ?? null, soeWh: R.est.soe ?? null, sopW: R.est.sop ?? null, dvBalanceamentoV: R.est.dv ?? null, vidaRestanteAnos: isFinite(R.est.anosRest) ? R.est.anosRest : null }, controladores: R.nCtrl, inversor: R.Pinv, totalR$: R.custo.total, geradoEm: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(o, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "offgrid-" + (S.id.obra || "projeto").toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-").replace(/-+/g, "-").slice(0, 50) + ".json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function abrirJSON(f) {
  if (!f) return; const r = new FileReader();
  r.onload = () => { try { const o = JSON.parse(r.result); if (o.formato !== FORMATO) throw new Error("arquivo não é um projeto off-grid desta ferramenta"); S = mesclar(o); delete S.resultados; persist(); render(); toast("Projeto importado."); } catch (e) { toast("Não foi possível importar: " + e.message); } };
  r.readAsText(f);
}

/* ============================================================
   PDF (pdf-lib)
   ============================================================ */
const WIN = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
function pt(s) {
  s = String(s ?? "").replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/Δ/g, "d").replace(/√/g, "raiz").replace(/Ω/g, "ohm").replace(/≈/g, "~").replace(/η/g, "eta").replace(/β/g, "beta").replace(/φ/g, "phi").replace(/→/g, "->").replace(/←/g, "<-").replace(/−/g, "-").replace(/·/g, "·").replace(/×/g, "x").replace(/₀/g, "0").replace(/²/g, "²").replace(/ /g, " ");
  let o = ""; for (const ch of s) { const c = ch.codePointAt(0); o += (c < 256 || WIN.has(ch)) ? ch : "?"; } return o;
}
async function gerarPDF() {
  const prog = $("#pdfProg"), msg = $("#pdfMsg"); const P_ = v => { if (prog) prog.style.width = v + "%"; };
  try {
    const { PDFDocument, StandardFonts, rgb, degrees } = PDFLib;
    const doc = await PDFDocument.create(); doc.setTitle("Sistema fotovoltaico off-grid — " + (S.id.obra || "")); doc.setAuthor(S.id.rt || ""); doc.setCreator("UFPel – módulo off-grid");
    const F = await doc.embedFont(StandardFonts.Helvetica), FB = await doc.embedFont(StandardFonts.HelveticaBold), FM = await doc.embedFont(StandardFonts.Courier);
    const INK = rgb(0.09, 0.13, 0.11), MUT = rgb(0.35, 0.42, 0.38), ACC = rgb(0.055, 0.416, 0.306), BG = rgb(0.95, 0.96, 0.95), LN = rgb(0.83, 0.86, 0.84), RED = rgb(0.70, 0.15, 0.12), WARN = rgb(0.6, 0.35, 0);
    let pg, W, H, y; const M = 42;
    const wrap = (t, f, sz, mw) => { const out = []; for (const par of pt(t).split("\n")) { let l = ""; for (const w of par.split(" ")) { const tt = l ? l + " " + w : w; if (f.widthOfTextAtSize(tt, sz) > mw && l) { out.push(l); l = w; } else l = tt; } out.push(l); } return out; };
    const foot = () => { pg.drawText(pt(`${S.id.obra || "Sistema off-grid"} · ${S.id.cliente || ""}`), { x: M, y: 22, size: 7.5, font: F, color: MUT }); pg.drawText(pt(`Página ${doc.getPageCount()}`), { x: W - M - 40, y: 22, size: 7.5, font: F, color: MUT }); };
    const newPage = (land = false) => { pg = doc.addPage(land ? [841.89, 595.28] : [595.28, 841.89]); W = pg.getWidth(); H = pg.getHeight(); y = H - M; foot(); };
    const ensure = h => { if (y - h < 40) newPage(); };
    const text = (t, { size = 9.5, font = F, color = INK, gap = 4, lead = 1.35, x = M, mw = null } = {}) => { for (const l of wrap(t, font, size, mw || W - 2 * M - (x - M))) { ensure(size * lead); pg.drawText(l, { x, y: y - size, size, font, color }); y -= size * lead; } y -= gap; };
    const h1 = t => { newPage(); pg.drawText(pt(t), { x: M, y: y - 18, size: 17, font: FB, color: INK }); y -= 26; pg.drawRectangle({ x: M, y, width: W - 2 * M, height: 1.5, color: ACC }); y -= 14; };
    const h2 = t => { ensure(40); y -= 4; pg.drawText(pt(t), { x: M, y: y - 12, size: 11.5, font: FB, color: ACC }); y -= 20; };
    const mono = t => { const ls = String(t).split("\n"); const hh = ls.length * 11 + 10; ensure(hh); pg.drawRectangle({ x: M, y: y - hh, width: W - 2 * M, height: hh, color: BG }); ls.forEach((l, i) => { const ww = wrap(l, FM, 7.6, W - 2 * M - 12)[0]; pg.drawText(ww, { x: M + 6, y: y - 14 - i * 11, size: 7.6, font: FM, color: INK }); }); y -= hh + 8; };
    const table = (cols, rows, { size = 8, bold = [] } = {}) => {
      const tw = W - 2 * M, tot = cols.reduce((a, c) => a + c.w, 0), ws = cols.map(c => c.w / tot * tw), pad = 3, lead = size * 1.3;
      const head = () => { const hl = cols.map((c, i) => wrap(c.h, FB, size, ws[i] - 2 * pad)); const hh = Math.max(...hl.map(l => l.length)) * lead + 2 * pad; ensure(hh + lead * 2); pg.drawRectangle({ x: M, y: y - hh, width: tw, height: hh, color: BG }); let x = M; hl.forEach((ls, i) => { ls.forEach((l, j) => { const w2 = FB.widthOfTextAtSize(l, size); pg.drawText(l, { x: cols[i].a === "r" ? x + ws[i] - pad - w2 : x + pad, y: y - pad - size - j * lead, size, font: FB, color: MUT }); }); x += ws[i]; }); y -= hh; };
      head();
      rows.forEach((r, ri) => { const cells = r.map((c, i) => wrap(c, F, size, ws[i] - 2 * pad)); const hh = Math.max(...cells.map(l => l.length)) * lead + 2 * pad; if (y - hh < 40) { newPage(); head(); } let x = M; const bd = bold.includes(ri); cells.forEach((ls, i) => { ls.forEach((l, j) => { const f = bd ? FB : F; const w2 = f.widthOfTextAtSize(l, size); pg.drawText(l, { x: cols[i].a === "r" ? x + ws[i] - pad - w2 : x + pad, y: y - pad - size - j * lead, size, font: f, color: INK }); }); x += ws[i]; }); y -= hh; pg.drawLine({ start: { x: M, y }, end: { x: M + tw, y }, thickness: 0.4, color: LN }); });
      y -= 8;
    };
    const barras = (vals, { dest = -1, alvo = null, alvoTxt = "", un = "", hh = 130, cor = ACC } = {}) => {
      ensure(hh + 30); const x0 = M + 30, x1 = W - M, yb = y - hh, yt = y - 10, max = Math.max(...vals, alvo || 0) * 1.15 || 1, gw = (x1 - x0) / vals.length;
      pg.drawText(pt(un), { x: M, y: y, size: 7, font: FB, color: MUT });
      for (let k = 0; k <= 4; k++) { const yy = yb + (yt - yb) * k / 4; pg.drawLine({ start: { x: x0, y: yy }, end: { x: x1, y: yy }, thickness: 0.3, color: LN }); const t = pt(fmt(max * k / 4, max > 20 ? 0 : 1)); pg.drawText(t, { x: x0 - 4 - F.widthOfTextAtSize(t, 6.5), y: yy - 2, size: 6.5, font: F, color: MUT }); }
      vals.forEach((v, i) => { const bh = (yt - yb) * v / max; pg.drawRectangle({ x: x0 + i * gw + 3, y: yb, width: gw - 6, height: bh, color: i === dest ? RED : cor }); const t = pt(fmt(v, 2)); pg.drawText(t, { x: x0 + i * gw + gw / 2 - F.widthOfTextAtSize(t, 6.5) / 2, y: yb + bh + 2, size: 6.5, font: i === dest ? FB : F, color: INK }); pg.drawText(MESES[i], { x: x0 + i * gw + gw / 2 - F.widthOfTextAtSize(MESES[i], 7) / 2, y: yb - 10, size: 7, font: F, color: INK }); });
      if (alvo != null) { const yy = yb + (yt - yb) * alvo / max; pg.drawLine({ start: { x: x0, y: yy }, end: { x: x1, y: yy }, thickness: 1, color: RED, dashArray: [4, 3] }); const t = pt(alvoTxt); pg.drawText(t, { x: x1 - F.widthOfTextAtSize(t, 7), y: yy + 3, size: 7, font: FB, color: RED }); }
      y = yb - 22;
    };
    P_(5);
    /* capa */
    newPage();
    pg.drawRectangle({ x: 0, y: H - 250, width: W, height: 250, color: rgb(0.06, 0.16, 0.12) });
    pg.drawText(pt("PROJETO DE SISTEMA FOTOVOLTAICO ISOLADO (OFF-GRID)"), { x: M, y: H - 80, size: 11, font: FB, color: rgb(0.96, 0.65, 0.14) });
    wrap(S.id.obra || "Sistema off-grid", FB, 24, W - 2 * M).forEach((l, i) => pg.drawText(l, { x: M, y: H - 120 - i * 28, size: 24, font: FB, color: rgb(1, 1, 1) }));
    pg.drawText(pt(S.id.cliente || ""), { x: M, y: H - 200, size: 13, font: F, color: rgb(0.85, 0.9, 0.87) });
    pg.drawText(pt(`${S.id.local || ""} ${S.id.municipio ? "· " + S.id.municipio : ""}`), { x: M, y: H - 220, size: 11, font: F, color: rgb(0.85, 0.9, 0.87) });
    y = H - 290;
    table([{ h: "Item", w: 2 }, { h: "Resultado", w: 3 }], [
      ["Irradiação de projeto (pior caso)", `${fmt(R.hsp, 2)} kWh/m²·dia (${MESES[R.mesCrit]}, ${R.row?.nome || "-"} ${R.row?.ang ?? ""}°)`],
      ["Consumo diário", `${fmt((R.ECA + R.ECC) / 1000, 2)} kWh/dia (retirado da bateria ${fmt(R.Ebat / 1000, 2)} kWh)`],
      ["Gerador fotovoltaico", `${fmt(R.Pfv / 1000, 2)} kWp — ${R.Nmod} módulos de ${S.eq.mod.p} W (${R.Ns} série × ${R.Nstr} strings)`],
      ["Banco de baterias", `${R.bN}× ${S.eq.bat.nome} — ${R.Vb} V, ${fmt0(R.CinstAh)} Ah, ${fmt(R.CinstWh / 1000, 1)} kWh; autonomia ${fmt(R.autReal, 1)} dias`],
      ["DoD diário e vida útil", `${pct(R.dodDia)} → ${fmt0(R.ciclos)} ciclos → ${fmt(R.vida, 1)} anos`],
      ["Controlador de carga", `${R.nCtrl}× ${S.eq.ctrl.nome}`],
      ["Inversor", `${R.invN}× ${S.eq.inv.nome}`],
      ["Transferência", S.backup.tipo === "nenhum" ? "Sem fonte reserva" : `${S.backup.chave === "auto" ? "ATS" : "Reversora manual"} ${R.inChave} A ${R.polos}P — ${S.backup.tipo} ≥ ${fmt(R.sGerRec / 1000, 1)} kVA`],
      ["Investimento estimado", brl(R.custo.total) + ` (${fmt(R.indic.rsWp, 2)} R$/Wp)`]], { size: 9 });
    text(`Responsável técnico: ${S.id.rt || "-"} ${S.id.crea ? "· " + S.id.crea : ""} · Data: ${S.id.data}`, { color: MUT });
    try { if (typeof LOGOS === "object") { let x = M; for (const k of ["ufpel", "ceng", "ea", "lia"]) { if (!LOGOS[k]) continue; const img = await doc.embedPng(Uint8Array.from(atob(LOGOS[k]), c => c.charCodeAt(0))); const s = 44 / img.height; pg.drawImage(img, { x, y: 50, width: img.width * s, height: 44 }); x += img.width * s + 16; } } } catch (e) {}
    P_(20);
    /* irradiação */
    h1("1. Recurso solar — pior caso");
    text(`Fonte: ${S.local.fonte || "-"}. Coordenada: ${S.local.lat}, ${S.local.lon}. ${S.local.estacao ? "Estação: " + S.local.estacao + ". " : ""}${S.local.dist && S.local.dist !== "—" ? "Distância: " + S.local.dist + "." : ""}`);
    text("Critério off-grid: o sistema deve fechar o balanço energético no mês de menor irradiação. Usa-se a linha 'Maior mínimo mensal' do SunData (inclinação que maximiza o pior mês) e, nela, o menor valor mensal — nunca a média anual.", { color: MUT });
    table([{ h: "Plano", w: 3.2 }, { h: "Incl.", w: 0.9, a: "r" }, ...MESES.map(m => ({ h: m, w: 0.85, a: "r" })), { h: "Média", w: 1, a: "r" }, { h: "Mín.", w: 1, a: "r" }],
      (S.local.rows || []).map(r => [r.nome, r.ang + "°", ...r.m.map(v => fmt(v, 2)), fmt(r.media, 2), fmt(Math.min(...r.m), 2)]), { size: 7, bold: [S.local.sel] });
    if (R.row) barras(R.row.m, { dest: R.mesCrit, alvo: R.row.media, alvoTxt: "média anual (não usar)", un: "kWh/m²·dia — " + R.row.nome });
    text(`HSP de projeto = ${fmt(R.hsp, 2)} kWh/m²·dia (${MESES[R.mesCrit]}). Temperaturas de projeto: mínima ${S.temp.tmin} °C (Voc) e máxima ${S.temp.tmax} °C (Vmp).`, { font: FB });
    P_(35);
    /* cargas */
    h1("2. Cargas e consumo");
    table([{ h: "Equipamento", w: 4 }, { h: "CA/CC", w: 0.8 }, { h: "Qtd", w: 0.6, a: "r" }, { h: "W", w: 0.9, a: "r" }, { h: "h/dia", w: 0.8, a: "r" }, { h: "Simult.", w: 0.8, a: "r" }, { h: "Ip/In", w: 0.8, a: "r" }, { h: "Wh/dia", w: 1, a: "r" }],
      [...R.cargas.map(l => [l.nome, l.tipo, String(l.q), fmt0(n(l.w)), fmt(n(l.h), 1), fmt(n(l.fs), 1), fmt(n(l.kp), 1), fmt0(l.e)]), ["Total", "", "", "", "", "", "", fmt0(R.ECA + R.ECC)]], { bold: [R.cargas.length] });
    mono(`E_bat = E_CC/eta_cabos + E_CA/(eta_inv x eta_cabos) = ${fmt0(R.ECC)}/${S.crit.etaCabo} + ${fmt0(R.ECA)}/(${S.crit.etaInv} x ${S.crit.etaCabo}) = ${fmt0(R.Ebat)} Wh/dia
Potência simultânea CA = ${fmt0(R.Psim)} W ; surto de partida = ${fmt0(R.surto)} W`);
    /* banco */
    h2("3. Banco de baterias");
    const cc = S.crit;
    text(`Tecnologia: ${R.T.nome}. Unidade: ${S.eq.bat.nome} (${S.eq.bat.v} V, ${S.eq.bat.ah} Ah, Ri ${S.eq.bat.ri} mOhm). DoD máximo: ${pct(R.dod)}. Autonomia: ${fmt(n(cc.aut), 1)} dia(s) nublado(s) (geração ${pct(n(cc.fnub))}) ou ${fmt0(n(cc.hfalta))} h sem concessionária (cargas críticas). Governa: ${{ nub: "dias nublados", falta: "falta da concessionária", min: "mínimo de meio dia" }[R.autGov]}.`);
    mono(`E_nublado = E_bat x N_nub x (1 - f_nub) = ${fmt0(R.Ebat)} x ${fmt(n(cc.aut), 1)} x (1 - ${fmt(n(cc.fnub), 2)}) = ${fmt0(R.EautNub)} Wh
E_falta = E_crit x h_falta / 24 = ${fmt0(R.EcritBat)} x ${fmt0(n(cc.hfalta))} / 24 = ${fmt0(R.EautFalta)} Wh
C[Wh] = máx(E_nublado; E_falta) / (DoD x f_temp) = ${fmt0(R.Eaut)} / (${fmt(R.dod, 2)} x ${cc.ftemp}) = ${fmt0(R.Cwh)} Wh
C[Ah] = ${fmt0(R.Cwh)} / ${R.Vb} V = ${fmt0(R.Cah)} Ah  ->  ${R.bNs} em série x ${R.bNp} em paralelo = ${R.bN} baterias (${fmt0(R.CinstAh)} Ah, ${fmt(R.CinstWh / 1000, 1)} kWh)
Suporta ${fmt(R.autReal, 1)} dias nublados${R.EcritBat > 0 ? ` ou ${fmt0(R.faltaReal)} h de falta (críticas)` : ""}; recarga após o evento no pior mês: ${isFinite(R.tRec) ? fmt(R.tRec, 1) : "inf."} dias
Corrente de carga máxima recomendada = ${R.T.cCarga} C = ${fmt0(R.icMax)} A`);
    h2("3.1 Vida útil (Palmgren-Miner e temperatura)");
    table([{ h: "Evento", w: 3.5 }, { h: "n/ano", w: 1, a: "r" }, { h: "DoD", w: 1, a: "r" }, { h: "Ciclos N(DoD)", w: 1.3, a: "r" }, { h: "Dano/ano", w: 1.2, a: "r" }],
      [...R.miner.map(x => [x.ev, fmt0(x.n), pct(x.dod), fmt0(x.N), fmt(x.dano * 100, 2) + "%"]), ["Total", "", "", "", fmt(R.danoAno * 100, 2) + "%"]], { bold: [R.miner.length] });
    mono(`f_T = 2^((${R.tb} - 25)/10) = ${fmt(R.fT, 2)} ; vida ciclos = 1/(dano x f_T) = ${fmt(R.vidaCic, 1)} anos ; calendário = ${R.T.vidaCal}/f_T = ${fmt(R.vidaCal, 1)} anos
Vida útil = ${fmt(R.vida, 1)} anos (fim de vida: SOH 80%)`);
    h2("3.2 Picos de partida e banco capacitivo");
    mono(`I_pico = ${fmt0(R.surto)} / (${S.eq.inv.eta} x ${fmt(R.Vref, 1)}) = ${fmt0(R.Ipk)} A (${fmt0(R.Iunid)} A por bateria; pico admissível ${S.eq.bat.ipico} A / ${S.eq.bat.tpico} s)
R_banco = ${S.eq.bat.ri} x ${R.bNs}/${R.bNp} + cabos ${fmt(R.Rcabo * 1000, 2)} = ${fmt(R.Rbanco * 1000, 2)} mOhm ; V no pico = ${fmt(R.Vsag, 1)} V (corte ${fmt(R.vCorte, 1)} V)
${R.capNec ? `C >= I_exc x t / (dV - I_exc x ESR) = ${fmt0(R.Iexc)} x ${R.tPart} / (${fmt(R.dVadm, 2)} - ${fmt0(R.Iexc)} x ${fmt(R.capEsrB, 4)}) = ${fmt(R.Ccap, 1)} F -> ${R.capNs}S x ${R.capNp}P de 16 V ${R.capMod} F = ${fmt(R.capC, 1)} F ; pré-carga ${fmt(R.Rpre, 1)} Ohm` : "Banco capacitivo dispensável: o banco entrega o pico sem atingir o corte nem o limite do BMS."}
Regra do som automotivo (1 F/kW em 12 V) equivalente: ${fmt(R.Cregra, 2)} F em ${fmt0(R.Vref)} V`);
    h2("3.3 BMS e balanceamento");
    R.bms.forEach(([st, t, x]) => text(`${t}: ${x}`, { color: st === "bad" ? RED : st === "warn" ? WARN : INK, size: 8.5 }));
    if (R.est.tem) {
      const o = R.est; h2("3.4 Estado da bateria (medições)");
      table([{ h: "Indicador", w: 2.2 }, { h: "Valor", w: 1.6, a: "r" }, { h: "Base", w: 4 }], [
        o.soc != null ? ["SOC / DoD", `${pct(o.soc)} / ${pct(o.dod)}`, `OCV ${fmt(o.vcel, 3)} V/célula`] : null,
        o.soh != null ? ["SOH", pct(o.soh), "pior indicador: " + o.sohFonte] : null,
        o.soe != null ? ["SoE / utilizável", `${fmt(o.soe / 1000, 1)} / ${fmt(o.util / 1000, 1)} kWh`, `${fmt0(o.autH)} h de consumo até o DoD de projeto`] : null,
        o.sop != null ? ["SoP", fmt(o.sop / 1000, 1) + " kW", `limitado por ${o.sopLim}; surto exigido ${fmt(R.surto / 1000, 1)} kW`] : null,
        o.dv != null ? ["SoB (dV)", fmt(o.dv * 1000, 0) + " mV", `${o.balOk ? "equilibrado" : "desbalanceado"}; limite ${fmt(o.dvLim * 1000, 0)} mV`] : null,
        ["Vida restante", isFinite(o.anosRest) ? fmt(o.anosRest, 1) + " anos" : "-", o.anosTend != null ? `projeto ${fmt(o.anosProj, 1)}; tendência do SOH ${fmt(o.anosTend, 1)}` : "pelo projeto"]].filter(Boolean), { size: 8 });
    }
    text(R.T.obs, { color: MUT });
    P_(50);
    /* FV */
    h1("4. Gerador fotovoltaico e controlador");
    mono(`E_FV = E_bat / eta_bat = ${fmt0(R.Ebat)} / ${R.T.eta} = ${fmt0(R.Efv)} Wh/dia
P_FV = E_FV / (HSP_min x PR) = ${fmt0(R.Efv)} / (${fmt(R.hsp, 2)} x ${S.crit.pr}) = ${fmt0(R.Pnec)} W  ->  ${R.Nnec} módulos de ${S.eq.mod.p} W
Voc,max = ${S.eq.mod.voc} x [1 + (${S.eq.mod.bvoc}/100) x (${S.temp.tmin} - 25)] = ${fmt(R.vocMax, 2)} V  ->  Ns <= ${S.eq.ctrl.vocmax}/${fmt(R.vocMax, 2)} = ${R.NsMax}
Vmp,quente = ${S.eq.mod.vmp} x [1 + (${S.eq.mod.bvoc}/100) x (${S.temp.tmax} + 30 - 25)] = ${fmt(R.vmpQ, 2)} V  ->  Ns >= (${fmt(R.vChg, 1)} + 5)/${fmt(R.vmpQ, 2)} = ${R.NsMin}
Adotado: ${R.Ns} em série x ${R.Nstr} strings = ${R.Nmod} módulos = ${fmt(R.Pfv / 1000, 2)} kWp ; Voc,max arranjo = ${fmt0(R.vocArr)} V
Controladores: ${R.nCtrl} x ${S.eq.ctrl.imax} A (${R.strCtrl} string(s) cada, ${fmt(R.iCtrl)} A)`);
    barras(R.prodMes.map(v => v / 1000), { dest: R.mesCrit, alvo: R.Efv / 1000, alvoTxt: "necessidade " + fmt(R.Efv / 1000, 2) + " kWh/dia", un: "Produção estimada (kWh/dia)", cor: rgb(0.6, 0.35, 0) });
    h2("5. Inversor e transferência");
    mono(`P_inv >= 1,25 x ${fmt0(R.Psim)} = ${fmt0(R.PinvNec)} W  ->  ${R.invN} x ${fmt0(n(S.eq.inv.p))} W ; surto ${fmt0(R.surto)} W <= ${fmt0(R.surtoInv)} W
I_cc = ${fmt0(R.Pinv)} / (${S.eq.inv.eta} x ${fmt(R.Vb * R.T.vMin, 1)}) = ${fmt0(R.iDcInv)} A ; I_ca = ${fmt(R.iAc)} A
${S.backup.tipo === "nenhum" ? "Sem fonte reserva." : `Fonte reserva: ${S.backup.tipo} >= ${fmt(R.sGerRec / 1000, 1)} kVA ; chave ${S.backup.chave === "auto" ? "automática (ATS)" : "manual 1-0-2"} ${R.inChave} A ${R.polos}P com intertravamento`}`);
    P_(60);
    h1("6. Proteções, barramentos e cabos");
    table([{ h: "Trecho", w: 1.6 }, { h: "Dispositivo", w: 2.2 }, { h: "Especificação", w: 1.8 }, { h: "Critério", w: 3 }], R.prot.map(p => p.map(String)), { size: 7.5 });
    table([{ h: "Trecho", w: 2.4 }, { h: "I (A)", w: 0.8, a: "r" }, { h: "L (m)", w: 0.7, a: "r" }, { h: "V", w: 0.7, a: "r" }, { h: "Seção", w: 1, a: "r" }, { h: "dV", w: 0.8, a: "r" }],
      [["String FV", 1.25 * n(S.eq.mod.isc), S.cabos.lfv, R.vmpArr, R.cFV], ["Controlador -> barramento", 1.25 * R.iCtrl, S.cabos.lbat, R.Vb, R.cCtrl], ["Inversor -> barramento", 1.25 * R.iDcInv / R.invN, S.cabos.lbat, R.Vb, R.cInv], ["Banco -> barramento", 1.25 * R.iBat, S.cabos.lbat, R.Vb, R.cBat], ["Inversor -> quadro CA", 1.25 * R.iAc, S.cabos.lca, R.vac, R.cAc]].map(([t, i, l, v, c]) => [t, fmt(i), fmt(n(l), 1), fmt0(v), c.s + " mm²", fmt(c.dv, 2) + "%"]), { size: 8 });
    text("Seguranças: fusível no positivo junto ao banco; seccionadoras CC; DPS CC e CA no mesmo BEP; barramentos isolados; abrigo ventilado e sinalizado; DR 30 mA; intertravamento entre fontes; equipotencialização de estruturas e racks.", { color: MUT });
    if (R.avisos.length) { h2("Alertas"); R.avisos.forEach(a => text("• " + a, { color: WARN })); }
    P_(75);
    /* esquema (paisagem) */
    newPage(true);
    pg.drawText(pt("7. Diagrama unifilar"), { x: M, y: H - M - 4, size: 15, font: FB, color: INK });
    const E = esquema(R), sc = Math.min((W - 2 * M) / E.W, (H - 2 * M - 30) / (E.H + 20)), ox = M, oy = H - M - 30;
    const X = x => ox + x * sc, Y = yy => oy - yy * sc, C = { k: INK, r: rgb(0.71, 0.27, 0.18), b: rgb(0.18, 0.37, 0.71), g: rgb(0.12, 0.48, 0.24) };
    for (const p of E.P) {
      if (p.t === "l") pg.drawLine({ start: { x: X(p.x1), y: Y(p.y1) }, end: { x: X(p.x2), y: Y(p.y2) }, thickness: p.w * sc, color: C[p.c], dashArray: p.d ? p.d.map(v => v * sc) : undefined });
      else if (p.t === "r") { pg.drawRectangle({ x: X(p.x), y: Y(p.y + p.h), width: p.w * sc, height: p.h * sc, borderColor: C[p.c], borderWidth: 1.2, color: rgb(1, 1, 1) }); if (p.txt) { const t = pt(p.txt); pg.drawText(t, { x: X(p.x + p.w / 2) - FB.widthOfTextAtSize(t, 8) / 2, y: Y(p.y + 18), size: 8, font: FB, color: INK }); } if (p.sub) { const t = pt(p.sub); pg.drawText(t, { x: X(p.x + p.w / 2) - F.widthOfTextAtSize(t, 7) / 2, y: Y(p.y + 34), size: 7, font: F, color: MUT }); } }
      else if (p.t === "t") { const f = p.b ? FB : F, sz = p.sz * sc * 0.95, t = pt(p.s); pg.drawText(t, { x: p.a === "m" ? X(p.x) - f.widthOfTextAtSize(t, sz) / 2 : X(p.x), y: Y(p.y), size: sz, font: f, color: C[p.c] }); }
      else if (p.t === "pv") { pg.drawRectangle({ x: X(p.x), y: Y(p.y + 26), width: 32 * sc, height: 26 * sc, color: rgb(0.86, 0.9, 0.97), borderColor: C.b, borderWidth: 0.8 }); pg.drawLine({ start: { x: X(p.x), y: Y(p.y + 26) }, end: { x: X(p.x + 32), y: Y(p.y) }, thickness: 0.6, color: C.b }); pg.drawLine({ start: { x: X(p.x + 16), y: Y(p.y + 26) }, end: { x: X(p.x + 16), y: Y(p.y + 34) }, thickness: 1.2, color: C.r }); }
      else if (p.t === "bat") { for (let k = 0; k < 4; k++) { pg.drawLine({ start: { x: X(p.x + k * 22), y: Y(p.y) }, end: { x: X(p.x + k * 22), y: Y(p.y + 40) }, thickness: 2.4 * sc, color: INK }); pg.drawLine({ start: { x: X(p.x + k * 22 + 8), y: Y(p.y + 10) }, end: { x: X(p.x + k * 22 + 8), y: Y(p.y + 30) }, thickness: 5 * sc, color: INK }); } }
      else if (p.t === "dps") { pg.drawRectangle({ x: X(p.x - 9), y: Y(p.y + 16), width: 18 * sc, height: 32 * sc, borderColor: INK, borderWidth: 1, color: rgb(1, 1, 1) }); pg.drawLine({ start: { x: X(p.x - 4), y: Y(p.y - 8) }, end: { x: X(p.x + 4), y: Y(p.y + 8) }, thickness: 1.2, color: C.r }); pg.drawLine({ start: { x: X(p.x), y: Y(p.y + 16) }, end: { x: X(p.x), y: Y(p.y + 52) }, thickness: 0.8, color: C.g }); }
    }
    P_(85);
    /* materiais */
    h1("8. Lista de materiais e custos");
    table([{ h: "Grupo", w: 1.3 }, { h: "Item", w: 4.6 }, { h: "Qtd", w: 0.7, a: "r" }, { h: "Un.", w: 0.7 }, { h: "Unit.", w: 1.1, a: "r" }, { h: "Total", w: 1.3, a: "r" }],
      [...R.mat.map(m => [m.g, m.d, fmt(m.q, m.q % 1 ? 1 : 0), m.un, brl(m.pu), brl(m.q * m.pu)]), ["", "Equipamentos e materiais", "", "", "", brl(R.custo.eq)]], { size: 7.5, bold: [R.mat.length] });
    const mo = S.mo, C2 = R.custo;
    table([{ h: "Serviço / despesa", w: 4 }, { h: "Quantidade", w: 1.3, a: "r" }, { h: "Unitário", w: 1.3, a: "r" }, { h: "Total", w: 1.4, a: "r" }], [
      ["Engenharia (projeto, ART, comissionamento)", mo.heng + " h", brl(mo.peng), brl(mo.heng * mo.peng)], ["Eletricista com NR-10", mo.hele + " h", brl(mo.pele), brl(mo.hele * mo.pele)], ["Auxiliar", mo.haux + " h", brl(mo.paux), brl(mo.haux * mo.paux)],
      ["Deslocamento", mo.km + " km", brl(mo.pkm), brl(mo.km * mo.pkm)], ["Outras despesas", "", "", brl(mo.desp)], [`BDI (${mo.bdi}%)`, "", "", brl(C2.bdi)], [`Impostos (${mo.imp}%)`, "", "", brl(C2.imp)], ["TOTAL", "", "", brl(C2.total)]], { size: 8, bold: [7] });
    text(`Indicadores: ${fmt(R.indic.rsWp, 2)} R$/Wp · ${fmt0(R.indic.rsKwh)} R$/kWh armazenado · ${R.indic.trocas} troca(s) do banco em 25 anos · custo da energia em 25 anos ≈ R$ ${fmt(R.indic.lcoe, 2)}/kWh.`, { font: FB });
    text("Preços de referência (out/2026): " + Object.values(S.precos).map(p => `${p.d}: ${brl(n(p.pu))} (${p.f})`).join("; ") + ". " + S.mo.f, { size: 7, color: MUT });
    text("Ferramenta didática (UFPel – Engenharia Agrícola). Confirme dados de catálogo dos equipamentos escolhidos e as exigências da distribuidora e das normas ABNT NBR 16690, NBR 5410 e NBR 5419.", { size: 7.5, color: MUT });
    P_(95);
    const bytes = await doc.save(); const blob = new Blob([bytes], { type: "application/pdf" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "offgrid-relatorio.pdf"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    P_(100); if (msg) { msg.className = "note ok"; msg.textContent = "PDF gerado (" + doc.getPageCount() + " páginas)."; }
    return bytes;
  } catch (e) { console.error(e); if (msg) { msg.className = "note bad"; msg.textContent = "Erro ao gerar o PDF: " + e.message; } }
}

/* expõe para testes automatizados */
window.OFFGRID = { calcular: () => calcular(), lerSunData, linhasInclinadas, exemplo, get S() { return S; }, set S(v) { S = v; }, render, gerarPDF };
render();
