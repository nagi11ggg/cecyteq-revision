import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, collection, doc, setDoc, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCB200wB3r9uFyOT_KlxkgCpRWMuu70zaA",
    authDomain: "cecyteq-eduqr.firebaseapp.com",
    projectId: "cecyteq-eduqr",
    storageBucket: "cecyteq-eduqr.firebasestorage.app",
    messagingSenderId: "112440689760",
    appId: "1:112440689760:web:af2965374a428f1166af05",
    measurementId: "G-5JJDH57SZF"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
window.db = db;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let misGrupos = [];
let logoPortalGlobal = localStorage.getItem('cecyteq_logo_portal') || null;
let grupoActualId = null;
let html5QrCode = null;

async function cargarGruposDesdeFirebase() {
    try {
        const querySnapshot = await getDocs(collection(db, "grupos"));
        misGrupos = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            misGrupos.push({
                id: docSnap.id, 
                nombre: data.nombre || docSnap.id,
                bloqueado: data.bloqueado || false,
                parciales: data.parciales || {
                    "1er Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 },
                    "2do Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 },
                    "3er Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 }
                }
            });
        });
        actualizarLogoPortalUI();
        renderizarGrupos(misGrupos);
    } catch (error) {
        console.error("Error al cargar desde Firebase:", error);
        misGrupos = JSON.parse(localStorage.getItem('cecyteq_mis_grupos')) || [];
        actualizarLogoPortalUI();
        renderizarGrupos(misGrupos);
    }
}

async function guardarGrupoEnFirebase(grupoObj) {
    try {
        const docId = String(grupoObj.nombre.replace(/\s+/g, '_').toUpperCase());
        const grupoRef = doc(db, "grupos", docId);
        await setDoc(grupoRef, {
            nombre: grupoObj.nombre,
            bloqueado: grupoObj.bloqueado || false,
            parciales: grupoObj.parciales
        }, { merge: true });
        
        localStorage.setItem('cecyteq_mis_grupos', JSON.stringify(misGrupos));
    } catch (error) {
        console.error("Error al guardar en Firebase:", error);
        localStorage.setItem('cecyteq_mis_grupos', JSON.stringify(misGrupos));
    }
}

window.onload = function() {
    cargarGruposDesdeFirebase();
};

function cambiarVista(vistaId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(vistaId).classList.add('active');
}

function irAInicio() {
    grupoActualId = null;
    let buscador = document.getElementById('inputBuscadorGrupos');
    if(buscador) buscador.value = '';
    actualizarLogoPortalUI();
    cargarGruposDesdeFirebase();
    cambiarVista('vistaInicio');
}

function toggleSeccion(idSeccion) {
    let seccion = document.getElementById(idSeccion);
    let estadoActual = seccion.classList.contains('active');
    document.querySelectorAll('.seccion-colapsable').forEach(s => s.classList.remove('active'));
    if (!estadoActual) {
        seccion.classList.add('active');
    }
}

function verHistorialIA() {
    alert("🤖 El historial de IA se encuentra actualmente en mantenimiento. ¡Próximamente disponible!");
}

function abrirGrupo(id) {
    grupoActualId = id;
    let grupo = misGrupos.find(g => g.id === id);
    if (!grupo) return;

    if (!grupo.parciales) {
        grupo.parciales = {
            "1er Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 50, pExam: 50, metaExamen: 10 },
            "2do Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 50, pExam: 50, metaExamen: 10 },
            "3er Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 50, pExam: 50, metaExamen: 10 }
        };
    }

    document.getElementById('tituloGrupoActivo').innerText = `Grupo: ${grupo.nombre}`;
    document.getElementById('selectParcialActivo').value = "1er Parcial";
    
    sincronizarInputsPonderacionUI();
    actualizarEstadoCandadoUI(grupo);
    renderizarTablaAlumnos();
    cambiarVista('vistaGrupo');
}

function dispararCargaLogoPortal() {
    document.getElementById('inputLogoPortal').click();
}

function cargarLogoPortal(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        logoPortalGlobal = e.target.result;
        localStorage.setItem('cecyteq_logo_portal', logoPortalGlobal);
        actualizarLogoPortalUI();
        renderizarGrupos(misGrupos);
    };
    reader.readAsDataURL(file);
}

function actualizarLogoPortalUI() {
    let imgElem = document.getElementById('imgLogoPortal');
    let placeholderElem = document.getElementById('placeholderLogoPortal');
    if (!imgElem || !placeholderElem) return;
    if (logoPortalGlobal) {
        imgElem.src = logoPortalGlobal;
        imgElem.style.display = 'block';
        placeholderElem.style.display = 'none';
    } else {
        imgElem.style.display = 'none';
        placeholderElem.style.display = 'flex';
    }
}

