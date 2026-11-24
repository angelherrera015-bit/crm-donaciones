// Reportes en Excel: archivo .xlsx propio, reporte de confirmadas y exportaciones
// ==REPORTE==
const itRow = (d = "", c = "") => `<div class="it" style="display:grid;grid-template-columns:1fr 100px 40px;gap:6px;margin-bottom:6px"><input class="it-d" placeholder="Descripción (ej. Snacks varios)" value="${esc(d)}"><input class="it-c" type="number" min="0" step="any" placeholder="Cantidad" value="${esc(c)}"><button type="button" class="del it-x" aria-label="Quitar producto" style="padding:6px">✕</button></div>`;
function parseDon(t) {
  t = String(t || "").trim(); const m = t.match(/^(\d[\d.,]*)\s+(.*)$/); if (!m) return {d:t, c:null};
  const c = Number(m[1].replace(/,/g, "")); if (!isFinite(c)) return {d:t, c:null};
  return {d:m[2].replace(/^(u|und|unid\.?|unidades)\b\s*(de\s+)?/i, "").trim() || t, c};
}
const lineas = d => (d.items && d.items.length) ? d.items.map(x => ({d:x.d || "", c:Number(x.c) || null})) : [parseDon(d.donacion)];
const cant = d => lineas(d).reduce((a,x) => a + (x.c || 0), 0) || "";
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fechaLarga = () => { const x = new Date(); return `${x.getDate()} de ${MESES[x.getMonth()]} del ${x.getFullYear()}`; };
const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = crcT[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(files) {
  const enc = new TextEncoder(), parts = [], cd = []; let off = 0;
  for (const [name, txt] of files) {
    const nb = enc.encode(name), data = enc.encode(txt), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true);
    parts.push(new Uint8Array(h.buffer), nb, data);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
    cd.push(new Uint8Array(c.buffer), nb); off += 30 + nb.length + data.length;
  }
  const cl = cd.reduce((a, x) => a + x.length, 0), e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cl, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cd, new Uint8Array(e.buffer)], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"', H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const al = h => `<alignment horizontal="${h}" vertical="center" wrapText="1"/>`;
