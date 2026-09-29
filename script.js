import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";

// Configuración de Firebase conectada con tus credenciales
const firebaseConfig = {
    apiKey: "AIzaSyCB200wB3r9uFyOT_KlXkgCpRWMuu70zaA",
    authDomain: "cecyteq-eduqr.firebaseapp.com",
    projectId: "cecyteq-eduqr",
    storageBucket: "cecyteq-eduqr.firebasestorage.app",
    messagingSenderId: "112440689760",
    appId: "1:112440689760:web:af2965374a428f1166af05",
    measurementId: "G-5JJDH57SZF"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

window.db = db;

const qr = new QRious({
    element: document.getElementById('qr-code'),
    size: 180,
    level: 'H'
});

// Función auxiliar para formatear los nombres de la BD (Primera letra de cada palabra en mayúscula)
function formatearNombre(nombre) {
    if (!nombre) return "";
    return nombre.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
}

// Función auxiliar para reproducir un sonido corto de notificación al generar con éxito
function reproducirSonidoExito() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // Nota D5
        oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // Sube a A5
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
        console.log("Audio no soportado o bloqueado por el navegador", e);
    }
}

// Cargar automáticamente los grupos desde Firestore al abrir la página
async function cargarGruposDisponibles() {
    const grupoSelect = document.getElementById('grupo');
    if (!grupoSelect) return;

    try {
        const querySnapshot = await getDocs(collection(db, "grupos"));
        
        grupoSelect.innerHTML = '<option value="">-- Selecciona tu grupo --</option>';
        
        querySnapshot.forEach((docSnap) => {
            const nombreGrupo = docSnap.id;
            const option = document.createElement('option');
            option.value = nombreGrupo;
            option.textContent = nombreGrupo;
            grupoSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error al cargar la lista de grupos:", error);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    cargarGruposDisponibles();
});

let datosActualesGrupo = null;

window.actualizarListas = async function() {
    const grupoSelect = document.getElementById('grupo').value;
    const parcialSelect = document.getElementById('parcial').value || "1er Parcial";
    const alumnoSelect = document.getElementById('alumno');
    const actividadSelect = document.getElementById('actividad');

    alumnoSelect.innerHTML = '<option value="">-- Cargando desde la nube... --</option>';
    actividadSelect.innerHTML = '<option value="">-- Cargando desde la nube... --</option>';
    alumnoSelect.disabled = true;
    actividadSelect.disabled = true;
    limpiarQR();
    datosActualesGrupo = null;

    if (!grupoSelect) {
        alumnoSelect.innerHTML = '<option value="">-- Primero selecciona un grupo --</option>';
        actividadSelect.innerHTML = '<option value="">-- Primero selecciona un grupo --</option>';
        return;
    }

    try {
        const docRef = doc(db, "grupos", grupoSelect);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            datosActualesGrupo = data; 
            
            const parcialesData = data.parciales || {};
            const datosParcial = parcialesData[parcialSelect] || {};
            
            const alumnos = datosParcial.alumnos || [];
            
            // Llenar selector de alumnos con nombres limpios y estilizados
            alumnoSelect.innerHTML = '<option value="">-- Selecciona tu nombre --</option>';
            alumnos.forEach(alumnoObj => {
                const nombreCrudo = alumnoObj.nombre || "Sin nombre";
                const nombreBonito = formatearNombre(nombreCrudo);
                
                const option = document.createElement('option');
                option.value = nombreCrudo; // Se guarda el original para Firebase
                option.textContent = nombreBonito; // Se muestra ordenado al usuario
                alumnoSelect.appendChild(option);
            });
            alumnoSelect.disabled = false;

            // Llenar actividades limpias ("Actividad 1", "Actividad 2", etc.)
            actividadSelect.innerHTML = '<option value="">-- Selecciona la actividad --</option>';
            if (alumnos.length > 0 && alumnos[0].tareasStatus) {
                const tareasKeys = Object.keys(alumnos[0].tareasStatus);
                tareasKeys.forEach((tareaId, index) => {
                    const option = document.createElement('option');
                    option.value = tareaId;
                    option.textContent = `Actividad ${index + 1}`;
                    actividadSelect.appendChild(option);
                });
            }
            actividadSelect.disabled = false;

        } else {
            alert("No se encontraron datos en la nube para el grupo: " + grupoSelect);
            alumnoSelect.innerHTML = '<option value="">-- Sin datos --</option>';
            actividadSelect.innerHTML = '<option value="">-- Sin datos --</option>';
        }

    } catch (error) {
        console.error("Error al conectar con Firestore:", error);
    }
}

window.limpiarQR = function() {
    qr.value = "";
    const box = document.getElementById('qrcode-box');
    if (box) box.classList.remove('fade-in');
    const info = document.getElementById('qr-info');
    if (info) info.innerText = "";
}

window.generarCodigoQR = function() {
    const grupo = document.getElementById('grupo').value;
    const parcial = document.getElementById('parcial').value;
    const alumnoNombre = document.getElementById('alumno').value;
    const actividadId = document.getElementById('actividad').value;

    if (!grupo || !parcial || !alumnoNombre || !actividadId) {
        alert("Por favor, completa todos los campos antes de generar el QR.");
        return;
    }

    // Validar en tiempo real si el alumno ya tiene registrada la tarea
    if (datosActualesGrupo) {
        const parcialesData = datosActualesGrupo.parciales || {};
        const datosParcial = parcialesData[parcial] || {};
        const alumnos = datosParcial.alumnos || [];

        const alumnoEncontrado = alumnos.find(a => a.nombre === alumnoNombre);
        if (alumnoEncontrado && alumnoEncontrado.tareasStatus) {
            const estadoTarea = alumnoEncontrado.tareasStatus[actividadId];
            if (estadoTarea === true) {
                alert(`⚠️ ¡Atención! Ya tienes registrada esta actividad previamente en el sistema.`);
                document.getElementById('qr-info').innerText = `⚠️ Esta actividad ya está registrada`;
                return;
            }
        }
    }

    limpiarQR();
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'block';

    setTimeout(() => {
        if (spinner) spinner.style.display = 'none';
        
        const datosQR = `GRUPO:${grupo} | PARCIAL:${parcial} | ALUMNO:${alumnoNombre} | TAREA:${actividadId}`;
        qr.value = datosQR;

        const box = document.getElementById('qrcode-box');
        if (box) box.classList.add('fade-in');
        
        document.getElementById('qr-info').innerText = `✅ QR generado con éxito para ${formatearNombre(alumnoNombre)}`;
        
        reproducirSonidoExito();
    }, 300);
}

window.verResumenAlumno = function() {
    const alumno = document.getElementById('alumno').value;
    if (!alumno) {
        alert("Por favor, selecciona primero tu nombre.");
        return;
    }
    alert(`Cargando historial de actividades en tiempo real para: ${formatearNombre(alumno)}...`);
}

window.mostrarMantenimientoIA = function() {
    alert("⚠️ Módulo de Inteligencia Artificial temporalmente en mantenimiento.");
}