function obtenerParcialActualObj() {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (!grupo) return null;
    let parcialNombre = document.getElementById('selectParcialActivo').value;
    if (!grupo.parciales[parcialNombre]) {
        grupo.parciales[parcialNombre] = { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 50, pExam: 50, metaExamen: 10 };
    }
    let p = grupo.parciales[parcialNombre];
    if (!p.columnasExtra) p.columnasExtra = [];
    if (p.pAct === undefined) p.pAct = 50;
    if (p.pExam === undefined) p.pExam = 50;
    if (p.metaExamen === undefined) p.metaExamen = 10;
    return p;
}

function sincronizarInputsPonderacionUI() {
    let parcialData = obtenerParcialActualObj();
    if (!parcialData) return;
    document.getElementById('inputMetaFirmas').value = parcialData.metaFirmas || 10;
    document.getElementById('inputPorcentajeAct').value = parcialData.pAct;
    document.getElementById('inputPorcentajeExam').value = parcialData.pExam;
    document.getElementById('inputMetaExamen').value = parcialData.metaExamen || 10;
    
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    let bloqueado = grupo && grupo.bloqueado;

    let htmlExtra = "<b>Columnas extra activas:</b> ";
    if (parcialData.columnasExtra.length > 0) {
        htmlExtra += parcialData.columnasExtra.map(c => `${c.nombre} (${c.peso}% | Meta: ${c.metaPts || 10} pts) ${bloqueado ? '' : `<button style="color:var(--danger-red);background:none;border:none;cursor:pointer;" onclick="eliminarColumnaExtra('${c.id}')">❌</button>`}`).join(" | ");
    } else {
        htmlExtra += "Ninguna.";
    }
    document.getElementById('listaColumnasExtraContainer').innerHTML = htmlExtra;
}

function cambiarParcialGrupo() {
    sincronizarInputsPonderacionUI();
    renderizarTablaAlumnos();
}

function guardarPonderaciones() {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) {
        alert("⚠️ El grupo está bloqueado. No se pueden modificar las ponderaciones ni metas.");
        sincronizarInputsPonderacionUI();
        return;
    }
    let parcialData = obtenerParcialActualObj();
    if (!parcialData) return;
    parcialData.metaFirmas = Number(document.getElementById('inputMetaFirmas').value) || 10;
    parcialData.pAct = Number(document.getElementById('inputPorcentajeAct').value) || 0;
    parcialData.pExam = Number(document.getElementById('inputPorcentajeExam').value) || 0;
    parcialData.metaExamen = Number(document.getElementById('inputMetaExamen').value) || 10;
    guardarYRenderizar();
}

function agregarColumnaExtra() {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) {
        alert("⚠️ El grupo está bloqueado. No se pueden añadir columnas extra.");
        return;
    }
    let parcialData = obtenerParcialActualObj();
    let nombre = document.getElementById('inputNombreColExtra').value.trim().toUpperCase();
    let peso = Number(document.getElementById('inputPorcentajeColExtra').value) || 0;
    let metaPts = Number(document.getElementById('inputMetaColExtra').value) || 10;

    if (!nombre) {
        alert("Escribe el nombre de la columna extra.");
        return;
    }

    let idCol = 'col_' + Date.now();
    parcialData.columnasExtra.push({ id: idCol, nombre: nombre, peso: peso, metaPts: metaPts });

    parcialData.alumnos.forEach(a => {
        if (!a.extrasStatus) a.extrasStatus = {};
        a.extrasStatus[idCol] = 0;
    });

    document.getElementById('inputNombreColExtra').value = '';
    document.getElementById('inputPorcentajeColExtra').value = '';
    document.getElementById('inputMetaColExtra').value = '';
    sincronizarInputsPonderacionUI();
    guardarYRenderizar();
}

function eliminarColumnaExtra(idCol) {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) {
        alert("⚠️ El grupo está bloqueado.");
        return;
    }
    let parcialData = obtenerParcialActualObj();
    parcialData.columnasExtra = parcialData.columnasExtra.filter(c => c.id !== idCol);
    sincronizarInputsPonderacionUI();
    guardarYRenderizar();
}

function alternarCandadoGrupo() {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (!grupo) return;
    grupo.bloqueado = !grupo.bloqueado;
    guardarYRenderizar();
    actualizarEstadoCandadoUI(grupo);
    sincronizarInputsPonderacionUI();
}

function actualizarEstadoCandadoUI(grupo) {
    const iconoCandado = document.getElementById('iconoCandado');
    const textoCandado = document.getElementById('textoCandado');
    const btnCandado = document.getElementById('btnCandadoGrupo');
    if(!iconoCandado || !textoCandado || !btnCandado) return;

    if (grupo.bloqueado) {
        iconoCandado.innerText = "🔒";
        textoCandado.innerText = "Bloqueado";
        btnCandado.style.borderColor = "var(--danger-red)";
        btnCandado.style.color = "var(--danger-red)";
    } else {
        iconoCandado.innerText = "🔓";
        textoCandado.innerText = "Desbloqueado";
        btnCandado.style.borderColor = "var(--border-color)";
        btnCandado.style.color = "var(--text-main)";
    }
}

