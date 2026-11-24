// Sesión: inicio de sesión y suscripciones a la base de datos
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
    unsub4 = onSnapshot(acol, s => { agenda = s.docs.map(d => ({id:d.id, ...d.data()})); if (view === "calendario") render(); }, () => {});
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

