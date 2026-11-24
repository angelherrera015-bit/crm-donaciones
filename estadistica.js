// Pestaña de estadística: gráficos, tarjetas y listados
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