function agregarTareaGrupo() {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) {
        alert("⚠️ El grupo está bloqueado.");
        return;
    }
    let parcialData = obtenerParcialActualObj();
    let nombreTareaInput = document.getElementById('inputNombreTarea');
    let fechaInicioInput = document.getElementById('inputFechaInicio');
    let fechaFinInput = document.getElementById('inputFechaFin');

    let nombreTarea = nombreTareaInput.value.trim().toUpperCase();
    let fechaInicio = fechaInicioInput ? fechaInicioInput.value : '';
    let fechaFin = fechaFinInput ? fechaFinInput.value : '';

    if (!nombreTarea) {
        alert("Escribe el nombre de la actividad.");
        return;
    }

    if (!parcialData.tareas) parcialData.tareas = [];
    let nuevaId = 't_' + Date.now();
    parcialData.tareas.push({ 
        id: nuevaId, 
        nombre: nombreTarea, 
        fechaInicio: fechaInicio || '', 
        fechaFin: fechaFin || '' 
    });

    parcialData.alumnos.forEach(a => {
        if (!a.tareasStatus) a.tareasStatus = {};
        a.tareasStatus[nuevaId] = false;
    });

    nombreTareaInput.value = '';
    if(fechaInicioInput) fechaInicioInput.value = '';
    if(fechaFinInput) fechaFinInput.value = '';
    guardarYRenderizar();
    alert(`✅ Actividad "${nombreTarea}" agregada correctamente.`);
}

function editarFechasTarea(tareaId) {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) {
        alert("⚠️ El grupo está bloqueado.");
        return;
    }
    let parcialData = obtenerParcialActualObj();
    let tarea = parcialData.tareas.find(t => t.id === tareaId);
    if (!tarea) return;

    let nuevaFechaInicio = prompt("Modificar Fecha de Inicio (AAAA-MM-DD):", tarea.fechaInicio || "");
    if (nuevaFechaInicio === null) return;
    let nuevaFechaFin = prompt("Modificar Fecha de Entrega / Límite (AAAA-MM-DD):", tarea.fechaFin || "");
    if (nuevaFechaFin === null) return;

    tarea.fechaInicio = nuevaFechaInicio;
    tarea.fechaFin = nuevaFechaFin;
    guardarYRenderizar();
    alert("📅 Fechas de la actividad actualizadas con éxito.");
}

function eliminarTareaGrupo(tareaId) {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) {
        alert("⚠️ El grupo está bloqueado.");
        return;
    }

    if (!confirm("¿Estás seguro de eliminar esta actividad? Se borrará de la tabla y del resumen de todos los alumnos.")) {
        return;
    }

    let parcialData = obtenerParcialActualObj();
    if (!parcialData || !parcialData.tareas) return;

    parcialData.tareas = parcialData.tareas.filter(t => t.id !== tareaId);

    parcialData.alumnos.forEach(a => {
        if (a.tareasStatus && a.tareasStatus[tareaId] !== undefined) {
            if (a.tareasStatus[tareaId]) {
                a.firmas -= 1;
                if (a.firmas < 0) a.firmas = 0;
            }
            delete a.tareasStatus[tareaId];
        }
    });

    guardarYRenderizar();
    alert("🗑️ Actividad eliminada correctamente.");
}

function agregarAlumnoGrupo() {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) {
        alert("⚠️ El grupo está bloqueado.");
        return;
    }

    let parcialData = obtenerParcialActualObj();
    let nombreInput = document.getElementById('inputNombreAlumno');
    let estadoInput = document.getElementById('selectEstadoInscripcion').value;

    let nombre = nombreInput.value.trim().toUpperCase();
    if (!nombre) {
        alert("Escribe el nombre del alumno.");
        return;
    }

    let tareasStatus = {};
    if (parcialData.tareas) {
        parcialData.tareas.forEach(t => { tareasStatus[t.id] = false; });
    }

    let extrasStatus = {};
    if (parcialData.columnasExtra) {
        parcialData.columnasExtra.forEach(c => { extrasStatus[c.id] = 0; });
    }

    parcialData.alumnos.push({
        id: Date.now(),
        nombre: nombre,
        estado: estadoInput,
        firmas: 0,
        examen: 0,
        tareasStatus: tareasStatus,
        extrasStatus: extrasStatus
    });

    nombreInput.value = '';
    guardarYRenderizar();
}

function cambiarFirmaAlumno(alumnoId, delta) {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) return;
    let parcialData = obtenerParcialActualObj();
    let alumno = parcialData.alumnos.find(a => a.id === alumnoId);
    if (!alumno) return;

    alumno.firmas += delta;
    if (alumno.firmas < 0) alumno.firmas = 0;
    
    calcularCalificacionAlumno(alumno, parcialData);
    guardarYRenderizar(false);
}

