// Estado, perfiles, filtros de proyecto y de encargado
const {auth, db, col, pcol, ecol, acol, signInWithEmailAndPassword, signOut, onAuthStateChanged, addDoc, updateDoc, deleteDoc, doc, setDoc, writeBatch, onSnapshot, serverTimestamp, arrayUnion} = window.FB;
const ADMINS = {"cnoguera@muniguate.com":{nombre:"Cecia Noguera",color:"#7b3fa0"},"acu@muniguate.com":{nombre:"Angel Herrera",color:"#0f5c63"},"jraijall@muniguate.com":{nombre:"Alejandro Meneses",color:"#c2410c"}};

const ST = ["Prospecto","Contactado","Oficio enviado","En seguimiento","Confirmado","Recibido","Rechazado"];
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today = () => new Date(Date.now() - new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
let data = [], unsub = null, unsub2 = null, projs = [], pv = "todos", unsub3 = null, equipo = {}, me = "", isAdmin = false, uv = "todos", soloMios = true, cur = null, view = "tablero";

$("#f_etapa").innerHTML = ST.map(s => `<option>${s}</option>`).join("");

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
