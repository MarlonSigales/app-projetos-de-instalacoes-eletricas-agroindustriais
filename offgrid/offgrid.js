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
const NAT = { res: { t: "Resistiva", kp: 1 }, ele: { t: "Eletrônica/LED", kp: 1 }, mot: { t: "Motor (partida direta)", kp: 6 }, comp: { t: "Compressor (refrigeração)", kp: 5 }, ss: { t: "Motor c/ soft-starter", kp: 3 }, vfd: { t: "Motor c/ inversor de frequência", kp: 1.5 } };
const DM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// barras de cobre retangulares, nuas, 35 °C (DIN 43671) — usadas com fator 0,8 em quadro fechado
const BARRAS = [["12×2", 24, 108], ["15×3", 45, 162], ["20×3", 60, 204], ["20×5", 100, 274], ["25×5", 125, 327], ["30×5", 150, 379], ["40×5", 200, 482], ["50×5", 250, 583], ["60×5", 300, 688]];
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
    crit: { vbanco: "auto", aut: 2, fnub: 0, nnub: 6, hfalta: 0, nfalta: 0, drec: 0, tbat: 25, tpart: 0.5, kfrio: 1.8, bat: "li", dod: 0.8, ftemp: 1.0, etaInv: 0.92, etaCabo: 0.97, pr: 0.80, vac: 220, fases: 1 },
    eq: {
      mod: { nome: "Módulo 550 W mono (144 células)", p: 550, voc: 49.6, vmp: 41.96, isc: 14.0, imp: 13.11, bvoc: -0.27, fusmax: 25, comp: 2.278, larg: 1.134 },
      bat: Object.assign({}, TIPOS.li.unid),
      ctrl: { nome: "Controlador MPPT 60 A (Voc 250 V)", imax: 60, vocmax: 250, p48: 3200 },
      inv: { nome: "Inversor off-grid 5 kW 48 V senoidal pura", p: 5000, surto: 2.0, eta: 0.92, carr: 60, vcorte: 0 }
    },
    backup: { tipo: "gerador", chave: "auto", pger: 0 },
    cabos: { lfv: 25, lbat: 2, lca: 20, lger: 15, dvfv: 2, dvbat: 1, dvca: 2 },
    estado: { ocv: "", cmed: "", rmed: "", ccamed: "", vmax: "", vmin: "", nivel: "celula", idade: "", ciclos: "", v0: "", v1: "", i1: "" },
    modo: "novo", entrada: "lista",
    conta: { meses: ["", "", "", "", "", "", "", "", "", "", "", ""], pior: "", mesPior: 0, amp: 25, fcc: 0, fcrit: 1, psim: "", pmotor: "", kp: 6 },
    exist: { ns: "", nstr: "", bns: "", bnp: "", nctrl: "", ninv: "", sfv: "", sctrl: "", sinv: "", sbat: "", sca: "", fusbat: "" },
    analise: [],
    telhado: { usar: "nao", margem: 0.4, medida: "plano", faces: [{ nome: "Água norte", az: "N", inc: "30%", comp: "", larg: "", nmod: "" }, { nome: "Água sul", az: "S", inc: "30%", comp: "", larg: "", nmod: "" }] },
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
    { nat: "mot", nome: "Ordenhadeira (motor 1 cv)", tipo: "CA", q: 1, w: 900, h: 2, fs: 1, kp: 5, crit: 1 },
    { nat: "comp", nome: "Resfriador de leite (compressor)", tipo: "CA", q: 1, w: 1100, h: 6, fs: 1, kp: 5, crit: 1 },
    { nat: "mot", nome: "Bomba d'água 1/2 cv", tipo: "CA", q: 1, w: 450, h: 1.5, fs: 1, kp: 4, crit: 1 },
    { nat: "ele", nome: "Iluminação LED (galpão e casa)", tipo: "CA", q: 10, w: 15, h: 5, fs: 1, kp: 1, crit: 1 },
    { nat: "comp", nome: "Geladeira residencial", tipo: "CA", q: 1, w: 150, h: 10, fs: 1, kp: 4, crit: 1 },
    { nat: "ele", nome: "TV, roteador e carregadores", tipo: "CA", q: 1, w: 120, h: 6, fs: 1, kp: 1, crit: 0 },
    { nat: "ele", nome: "Cerca elétrica (12 V CC)", tipo: "CC", q: 1, w: 5, h: 24, fs: 1, kp: 1, crit: 1 }
  ];
  s.backup = { tipo: "gerador", chave: "auto", pger: 0 };
  Object.assign(s.crit, { aut: 2, fnub: 0, nnub: 6, hfalta: 0, nfalta: 0, drec: 0, tbat: 25, tpart: 0.5 });
  s.estado = { ocv: 52.9, cmed: 97, rmed: 23, ccamed: "", vmax: 3.315, vmin: 3.29, nivel: "celula", idade: 1, ciclos: 320 };
  s.analise = [[52.9, 20.5, 97, 74], [52.9, 21.0, 96, 74], [52.8, 21.8, 95, 73], [52.9, 20.2, 98, 74], [52.8, 22.4, 95, 73], [52.6, 29.5, 79, 70], [52.9, 20.8, 97, 74], [52.8, 21.5, 96, 73]].map(([v, ri, soh, soc], i) => ({ id: "M" + (i + 1), v, ri, cca: "", ccaNom: "", soh, soc }));
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
/* plano com qualquer orientação: integração horária no dia médio do mês
   (perfis de Collares-Pereira & Rabl para global e difusa, fração difusa de Erbs, Liu-Jordan isotrópico, albedo 0,2).
   az = orientação da face (bússola: N = 0°, L = 90°, S = 180°, O = 270°); beta = inclinação (°). */