function cambiarEstadoTarea(alumnoId, tareaId) {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) return;
    let parcialData = obtenerParcialActualObj();
    let alumno = parcialData.alumnos.find(a => a.id === alumnoId);
    if (!alumno) return;

    if (!alumno.tareasStatus) alumno.tareasStatus = {};
    
    let estadoAnterior = alumno.tareasStatus[tareaId];
    alumno.tareasStatus[tareaId] = !estadoAnterior;

    if (alumno.tareasStatus[tareaId]) {
        alumno.firmas += 1;
    } else {
        alumno.firmas -= 1;
        if (alumno.firmas < 0) alumno.firmas = 0;
    }

    calcularCalificacionAlumno(alumno, parcialData);
    guardarYRenderizar(false);
}

function actualizarExamenAlumno(alumnoId, val) {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) return;
    let parcialData = obtenerParcialActualObj();
    let alumno = parcialData.alumnos.find(a => a.id === alumnoId);
    if (!alumno) return;

    alumno.examen = Number(val) || 0;
    calcularCalificacionAlumno(alumno, parcialData);
    guardarYRenderizar(false);
}

function actualizarColumnaExtraAlumno(alumnoId, colId, val) {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) return;
    let parcialData = obtenerParcialActualObj();
    let alumno = parcialData.alumnos.find(a => a.id === alumnoId);
    if (!alumno) return;
    if (!alumno.extrasStatus) alumno.extrasStatus = {};

    alumno.extrasStatus[colId] = Number(val) || 0;
    calcularCalificacionAlumno(alumno, parcialData);
    guardarYRenderizar(false);
}

function calcularCalificacionAlumno(alumno, parcialData) {
    let metaFirmas = parcialData.metaFirmas || 10;
    let pAct = parcialData.pAct !== undefined ? parcialData.pAct : 40;
    let pExam = parcialData.pExam !== undefined ? parcialData.pExam : 40;
    let metaExamen = parcialData.metaExamen || 10;

    let puntajeFirmas = (alumno.firmas / metaFirmas) * 10;
    if (puntajeFirmas > 10) puntajeFirmas = 10;

    let califActividades = puntajeFirmas * (pAct / 100);
    
    let puntajeExamenNorm = (alumno.examen / metaExamen) * 10;
    if (puntajeExamenNorm > 10) puntajeExamenNorm = 10;
    let califExamenFinal = puntajeExamenNorm * (pExam / 100);

    let sumaExtras = 0;
    if (parcialData.columnasExtra && parcialData.columnasExtra.length > 0) {
        if (!alumno.extrasStatus) alumno.extrasStatus = {};
        parcialData.columnasExtra.forEach(col => {
            let valCol = Number(alumno.extrasStatus[col.id]) || 0;
            let metaCol = col.metaPts || 10;
            let puntajeCol = (valCol / metaCol) * (col.peso / 100) * 10;
            sumaExtras += puntajeCol;
        });
    }

    let final = (califActividades + califExamenFinal + sumaExtras);
    if (final > 10) final = 10;
    alumno.califFinal = Number(final.toFixed(1));
}

function eliminarAlumno(alumnoId) {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) {
        alert("⚠️ El grupo está bloqueado.");
        return;
    }
    if (confirm("¿Estás seguro de eliminar este alumno?")) {
        let parcialData = obtenerParcialActualObj();
        parcialData.alumnos = parcialData.alumnos.filter(a => a.id !== alumnoId);
        guardarYRenderizar();
    }
}

function cambiarEstadoRecuperacion(alumnoId) {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) return;
    let parcialData = obtenerParcialActualObj();
    let alumno = parcialData.alumnos.find(a => a.id === alumnoId);
    if (!alumno) return;

    if (alumno.estado === 'Regular') alumno.estado = 'Recuperación';
    else if (alumno.estado === 'Recuperación') alumno.estado = 'Recursamiento';
    else alumno.estado = 'Regular';

    guardarYRenderizar();
}

function verAlumnosRecuperacion() {
    let parcialData = obtenerParcialActualObj();
    let filtrados = parcialData.alumnos.filter(a => a.estado !== 'Regular');
    if (filtrados.length === 0) {
        alert("No hay alumnos en recuperación o recursamiento en este parcial.");
        return;
    }
    let msg = "Alumnos en Recuperación / Recursamiento:\n";
    filtrados.forEach(a => { msg += `- ${a.nombre} (${a.estado})\n`; });
    alert(msg);
}

function guardarYRenderizar(rederizarCompleto = true) {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo) {
        guardarGrupoEnFirebase(grupo);
    }
    
    if (rederizarCompleto) {
        renderizarTablaAlumnos();
    } else {
        let parcialData = obtenerParcialActualObj();
        parcialData.alumnos.forEach(a => {
            calcularCalificacionAlumno(a, parcialData);
            let spanCalif = document.getElementById(`calif_${a.id}`);
            if (spanCalif) spanCalif.innerText = a.califFinal || 0;
        });
        renderizarTablaAlumnos();
    }
}

