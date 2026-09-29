// Importar las funciones necesarias de los SDKs de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, collection, doc, setDoc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración de Firebase de tu proyecto CECYTEQ-EDUQR
const firebaseConfig = {
    apiKey: "AIzaSyCB200wB3r9uFyOT_KlxkgCpRWMuu70zaA",
    authDomain: "cecyteq-eduqr.firebaseapp.com",
    projectId: "cecyteq-eduqr",
    storageBucket: "cecyteq-eduqr.firebasestorage.app",
    messagingSenderId: "112440689760",
    appId: "1:112440689760:web:af2965374a428f1166af05",
    measurementId: "G-5JJDH57SZF"
};

// Inicializar Firebase y Analytics
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Exponer la base de datos globalmente por si tus otras funciones la necesitan
window.db = db;

// Elementos de la interfaz del maestro
const contenedorGrupos = document.getElementById('listaGruposDocente');

// 1. Cargar los grupos directamente desde Firestore al abrir el panel de Miss Karol
async function cargarGruposMaestro() {
    if (!contenedorGrupos) return;
    contenedorGrupos.innerHTML = "<p>Sincronizando grupos desde Firebase...</p>";

    try {
        const querySnapshot = await getDocs(collection(db, "grupos"));
        contenedorGrupos.innerHTML = "";

        if (querySnapshot.empty) {
            contenedorGrupos.innerHTML = "<p>No hay grupos en la nube todavía.</p>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const grupoId = docSnap.id;
            const datosGrupo = docSnap.data();

            // Dibujar la tarjeta del grupo en el panel de control
            const tarjeta = document.createElement('div');
            tarjeta.className = "grupo-card";
            tarjeta.style.border = "1px solid #ccc";
            tarjeta.style.padding = "15px";
            tarjeta.style.margin = "10px 0";
            tarjeta.style.borderRadius = "8px";
            
            tarjeta.innerHTML = `
                <h3>Grupo: ${grupoId}</h3>
                <p>Alumnos registrados: ${datosGrupo.alumnos ? datosGrupo.alumnos.length : 0}</p>
                <p>Entregas recibidas: ${datosGrupo.entregas ? datosGrupo.entregas.length : 0}</p>
                <label>
                    <input type="checkbox" class="check-bloqueo" data-grupo="${grupoId}" ${datosGrupo.bloqueado ? 'checked' : ''}>
                    Bloquear entregas para alumnos
                </label>
            `;
            contenedorGrupos.appendChild(tarjeta);
        });

        activarControlesBloqueo();

    } catch (error) {
        console.error("Error al cargar grupos:", error);
        contenedorGrupos.innerHTML = "<p>Error al conectar con la base de datos.</p>";
    }
}

// 2. Función global para guardar un grupo nuevo o importado (desde Excel/PDF) directamente en Firebase
window.subirGrupoAFirebase = async function(nombreGrupo, listaAlumnos = []) {
    try {
        const grupoRef = doc(db, "grupos", nombreGrupo);
        await setDoc(grupoRef, {
            bloqueado: false,
            alumnos: listaAlumnos,
            entregas: []
        }, { merge: true });

        alert(`¡Grupo ${nombreGrupo} sincronizado con éxito en Firebase!`);
        cargarGruposMaestro();
    } catch (error) {
        console.error("Error al subir grupo:", error);
        alert("Hubo un error al guardar el grupo en la nube.");
    }
};

// 3. Activar el interruptor de bloqueo en tiempo real
function activarControlesBloqueo() {
    document.querySelectorAll('.check-bloqueo').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            const grupoId = e.target.getAttribute('data-grupo');
            const estaBloqueado = e.target.checked;

            try {
                const grupoRef = doc(db, "grupos", grupoId);
                await updateDoc(grupoRef, {
                    bloqueado: estaBloqueado
                });
                console.log(`Estado de bloqueo actualizado para ${grupoId}: ${estaBloqueado}`);
            } catch (error) {
                console.error("Error al actualizar bloqueo:", error);
            }
        });
    });
}

// Cargar al iniciar la página del docente
document.addEventListener('DOMContentLoaded', () => {
    cargarGruposMaestro();
});
