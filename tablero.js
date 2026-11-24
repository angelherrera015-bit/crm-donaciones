// Tablero, formulario de donaciones y navegación entre pestañas
const card = d => {
  const late = d.seguimiento && d.seguimiento < today() && !["Recibido","Rechazado"].includes(d.etapa);
  return `<div class="card" draggable="${canEdit(d)}" data-id="${d.id}" style="--c:${person(d.responsable).color}"><span class="chip">${esc(person(d.responsable).nombre)}</span><b>${esc(d.empresa)}</b>
  ${d.donacion ? `<p>${esc(d.donacion)}</p>` : ""}
  ${d.direccion ? `<p class="dir"><strong>Dirección:</strong> ${esc(d.direccion)}</p>` : ""}
  ${d.monto ? `<small>Q${Number(d.monto).toLocaleString("es-GT")}</small>` : ""}
  ${d.seguimiento ? `<small class="${late ? "late" : ""}">Seguimiento: ${d.seguimiento}</small>` : ""}${d.logo ? `<small>Logo solicitado ✓</small>` : ""}${nom1(lleva(d)) ? `<small>Contacto: ${esc(nom1(lleva(d)))}</small>` : ""}</div>`;
};

function render() {
  if ($("#dlg2").open) drawEq();
  $("#ptabs").innerHTML = tabsHtml();
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
  } else if (view === "estadistica") { $("#main").innerHTML = statsHtml(); } else { $("#main").innerHTML = calHtml(); }
}

const main = $("#main");
main.onchange = e => { if (e.target.id === "mine") { soloMios = e.target.checked; render(); } };
main.onclick = e => {
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

