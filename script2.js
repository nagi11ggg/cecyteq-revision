import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
    if (!estadoActual) seccion.classList.add('active');
}

function verHistorialIA() {
    alert("🤖 Historial de IA próximamente disponible.");
}

function abrirGrupo(id) {
    grupoActualId = id;
    let grupo = misGrupos.find(g => g.id === id);
    if (!grupo) return;

    if (!grupo.parciales) {
        grupo.parciales = {
            "1er Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 },
            "2do Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 },
            "3er Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 }
        };
    }

    document.getElementById('tituloGrupoActivo').innerText = `Grupo: ${grupo.nombre}`;
    document.getElementById('selectParcialActivo').value = "1er Parcial";
    
    sincronizarInputsPonderacionUI();
    actualizarEstadoCandadoUI(grupo);
    sincronizarAlumnosEntreParciales();
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

// Sincroniza y ordena alfabéticamente los alumnos entre parciales
function sincronizarAlumnosEntreParciales() {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (!grupo || !grupo.parciales) return;

    let parcialesKeys = Object.keys(grupo.parciales);
    let primerParcialAlumnos = grupo.parciales["1er Parcial"] ? grupo.parciales["1er Parcial"].alumnos : [];

    parcialesKeys.forEach(pKey => {
        if (!grupo.parciales[pKey].alumnos) grupo.parciales[pKey].alumnos = [];
        
        primerParcialAlumnos.forEach(alumnoBase => {
            let existe = grupo.parciales[pKey].alumnos.find(a => a.id === alumnoBase.id || a.nombre === alumnoBase.nombre);
            if (!existe) {
                grupo.parciales[pKey].alumnos.push({
                    id: alumnoBase.id || Date.now() + Math.random(),
                    nombre: alumnoBase.nombre,
                    estado: alumnoBase.estado || "Regular",
                    firmas: 0,
                    examen: 0,
                    califFinal: 0,
                    tareasStatus: {},
                    extrasStatus: {}
                });
            }
        });
        // Ordenar alfabéticamente por nombre en cada parcial
        grupo.parciales[pKey].alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre));
    });
}

function obtenerParcialActualObj() {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (!grupo) return null;
    let parcialNombre = document.getElementById('selectParcialActivo').value;
    if (!grupo.parciales[parcialNombre]) {
        grupo.parciales[parcialNombre] = { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 };
    }
    sincronizarAlumnosEntreParciales();
    return grupo.parciales[parcialNombre];
}

function sincronizarInputsPonderacionUI() {
    let parcialData = obtenerParcialActualObj();
    if (!parcialData) return;
    document.getElementById('inputMetaFirmas').value = parcialData.metaFirmas || 10;
    document.getElementById('inputPorcentajeAct').value = parcialData.pAct !== undefined ? parcialData.pAct : 40;
    document.getElementById('inputPorcentajeExam').value = parcialData.pExam !== undefined ? parcialData.pExam : 40;
    document.getElementById('inputMetaExamen').value = parcialData.metaExamen || 10;
    
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    let bloqueado = grupo && grupo.bloqueado;

    let htmlExtra = "<b>Columnas extra:</b> ";
    if (parcialData.columnasExtra && parcialData.columnasExtra.length > 0) {
        htmlExtra += parcialData.columnasExtra.map(c => `${c.nombre} (${c.peso}%) ${bloqueado ? '' : `<button style="color:var(--danger-red);background:none;border:none;cursor:pointer;" onclick="eliminarColumnaExtra('${c.id}')">❌</button>`}`).join(" | ");
    } else {
        htmlExtra += "Ninguna.";
    }
    let listaExtraElem = document.getElementById('listaColumnasExtraContainer');
    if(listaExtraElem) listaExtraElem.innerHTML = htmlExtra;
}

function cambiarParcialGrupo() {
    sincronizarInputsPonderacionUI();
    renderizarTablaAlumnos();
}