function renderizarTablaAlumnos() {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    let bloqueado = grupo && grupo.bloqueado;

    let parcialData = obtenerParcialActualObj();
    const container = document.getElementById('tablaAlumnosContainer');
    let lblParcial = document.getElementById('lblParcialActualTabla');
    if(lblParcial) lblParcial.innerText = document.getElementById('selectParcialActivo').value;

    if (!parcialData || parcialData.alumnos.length === 0) {
        container.innerHTML = `<p style="color: var(--text-gray); text-align: center; padding: 25px;">No hay alumnos registrados en este parcial.</p>`;
        let detalleElem = document.getElementById('detalleNombresActividades');
        if(detalleElem) detalleElem.innerHTML = "Sin actividades creadas.";
        return;
    }

    let filtroTexto = document.getElementById('inputBuscadorAlumnoTabla') ? document.getElementById('inputBuscadorAlumnoTabla').value.toUpperCase() : "";
    let alumnosFiltrados = parcialData.alumnos.filter(a => a.nombre.includes(filtroTexto));

    let detalleHtml = "<ul>";
    if (parcialData.tareas && parcialData.tareas.length > 0) {
        parcialData.tareas.forEach((t, idx) => {
            let infoFechas = (t.fechaInicio || t.fechaFin) ? `<br><small style="color:var(--text-gray);">Del: ${t.fechaInicio || 'N/A'} al: ${t.fechaFin || 'N/A'}</small>` : '';
            detalleHtml += `<li style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span><b>ACT ${idx + 1}:</b> ${t.nombre} ${infoFechas}</span>
                <div>
                    ${bloqueado ? '' : `<button class="btn-regresar" style="padding: 2px 6px; font-size: 0.8rem; margin-right: 4px;" onclick="editarFechasTarea('${t.id}')">📅 Fechas</button>`}
                    ${bloqueado ? '' : `<button class="btn-regresar" style="padding: 2px 6px; color: var(--danger-red); font-size: 0.8rem;" onclick="eliminarTareaGrupo('${t.id}')">❌ Eliminar</button>`}
                </div>
            </li>`;
        });
    } else {
        detalleHtml += "<li>No hay actividades creadas.</li>";
    }
    detalleHtml += "</ul>";
    let detalleElem = document.getElementById('detalleNombresActividades');
    if(detalleElem) detalleElem.innerHTML = detalleHtml;

    let html = `
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Nombre Completo</th>
    `;

    if (parcialData.tareas) {
        parcialData.tareas.forEach((t, index) => {
            let fechasHeader = (t.fechaInicio || t.fechaFin) ? `<br><small style="font-weight: normal; font-size: 0.75rem; color: var(--text-gray);">📅 ${t.fechaInicio || '...'} ➔ ${t.fechaFin || '...'}</small>` : '';
            html += `<th>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <span>ACT ${index + 1}<br><strong style="font-size: 0.85rem;">${t.nombre}</strong>${fechasHeader}</span>
                    ${bloqueado ? '' : `<button style="background: none; border: none; cursor: pointer; font-size: 0.75rem;" onclick="editarFechasTarea('${t.id}')" title="Modificar fechas">✏</button>`}
                </div>
            </th>`;
        });
    }

    if (parcialData.columnasExtra) {
        parcialData.columnasExtra.forEach(col => {
            html += `<th>${col.nombre} (${col.peso}% / Meta: ${col.metaPts || 10})</th>`;
        });
    }

    html += `
                    <th>Firmas</th>
                    <th>Examen (Meta: ${parcialData.metaExamen || 10})</th>
                    <th>Calif. Final</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    alumnosFiltrados.forEach((a, index) => {
        if (!a.tareasStatus) a.tareasStatus = {};
        if (!a.extrasStatus) a.extrasStatus = {};
        calcularCalificacionAlumno(a, parcialData);

        let badgeClass = "badge-regular";
        if (a.estado === 'Recuperación') badgeClass = "badge-recuperacion";
        if (a.estado === 'Recursamiento') badgeClass = "badge-recursamiento";

        html += `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <b>${a.nombre}</b><br>
                    <span class="badge-estado ${badgeClass}" style="cursor: ${bloqueado ? 'default' : 'pointer'};" ${bloqueado ? '' : `onclick="cambiarEstadoRecuperacion(${a.id})"`} title="${bloqueado ? 'Grupo bloqueado' : 'Click para cambiar estado'}">${a.estado || 'Regular'}</span>
                </td>
        `;

        if (parcialData.tareas) {
            parcialData.tareas.forEach(t => {
                let checked = a.tareasStatus[t.id] ? "checked" : "";
                html += `<td><input type="checkbox" ${checked} ${bloqueado ? 'disabled' : ''} onchange="cambiarEstadoTarea(${a.id}, '${t.id}')"></td>`;
            });
        }

        if (parcialData.columnasExtra) {
            parcialData.columnasExtra.forEach(col => {
                let valExtra = a.extrasStatus[col.id] !== undefined ? a.extrasStatus[col.id] : 0;
                html += `<td><input type="number" value="${valExtra}" ${bloqueado ? 'disabled' : ''} style="width: 65px; padding: 4px;" oninput="actualizarColumnaExtraAlumno(${a.id}, '${col.id}', this.value)"></td>`;
            });
        }

        html += `
                <td>
                    ${bloqueado ? '' : `<button class="btn-regresar" style="padding: 2px 8px;" onclick="cambiarFirmaAlumno(${a.id}, -1)">-</button>`}
                    <span style="margin: 0 6px; font-weight: bold;">${a.firmas}</span>
                    ${bloqueado ? '' : `<button class="btn-regresar" style="padding: 2px 8px;" onclick="cambiarFirmaAlumno(${a.id}, 1)">+</button>`}
                </td>
                <td>
                    <input type="number" value="${a.examen || 0}" ${bloqueado ? 'disabled' : ''} style="width: 65px; padding: 4px;" oninput="actualizarExamenAlumno(${a.id}, this.value)">
                </td>
                <td><b id="calif_${a.id}" style="color: ${a.califFinal >= 6 ? '#047857' : 'var(--danger-red)'}; font-size: 1rem;">${a.califFinal || 0}</b></td>
                <td>
                    ${bloqueado ? '-' : `<button class="btn-regresar" style="padding: 5px 8px; color: var(--danger-red);" onclick="eliminarAlumno(${a.id})" title="Eliminar alumno">🗑️</button>`}
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function exportarExcelGrupo() {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (!grupo) return;
    let parcialData = obtenerParcialActualObj();

    let datosExportar = parcialData.alumnos.map((a, i) => ({
        "No.": i + 1,
        "Nombre Completo": a.nombre,
        "Estado": a.estado || "Regular",
        "Firmas": a.firmas,
        "Examen": a.examen,
        "Calificación Final": a.califFinal || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Calificaciones");
    XLSX.writeFile(workbook, `${grupo.nombre}_Calificaciones.xlsx`);
}

function renderizarGrupos(listaGrupos) {
    const grid = document.getElementById('gridGrupos');
    if(!grid) return;
    if (listaGrupos.length === 0) {
        grid.innerHTML = `<p style="color: var(--text-gray); grid-column: span 2; text-align: center; padding: 30px;">No se encontraron grupos registrados.</p>`;
        return;
    }

    let html = '';
    listaGrupos.forEach(g => {
        let totalAlumnos = g.parciales && g.parciales["1er Parcial"] && g.parciales["1er Parcial"].alumnos ? g.parciales["1er Parcial"].alumnos.length : 0;
        let estadoBloqueo = g.bloqueado ? "🔒 Bloqueado" : "🔓 Activo";
        let logoCardHtml = logoPortalGlobal ? `<img src="${logoPortalGlobal}" class="logo-card-preview">` : "📁";

        html += `
            <div class="group-card">
                <div class="group-info" onclick="abrirGrupo('${g.id}')">
                    <h3>${logoCardHtml} ${g.nombre}</h3>
                    <p>👥 Alumnos (1er P.): <b>${totalAlumnos}</b></p>
                    <p>Estado: <b>${estadoBloqueo}</b></p>
                </div>
                <div class="card-footer">
                    <button class="btn-entrar" onclick="abrirGrupo('${g.id}')">Entrar al panel →</button>
                    <button class="btn-eliminar-grupo" onclick="eliminarGrupo('${g.id}', event)">Eliminar</button>
                </div>
            </div>
        `;
    });
    grid.innerHTML = html;
}

function filtrarGrupos() {
    let inputSearch = document.getElementById('inputBuscadorGrupos');
    if(!inputSearch) return;
    inputSearch.value = inputSearch.value.toUpperCase();
    let texto = inputSearch.value.toLowerCase();
    let filtrados = misGrupos.filter(g => g.nombre.toLowerCase().includes(texto));
    renderizarGrupos(filtrados);
}

function promptCrearGrupo() {
    let nombreGrupo = prompt("Escribe el nombre del nuevo grupo (Ej: 4TPROG):");
    if (!nombreGrupo) return;

    let nombreLimpio = nombreGrupo.trim().toUpperCase();
    let nuevoGrupo = {
        id: 'g_' + Date.now(),
        nombre: nombreLimpio,
        bloqueado: false,
        parciales: {
            "1er Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 },
            "2do Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 },
            "3er Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 }
        }
    };

    misGrupos.push(nuevoGrupo);
    guardarGrupoEnFirebase(nuevoGrupo);
    renderizarGrupos(misGrupos);
}

async function eliminarGrupo(id, event) {
    event.stopPropagation();
    let grupo = misGrupos.find(g => g.id === id);
    if (confirm(`¿Estás seguro de eliminar el grupo "${grupo ? grupo.nombre : ''}"?`)) {
        try {
            await deleteDoc(doc(db, "grupos", String(grupo.nombre.replace(/\s+/g, '_').toUpperCase())));
        } catch (e) {
            console.error("Error al borrar en Firebase:", e);
        }
        misGrupos = misGrupos.filter(g => g.id !== id);
        localStorage.setItem('cecyteq_mis_grupos', JSON.stringify(misGrupos));
        renderizarGrupos(misGrupos);
    }
}

function dispararImportacionGrupo() {
    document.getElementById('csvGrupoInput').click();
}

function importarArchivoGeneral(event) {
    const file = event.target.files[0];
    if (!file) return;
    let nombreSugerido = file.name.replace(/\.[^/.]+$/, "").toUpperCase();
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
        importarPDF(file, nombreSugerido);
    } else {
        importarExcelOCSV(file, nombreSugerido);
    }
}

function importarPDF(file, nombreSugerido) {
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const typedarray = new Uint8Array(e.target.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let textoCompleto = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                textoCompleto = textoCompleto.concat(textContent.items.map(item => item.str.trim()).filter(s => s.length > 0));
            }

            let alumnosImportados = [];
            let nombresVistos = new Set();

            for (let i = 0; i < textoCompleto.length; i++) {
                let item = textoCompleto[i];
                let num = parseInt(item);
                if (!isNaN(num) && num >= 1 && num <= 60) {
                    let nombreConstruido = "";
                    let saltos = 0;
                    for (let j = i + 1; j < textoCompleto.length && saltos < 4; j++) {
                        let sig = textoCompleto[j];
                        if ((!isNaN(parseInt(sig)) && parseInt(sig) == num + 1) || sig.includes("CECYTEQ") || sig.includes("CICLO") || sig.includes("Lista")) {
                            break;
                        }
                        if (sig !== "" && isNaN(sig) && sig.length > 2) {
                            nombreConstruido += (nombreConstruido ? " " : "") + sig;
                            saltos++;
                        } else if (isNaN(sig) && sig.length <= 2 && sig !== "-") {
                            nombreConstruido += (nombreConstruido ? " " : "") + sig;
                        }
                    }

                    if (nombreConstruido && nombreConstruido.length > 5 && !nombresVistos.has(nombreConstruido)) {
                        let nombreLimpio = nombreConstruido.replace(/^[0-9]+\s*/, "").toUpperCase();
                        if (!nombresVistos.has(nombreLimpio)) {
                            nombresVistos.add(nombreLimpio);
                            alumnosImportados.push({
                                id: Date.now() + alumnosImportados.length,
                                nombre: nombreLimpio,
                                estado: "Regular",
                                firmas: 0,
                                examen: 0,
                                tareasStatus: {},
                                extrasStatus: {}
                            });
                        }
                    }
                }
            }

            let nombreFinalGrupo = prompt("Nombre asignado para este grupo de PDF:", nombreSugerido);
            if (!nombreFinalGrupo) return;

            let nuevoGrupo = {
                id: 'g_' + Date.now(),
                nombre: nombreFinalGrupo.trim().toUpperCase(),
                bloqueado: false,
                parciales: {
                    "1er Parcial": { alumnos: alumnosImportados, tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 },
                    "2do Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 },
                    "3er Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 }
                }
            };

            misGrupos.push(nuevoGrupo);
            guardarGrupoEnFirebase(nuevoGrupo);
            renderizarGrupos(misGrupos);
            alert(`¡PDF importado con éxito (${alumnosImportados.length} alumnos detectados)!`);
        } catch (err) {
            alert("Error al procesar PDF.");
        }
    };
    reader.readAsArrayBuffer(file);
}

function importarExcelOCSV(file, nombreSugerido) {
    let nombreGrupo = prompt("Nombre asignado para este grupo:", nombreSugerido);
    if (!nombreGrupo) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        let alumnosImportados = [];

        rows.forEach((row, i) => {
            if (row && row.length > 0) {
                let posibleNombre = "";
                row.forEach(cell => {
                    if (cell && String(cell).trim().length > 3 && isNaN(String(cell))) {
                        if (!posibleNombre) posibleNombre = String(cell).trim();
                    }
                });
                if (posibleNombre && !posibleNombre.toLowerCase().includes("nombre")) {
                    alumnosImportados.push({
                        id: Date.now() + i,
                        nombre: posibleNombre.toUpperCase(),
                        estado: "Regular",
                        firmas: 0,
                        examen: 0,
                        tareasStatus: {},
                        extrasStatus: {}
                    });
                }
            }
        });

        let nuevoGrupo = {
            id: 'g_' + Date.now(),
            nombre: nombreGrupo.trim().toUpperCase(),
            bloqueado: false,
            parciales: {
                "1er Parcial": { alumnos: alumnosImportados, tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 },
                "2do Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 },
                "3er Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 }
            }
        };

        misGrupos.push(nuevoGrupo);
        guardarGrupoEnFirebase(nuevoGrupo);
        renderizarGrupos(misGrupos);
        alert(`¡Excel importado con éxito (${alumnosImportados.length} alumnos)!`);
    };
    reader.readAsArrayBuffer(file);
}

