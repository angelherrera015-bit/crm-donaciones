// Calendario: recepciones de donación y visitas, vista de mes y de semana
let agenda = [], unsub4 = null, calMode = "mes", calCur = new Date(), aCur = null, aEmp = null;
calCur.setHours(12, 0, 0, 0);
const DIAS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const ESTADOS = {"Programada":"#6366f1","Realizada":"#16a34a","Reprogramada":"#d97706","Cancelada":"#dc2626"};
const DDS = '6.ª Avenida "A", 20-25, Zona 1, Ciudad de Guatemala (Dirección de Desarrollo Social)';
const ymd = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const fromYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d, 12); };
const sumar = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const lunes = d => sumar(d, -((d.getDay() + 6) % 7));
const empDe = a => data.find(d => d.id === a.empresaId);
const dirDe = a => a.direccion || (empDe(a) || {}).direccion || "";
const canEditA = a => isAdmin || lc(a.creadoPor) === me || canon(a.responsable) === canon(me);
const aVisible = a => { const e = empDe(a);
  return (pv === "todos" || (pv === "sin" ? (!e || noP(e)) : (e && e.proyecto === pv))) && (uv === "todos" || (uv === "sin" ? !a.responsable : canon(a.responsable) === uv)); };
const tituloA = a => a.tipo === "visita" ? "Visita / recolección" : "Recepción Donación";

function chipA(a) {
  const p = person(a.responsable);
  return `<button class="ch est-${a.estado}" data-a="${a.id}" style="--c:${p.color}" title="${esc(tituloA(a) + " · " + a.empresa + " · " + p.nombre + " · " + (a.inicio || "") + (a.fin ? " a " + a.fin : ""))}"><i>${esc(a.inicio || "")}</i><span>${esc(a.empresa)}</span>${a.transporte ? "<u>T</u>" : ""}</button>`;
}
function cardA(a) {
  const p = person(a.responsable), dir = dirDe(a);
  return `<article class="ev est-${a.estado}" data-a="${a.id}" style="--c:${p.color}"><div class="hr">${esc(a.inicio || "--:--")}<small>${esc(a.fin || "")}</small></div>
  <div class="bd"><span class="kind">${tituloA(a)}</span><b>${esc(a.empresa)}</b>
  <p><span class="tag" style="background:${p.color}">${esc(p.nombre)}</span> <span class="tg ${a.transporte ? "si" : ""}">Transporte: ${a.transporte ? "Sí" : "No"}</span></p>
  <p>${dir ? esc(dir) : '<em class="warn">Falta dirección confirmada</em>'}</p>
  <span class="st" style="--c2:${ESTADOS[a.estado] || "#64748b"}">${esc(a.estado || "Programada")}</span></div></article>`;
}
function calHtml() {
  const L = agenda.filter(aVisible), hoy = today(), b = calCur, mes = calMode === "mes";
  const por = {}; L.forEach(a => (por[a.fecha] = por[a.fecha] || []).push(a));
  Object.values(por).forEach(v => v.sort((x, y) => (x.inicio || "").localeCompare(y.inicio || "")));
  const a0 = lunes(b), b0 = sumar(a0, 6);
  const titulo = mes ? `${MESES[b.getMonth()]} ${b.getFullYear()}` : `Semana del ${a0.getDate()} de ${MESES[a0.getMonth()]} al ${b0.getDate()} de ${MESES[b0.getMonth()]} ${b0.getFullYear()}`;
  const bar = `<div class="cbar"><div class="cnav"><button class="sec" data-nav="-1" aria-label="Anterior">‹</button><button class="sec" data-nav="0">Hoy</button><button class="sec" data-nav="1" aria-label="Siguiente">›</button></div><h2>${titulo}</h2>
  <div class="seg"><button data-cm="mes" class="${mes ? "on" : ""}">Mes</button><button data-cm="semana" class="${mes ? "" : "on"}">Semana</button></div>
  <button data-add="1">+ Agendar</button>${mes ? "" : '<button class="sec" data-rep="dir">Reporte semanal</button><button class="sec" data-rep="trans">Requerimiento de transporte</button>'}</div>`;
  let cuerpo;
  if (mes) {
    const p1 = new Date(b.getFullYear(), b.getMonth(), 1, 12), n = Math.ceil((new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate() + (p1.getDay() + 6) % 7) / 7) * 7, ini = lunes(p1);
    cuerpo = `<div class="mes">${DIAS.map(d => `<div class="dh">${d.slice(0, 3)}</div>`).join("")}${Array.from({length:n}, (_, i) => { const d = sumar(ini, i), f = ymd(d), ev = por[f] || [];
      return `<div class="cd ${d.getMonth() !== b.getMonth() ? "om" : ""} ${f === hoy ? "hoy" : ""}" data-day="${f}"><b>${d.getDate()}</b>${ev.slice(0, 3).map(chipA).join("")}${ev.length > 3 ? `<span class="mas">+${ev.length - 3} más</span>` : ""}</div>`; }).join("")}</div>`;
  } else {
    cuerpo = `<div class="wk">${Array.from({length:7}, (_, i) => { const d = sumar(a0, i), f = ymd(d), ev = por[f] || [];
      return `<section class="wd ${f === hoy ? "hoy" : ""}"><div class="wh" data-day="${f}"><span>${DIAS[i]}</span><b>${d.getDate()}</b></div>${ev.map(cardA).join("") || '<p class="vacio">Sin programación</p>'}<button class="sec add-d" data-add="${f}" aria-label="Agendar este día">+</button></section>`; }).join("")}</div>`;
  }
  return `<div class="cal">${bar}${cuerpo}</div>`;
}
main.addEventListener("click", e => {
  if (view !== "calendario") return;
  const t = e.target, nav = t.closest("[data-nav]"), cm = t.closest("[data-cm]"), ad = t.closest("[data-add]"), ev = t.closest("[data-a]"), dy = t.closest("[data-day]"), rp = t.closest("[data-rep]");
  if (nav) { const n = +nav.dataset.nav; calCur = n === 0 ? new Date() : calMode === "mes" ? new Date(calCur.getFullYear(), calCur.getMonth() + n, 1, 12) : sumar(calCur, 7 * n); calCur.setHours(12); render(); }
  else if (cm) { calMode = cm.dataset.cm; render(); }
  else if (rp) repSemana(rp.dataset.rep);
  else if (ad) abrirA(null, ad.dataset.add === "1" ? "" : ad.dataset.add);
  else if (ev) abrirA(agenda.find(a => a.id === ev.dataset.a));
  else if (dy) { calCur = fromYmd(dy.dataset.day); if (calMode === "mes") calMode = "semana"; render(); }
});