function guardarPonderaciones() {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) {
        alert("⚠️ Grupo bloqueado.");
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
    if (grupo && grupo.bloqueado) return;
    let parcialData = obtenerParcialActualObj();
    let nombre = document.getElementById('inputNombreColExtra').value.trim().toUpperCase();
    let peso = Number(document.getElementById('inputPorcentajeColExtra').value) || 0;
    let metaPts = Number(document.getElementById('inputMetaColExtra').value) || 10;

    if (!nombre) { alert("Escribe el nombre."); return; }

    let idCol = 'col_' + Date.now();
    if(!parcialData.columnasExtra) parcialData.columnasExtra = [];
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
    if (grupo && grupo.bloqueado) return;
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
    if (grupo && grupo.bloqueado) return;
    let parcialData = obtenerParcialActualObj();
    let nombreTarea = document.getElementById('inputNombreTarea').value.trim().toUpperCase();
    let fechaInicio = document.getElementById('inputFechaInicio').value;
    let fechaFin = document.getElementById('inputFechaFin').value;

    if (!nombreTarea) { alert("Escribe el nombre de la actividad."); return; }

    if (!parcialData.tareas) parcialData.tareas = [];
    let nuevaId = 't_' + Date.now();
    parcialData.tareas.push({ id: nuevaId, nombre: nombreTarea, fechaInicio, fechaFin });

    parcialData.alumnos.forEach(a => {
        if (!a.tareasStatus) a.tareasStatus = {};
        a.tareasStatus[nuevaId] = false;
    });

    document.getElementById('inputNombreTarea').value = '';
    guardarYRenderizar();
    alert(`✅ Actividad "${nombreTarea}" agregada.`);
}

function editarFechasTarea(tareaId) {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) return;
    let parcialData = obtenerParcialActualObj();
    let tarea = parcialData.tareas.find(t => t.id === tareaId);
    if (!tarea) return;

    let nuevaInicio = prompt("Fecha de Inicio (AAAA-MM-DD):", tarea.fechaInicio || "");
    if (nuevaInicio === null) return;
    let nuevaFin = prompt("Fecha de Entrega (AAAA-MM-DD):", tarea.fechaFin || "");
    if (nuevaFin === null) return;

    tarea.fechaInicio = nuevaInicio;
    tarea.fechaFin = nuevaFin;
    guardarYRenderizar();
}

function eliminarTareaGrupo(tareaId) {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) return;
    if (!confirm("¿Eliminar actividad?")) return;

    let parcialData = obtenerParcialActualObj();
    parcialData.tareas = parcialData.tareas.filter(t => t.id !== tareaId);
    parcialData.alumnos.forEach(a => {
        if (a.tareasStatus && a.tareasStatus[tareaId]) {
            a.firmas = Math.max(0, a.firmas - 1);
        }
        delete a.tareasStatus[tareaId];
    });
    guardarYRenderizar();
}

function agregarAlumnoGrupo() {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) return;
    let parcialData = obtenerParcialActualObj();
    let nombre = document.getElementById('inputNombreAlumno').value.trim().toUpperCase();
    let estado = document.getElementById('selectEstadoInscripcion').value;

    if (!nombre) { alert("Escribe el nombre."); return; }

    let nuevoAlumno = {
        id: Date.now(),
        nombre: nombre,
        estado: estado,
        firmas: 0,
        examen: 0,
        tareasStatus: {},
        extrasStatus: {}
    };

    parcialData.alumnos.push(nuevoAlumno);
    
    // ORDENAR ALFABÉTICAMENTE AL AGREGAR NUEVO ALUMNO
    parcialData.alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre));

    document.getElementById('inputNombreAlumno').value = '';
    
    // Asegurar que aparezca en los demás parciales también (y se ordene)
    sincronizarAlumnosEntreParciales();
    guardarYRenderizar();
}

function cambiarFirmaAlumno(alumnoId, delta) {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) return;
    let parcialData = obtenerParcialActualObj();
    let alumno = parcialData.alumnos.find(a => a.id === alumnoId);
    if (!alumno) return;

    alumno.firmas = Math.max(0, alumno.firmas + delta);
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
    let actual = alumno.tareasStatus[tareaId];
    alumno.tareasStatus[tareaId] = !actual;

    if (alumno.tareasStatus[tareaId]) alumno.firmas += 1;
    else alumno.firmas = Math.max(0, alumno.firmas - 1);

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

    let puntajeFirmas = Math.min(10, (alumno.firmas / metaFirmas) * 10);
    let califActividades = puntajeFirmas * (pAct / 100);
    
    let puntajeExamenNorm = Math.min(10, (alumno.examen / metaExamen) * 10);
    let califExamenFinal = puntajeExamenNorm * (pExam / 100);

    let sumaExtras = 0;
    if (parcialData.columnasExtra) {
        parcialData.columnasExtra.forEach(col => {
            let valCol = Number(alumno.extrasStatus[col.id]) || 0;
            let metaCol = col.metaPts || 10;
            sumaExtras += (valCol / metaCol) * (col.peso / 100) * 10;
        });
    }

    let final = Math.min(10, califActividades + califExamenFinal + sumaExtras);
    alumno.califFinal = Number(final.toFixed(1));
}