const xf = (num, font, fill, bord, h) => `<xf numFmtId="${num}" fontId="${font}" fillId="${fill}" borderId="${bord}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${al(h)}</xf>`;
const styles = `${H}<styleSheet ${NS}><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="16"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF92D050"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>${xf(0,1,0,0,"center")}${xf(0,2,0,0,"center")}${xf(0,2,2,1,"center")}${xf(0,3,0,1,"center")}${xf(0,3,0,1,"left")}${xf(3,3,0,1,"center")}${xf(0,2,0,1,"center")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
function xlsx(titulo, fecha, grupos) {
  const x = v => String(v ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const T = (ref, st, v) => `<c r="${ref}" s="${st}" t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`, N = (ref, st, v) => `<c r="${ref}" s="${st}"><v>${v}</v></c>`, E = (ref, st) => `<c r="${ref}" s="${st}"/>`;
  const rows = [`<row r="3" ht="28" customHeight="1">${T("B3",1,titulo)}${"CDEFG".split("").map(c => E(c + "3", 1)).join("")}</row>`,
    `<row r="5">${T("B5",2,"Donaciones Confirmadas al ")}${E("C5",2)}${E("D5",2)}${T("F5",2,fecha)}${E("G5",2)}</row>`,
    `<row r="6">${["No","Encargado","Empresa","Etapa","Donación","Cantidad"].map((h,i) => T("BCDEFG"[i] + "6", 3, h)).join("")}</row>`];
  const merges = ["B3:G3","B5:D5","F5:G5"]; let r = 7;
  grupos.forEach((g, gi) => {
    const r0 = r;
    g.l.forEach((l, i) => {
      const first = i === 0;
      rows.push(`<row r="${r}">${first ? N("B"+r,7,gi + 1) : E("B"+r,7)}${first ? T("C"+r,4,g.e) : E("C"+r,4)}${first ? T("D"+r,4,g.em) : E("D"+r,4)}${first ? T("E"+r,4,g.et) : E("E"+r,4)}${T("F"+r,5,l.d)}${l.c ? N("G"+r,6,l.c) : T("G"+r,4,"-")}</row>`);
      r++;
    });
    if (g.l.length > 1) "BCDE".split("").forEach(c => merges.push(`${c}${r0}:${c}${r - 1}`));
  });
  const W = [3,5,28,38,13,62,12], cols = W.map((w,i) => `<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("");
  const sheet = `${H}<worksheet ${NS}><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${rows.join("")}</sheetData><mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join("")}</mergeCells><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  return xlPkg(sheet);
}
function xlPkg(sheet) {
  const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships", PR = "http://schemas.openxmlformats.org/package/2006/relationships", CT = "application/vnd.openxmlformats-officedocument.spreadsheetml";
  return zip([
    ["[Content_Types].xml", `${H}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${CT}.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="${CT}.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="${CT}.styles+xml"/></Types>`],
    ["_rels/.rels", `${H}<Relationships xmlns="${PR}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `${H}<workbook ${NS} xmlns:r="${R}"><sheets><sheet name="Confirmadas" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `${H}<Relationships xmlns="${PR}"><Relationship Id="rId1" Type="${R}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${R}/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml", styles], ["xl/worksheets/sheet1.xml", sheet]]);
}
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
$("#csv").onclick = () => {
  const dt = t => { if (!t || !t.toDate) return ""; const x = t.toDate(); return new Date(x.getTime() - x.getTimezoneOffset()*6e4).toISOString().slice(0,10); };
  const h = ["Proyecto","Responsable","Correo responsable","Lleva el contacto","Empresa","Contacto","Teléfono","Correo","Dirección confirmada","Donación","Cantidad","Valor (Q)","Etapa","Próximo seguimiento","Logo solicitado","Creado","Última actualización","Comentarios"];
  const r = data.filter(inP).filter(inU).map(d => [pname(d.proyecto),person(d.responsable).nombre,d.responsable,ADMINS[lleva(d)]?.nombre || "",d.empresa,d.contacto,d.telefono,d.correo,d.direccion,d.donacion,cant(d),d.monto,d.etapa,d.seguimiento,d.logo ? "Sí" : "No",dt(d.creado),dt(d.actualizado),(d.notas||[]).map(x => x.t).join(" | ")]);
  const csv = [h,...r].map(a => a.map(c => `"${String(c ?? "").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], {type:"text/csv;charset=utf-8"}));
  a.download = "donaciones-" + today() + ".csv"; a.click();
};

function xlsxGen(titulo, sub, head, rows, W) {
  const x = v => String(v ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const L = i => String.fromCharCode(65 + i), n = head.length;
  const T = (ref, st, v) => `<c r="${ref}" s="${st}" t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`, N = (ref, st, v) => `<c r="${ref}" s="${st}"><v>${v}</v></c>`, E = (ref, st) => `<c r="${ref}" s="${st}"/>`;
  const fill = (r, st) => Array.from({length:n - 1}, (_, i) => E(L(i + 1) + r, st)).join("");
  const out = [`<row r="2" ht="28" customHeight="1">${T("A2",1,titulo)}${fill(2,1)}</row>`, `<row r="3">${T("A3",2,sub)}${fill(3,2)}</row>`, `<row r="4">${head.map((h, i) => T(L(i) + "4", 3, h)).join("")}</row>`];
  rows.forEach((r, k) => out.push(`<row r="${k + 5}">${r.map((v, i) => typeof v === "number" ? N(L(i) + (k + 5), i === 0 ? 7 : 6, v) : T(L(i) + (k + 5), i === 0 ? 7 : 5, v)).join("")}</row>`));
  const cols = W.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");
  return xlPkg(`${H}<worksheet ${NS}><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${out.join("")}</sheetData><mergeCells count="2"><mergeCell ref="A2:${L(n - 1)}2"/><mergeCell ref="A3:${L(n - 1)}3"/></mergeCells><pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`);
}