function abrirEscanearQR() {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) {
        alert("⚠️ Grupo bloqueado.");
        return;
    }
    document.getElementById('modalQR').style.display = 'flex';
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => { cerrarEscanearQR(); procesarQRScanned(decodedText); },
        (err) => {}
    ).catch(err => { alert("No se pudo abrir la cámara."); cerrarEscanearQR(); });
}

function cerrarEscanearQR() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => { document.getElementById('modalQR').style.display = 'none'; }).catch(() => { document.getElementById('modalQR').style.display = 'none'; });
    } else {
        document.getElementById('modalQR').style.display = 'none';
    }
}

function procesarQRScanned(codigo) {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) {
        alert("⚠️ Grupo bloqueado.");
        return;
    }

    try {
        let partes = codigo.split(" | ");
        let datosQR = {};
        partes.forEach(parte => {
            let [clave, valor] = parte.split(":");
            if (clave && valor) {
                datosQR[clave.trim().toUpperCase()] = valor.trim();
            }
        });

        let alumnoQR = datosQR["ALUMNO"];
        let tareaQR = datosQR["TAREA"];

        if (!alumnoQR) {
            alert("⚠️ El código QR no tiene un formato válido.");
            return;
        }

        let parcialData = obtenerParcialActualObj();
        
        // CORRECCIÓN INCLUIDA: Limpieza y .toUpperCase() en ambos extremos para emparejar minúsculas del portal alumno con mayúsculas del maestro
        let alumnoQRMinLimpio = alumnoQR.trim().toUpperCase();
        let alumno = parcialData.alumnos.find(a => a.nombre.trim().toUpperCase() === alumnoQRMinLimpio);

        if (alumno) {
            if (!alumno.tareasStatus) alumno.tareasStatus = {};
            
            if (tareaQR && alumno.tareasStatus[tareaQR] === true) {
                alert(`⚠️ El alumno ${alumno.nombre} ya tiene registrada esta actividad previamente.`);
                return;
            }

            if (tareaQR) {
                alumno.tareasStatus[tareaQR] = true;
            }
            alumno.firmas = (alumno.firmas || 0) + 1;

            guardarYRenderizar();
            alert(`✅ ¡Registro exitoso por QR!\nAlumno: ${alumno.nombre}\nFirmas totales: ${alumno.firmas}`);
        } else {
            alert(`⚠️ Alumno "${alumnoQR}" no encontrado en este grupo.`);
        }

    } catch (e) {
        console.error("Error al procesar el QR:", e);
        alert("⚠️ Ocurrió un error al leer la estructura del código QR.");
    }
}