function eliminarAlumno(alumnoId) {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) return;
    if (confirm("¿Eliminar alumno?")) {
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

function guardarYRenderizar(completo = true) {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo) guardarGrupoEnFirebase(grupo);
    renderizarTablaAlumnos();
}

function renderizarTablaAlumnos() {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    let bloqueado = grupo && grupo.bloqueado;
    let parcialData = obtenerParcialActualObj();
    const container = document.getElementById('tablaAlumnosContainer');
    let lblParcial = document.getElementById('lblParcialActualTabla');
    if(lblParcial) lblParcial.innerText = document.getElementById('selectParcialActivo').value;

    if (!parcialData || parcialData.alumnos.length === 0) {
        container.innerHTML = `<p style="color: var(--text-gray); text-align: center; padding: 20px;">No hay alumnos en este parcial.</p>`;
        return;
    }

    let filtro = document.getElementById('inputBuscadorAlumnoTabla') ? document.getElementById('inputBuscadorAlumnoTabla').value.toUpperCase() : "";
    let filtrados = parcialData.alumnos.filter(a => a.nombre.includes(filtro));

    let html = `<table><thead><tr><th>#</th><th>Nombre</th>`;
    if (parcialData.tareas) {
        parcialData.tareas.forEach((t, i) => html += `<th>ACT ${i+1}<br><small>${t.nombre}</small></th>`);
    }
    if (parcialData.columnasExtra) {
        parcialData.columnasExtra.forEach(c => html += `<th>${c.nombre}</th>`);
    }
    html += `<th>Firmas</th><th>Examen</th><th>Final</th><th>Acciones</th></tr></thead><tbody>`;

    filtrados.forEach((a, i) => {
        if (!a.tareasStatus) a.tareasStatus = {};
        if (!a.extrasStatus) a.extrasStatus = {};
        calcularCalificacionAlumno(a, parcialData);

        let badge = a.estado === 'Recuperación' ? 'badge-recuperacion' : (a.estado === 'Recursamiento' ? 'badge-recursamiento' : 'badge-regular');

        html += `<tr>
            <td>${i+1}</td>
            <td><b>${a.nombre}</b><br><span class="badge-estado ${badge}" ${bloqueado ? '' : `onclick="cambiarEstadoRecuperacion(${a.id})"`} style="cursor:pointer;">${a.estado || 'Regular'}</span></td>`;

        if (parcialData.tareas) {
            parcialData.tareas.forEach(t => {
                let chk = a.tareasStatus[t.id] ? "checked" : "";
                html += `<td><input type="checkbox" ${chk} ${bloqueado ? 'disabled' : ''} onchange="cambiarEstadoTarea(${a.id}, '${t.id}')"></td>`;
            });
        }

        if (parcialData.columnasExtra) {
            parcialData.columnasExtra.forEach(c => {
                let val = a.extrasStatus[c.id] !== undefined ? a.extrasStatus[c.id] : 0;
                html += `<td><input type="number" value="${val}" ${bloqueado ? 'disabled' : ''} style="width:55px;padding:4px;" oninput="actualizarColumnaExtraAlumno(${a.id}, '${c.id}', this.value)"></td>`;
            });
        }

        html += `
            <td>
                ${bloqueado ? '' : `<button class="btn-regresar" onclick="cambiarFirmaAlumno(${a.id}, -1)">-</button>`}
                <span style="margin:0 4px;font-weight:bold;">${a.firmas}</span>
                ${bloqueado ? '' : `<button class="btn-regresar" onclick="cambiarFirmaAlumno(${a.id}, 1)">+</button>`}
            </td>
            <td><input type="number" value="${a.examen || 0}" ${bloqueado ? 'disabled' : ''} style="width:55px;padding:4px;" oninput="actualizarExamenAlumno(${a.id}, this.value)"></td>
            <td><b style="color:${a.califFinal >= 6 ? '#047857' : 'var(--danger-red)'};">${a.califFinal || 0}</b></td>
            <td>${bloqueado ? '-' : `<button class="btn-regresar" style="color:var(--danger-red);" onclick="eliminarAlumno(${a.id})">🗑️</button>`}</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function exportarExcelGrupo() {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (!grupo) return;
    let parcialData = obtenerParcialActualObj();
    let datos = parcialData.alumnos.map((a, i) => ({
        "No.": i+1, "Nombre": a.nombre, "Estado": a.estado, "Firmas": a.firmas, "Examen": a.examen, "Final": a.califFinal
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Calificaciones");
    XLSX.writeFile(wb, `${grupo.nombre}_Calificaciones.xlsx`);
}

function renderizarGrupos(lista) {
    const grid = document.getElementById('gridGrupos');
    if(!grid) return;
    if (lista.length === 0) {
        grid.innerHTML = `<p style="color:var(--text-gray);text-align:center;padding:20px;">Sin grupos registrados.</p>`;
        return;
    }
    let html = '';
    lista.forEach(g => {
        let total = g.parciales && g.parciales["1er Parcial"] ? g.parciales["1er Parcial"].alumnos.length : 0;
        let estado = g.bloqueado ? "🔒 Bloqueado" : "🔓 Activo";
        let logo = logoPortalGlobal ? `<img src="${logoPortalGlobal}" class="logo-card-preview">` : "📁";
        html += `<div class="group-card">
            <div class="group-info" onclick="abrirGrupo('${g.id}')">
                <h3>${logo} ${g.nombre}</h3>
                <p>Alumnos: <b>${total}</b></p>
                <p>Estado: <b>${estado}</b></p>
            </div>
            <div class="card-footer">
                <button class="btn-entrar" onclick="abrirGrupo('${g.id}')">Entrar →</button>
                <button class="btn-eliminar-grupo" onclick="eliminarGrupo('${g.id}', event)">Eliminar</button>
            </div>
        </div>`;
    });
    grid.innerHTML = html;
}

function filtrarGrupos() {
    let text = document.getElementById('inputBuscadorGrupos').value.toUpperCase();
    let filtrados = misGrupos.filter(g => g.nombre.includes(text));
    renderizarGrupos(filtrados);
}

function promptCrearGrupo() {
    let nombre = prompt("Nombre del nuevo grupo (Ej: 4TPROG):");
    if (!nombre) return;
    let nuevo = {
        id: 'g_' + Date.now(),
        nombre: nombre.trim().toUpperCase(),
        bloqueado: false,
        parciales: {
            "1er Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 },
            "2do Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 },
            "3er Parcial": { alumnos: [], tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 }
        }
    };
    misGrupos.push(nuevo);
    guardarGrupoEnFirebase(nuevo);
    renderizarGrupos(misGrupos);
}

async function eliminarGrupo(id, event) {
    event.stopPropagation();
    let g = misGrupos.find(x => x.id === id);
    if (confirm(`¿Eliminar grupo "${g.nombre}"?`)) {
        try { await deleteDoc(doc(db, "grupos", g.nombre.replace(/\s+/g, '_').toUpperCase())); } catch(e){}
        misGrupos = misGrupos.filter(x => x.id !== id);
        localStorage.setItem('cecyteq_mis_grupos', JSON.stringify(misGrupos));
        renderizarGrupos(misGrupos);
    }
}

function dispararImportacionGrupo() { document.getElementById('csvGrupoInput').click(); }

function importarArchivoGeneral(event) {
    const file = event.target.files[0];
    if (!file) return;
    let sug = file.name.replace(/\.[^/.]+$/, "").toUpperCase();
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
        importarPDF(file, sug);
    } else {
        importarExcelOCSV(file, sug);
    }
}

function importarPDF(file, sug) {
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const typedarray = new Uint8Array(e.target.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let texto = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                let page = await pdf.getPage(i);
                let content = await page.getTextContent();
                texto = texto.concat(content.items.map(it => it.str.trim()).filter(s => s.length > 0));
            }
            let alumnos = [], vistos = new Set();
            for (let i = 0; i < texto.length; i++) {
                let num = parseInt(texto[i]);
                if (!isNaN(num) && num >= 1 && num <= 60) {
                    let nom = "";
                    for (let j = i+1; j < texto.length && j < i+5; j++) {
                        let sig = texto[j];
                        if (!isNaN(parseInt(sig)) || sig.includes("CECYTEQ") || sig.includes("CICLO")) break;
                        if (sig.length > 2 || isNaN(sig)) nom += (nom ? " " : "") + sig;
                    }
                    if (nom && !vistos.has(nom)) {
                        vistos.add(nom);
                        alumnos.push({ id: Date.now() + alumnos.length, nombre: nom.toUpperCase(), estado: "Regular", firmas: 0, examen: 0, tareasStatus: {}, extrasStatus: {} });
                    }
                }
            }
            
            // ORDENAR ALFABÉTICAMENTE AL IMPORTAR DESDE PDF
            alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre));

            let nombreGrupo = prompt("Nombre para este grupo:", sug);
            if (!nombreGrupo) return;
            let nuevo = {
                id: 'g_' + Date.now(),
                nombre: nombreGrupo.toUpperCase(),
                bloqueado: false,
                parciales: {
                    "1er Parcial": { alumnos, tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 },
                    "2do Parcial": { alumnos: JSON.parse(JSON.stringify(alumnos)), tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 },
                    "3er Parcial": { alumnos: JSON.parse(JSON.stringify(alumnos)), tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 }
                }
            };
            misGrupos.push(nuevo);
            guardarGrupoEnFirebase(nuevo);
            renderizarGrupos(misGrupos);
            alert(`¡Importado (${alumnos.length} alumnos ordenados alfabéticamente)!`);
        } catch(err) { alert("Error leyendo PDF."); }
    };
    reader.readAsArrayBuffer(file);
}

function importarExcelOCSV(file, sug) {
    let nombreGrupo = prompt("Nombre para este grupo:", sug);
    if (!nombreGrupo) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        let alumnos = [];
        rows.forEach((row, i) => {
            if (row && row.length > 0) {
                let nom = "";
                row.forEach(c => { if (c && String(c).trim().length > 3 && isNaN(c) && !nom) nom = String(c).trim(); });
                if (nom && !nom.toLowerCase().includes("nombre")) {
                    alumnos.push({ id: Date.now() + i, nombre: nom.toUpperCase(), estado: "Regular", firmas: 0, examen: 0, tareasStatus: {}, extrasStatus: {} });
                }
            }
        });

        // ORDENAR ALFABÉTICAMENTE AL IMPORTAR DESDE EXCEL/CSV
        alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre));

        let nuevo = {
            id: 'g_' + Date.now(),
            nombre: nombreGrupo.toUpperCase(),
            bloqueado: false,
            parciales: {
                "1er Parcial": { alumnos, tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 },
                "2do Parcial": { alumnos: JSON.parse(JSON.stringify(alumnos)), tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 },
                "3er Parcial": { alumnos: JSON.parse(JSON.stringify(alumnos)), tareas: [], columnasExtra: [], metaFirmas: 10, pAct: 40, pExam: 40, metaExamen: 10 }
            }
        };
        misGrupos.push(nuevo);
        guardarGrupoEnFirebase(nuevo);
        renderizarGrupos(misGrupos);
        alert(`¡Importado (${alumnos.length} alumnos ordenados alfabéticamente)!`);
    };
    reader.readAsArrayBuffer(file);
}

function abrirEscanearQR() {
    let grupo = misGrupos.find(g => g.id === grupoActualId);
    if (grupo && grupo.bloqueado) { alert("⚠️ Grupo bloqueado."); return; }
    document.getElementById('modalQR').style.display = 'flex';
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => { cerrarEscanearQR(); procesarQRScanned(decodedText); },
        (err) => {}
    ).catch(err => { alert("No se pudo iniciar cámara."); cerrarEscanearQR(); });
}

function cerrarEscanearQR() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => { document.getElementById('modalQR').style.display = 'none'; }).catch(() => { document.getElementById('modalQR').style.display = 'none'; });
    } else {
        document.getElementById('modalQR').style.display = 'none';
    }
}

function procesarQRScanned(codigo) {
    let parcialData = obtenerParcialActualObj();
    let query = codigo.toUpperCase().trim();
    let alumno = parcialData.alumnos.find(a => a.nombre.includes(query) || String(a.id).includes(query));
    
    if (alumno) {
        alumno.firmas += 1;
        calcularCalificacionAlumno(alumno, parcialData);
        guardarYRenderizar();
        alert(`✅ ¡Firma agregada a: ${alumno.nombre} (Firmas: ${alumno.firmas})!`);
    } else {
        alert(`⚠️ No se encontró ningún alumno con el código/nombre "${codigo}".`);
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
window.exportarExcelGrupo = exportarExcelGrupo;
window.filtrarGrupos = filtrarGrupos;
window.abrirEscanearQR = abrirEscanearQR;
window.cerrarEscanearQR = cerrarEscanearQR;