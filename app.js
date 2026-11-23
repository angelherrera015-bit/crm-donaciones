import {auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, collection, addDoc, updateDoc, deleteDoc, doc, setDoc, writeBatch, onSnapshot, serverTimestamp, arrayUnion} from "./firebase.js";
import {parseDon, lineas, cant, fechaLarga, xlsxConfirmadas as xlsx} from "./reportes.js";
import * as Cal from "./calendario.js";


const col = collection(db,"donaciones"), pcol = collection(db,"proyectos"), ecol = collection(db,"equipo");
const ADMINS = {"cnoguera@muniguate.com":{nombre:"Cecia Noguera",color:"#7b3fa0"},"acu@muniguate.com":{nombre:"Angel Herrera",color:"#0f5c63"},"jraijall@muniguate.com":{nombre:"Alejandro Meneses",color:"#c2410c"}};

const ST = ["Prospecto","Contactado","Oficio enviado","En seguimiento","Confirmado","Recibido","Rechazado"];
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today = () => new Date(Date.now() - new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
let data = [], unsub = null, unsub2 = null, projs = [], pv = "todos", unsub3 = null, equipo = {}, me = "", isAdmin = false, uv = "todos", soloMios = true, agenda = [], unsub4 = null, cur = null, view = "tablero";

$("#f_etapa").innerHTML = ST.map(s => `<option>${s}</option>`).join("");

$("#lf").onsubmit = async e => {
  e.preventDefault(); $("#err").textContent = "";
  try { await signInWithEmailAndPassword(auth, $("#em").value.trim(), $("#pw").value); }
  catch { $("#err").textContent = "Correo o contraseña incorrectos."; }
};
$("#out").onclick = () => signOut(auth);

onAuthStateChanged(auth, u => {
  $("#login").hidden = !!u; $("#app").hidden = !u;
  if (unsub) { unsub(); unsub = null; }
  if (unsub2) { unsub2(); unsub2 = null; }
  if (unsub3) { unsub3(); unsub3 = null; }
  if (unsub4) { unsub4(); unsub4 = null; }
  if (u) {
    $("#who").textContent = u.email;
    me = u.email.toLowerCase(); isAdmin = !!ADMINS[me]; uv = canon(me); $("#eq").hidden = !isAdmin;
    unsub4 = onSnapshot(collection(db,"agenda"), s => { agenda = s.docs.map(d => ({id:d.id, ...d.data()})); if (view === "calendario") render(); }, () => {});
    unsub3 = onSnapshot(ecol, s => { equipo = {}; s.docs.forEach(d => equipo[d.id] = d.data()); render(); }, () => {});
    unsub2 = onSnapshot(pcol, s => {
      projs = s.docs.map(d => ({id:d.id, ...d.data()})).sort((a,b) => a.nombre.localeCompare(b.nombre));
      if (!["todos","sin"].includes(pv) && !projs.find(p => p.id === pv)) pv = "todos";
      render();
    }, e => alert("No se pudieron leer los proyectos: " + e.message));
    unsub = onSnapshot(col, s => { data = s.docs.map(d => ({id:d.id, ...d.data()})); render(); },
      e => alert("No se pudo leer la base de datos: " + e.message));
  } else { data = []; projs = []; equipo = {}; agenda = []; $("#pw").value = ""; }
});

const card = d => {
  const late = d.seguimiento && d.seguimiento < today() && !["Recibido","Rechazado"].includes(d.etapa);
  return `<div class="card" draggable="${canEdit(d)}" data-id="${d.id}" style="--c:${person(d.responsable).color}"><span class="chip">${esc(person(d.responsable).nombre)}</span><b>${esc(d.empresa)}</b>
  ${d.donacion ? `<p>${esc(d.donacion)}</p>` : ""}
  ${d.direccion ? `<p class="dir"><strong>Dirección:</strong> ${esc(d.direccion)}</p>` : ""}
  ${d.monto ? `<small>Q${Number(d.monto).toLocaleString("es-GT")}</small>` : ""}
  ${d.seguimiento ? `<small class="${late ? "late" : ""}">Seguimiento: ${d.seguimiento}</small>` : ""}${d.logo ? `<small>Logo solicitado ✓</small>` : ""}${nom1(lleva(d)) ? `<small>Contacto: ${esc(nom1(lleva(d)))}</small>` : ""}</div>`;
};

const lc = x => (x || "").toLowerCase();
const PERFIL = "acu@muniguate.com", GRUPO = {"cnoguera@muniguate.com":PERFIL,"jraijall@muniguate.com":PERFIL};
const canon = e => { const k = lc(e); return GRUPO[k] || k; };
const lleva = d => lc(d.lleva) || (GRUPO[lc(d.responsable)] ? lc(d.responsable) : "");
const esGrupo = () => canon(me) === PERFIL;
const nom1 = k => (ADMINS[k] ? ADMINS[k].nombre.split(" ")[0] : "");
const team = () => {
  const m = {}; Object.entries(ADMINS).filter(([k]) => !GRUPO[k]).forEach(([k,v]) => m[k] = {...v});
  if (m[PERFIL]) m[PERFIL].nombre = "Fortalecimiento de Programas";
  Object.entries(equipo).filter(([k]) => !GRUPO[k]).forEach(([k,v]) => m[k] = {...(m[k] || {}), ...v});
  data.forEach(d => { const k = canon(d.responsable); if (k && !m[k]) m[k] = {nombre:k.split("@")[0], color:"#64748b"}; });
  if (me && !m[canon(me)]) m[canon(me)] = {nombre:me.split("@")[0], color:"#64748b"};
  return m;
};
const person = e => team()[canon(e)] || {nombre:"Sin responsable", color:"#94a3b8"};
const canEdit = d => isAdmin || lc(d.responsable) === me;
const inU = d => uv === "todos" || (uv === "sin" ? !d.responsable : canon(d.responsable) === uv);
function utabsHtml() {
  const t = team(), n = k => data.filter(d => canon(d.responsable) === k).length;
  const ks = Object.keys(t).sort((a,b) => (a === canon(me) ? -1 : b === canon(me) ? 1 : t[a].nombre.localeCompare(t[b].nombre)));
  return `<button data-u="todos" class="${uv === "todos" ? "on" : ""}">Todos (${data.length})</button>`
    + ks.map(k => `<button data-u="${esc(k)}" style="--c:${t[k].color}" class="${uv === k ? "on" : ""}">${esc(t[k].nombre)} (${n(k)})</button>`).join("")
    + (data.some(d => !d.responsable) ? `<button data-u="sin" class="${uv === "sin" ? "on" : ""}">Sin responsable</button>` : "");
}
$("#utabs").onclick = e => { const b = e.target.closest("button"); if (b) { uv = b.dataset.u; render(); } };
const noP = d => !d.proyecto || !projs.find(p => p.id === d.proyecto);
const inP = d => pv === "todos" || (pv === "sin" ? noP(d) : d.proyecto === pv);
const pname = id => projs.find(p => p.id === id)?.nombre || "Sin proyecto";
function tabsHtml() {
  const t = [["todos","Todos"], ...projs.map(p => [p.id,p.nombre]), ...(data.some(noP) ? [["sin","Sin proyecto"]] : [])];
  return t.map(([k,n]) => `<button data-p="${k}" class="${pv === k ? "on" : ""}">${esc(n)}</button>`).join("")
    + (isAdmin ? `<button class="add" id="np">+ Proyecto</button>` + (projs.find(p => p.id === pv) ? `<button class="add" id="rp">Renombrar</button>` : "") : "");
}
$("#ptabs").onclick = async e => {
  const b = e.target.closest("button"); if (!b) return;
  try {
    if (b.dataset.p) { pv = b.dataset.p; render(); }
    else if (b.id === "np") {
      const n = prompt("Nombre del nuevo proyecto (ej. Cena Navideña)");
      if (n && n.trim()) { const ref = await addDoc(pcol, {nombre:n.trim(), creado:serverTimestamp()}); pv = ref.id; render(); }
    } else if (b.id === "rp") {
      const n = prompt("Nuevo nombre del proyecto", pname(pv));
      if (n && n.trim()) await updateDoc(doc(db,"proyectos",pv), {nombre:n.trim()});
    }
  } catch (x) { alert("No se pudo guardar el proyecto: " + x.message); }
};
const SC = {"Prospecto":"#94a3b8","Contactado":"#38bdf8","Oficio enviado":"#6366f1","En seguimiento":"#f59e0b","Confirmado":"#22c55e","Recibido":"#15803d","Rechazado":"#dc2626"};
function donut(items, centro, sub) {
  const tot = items.reduce((a,i) => a + i.n, 0), R = 52, C = 2 * Math.PI * R; let off = 0;
  const arcs = tot ? items.filter(i => i.n).map(i => { const l = C * i.n / tot; const a = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${i.c}" stroke-width="22" stroke-dasharray="${l} ${C - l}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`; off += l; return a; }).join("")
    : `<circle r="${R}" cx="70" cy="70" fill="none" stroke="#e5ecec" stroke-width="22"/>`;
  return `<div class="donut"><svg viewBox="0 0 140 140" width="160" height="160" role="img" aria-label="Gráfico circular">${arcs}<text x="70" y="75" text-anchor="middle" font-size="26" font-weight="700" fill="#16292b">${centro}</text><text x="70" y="91" text-anchor="middle" font-size="10" fill="#5d7274">${sub}</text></svg>
  <div class="legend">${items.map(i => `<div><i style="background:${i.c}"></i>${esc(i.t)}<em>${i.n} · ${tot ? Math.round(i.n * 100 / tot) : 0}%</em></div>`).join("")}</div></div>`;
}
function statsHtml() {
  const S = data.filter(inP).filter(inU), N = S.length, t = today();
  const w = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4 + 7 * 864e5).toISOString().slice(0,10);
  const ok = S.filter(d => ["Confirmado","Recibido"].includes(d.etapa)), no = S.filter(d => d.etapa === "Rechazado");
  const A = S.filter(d => !["Confirmado","Recibido","Rechazado"].includes(d.etapa)), act = S.filter(d => !["Recibido","Rechazado"].includes(d.etapa));
  const pc = n => N ? Math.round(n * 100 / N) : 0, dec = ok.length + no.length;
  const venc = act.filter(d => d.seguimiento && d.seguimiento < t).length, hoy = act.filter(d => d.seguimiento === t).length;
  const prox = act.filter(d => d.seguimiento > t && d.seguimiento <= w).length, sin = act.filter(d => !d.seguimiento).length;
  const kp = (n, l, c, go) => `<div class="kpi" style="--c:${c}"${go ? ` data-go="${go}" role="button" tabindex="0"` : ""}><b>${n}</b><span>${l}</span></div>`;
  const etiqueta = (pv === "todos" ? "Todos los proyectos" : pv === "sin" ? "Sin proyecto" : pname(pv)) + " · " + (uv === "todos" ? "Todos los encargados" : uv === "sin" ? "Sin responsable" : person(uv).nombre);
  const T = team(), ppl = Object.keys(T).map(k => ({k, d:S.filter(x => canon(x.responsable) === k)})).filter(x => x.d.length).sort((a,b) => b.d.length - a.d.length);
  const hb = ppl.map(({k,d}) => { const o = d.filter(x => ["Confirmado","Recibido"].includes(x.etapa)).length, n = d.filter(x => x.etapa === "Rechazado").length, p = d.length - o - n, f = v => (v * 100 / d.length).toFixed(1);
    return `<div class="hb"><span style="color:${T[k].color}">●</span> <b>${esc(T[k].nombre)}</b> · ${d.length} empresas<div class="stk"><span style="width:${f(o)}%;background:#22c55e"></span><span style="width:${f(p)}%;background:#f59e0b"></span><span style="width:${f(n)}%;background:#dc2626"></span></div><span style="color:var(--mut)">${o} confirman · ${p} en proceso · ${n} dijeron que no</span></div>`; }).join("");
  const ord = {"Recibido":0,"Confirmado":1}, last = d => (d.notas && d.notas.length) ? d.notas[d.notas.length - 1].t : "";
  const okL = ok.slice().sort((a,b) => ord[a.etapa] - ord[b.etapa] || (a.empresa || "").localeCompare(b.empresa || ""));
  const noL = no.slice().sort((a,b) => (a.empresa || "").localeCompare(b.empresa || ""));
  const rowOk = d => { const pe = person(d.responsable); return `<div class="li" data-id="${d.id}" style="--c:${pe.color}"><b>${esc(d.empresa)}</b><div><span class="tag" style="background:${SC[d.etapa]}">${d.etapa}</span><small style="color:${pe.color}"><b style="display:inline">${esc(pe.nombre)}</b></small>${d.monto ? ` <small>· Q${Number(d.monto).toLocaleString("es-GT")}</small>` : ""}${d.seguimiento ? ` <small>· ${d.seguimiento}</small>` : ""}</div><p>${esc(d.donacion) || "<em>Sin detalle de la donación</em>"}</p></div>`; };
  const rowNo = d => { const pe = person(d.responsable); return `<div class="li" data-id="${d.id}" style="--c:${pe.color}"><b>${esc(d.empresa)}</b><div><span class="tag" style="background:${pe.color}">${esc(pe.nombre)}</span></div><p class="cl">${esc(last(d)) || "<em>Sin comentarios</em>"}</p></div>`; };
  const listaOk = `<div class="lp" id="lst-ok" style="border-top:5px solid #22c55e"><h2>Donan o confirman (${okL.length})<button class="sec" data-x="rep">Reporte</button><button class="sec" data-x="ok">Excel</button></h2><div class="lbody">${okL.map(rowOk).join("") || '<div class="empty">Ninguna todavía.</div>'}</div></div>`;
  const listaNo = `<div class="lp" id="lst-no" style="border-top:5px solid #dc2626"><h2>Dijeron que no (${noL.length})<button class="sec" data-x="no">Excel</button></h2><div class="lbody">${noL.map(rowNo).join("") || '<div class="empty">Ninguna.</div>'}</div></div>`;
  return `<div class="swrap"><div class="stats"><p class="note">Mostrando: <b>${esc(etiqueta)}</b>. Cambia el proyecto o el encargado con las pestañas de arriba.</p>
  <div class="kpis">${kp(N,"Empresas en total","#0f5c63")}${kp(ok.length + " (" + pc(ok.length) + "%)","Donan o confirman","#22c55e","lst-ok")}${kp(no.length + " (" + pc(no.length) + "%)","Dijeron que no","#dc2626","lst-no")}${kp(A.length + " (" + pc(A.length) + "%)","En proceso","#f59e0b")}${kp(dec ? Math.round(ok.length * 100 / dec) + "%" : "–","Aceptación entre las que ya respondieron","#6366f1")}${kp(ok.filter(d => d.logo).length + " de " + ok.length,"Logotipos solicitados (confirmadas)","#0f5c63")}</div>
  <div class="panels">
    <div class="panel"><h2>Empresas por etapa</h2>${donut(ST.map(s => ({t:s, n:S.filter(d => d.etapa === s).length, c:SC[s]})), N, "empresas")}</div>
    <div class="panel"><h2>Resultado general</h2>${donut([{t:"Donan o confirman", n:ok.length, c:"#22c55e"},{t:"En proceso", n:A.length, c:"#f59e0b"},{t:"Dijeron que no", n:no.length, c:"#dc2626"}], pc(ok.length) + "%", "confirman")}</div>
    <div class="panel"><h2>Seguimientos pendientes</h2><div class="fu"><span>Vencidos</span><b class="${venc ? "late" : ""}">${venc}</b></div><div class="fu"><span>Para hoy</span><b>${hoy}</b></div><div class="fu"><span>Próximos 7 días</span><b>${prox}</b></div><div class="fu"><span>Activas sin fecha de seguimiento</span><b>${sin}</b></div></div>
    <div class="panel"><h2>Por encargado</h2>${hb || '<div class="empty">Sin datos.</div>'}</div>
  </div></div><div class="lists">${listaOk}${listaNo}</div></div>`;
}
function exportLista(k) {
  if (k === "rep") { reporte(); return; }
  const S = data.filter(inP).filter(inU);
  const L = k === "ok" ? S.filter(d => ["Confirmado","Recibido"].includes(d.etapa)) : S.filter(d => d.etapa === "Rechazado");
  const h = k === "ok" ? ["Proyecto","Encargado","Empresa","Etapa","Donación","Cantidad","Valor (Q)","Próximo seguimiento","Logo solicitado","Dirección confirmada"] : ["Proyecto","Encargado","Empresa","Último comentario","Todos los comentarios"];
  const rows = L.map(d => k === "ok" ? [pname(d.proyecto),person(d.responsable).nombre,d.empresa,d.etapa,d.donacion,cant(d),d.monto,d.seguimiento,d.logo ? "Sí" : "No",d.direccion] : [pname(d.proyecto),person(d.responsable).nombre,d.empresa,(d.notas || []).slice(-1).map(x => x.t).join(""),(d.notas || []).map(x => x.t).join(" | ")]);
  const csv = [h,...rows].map(a => a.map(c => `"${String(c ?? "").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], {type:"text/csv;charset=utf-8"}));
  a.download = (k === "ok" ? "donan-o-confirman-" : "dijeron-que-no-") + today() + ".csv"; a.click();
}
// ==REPORTE==
const itRow = (d = "", c = "") => `<div class="it" style="display:grid;grid-template-columns:1fr 100px 40px;gap:6px;margin-bottom:6px"><input class="it-d" placeholder="Descripción (ej. Snacks varios)" value="${esc(d)}"><input class="it-c" type="number" min="0" step="any" placeholder="Cantidad" value="${esc(c)}"><button type="button" class="del it-x" aria-label="Quitar producto" style="padding:6px">✕</button></div>`;
function reporte() {
  const S = data.filter(inP).filter(inU).filter(d => ["Confirmado","Recibido"].includes(d.etapa));
  if (!S.length) { alert("No hay donaciones confirmadas o recibidas con los filtros actuales."); return; }
  const titulo = prompt("Título del reporte", "Reporte de Donaciones Confirmadas" + (projs.find(p => p.id === pv) ? " " + pname(pv) : ""));
  if (!titulo) return;
  const eo = {"Confirmado":0,"Recibido":1};
  S.sort((a,b) => person(a.responsable).nombre.localeCompare(person(b.responsable).nombre) || eo[a.etapa] - eo[b.etapa] || (a.empresa || "").localeCompare(b.empresa || ""));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(xlsx(titulo, fechaLarga(), S.map(d => ({e:person(d.responsable).nombre, em:d.empresa || "", et:d.etapa, l:lineas(d)}))));
  a.download = "Reporte-donaciones-" + today() + ".xlsx"; a.click();
}
$("#it_add").onclick = () => $("#f_items").insertAdjacentHTML("beforeend", itRow());
$("#it_sep").onclick = () => { const q = parseDon($("#f_donacion").value); $("#f_items").innerHTML = itRow(q.d, q.c ?? ""); };
$("#f_items").onclick = e => { const b = e.target.closest(".it-x"); if (b) b.closest(".it").remove(); };
// ==FIN-REPORTE==
function render() {
  if ($("#dlg2").open) drawEq();
  $("#ptabs").innerHTML = tabsHtml(); $("#ptabs").hidden = view === "calendario";
  $("#utabs").innerHTML = utabsHtml();
  const q = $("#q").value.toLowerCase();
  const L = data.filter(inP).filter(inU).filter(d => [d.empresa,d.contacto,d.donacion,d.direccion].join(" ").toLowerCase().includes(q));
  if (view === "tablero") {
    $("#main").innerHTML = `<div class="board">` + ST.map(s => {
      const c = L.filter(d => d.etapa === s);
      return `<div class="col" data-s="${s}"><h3>${s}<span>${c.length}</span></h3>${c.map(card).join("")}</div>`;
    }).join("") + `</div>`;
  } else if (view === "recordatorios") {
    const t = today(), open = L.filter(d => d.seguimiento && !["Recibido","Rechazado"].includes(d.etapa)).filter(d => !(esGrupo() && soloMios) || lleva(d) === me || (!lleva(d) && canon(d.responsable) === canon(me))).sort((a,b) => a.seguimiento.localeCompare(b.seguimiento));
    const chk = esGrupo() ? `<label style="display:flex;align-items:center;gap:8px;padding:0 0 10px"><input type="checkbox" id="mine" ${soloMios ? "checked" : ""} style="width:auto"> Solo los seguimientos que yo llevo</label>` : "";
    const grp = (title, arr) => `<h2>${title} (${arr.length})</h2>` + (arr.length ? arr.map(d =>
      `<div class="row" data-id="${d.id}"><div><b>${esc(d.empresa)}</b> <span style="color:${person(d.responsable).color}">● ${esc(person(d.responsable).nombre)}</span><br><span>${esc(d.donacion)} · ${esc(d.contacto)} ${esc(d.telefono)}</span></div><span class="${d.seguimiento < t ? "late" : ""}">${d.seguimiento}</span></div>`).join("") : `<div class="empty">Sin pendientes.</div>`);
    $("#main").innerHTML = `<div class="list">${chk}${grp("Vencidos", open.filter(d => d.seguimiento < t))}${grp("Hoy", open.filter(d => d.seguimiento === t))}${grp("Próximos", open.filter(d => d.seguimiento > t))}</div>`;
  } else if (view === "estadistica") { $("#main").innerHTML = statsHtml(); }
  else { $("#main").innerHTML = Cal.html(); }
}

const main = $("#main");
main.onchange = e => { if (e.target.id === "mine") { soloMios = e.target.checked; render(); } };
main.onclick = e => {
  if (view === "calendario" && Cal.click(e)) return;
  const x = e.target.closest("[data-x]"); if (x) { exportLista(x.dataset.x); return; }
  const g = e.target.closest("[data-go]"); if (g) { document.getElementById(g.dataset.go)?.scrollIntoView({behavior:"smooth", block:"start"}); return; }
  const el = e.target.closest("[data-id]"); if (el) openDlg(data.find(d => d.id === el.dataset.id));
};
main.ondragstart = e => { const c = e.target.closest(".card"); if (!c) return; const d = data.find(x => x.id === c.dataset.id); if (!d || !canEdit(d)) { e.preventDefault(); return; } e.dataTransfer.setData("text/plain", c.dataset.id); };
main.ondragover = e => { const c = e.target.closest(".col"); if (c) { e.preventDefault(); document.querySelectorAll(".col.over").forEach(x => x.classList.remove("over")); c.classList.add("over"); } };
main.ondrop = async e => {
  const c = e.target.closest(".col"); if (!c) return; e.preventDefault();
  const id = e.dataTransfer.getData("text/plain");
  try { await updateDoc(doc(db,"donaciones",id), {etapa: c.dataset.s}); } catch (x) { alert("No se pudo mover: " + x.message); }
};
main.ondragend = () => document.querySelectorAll(".col.over").forEach(x => x.classList.remove("over"));

const tab = v => { view = v; [["t1","tablero"],["t2","recordatorios"],["t3","estadistica"],["t4","calendario"]].forEach(([id,k]) => $("#" + id).classList.toggle("on", v === k)); render(); };
$("#t1").onclick = () => tab("tablero"); $("#t2").onclick = () => tab("recordatorios"); $("#t3").onclick = () => tab("estadistica"); $("#t4").onclick = () => tab("calendario");
$("#q").oninput = render;
$("#new").onclick = () => openDlg(null);

const F = ["empresa","contacto","tel","correo","donacion","monto","etapa","seg"];
function openDlg(d) {
  cur = d;
  const T = team();
  $("#f_resp").innerHTML = `<option value="">Sin responsable</option>` + Object.keys(T).map(k => `<option value="${esc(k)}">${esc(T[k].nombre)}</option>`).join("");
  $("#f_resp").value = d ? canon(d.responsable) : (T[uv] ? uv : canon(me));
  $("#rwrap").hidden = !isAdmin;
  $("#f_lleva").innerHTML = `<option value="">Todo el grupo</option>` + [PERFIL, ...Object.keys(GRUPO)].map(k => `<option value="${k}">${esc(ADMINS[k].nombre)}</option>`).join("");
  $("#f_lleva").value = d ? lleva(d) : "";
  $("#f_proyecto").innerHTML = `<option value="">Sin proyecto</option>` + projs.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join("");
  $("#f_proyecto").value = d ? (d.proyecto || "") : (projs.find(p => p.id === pv) ? pv : "");
  $("#dt").textContent = d ? d.empresa : "Nueva donación";
  const m = {empresa:d?.empresa, contacto:d?.contacto, tel:d?.telefono, correo:d?.correo, donacion:d?.donacion, monto:d?.monto, etapa:d?.etapa || ST[0], seg:d?.seguimiento};
  F.forEach(k => $("#f_" + k).value = m[k] ?? "");
  $("#f_nota").value = "";
  $("#f_logo").checked = !!d?.logo;
  $("#f_dir").value = d?.direccion ?? "";
  $("#f_items").innerHTML = (d?.items || []).map(x => itRow(x.d, x.c)).join("");
  const n = d?.notas || [];
  $("#notes").hidden = !n.length;
  $("#notes").innerHTML = n.slice().reverse().map(x => `<div>${esc(x.t)}<br><em>${esc(x.u)} · ${new Date(x.d).toLocaleDateString("es-GT")}</em></div>`).join("");
  const ro = !!d && !canEdit(d);
  document.querySelectorAll("#dlg input, #dlg select, #dlg textarea").forEach(x => x.disabled = ro);
  $("#save").hidden = ro; $("#del").hidden = !d || ro;
  $("#dlg").showModal();
}
$("#cancel").onclick = () => $("#dlg").close();

$("#save").onclick = async () => {
  const v = {empresa:$("#f_empresa").value.trim(), contacto:$("#f_contacto").value.trim(), telefono:$("#f_tel").value.trim(), correo:$("#f_correo").value.trim(),
    donacion:$("#f_donacion").value.trim(), monto:$("#f_monto").value, etapa:$("#f_etapa").value, proyecto:$("#f_proyecto").value, direccion:$("#f_dir").value.trim(), items:[...document.querySelectorAll("#f_items .it")].map(w => ({d:w.querySelector(".it-d").value.trim(), c:Number(w.querySelector(".it-c").value) || 0})).filter(x => x.d || x.c), logo:$("#f_logo").checked, seguimiento:$("#f_seg").value, actualizado:serverTimestamp()};
  if (!v.empresa) { alert("Escribe el nombre de la empresa."); return; }
  const n = $("#f_nota").value.trim(), nota = {t:n, u:auth.currentUser.email, d:new Date().toISOString()};
  if (isAdmin) v.lleva = $("#f_lleva").value;
  try {
    if (cur) { if (isAdmin) v.responsable = $("#f_resp").value; if (n) v.notas = arrayUnion(nota); await updateDoc(doc(db,"donaciones",cur.id), v); }
    else { v.notas = n ? [nota] : []; v.responsable = isAdmin ? ($("#f_resp").value || canon(me)) : me; v.creado = serverTimestamp(); await addDoc(col, v); }
    $("#dlg").close();
  } catch (x) { alert("No se pudo guardar: " + x.message); }
};
$("#del").onclick = async () => {
  if (!cur || !confirm("¿Eliminar esta donación? No se puede deshacer.")) return;
  try { await deleteDoc(doc(db,"donaciones",cur.id)); $("#dlg").close(); } catch (x) { alert("No se pudo eliminar: " + x.message); }
};

$("#eq").onclick = () => { drawEq(); $("#e_del").hidden = true; $("#dlg2").showModal(); };
$("#e_close").onclick = () => $("#dlg2").close();
function drawEq() {
  $("#eqlist").innerHTML = Object.entries(team()).map(([k,v]) => `<div data-k="${esc(k)}" style="cursor:pointer;margin-bottom:6px"><span style="color:${v.color}">●</span> ${esc(v.nombre)} <em>${esc(k)}${k === PERFIL ? " · grupo maestro" : ""}</em></div>`).join("");
}
$("#eqlist").onclick = e => { const el = e.target.closest("[data-k]"); if (!el) return; const v = team()[el.dataset.k]; $("#e_email").value = el.dataset.k; $("#e_nombre").value = v.nombre; $("#e_color").value = v.color; showDel(el.dataset.k); };
let eSel = "";
function showDel(k) {
  eSel = k; const T = team(), n = data.filter(d => canon(d.responsable) === k).length, blocked = k === PERFIL;
  $("#e_del").hidden = false; $("#e_destw").hidden = blocked || !n; $("#e_rm").hidden = blocked;
  $("#e_note").textContent = blocked ? "Fortalecimiento de Programas es el perfil del grupo maestro y no se quita desde aquí." : "Esto no cancela su acceso: para eso elimina su correo en Firebase → Authentication.";
  $("#e_dest").innerHTML = `<option value="">Sin responsable</option>` + Object.keys(T).filter(x => x !== k).map(x => `<option value="${esc(x)}">${esc(T[x].nombre)}</option>`).join("");
  $("#e_dest").value = T[canon(me)] && canon(me) !== k ? canon(me) : "";
  $("#e_rm").textContent = n ? `Quitar del equipo y pasar sus ${n} donaciones` : "Quitar del equipo";
}
$("#e_rm").onclick = async () => {
  const k = eSel, T = team(), p = T[k]; if (!k || !p) return;
  const mine = data.filter(d => canon(d.responsable) === k), dest = $("#e_dest").value;
  const msg = `¿Quitar a ${p.nombre} del equipo?` + (mine.length ? `\n\nSus ${mine.length} donaciones pasarán a: ${dest ? T[dest].nombre : "Sin responsable"}.` : "") + `\n\nSu acceso (correo y contraseña) no se borra aquí; para cancelarlo, elimínalo en Firebase → Authentication.`;
  if (!confirm(msg)) return;
  try {
    for (let i = 0; i < mine.length; i += 400) { const b = writeBatch(db); mine.slice(i, i + 400).forEach(d => b.update(doc(db,"donaciones",d.id), {responsable:dest})); await b.commit(); }
    await deleteDoc(doc(db,"equipo",k));
    eSel = ""; $("#e_del").hidden = true; $("#e_email").value = ""; $("#e_nombre").value = "";
  } catch (x) { alert("No se pudo quitar: " + x.message); }
};
$("#e_save").onclick = async () => {
  const k = $("#e_email").value.trim().toLowerCase(), nombre = $("#e_nombre").value.trim();
  if (!k || !nombre) { alert("Escribe el correo y el nombre."); return; }
  try { await setDoc(doc(db,"equipo",k), {nombre, color:$("#e_color").value}); $("#e_email").value = ""; $("#e_nombre").value = ""; drawEq(); }
  catch (x) { alert("No se pudo guardar: " + x.message); }
};
$("#csv").onclick = () => {
  const dt = t => { if (!t || !t.toDate) return ""; const x = t.toDate(); return new Date(x.getTime() - x.getTimezoneOffset()*6e4).toISOString().slice(0,10); };
  const h = ["Proyecto","Responsable","Correo responsable","Lleva el contacto","Empresa","Contacto","Teléfono","Correo","Dirección confirmada","Donación","Cantidad","Valor (Q)","Etapa","Próximo seguimiento","Logo solicitado","Creado","Última actualización","Comentarios"];
  const r = data.filter(inP).filter(inU).map(d => [pname(d.proyecto),person(d.responsable).nombre,d.responsable,ADMINS[lleva(d)]?.nombre || "",d.empresa,d.contacto,d.telefono,d.correo,d.direccion,d.donacion,cant(d),d.monto,d.etapa,d.seguimiento,d.logo ? "Sí" : "No",dt(d.creado),dt(d.actualizado),(d.notas||[]).map(x => x.t).join(" | ")]);
  const csv = [h,...r].map(a => a.map(c => `"${String(c ?? "").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], {type:"text/csv;charset=utf-8"}));
  a.download = "donaciones-" + today() + ".csv"; a.click();
};
Cal.iniciar({db, data:() => data, agenda:() => agenda, team, person, canon, me:() => me, isAdmin:() => isAdmin, uv:() => uv, q:() => $("#q").value.toLowerCase(), esc, today, render});