window.dispararImportacionGrupo = dispararImportacionGrupo;
window.importarArchivoGeneral = importarArchivoGeneral;
window.promptCrearGrupo = promptCrearGrupo;
window.abrirGrupo = abrirGrupo;
window.eliminarGrupo = eliminarGrupo;
window.cambiarVista = cambiarVista;
window.irAInicio = irAInicio;
window.toggleSeccion = toggleSeccion;
window.verHistorialIA = verHistorialIA;
window.dispararCargaLogoPortal = dispararCargaLogoPortal;
window.cargarLogoPortal = cargarLogoPortal;
window.cambiarParcialGrupo = cambiarParcialGrupo;
window.guardarPonderaciones = guardarPonderaciones;
window.agregarColumnaExtra = agregarColumnaExtra;
window.eliminarColumnaExtra = eliminarColumnaExtra;
window.alternarCandadoGrupo = alternarCandadoGrupo;
window.agregarTareaGrupo = agregarTareaGrupo;
window.editarFechasTarea = editarFechasTarea;
window.eliminarTareaGrupo = eliminarTareaGrupo;
window.agregarAlumnoGrupo = agregarAlumnoGrupo;
window.cambiarFirmaAlumno = cambiarFirmaAlumno;
window.cambiarEstadoTarea = cambiarEstadoTarea;
window.actualizarExamenAlumno = actualizarExamenAlumno;
window.actualizarColumnaExtraAlumno = actualizarColumnaExtraAlumno;
window.eliminarAlumno = eliminarAlumno;
window.cambiarEstadoRecuperacion = cambiarEstadoRecuperacion;
window.verAlumnosRecuperacion = verAlumnosRecuperacion;
window.exportarExcelGrupo = exportarExcelGrupo;
window.filtrarGrupos = filtrarGrupos;
window.abrirEscanearQR = abrirEscanearQR;
window.cerrarEscanearQR = cerrarEscanearQR;