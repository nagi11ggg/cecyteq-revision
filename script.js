import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const qr = new QRious({
    element: document.getElementById('qr-code'),
    size: 180,
    level: 'H'
});

window.actualizarListas = async function() {
    const grupoSelect = document.getElementById('grupo').value;
    const alumnoSelect = document.getElementById('alumno');
    const actividadSelect = document.getElementById('actividad');

    alumnoSelect.innerHTML = '<option value="">-- Cargando desde la nube... --</option>';
    actividadSelect.innerHTML = '<option value="">-- Cargando desde la nube... --</option>';
    alumnoSelect.disabled = true;
    actividadSelect.disabled = true;
    limpiarQR();

    if (!grupoSelect) {
        alumnoSelect.innerHTML = '<option value="">-- Primero selecciona un grupo --</option>';
        actividadSelect.innerHTML = '<option value="">-- Primero selecciona un grupo --</option>';
        return;
    }

    try {
        if (!window.db) {
            console.error("Firebase no está inicializado.");
            return;
        }

        const docRef = doc(window.db, "grupos", grupoSelect);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const alumnos = data.alumnos || [];
            const actividades = data.actividades || [];

            alumnoSelect.innerHTML = '<option value="">-- Selecciona tu nombre --</option>';
            alumnos.forEach(alumno => {
                const option = document.createElement('option');
                option.value = alumno;
                option.textContent = alumno;
                alumnoSelect.appendChild(option);
            });
            alumnoSelect.disabled = false;

            actividadSelect.innerHTML = '<option value="">-- Selecciona la actividad --</option>';
            actividades.forEach(actividad => {
                const option = document.createElement('option');
                option.value = actividad;
                option.textContent = actividad;
                actividadSelect.appendChild(option);
            });
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
    box.classList.remove('fade-in');
    document.getElementById('qr-info').innerText = "";
}

window.generarCodigoQR = function() {
    const grupo = document.getElementById('grupo').value;
    const parcial = document.getElementById('parcial').value;
    const alumno = document.getElementById('alumno').value;
    const actividad = document.getElementById('actividad').value;

    if (!grupo || !parcial || !alumno || !actividad) {
        alert("Por favor, completa todos los campos (Grupo, Parcial, Alumno y Actividad) antes de generar el QR.");
        return;
    }

    limpiarQR();
    const spinner = document.getElementById('loading-spinner');
    spinner.style.display = 'block';

    setTimeout(() => {
        spinner.style.display = 'none';
        
        // Estructura limpia que contendrá el QR con los 4 datos clave
        const datosQR = `GRUPO:${grupo} | PARCIAL:${parcial} | ALUMNO:${alumno} | TAREA:${actividad}`;
        qr.value = datosQR;

        const box = document.getElementById('qrcode-box');
        box.classList.add('fade-in');
        document.getElementById('qr-info').innerText = `QR de ${alumno} (${parcial}) generado con éxito`;
    }, 300);
}

window.verResumenAlumno = function() {
    const alumno = document.getElementById('alumno').value;
    if (!alumno) {
        alert("Por favor, selecciona primero tu nombre.");
        return;
    }
    alert(`Cargando historial de actividades en tiempo real para: ${alumno}...`);
}

window.mostrarMantenimientoIA = function() {
    alert("⚠️ Módulo de Inteligencia Artificial temporalmente en mantenimiento.");
}