const tipoA = () => document.querySelector("input[name=a_tipo]:checked").value;
function aplicarTipo() {
  if (tipoA() === "recepcion") { $("#a_dir").value = DDS; $("#a_tr").checked = false; }
  else { $("#a_dir").value = (aEmp && aEmp.direccion) || ""; $("#a_tr").checked = true; }
}
function infoA() {
  $("#a_info").innerHTML = aEmp ? `Etapa: <b>${esc(aEmp.etapa)}</b> · ${esc(lineas(aEmp).map(x => (x.c ? x.c.toLocaleString("es-GT") + " " : "") + x.d).join("; "))}${aEmp.direccion ? "" : ' · <span class="warn">sin dirección confirmada</span>'}`
    : ($("#a_emp").value ? '<span class="warn">Elige una empresa de la lista (debe estar en la base de datos).</span>' : "");
}
function abrirA(a, fecha) {
  aCur = a || null; aEmp = a ? (empDe(a) || null) : null;
  const T = team(), ks = Object.keys(T);
  $("#a_dl").innerHTML = [...new Set(data.map(d => d.empresa).filter(Boolean))].sort().map(n => `<option value="${esc(n)}">`).join("");
  $("#a_resp").innerHTML = ks.map(k => `<option value="${esc(k)}">${esc(T[k].nombre)}</option>`).join("");
  $("#a_est").innerHTML = Object.keys(ESTADOS).map(s => `<option>${s}</option>`).join("");
  $("#a_t").textContent = a ? "Editar programación" : "Agendar recepción o visita";
  document.querySelector(`input[name=a_tipo][value=${a && a.tipo || "recepcion"}]`).checked = true;
  $("#a_emp").value = a ? a.empresa : "";
  $("#a_resp").value = a ? canon(a.responsable) : (T[uv] ? uv : canon(me));
  $("#a_est").value = (a && a.estado) || "Programada";
  $("#a_fecha").value = (a && a.fecha) || fecha || today();
  $("#a_ini").value = a ? (a.inicio || "") : "08:00"; $("#a_fin").value = (a && a.fin) || "";
  $("#a_tr").checked = !!(a && a.transporte); $("#a_dir").value = a ? (a.direccion || "") : DDS; $("#a_obs").value = (a && a.obs) || "";
  infoA();
  const ro = !!a && !canEditA(a);
  document.querySelectorAll("#dlgA input, #dlgA select, #dlgA textarea").forEach(x => x.disabled = ro);
  $("#a_save").hidden = ro; $("#a_del").hidden = !a || ro;
  $("#dlgA").showModal();
}
$("#a_emp").oninput = () => {
  const v = lc($("#a_emp").value.trim()), ok = d => ["Confirmado","Recibido"].includes(d.etapa) ? 1 : 0;
  aEmp = data.filter(d => lc(d.empresa) === v).sort((x, y) => ok(y) - ok(x))[0] || null;
  if (aEmp) { const k = canon(aEmp.responsable); if ([...$("#a_resp").options].some(o => o.value === k)) $("#a_resp").value = k; aplicarTipo(); }
  infoA();
};
document.querySelectorAll("input[name=a_tipo]").forEach(r => r.onchange = aplicarTipo);
$("#a_cancel").onclick = () => $("#dlgA").close();
$("#a_save").onclick = async () => {
  if (!aEmp) { alert("Elige una empresa de la lista (debe estar en la base de datos)."); return; }
  const f = $("#a_fecha").value, ini = $("#a_ini").value, fin = $("#a_fin").value;
  if (!f) { alert("Elige la fecha."); return; }
  if (ini && fin && fin <= ini) { alert("La hora final debe ser posterior a la inicial."); return; }
  const v = {empresaId:aEmp.id, empresa:aEmp.empresa, tipo:tipoA(), fecha:f, inicio:ini, fin, transporte:$("#a_tr").checked, direccion:$("#a_dir").value.trim(), responsable:$("#a_resp").value, estado:$("#a_est").value, obs:$("#a_obs").value.trim(), actualizado:serverTimestamp()};
  const ch = ini && agenda.find(x => (!aCur || x.id !== aCur.id) && x.fecha === f && x.estado !== "Cancelada" && canon(x.responsable) === canon(v.responsable) && x.inicio && ini < (x.fin || "23:59") && (fin || "23:59") > x.inicio);
  if (ch && !confirm(`${person(v.responsable).nombre} ya tiene una programación en ese horario (${ch.empresa}, ${ch.inicio}). ¿Guardar de todos modos?`)) return;
  try {
    if (aCur) {
      if (aCur.fecha !== f || (aCur.inicio || "") !== ini) {
        v.cambios = arrayUnion({de:`${aCur.fecha} ${aCur.inicio || ""}`.trim(), a:`${f} ${ini}`.trim(), por:me, d:new Date().toISOString()});
        if (v.estado === "Programada") v.estado = "Reprogramada";
      }
      await updateDoc(doc(db, "agenda", aCur.id), v);
    } else { v.creadoPor = me; v.creado = serverTimestamp(); await addDoc(acol, v); }
    $("#dlgA").close();
  } catch (x) { alert("No se pudo guardar: " + x.message); }
};
$("#a_del").onclick = async () => {
  if (!aCur || !confirm("¿Eliminar esta programación? No se puede deshacer.")) return;
  try { await deleteDoc(doc(db, "agenda", aCur.id)); $("#dlgA").close(); } catch (x) { alert("No se pudo eliminar: " + x.message); }
};

