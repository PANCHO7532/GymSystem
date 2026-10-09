/**
 * GymSystem — rutinas.js
 * Lógica del módulo de rutinas.
 * Dependencias: auth.js (debe cargarse antes)
 */

// Verificar si el token expiró
  }


  const NIVELES = ['Principiante', 'Intermedio', 'Avanzado'];
  const NIVEL_CLASS = { 'Principiante': 'nivel-principiante', 'Intermedio': 'nivel-intermedio', 'Avanzado': 'nivel-avanzado' };
  const NIVEL_EMOJI = { 'Principiante': '🌱', 'Intermedio': '⚡', 'Avanzado': '🔥' };

  let rutinas     = [];
  let rutinasFilt = [];
  let ejercicios  = [];          // biblioteca de ejercicios
  let nivelActual = 'Todos';
  let rutinaEdit  = null;
  let ejsModal    = [];          // ejercicios del modal en curso

  // ── Carga inicial ────────────────────────────────────────────────────────────
  async function init() {
    await Promise.all([cargarRutinas(), cargarEjercicios()]);
  }

  async function cargarRutinas() {
    try {
      const res = await fetch(`${API_BASE}/api/rutinas`, { headers: authHeaders() });
      rutinas = res.ok ? await res.json() : [];
    } catch {
      rutinas = [];
      showToast('Sin conexión a la API', 'error');
    }
    actualizarStats();
    renderFiltros();
    filtrar();
  }

  async function cargarSociosYProfesores() {
    try {
      const [resSocios, resProfesores] = await Promise.all([
        fetch(`${API_BASE}/api/socios`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/profesores/combo`, { headers: authHeaders() })
      ]);
      if (resSocios.ok) {
        const socios = await resSocios.json();
        const activos = socios.filter(s => s.activo !== false);
        document.getElementById('fSocio').innerHTML =
          '<option value="">Seleccioná un socio...</option>' +
          activos.map(s => `<option value="${s.idSocio}">${s.apellido} ${s.nombre}</option>`).join('');
      }
      if (resProfesores.ok) {
        const profs = await resProfesores.json();
        document.getElementById('fProfesor').innerHTML =
          '<option value="">Seleccioná un profesor...</option>' +
          profs.map(p => `<option value="${p.idProfesor}">${p.nombre}</option>`).join('');
      }
    } catch {}
  }

  async function cargarEjercicios() {
    try {
      const res = await fetch(`${API_BASE}/api/ejercicios`, { headers: authHeaders() });
      ejercicios = res.ok ? await res.json() : [];
    } catch { ejercicios = []; }
    poblarSelectEjercicios();
  }

  function poblarSelectEjercicios() {
    const sel = document.getElementById('fEjercicioSel');
    const prevVal = sel.value;
    // Agrupar por grupoMuscular
    const grupos = {};
    ejercicios.forEach(e => {
      const g = e.grupoMuscular || 'Otros';
      if (!grupos[g]) grupos[g] = [];
      grupos[g].push(e);
    });
    sel.innerHTML = '<option value="">Seleccioná un ejercicio...</option>';
    Object.entries(grupos).sort(([a],[b]) => a.localeCompare(b)).forEach(([grupo, list]) => {
      const og = document.createElement('optgroup');
      og.label = grupo;
      list.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.idEjercicio;
        opt.textContent = e.nombre;
        og.appendChild(opt);
      });
      sel.appendChild(og);
    });
    if (prevVal) sel.value = prevVal;
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  function actualizarStats() {
    document.getElementById('statTotal').textContent        = rutinas.length;
    document.getElementById('statPrincipiante').textContent = rutinas.filter(r => r.nivel === 'Principiante').length;
    document.getElementById('statIntermedio').textContent   = rutinas.filter(r => r.nivel === 'Intermedio').length;
    document.getElementById('statAvanzado').textContent     = rutinas.filter(r => r.nivel === 'Avanzado').length;
  }

  // ── Filtros por nivel ────────────────────────────────────────────────────────
  function renderFiltros() {
    const niveles = ['Todos', ...NIVELES];
    const wrap = document.getElementById('filtrosWrap');
    wrap.innerHTML = niveles.map(n => {
      const count = n === 'Todos' ? rutinas.length : rutinas.filter(r => r.nivel === n).length;
      const emoji = n === 'Todos' ? '📋' : NIVEL_EMOJI[n];
      return `<button class="filtro-chip ${n === nivelActual ? 'active' : ''}" onclick="seleccionarNivel('${n}')">
        <span>${emoji}</span> ${n} <span class="chip-count">${count}</span>
      </button>`;
    }).join('');
  }

  function seleccionarNivel(n) {
    nivelActual = n;
    renderFiltros();
    filtrar();
  }

  // ── Filtrar ──────────────────────────────────────────────────────────────────
  function filtrar() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    rutinasFilt = rutinas.filter(r => {
      const matchNivel = nivelActual === 'Todos' || r.nivel === nivelActual;
      const matchQ = !q ||
        (r.nombre    || '').toLowerCase().includes(q) ||
        (r.objetivo  || '').toLowerCase().includes(q) ||
        (r.tipo      || '').toLowerCase().includes(q) ||
        (r.nivel     || '').toLowerCase().includes(q);
      return matchNivel && matchQ;
    });
    document.getElementById('countLabel').textContent =
      rutinasFilt.length === rutinas.length
        ? `${rutinas.length} rutinas en total`
        : `${rutinasFilt.length} de ${rutinas.length} rutinas`;
    renderGrid();
  }

  // ── Render grid ──────────────────────────────────────────────────────────────
  function renderGrid() {
    const grid = document.getElementById('rutinasGrid');
    if (!rutinasFilt.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <span>📋</span>
          <h3>Sin rutinas</h3>
          <p>No se encontraron rutinas con esos filtros.<br>Cambiá el nivel o la búsqueda, o creá una nueva.</p>
        </div>`;
      return;
    }
    grid.innerHTML = rutinasFilt.map((r, i) => {
      const nivelClass = NIVEL_CLASS[r.nivel] || 'nivel-principiante';
      const ejerciciosArr = r.ejercicios || [];
      const preview = ejerciciosArr.slice(0, 3);
      const mas     = ejerciciosArr.length - 3;

      const nombreSocio    = r.nombreSocio    || r.NombreSocio    || null;
      const nombreProfesor = r.nombreProfesor || r.NombreProfesor || null;

      return `
        <div class="rutina-card" style="animation-delay:${i * .04}s">
          <div class="rut-header">
            <span class="rut-nivel-badge ${nivelClass}">${r.nivel || '—'}</span>
            <div class="rut-nombre">${r.nombre || '—'}</div>
            <div class="rut-objetivo">${r.objetivo || 'Sin descripción.'}</div>
          </div>
          <div class="rut-meta">
            ${nombreSocio    ? `<div class="rut-meta-item"><span>👤</span><span><strong>${nombreSocio}</strong></span></div>` : ''}
            ${nombreProfesor ? `<div class="rut-meta-item"><span>🏅</span><span><strong>${nombreProfesor}</strong></span></div>` : ''}
            ${r.diasSemana ? `<div class="rut-meta-item"><span>📅</span><span><strong>${r.diasSemana}</strong> días/sem</span></div>` : ''}
            ${r.duracionMinutos ? `<div class="rut-meta-item"><span>⏱</span><span><strong>${r.duracionMinutos}</strong> min</span></div>` : ''}
            ${r.tipo ? `<div class="rut-meta-item"><span>🎯</span><span><strong>${r.tipo}</strong></span></div>` : ''}
            ${ejerciciosArr.length ? `<div class="rut-meta-item"><span>💪</span><span><strong>${ejerciciosArr.length}</strong> ejercicios</span></div>` : ''}
          </div>
          ${ejerciciosArr.length ? `
          <div class="rut-ejercicios-preview">
            <div class="rut-ej-label">Ejercicios</div>
            <div class="rut-ej-list">
              ${preview.map((ej, idx) => `
                <div class="rut-ej-item">
                  <span class="rut-ej-num">${idx + 1}</span>
                  <span class="rut-ej-name">${ej.nombreEjercicio || ej.nombre || '—'}</span>
                  ${ej.series || ej.repeticiones ? `<span class="rut-ej-detail">${ej.series ? ej.series + 's' : ''} ${ej.repeticiones ? '× ' + ej.repeticiones : ''}</span>` : ''}
                </div>`).join('')}
              ${mas > 0 ? `<div class="rut-ej-more">+${mas} más...</div>` : ''}
            </div>
          </div>` : ''}
          <div class="rut-actions">
            <button class="btn-sm accent" onclick="verDetalle(${r.idRutina})">👁 Ver</button>
            <button class="btn-sm" onclick="editarRutina(${r.idRutina})">✏ Editar</button>
            <button class="btn-sm danger" onclick="eliminarRutina(${r.idRutina},'${(r.nombre||'').replace(/'/g,'')}')">🗑</button>
          </div>
        </div>`;
    }).join('');
  }

  // ── Ver detalle ───────────────────────────────────────────────────────────────
  async function verDetalle(id) {
    const r = rutinas.find(x => x.idRutina === id);
    if (!r) return;

    // Mostrar el modal con spinner mientras carga los ejercicios
    document.getElementById('detalleContenido').innerHTML = `
      <div style="padding:60px;text-align:center;color:var(--muted);">
        <div style="font-size:32px;margin-bottom:12px;">⏳</div>
        <div style="font-size:14px;">Cargando ejercicios...</div>
      </div>`;
    document.getElementById('modalDetalle').classList.add('open');

    // Cargar ejercicios desde la API
    let ejArr = [];
    try {
      const res = await fetch(`${API_BASE}/api/rutinas/${id}/ejercicios`, { headers: authHeaders() });
      if (res.ok) ejArr = await res.json();
    } catch { /* si falla, mostramos igual sin ejercicios */ }

    const nivelClass = NIVEL_CLASS[r.nivel] || 'nivel-principiante';
    const nombreSocio    = r.nombreSocio    || r.NombreSocio    || '—';
    const nombreProfesor = r.nombreProfesor || r.NombreProfesor || '—';

    document.getElementById('detalleContenido').innerHTML = `
      <div class="detalle-header">
        <span class="detalle-nivel ${nivelClass}">${NIVEL_EMOJI[r.nivel] || ''} ${r.nivel || '—'}</span>
        <div class="detalle-nombre">${r.nombre || '—'}</div>
        ${r.objetivo ? `<div class="detalle-objetivo">${r.objetivo}</div>` : ''}
      </div>
      <div class="detalle-meta-row">
        <div class="detalle-meta-item">
          <span class="detalle-meta-icon">👤</span>
          <div><div class="detalle-meta-val" style="font-size:15px">${nombreSocio}</div><div class="detalle-meta-label">Socio</div></div>
        </div>
        <div class="detalle-meta-item">
          <span class="detalle-meta-icon">🏅</span>
          <div><div class="detalle-meta-val" style="font-size:15px">${nombreProfesor}</div><div class="detalle-meta-label">Profesor</div></div>
        </div>
        ${r.diasSemana ? `<div class="detalle-meta-item"><span class="detalle-meta-icon">📅</span><div><div class="detalle-meta-val">${r.diasSemana}</div><div class="detalle-meta-label">Días / sem</div></div></div>` : ''}
        ${r.duracionMinutos ? `<div class="detalle-meta-item"><span class="detalle-meta-icon">⏱</span><div><div class="detalle-meta-val">${r.duracionMinutos} min</div><div class="detalle-meta-label">Duración</div></div></div>` : ''}
        ${r.tipo ? `<div class="detalle-meta-item"><span class="detalle-meta-icon">🎯</span><div><div class="detalle-meta-val">${r.tipo}</div><div class="detalle-meta-label">Objetivo</div></div></div>` : ''}
        <div class="detalle-meta-item"><span class="detalle-meta-icon">💪</span><div><div class="detalle-meta-val">${ejArr.length}</div><div class="detalle-meta-label">Ejercicios</div></div></div>
      </div>
      <div class="detalle-body">
        ${ejArr.length ? `
        <div class="detalle-section-title">EJERCICIOS</div>
        <table class="detalle-ej-table">
          <thead><tr>
            <th>#</th><th>Ejercicio</th><th>Grupo</th><th>Series</th><th>Reps / Tiempo</th><th>Descanso</th>
          </tr></thead>
          <tbody>
            ${ejArr.map((ej, idx) => `
              <tr class="detalle-ej-row">
                <td class="detalle-ej-idx">${idx + 1}</td>
                <td><strong>${ej.ejercicio || ej.nombreEjercicio || ej.nombre || '—'}</strong></td>
                <td><span class="detalle-ej-grupo-tag">${ej.grupoMuscular || '—'}</span></td>
                <td>${ej.serie || ej.series || '—'}</td>
                <td>${ej.repeticion || ej.repeticiones || '—'}</td>
                <td>${ej.descansoSeg ? ej.descansoSeg + 's' : (ej.descansoSegundos ? ej.descansoSegundos + 's' : '—')}</td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<p style="color:var(--muted);font-size:13px">Esta rutina no tiene ejercicios asignados.</p>'}
        ${r.notas ? `
        <div class="detalle-notas" style="margin-top:20px">
          <div class="detalle-section-title" style="margin-bottom:10px">NOTAS</div>
          <p>${r.notas}</p>
        </div>` : ''}
      </div>`;
  }

  // ── Modal nueva / editar ─────────────────────────────────────────────────────
  function abrirModalNueva() {
    rutinaEdit = null;
    ejsModal   = [];
    cargarSociosYProfesores();
    document.getElementById('fSocio').value             = '';
    document.getElementById('fProfesor').value          = '';
    document.getElementById('modalTitle').textContent   = 'NUEVA RUTINA';
    document.getElementById('btnGuardar').textContent   = 'GUARDAR';
    document.getElementById('fNombre').value            = '';
    document.getElementById('fObjetivo').value          = '';
    document.getElementById('fNivel').value             = '';
    document.getElementById('fDias').value              = '';
    document.getElementById('fDuracion').value          = '';
    document.getElementById('fTipo').value              = '';
    document.getElementById('fNotas').value             = '';
    document.getElementById('fEjercicioSel').value      = '';
    document.getElementById('fSeries').value            = '';
    document.getElementById('fReps').value              = '';
    renderEjsModal();
    document.getElementById('modalOverlay').classList.add('open');
    setTimeout(() => document.getElementById('fNombre').focus(), 200);
  }

  function editarRutina(id) {
    const r = rutinas.find(x => x.idRutina === id);
    if (!r) return;
    rutinaEdit = r;
    ejsModal   = (r.ejercicios || []).map(e => ({
      idEjercicio:     e.idEjercicio,
      nombre:          e.nombreEjercicio || e.nombre || '—',
      grupoMuscular:   e.grupoMuscular   || '',
      series:          e.series          || '',
      repeticiones:    e.repeticiones    || '',
    }));
    document.getElementById('modalTitle').textContent   = 'EDITAR RUTINA';
    document.getElementById('btnGuardar').textContent   = 'ACTUALIZAR';
    cargarSociosYProfesores().then(() => {
      document.getElementById('fSocio').value    = r.idSocio    || '';
      document.getElementById('fProfesor').value = r.idProfesor || '';
    });
    document.getElementById('fNombre').value            = r.nombre            || '';
    document.getElementById('fObjetivo').value          = r.objetivo          || '';
    document.getElementById('fNivel').value             = r.nivel             || '';
    document.getElementById('fDias').value              = r.diasSemana        || '';
    document.getElementById('fDuracion').value          = r.duracionMinutos   || '';
    document.getElementById('fTipo').value              = r.tipo              || '';
    document.getElementById('fNotas').value             = r.notas             || '';
    document.getElementById('fEjercicioSel').value      = '';
    document.getElementById('fSeries').value            = '';
    document.getElementById('fReps').value              = '';
    renderEjsModal();
    document.getElementById('modalOverlay').classList.add('open');
  }

  // ── Gestión de ejercicios dentro del modal ────────────────────────────────────
  function agregarEjercicioModal() {
    const selId = document.getElementById('fEjercicioSel').value;
    if (!selId) { showToast('Seleccioná un ejercicio', 'error'); return; }
    const series = document.getElementById('fSeries').value.trim();
    const reps   = document.getElementById('fReps').value.trim();

    // Buscar datos del ejercicio
    const ej = ejercicios.find(e => String(e.idEjercicio) === String(selId));
    ejsModal.push({
      idEjercicio:   selId,
      nombre:        ej ? ej.nombre : 'Ejercicio',
      grupoMuscular: ej ? (ej.grupoMuscular || '') : '',
      series:        series,
      repeticiones:  reps,
    });
    document.getElementById('fEjercicioSel').value = '';
    document.getElementById('fSeries').value       = '';
    document.getElementById('fReps').value         = '';
    renderEjsModal();
  }

  function quitarEjModal(idx) {
    ejsModal.splice(idx, 1);
    renderEjsModal();
  }

  function renderEjsModal() {
    const cont = document.getElementById('ejListaModal');
    if (!ejsModal.length) {
      cont.innerHTML = '<div class="ej-empty-hint">Todavía no agregaste ejercicios. Seleccioná uno arriba y presioná Agregar.</div>';
      return;
    }
    cont.innerHTML = ejsModal.map((ej, i) => `
      <div class="ej-modal-item">
        <span class="ej-modal-num">${i + 1}</span>
        <span class="ej-modal-name">${ej.nombre}</span>
        <span class="ej-modal-series">${ej.series ? ej.series + ' series' : ''} ${ej.repeticiones ? '× ' + ej.repeticiones : ''}</span>
        <button class="btn-ej-remove" onclick="quitarEjModal(${i})">✕</button>
      </div>`).join('');
  }

  // ── CRUD Rutinas ──────────────────────────────────────────────────────────────
  async function guardarRutina() {
    const nombre = document.getElementById('fNombre').value.trim();
    const nivel  = document.getElementById('fNivel').value;
    if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }
    if (!nivel)  { showToast('Seleccioná un nivel', 'error'); return; }

    const btn = document.getElementById('btnGuardar');
    btn.disabled = true; btn.textContent = '...';

    const idSocio    = parseInt(document.getElementById('fSocio').value);
    const idProfesor = parseInt(document.getElementById('fProfesor').value);
    if (!idSocio)    { showToast('Seleccioná un socio', 'error'); btn.disabled=false; btn.textContent='GUARDAR'; return; }
    if (!idProfesor) { showToast('Seleccioná un profesor', 'error'); btn.disabled=false; btn.textContent='GUARDAR'; return; }

    const body = {
      idSocio,
      idProfesor,
      nombre,
      objetivo:        document.getElementById('fObjetivo').value.trim() || null,
      nivel,
      diasSemana:      parseInt(document.getElementById('fDias').value)     || null,
      duracionMinutos: parseInt(document.getElementById('fDuracion').value) || null,
      tipo:            document.getElementById('fTipo').value               || null,
      notas:           document.getElementById('fNotas').value.trim()       || null,
      ejercicios: ejsModal.map((ej, i) => ({
        idEjercicio:   ej.idEjercicio,
        orden:         i + 1,
        series:        ej.series        || null,
        repeticiones:  ej.repeticiones  || null,
      })),
    };

    try {
      let res;
      if (rutinaEdit) {
        res = await fetch(`${API_BASE}/api/rutinas/${rutinaEdit.idRutina}`, {
          method: 'PUT', headers: authHeaders(), body: JSON.stringify(body)
        });
        if (!res.ok) {
          // Fallback: DELETE + POST si la API no tiene PUT
          await fetch(`${API_BASE}/api/rutinas/${rutinaEdit.idRutina}`, { method: 'DELETE', headers: authHeaders() });
          res = await fetch(`${API_BASE}/api/rutinas`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
        }
      } else {
        res = await fetch(`${API_BASE}/api/rutinas`, {
          method: 'POST', headers: authHeaders(), body: JSON.stringify(body)
        });
      }

      if (res.ok) {
        showToast(rutinaEdit ? 'Rutina actualizada correctamente' : 'Rutina creada correctamente', 'success');
        cerrarModal('modalOverlay');
        await cargarRutinas();
      } else {
        showToast('Error al guardar la rutina', 'error');
      }
    } catch { showToast('Sin conexión a la API', 'error'); }
    finally {
      btn.disabled = false;
      btn.textContent = rutinaEdit ? 'ACTUALIZAR' : 'GUARDAR';
    }
  }

  async function eliminarRutina(id, nombre) {
    if (!confirm(`¿Eliminar la rutina "${nombre}"?\nEsta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/rutinas/${id}`, {
        method: 'DELETE', headers: authHeaders()
      });
      if (res.ok) {
        showToast(`"${nombre}" eliminada correctamente`, 'success');
        await cargarRutinas();
      } else { showToast('No se pudo eliminar la rutina', 'error'); }
    } catch { showToast('Sin conexión a la API', 'error'); }
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  function cerrarModal(id) { document.getElementById(id).classList.remove('open'); }
  function cerrarModalSiOverlay(e, id) { if (e.target === document.getElementById(id)) cerrarModal(id); }

  // ── Toast ─────────────────────────────────────────────────────────────────────


  init();
