// Conexión con Firebase y carga de los demás archivos de la aplicación
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,collection,addDoc,updateDoc,deleteDoc,doc,setDoc,writeBatch,onSnapshot,serverTimestamp,arrayUnion} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB1c8Ca4ZVRjyLu8X8GcG0U2qw1tbqeV2I",
  authDomain: "crm-donaciones.firebaseapp.com",
  projectId: "crm-donaciones",
  storageBucket: "crm-donaciones.firebasestorage.app",
  messagingSenderId: "955448876585",
  appId: "1:955448876585:web:20f439b112212170738638"
};
const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app);
window.FB = {auth, db, col: collection(db,"donaciones"), pcol: collection(db,"proyectos"), ecol: collection(db,"equipo"), acol: collection(db,"agenda"),
  signInWithEmailAndPassword, signOut, onAuthStateChanged, addDoc, updateDoc, deleteDoc, doc, setDoc, writeBatch, onSnapshot, serverTimestamp, arrayUnion};
const ARCHIVOS = ["base.js","tablero.js","estadistica.js","reportes.js","equipo.js","calendario.js","app.js"];
try {
  for (const f of ARCHIVOS) await new Promise((ok, no) => {
    const e = document.createElement("script"); e.src = f + "?v=3"; e.onload = ok; e.onerror = () => no(new Error("no cargó " + f)); document.body.appendChild(e);
  });
} catch (e) {
  document.getElementById("login").insertAdjacentHTML("beforeend", `<p style="color:#b3261e;text-align:center">No se pudo cargar la aplicación (${e.message}). Recarga con Ctrl + F5.</p>`);
}
