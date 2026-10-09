/**
 * GymSystem — socios.js
 * Lógica del módulo de socios.
 * Dependencias: auth.js (debe cargarse antes)
 */

// User info


  // ── Estado ───────────────────────────────────────────────────────────────────
  let socios      = [];
  let sociosFiltrados = [];
  let paginaActual = 1;
  const porPagina  = 10;
  let socioEditando = null;
  let socioDetalle  = null;

  // ── Cargar socios ─────────────────────────────────────────────────────────────
  async function cargarSocios() {
    try {
      const res = await fetch(`${API_BASE}/api/socios`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      socios = await res.json();
    } catch {
      socios = [];
      showToast('No se pudo conectar con la API', 'error');
    }
    actualizarStats();
    filtrarSocios();
  }

  function actualizarStats() {
    const activos   = socios.filter(s => s.activo).length;
    const inactivos = socios.length - activos;
    document.getElementById('statTotal').textContent    = socios.length;
    document.getElementById('statActivos').textContent  = activos;
    document.getElementById('statInactivos').textContent = inactivos;
  }

  // ── Filtrar ───────────────────────────────────────────────────────────────────
  function filtrarSocios() {
    const q      = document.getElementById('searchInput').value.toLowerCase();
    const estado = document.getElementById('filterEstado').value;

    sociosFiltrados = socios.filter(s => {
      const matchTexto = !q ||
        (s.nombre  || '').toLowerCase().includes(q) ||
        (s.apellido || '').toLowerCase().includes(q) ||
        (s.dni      || '').toLowerCase().includes(q) ||
        (s.email    || '').toLowerCase().includes(q);
      const matchEstado = estado === '' || String(s.activo) === estado;
      return matchTexto && matchEstado;
    });

    paginaActual = 1;
    renderTabla();
  }

  // ── Render tabla ──────────────────────────────────────────────────────────────
  function renderTabla() {
    const tbody  = document.getElementById('tablaSocios');
    const inicio = (paginaActual - 1) * porPagina;
    const fin    = inicio + porPagina;
    const pagina = sociosFiltrados.slice(inicio, fin);

    if (!pagina.length) {
      tbody.innerHTML = `
        <tr><td colspan="6">
          <div class="empty-state">
            <span>🔍</span>
            <h3>Sin resultados</h3>
            <p>No se encontraron socios con esos filtros</p>
          </div>
        </td></tr>`;
      document.getElementById('pagInfo').textContent = '0 resultados';
      document.getElementById('pagBtns').innerHTML = '';
      return;
    }

    tbody.innerHTML = pagina.map(s => `
      <tr onclick="verDetalle(${s.idSocio})" style="animation: fadeUp .3s ease both">
        <td>
          <div class="socio-info">
            <div class="socio-avatar">${s.fotoUrl ? `<img src="${s.fotoUrl}" alt="${s.apellido || ''}" onerror="this.parentElement.innerHTML='${(s.apellido||'?').charAt(0).toUpperCase()}'">` : (s.apellido || '?').charAt(0).toUpperCase()}</div>
            <div>
              <div class="socio-name">${s.apellido || ''} ${s.nombre || ''}</div>
              <div class="socio-dni">DNI: ${s.dni || '—'}</div>
            </div>
          </div>
        </td>
        <td>${s.telefono || '—'}</td>
        <td>${s.email || '—'}</td>
        <td>${s.fechaAlta ? formatFecha(s.fechaAlta) : '—'}</td>
        <td><span class="badge ${s.activo ? 'badge-green' : 'badge-red'}">${s.activo ? 'Activo' : 'Inactivo'}</span></td>
        <td onclick="event.stopPropagation()">
          <div class="actions">
            <button class="btn-icon" title="Editar" onclick="abrirModalEditar(${s.idSocio})">✏</button>
            <button class="btn-icon ${s.activo ? 'danger' : ''}" 
              title="${s.activo ? 'Desactivar' : 'Activar'}" 
              onclick="toggleEstado(${s.idSocio}, ${s.activo}, '${s.apellido} ${s.nombre}')">
              ${s.activo ? '🔴' : '🟢'}
            </button>
            <button class="btn-icon danger" title="Eliminar" 
              onclick="confirmarEliminar(${s.idSocio}, '${s.apellido} ${s.nombre}')">🗑</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Paginación
    const totalPag = Math.ceil(sociosFiltrados.length / porPagina);
    document.getElementById('pagInfo').textContent =
      `Mostrando ${inicio + 1}–${Math.min(fin, sociosFiltrados.length)} de ${sociosFiltrados.length} socios`;

    const pagBtns = document.getElementById('pagBtns');
    let html = `<button class="pag-btn" onclick="cambiarPagina(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled' : ''}>‹</button>`;
    for (let i = 1; i <= totalPag; i++) {
      if (totalPag <= 7 || i === 1 || i === totalPag || Math.abs(i - paginaActual) <= 1) {
        html += `<button class="pag-btn ${i === paginaActual ? 'active' : ''}" onclick="cambiarPagina(${i})">${i}</button>`;
      } else if (Math.abs(i - paginaActual) === 2) {
        html += `<button class="pag-btn" disabled>…</button>`;
      }
    }
    html += `<button class="pag-btn" onclick="cambiarPagina(${paginaActual + 1})" ${paginaActual === totalPag ? 'disabled' : ''}>›</button>`;
    pagBtns.innerHTML = html;
  }

  function cambiarPagina(n) {
    const totalPag = Math.ceil(sociosFiltrados.length / porPagina);
    if (n < 1 || n > totalPag) return;
    paginaActual = n;
    renderTabla();
    document.querySelector('.main').scrollTop = 0;
  }


  // ── MODAL NUEVO ────────────────────────────────────────────────────────────────
  function abrirModalNuevo() {
    socioEditando = null;
    document.getElementById('modalTitle').textContent = 'NUEVO SOCIO';
    document.getElementById('btnGuardar').textContent = 'GUARDAR';
    limpiarForm();
    document.getElementById('modalOverlay').classList.add('open');
  }

  function abrirModalEditar(id) {
    const s = socios.find(x => x.idSocio === id);
    if (!s) return;
    socioEditando = s;
    document.getElementById('modalTitle').textContent = 'EDITAR SOCIO';
    document.getElementById('btnGuardar').textContent = 'ACTUALIZAR';
    document.getElementById('fApellido').value  = s.apellido  || '';
    document.getElementById('fNombre').value    = s.nombre    || '';
    document.getElementById('fDni').value       = s.dni       || '';
    document.getElementById('fTelefono').value  = s.telefono  || '';
    document.getElementById('fEmail').value     = s.email     || '';
    document.getElementById('fDireccion').value = s.direccion || '';
    document.getElementById('fFotoUrl').value    = s.fotoUrl   || '';
    if (s.fechaNacimiento) document.getElementById('fFechaNac').value = s.fechaNacimiento.split('T')[0];
    document.getElementById('modalOverlay').classList.add('open');
  }

  function cerrarModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    limpiarForm();
  }

  function cerrarModalSiOverlay(e) {
    if (e.target === document.getElementById('modalOverlay')) cerrarModal();
  }

  function limpiarForm() {
    ['fApellido','fNombre','fDni','fTelefono','fEmail','fDireccion','fFechaNac','fFotoUrl']
      .forEach(id => document.getElementById(id).value = '');
  }

  // ── GUARDAR ───────────────────────────────────────────────────────────────────
  async function guardarSocio() {
    const apellido = document.getElementById('fApellido').value.trim();
    const nombre   = document.getElementById('fNombre').value.trim();
    const dni      = document.getElementById('fDni').value.trim();

    if (!apellido || !nombre || !dni) {
      showToast('Apellido, nombre y DNI son obligatorios', 'error');
      return;
    }

    const btn = document.getElementById('btnGuardar');
    btn.disabled = true;
    btn.textContent = '...';

    const body = {
      apellido, nombre, dni,
      telefono:        document.getElementById('fTelefono').value.trim()  || null,
      email:           document.getElementById('fEmail').value.trim()     || null,
      direccion:       document.getElementById('fDireccion').value.trim() || null,
      fechaNacimiento: document.getElementById('fFechaNac').value         || null,
      fotoUrl:         document.getElementById('fFotoUrl').value.trim()   || null,
    };

    try {
      let res;
      if (socioEditando) {
        res = await fetch(`${API_BASE}/api/socios/${socioEditando.idSocio}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ ...body, activo: socioEditando.activo })
        });
      } else {
        res = await fetch(`${API_BASE}/api/socios`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(body)
        });
      }

      if (res.ok) {
        showToast(socioEditando ? 'Socio actualizado correctamente' : 'Socio creado correctamente', 'success');
        cerrarModal();
        await cargarSocios();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.title || 'Error al guardar el socio', 'error');
      }
    } catch {
      showToast('No se pudo conectar con la API', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = socioEditando ? 'ACTUALIZAR' : 'GUARDAR';
    }
  }

  // ── ELIMINAR ──────────────────────────────────────────────────────────────────
  async function confirmarEliminar(id, nombre) {
    if (!confirm(`¿Eliminar permanentemente a ${nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/socios/${id}`, {
        method: 'DELETE', headers: authHeaders()
      });
      if (res.ok) {
        showToast(`${nombre} eliminado correctamente`, 'success');
        await cargarSocios();
      } else {
        showToast('Error al eliminar el socio', 'error');
      }
    } catch {
      showToast('No se pudo conectar con la API', 'error');
    }
  }

  async function eliminarDesdeDetail() {
    if (!socioDetalle) return;
    cerrarDetail();
    await confirmarEliminar(socioDetalle.idSocio,
      `${socioDetalle.apellido} ${socioDetalle.nombre}`);
  }

  // ── TOGGLE ACTIVO / INACTIVO ──────────────────────────────────────────────────
  async function toggleEstado(id, estaActivo, nombre) {
    const accion  = estaActivo ? 'desactivar' : 'activar';
    const mensaje = estaActivo ? `¿Desactivar a ${nombre}?` : `¿Activar a ${nombre}?`;
    if (!confirm(mensaje)) return;
    try {
      const res = await fetch(`${API_BASE}/api/socios/${id}/${accion}`, {
        method: 'PATCH', headers: authHeaders()
      });
      if (res.ok) {
        showToast(`${nombre} ${estaActivo ? 'desactivado' : 'activado'} correctamente`, 'success');
        await cargarSocios();
      } else {
        showToast(`Error al ${accion} el socio`, 'error');
      }
    } catch {
      showToast('No se pudo conectar con la API', 'error');
    }
  }

  async function toggleEstadoDesdeDetail() {
    if (!socioDetalle) return;
    await toggleEstado(socioDetalle.idSocio, socioDetalle.activo,
      `${socioDetalle.apellido} ${socioDetalle.nombre}`);
    cerrarDetail();
  }

  // ── DETALLE ───────────────────────────────────────────────────────────────────
  function verDetalle(id) {
    const s = socios.find(x => x.idSocio === id);
    if (!s) return;
    socioDetalle = s;

    const body = document.getElementById('detailBody');
    body.innerHTML = `
      <div style="text-align:center;padding-bottom:16px;border-bottom:1px solid var(--border)">
        <div class="detail-avatar">${s.fotoUrl ? `<img src="${s.fotoUrl}" alt="${s.apellido || ''}" onerror="this.parentElement.innerHTML='${(s.apellido||'?').charAt(0).toUpperCase()}'">` : (s.apellido || '?').charAt(0).toUpperCase()}</div>
        <div class="detail-name">${s.apellido || ''} ${s.nombre || ''}</div>
        <div class="detail-dni">DNI: ${s.dni || '—'}</div>
        <div style="margin-top:8px">
          <span class="badge ${s.activo ? 'badge-green' : 'badge-red'}">${s.activo ? 'Activo' : 'Inactivo'}</span>
        </div>
      </div>
      <div>
        <div class="detail-section-title">Información de contacto</div>
        <div class="detail-row"><span class="detail-label">Teléfono</span><span class="detail-value">${s.telefono || '—'}</span></div>
        <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${s.email || '—'}</span></div>
        <div class="detail-row"><span class="detail-label">Dirección</span><span class="detail-value">${s.direccion || '—'}</span></div>
      </div>
      <div>
        <div class="detail-section-title">Datos personales</div>
        <div class="detail-row"><span class="detail-label">Fecha nacimiento</span><span class="detail-value">${s.fechaNacimiento ? formatFecha(s.fechaNacimiento) : '—'}</span></div>
        <div class="detail-row"><span class="detail-label">Fecha alta</span><span class="detail-value">${formatFecha(s.fechaAlta)}</span></div>
        <div class="detail-row"><span class="detail-label">ID Socio</span><span class="detail-value">#${s.idSocio}</span></div>
      </div>
    `;

    // Actualizar texto del botón según estado
    const btnDelete = document.getElementById('btnDetailDelete');
    const btnTxt    = document.getElementById('btnDetailDeleteTxt');
    if (s.activo) {
      btnDelete.style.borderColor = 'var(--error)';
      btnDelete.style.color       = 'var(--error)';
      btnTxt.textContent          = '🔴 DESACTIVAR';
    } else {
      btnDelete.style.borderColor = '#22c55e';
      btnDelete.style.color       = '#22c55e';
      btnTxt.textContent          = '🟢 ACTIVAR';
    }

    document.getElementById('detailOverlay').classList.add('open');
  }

  function cerrarDetail() {
    document.getElementById('detailOverlay').classList.remove('open');
  }

  function cerrarDetailSiOverlay(e) {
    if (e.target === document.getElementById('detailOverlay')) cerrarDetail();
  }

  function editarDesdeDetail() {
    if (!socioDetalle) return;
    cerrarDetail();
    abrirModalEditar(socioDetalle.idSocio);
  }

  function eliminarDesdeDetail() {
    if (!socioDetalle) return;
    cerrarDetail();
    confirmarBaja(socioDetalle.idSocio, `${socioDetalle.apellido} ${socioDetalle.nombre}`);
  }

  // ── TOAST ─────────────────────────────────────────────────────────────────────


  // ── Init ──────────────────────────────────────────────────────────────────────
  cargarSocios();