function planoMensal(H, latDeg, beta, az, rho = 0.2) {
  const r = Math.PI / 180, phi = latDeg * r, b = beta * r, g = (az - 180) * r, NP = 96;
  return H.map((h, i) => {
    const d = DIAS_MES[i], dec = 23.45 * r * Math.sin(2 * Math.PI * (284 + d) / 365);
    const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(dec))));
    const H0 = 24 * 3600 * 1367 / Math.PI * (1 + 0.033 * Math.cos(2 * Math.PI * d / 365)) * (Math.cos(phi) * Math.cos(dec) * Math.sin(ws) + ws * Math.sin(phi) * Math.sin(dec)) / 3.6e6;
    const kt = Math.min(0.8, Math.max(0.1, h / H0));
    const fd = ws <= 81.4 * r ? 1.391 - 3.560 * kt + 4.189 * kt * kt - 2.137 * kt ** 3 : 1.311 - 3.022 * kt + 3.427 * kt * kt - 1.821 * kt ** 3;
    const a = 0.409 + 0.5016 * Math.sin(ws - Math.PI / 3), bb = 0.6609 - 0.4767 * Math.sin(ws - Math.PI / 3);
    const pts = []; let St = 0, Sd = 0;
    for (let k = 0; k < NP; k++) { const w = -ws + (k + 0.5) * 2 * ws / NP, rt = (a + bb * Math.cos(w)) * (Math.cos(w) - Math.cos(ws)), rd = Math.cos(w) - Math.cos(ws); St += rt; Sd += rd; pts.push([w, rt, rd]); }
    let HT = 0;
    for (const [w, rt, rd] of pts) {
      const I = h * rt / St, Id = Math.min(I, h * fd * rd / Sd), Ib = Math.max(0, I - Id);
      const cz = Math.cos(phi) * Math.cos(dec) * Math.cos(w) + Math.sin(phi) * Math.sin(dec);
      const ct = Math.sin(dec) * Math.sin(phi) * Math.cos(b) - Math.sin(dec) * Math.cos(phi) * Math.sin(b) * Math.cos(g) + Math.cos(dec) * Math.cos(phi) * Math.cos(b) * Math.cos(w) + Math.cos(dec) * Math.sin(phi) * Math.sin(b) * Math.cos(g) * Math.cos(w) + Math.cos(dec) * Math.sin(b) * Math.sin(g) * Math.sin(w);
      HT += (cz > 0.05 ? Ib * Math.max(0, ct) / cz : 0) + Id * (1 + Math.cos(b)) / 2 + I * rho * (1 - Math.cos(b)) / 2;
    }
    return HT;
  });
}
const AZ = { N: 0, NNE: 22.5, NE: 45, ENE: 67.5, L: 90, E: 90, ESE: 112.5, LSE: 112.5, SE: 135, SSE: 157.5, S: 180, SSO: 202.5, SSW: 202.5, SO: 225, SW: 225, OSO: 247.5, WSW: 247.5, O: 270, W: 270, ONO: 292.5, WNW: 292.5, NO: 315, NW: 315, NNO: 337.5, NNW: 337.5 };
const lerAz = v => { const t = String(v ?? "").trim().toUpperCase(); if (t in AZ) return AZ[t]; const x = n(t); return ((x % 360) + 360) % 360; };
const lerInc = v => { const t = String(v ?? "").trim(); const x = n(t.replace("%", "")); return Math.max(0, Math.min(90, t.endsWith("%") ? Math.atan(x / 100) * 180 / Math.PI : x)); };
const dirNome = az => ["N", "NE", "L", "SE", "S", "SO", "O", "NO"][Math.round(((az % 360) + 360) % 360 / 45) % 8];
function telhado(R, row) {
  const t = S.telhado; if (!t || t.usar !== "sim" || !(t.faces || []).length || !row) return null;
  const hor = (S.local.rows || []).find(r => r.nome === "Plano Horizontal"), lat = n(S.local.lat);
  if (!hor || !lat) { R.avisos.push("Telhado: é preciso a coordenada e a linha “Plano Horizontal” do SunData para calcular cada água."); return null; }
  const ref = row.ang > 0 ? planoMensal(hor.m, lat, row.ang, lat < 0 ? 0 : 180) : hor.m.slice();
  const cal = row.m.map((v, i) => ref[i] > 0 ? v / ref[i] : 1);
  const mc = n(S.eq.mod.comp) || 2.278, ml = n(S.eq.mod.larg) || 1.134, gap = 0.02, mg = t.margem === "" || t.margem == null ? 0.4 : Math.max(0, n(t.margem));
  const faces = t.faces.map((f, j) => { const az = lerAz(f.az), inc = lerInc(f.inc), mm = planoMensal(hor.m, lat, inc, az).map((v, i) => v * cal[i]), mn = Math.min(...mm);
    const o = { cfg: f, nome: f.nome || "Água " + (j + 1), az, inc, m: mm, min: mn, mesMin: mm.indexOf(mn), media: media(mm), efMin: mn / Math.min(...row.m), efMed: media(mm) / row.media, cap: n(f.nmod) > 0 ? n(f.nmod) : Infinity };
    const L = n(f.comp), Wd = n(f.larg);
    if (L > 0 && Wd > 0) {
      const Wpl = t.medida === "planta" ? Wd / Math.cos(inc * Math.PI / 180) : Wd, ok = x => Math.max(0, Math.floor((x + gap) / 1));
      const fit = (a, b) => Math.max(0, Math.floor((L - 2 * mg + gap) / (a + gap))) * Math.max(0, Math.floor((Wpl - 2 * mg + gap) / (b + gap)));
      const ret = fit(ml, mc), pai = fit(mc, ml);
      Object.assign(o, { L, Wpl, area: L * Wpl, nRet: ret, nPai: pai, nArea: Math.max(ret, pai), orient: ret >= pai ? "retrato" : "paisagem", amod: mc * ml });
      o.cap = Math.min(o.cap, o.nArea);
      if (S.modo === "existente" && n(f.nmod) > o.nArea) R.avisos.push(`${o.nome}: ${n(f.nmod)} módulos instalados, mas a área comporta ${o.nArea} com recuo de ${fmt(mg, 2)} m — confira as medidas.`);
    }
    return o; });
  return { faces, cal };
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
const ex = k => S.modo === "existente" ? n(S.exist?.[k]) : 0;
function cabEx(k, req, I, Lm, V) { const sE = ex(k); if (!sE) return req; const dv = V > 0 ? 2 * Lm * I / (56 * sE) / V * 100 : 0, iz = IZ[SEC.indexOf(sE)] ?? IZ[SEC.findIndex(x => x >= sE)] ?? null; return { ...req, s: sE, dv, iz, req: req.s, ok: sE >= req.s }; }
function barra(I) { if (I <= 0) return { txt: "12×2 (mín.)", sec: 24, iz: 108, np: 1 }; for (let np = 1; np <= 3; np++) { const b = BARRAS.find(x => 0.8 * x[2] * np * (np > 1 ? 0.85 : 1) >= I); if (b) return { txt: (np > 1 ? np + "× " : "") + b[0] + " mm", sec: b[1] * np, iz: b[2] * np * (np > 1 ? 0.85 : 1), np }; } return { txt: "barra especial", sec: Math.ceil(I / 1.2), iz: I, np: 0 }; }
function comparar(R) {
  const C = [], m = S.eq.mod, ct = S.eq.ctrl, ub = S.eq.bat, Vreal = R.bNs * n(ub.v);
  C.push(["Gerador FV", `${fmt(R.Pnec / 1000, 2)} kWp (${R.NmodDim} mód. ${R.NsDim}S×${R.NstrDim}P)`, `${fmt(R.Pfv / 1000, 2)} kWp (${R.Ns}S×${R.Nstr}P)`, R.Pfv >= R.Pnec * 0.98, `folga no mês crítico ${pct(R.sobra)}`]);
  C.push(["Módulos em série", `${R.NsMin} a ${R.NsMax}`, String(R.Ns), R.Ns >= R.NsMin && R.Ns <= R.NsMax, `Voc,máx ${fmt0(R.vocArr)} V (limite ${ct.vocmax} V); Vmp quente ${fmt0(R.vmpQ * R.Ns)} V (mín. ${fmt0(R.vChg + 5)} V)`]);
  C.push(["Tensão do banco", `${R.Vb} V`, `${fmt(Vreal, 1)} V (${R.bNs} × ${n(ub.v)} V)`, Math.abs(Vreal - R.Vb) / R.Vb < 0.15, "série coerente com a tensão do inversor/controlador"]);
  C.push(["Capacidade do banco", `${fmt0(R.Cah)} Ah (${R.bNsDim}S×${R.bNpDim}P)`, `${fmt0(R.CinstAh)} Ah (${R.bNs}S×${R.bNp}P)`, R.CinstAh >= R.Cah * 0.98, `autonomia ${fmt(R.autReal, 1)} dias; DoD diário ${pct(R.dodDia)}; vida ${fmt(R.vida, 1)} anos`]);
  const pk = R.strCtrl * R.Ns * n(m.p);
  C.push(["Controladores", `${R.nCtrlDim}× ${ct.imax} A (p/ ${R.Nstr} strings instaladas)`, `${R.nCtrl}× ${ct.imax} A`, R.iCtrl <= n(ct.imax) * 1.001 && pk <= R.pCtrl * 1.001, `${fmt(R.iCtrl, 1)} A e ${fmt0(pk)} W por controlador (limites ${ct.imax} A, ${fmt0(R.pCtrl)} W)`]);
  C.push(["Inversor", `${fmt0(R.PinvNec)} W; surto ${fmt0(R.surto)} W`, `${R.invN}× ${fmt0(n(S.eq.inv.p))} W; surto ${fmt0(R.surtoInv)} W`, R.Pinv >= R.PinvNec * 0.98 && R.surtoInv >= R.surto, "potência contínua e partida dos motores"]);
  R.cabos.forEach(x => { if (x.c.req != null) C.push([`Cabo ${x.t}`, `${x.c.req} mm²`, `${x.c.s} mm²`, x.c.ok && x.c.iz >= x.I, `I = ${fmt(x.I, 1)} A; Iz ${x.c.iz ?? "—"} A; ΔV ${fmt(x.c.dv, 2)}%`]); });
  const fe = ex("fusbat"); if (fe) C.push(["Fusível do banco", `${R.inFusBat} A`, `${fe} A`, fe >= 1.25 * R.iBat * 0.95 && (!R.cBat.iz || fe <= R.cBat.iz * 1.45), `entre 1,25·I (${fmt0(1.25 * R.iBat)} A) e a capacidade do cabo do banco`]);
  C.push(["Pico de partida", `≥ ${fmt(R.vCorte + R.marg, 1)} V`, `${fmt(R.Vsag, 1)} V`, !R.capNec, R.capNec ? `banco capacitivo ${fmt(R.capC, 1)} F ou partida suave` : "banco sustenta a partida"]);
  return C;
}
const critica = l => !(l.crit === 0 || l.crit === false || l.crit === "0");
function ocvCel(T, soc) { const t = T.ocv; soc = Math.max(0, Math.min(1, soc)); for (let i = 1; i < t.length; i++) if (soc <= t[i][0]) { const [s0, v0] = t[i - 1], [s1, v1] = t[i]; return v0 + (v1 - v0) * (soc - s0) / (s1 - s0); } return t[t.length - 1][1]; }
function socOcv(T, v) { const t = T.ocv; if (v <= t[0][1]) return 0; for (let i = 1; i < t.length; i++) if (v <= t[i][1]) { const [s0, v0] = t[i - 1], [s1, v1] = t[i]; return s0 + (s1 - s0) * (v - v0) / (v1 - v0); } return 1; }
function estadoBat(R) {
  const e = Object.assign({}, S.estado || {}), T = R.T, ub = S.eq.bat, o = { tem: false };
  const kf = R.kfrio, cca12 = r => r > 0 ? 5.4 / (kf * R.r12(r)) : 0;
  /* analisador de baterias: uma linha por bateria/módulo */
  const U = (S.analise || []).filter(u => n(u.v) > 0 || n(u.ri) > 0 || n(u.cca) > 0);
  if (U.length) {
    o.tem = true;
    const med = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0, vs = U.map(u => n(u.v)).filter(v => v > 0), ris = U.map(u => n(u.ri)).filter(v => v > 0).sort((a, b) => a - b);
    const riMed = ris.length ? ris[Math.floor(ris.length / 2)] : 0;
    o.units = U.map((u, i) => {
      const ccaRi = cca12(n(u.ri) / 1000), nom = n(u.ccaNom) || R.ccaNom;
      const sohs = [n(u.soh) > 0 ? n(u.soh) / 100 : null, n(u.ri) > 0 && n(ub.ri) > 0 ? Math.max(0, Math.min(1, 1 - 0.2 * (n(u.ri) - n(ub.ri)) / n(ub.ri))) : null, n(u.cca) > 0 && nom > 0 ? Math.min(1, n(u.cca) / nom) : null].filter(x => x != null);
      const soh = sohs.length ? Math.min(...sohs) : null, socU = n(u.soc) > 0 ? n(u.soc) / 100 : (n(u.v) > 0 ? socOcv(T, n(u.v) / R.ncelU) : null);
      const fl = [];
      if (soh != null && soh < 0.8) fl.push("substituir (SOH < 80%)");
      if (riMed > 0 && n(u.ri) > 1.25 * riMed) fl.push("Ri 25% acima da mediana");
      if (n(u.cca) > 0 && R.ccaReq > 0 && n(u.cca) < R.ccaReq) fl.push("CCA abaixo do necessário");
      return { id: u.id || "B" + (i + 1), v: n(u.v), ri: n(u.ri), cca: n(u.cca), nom, ccaRi, soh, soc: socU, fl };
    });
    if (!n(e.ocv) && vs.length) e.ocv = med(vs);
    if (!n(e.rmed) && ris.length) e.rmed = med(ris);
    if (!n(e.ccamed)) { const cc = U.map(u => n(u.cca)).filter(v => v > 0); if (cc.length) e.ccamed = med(cc); }
    if (!(n(e.vmax) > 0) && vs.length > 1) { e.vmax = Math.max(...vs); e.vmin = Math.min(...vs); e.nivel = "bateria"; }
    const sU = o.units.map(u => u.soh ?? 1); o.sohUnid = R.bNs > 1 ? Math.min(...sU) : sU.reduce((a, b) => a + b, 0) / sU.length; o.sohMin = Math.min(...sU); o.trocar = o.units.filter(u => u.soh != null && u.soh < 0.8).length;
    o.riSpread = ris.length > 1 ? (ris[ris.length - 1] - ris[0]) / ris[0] : 0;
  }
  /* teste de carga: tensão em repouso, tensão sob carga e corrente → Ri e CCA equivalente */
  if (n(e.v0) > 0 && n(e.v1) > 0 && n(e.i1) > 0 && n(e.v0) > n(e.v1)) { o.tem = true; o.riTeste = (n(e.v0) - n(e.v1)) / n(e.i1); o.ccaTeste = cca12(o.riTeste); if (!n(e.rmed)) e.rmed = o.riTeste * 1000; }
  if (n(e.ocv) > 0) { o.tem = true; o.vcel = n(e.ocv) / R.ncelU; o.soc = socOcv(T, o.vcel); o.dod = 1 - o.soc; }
  if (n(e.cmed) > 0) { o.tem = true; o.sohC = n(e.cmed) / n(ub.ah); }
  if (n(e.rmed) > 0 && n(ub.ri) > 0) { o.tem = true; o.sohR = Math.max(0, Math.min(1, 1 - 0.2 * (n(e.rmed) - n(ub.ri)) / n(ub.ri))); }
  if (n(e.ccamed) > 0 && R.ccaNom > 0) { o.tem = true; o.sohCCA = Math.min(1, n(e.ccamed) / R.ccaNom); }
  const sohs = [["capacidade", o.sohC], ["resistência interna", o.sohR], ["CCA", o.sohCCA]].filter(x => x[1] != null);
  if (o.sohUnid != null) sohs.push([R.bNs > 1 ? "pior bateria da série (analisador)" : "média das baterias em paralelo (analisador)", o.sohUnid]);
  if (sohs.length) { const m = sohs.reduce((a, b) => b[1] < a[1] ? b : a); o.soh = Math.min(1, m[1]); o.sohFonte = m[0]; }
  if (n(e.rmed) > 0) o.ccaRi = cca12(n(e.rmed) / 1000);
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
  /* cargas: lista de equipamentos ou conta de energia (mês de maior consumo + variação anual) */
  let ECA = 0, ECC = 0, Psim = 0, Pinst = 0, Pmot = 0, Pcc = 0;
  R.entrada = S.entrada === "conta" ? "conta" : "lista";
  R.cargas = R.entrada === "lista" ? S.cargas.map(l => { const e = n(l.q) * n(l.w) * n(l.h), kp = n(l.kp) || NAT[l.nat]?.kp || 1; if (l.tipo === "CC") { ECC += e; Pcc += n(l.q) * n(l.w); } else { ECA += e; Psim += n(l.q) * n(l.w) * Math.min(1, Math.max(0, n(l.fs) || 1)); Pinst += n(l.q) * n(l.w); if (kp > 1) Pmot = Math.max(Pmot, n(l.w) * (kp - 1)); } return { ...l, e, kp }; }) : [];
  if (R.entrada === "conta") {
    const k = S.conta, dados = (k.meses || []).map(v => n(v));
    let Ep = n(k.pior), mp = Math.max(0, Math.min(11, +k.mesPior || 0));
    if (dados.some(v => v > 0) && (!Ep || Math.max(...dados) > Ep)) { Ep = Math.max(...dados); mp = dados.indexOf(Ep); }
    const a = Math.min(0.9, Math.max(0, n(k.amp) / 100));
    R.kwhMes = MESES.map((_, i) => dados[i] > 0 ? dados[i] : Ep * (1 - a * (1 - Math.cos(2 * Math.PI * (i - mp) / 12)) / 2));
    R.kwhPrev = MESES.map((_, i) => !(dados[i] > 0)); R.mesPiorConta = mp;
    const Emax = Math.max(...R.kwhMes.map((v, i) => v * 1000 / DM[i])), fcc = Math.min(1, Math.max(0, n(k.fcc)));
    ECA = Emax * (1 - fcc); ECC = Emax * fcc;
    R.psimEst = !n(k.psim); Psim = n(k.psim) || Emax / 6;
    Pmot = n(k.pmotor) * (Math.max(1, n(k.kp) || 1) - 1); Pinst = Psim;
    if (!Ep) R.avisos.push("Entrada pela conta: informe o consumo (kWh) do mês de maior gasto ou os 12 meses da conta.");
    if (R.psimEst) R.avisos.push(`Potência simultânea não informada: estimada em ${fmt0(Psim)} W (consumo diário / 6 h). Informe a demanda real para dimensionar o inversor.`);
  }
  Object.assign(R, { ECA, ECC, Psim, Pinst, Pcc });
  R.surto = Psim + Pmot;
  const Etot = ECA + ECC, kbat = Etot > 0 ? (ECC / c.etaCabo + ECA / (c.etaInv * c.etaCabo)) / Etot : 1 / (c.etaInv * c.etaCabo);
  R.Emes = R.entrada === "conta" ? R.kwhMes.map((v, i) => v * 1000 / DM[i]) : MESES.map(() => Etot);
  R.EbatMes = R.Emes.map(E => E * kbat);
  R.Ebat = Math.max(...R.EbatMes);
  /* mês de dimensionamento: maior razão consumo/irradiação (no verão a conta pode ser maior, mas o inverno gera menos) */
  if (row) { const rz = R.EbatMes.map((E, i) => E / row.m[i]); R.mesDim = rz.indexOf(Math.max(...rz)); } else R.mesDim = 0;
  R.hspDim = row ? row.m[R.mesDim] : 0; R.EbatDim = R.EbatMes[R.mesDim];
  R.Efv = R.EbatDim / T.eta; R.EfvMes = R.EbatMes.map(E => E / T.eta);
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
  R.EcritBat = R.entrada === "conta" ? R.Ebat * Math.min(1, Math.max(0, n(S.conta.fcrit))) : R.cargas.filter(l => critica(l)).reduce((a, l) => a + (l.tipo === "CC" ? l.e / c.etaCabo : l.e / (c.etaInv * c.etaCabo)), 0);
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
  R.bNsDim = R.bNs; R.bNpDim = R.bNp;
  if (ex("bns") > 0) R.bNs = ex("bns"); if (ex("bnp") > 0) R.bNp = ex("bnp");
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
  R.Pnec = R.hspDim > 0 ? (R.Efv + R.Erec) / (R.hspDim * n(c.pr)) : 0;
  R.Nnec = Math.ceil(R.Pnec / n(m.p));
  R.tel = telhado(R, row);
  if (R.tel) {
    const F = R.tel.faces, pm = n(m.p), pr = n(c.pr), alvo = R.EfvMes.map(E => E + R.Erec);
    let nf;
    if (S.modo === "existente" && F.some(f => n(f.cfg.nmod) > 0)) nf = F.map(f => n(f.cfg.nmod));
    else {
      nf = F.map(() => 0); const cap = F.map(f => f.cap);
      for (let it = 0; it < 3000; it++) {
        const prod = MESES.map((_, i) => F.reduce((a, f, j) => a + nf[j] * pm * f.m[i] * pr, 0)), def = alvo.map((A, i) => (A - prod[i]) / A), mx = Math.max(...def);
        if (mx <= 0) break;
        const mi = def.indexOf(mx); let bj = -1; F.forEach((f, j) => { if (nf[j] < cap[j] && (bj < 0 || f.m[mi] > F[bj].m[mi])) bj = j; });
        if (bj < 0) { R.avisos.push(`As águas do telhado comportam só ${nf.reduce((a, b) => a + b, 0)} módulos e não atendem ${MESES[mi]}: falta ${pct(mx)} da energia. Use outra área (solo, outra cobertura) ou reduza o consumo.`); break; }
        nf[bj]++;
      }
    }
    R.tel.nf = nf; R.Nnec = nf.reduce((a, b) => a + b, 0); R.Pnec = R.Nnec * pm;
    F.forEach((f, j) => { if (f.nArea != null && nf[j] > 0) { f.usoArea = Math.ceil(nf[j] / 1) * f.amod; } });
    R.hspArr = MESES.map((_, i) => R.Nnec ? F.reduce((a, f, j) => a + nf[j] * f.m[i], 0) / R.Nnec : 0);
    const rz = R.EbatMes.map((E, i) => E / R.hspArr[i]); R.mesDim = rz.indexOf(Math.max(...rz));
    R.hspDim = R.hspArr[R.mesDim]; R.EbatDim = R.EbatMes[R.mesDim]; R.Efv = R.EbatDim / T.eta;
  }
  R.NsMin = Math.ceil((R.vChg + 5) / R.vmpQ); R.NsMax = Math.floor(n(ct.vocmax) / R.vocMax);
  if (R.NsMin > R.NsMax) { R.avisos.push(`Não há número de módulos em série que atenda o controlador: mínimo ${R.NsMin} (tensão de carga) e máximo ${R.NsMax} (Voc a ${tmin} °C ≤ ${ct.vocmax} V). Escolha controlador de Voc maior ou outro módulo.`); R.Ns = Math.max(1, R.NsMax); }
  else if (R.tel) {
    /* módulos em série que melhor aproveitam as águas: cobre o mês crítico com o menor número de módulos, respeitando a área */
    const F = R.tel.faces, pm = n(m.p), pr = n(c.pr), alvo = R.EfvMes.map(E => E + R.Erec); let best = null;
    for (let k = R.NsMin; k <= R.NsMax; k++) {
      const sf = R.tel.nf.map((g, j) => g > 0 ? Math.min(S.modo === "existente" ? Math.max(1, Math.round(g / k)) : Math.ceil(g / k), Math.floor(F[j].cap / k)) : 0), tot = sf.reduce((a, x) => a + x * k, 0);
      const cov = Math.min(1, ...MESES.map((_, i) => F.reduce((a, f, j) => a + sf[j] * k * pm * f.m[i] * pr, 0) / alvo[i]));
      if (!best || cov > best.cov + 1e-6 || (Math.abs(cov - best.cov) <= 1e-6 && (tot < best.tot || (tot === best.tot && k > best.k)))) best = { k, tot, cov };
    }
    R.Ns = best.k;
  }
  else { let best = null; for (let k = R.NsMin; k <= R.NsMax; k++) { const tot = k * Math.ceil(Math.max(1, R.Nnec) / k); if (!best || tot < best.tot || (tot === best.tot && k > best.k)) best = { k, tot }; } R.Ns = best.k; }
  const strFaces = () => R.tel.nf.map(x => x > 0 ? (S.modo === "existente" ? Math.max(1, Math.round(x / R.Ns)) : Math.ceil(x / R.Ns)) : 0);
  if (R.tel) { R.tel.sf = strFaces(); R.tel.faces.forEach((f, j) => { const nm = R.tel.sf[j] * R.Ns; if (nm > f.cap) { R.tel.sf[j] = Math.floor(f.cap / R.Ns); R.avisos.push(`${f.nome}: cabem ${f.cap} módulo(s), menos que uma string completa de ${R.Ns}${R.tel.sf[j] ? "" : "; a água ficou sem módulos"}.`); } }); R.Nstr = Math.max(1, R.tel.sf.reduce((a, b) => a + b, 0)); }
  else R.Nstr = Math.max(1, Math.ceil(Math.max(1, R.Nnec) / R.Ns));
  R.Nmod = R.Ns * R.Nstr; R.Pfv = R.Nmod * n(m.p);
  R.NsDim = R.Ns; R.NstrDim = R.Nstr; R.NmodDim = R.Nmod; R.PfvDim = R.Pfv;
  if (ex("ns") > 0) R.Ns = ex("ns"); if (!R.tel && ex("nstr") > 0) R.Nstr = ex("nstr");
  if (R.tel && ex("ns") > 0) { R.tel.sf = strFaces(); R.Nstr = Math.max(1, R.tel.sf.reduce((a, b) => a + b, 0)); }
  R.Nmod = R.Ns * R.Nstr; R.Pfv = R.Nmod * n(m.p);
  R.vocArr = R.vocMax * R.Ns; R.vmpArr = n(m.vmp) * R.Ns;
  R.pCtrl = n(ct.p48) * Vb / 48;
  const ctrlPara = ns => { if (ns <= 0) return 0; for (let k = 1; k <= ns; k++) { const sc = Math.ceil(ns / k), pk = sc * R.Ns * n(m.p); if (pk <= R.pCtrl * 1.001 && pk / Vb <= n(ct.imax) * 1.001) return k; } return ns; };
  if (R.tel) { R.tel.nc = R.tel.sf.map(ctrlPara); R.nCtrl = Math.max(1, R.tel.nc.reduce((a, b) => a + b, 0)); }
  else R.nCtrl = ctrlPara(R.Nstr);
  R.nCtrlDim = R.nCtrl; if (ex("nctrl") > 0) R.nCtrl = ex("nctrl");
  R.strCtrl = R.tel && !ex("nctrl") ? Math.max(...R.tel.sf.map((x, j) => R.tel.nc[j] ? Math.ceil(x / R.tel.nc[j]) : 0)) : Math.ceil(R.Nstr / R.nCtrl);
  if (R.tel && ex("nctrl") > 0 && ex("nctrl") < R.tel.sf.filter(x => x > 0).length) R.avisos.push("Águas com orientações diferentes no mesmo MPPT: cada água deve ter seu próprio controlador (ou entrada MPPT); strings de orientações diferentes em paralelo perdem energia.");
  R.iCtrl = R.strCtrl * R.Ns * n(m.p) / Vb;
  if (R.iCtrl > n(ct.imax) * 1.001) R.avisos.push(`Cada controlador receberia ${fmt(R.iCtrl)} A, acima de ${ct.imax} A: aumente o número de controladores.`);
  R.iChgTot = R.Pfv / Vb;
  if (R.iChgTot > R.icMax * 1.05) R.avisos.push(`Corrente de carga do gerador FV (${fmt0(R.iChgTot)} A) acima do recomendado para o banco (${fmt0(R.icMax)} A = ${T.cCarga} C): limite a corrente no controlador ou aumente o banco.`);
  R.prodMes = R.tel ? MESES.map((_, i) => R.tel.faces.reduce((a, f, j) => a + R.tel.sf[j] * R.Ns * n(m.p) * f.m[i] * n(c.pr), 0)) : row ? row.m.map(h => R.Pfv * h * n(c.pr)) : [];
  R.sobraMes = R.prodMes.map((v, i) => v / R.EfvMes[i] - 1);
  R.sobra = R.sobraMes.length ? Math.min(...R.sobraMes) : 0;
  R.excBat = R.prodMes.length ? Math.min(...R.prodMes.map((v, i) => (v - R.EfvMes[i]) * T.eta)) : 0;
  R.tRec = R.excBat > 1 ? R.Eaut / R.excBat : Infinity;
  if (R.tRec > 15 && S.backup.tipo === "nenhum") R.avisos.push(`No pior mês o gerador FV leva ${isFinite(R.tRec) ? fmt0(R.tRec) : "∞"} dias para recarregar o banco após o evento de autonomia; sem fonte reserva, um segundo evento nesse período derruba o sistema. Use “dias para recuperar” (etapa 04) ou uma fonte reserva.`);
  /* inversor */
  const iv = eq.inv;
  R.PinvNec = Pinv0; R.invN = Math.max(1, Math.ceil(R.PinvNec / n(iv.p))); R.invNDim = R.invN; if (ex("ninv") > 0) R.invN = ex("ninv"); R.Pinv = R.invN * n(iv.p);
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
  R.cFV = cabEx("sfv", secao(1.25 * isc, n(S.cabos.lfv), R.vmpArr, n(S.cabos.dvfv), 4), 1.25 * isc, n(S.cabos.lfv), R.vmpArr);
  if (R.strCtrl > 1) R.cArr = secao(1.25 * isc * R.strCtrl, 3, R.vmpArr, 0.5, 4);
  R.inDjCtrl = prox(DISJ, 1.25 * R.iCtrl);
  P.push(["Controlador → barramento CC", `Disjuntor CC 2P (${R.nCtrl}×)`, `${R.inDjCtrl} A · ≥ ${Vb * 1.5 >= 60 ? 125 : 60} Vcc`, `In ≥ 1,25·Ictrl = ${fmt(1.25 * R.iCtrl)} A`]);
  R.cCtrl = cabEx("sctrl", secao(1.25 * R.iCtrl, n(S.cabos.lbat), Vb, n(S.cabos.dvbat), 6), 1.25 * R.iCtrl, n(S.cabos.lbat), Vb);
  R.inDjInv = prox(DISJ, 1.25 * R.iDcInv / R.invN) ?? 250;
  P.push(["Inversor → barramento CC", `Disjuntor/fusível CC (${R.invN}×)`, `${R.inDjInv} A`, `Icc do inversor = P/(η·Vmín) = ${fmt0(R.iDcInv / R.invN)} A; In ≥ 1,25·I`]);
  R.cInv = cabEx("sinv", secao(1.25 * R.iDcInv / R.invN, n(S.cabos.lbat), Vb, n(S.cabos.dvbat), 10), 1.25 * R.iDcInv / R.invN, n(S.cabos.lbat), Vb);
  R.iBat = Math.max(R.iDcInv + R.Pcc / Vb, R.iChgTot);
  R.inFusBat = prox(FUS_BAT, 1.25 * R.iBat) ?? 630;
  P.push(["Banco de baterias", "Fusível principal (NH gG ou classe T p/ lítio) + seccionadora", `${R.inFusBat} A · Icu ≥ Icc da bateria`, `In ≥ 1,25·máx(descarga ${fmt0(R.iDcInv + R.Pcc / Vb)} A; carga ${fmt0(R.iChgTot)} A)`]);
  R.cBat = cabEx("sbat", secao(1.25 * R.iBat, n(S.cabos.lbat), Vb, n(S.cabos.dvbat), 16), 1.25 * R.iBat, n(S.cabos.lbat), Vb);
  R.barra = Math.ceil(1.25 * R.iBat / 2);
  R.bCC = barra(1.25 * R.iBat);
  P.push(["Barramento CC", "Barramentos + e − em cobre, isolados", `${R.bCC.txt} (${R.bCC.sec} mm²)`, `I ≥ 1,25 × ${fmt0(R.iBat)} = ${fmt0(1.25 * R.iBat)} A ≤ 0,8 × ${fmt0(R.bCC.iz)} A (DIN 43671); um ponto de conexão por polo`]);
  if (R.Pcc > 0) P.push(["Cargas CC", "Fusível/disjuntor CC por circuito", `${prox(DISJ, 1.25 * R.Pcc / Vb)} A`, `I = ${fmt(R.Pcc / Vb)} A`]);
  R.inDjAc = prox(DISJ, 1.25 * R.iAc / 1) ?? 125;
  P.push(["Saída CA do inversor", `Disjuntor ${R.polos}P curva C`, `${R.inDjAc} A`, `I saída = ${fmt(R.iAc)} A`]);
  P.push(["Quadro CA", `DR ${R.polos}P 30 mA tipo A + DPS CA classe II`, `${prox([25, 40, 63, 80, 100], R.inDjAc)} A · DPS 275 V 20 kA`, "Proteção de pessoas e de surtos nos circuitos de saída"]);
  R.cAc = cabEx("sca", secao(1.25 * R.iAc, n(S.cabos.lca), R.vac, n(S.cabos.dvca), 2.5), 1.25 * R.iAc, n(S.cabos.lca), R.vac);
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
  /* CCA: necessário (pelo pico e pela tensão mínima) e esperado (pela resistência interna) */
  R.kfrio = n(c.kfrio) || 1.8;
  R.RbReq = R.Ipk > 0 ? (R.Vref - R.vCorte - R.marg) / R.Ipk : Infinity;
  R.riReq = (R.RbReq - R.Rcabo) * R.bNp / R.bNs;
  R.r12 = r => r / R.ncelU * 6;
  R.ccaReq = R.riReq > 0 ? 5.4 / (R.kfrio * R.r12(R.riReq)) : Infinity;
  R.ccaCat = n(ub.ri) > 0 ? 5.4 / (R.kfrio * R.r12(n(ub.ri) / 1000)) : 0;
  R.ccaNom = n(ub.cca) || R.ccaCat;
  if (R.riReq <= 0) R.avisos.push(`Os cabos do banco (${fmt(R.Rcabo * 1000, 2)} mΩ) sozinhos já derrubam a tensão abaixo do mínimo no pico de partida: aumente a seção ou encurte os cabos.`);
  else if (R.ccaNom < R.ccaReq) R.avisos.push(`CCA por bateria (${fmt0(R.ccaNom)} A) abaixo do necessário para o pico (${fmt0(R.ccaReq)} A, equivalente 12 V): o banco não sustenta a partida sem reforço.`);
  /* cabos por trecho (corrente de cada trecho) e PE (NBR 5410 Tab. 58) */
  const pe = sF => SEC.find(x => x >= (sF <= 16 ? sF : sF <= 35 ? 16 : sF / 2)) ?? sF / 2;
  const L = [];
  const addC = (t, I, Lm, V, cab) => L.push({ t, I, L: Lm, V, c: cab, pe: pe(cab.s) });
  addC("String FV (cada)", 1.25 * isc, n(S.cabos.lfv), R.vmpArr, R.cFV);
  if (R.cArr) addC("Arranjo (string box → MPPT)", 1.25 * isc * R.strCtrl, 3, R.vmpArr, R.cArr);
  addC(`Controlador → barramento (${R.nCtrl}×)`, 1.25 * R.iCtrl, n(S.cabos.lbat), Vb, R.cCtrl);
  addC(`Inversor → barramento (${R.invN}×)`, 1.25 * R.iDcInv / R.invN, n(S.cabos.lbat), Vb, R.cInv);
  addC("Banco → barramento", 1.25 * R.iBat, n(S.cabos.lbat), Vb, R.cBat);
  if (R.bN > 1) { R.cInt = secao(1.25 * R.iBat / R.bNp, 0.5, Vb, 0.5, 16); addC(`Interligação entre baterias (${R.bNs}S×${R.bNp}P)`, 1.25 * R.iBat / R.bNp, 0.5, Vb, R.cInt); }
  if (R.Pcc > 0) addC("Barramento → cargas CC", 1.25 * R.Pcc / Vb, 10, Vb, secao(1.25 * R.Pcc / Vb, 10, Vb, 3, 2.5));
  addC("Inversor → quadro CA", 1.25 * R.iAc, n(S.cabos.lca), R.vac, R.cAc);
  if (b.tipo !== "nenhum") { R.cGer = secao(1.25 * R.iGer, n(S.cabos.lger) || 15, R.vac, n(S.cabos.dvca), 2.5); addC(`${b.tipo === "gerador" ? "Gerador" : "Rede"} → chave de transferência`, 1.25 * R.iGer, n(S.cabos.lger) || 15, R.vac, R.cGer); R.cChv = secao(R.iChave, 2, R.vac, 0.5, 2.5); addC("Chave → quadro CA", R.iChave, 2, R.vac, R.cChv); }
  R.cabos = L;
  /* barramentos */
  const Ica = 1.25 * Math.max(R.iAc, b.tipo === "nenhum" ? 0 : R.iGer);
  R.barras = [["Barramento CC +", 1.25 * R.iBat], ["Barramento CC −", 1.25 * R.iBat], [`Barramento CA fase${R.polos > 2 ? "s" : ""} (quadro)`, Ica], ["Barramento neutro (quadro)", Ica], ["Barramento PE / BEP", 0]].map(([t, I]) => ({ t, I, ...barra(I) }));
  R.prot = P;
  if (R.vocArr > n(ct.vocmax)) R.avisos.push(`Voc do arranjo a ${tmin} °C (${fmt0(R.vocArr)} V) acima do limite do controlador (${ct.vocmax} V).`);
  /* materiais e custos */
  R.mat = materiais(R); R.custo = custos(R.mat);
  R.indic = { rsWp: R.custo.total / R.Pfv, rsKwh: R.custo.total / (R.CinstWh / 1000), trocas: Math.max(0, Math.ceil(25 / R.vida) - 1) };
  const pb = S.precos["bat_" + c.bat]; R.indic.custo25 = R.custo.total + R.indic.trocas * R.bN * (pb ? n(pb.pu) : 0);
  R.indic.lcoe = R.indic.custo25 / ((R.ECA + R.ECC) * 365 * 25 / 1000);
  R.est = estadoBat(R);
  if (S.modo === "existente") R.cmp = comparar(R);
  return R;
}
function materiais(R) {
  const p = S.precos, b = S.crit.bat, L = [];
  const add = (g, k, q, extra) => { if (q > 0) L.push({ g, k, d: (p[k]?.d || k) + (extra ? " — " + extra : ""), un: p[k]?.un || "pç", q, pu: n(p[k]?.pu) }); };
  if (S.modo === "existente") {
    const mp = n(S.eq.mod.p);
    if (R.Pfv < R.Pnec * 0.98) { const ns = R.Ns >= R.NsMin && R.Ns <= R.NsMax ? R.Ns : R.NsDim, extra = Math.ceil((R.Pnec - R.Pfv) / mp / ns) * ns; add("Adequação – geração", "mod", extra, `${extra / ns} string(s) de ${ns}`); add("Adequação – geração", "estr", extra); add("Adequação – geração", "mc4", 2 * extra / ns); }
    const velho = R.est?.soh != null && R.est.soh < 0.8;
    if (R.CinstAh < R.Cah * 0.98 || velho) {
      if (b === "li" && S.eq.bat.bms !== "externo" && !velho && R.bNs === R.bNsDim) add("Adequação – armazenamento", "bat_" + b, Math.max(1, R.bNpDim - R.bNp), `ampliação em paralelo: mesmo modelo e firmware; confirmar com o fabricante e reconfigurar o BMS mestre`);
      else add("Adequação – armazenamento", "bat_" + b, R.bNsDim * R.bNpDim, `banco novo ${R.bNsDim}S × ${R.bNpDim}P (não misturar baterias novas e antigas)`);
    }
    const pk = R.strCtrl * R.Ns * mp; if (R.iCtrl > n(S.eq.ctrl.imax) * 1.001 || pk > R.pCtrl * 1.001) add("Adequação – conversão", "ctrl", Math.max(1, R.nCtrlDim - R.nCtrl), "controlador(es) adicional(is)");
    if (R.Pinv < R.PinvNec * 0.98 || R.surtoInv < R.surto) add("Adequação – conversão", "inv", R.invNDim, "substituição do inversor");
    const kc = { "sfv": ["cabo_fv", 2 * n(S.cabos.lfv) * R.Nstr], "sctrl": ["cabo_bat", 2 * n(S.cabos.lbat) * R.nCtrl], "sinv": ["cabo_bat", 2 * n(S.cabos.lbat) * R.invN], "sbat": ["cabo_bat", 2 * n(S.cabos.lbat)], "sca": ["cabo_ca", 3 * n(S.cabos.lca)] };
    [["sfv", R.cFV], ["sctrl", R.cCtrl], ["sinv", R.cInv], ["sbat", R.cBat], ["sca", R.cAc]].forEach(([k, cb]) => { if (cb.req != null && !cb.ok) add("Adequação – cabos", kc[k][0], kc[k][1] * cb.req, `trocar ${cb.s} → ${cb.req} mm²`); });
    if (R.capNec) { add("Adequação – proteção CC", R.capKey, R.capNs * R.capNp, `${R.capNs}S × ${R.capNp}P = ${fmt(R.capC, 1)} F`); add("Adequação – proteção CC", "precarga", 1); }
    return L;
  }
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
  add("Cabos", "cabo_ca", 3 * n(S.cabos.lca) * R.cAc.s + (R.cGer ? 3 * (n(S.cabos.lger) || 15) * R.cGer.s : 0), `F+N+PE ${R.cAc.s} mm² × ${S.cabos.lca} m${R.cGer ? ` + ${R.cGer.s} mm² × ${n(S.cabos.lger) || 15} m (reserva)` : ""}`);
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

/* montagem em outras tensões: recalcula o projeto em 12, 24 e 48 V */
function altTensoes() {
  const base = JSON.stringify(Object.assign({}, S, { _estacoes: undefined })), bak = S, out = [];
  for (const v of [12, 24, 48]) {
    try {
      S = JSON.parse(base); S.modo = "novo"; S.crit.vbanco = String(v);
      if (S.crit.bat === "li") { const u = S.eq.bat, vu = v === 48 ? 51.2 : v === 24 ? 25.6 : 12.8, k = vu / n(u.v || 51.2); S.eq.bat = Object.assign({}, u, { nome: `LiFePO4 ${fmt(vu, 1)} V ${n(u.ah)} Ah`, v: vu, ri: n(u.ri) * k }); }
      const r = calcular(), pb = S.precos["bat_" + S.crit.bat];
      out.push({ v, r, avisos: r.avisos.length, inv12: v === 12 && r.Pinv / r.invN > 3000, custoBat: r.bN * n(pb?.pu) * (S.crit.bat === "li" ? r.Vnom / r.bNs / 51.2 : 1) });
    } catch (e) { console.error(e); } finally { S = bak; }
  }
  return out;
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
function linhasSVG(series, { un = "", h = 230, dest = -1 } = {}) {
  const W = 680, pad = 44, ch = h - 50, all = series.flatMap(x => x.v), max = Math.max(...all) * 1.12 || 1, bw = (W - pad - 10) / 12, cores = ["#0e6a4e", "#b5452f", "#2f5fb5", "#9a5a00", "#7a4fd0", "#0b7c78"];
  const X = i => pad + i * bw + bw / 2, Y = v => 14 + ch - ch * v / max;
  let o = `<svg class="chart" viewBox="0 0 ${W} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  for (let k = 0; k <= 4; k++) { const v = max * k / 4; o += `<line x1="${pad}" x2="${W - 8}" y1="${Y(v)}" y2="${Y(v)}" stroke="currentColor" opacity=".12"/><text x="${pad - 6}" y="${Y(v) + 4}" text-anchor="end">${fmt(v, 1)}</text>`; }
  MESES.forEach((m, i) => { o += `<text x="${X(i)}" y="${h - 18}" text-anchor="middle" ${i === dest ? 'class="lbl"' : ""}>${m}</text>`; });
  if (dest >= 0) o += `<rect x="${X(dest) - bw / 2}" y="14" width="${bw}" height="${ch}" fill="#b3261e" opacity=".07"/>`;
  series.forEach((sr, k) => { const c = sr.cor || cores[k % cores.length]; o += `<polyline points="${sr.v.map((v, i) => `${X(i)},${Y(v)}`).join(" ")}" fill="none" stroke="${c}" stroke-width="${sr.w || 2.2}" ${sr.d ? 'stroke-dasharray="6 4"' : ""}/>`; o += `<text x="${pad + 6 + k * 150}" y="${h - 2}" style="fill:${c}" class="lbl">— ${esc(sr.nome)}</text>`; });
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
/* ---------- balões de ajuda: aparecem ao passar o mouse ou ao focar o campo ---------- */
const TIPS = {
  "id.cliente": "Nome do proprietário ou da empresa. Vai para a capa e o carimbo do relatório.",
  "id.obra": "Nome curto do sistema (ex.: “Off-grid da ordenha”). Aparece na capa, no rodapé e no nome do arquivo.",
  "id.local": "Localidade, linha ou estrada de acesso da propriedade.",
  "id.municipio": "Município e UF, ex.: Pelotas/RS.",
  "id.rt": "Engenheiro ou técnico responsável pelo projeto (assina a ART/TRT).",
  "id.crea": "Registro profissional do responsável (CREA ou CFT).",
  "id.data": "Data de emissão do projeto ou da análise.",
  "modo": "Sistema novo: a ferramenta dimensiona tudo. Sistema existente: você informa o que está instalado (etapa 05) e ela compara com o necessário e monta a lista de adequação.",
  "local.lat": "Latitude em graus decimais; no hemisfério sul é negativa (ex.: −31,77). Pegue no Google Maps (clique com o botão direito no local) ou use “Usar localização atual”.",
  "local.lon": "Longitude em graus decimais; a oeste de Greenwich é negativa (ex.: −52,34).",
  "temp.tmin": "Menor temperatura do ar esperada no local (mínima absoluta de inverno). Eleva a tensão de circuito aberto (Voc) dos módulos e limita quantos cabem em série.",
  "temp.tmax": "Maior temperatura do ar no verão. A célula fica ≈ 30 °C acima do ar e a tensão de máxima potência (Vmp) cai: define o mínimo de módulos em série.",
  "telhado.usar": "“Sim” quando os módulos ficam rentes ao telhado: a irradiação passa a ser a de cada água. “Não” usa a inclinação ótima da linha selecionada do SunData (estrutura própria).",
  "telhado.margem": "Faixa livre nas bordas, beiral e cumeeira (vento, fixação, circulação). Usual 0,3 a 0,5 m. Reduz o número de módulos que cabem.",
  "telhado.medida": "Como a largura da água foi medida: no próprio telhado (do beiral à cumeeira) ou na planta (projeção horizontal). Na planta, a ferramenta divide pelo cosseno da inclinação.",
  "entrada": "Cargas individuais: liste cada equipamento. Conta de energia: informe o kWh do mês de maior gasto (ou os 12 meses) quando não houver levantamento das cargas.",
  "conta.pior": "Consumo em kWh do mês de maior gasto, lido na conta de energia (campo “consumo faturado” ou histórico de 12 meses).",
  "conta.mesPior": "Mês em que ocorreu o maior consumo. Define o pico da curva anual prevista.",
  "conta.amp": "Quanto o consumo varia ao longo do ano: (maior − menor)/maior. Sem histórico, use 20–40% no meio rural. Só vale para meses sem dado digitado.",
  "conta.psim": "Maior potência ligada ao mesmo tempo, em W (demanda). Some os equipamentos que funcionam juntos no horário de pico; é o que dimensiona o inversor.",
  "conta.pmotor": "Potência do maior motor ou compressor (W) que pode partir com os demais ligados. 1 cv ≈ 740 W no eixo, ≈ 900 W na rede.",
  "conta.kp": "Relação corrente de partida / nominal desse motor: 6 em partida direta, 5 compressor, 3 com soft-starter, 1,5 com inversor de frequência.",
  "conta.fcc": "Fração do consumo ligada direto em corrente contínua (cerca elétrica, LEDs 12 V, telemetria). Normalmente 0.",
  "conta.fcrit": "Fração do consumo que precisa continuar durante falta da concessionária (sistema com rede como reserva). Ex.: 0,6 se só resfriamento e bomba são essenciais.",
  "crit.aut": "Maior sequência de dias muito nublados que o banco deve atravessar sozinho. RS no inverno: 3–5 dias (série do INMET); com gerador automático, 1,5–2 dias bastam.",
  "crit.fnub": "Quanto o gerador FV ainda produz num dia nublado, como fração do pior mês. 0 é conservador; dias encobertos costumam render 10–30%.",
  "crit.nnub": "Quantas vezes por ano ocorre a sequência nublada. Entra no cálculo de vida útil (descargas profundas).",
  "crit.hfalta": "Maior tempo contínuo sem energia da concessionária, em horas (sistemas com rede como reserva). Use o histórico do cliente ou os indicadores DEC/FEC da distribuidora.",
  "crit.nfalta": "Número de faltas longas por ano. Cada uma é uma descarga profunda no cálculo de vida útil.",
  "crit.drec": "Em quantos dias o FV deve recarregar o banco após o evento de autonomia. 0 = não considerar. Sem gerador, use 7–14: a ferramenta aumenta os módulos.",
  "crit.tbat": "Temperatura média do abrigo das baterias. Cada 10 °C acima de 25 °C reduz a vida à metade. Abrigo sombreado e ventilado: 25–30 °C.",
  "crit.tpart": "Duração do pico de corrente na partida do motor/compressor, em segundos. Partida direta: 0,3–1 s. Usado no banco capacitivo.",
  "crit.kfrio": "Quanto a resistência interna da bateria aumenta a −18 °C em relação a 25 °C. Chumbo: 1,6–2,0 (padrão 1,8). Usado para converter resistência em CCA.",
  "crit.bat": "Tecnologia do banco. Trocar recarrega a bateria padrão, a profundidade de descarga e o fator de temperatura.",
  "crit.dod": "Profundidade máxima de descarga admitida no evento de autonomia (0 a 1). Lítio 0,8; chumbo 0,5. Quanto maior, menor o banco e menor a vida.",
  "crit.ftemp": "Fração da capacidade disponível na temperatura do abrigo. Chumbo a 10 °C ≈ 0,9; lítio com aquecimento ≈ 1.",
  "crit.vbanco": "Tensão do banco. Automática: até ~1,5 kW → 12 V; até ~3 kW → 24 V; acima → 48 V. Compare as três na etapa de proteções.",
  "crit.pr": "Fator de desempenho do gerador FV: perdas por temperatura, sujeira, descasamento, cabos e MPPT. Use 0,75–0,85 (0,80 típico).",
  "crit.etaInv": "Rendimento médio do inversor na faixa de uso (catálogo: 0,90–0,94).",
  "crit.etaCabo": "Rendimento dos cabos e conexões do lado CC (0,97 ≈ 3% de perdas).",
  "crit.vac": "Tensão da instalação CA alimentada pelo inversor.",
  "crit.fases": "Número de fases da saída do inversor.",
  "eq.mod.nome": "Modelo do módulo, como na folha de dados.",
  "eq.mod.p": "Potência máxima (Pmáx) em STC, em W, da folha de dados.",
  "eq.mod.voc": "Tensão de circuito aberto (Voc) em STC, em V.",
  "eq.mod.vmp": "Tensão de máxima potência (Vmp) em STC, em V.",
  "eq.mod.isc": "Corrente de curto-circuito (Isc) em STC, em A. Dimensiona cabos, fusíveis e seccionadora.",
  "eq.mod.imp": "Corrente de máxima potência (Imp) em STC, em A.",
  "eq.mod.bvoc": "Coeficiente de temperatura do Voc, em %/°C (negativo, ex.: −0,27).",
  "eq.mod.fusmax": "Corrente máxima do fusível em série (maximum series fuse rating) da folha de dados.",
  "eq.mod.comp": "Comprimento do módulo em metros (lado maior), da folha de dados. Usado para ver quantos cabem no telhado.",
  "eq.mod.larg": "Largura do módulo em metros (lado menor).",
  "eq.bat.nome": "Modelo da bateria ou do módulo de baterias.",
  "eq.bat.v": "Tensão nominal de uma unidade (12 V, 25,6 V, 51,2 V…).",
  "eq.bat.ah": "Capacidade de uma unidade em Ah, no regime de descarga do projeto (C10 ou C20 para chumbo; lítio: nominal).",
  "eq.bat.ri": "Resistência interna de uma unidade nova, em mΩ (catálogo ou analisador com a bateria nova). Define queda de tensão no pico e CCA.",
  "eq.bat.imax": "Corrente contínua máxima de descarga por unidade (limite do BMS no lítio).",
  "eq.bat.ipico": "Corrente de pico admitida por unidade durante o tempo indicado (BMS/fabricante).",
  "eq.bat.tpico": "Duração admitida do pico, em segundos.",
  "eq.bat.cca": "CCA nominal (corrente de partida a frio) da etiqueta, para chumbo de 12 V. 0 = a ferramenta estima pela resistência interna. Use a mesma norma do analisador (SAE, EN, DIN, JIS).",
  "eq.bat.bms": "Integrado: módulo rack com BMS próprio. Externo: células avulsas, exige BMS e balanceador ativo.",
  "eq.ctrl.nome": "Modelo do controlador de carga MPPT.",
  "eq.ctrl.imax": "Corrente máxima de carga entregue à bateria (A) — é a corrente de saída.",
  "eq.ctrl.p48": "Potência FV máxima admitida com banco de 48 V (W), da folha de dados. Para 12 e 24 V a ferramenta reduz proporcionalmente.",
  "eq.ctrl.vocmax": "Tensão máxima de entrada FV (V). O Voc da string no dia mais frio nunca pode ultrapassar.",
  "eq.inv.nome": "Modelo do inversor off-grid (onda senoidal pura).",
  "eq.inv.p": "Potência contínua nominal (W).",
  "eq.inv.surto": "Quantas vezes a potência nominal o inversor aguenta por ~5 s (surto). Comum: 2.",
  "eq.inv.eta": "Rendimento do inversor (catálogo).",
  "eq.inv.carr": "Corrente do carregador interno quando há gerador/rede (A no lado CC). Define o tamanho do gerador.",
  "eq.inv.vcorte": "Tensão CC em que o inversor desliga por bateria baixa. 0 = automático pela tecnologia.",
  "backup.tipo": "Segunda fonte: gerador a combustível ou rede da concessionária. Define a chave de transferência e o gerador.",
  "backup.chave": "Automática (ATS) para cargas que não podem esperar alguém (leite, água, aves). Manual (1-0-2) quando há pessoa no local.",
  "exist.ns": "Quantos módulos estão ligados em série em cada string (conte na string box ou meça a tensão: Voc da string ÷ Voc do módulo).",
  "exist.nstr": "Quantas strings estão em paralelo (pares de cabos + e − que chegam à string box).",
  "exist.bns": "Quantas baterias estão em série (tensão do banco ÷ tensão de uma bateria).",
  "exist.bnp": "Quantas fileiras de baterias estão em paralelo.",
  "exist.nctrl": "Número de controladores de carga instalados.",
  "exist.ninv": "Número de inversores instalados (mesmo modelo informado na etapa 04).",
  "exist.sfv": "Seção do cabo das strings (mm²), impressa na capa do cabo.",
  "exist.sctrl": "Seção do cabo do controlador até o barramento/bateria (mm²).",
  "exist.sinv": "Seção do cabo do inversor até o barramento/bateria (mm²).",
  "exist.sbat": "Seção do cabo principal do banco até o barramento (mm²).",
  "exist.sca": "Seção do cabo da saída CA do inversor até o quadro (mm²).",
  "exist.fusbat": "Corrente nominal do fusível ou disjuntor principal do banco (A). Deve ficar entre 1,25 × a corrente do banco e a capacidade do cabo.",
  "estado.ocv": "Tensão de uma bateria (ou média) em repouso: sem carga nem recarga há pelo menos 2 h. Dá o SOC pela curva da tecnologia.",
  "estado.cmed": "Capacidade medida num ensaio de descarga (Ah) até a tensão final. Dá o SOH por capacidade.",
  "estado.rmed": "Resistência interna medida com analisador (1 kHz) ou pelo teste de carga, em mΩ por bateria.",
  "estado.ccamed": "CCA medido por analisador de condutância (média das baterias). Use a mesma norma do valor nominal.",
  "estado.vmax": "Maior tensão entre as células (BMS) ou entre as baterias da série, em repouso.",
  "estado.vmin": "Menor tensão entre as células ou baterias, em repouso. A diferença mostra o desbalanceamento (SoB).",
  "estado.nivel": "Diga se as tensões máx./mín. são de células (BMS) ou de baterias inteiras.",
  "estado.idade": "Há quantos anos o banco está em operação. Com o SOH, dá a tendência de perda por ano.",
  "estado.ciclos": "Ciclos registrados pelo BMS ou monitor de bateria.",
  "estado.v0": "Tensão de uma bateria em repouso, logo antes de aplicar a carga de teste.",
  "estado.v1": "Tensão da mesma bateria durante a carga de teste (após ~5–10 s, carga de 0,5–1 C).",
  "estado.i1": "Corrente da carga de teste, medida com alicate amperímetro CC.",
  "cabos.lfv": "Comprimento do trajeto dos módulos até o controlador (só ida, em metros).",
  "cabos.lbat": "Comprimento do controlador/inversor até a bateria ou barramento (só ida). Mantenha curto: até 2–3 m.",
  "cabos.lca": "Comprimento da saída do inversor até o quadro CA (só ida).",
  "cabos.lger": "Comprimento do gerador ou da entrada da rede até a chave de transferência (só ida).",
  "cabos.dvfv": "Queda de tensão máxima admitida no trecho FV (%). Usual 2–3%.",
  "cabos.dvbat": "Queda de tensão máxima nos cabos da bateria (%). Usual 1%: em 48 V, 1% são só 0,48 V.",
  "cabos.dvca": "Queda de tensão máxima na saída CA até o quadro (%). Usual 2% (total com circuitos ≤ 4%).",
  "mo.heng": "Horas de engenharia: visita, levantamento, projeto, ART e comissionamento.",
  "mo.peng": "Valor da hora de engenharia (R$/h) da sua região.",
  "mo.hele": "Horas de eletricista com NR-10 para montagem e ligação.",
  "mo.pele": "Valor da hora do eletricista (R$/h). Referência out/2026: R$ 150–250 com NR-10.",
  "mo.haux": "Horas de auxiliar (estrutura, transporte, valas).",
  "mo.paux": "Valor da hora do auxiliar (R$/h).",
  "mo.km": "Distância total rodada (ida e volta de todas as visitas), em km.",
  "mo.pkm": "Custo por km rodado (combustível + desgaste), R$/km.",
  "mo.desp": "Outras despesas (hospedagem, alimentação, frete, aluguel de equipamento).",
  "mo.bdi": "Benefícios e despesas indiretas + lucro (%). Usual 15–25%.",
  "mo.imp": "Impostos sobre o serviço/venda (%), conforme o regime tributário (ex.: Simples Nacional)."
};

const TIPS_COL = {
  c: { nome: "Nome do equipamento.", nat: "Tipo de carga: define o Ip/In e se entra no surto (só motores e compressores).", tipo: "CA: ligado na saída do inversor. CC: ligado direto no banco (cerca, LEDs 12/24 V).", q: "Quantidade de equipamentos iguais.", w: "Potência de cada um em W (placa do equipamento; motores: potência elétrica ≈ cv × 900 W).", h: "Horas de funcionamento por dia (média do mês crítico). Geladeiras/compressores: horas com o motor ligado (≈ 40–50% do dia).", fs: "Simultaneidade: fração que funciona junto no horário de pico (1 = todos).", kp: "Corrente de partida / nominal. Preenchido pelo tipo de carga; ajuste pela placa (código NEMA) ou medição.", crit: "Marque se o equipamento precisa funcionar durante falta da concessionária." },
  tf: { nome: "Nome da água (ex.: Galpão – água norte).", az: "Para onde a água “olha”: N, NE, L, SE, S, SO, O, NO ou graus (N = 0°, L = 90°, S = 180°, O = 270°). Use a bússola do celular olhando para baixo da água.", inc: "Inclinação: graus (ex.: 17) ou caimento do telhado em % (ex.: 30%). Caimento = altura ÷ distância horizontal × 100.", comp: "Comprimento da água ao longo do beiral (m).", larg: "Largura da água do beiral à cumeeira (m), medida no telhado ou na planta (ver opção abaixo).", nmod: "Novo: limite de módulos nessa água (vazio = pela área). Existente: módulos instalados nela." },
  u: { id: "Identificação da bateria (posição no banco).", v: "Tensão em repouso medida pelo analisador (V).", ri: "Resistência interna (mΩ) indicada pelo analisador.", cca: "CCA medido pelo analisador (A).", ccaNom: "CCA nominal da etiqueta, na mesma norma configurada no analisador.", soh: "SOH (%) calculado pelo analisador.", soc: "SOC (%) calculado pelo analisador." },
  mes: "Consumo do mês em kWh, da conta de energia. Deixe em branco os meses sem dado: a ferramenta prevê pela curva anual.",
  pu: "Preço unitário (R$) da sua cotação. O valor padrão é referência de out/2026 com a fonte indicada abaixo da tabela."
};
const tipI = () => `<span class="tipq" aria-hidden="true">?</span>`;
const tipBox = Object.assign(document.createElement("div"), { className: "tipbox", id: "tipbox", hidden: true }); tipBox.setAttribute("role", "tooltip"); document.body.appendChild(tipBox);
let tipAlvo = null;
function tipDe(el) {
  if (!el || !el.closest) return null;
  const d = el.closest("[data-tip]"); if (d) return { el: d, t: d.dataset.tip };
  const c = el.closest("[data-f],[data-tff],[data-uf],[data-mes],[data-pu]"); if (!c) return null;
  let t = null;
  if (c.dataset.c != null) t = TIPS_COL.c[c.dataset.f]; else if (c.dataset.tf != null) t = TIPS_COL.tf[c.dataset.tff]; else if (c.dataset.u != null) t = TIPS_COL.u[c.dataset.uf]; else if (c.dataset.mes != null) t = TIPS_COL.mes; else if (c.dataset.pu != null) t = TIPS_COL.pu;
  return t ? { el: c, t } : null;
}
function mostrarTip(el, t) {
  tipAlvo = el; tipBox.textContent = t; tipBox.hidden = false;
  const r = el.getBoundingClientRect(), bw = tipBox.offsetWidth, bh = tipBox.offsetHeight;
  const x = Math.min(Math.max(8, r.left), window.innerWidth - bw - 8); let y = r.top - bh - 8; if (y < 8) y = r.bottom + 8;
  tipBox.style.left = x + "px"; tipBox.style.top = y + "px";
}
function esconderTip() { tipAlvo = null; tipBox.hidden = true; }
document.addEventListener("mouseover", e => { const r = tipDe(e.target); if (r) { if (r.el !== tipAlvo) mostrarTip(r.el, r.t); } else if (!tipAlvo || !tipAlvo.contains(document.activeElement)) esconderTip(); });
document.addEventListener("focusin", e => { const r = tipDe(e.target); r ? mostrarTip(r.el, r.t) : esconderTip(); });
document.addEventListener("focusout", () => setTimeout(() => { if (!tipAlvo || !tipAlvo.contains(document.activeElement)) esconderTip(); }, 0));
document.addEventListener("keydown", e => { if (e.key === "Escape") esconderTip(); });
window.addEventListener("scroll", esconderTip, { passive: true, capture: true });

const STEPS = [
  { k: "id", t: "Identificação", s: "Cliente, obra, RT" },
  { k: "irr", t: "Local e irradiação", s: "CRESESB · pior caso" },
  { k: "carg", t: "Cargas", s: "Consumo diário e picos" },
  { k: "crit", t: "Critérios e equipamentos", s: "Autonomia, DoD, catálogos" },
  { k: "ex", t: "Sistema existente", s: "Análise e adequação" },
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
  const t = TIPS[path];
  return `<label class="f"${t ? ` data-tip="${esc(t)}"` : ""}><span>${esc(label)}${t ? tipI() : ""}</span>${inp}${hint ? `<span class="h">${hint}</span>` : ""}</label>`;
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
    case "ex": return S.modo === "existente" ? (R.cmp?.some(x => !x[3]) ? "part" : "done") : "";
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
  <dt>Estudo</dt><dd>${S.modo === "existente" ? "análise existente" : "sistema novo"}</dd>
  <dt>Consumo</dt><dd>${fmt((R.ECA + R.ECC) / 1000, 2)} kWh/dia</dd>
  <dt>Mês crítico</dt><dd>${MESES[R.mesDim]}</dd>
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
  id: () => `<p class="intro">Dados que vão para o carimbo e para a capa do relatório.</p><div class="grid">${fld("id.cliente", "Cliente / proprietário", { type: "text" })}${fld("id.obra", "Obra / finalidade", { type: "text" })}${fld("id.local", "Localidade", { type: "text" })}${fld("id.municipio", "Município/UF", { type: "text" })}${fld("id.rt", "Responsável técnico", { type: "text" })}${fld("id.crea", "CREA/CFT", { type: "text" })}${fld("id.data", "Data", { type: "date" })}${fld("modo", "Tipo de estudo", { opts: [["novo", "Dimensionar sistema novo"], ["existente", "Analisar sistema existente"]] })}</div>
  ${S.modo === "existente" ? `<p class="note warn"><b>Análise de sistema existente:</b> informe o que está instalado na etapa 05 (módulos, baterias, controladores, inversor, cabos). A ferramenta compara com o necessário, aponta o que está subdimensionado e monta a lista de adequação.</p>` : ""}
  <p class="note">Off-grid é para onde a rede não chega ou é cara de estender: bombeamento, ordenha, cercas, telemetria e moradias isoladas. O sistema precisa fechar a conta <b>no pior mês do ano</b>, sem ajuda da rede.</p>`,
  irr: () => {
    const rows = S.local.rows || [];
    const est = S._estacoes || [];
    return `<p class="intro">A irradiação vem do <b>CRESESB/SunData</b> (CEPEL). Para sistema isolado usamos o <b>pior caso</b>: a linha <b>“Maior mínimo mensal”</b> (inclinação que maximiza o mês mais fraco) e, nela, o <b>menor valor mensal</b>, nunca a média anual.</p>
    <div class="grid">${fld("local.lat", "Latitude (°, sul negativo)", { step: "0.0001", ph: "-31.7700" })}${fld("local.lon", "Longitude (°, oeste negativo)", { step: "0.0001", ph: "-52.3400" })}</div>
    <div class="actions"><button class="btn small" type="button" id="btnGeo" data-tip="Pede ao navegador a posição do aparelho (GPS ou rede). Use no local da obra.">Usar localização atual</button><button class="btn small primary" type="button" id="btnSun" data-tip="Consulta o CRESESB/SunData pela coordenada através do sundata.php. Exige o app rodando com php -S; sem PHP, use a consulta manual.">Buscar no CRESESB (automático)</button><button class="btn small ghost" type="button" id="btnNasa" data-tip="Alternativa quando o CRESESB não responde: climatologia da NASA POWER, com as inclinações calculadas pela ferramenta. Confira com o SunData no projeto oficial.">Alternativa: NASA POWER</button><a class="btn small ghost" href="${sunDataURL()}" target="_blank" rel="noopener">Abrir o SunData no navegador</a></div>
    <p class="note" id="irrMsg">A busca automática usa o proxy <span class="mono">sundata.php</span> (requer o app rodando com <span class="mono">php -S localhost:8000</span>). Sem PHP, abra o SunData, consulte a coordenada, copie a tabela de resultado e cole abaixo.</p>
    <details><summary>Consulta manual: colar a tabela do SunData</summary><p class="step-hint">No SunData: informe latitude (Sul) e longitude (Oeste) em graus decimais → Buscar → selecione o texto da estação (do nome até a linha “Maior mínimo mensal”) → copie e cole aqui.</p><textarea id="colar" placeholder="Estação: ...  Município: ...  Plano Horizontal 0° N 6,30 5,73 ... Maior mínimo mensal 52° N ..."></textarea><div class="actions"><button class="btn small primary" type="button" id="btnColar" data-tip="Lê a tabela copiada da página de resultado do SunData (do nome da estação até a linha “Maior mínimo mensal”).">Ler tabela colada</button></div></details>
    ${est.length > 1 ? `<div class="block"><h3>Estações próximas</h3><div class="tbl"><table><thead><tr><th></th><th>Estação</th><th>Município</th><th>Distância</th></tr></thead><tbody>${est.map((e, i) => `<tr><td><button class="btn small ghost" type="button" data-est="${i}">Usar</button></td><td>${esc(e.estacao)}</td><td>${esc(e.municipio)}</td><td>${esc(e.dist)}</td></tr>`).join("")}</tbody></table></div></div>` : ""}
    ${rows.length ? `<div class="block"><h3>Irradiação solar diária média mensal [kWh/m²·dia]</h3><p class="step-hint">Fonte: ${esc(S.local.fonte)}${S.local.estacao ? " · " + esc(S.local.estacao) : ""}${S.local.dist && S.local.dist !== "—" ? " · " + esc(S.local.dist) : ""}</p>
    <div class="tbl"><table><thead><tr><th>Usar</th><th>Ângulo</th><th class="r">Incl.</th>${MESES.map(m => `<th class="r">${m}</th>`).join("")}<th class="r">Média</th><th class="r">Mínimo</th></tr></thead><tbody>${rows.map((r, i) => { const mi = Math.min(...r.m), im = r.m.indexOf(mi); return `<tr class="${i === S.local.sel ? "sel" : ""}"><td><input type="radio" name="rowsel" data-row="${i}" ${i === S.local.sel ? "checked" : ""} style="width:auto"></td><td>${esc(r.nome)}</td><td class="num">${r.ang}° ${r.dir || ""}</td>${r.m.map((v, j) => `<td class="num ${j === im && i === S.local.sel ? "min" : ""}">${fmt(v, 2)}</td>`).join("")}<td class="num">${fmt(r.media, 2)}</td><td class="num"><b>${fmt(mi, 2)}</b></td></tr>`; }).join("")}</tbody></table></div>
    ${barrasSVG(R.row.m, { destacar: R.mesCrit, alvo: R.row.media, alvoTxt: "média anual " + fmt(R.row.media, 2) + " (NÃO usar)", un: "kWh/m²·dia — " + R.row.nome + " " + R.row.ang + "°" })}
    <div class="res">${card("HSP de projeto", fmt(R.hsp, 2), `${MESES[R.mesCrit]} · pior mês`)}${card("Média anual", fmt(R.hspMed, 2), "só para comparação")}${card("Diferença", pct(R.hspMed / R.hsp - 1), "quanto faltaria se usasse a média")}${card("Inclinação", R.row.ang + "°", "voltada para o " + (n(S.local.lat) < 0 ? "norte" : "sul"))}</div></div>` : ""}
    ${rows.length ? (() => { const t = S.telhado, tel = R.tel; return `<div class="block"><h3>Telhado: águas, orientação e inclinação</h3>
    <div class="grid">${fld("telhado.usar", "Instalar sobre telhado com águas definidas", { opts: [["nao", "Não — estrutura na inclinação ótima (linha selecionada)"], ["sim", "Sim — módulos rentes às águas do telhado"]] })}</div>
    ${t.usar === "sim" ? `<div class="tbl ct cab"><table><thead><tr><th>Água</th><th>Orient.</th><th>Incl.</th><th class="r">Compr. (m)</th><th class="r">Largura (m)</th><th class="r">${S.modo === "existente" ? "Instalados" : "Limite"}</th><th></th></tr></thead><tbody>${t.faces.map((f, j) => `<tr><td><input class="w-l" type="text" data-tf="${j}" data-tff="nome" value="${esc(f.nome)}"></td><td><input class="w-s" type="text" data-tf="${j}" data-tff="az" value="${esc(f.az)}" title="N, NE, L, SE, S, SO, O, NO ou graus (N = 0, L = 90)"></td><td><input class="w-s" type="text" data-tf="${j}" data-tff="inc" value="${esc(f.inc)}" title="graus (ex.: 17) ou caimento em % (ex.: 30%)"></td><td><input class="w-s" type="number" step="0.01" data-tf="${j}" data-tff="comp" value="${esc(f.comp)}" placeholder="beiral"></td><td><input class="w-s" type="number" step="0.01" data-tf="${j}" data-tff="larg" value="${esc(f.larg)}" placeholder="caída"></td><td><input class="w-s" type="number" data-tf="${j}" data-tff="nmod" value="${esc(f.nmod)}" placeholder="${S.modo === "existente" ? "" : "área"}"></td><td><button class="btn small danger" type="button" data-fdel="${j}">×</button></td></tr>`).join("")}</tbody></table></div>
    <div class="actions"><button class="btn small" type="button" id="addF" data-tip="Inclui outra água do telhado (orientação, inclinação e medidas).">+ Água</button></div>
    <div class="grid">${fld("telhado.margem", "Recuo das bordas e cumeeira (m)", { step: "0.05", hint: "afastamento livre para vento, fixação e manutenção: 0,3–0,5 m" })}${fld("telhado.medida", "Largura da água medida", { opts: [["plano", "No plano do telhado (do beiral à cumeeira)"], ["planta", "Na planta (projeção horizontal)"]] })}</div>
    <p class="step-hint">Orientação: para onde a água “olha” — N, NE, L, SE, S, SO, O, NO ou azimute em graus (N = 0°, L = 90°, S = 180°, O = 270°). Inclinação em graus (17) ou caimento do telhado em % (30% = 16,7°; 50% = 26,6°; 100% = 45°).</p>
    ${tel ? `<div class="tbl cab"><table><thead><tr><th>Água</th><th>Orient.</th><th class="r">Incl.</th><th class="r">HSP mín.</th><th class="r">HSP méd.</th><th class="r">Inverno</th><th class="r">Anual</th><th class="r">Mód.</th><th class="r">Str.</th></tr></thead><tbody>${tel.faces.map((f, j) => `<tr><td>${esc(f.nome)}</td><td>${dirNome(f.az)} (${fmt0(f.az)}°)</td><td class="num">${fmt(f.inc, 1)}°</td><td class="num">${fmt(f.min, 2)} ${MESES[f.mesMin]}</td><td class="num">${fmt(f.media, 2)}</td><td class="num"><b>${pct(f.efMin)}</b></td><td class="num">${pct(f.efMed)}</td><td class="num">${tel.sf ? tel.sf[j] * R.Ns : "—"}</td><td class="num">${tel.sf ? tel.sf[j] + "×" + R.Ns : "—"}</td></tr>`).join("")}<tr class="sub"><td colspan="3">Ótimo: ${esc(R.row.nome)} ${R.row.ang}°</td><td class="num">${fmt(R.hsp, 2)}</td><td class="num">${fmt(R.row.media, 2)}</td><td class="num">100%</td><td class="num">100%</td><td class="num">${R.Nmod}</td><td class="num">${R.Nstr}</td></tr></tbody></table></div>
    ${tel.faces.some(f => f.nArea != null) ? `<div class="tbl cab"><table><thead><tr><th>Água</th><th class="r">Área (m²)</th><th class="r">Retrato</th><th class="r">Paisagem</th><th class="r">Máx.</th><th class="r">Ocup. máx.</th><th class="r">Usados</th><th class="r">Ocup. real</th></tr></thead><tbody>${tel.faces.map((f, j) => f.nArea == null ? `<tr><td>${esc(f.nome)}</td><td colspan="7" class="step-hint">informe comprimento e largura para limitar pela área</td></tr>` : `<tr><td>${esc(f.nome)}</td><td class="num">${fmt(f.area, 1)} <small>(${fmt(f.L, 1)}×${fmt(f.Wpl, 1)})</small></td><td class="num">${f.nRet}</td><td class="num">${f.nPai}</td><td class="num"><b>${f.nArea}</b> <small>${f.orient}</small></td><td class="num">${pct(f.nArea * f.amod / f.area)}</td><td class="num">${tel.sf[j] * R.Ns}</td><td class="num">${pct(tel.sf[j] * R.Ns * f.amod / f.area)}</td></tr>`).join("")}</tbody></table></div>
    <p class="step-hint">Módulo de ${fmt(n(S.eq.mod.comp), 3)} × ${fmt(n(S.eq.mod.larg), 3)} m (${fmt(n(S.eq.mod.comp) * n(S.eq.mod.larg), 2)} m²), 2 cm entre módulos (grampos) e recuo de ${fmt(n(S.telhado.margem), 2)} m nas bordas. O número máximo sai do arranjo em grade (retrato ou paisagem), por isso a área de módulos é sempre menor que a área da água.</p>` : ""}
    ${linhasSVG([...tel.faces.map(f => ({ nome: f.nome, v: f.m })), { nome: "ótimo " + R.row.ang + "°", v: R.row.m, d: true, cor: "#17221d" }], { un: "kWh/m²·dia por água (tracejado: inclinação ótima)", dest: R.mesDim })}
    <p class="note">Captação = irradiação da água ÷ irradiação na inclinação ótima (linha selecionada do SunData). Cada água é calculada hora a hora no dia médio de cada mês e calibrada pela tabela do CRESESB. Os módulos vão primeiro para a água que mais rende no mês deficitário; cada água forma strings e MPPT próprios. ${tel.faces.some(f => f.efMin < 0.7) ? "<b>Há água com captação de inverno abaixo de 70%:</b> no hemisfério sul, faces voltadas ao sul perdem muito no inverno — prefira norte, leste ou oeste, ou estrutura inclinada." : ""}</p>` : ""}` : `<p class="step-hint">Use quando os módulos ficam rentes ao telhado: informe cada água (lado) com orientação e inclinação. A ferramenta calcula a captação de cada lado e distribui os módulos.</p>`}</div>`; })() : ""}
    <div class="block"><h3>Temperaturas de projeto (correção de tensão dos módulos)</h3><div class="grid">${fld("temp.tmin", "Temperatura mínima do ar (°C)", { hint: "eleva o Voc: limite do controlador" })}${fld("temp.tmax", "Temperatura máxima do ar (°C)", { hint: "célula ≈ ar + 30 °C: reduz o Vmp" })}</div></div>
    ${S.local.obs ? `<p class="note warn">${esc(S.local.obs)}</p>` : ""}`;
  },
  carg: () => { const k = S.conta; return `<p class="intro">Entre com as cargas <b>uma a uma</b> (dizendo quais são motores) ou pela <b>conta de energia</b> (mês de maior gasto ou os 12 meses). O mês que dimensiona o sistema é o de <b>maior consumo por irradiação</b>: uma conta alta no verão pode não ser o pior caso, porque o inverno gera menos.</p>
    <div class="grid">${fld("entrada", "Entrada de consumo", { opts: [["lista", "Cargas individuais"], ["conta", "Conta de energia (kWh/mês)"]] })}</div>
    ${R.entrada === "lista" ? `<div class="tbl ct"><table><thead><tr><th>Equipamento</th><th>Tipo de carga</th><th>CA/CC</th><th class="r">Qtd</th><th class="r">W unit.</th><th class="r">h/dia</th><th class="r">Simult.</th><th class="r">Ip/In</th><th>Crítica</th><th class="r">Wh/dia</th><th></th></tr></thead><tbody>
    ${S.cargas.map((l, i) => `<tr><td><input class="w-l" data-c="${i}" data-f="nome" type="text" value="${esc(l.nome)}"></td><td><select data-c="${i}" data-f="nat">${Object.entries(NAT).map(([kk, v]) => `<option value="${kk}" ${(l.nat || (n(l.kp) > 1 ? "mot" : "res")) === kk ? "selected" : ""}>${v.t}</option>`).join("")}</select></td><td><select data-c="${i}" data-f="tipo"><option ${l.tipo === "CA" ? "selected" : ""}>CA</option><option ${l.tipo === "CC" ? "selected" : ""}>CC</option></select></td><td><input class="w-s" data-c="${i}" data-f="q" type="number" step="1" value="${l.q}"></td><td><input data-c="${i}" data-f="w" type="number" value="${l.w}"></td><td><input class="w-s" data-c="${i}" data-f="h" type="number" step="0.1" value="${l.h}"></td><td><input class="w-s" data-c="${i}" data-f="fs" type="number" step="0.1" value="${l.fs}"></td><td><input class="w-s" data-c="${i}" data-f="kp" type="number" step="0.5" value="${l.kp}"></td><td style="text-align:center"><input type="checkbox" style="width:auto" data-c="${i}" data-f="crit" ${critica(l) ? "checked" : ""} title="mantida durante falta da concessionária"></td><td class="num">${fmt0(R.cargas[i].e)}</td><td><button class="btn small danger" type="button" data-del="${i}">Remover</button></td></tr>`).join("")}
    <tr class="sub"><td colspan="9">Total (CA ${fmt0(R.ECA)} Wh · CC ${fmt0(R.ECC)} Wh)</td><td class="num">${fmt0(R.ECA + R.ECC)}</td><td></td></tr></tbody></table></div>
    <div class="actions"><button class="btn small" type="button" id="addC" data-tip="Inclui um equipamento. Escolha o tipo de carga para preencher o Ip/In.">+ Equipamento</button></div>
    <p class="note"><b>Tipo de carga</b> define o fator de partida Ip/In: resistiva e eletrônica 1 · motor em partida direta 6 · compressor 5 · motor com soft-starter 3 · motor com inversor de frequência 1,5 (editável). Só motores e compressores entram no surto.</p>` : `
    <div class="block"><h3>Conta de energia</h3><div class="grid">${fld("conta.pior", "Consumo do mês de maior gasto (kWh)", { hint: "da conta; ou preencha os 12 meses abaixo" })}${fld("conta.mesPior", "Mês de maior gasto", { opts: MESES.map((m, i) => [String(i), m]) })}${fld("conta.amp", "Variação anual prevista (%)", { step: "5", hint: "(maior − menor)/maior; rural típico 20–40%" })}${fld("conta.psim", "Potência simultânea máx. (W)", { hint: "demanda; necessária para o inversor" })}${fld("conta.pmotor", "Maior motor/compressor (W)", { hint: "0 se não houver" })}${fld("conta.kp", "Ip/In desse motor", { step: "0.5" })}${fld("conta.fcc", "Fração do consumo em CC (0–1)", { step: "0.05" })}${fld("conta.fcrit", "Fração crítica durante falta (0–1)", { step: "0.05" })}</div>
    <div class="tbl"><table><thead><tr><th>Mês</th>${MESES.map(m => `<th class="r">${m}</th>`).join("")}</tr></thead><tbody>
    <tr><td>kWh/mês (conta)</td>${MESES.map((m, i) => `<td><input class="w-s" type="number" data-mes="${i}" value="${esc(k.meses?.[i] ?? "")}" placeholder="${fmt0(R.kwhMes?.[i] || 0)}"></td>`).join("")}</tr>
    <tr><td>usado (${"<i>previsto</i>"})</td>${MESES.map((m, i) => `<td class="num">${R.kwhPrev?.[i] ? "<i>" + fmt0(R.kwhMes[i]) + "</i>" : fmt0(R.kwhMes?.[i] || 0)}</td>`).join("")}</tr>
    <tr><td>kWh/dia</td>${MESES.map((m, i) => `<td class="num ${i === R.mesDim ? "min" : ""}">${fmt(R.Emes[i] / 1000, 1)}</td>`).join("")}</tr>
    ${R.row ? `<tr><td>HSP</td>${MESES.map((m, i) => `<td class="num">${fmt(R.row.m[i], 2)}</td>`).join("")}</tr><tr><td>consumo/HSP</td>${MESES.map((m, i) => `<td class="num ${i === R.mesDim ? "min" : ""}">${fmt(R.Emes[i] / 1000 / R.row.m[i], 2)}</td>`).join("")}</tr>` : ""}</tbody></table></div>
    <p class="step-hint">Meses em branco são previstos por uma curva anual (cosseno) com pico no mês de maior gasto e a variação informada. Valor em itálico = previsto.</p></div>`}
    ${R.row ? `<div class="block"><h3>Consumo mensal × irradiação: mês que dimensiona</h3>${barrasSVG(R.Emes.map(v => v / 1000), { destacar: R.mesDim, un: "kWh/dia por mês (vermelho = mês de dimensionamento)", cor: "#7a4fd0", dec: 1 })}<p class="step-hint">Mês de dimensionamento: <b>${MESES[R.mesDim]}</b> (maior consumo/HSP). ${R.mesDim !== R.mesCrit ? `Não coincide com o mês de menor irradiação (${MESES[R.mesCrit]}): o consumo pesa mais que a irradiação.` : `Coincide com o mês de menor irradiação.`} ${R.entrada === "conta" && R.mesPiorConta !== R.mesDim ? `A maior conta (${MESES[R.mesPiorConta]}) sobra energia nos painéis.` : ""}</p></div>` : ""}
    <div class="res">${card("Consumo (mês máx.)", fmt((R.ECA + R.ECC) / 1000, 2) + " kWh/dia", R.entrada === "conta" ? "da conta" : "Σ qtd × W × h")}${card("Retirado da bateria", fmt(R.Ebat / 1000, 2) + " kWh", "inclui perdas de inversor e cabos")}${card("Mês de dimensionamento", MESES[R.mesDim], `${fmt(R.EbatDim / 1000, 2)} kWh com HSP ${fmt(R.hspDim, 2)}`)}${card("Potência simultânea", fmt0(R.Psim) + " W", R.psimEst ? "ESTIMADA" : "cargas CA × simultaneidade")}${card("Surto de partida", fmt0(R.surto) + " W", "simultânea + maior motor × (Ip/In − 1)")}</div>
    ${formula(`E_bat = E_CC/η_cabos + E_CA/(η_inv·η_cabos) = ${fmt0(R.ECC)}/${S.crit.etaCabo} + ${fmt0(R.ECA)}/(${S.crit.etaInv}·${S.crit.etaCabo}) = ${fmt0(R.Ebat)} Wh/dia
Mês de dimensionamento = máx(E_bat,mês / HSP_mês) → ${MESES[R.mesDim]}: ${fmt0(R.EbatDim)} / ${fmt(R.hspDim, 2)}`)}
    <p class="note"><b>Crítica:</b> carga que precisa continuar ligada durante falta da concessionária (sistemas com rede como reserva). Consumo crítico retirado da bateria: <b>${fmt0(R.EcritBat)} Wh/dia</b>.</p>`; },
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
    ${fld("crit.tpart", "Duração do pico de partida (s)", { step: "0.1", hint: "compressor/motor direto: 0,3–1 s" })}${fld("crit.kfrio", "Fator R(−18 °C)/R(25 °C) para CCA", { step: "0.1", hint: "chumbo ≈ 1,6–2,0" })}</div></div>
    <div class="block"><h3>Módulo fotovoltaico</h3><div class="grid">${fld("eq.mod.nome", "Modelo", { type: "text" })}${fld("eq.mod.p", "Pmáx (W)")}${fld("eq.mod.voc", "Voc (V)")}${fld("eq.mod.vmp", "Vmp (V)")}${fld("eq.mod.isc", "Isc (A)")}${fld("eq.mod.imp", "Imp (A)")}${fld("eq.mod.bvoc", "Coef. temp. Voc (%/°C)", { step: "0.01" })}${fld("eq.mod.fusmax", "Fusível máx. em série (A)")}${fld("eq.mod.comp", "Comprimento do módulo (m)", { step: "0.001" })}${fld("eq.mod.larg", "Largura do módulo (m)", { step: "0.001" })}</div></div>
    <div class="block"><h3>Bateria (unidade)</h3><div class="grid">${fld("eq.bat.nome", "Modelo", { type: "text" })}${fld("eq.bat.v", "Tensão nominal (V)", { step: "0.1" })}${fld("eq.bat.ah", "Capacidade (Ah, C20/C10)")}${fld("eq.bat.ri", "Resistência interna (mΩ)", { step: "0.1", hint: "catálogo ou medida com a bateria nova" })}${fld("eq.bat.imax", "Corrente máx. contínua de descarga (A)")}${fld("eq.bat.ipico", "Corrente de pico (A)", { hint: "limite do BMS/fabricante" })}${fld("eq.bat.tpico", "Duração do pico (s)", { step: "0.5" })}${fld("eq.bat.cca", "CCA (A, só chumbo; 0 = não informado)", { hint: "30 s a −18 °C até 7,2 V (12 V)" })}${S.crit.bat === "li" ? fld("eq.bat.bms", "BMS", { opts: [["integrado", "Integrado no módulo (rack)"], ["externo", "Externo (células avulsas)"]] }) : ""}</div><div class="actions"><button class="btn small ghost" type="button" id="batPadrao" data-tip="Repõe a bateria de referência da tecnologia escolhida (modelo, tensão, Ah, resistência e limites).">Usar bateria padrão desta tecnologia</button></div></div>
    <div class="block"><h3>Controlador de carga MPPT</h3><div class="grid">${fld("eq.ctrl.nome", "Modelo", { type: "text" })}${fld("eq.ctrl.imax", "Corrente máx. de carga (A)")}${fld("eq.ctrl.vocmax", "Voc máx. de entrada (V)")}${fld("eq.ctrl.p48", "Potência FV máx. em 48 V (W)", { hint: "proporcional à tensão do banco" })}</div></div>
    <div class="block"><h3>Inversor off-grid</h3><div class="grid">${fld("eq.inv.nome", "Modelo", { type: "text" })}${fld("eq.inv.p", "Potência contínua (W)")}${fld("eq.inv.surto", "Fator de surto (× P, ~5 s)", { step: "0.1" })}${fld("eq.inv.eta", "Rendimento", { step: "0.01" })}${fld("eq.inv.carr", "Carregador CA (A)", { hint: "recarga pelo gerador" })}${fld("eq.inv.vcorte", "Corte por subtensão (V; 0 = automático)", { step: "0.1", hint: `automático: ${fmt(R.Vnom * R.T.vCorte, 1)} V` })}</div></div>`; },
  ex: () => { if (S.modo !== "existente") return `<p class="note">Esta etapa é usada para <b>analisar um sistema já instalado</b>. Mude o “Tipo de estudo” na etapa 01 para “Analisar sistema existente”.</p>`;
    const C = R.cmp || [], ruins = C.filter(x => !x[3]);
    return `<p class="intro">Informe o que está instalado. Campos em branco usam o valor dimensionado. Cargas (etapa 03), local (02) e catálogos (04) devem descrever o sistema real.</p>
    <div class="block"><h3>Instalado</h3><div class="grid">${fld("exist.ns", "Módulos em série por string", { step: "1", hint: `dimensionado: ${R.NsDim}` })}${fld("exist.nstr", "Strings em paralelo", { step: "1", hint: `dimensionado: ${R.NstrDim}` })}${fld("exist.bns", "Baterias em série", { step: "1", hint: `dimensionado: ${R.bNsDim}` })}${fld("exist.bnp", "Fileiras de baterias em paralelo", { step: "1", hint: `dimensionado: ${R.bNpDim}` })}${fld("exist.nctrl", "Controladores", { step: "1", hint: `dimensionado: ${R.nCtrlDim}` })}${fld("exist.ninv", "Inversores", { step: "1", hint: `dimensionado: ${R.invNDim}` })}${fld("exist.sfv", "Cabo das strings (mm²)", { opts: [["", "—"], ...SEC.map(x => [String(x), x + " mm²"])] })}${fld("exist.sctrl", "Cabo controlador → barramento (mm²)", { opts: [["", "—"], ...SEC.map(x => [String(x), x + " mm²"])] })}${fld("exist.sinv", "Cabo inversor → barramento (mm²)", { opts: [["", "—"], ...SEC.map(x => [String(x), x + " mm²"])] })}${fld("exist.sbat", "Cabo do banco (mm²)", { opts: [["", "—"], ...SEC.map(x => [String(x), x + " mm²"])] })}${fld("exist.sca", "Cabo inversor → quadro CA (mm²)", { opts: [["", "—"], ...SEC.map(x => [String(x), x + " mm²"])] })}${fld("exist.fusbat", "Fusível do banco (A)", { step: "1" })}</div></div>
    <div class="res">${card("Itens verificados", C.length)}${card("Adequados", C.length - ruins.length)}${card("Subdimensionados", ruins.length, ruins.length ? "ver tabela" : "sistema atende")}${card("Custo de adequação", brl(R.custo.total), "lista na etapa 11")}</div>
    <div class="tbl prot"><table><thead><tr><th>Item</th><th>Necessário</th><th>Existente</th><th>Situação</th><th>Observação</th></tr></thead><tbody>${C.map(x => `<tr class="${x[3] ? "" : "crit"}"><td><b>${esc(x[0])}</b></td><td>${esc(x[1])}</td><td>${esc(x[2])}</td><td>${x[3] ? "✓ atende" : "✗ adequar"}</td><td>${esc(x[4])}</td></tr>`).join("")}</tbody></table></div>
    ${ruins.length ? `<div class="block"><h3>Recomendações</h3><ul class="pend">${ruins.map(x => `<li>${esc(x[0])}: ${esc(x[4])} — necessário ${esc(x[1])}.</li>`).join("")}</ul></div>` : `<p class="note ok">O sistema existente atende ao consumo e ao pior caso informados.</p>`}
    ${R.est?.tem ? `<p class="note">Estado medido das baterias: SOH ${R.est.soh != null ? pct(R.est.soh) : "—"}${R.est.trocar ? ` · ${R.est.trocar} bateria(s) para substituir` : ""} (etapa 07).</p>` : `<p class="note">Registre as medições do analisador de baterias na etapa 07 para incluir a saúde do banco na análise.</p>`}${avisos()}`; },
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
    <div class="block"><h3>CCA: quanto o banco precisa e quanto as baterias têm</h3>
    ${formula(`R_banco,máx = (V_ref − V_corte − 2%)/I_pico = (${fmt(R.Vref, 2)} − ${fmt(R.vCorte, 2)} − ${fmt(R.marg, 2)})/${fmt0(R.Ipk)} = ${fmt(R.RbReq * 1000, 2)} mΩ
R_i,máx por bateria = (R_banco,máx − R_cabos)·Np/Ns = (${fmt(R.RbReq * 1000, 2)} − ${fmt(R.Rcabo * 1000, 2)})·${R.bNp}/${R.bNs} = ${fmt(R.riReq * 1000, 2)} mΩ
R equivalente 12 V = R_i/n_células × 6 = ${fmt(R.r12(Math.max(0, R.riReq)) * 1000, 2)} mΩ
CCA_necessário = (12,6 − 7,2)/(k_frio·R_12V) = 5,4/(${R.kfrio}·${fmt(R.r12(Math.max(0, R.riReq)), 5)}) = ${isFinite(R.ccaReq) ? fmt0(R.ccaReq) : "∞"} A
CCA_esperado (R_i catálogo ${n(S.eq.bat.ri)} mΩ) = 5,4/(${R.kfrio}·${fmt(R.r12(n(S.eq.bat.ri) / 1000), 5)}) = ${fmt0(R.ccaCat)} A`)}
    <div class="res">${card("CCA necessário", isFinite(R.ccaReq) ? fmt0(R.ccaReq) + " A" : "—", "por bateria, equivalente 12 V, −18 °C")}${card("CCA esperado", fmt0(R.ccaCat) + " A", "pela resistência interna de catálogo")}${card("CCA nominal", n(S.eq.bat.cca) ? fmt0(n(S.eq.bat.cca)) + " A" : "não informado", n(S.eq.bat.cca) ? "catálogo" : "usado o esperado")}${card("Situação", R.ccaNom >= R.ccaReq ? "atende" : "insuficiente", `margem ${isFinite(R.ccaReq) ? pct(R.ccaNom / R.ccaReq - 1) : "—"}`)}</div>
    <p class="step-hint">CCA (SAE J537): corrente que uma bateria de 12 V entrega por 30 s a −18 °C mantendo ≥ 7,2 V. Como os analisadores, a ferramenta relaciona CCA e resistência interna: CCA ≈ (12,6 − 7,2)/(k_frio·R). ${R.T === TIPOS.li ? "LiFePO4 não tem CCA normalizado: o valor é um equivalente pela resistência." : "Compare CCA medido e nominal na mesma norma do analisador (SAE, EN, DIN, IEC, JIS)."}</p></div>
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
    <div class="block"><h3>Teste de carga (tensão e corrente)</h3><div class="grid">${fld("estado.v0", "Tensão em repouso V₀ (V)", { step: "0.01" })}${fld("estado.v1", "Tensão sob carga V₁ (V)", { step: "0.01" })}${fld("estado.i1", "Corrente de carga I (A)", { step: "0.1" })}</div>
    ${o.riTeste ? formula(`R_i = (V₀ − V₁)/I = (${fmt(n(S.estado.v0), 2)} − ${fmt(n(S.estado.v1), 2)})/${fmt(n(S.estado.i1), 1)} = ${fmt(o.riTeste * 1000, 2)} mΩ
CCA equivalente = 5,4/(k_frio·R_12V) = 5,4/(${R.kfrio}·${fmt(R.r12(o.riTeste), 5)}) = ${fmt0(o.ccaTeste)} A   (necessário ${isFinite(R.ccaReq) ? fmt0(R.ccaReq) : "—"} A)`) : `<p class="step-hint">Aplique uma carga conhecida (ex.: 0,5–1 C por 10 s) e anote a tensão antes e durante. Valores por bateria.</p>`}</div>
    <div class="block"><h3>Analisador de baterias (uma linha por bateria)</h3>
    <div class="tbl ct ana"><table><thead><tr><th>ID</th><th class="r">Tensão (V)</th><th class="r">Ri (mΩ)</th><th class="r">CCA medido</th><th class="r">CCA nominal</th><th class="r">SOH (%)</th><th class="r">SOC (%)</th><th></th></tr></thead><tbody>
    ${(S.analise || []).map((u, i) => { const r = o.units?.find(x => x.id === (u.id || "B" + (i + 1))); return `<tr class="${r?.fl.length ? "crit" : ""}"><td><input class="w-s" data-u="${i}" data-uf="id" type="text" value="${esc(u.id)}"></td>${["v", "ri", "cca", "ccaNom", "soh", "soc"].map(f => `<td><input class="w-s" data-u="${i}" data-uf="${f}" type="number" step="any" value="${esc(u[f])}"></td>`).join("")}<td><button class="btn small danger" type="button" data-udel="${i}">×</button></td></tr>${r ? `<tr class="${r.fl.length ? "crit" : ""}"><td></td><td colspan="7" class="step-hint" style="white-space:normal">SOH ${r.soh != null ? pct(r.soh) : "—"} · SOC ${r.soc != null ? pct(r.soc) : "—"} · CCA pela Ri ${fmt0(r.ccaRi)} A${r.fl.length ? " · <b>" + r.fl.join("; ") + "</b>" : " · ok"}</td></tr>` : ""}`; }).join("")}</tbody></table></div>
    <div class="actions"><button class="btn small" type="button" id="addU" data-tip="Inclui uma linha para os dados de uma bateria medidos pelo analisador.">+ Bateria</button><button class="btn small ghost" type="button" id="limpaU">Limpar</button></div>
    <details><summary>Colar exportação do analisador (CSV)</summary><p class="step-hint">Uma bateria por linha: <span class="mono">ID; tensão V; Ri mΩ; CCA medido; CCA nominal; SOH %; SOC %</span> (separador ; , ou tab). Funciona com o relatório de analisadores de condutância (Midtronics, Konnwei, Foxwell, Ancel e similares) depois de exportado para planilha.</p><textarea id="colarU" placeholder="B1;12,62;4,3;720;760;95;98"></textarea><div class="actions"><button class="btn small primary" type="button" id="btnColarU" data-tip="Importa as linhas coladas: ID; tensão; Ri; CCA; CCA nominal; SOH; SOC.">Ler</button></div></details>
    ${o.units ? `<p class="note ${o.trocar || o.riSpread > 0.25 ? "warn" : "ok"}">${o.units.length} bateria(s) · pior SOH ${pct(o.sohMin)} · SOH do banco ${pct(o.sohUnid)} (${R.bNs > 1 ? "série: vale a pior" : "paralelo: média"}) · dispersão de Ri ${pct(o.riSpread)}${o.trocar ? ` · <b>${o.trocar} para substituir</b> — ${R.bNs > 1 ? "em série a pior bateria limita a fileira: troque a fileira inteira ou reagrupe por Ri semelhante" : "em paralelo, substitua só a unidade ruim por outra do mesmo modelo (lítio: mesmo firmware; chumbo: mesma idade)"}` : ""}.</p>` : ""}</div>
    ${o.tem ? `<div class="res">
    ${o.soc != null ? card("SOC", pct(o.soc), `OCV ${fmt(o.vcel, 3)} V/célula`) + card("DoD atual", pct(o.dod), "1 − SOC") : ""}
    ${o.soh != null ? card("SOH", pct(o.soh), "pior indicador: " + o.sohFonte) : ""}
    ${o.sohC != null ? card("SOH capacidade", pct(o.sohC), `${fmt(n(S.estado.cmed), 1)} / ${n(ub.ah)} Ah`) : ""}
    ${o.sohR != null ? card("SOH resistência", pct(o.sohR), `${fmt(n(S.estado.rmed), 1)} mΩ (fim de vida em ${fmt(2 * n(ub.ri), 1)} mΩ)`) : ""}
    ${o.sohCCA != null ? card("SOH CCA", pct(o.sohCCA), `CCA médio / nominal${n(ub.cca) ? "" : " (estimado pela Ri)"}: ${fmt0(R.ccaNom)} A`) : ""}${o.ccaRi ? card("CCA pela Ri", fmt0(o.ccaRi) + " A", `necessário ${isFinite(R.ccaReq) ? fmt0(R.ccaReq) : "—"} A`) : ""}
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
  fv: () => `<p class="intro">O gerador FV precisa repor, <b>no mês de dimensionamento (${MESES[R.mesDim]}, maior consumo/irradiação)</b>, a energia retirada da bateria mais as perdas de carga e descarga.</p>
    ${formula(`E_FV = E_bat,${MESES[R.mesDim]} / η_bat = ${fmt0(R.EbatDim)} / ${R.T.eta} = ${fmt0(R.Efv)} Wh/dia${R.Erec ? `   (+ recuperação ${fmt0(R.Erec)} Wh/dia)` : ""}
P_FV = E_FV / (HSP_${MESES[R.mesDim]} × PR) = ${fmt0(R.Efv + R.Erec)} / (${fmt(R.hspDim, 2)} × ${S.crit.pr}) = ${fmt0(R.Pnec)} W${R.tel ? "   (HSP efetiva das águas; módulos distribuídos mês a mês)" : ""}  →  ${R.Nnec} módulos de ${S.eq.mod.p} W
Voc,máx = Voc·[1 + β·(T_mín − 25)] = ${S.eq.mod.voc}·[1 + ${S.eq.mod.bvoc}%·(${S.temp.tmin} − 25)] = ${fmt(R.vocMax, 2)} V  →  Ns ≤ ${S.eq.ctrl.vocmax}/${fmt(R.vocMax, 2)} = ${R.NsMax}
Vmp,quente = Vmp·[1 + β·(T_máx + 30 − 25)] = ${fmt(R.vmpQ, 2)} V  →  Ns ≥ (V_carga ${fmt(R.vChg, 1)} + 5)/${fmt(R.vmpQ, 2)} = ${R.NsMin}`)}
    <div class="res">${card("Módulos", R.Nmod, `${R.Ns} em série × ${R.Nstr} strings`)}${card("Potência instalada", fmt(R.Pfv / 1000, 2) + " kWp", `necessário ${fmt(R.Pnec / 1000, 2)} kWp`)}${card("Voc,máx do arranjo", fmt0(R.vocArr) + " V", `a ${S.temp.tmin} °C (limite ${S.eq.ctrl.vocmax} V)`)}${card("Controladores", R.nCtrl + "×", `${R.strCtrl} string(s) cada · ${fmt(R.iCtrl)} A de ${S.eq.ctrl.imax} A`)}${card("Folga no mês crítico", pct(R.sobra), "menor produção/necessidade − 1")}${card("Área aprox.", fmt(R.Nmod * 2.6, 0) + " m²", "≈ 2,6 m² por módulo de 550 W")}</div>
    ${R.tel ? `<div class="block"><h3>Arranjo por água do telhado</h3><div class="tbl cab"><table><thead><tr><th>Água</th><th>Orient.</th><th class="r">Módulos</th><th class="r">Strings ×${R.Ns}</th><th class="r">kWp</th><th class="r">MPPT</th><th class="r">kWh/dia ${MESES[R.mesDim]}</th></tr></thead><tbody>${R.tel.faces.map((f, j) => `<tr><td>${esc(f.nome)}</td><td>${dirNome(f.az)} · ${fmt(f.inc, 1)}°</td><td class="num">${R.tel.sf[j] * R.Ns}</td><td class="num">${R.tel.sf[j]}</td><td class="num">${fmt(R.tel.sf[j] * R.Ns * n(S.eq.mod.p) / 1000, 2)}</td><td class="num">${R.tel.nc ? R.tel.nc[j] : "—"}</td><td class="num">${fmt(R.tel.sf[j] * R.Ns * n(S.eq.mod.p) * f.m[R.mesDim] * n(S.crit.pr) / 1000, 2)}</td></tr>`).join("")}</tbody></table></div><p class="step-hint">HSP efetiva do arranjo no mês crítico: ${fmt(R.hspDim, 2)} kWh/m²·dia (média ponderada pelas águas). Strings de águas diferentes não se misturam no mesmo MPPT.</p></div>` : ""}
    <div class="block"><h3>Produção mensal estimada × necessidade</h3>${barrasSVG(R.prodMes.map(v => v / 1000), { destacar: R.mesDim, outra: R.EfvMes.map(v => v / 1000), un: "kWh/dia gerados (barras) × necessidade do mês (linha)" })}<p class="step-hint">Nos meses fortes sobra energia (o controlador corta a carga quando a bateria enche). Esse é o preço do off-grid: dimensionar pelo pior mês.</p></div>${avisos()}`,
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
    <div class="grid">${fld("cabos.lger", "Gerador/rede → chave (m)")}</div>
    <div class="tbl cab"><table><thead><tr><th>Trecho</th><th class="r">I (A)</th><th class="r">L (m)</th><th class="r">V</th><th class="r">S queda</th><th class="r">S capac.</th><th class="r">Seção</th><th class="r">Iz (A)</th><th class="r">ΔV</th><th class="r">PE</th></tr></thead><tbody>
    ${R.cabos.map(x => `<tr class="${x.c.req != null && !x.c.ok ? "crit" : ""}"><td>${esc(x.t)}</td><td class="num">${fmt(x.I, 1)}</td><td class="num">${fmt(x.L, 1)}</td><td class="num">${fmt0(x.V)}</td><td class="num">${fmt(x.c.sdv, 1)}</td><td class="num">${fmt(x.c.sA, 1)}</td><td class="num"><b>${x.c.s} mm²</b>${x.c.req != null && !x.c.ok ? `<br><small>precisa ${x.c.req}</small>` : ""}</td><td class="num">${x.c.iz ?? "—"}</td><td class="num">${fmt(x.c.dv, 2)}%</td><td class="num">${x.pe} mm²</td></tr>`).join("")}</tbody></table></div>
    ${formula("S_queda = 2·L·I / (56·ΔV)   (cobre, ida e volta)        S_capacidade: menor seção com Iz ≥ I\nPE (NBR 5410 Tab. 58): S ≤ 16 → PE = S; 16 < S ≤ 35 → 16 mm²; S > 35 → S/2")}</div>
    <div class="block"><h3>Barramentos</h3><div class="tbl"><table><thead><tr><th>Barramento</th><th class="r">I projeto (A)</th><th>Barra de cobre</th><th class="r">Seção (mm²)</th><th class="r">Iz DIN 43671 (A)</th><th class="r">0,8·Iz (A)</th></tr></thead><tbody>${R.barras.map(x => `<tr><td>${esc(x.t)}</td><td class="num">${x.I ? fmt0(x.I) : "—"}</td><td>${esc(x.txt)}</td><td class="num">${fmt0(x.sec)}</td><td class="num">${fmt0(x.iz)}</td><td class="num">${fmt0(0.8 * x.iz)}</td></tr>`).join("")}</tbody></table></div><p class="step-hint">Barras nuas a 35 °C (DIN 43671) com fator 0,8 para quadro fechado; barras em paralelo com fator 0,85. Barramento CC: corrente total do banco (inversor + cargas CC ou carga do FV, o maior) × 1,25. Isolar e cobrir os barramentos CC.</p></div>
    ${(() => { const A = altTensoes(); if (!A.length) return ""; const best = A.filter(x => !x.inv12).reduce((a, b) => (b.r.custo.total < a.r.custo.total ? b : a)); return `<div class="block"><h3>Montagem em outras tensões de banco</h3><div class="tbl"><table><thead><tr><th>Banco</th><th class="r">Baterias</th><th class="r">I inversor CC</th><th class="r">I banco</th><th class="r">Cabo banco</th><th class="r">Cabo inversor</th><th class="r">Fusível</th><th>Barramento CC</th><th class="r">Controladores</th><th class="r">Queda no pico</th><th class="r">Total</th></tr></thead><tbody>${A.map(x => `<tr class="${x.v === R.Vb ? "sel" : ""}"><td><b>${x.v} V</b>${x.inv12 ? " ⚠" : ""}</td><td class="num">${x.r.bNs}S×${x.r.bNp}P</td><td class="num">${fmt0(x.r.iDcInv)} A</td><td class="num">${fmt0(x.r.iBat)} A</td><td class="num">${x.r.cBat.s} mm²</td><td class="num">${x.r.cInv.s} mm²</td><td class="num">${x.r.inFusBat} A</td><td>${esc(x.r.bCC.txt)}</td><td class="num">${x.r.nCtrl}×</td><td class="num">${fmt(x.r.Vref - x.r.Vsag, 2)} V${x.r.capNec ? " (cap.)" : ""}</td><td class="num">${brl(x.r.custo.total)}</td></tr>`).join("")}</tbody></table></div><p class="step-hint">Mesmo consumo, mesmos catálogos; ${S.crit.bat === "li" ? "lítio em módulos de 12,8/25,6/51,2 V com o mesmo Ah" : "baterias de 12 V em série"}. Corrente cai pela metade a cada dobro de tensão: cabo, fusível e barramento menores. ⚠ inversor de 12 V acima de 3 kW é raro no mercado. Menor custo viável: <b>${best.v} V</b>.</p></div>`; })()}
    <div class="block"><h3>Seguranças obrigatórias</h3><ul class="pend">${["Fusível no polo positivo do banco o mais perto possível da bateria (curto em bateria de lítio passa de vários kA)", "Seccionadora CC do banco e da string box para manutenção sem arco", "DPS CC na string box e DPS CA no quadro, aterrados no mesmo BEP", "Barramentos CC isolados com tampa; polaridade identificada (vermelho +, preto/azul −)", "Banco em abrigo ventilado (chumbo: hidrogênio), longe de faíscas, com sinalização de risco elétrico e químico", "DR 30 mA nos circuitos CA de tomadas e áreas molhadas (ordenha, lavagem)", "Intertravamento mecânico entre inversor e fonte reserva", "Equipotencialização das molduras, estruturas e racks; SPDA se a análise de risco (NBR 5419) indicar"].map(t => `<li class="ok">${t}</li>`).join("")}</ul></div>${avisos()}`,
  esq: () => `<p class="intro">Diagrama unifilar gerado a partir dos cálculos (vermelho: positivo CC; azul: negativo CC; verde: proteção/terra). Vai para o PDF em página A4 paisagem.</p>${esquemaSVG(R)}
    <p class="note">Convenções: as cores e a numeração seguem o projeto elétrico principal. Para o projeto executivo, detalhe a string box, o quadro CC e o quadro CA em pranchas próprias (NBR 5444).</p>`,
  cus: () => { const C = R.custo; return `<p class="intro">Quantidades vêm do dimensionamento; preços de referência de out/2026 com a fonte de cada um. Edite o preço unitário para a sua cotação.</p>
    <div class="tbl ct"><table><thead><tr><th>Grupo</th><th>Item</th><th class="r">Qtd</th><th>Un.</th><th class="r">Preço unit.</th><th class="r">Total</th></tr></thead><tbody>${R.mat.map(m => `<tr><td>${esc(m.g)}</td><td style="white-space:normal">${esc(m.d)}</td><td class="num">${fmt(m.q, m.q % 1 ? 1 : 0)}</td><td>${esc(m.un)}</td><td><input type="number" step="0.01" data-pu="${m.k}" value="${n(S.precos[m.k]?.pu)}"></td><td class="num">${brl(m.q * m.pu)}</td></tr>`).join("")}<tr class="sub"><td colspan="5">Equipamentos e materiais</td><td class="num">${brl(C.eq)}</td></tr></tbody></table></div>
    <div class="block"><h3>Mão de obra e despesas</h3><div class="grid">${fld("mo.heng", "Horas de engenharia (projeto, ART, comissionamento)")}${fld("mo.peng", "R$/h engenharia")}${fld("mo.hele", "Horas de eletricista (NR-10)")}${fld("mo.pele", "R$/h eletricista")}${fld("mo.haux", "Horas de auxiliar")}${fld("mo.paux", "R$/h auxiliar")}${fld("mo.km", "Deslocamento total (km)")}${fld("mo.pkm", "R$/km")}${fld("mo.desp", "Outras despesas (R$)")}${fld("mo.bdi", "BDI / lucro (%)")}${fld("mo.imp", "Impostos (%)")}</div><p class="step-hint">${esc(S.mo.f)}</p></div>
    <div class="res">${card("Equipamentos", brl(C.eq))}${card("Serviços", brl(C.sv))}${card("Deslocamento e despesas", brl(C.desl))}${card("BDI + impostos", brl(C.bdi + C.imp))}${card("Total", brl(C.total))}${card("R$/Wp", fmt(R.indic.rsWp, 2))}${card("R$/kWh armazenado", fmt0(R.indic.rsKwh))}${card("Custo da energia (25 anos)", "R$ " + fmt(R.indic.lcoe, 2) + "/kWh", `${R.indic.trocas} troca(s) do banco`)}</div>
    <details><summary>Fontes dos preços de referência</summary><ul>${Object.values(S.precos).map(p => `<li>${esc(p.d)}: ${brl(n(p.pu))} — ${esc(p.f)}</li>`).join("")}</ul></details>`; },
  fim: () => `<p class="intro">Salve o projeto em JSON para editar depois e gere o relatório em PDF com memória de cálculo, esquema, lista de materiais e custos.</p>
    <div class="actions"><button class="btn primary" type="button" id="btnPdf" data-tip="Gera o relatório com memória de cálculo, unifilar, materiais e custos.">Gerar relatório PDF</button><button class="btn" type="button" id="btnSave2" data-tip="Baixa o projeto em JSON para reabrir e editar depois (Importar projeto).">Exportar JSON</button></div><div class="progress"><div id="pdfProg"></div></div><p class="note" id="pdfMsg">O PDF inclui: identificação, irradiação (pior caso), cargas, banco de baterias e vida útil, gerador FV, controlador, inversor, transferência, proteções, cabos, diagrama unifilar, materiais e custos.</p>
    ${avisos() || '<p class="note ok">Sem alertas de cálculo.</p>'}`
};

/* --------- eventos --------- */
document.addEventListener("click", e => {
  const b = e.target.closest("button, [data-step]"); if (!b) return;
  if (b.dataset.step != null) { cur = +b.dataset.step; render(); window.scrollTo({ top: 0 }); return; }
  if (b.dataset.nav) { cur = Math.max(0, Math.min(STEPS.length - 1, cur + +b.dataset.nav)); render(); window.scrollTo({ top: 0 }); return; }
  if (b.dataset.del != null) { S.cargas.splice(+b.dataset.del, 1); persist(); render(); return; }
  if (b.dataset.fdel != null) { S.telhado.faces.splice(+b.dataset.fdel, 1); persist(); render(); return; }
  if (b.dataset.udel != null) { S.analise.splice(+b.dataset.udel, 1); persist(); render(); return; }
  if (b.dataset.est != null) { aplicarEstacao(+b.dataset.est, S.local.fonte); render(); return; }
  switch (b.id) {
    case "addC": S.cargas.push({ nat: "res", nome: "Novo equipamento", tipo: "CA", q: 1, w: 100, h: 1, fs: 1, kp: 1, crit: 1 }); break;
    case "addU": (S.analise = S.analise || []).push({ id: "B" + (S.analise.length + 1), v: "", ri: "", cca: "", ccaNom: "", soh: "", soc: "" }); break;
    case "limpaU": S.analise = []; break;
    case "addF": S.telhado.faces.push({ nome: "Água " + (S.telhado.faces.length + 1), az: "L", inc: "30%", nmod: "" }); break;
    case "btnColarU": { const rows = ($("#colarU").value || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => l.split(/\t|;/).map(x => x.trim()));
      const lid = rows.map(c => { const num = c.map(x => x.replace(",", ".")); const hasId = isNaN(parseFloat(num[0])); const o = hasId ? num.slice(1) : num; return { id: hasId ? c[0] : "", v: n(o[0]) || "", ri: n(o[1]) || "", cca: n(o[2]) || "", ccaNom: n(o[3]) || "", soh: n(o[4]) || "", soc: n(o[5]) || "" }; }).filter(u => u.v || u.ri || u.cca);
      if (!lid.length) { toast("Nada reconhecido. Use: ID; V; mΩ; CCA; CCA nominal; SOH; SOC"); return; } S.analise = lid; toast(lid.length + " bateria(s) importada(s)."); break; }
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
  else if (t.dataset.c != null) { const l = S.cargas[+t.dataset.c]; l[t.dataset.f] = t.type === "checkbox" ? (t.checked ? 1 : 0) : t.type === "number" ? n(t.value) : t.value; if (t.dataset.f === "nat") l.kp = NAT[t.value]?.kp ?? 1; }
  else if (t.dataset.tf != null) { S.telhado.faces[+t.dataset.tf][t.dataset.tff] = t.type === "number" ? (t.value === "" ? "" : n(t.value)) : t.value; }
  else if (t.dataset.mes != null) { S.conta.meses[+t.dataset.mes] = t.value === "" ? "" : n(t.value); }
  else if (t.dataset.u != null) { const u = S.analise[+t.dataset.u]; u[t.dataset.uf] = t.type === "number" ? (t.value === "" ? "" : n(t.value)) : t.value; }
  else if (t.dataset.row != null) S.local.sel = +t.dataset.row;
  else if (t.dataset.pu) S.precos[t.dataset.pu].pu = n(t.value);
  else if (t.id === "fileOpen") { abrirJSON(t.files[0]); return; }
  else return;
  persist(); clearTimeout(deb); deb = setTimeout(render, 10);
});
function salvarJSON() {
  const o = Object.assign({}, S); delete o._estacoes;
  o.resultados = { modo: S.modo, entrada: R.entrada, mesDimensionamento: MESES[R.mesDim], consumoMensalWhDia: R.Emes, ccaNecessario: isFinite(R.ccaReq) ? R.ccaReq : null, ccaEsperado: R.ccaCat, itensAdequar: R.cmp ? R.cmp.filter(x => !x[3]).map(x => x[0]) : null, hsp: R.hsp, mesCritico: MESES[R.mesCrit], consumoWh: R.ECA + R.ECC, ebatWh: R.Ebat, pfvW: R.Pfv, modulos: R.Nmod, serie: R.Ns, strings: R.Nstr, bancoV: R.Vb, bancoAh: R.CinstAh, baterias: R.bN, dodDiario: R.dodDia, autonomiaDias: R.autReal, faltaHoras: R.faltaReal, recargaDias: isFinite(R.tRec) ? R.tRec : null, vidaAnos: R.vida, vidaCiclosAnos: R.vidaCic, vidaCalendarioAnos: R.vidaCal, picoA: R.Ipk, quedaV: R.Vsag, capacitorF: R.capNec ? R.capC : 0, estado: { soc: R.est.soc ?? null, soh: R.est.soh ?? null, soeWh: R.est.soe ?? null, sopW: R.est.sop ?? null, dvBalanceamentoV: R.est.dv ?? null, vidaRestanteAnos: isFinite(R.est.anosRest) ? R.est.anosRest : null }, controladores: R.nCtrl, inversor: R.Pinv, totalR$: R.custo.total, geradoEm: new Date().toISOString() };
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
      [S.modo === "existente" ? "Custo de adequação" : "Investimento estimado", brl(R.custo.total) + (S.modo === "existente" ? ` (${R.cmp.filter(x => !x[3]).length} item(ns) a adequar)` : ` (${fmt(R.indic.rsWp, 2)} R$/Wp)`)]], { size: 9 });
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
    if (R.tel) { h2("Telhado: águas e captação"); table([{ h: "Água", w: 2 }, { h: "Orientação", w: 1.2 }, { h: "Incl.", w: 0.7, a: "r" }, { h: "HSP mín.", w: 1, a: "r" }, { h: "HSP média", w: 0.9, a: "r" }, { h: "Captação inverno", w: 1.1, a: "r" }, { h: "Captação anual", w: 1, a: "r" }, { h: "Módulos", w: 0.8, a: "r" }],
      R.tel.faces.map((f, j) => [f.nome, `${dirNome(f.az)} (${fmt0(f.az)}°)`, fmt(f.inc, 1) + "°", `${fmt(f.min, 2)} (${MESES[f.mesMin]})`, fmt(f.media, 2), pct(f.efMin), pct(f.efMed), String(R.tel.sf[j] * R.Ns)]), { size: 7.5 });
      if (R.tel.faces.some(f => f.nArea != null)) table([{ h: "Água", w: 2 }, { h: "Área (m²)", w: 1.4, a: "r" }, { h: "Retrato", w: 0.8, a: "r" }, { h: "Paisagem", w: 0.8, a: "r" }, { h: "Máx.", w: 0.8, a: "r" }, { h: "Ocupação máx.", w: 1, a: "r" }, { h: "Usados", w: 0.8, a: "r" }],
        R.tel.faces.filter(f => f.nArea != null).map(f => { const j = R.tel.faces.indexOf(f); return [f.nome, `${fmt(f.area, 1)} (${fmt(f.L, 2)} x ${fmt(f.Wpl, 2)})`, String(f.nRet), String(f.nPai), `${f.nArea} (${f.orient})`, pct(f.nArea * f.amod / f.area), String(R.tel.sf[j] * R.Ns)]; }), { size: 7.5 });
      text("Cada água: integração horária no dia médio do mês (Collares-Pereira & Rabl, Erbs, Liu-Jordan), calibrada pela linha selecionada do SunData. Captação = irradiação da água / irradiação na inclinação ótima.", { size: 7.5, color: MUT }); }
    text(`HSP de projeto = ${fmt(R.hsp, 2)} kWh/m²·dia (${MESES[R.mesCrit]}). Temperaturas de projeto: mínima ${S.temp.tmin} °C (Voc) e máxima ${S.temp.tmax} °C (Vmp).`, { font: FB });
    P_(35);
    /* cargas */
    h1("2. Cargas e consumo");
    if (R.entrada === "lista") table([{ h: "Equipamento", w: 3.4 }, { h: "Tipo", w: 1.6 }, { h: "CA/CC", w: 0.7 }, { h: "Qtd", w: 0.5, a: "r" }, { h: "W", w: 0.8, a: "r" }, { h: "h/dia", w: 0.7, a: "r" }, { h: "Simult.", w: 0.7, a: "r" }, { h: "Ip/In", w: 0.6, a: "r" }, { h: "Crít.", w: 0.5 }, { h: "Wh/dia", w: 0.9, a: "r" }],
      [...R.cargas.map(l => [l.nome, NAT[l.nat]?.t || "-", l.tipo, String(l.q), fmt0(n(l.w)), fmt(n(l.h), 1), fmt(n(l.fs), 1), fmt(l.kp, 1), critica(l) ? "sim" : "-", fmt0(l.e)]), ["Total", "", "", "", "", "", "", "", "", fmt0(R.ECA + R.ECC)]], { bold: [R.cargas.length], size: 7.5 });
    else { text(`Entrada pela conta de energia: maior gasto ${fmt0(Math.max(...R.kwhMes))} kWh em ${MESES[R.mesPiorConta]}; variação anual ${S.conta.amp}% (meses sem dado previstos); potência simultânea ${fmt0(R.Psim)} W${R.psimEst ? " (estimada)" : ""}; maior motor ${fmt0(n(S.conta.pmotor))} W, Ip/In ${S.conta.kp}.`); }
    if (R.row) table([{ h: "", w: 1.6 }, ...MESES.map(m => ({ h: m, w: 0.7, a: "r" }))], [["kWh/dia", ...R.Emes.map(v => fmt(v / 1000, 1))], ["HSP", ...R.row.m.map(v => fmt(v, 2))], ["consumo/HSP", ...R.Emes.map((v, i) => fmt(v / 1000 / R.row.m[i], 2))]], { size: 7 });
    text(`Mês de dimensionamento (maior consumo/irradiação): ${MESES[R.mesDim]}. Mês de menor irradiação: ${MESES[R.mesCrit]}.`, { font: FB, size: 8.5 });
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
    h2("3.3 CCA necessário e esperado");
    mono(`R_banco,max = (${fmt(R.Vref, 2)} - ${fmt(R.vCorte, 2)} - ${fmt(R.marg, 2)}) / ${fmt0(R.Ipk)} = ${fmt(R.RbReq * 1000, 2)} mOhm ; R_i,max por bateria = ${fmt(R.riReq * 1000, 2)} mOhm
CCA necessário = 5,4/(k_frio x R_12V) = ${isFinite(R.ccaReq) ? fmt0(R.ccaReq) : "inf."} A ; CCA esperado (Ri catálogo) = ${fmt0(R.ccaCat)} A ; nominal ${n(S.eq.bat.cca) ? fmt0(n(S.eq.bat.cca)) + " A" : "não informado"}`);
    h2("3.3.1 BMS e balanceamento");
    R.bms.forEach(([st, t, x]) => text(`${t}: ${x}`, { color: st === "bad" ? RED : st === "warn" ? WARN : INK, size: 8.5 }));
    if (R.est.tem) {
      const o = R.est; h2("3.4 Estado da bateria (medições)");
      table([{ h: "Indicador", w: 2.2 }, { h: "Valor", w: 1.6, a: "r" }, { h: "Base", w: 4 }], [
        o.soc != null ? ["SOC / DoD", `${pct(o.soc)} / ${pct(o.dod)}`, `OCV ${fmt(o.vcel, 3)} V/célula`] : null,
        o.soh != null ? ["SOH", pct(o.soh), "pior indicador: " + o.sohFonte] : null,
        o.soe != null ? ["SoE / utilizável", `${fmt(o.soe / 1000, 1)} / ${fmt(o.util / 1000, 1)} kWh`, `${fmt0(o.autH)} h de consumo até o DoD de projeto`] : null,
        o.sop != null ? ["SoP", fmt(o.sop / 1000, 1) + " kW", `limitado por ${o.sopLim}; surto exigido ${fmt(R.surto / 1000, 1)} kW`] : null,
        o.dv != null ? ["SoB (dV)", fmt(o.dv * 1000, 0) + " mV", `${o.balOk ? "equilibrado" : "desbalanceado"}; limite ${fmt(o.dvLim * 1000, 0)} mV`] : null,
        o.ccaRi ? ["CCA pela Ri", fmt0(o.ccaRi) + " A", `necessário ${isFinite(R.ccaReq) ? fmt0(R.ccaReq) : "-"} A`] : null,
        o.riTeste ? ["Teste de carga", `${fmt(o.riTeste * 1000, 2)} mOhm`, `CCA equivalente ${fmt0(o.ccaTeste)} A`] : null,
        ["Vida restante", isFinite(o.anosRest) ? fmt(o.anosRest, 1) + " anos" : "-", o.anosTend != null ? `projeto ${fmt(o.anosProj, 1)}; tendência do SOH ${fmt(o.anosTend, 1)}` : "pelo projeto"]].filter(Boolean), { size: 8 });
      if (o.units) table([{ h: "ID", w: 0.8 }, { h: "V", w: 0.8, a: "r" }, { h: "Ri mOhm", w: 0.9, a: "r" }, { h: "CCA", w: 0.8, a: "r" }, { h: "CCA nom.", w: 0.8, a: "r" }, { h: "CCA pela Ri", w: 1, a: "r" }, { h: "SOH", w: 0.7, a: "r" }, { h: "Resultado", w: 3 }],
        o.units.map(u => [u.id, fmt(u.v, 2), fmt(u.ri, 2), fmt0(u.cca), fmt0(u.nom), fmt0(u.ccaRi), u.soh != null ? pct(u.soh) : "-", u.fl.join("; ") || "ok"]), { size: 7.5 });
    }
    text(R.T.obs, { color: MUT });
    P_(50);
    /* FV */
    h1("4. Gerador fotovoltaico e controlador");
    mono(`E_FV = E_bat(${MESES[R.mesDim]}) / eta_bat = ${fmt0(R.EbatDim)} / ${R.T.eta} = ${fmt0(R.Efv)} Wh/dia${R.Erec ? ` (+ recuperação ${fmt0(R.Erec)})` : ""}
P_FV = E_FV / (HSP_${MESES[R.mesDim]} x PR) = ${fmt0(R.Efv + R.Erec)} / (${fmt(R.hspDim, 2)} x ${S.crit.pr}) = ${fmt0(R.Pnec)} W  ->  ${R.Nnec} módulos de ${S.eq.mod.p} W
Voc,max = ${S.eq.mod.voc} x [1 + (${S.eq.mod.bvoc}/100) x (${S.temp.tmin} - 25)] = ${fmt(R.vocMax, 2)} V  ->  Ns <= ${S.eq.ctrl.vocmax}/${fmt(R.vocMax, 2)} = ${R.NsMax}
Vmp,quente = ${S.eq.mod.vmp} x [1 + (${S.eq.mod.bvoc}/100) x (${S.temp.tmax} + 30 - 25)] = ${fmt(R.vmpQ, 2)} V  ->  Ns >= (${fmt(R.vChg, 1)} + 5)/${fmt(R.vmpQ, 2)} = ${R.NsMin}
Adotado: ${R.Ns} em série x ${R.Nstr} strings = ${R.Nmod} módulos${R.tel ? " (" + R.tel.faces.map((f, j) => `${f.nome}: ${R.tel.sf[j]}x${R.Ns}`).join("; ") + ")" : ""} = ${fmt(R.Pfv / 1000, 2)} kWp ; Voc,max arranjo = ${fmt0(R.vocArr)} V
Controladores: ${R.nCtrl} x ${S.eq.ctrl.imax} A (${R.strCtrl} string(s) cada, ${fmt(R.iCtrl)} A)`);
    barras(R.prodMes.map(v => v / 1000), { dest: R.mesCrit, alvo: R.Efv / 1000, alvoTxt: "necessidade " + fmt(R.Efv / 1000, 2) + " kWh/dia", un: "Produção estimada (kWh/dia)", cor: rgb(0.6, 0.35, 0) });
    h2("5. Inversor e transferência");
    mono(`P_inv >= 1,25 x ${fmt0(R.Psim)} = ${fmt0(R.PinvNec)} W  ->  ${R.invN} x ${fmt0(n(S.eq.inv.p))} W ; surto ${fmt0(R.surto)} W <= ${fmt0(R.surtoInv)} W
I_cc = ${fmt0(R.Pinv)} / (${S.eq.inv.eta} x ${fmt(R.Vb * R.T.vMin, 1)}) = ${fmt0(R.iDcInv)} A ; I_ca = ${fmt(R.iAc)} A
${S.backup.tipo === "nenhum" ? "Sem fonte reserva." : `Fonte reserva: ${S.backup.tipo} >= ${fmt(R.sGerRec / 1000, 1)} kVA ; chave ${S.backup.chave === "auto" ? "automática (ATS)" : "manual 1-0-2"} ${R.inChave} A ${R.polos}P com intertravamento`}`);
    P_(60);
    h1("6. Proteções, barramentos e cabos");
    table([{ h: "Trecho", w: 1.6 }, { h: "Dispositivo", w: 2.2 }, { h: "Especificação", w: 1.8 }, { h: "Critério", w: 3 }], R.prot.map(p => p.map(String)), { size: 7.5 });
    table([{ h: "Trecho", w: 2.8 }, { h: "I (A)", w: 0.7, a: "r" }, { h: "L (m)", w: 0.6, a: "r" }, { h: "V", w: 0.6, a: "r" }, { h: "Seção", w: 1.1, a: "r" }, { h: "Iz", w: 0.6, a: "r" }, { h: "dV", w: 0.7, a: "r" }, { h: "PE", w: 0.7, a: "r" }],
      R.cabos.map(x => [x.t, fmt(x.I, 1), fmt(x.L, 1), fmt0(x.V), x.c.s + " mm²" + (x.c.req != null && !x.c.ok ? ` (precisa ${x.c.req})` : ""), String(x.c.iz ?? "-"), fmt(x.c.dv, 2) + "%", x.pe + " mm²"]), { size: 7.5 });
    table([{ h: "Barramento", w: 2.6 }, { h: "I (A)", w: 0.8, a: "r" }, { h: "Barra de cobre", w: 1.6 }, { h: "mm²", w: 0.7, a: "r" }, { h: "Iz DIN 43671", w: 1, a: "r" }], R.barras.map(x => [x.t, x.I ? fmt0(x.I) : "-", x.txt, fmt0(x.sec), fmt0(x.iz)]), { size: 7.5 });
    { const A = altTensoes(); if (A.length) { h2("Montagem em outras tensões de banco"); table([{ h: "Banco", w: 0.7 }, { h: "Baterias", w: 0.9, a: "r" }, { h: "I inv. CC", w: 0.9, a: "r" }, { h: "Cabo banco", w: 0.9, a: "r" }, { h: "Fusível", w: 0.8, a: "r" }, { h: "Barramento", w: 1.1 }, { h: "Controladores", w: 0.9, a: "r" }, { h: "Total", w: 1.2, a: "r" }],
      A.map(x => [x.v + " V" + (x.inv12 ? " (*)" : ""), `${x.r.bNs}S x ${x.r.bNp}P`, fmt0(x.r.iDcInv) + " A", x.r.cBat.s + " mm²", x.r.inFusBat + " A", x.r.bCC.txt, x.r.nCtrl + "x", brl(x.r.custo.total)]), { size: 7.5 }); if (A.some(x => x.inv12)) text("(*) inversor de 12 V acima de 3 kW é raro no mercado.", { size: 7, color: MUT }); } }
    text("Seguranças: fusível no positivo junto ao banco; seccionadoras CC; DPS CC e CA no mesmo BEP; barramentos isolados; abrigo ventilado e sinalizado; DR 30 mA; intertravamento entre fontes; equipotencialização de estruturas e racks.", { color: MUT });
    if (R.avisos.length) { h2("Alertas"); R.avisos.forEach(a => text("• " + a, { color: WARN })); }
    P_(75);
    if (S.modo === "existente" && R.cmp) { h1("Análise do sistema existente"); table([{ h: "Item", w: 2 }, { h: "Necessário", w: 2 }, { h: "Existente", w: 2 }, { h: "Situação", w: 0.9 }, { h: "Observação", w: 3 }], R.cmp.map(x => [x[0], x[1], x[2], x[3] ? "atende" : "ADEQUAR", x[4]]), { size: 7.5 }); }
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
    h1(S.modo === "existente" ? "8. Adequação: materiais e custos" : "8. Lista de materiais e custos");
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
