/**
 * GymSystem — clases.js
 * Lógica del módulo de clases.
 * Dependencias: auth.js (debe cargarse antes)
 */



  const DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const diaHoy = diasSemana[new Date().getDay()];

  let clases = [];
  let diaActual = diaHoy;
  let claseEditando = null;

  function renderDiasTabs() {
    document.getElementById('diasTabs').innerHTML = ['Todos', ...DIAS].map(dia => {
      const esHoy   = dia === diaHoy && dia !== 'Todos';
      const activo  = dia === diaActual;
      const count   = dia === 'Todos' ? clases.length : clases.filter(c => c.diaSemana === dia).length;
      return `<button class="dia-btn ${activo ? 'active' : ''} ${esHoy ? 'hoy' : ''}" onclick="seleccionarDia('${dia}')">
        ${dia} <span style="opacity:.5;font-size:11px">${count}</span>
      </button>`;
    }).join('');
  }

  function seleccionarDia(dia) {
    diaActual = dia;
    renderDiasTabs();
    renderClases();
  }

  async function cargarClases() {
    try {
      const res = await fetch(`${API_BASE}/api/clases`, { headers: authHeaders() });
      clases = res.ok ? await res.json() : [];
    } catch { clases = []; showToast('Sin conexión a la API', 'error'); }
    actualizarStats();
    renderDiasTabs();
    renderClases();
    cargarProfesores();
  }

  function actualizarStats() {
    document.getElementById('statTotal').textContent    = clases.length;
    document.getElementById('statActivas').textContent  = clases.filter(c => c.activo).length;
    document.getElementById('statCapacidad').textContent = clases.reduce((a, c) => a + (c.capacidadMax || 0), 0);
    document.getElementById('statHoy').textContent      = clases.filter(c => c.diaSemana === diaHoy).length;
  }

  function renderClases() {
    const grid = document.getElementById('clasesGrid');
    const filtradas = diaActual === 'Todos'
      ? clases
      : clases.filter(c => c.diaSemana === diaActual);

    if (!filtradas.length) {
      grid.innerHTML = `<div class="empty-state">
        <span>🏃</span><h3>Sin clases</h3>
        <p>No hay clases para ${diaActual === 'Todos' ? 'esta semana' : diaActual}.<br>Creá la primera con el botón de arriba.</p>
      </div>`;
      return;
    }

    const ordenadas = [...filtradas].sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''));
    grid.innerHTML = ordenadas.map((c, i) => {
      const ocupados = (c.capacidadMax || 0) - (c.lugaresDisponible || 0);
      const pct      = c.capacidadMax ? (ocupados / c.capacidadMax) * 100 : 0;
      const color    = pct >= 90 ? 'var(--error)' : pct >= 70 ? '#ffc847' : 'var(--success)';
      const llena    = c.lugaresDisponible === 0;
      return `
        <div class="clase-card ${llena ? 'llena' : ''}" style="animation-delay:${i * .05}s">
          <div class="clase-header">
            <div>
              <div class="clase-tipo">${c.tipoNombre || 'Entrenamiento'}</div>
              <div class="clase-dia-tag">${c.diaSemana || '—'}</div>
            </div>
            <div class="clase-horario">${(c.horaInicio || '--:--').slice(0,5)}<br>${(c.horaFin || '--:--').slice(0,5)}</div>
          </div>
          <div class="clase-profesor">
            <div class="prof-avatar">${(c.nombreProfesor || '?').charAt(0).toUpperCase()}</div>
            <span>${c.nombreProfesor || 'Sin profesor asignado'}</span>
          </div>
          <div class="clase-capacidad">
            <div class="cap-row">
              <span class="cap-label">Lugares disponibles</span>
              <span style="font-weight:500;color:${color}">${c.lugaresDisponible}/${c.capacidadMax}</span>
            </div>
            <div class="cap-bar">
              <div class="cap-fill" style="width:${pct}%;background:${color}"></div>
            </div>
          </div>
          <div class="clase-inscripcion">
            <button class="btn-inscribir" onclick="cambiarLugar(${c.idClase},-1)" ${llena ? 'disabled title="Clase llena"' : ''}>＋ Inscribir socio</button>
            <button class="btn-desinscribir" onclick="cambiarLugar(${c.idClase},+1)" ${ocupados===0 ? 'disabled title="Sin inscriptos"' : ''}>－ Dar de baja</button>
          </div>
          <div class="clase-actions">
            <button class="btn-sm" onclick="editarClase(${c.idClase})">✏ Editar</button>
            <button class="btn-sm danger" onclick="eliminarClase(${c.idClase},'${(c.tipoNombre||'').replace(/'/g,'')}')">🗑 Eliminar</button>
          </div>
        </div>`;
    }).join('');
  }

  async function cargarProfesores() {
    try {
      const res = await fetch(`${API_BASE}/api/profesores`, { headers: authHeaders() });
      if (res.ok) {
        const profs = await res.json();
        document.getElementById('fProfesor').innerHTML =
          '<option value="">Seleccioná un profesor...</option>' +
          profs.filter(p => p.activo).map(p => `<option value="${p.idProfesor}">${p.apellido} ${p.nombre}</option>`).join('');
        return;
      }
    } catch {}
    // Si no hay endpoint de profesores, extraer de clases existentes
    const profsMap = new Map(clases.map(c => [c.idProfesor, c.nombreProfesor]));
    document.getElementById('fProfesor').innerHTML =
      '<option value="">Seleccioná un profesor...</option>' +
      [...profsMap.entries()].map(([id, nom]) => `<option value="${id}">${nom}</option>`).join('');
  }

  function abrirModal() {
    claseEditando = null;
    document.getElementById('modalTitle').textContent = 'NUEVA CLASE';
    document.getElementById('btnGuardar').textContent = 'GUARDAR';
    ['fTipo','fProfesor','fDia','fHoraInicio','fHoraFin','fCapacidad'].forEach(id => {
      document.getElementById(id).value = '';
    });
    if (diaActual !== 'Todos') document.getElementById('fDia').value = diaActual;
    document.getElementById('modalOverlay').classList.add('open');
  }

  function editarClase(id) {
    const c = clases.find(x => x.idClase === id);
    if (!c) return;
    claseEditando = c;
    document.getElementById('modalTitle').textContent = 'EDITAR CLASE';
    document.getElementById('btnGuardar').textContent = 'ACTUALIZAR';
    document.getElementById('fTipo').value       = c.idTipoEntrenamiento || '';
    document.getElementById('fProfesor').value   = c.idProfesor || '';
    document.getElementById('fDia').value        = c.diaSemana || '';
    document.getElementById('fHoraInicio').value = (c.horaInicio || '').slice(0, 5);
    document.getElementById('fHoraFin').value    = (c.horaFin || '').slice(0, 5);
    document.getElementById('fCapacidad').value  = c.capacidadMax || '';
    document.getElementById('modalOverlay').classList.add('open');
  }

  async function guardarClase() {
    const idTipo     = document.getElementById('fTipo').value;
    const idProfesor = document.getElementById('fProfesor').value;
    const dia        = document.getElementById('fDia').value;
    const horaInicio = document.getElementById('fHoraInicio').value;
    const horaFin    = document.getElementById('fHoraFin').value;
    const capacidad  = document.getElementById('fCapacidad').value;

    if (!idTipo || !idProfesor || !dia || !horaInicio || !horaFin || !capacidad) {
      showToast('Completá todos los campos obligatorios', 'error'); return;
    }

    const btn = document.getElementById('btnGuardar');
    btn.disabled = true;

    try {
      let res;
      if (claseEditando) {
        res = await fetch(`${API_BASE}/api/clases/${claseEditando.idClase}`, {
          method: 'PUT', headers: authHeaders(),
          body: JSON.stringify({ idProfesor: +idProfesor, diaSemana: dia, horaInicio, horaFin, capacidadMax: +capacidad, activo: true })
        });
      } else {
        res = await fetch(`${API_BASE}/api/clases`, {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({ idTipoEntrenamiento: +idTipo, idProfesor: +idProfesor, diaSemana: dia, horaInicio, horaFin, capacidadMax: +capacidad })
        });
      }
      if (res.ok) {
        showToast(claseEditando ? 'Clase actualizada correctamente' : 'Clase creada correctamente', 'success');
        cerrarModal();
        await cargarClases();
      } else {
        showToast('Error al guardar la clase', 'error');
      }
    } catch { showToast('Sin conexión a la API', 'error'); }
    finally {
      btn.disabled = false;
      btn.textContent = claseEditando ? 'ACTUALIZAR' : 'GUARDAR';
    }
  }

  async function cambiarLugar(id, delta) {
    // delta = -1 → inscribir (ocupa un lugar), +1 → dar de baja (libera un lugar)
    const c = clases.find(x => x.idClase === id);
    if (!c) return;
    const nuevoLugares = (c.lugaresDisponible || 0) + delta;
    if (nuevoLugares < 0 || nuevoLugares > c.capacidadMax) return;
    try {
      const res = await fetch(`${API_BASE}/api/clases/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          idTipoEntrenamiento: c.idTipoEntrenamiento,
          idProfesor:          c.idProfesor,
          diaSemana:           c.diaSemana,
          horaInicio:          c.horaInicio,
          horaFin:             c.horaFin,
          capacidadMax:        c.capacidadMax,
          lugaresDisponible:   nuevoLugares,
          activo:              c.activo
        })
      });
      if (res.ok) {
        c.lugaresDisponible = nuevoLugares;
        renderClases();
        showToast(delta === -1 ? '✅ Inscripción registrada' : '✅ Baja registrada', 'success');
      } else {
        showToast('Error al actualizar lugares', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    }
  }

  async function eliminarClase(id, nombre) {
    if (!confirm(`¿Eliminar la clase de ${nombre}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/clases/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) { showToast('Clase eliminada', 'success'); await cargarClases(); }
      else { showToast('No se pudo eliminar', 'error'); }
    } catch { showToast('Sin conexión', 'error'); }
  }

  function cerrarModal() { document.getElementById('modalOverlay').classList.remove('open'); }
  function cerrarModalSiOverlay(e) { if (e.target === document.getElementById('modalOverlay')) cerrarModal(); }


  cargarClases();
