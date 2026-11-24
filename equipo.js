// Equipo: perfiles, colores y quitar personas
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