function repSemana(modo) {
  const dias = Array.from({length:7}, (_, i) => ymd(sumar(lunes(calCur), i)));
  let L = agenda.filter(aVisible).filter(a => dias.includes(a.fecha) && a.estado !== "Cancelada");
  if (modo === "trans") L = L.filter(a => a.transporte);
  if (!L.length) { alert(modo === "trans" ? "No hay recolecciones con transporte esta semana." : "No hay programaciones esta semana."); return; }
  L.sort((x, y) => x.fecha.localeCompare(y.fecha) || (x.inicio || "").localeCompare(y.inicio || ""));
  const sub = prompt("Subtítulo del reporte", "CENA NAVIDEÑA 2026"); if (sub === null) return;
  const dd = f => { const d = fromYmd(f); return `${DIAS[(d.getDay() + 6) % 7].toLowerCase()} ${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()}`; };
  const hor = a => a.inicio ? (a.fin ? `${a.inicio} a ${a.fin}` : a.inicio) : "";
  const prod = a => { const ls = empDe(a) ? lineas(empDe(a)) : []; return [ls.map(x => x.d).filter(Boolean).join("; "), ls.reduce((s, x) => s + (x.c || 0), 0) || ""]; };
  const trans = modo === "trans";
  const H = trans ? ["No.","NOMBRE DE LA EMPRESA","TIPO DE DONACION","CANTIDAD","FECHA DE ENTREGA","HORARIO","DIRECCION","OBSERVACIONES"] : ["No.","FECHA","HORARIO","TIPO","EMPRESA","ENCARGADO","TRANSPORTE","DIRECCION","ESTADO","OBSERVACIONES"];
  const rows = L.map((a, i) => trans ? [i + 1, a.empresa, prod(a)[0], prod(a)[1], dd(a.fecha), hor(a), dirDe(a), a.obs || ""]
    : [i + 1, dd(a.fecha), hor(a), tituloA(a), a.empresa, person(a.responsable).nombre, a.transporte ? "Sí" : "No", dirDe(a), a.estado || "Programada", a.obs || ""]);
  const W = trans ? [6,34,38,12,26,16,52,40] : [6,24,16,22,34,26,13,52,15,40];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(xlsxGen(trans ? "REQUERIMIENTO DE TRANSPORTE PARA RECOGER DONACIONES" : "PROGRAMACIÓN SEMANAL DE RECEPCIÓN DE DONACIONES", sub, H, rows, W));
  a.download = (trans ? "Requerimiento-transporte-" : "Programacion-semanal-") + dias[0] + ".xlsx"; a.click();
}
