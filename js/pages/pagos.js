/**
 * GymSystem — pagos.js
 * Lógica del módulo de pagos.
 * Dependencias: auth.js (debe cargarse antes)
 */

// Verificar si el token expiró

  // ── Estado ───────────────────────────────────────────────────────────────────
  let pagos        = [];
  let pagosFilt    = [];
  let membresias   = [];
  let paginaActual = 1;
  const POR_PAG    = 12;
  let pagoEdit     = null;
  const hoy        = new Date();

  const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const MEDIO_ICON = { 'Efectivo':'💵', 'Débito':'💳', 'Crédito':'💳', 'Transferencia':'🏦', 'MercadoPago':'📱' };

  // ── Init ─────────────────────────────────────────────────────────────────────
  async function init() {
    poblarSelectoresFecha();
    await Promise.all([cargarPagos(), cargarMembresias()]);
    actualizarStats();
    actualizarResumen();
    poblarFiltroMes();
  }

  function poblarSelectoresFecha() {
    const selMes  = document.getElementById('resMes');
    const selAnio = document.getElementById('resAnio');
    const fMes    = document.getElementById('filterMesPago');

    MESES.slice(1).forEach((m, i) => {
      const opt = document.createElement('option');
      opt.value = String(i + 1).padStart(2, '0');
      opt.textContent = m;
      selMes.appendChild(opt);
    });
    selMes.value = String(hoy.getMonth() + 1).padStart(2, '0');

    for (let y = hoy.getFullYear(); y >= 2020; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      selAnio.appendChild(opt);
    }
    selAnio.value = hoy.getFullYear();

    // Período del modal
    document.getElementById('fPeriodoMes').value  = String(hoy.getMonth() + 1).padStart(2, '0');
    document.getElementById('fPeriodoAnio').value = hoy.getFullYear();
    document.getElementById('fFechaPago').value   = hoy.toISOString().split('T')[0];
  }

  function poblarFiltroMes() {
    const sel  = document.getElementById('filterMesPago');
    const años = [...new Set(pagos.map(p => p.periodoAnio))].sort((a,b) => b - a);
    sel.innerHTML = '<option value="">Todos los meses</option>';
    años.forEach(anio => {
      const mesesAnio = [...new Set(pagos.filter(p => p.periodoAnio === anio).map(p => p.periodoMes))].sort();
      mesesAnio.forEach(mes => {
        const opt = document.createElement('option');
        opt.value = `${anio}-${mes}`;
        opt.textContent = `${MESES[parseInt(mes)]} ${anio}`;
        sel.appendChild(opt);
      });
    });
  }

  // ── Cargar datos ─────────────────────────────────────────────────────────────
  async function cargarPagos() {
    try {
      const res = await fetch(`${API_BASE}/api/pagos`, { headers: authHeaders() });
      pagos = res.ok ? await res.json() : [];
    } catch {
      pagos = [];
      showToast('Sin conexión a la API', 'error');
    }
    filtrar();
  }

  async function cargarMembresias() {
    try {
      const res = await fetch(`${API_BASE}/api/membresias`, { headers: authHeaders() });
      membresias = res.ok ? await res.json() : [];
    } catch { membresias = []; }
    poblarSelectMembresias();
  }

  function poblarSelectMembresias() {
    const sel = document.getElementById('fMembresia');
    sel.innerHTML = '<option value="">Seleccioná una membresía...</option>' +
      membresias
        .filter(m => m.activo)
        .sort((a,b) => (a.nombreSocio||'').localeCompare(b.nombreSocio||''))
        .map(m => `<option value="${m.idMembresia}" data-monto="${m.precioMensual||0}" data-socio="${m.nombreSocio||''}" data-plan="${m.nombrePlan||''}">${m.nombreSocio || '—'} — ${m.nombrePlan || '—'}</option>`)
        .join('');
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────
  function actualizarStats() {
    const confirmados = pagos.filter(p => p.confirmado === true || p.confirmado === 1).length;
    const pendientes  = pagos.filter(p => !p.confirmado).length;

    const mes  = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = String(hoy.getFullYear());
    const recaudadoMes = pagos
      .filter(p => (p.confirmado === true || p.confirmado === 1) && String(p.periodoMes) === mes && String(p.periodoAnio) === anio)
      .reduce((acc, p) => acc + (p.monto || 0), 0);

    document.getElementById('statTotal').textContent       = pagos.length;
    document.getElementById('statConfirmados').textContent = confirmados;
    document.getElementById('statPendientes').textContent  = pendientes;
    document.getElementById('statMes').textContent         = `$${recaudadoMes.toLocaleString('es-AR')}`;
  }

  // ── Resumen mensual ───────────────────────────────────────────────────────────
  function actualizarResumen() {
    const mes  = document.getElementById('resMes').value;
    const anio = document.getElementById('resAnio').value;
    const pagosMes = pagos.filter(p =>
      String(p.periodoMes).padStart(2,'0') === mes &&
      String(p.periodoAnio) === String(anio) &&
      (p.confirmado === true || p.confirmado === 1)
    );
    const total    = pagosMes.reduce((acc, p) => acc + (p.monto || 0), 0);
    const cantidad = pagosMes.length;
    const promedio = cantidad ? Math.round(total / cantidad) : 0;

    document.getElementById('resTotal').textContent    = `$${total.toLocaleString('es-AR')}`;
    document.getElementById('resCantidad').textContent = cantidad;
    document.getElementById('resPromedio').textContent = `$${promedio.toLocaleString('es-AR')}`;

    // Barra efectivo vs digital
    const efectivo = pagosMes.filter(p => p.medioPago === 'Efectivo').reduce((a,p) => a+(p.monto||0), 0);
    const digital  = total - efectivo;
    const pct      = total ? Math.round(efectivo / total * 100) : 0;
    document.getElementById('resBarFill').style.width = `${pct}%`;
    document.getElementById('resBarLabel').textContent =
      `$${efectivo.toLocaleString('es-AR')} / $${digital.toLocaleString('es-AR')} digital`;
  }

  // ── Filtrar ───────────────────────────────────────────────────────────────────
  function filtrar() {
    const q      = document.getElementById('searchInput').value.toLowerCase();
    const estado = document.getElementById('filterEstado').value;
    const medio  = document.getElementById('filterMedio').value;
    const periodo = document.getElementById('filterMesPago').value; // "ANIO-MM"

    pagosFilt = pagos.filter(p => {
      const matchQ = !q || (p.nombreSocio || '').toLowerCase().includes(q);
      const matchE = estado === '' || String(p.confirmado) === estado;
      const matchM = !medio  || p.medioPago === medio;
      const matchP = !periodo || `${p.periodoAnio}-${String(p.periodoMes).padStart(2,'0')}` === periodo;
      return matchQ && matchE && matchM && matchP;
    });

    paginaActual = 1;
    document.getElementById('countLabel').textContent =
      pagosFilt.length === pagos.length
        ? `${pagos.length} pagos en total`
        : `${pagosFilt.length} de ${pagos.length} pagos`;
    renderTabla();
  }

  // ── Render tabla ──────────────────────────────────────────────────────────────
  function renderTabla() {
    const tbody  = document.getElementById('tablaPagos');
    const inicio = (paginaActual - 1) * POR_PAG;
    const fin    = inicio + POR_PAG;
    const pag    = pagosFilt.slice(inicio, fin);

    if (!pag.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
        <span>💸</span><h3>Sin resultados</h3>
        <p>No se encontraron pagos con esos filtros.<br>Cambiá los criterios o registrá un nuevo pago.</p>
      </div></td></tr>`;
      document.getElementById('pagInfo').textContent = '0 resultados';
      document.getElementById('pagBtns').innerHTML = '';
      return;
    }

    tbody.innerHTML = pag.map((p, i) => {
      const confirmado = p.confirmado === true || p.confirmado === 1;
      const inicial = (p.nombreSocio || '?').charAt(0).toUpperCase();
      const medioIcon = MEDIO_ICON[p.medioPago] || '💰';
      const periodoStr = `${MESES[parseInt(p.periodoMes)] || p.periodoMes} ${p.periodoAnio}`;
      const fallback = inicial;
      const avatarContent = p.fotoUrl && p.fotoUrl.trim()
        ? `<img src="${p.fotoUrl.trim()}" alt="" onerror="this.style.display='none';this.parentElement.dataset.fb=this.parentElement.dataset.fb||'${fallback}';this.parentElement.textContent='${fallback}'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : inicial;
      return `
        <tr style="animation: fadeUp .25s ease ${i * .03}s both; cursor:pointer" onclick="verDetalle(${p.idPago})">
          <td>
            <div class="socio-cell">
              <div class="socio-av">${avatarContent}</div>
              <div>
                <div class="socio-name">${p.nombreSocio || '—'}</div>
                <div class="socio-dni">${p.nombrePlan || p.nombreMembresia || ''}</div>
              </div>
            </div>
          </td>
          <td>${periodoStr}</td>
          <td><span class="medio-icon">${medioIcon}</span> ${p.medioPago || '—'}</td>
          <td>${formatFecha(p.fechaPago)}</td>
          <td><span class="monto-cell">$${(p.monto || 0).toLocaleString('es-AR')}</span></td>
          <td><span class="badge ${confirmado ? 'badge-green' : 'badge-yellow'}">${confirmado ? '✓ Confirmado' : '⏳ Pendiente'}</span></td>
          <td onclick="event.stopPropagation()">
            <div class="actions">
              <button class="btn-icon" title="Editar" onclick="editarPago(${p.idPago})">✏</button>
              <button class="btn-icon danger" title="Eliminar" onclick="eliminarPago(${p.idPago})">🗑</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    renderPaginacion(pagosFilt.length);
  }

  function renderPaginacion(total) {
    const totalPag = Math.ceil(total / POR_PAG);
    const inicio   = (paginaActual - 1) * POR_PAG;
    document.getElementById('pagInfo').textContent =
      `Mostrando ${inicio + 1}–${Math.min(inicio + POR_PAG, total)} de ${total} pagos`;

    let html = `<button class="pag-btn" onclick="cambiarPagina(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled' : ''}>‹</button>`;
    for (let i = 1; i <= totalPag; i++) {
      if (totalPag <= 7 || i === 1 || i === totalPag || Math.abs(i - paginaActual) <= 1) {
        html += `<button class="pag-btn ${i === paginaActual ? 'active' : ''}" onclick="cambiarPagina(${i})">${i}</button>`;
      } else if (Math.abs(i - paginaActual) === 2) {
        html += `<button class="pag-btn" disabled>…</button>`;
      }
    }
    html += `<button class="pag-btn" onclick="cambiarPagina(${paginaActual + 1})" ${paginaActual === totalPag ? 'disabled' : ''}>›</button>`;
    document.getElementById('pagBtns').innerHTML = html;
  }

  function cambiarPagina(n) {
    const total = Math.ceil(pagosFilt.length / POR_PAG);
    if (n < 1 || n > total) return;
    paginaActual = n;
    renderTabla();
    document.querySelector('.main').scrollTop = 0;
  }

  // ── Ver detalle ───────────────────────────────────────────────────────────────
  function verDetalle(id) {
    const p = pagos.find(x => x.idPago === id);
    if (!p) return;
    const confirmado = p.confirmado === true || p.confirmado === 1;
    const periodoStr = `${MESES[parseInt(p.periodoMes)] || p.periodoMes} ${p.periodoAnio}`;
    const medioIcon  = MEDIO_ICON[p.medioPago] || '💰';

    document.getElementById('detailBody').innerHTML = `
      <div class="detail-monto-hero">
        <div class="monto-big">$${(p.monto || 0).toLocaleString('es-AR')}</div>
        <div class="monto-label">${periodoStr}</div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Información del socio</div>
        <div class="detail-row"><span class="detail-lbl">Socio</span><span class="detail-val">${p.nombreSocio || '—'}</span></div>
        <div class="detail-row"><span class="detail-lbl">Membresía</span><span class="detail-val">${p.nombrePlan || p.nombreMembresia || '—'}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Detalle del pago</div>
        <div class="detail-row"><span class="detail-lbl">Fecha de pago</span><span class="detail-val">${formatFecha(p.fechaPago)}</span></div>
        <div class="detail-row"><span class="detail-lbl">Período</span><span class="detail-val">${periodoStr}</span></div>
        <div class="detail-row"><span class="detail-lbl">Medio</span><span class="detail-val">${medioIcon} ${p.medioPago || '—'}</span></div>
        <div class="detail-row">
          <span class="detail-lbl">Estado</span>
          <span class="badge ${confirmado ? 'badge-green' : 'badge-yellow'}">${confirmado ? '✓ Confirmado' : '⏳ Pendiente'}</span>
        </div>
        ${p.observaciones ? `<div class="detail-row" style="flex-direction:column;align-items:flex-start;gap:6px">
          <span class="detail-lbl">Observaciones</span>
          <span class="detail-val" style="font-size:12px;line-height:1.6;color:var(--muted)">${p.observaciones}</span>
        </div>` : ''}
        <div class="detail-row"><span class="detail-lbl">ID</span><span class="detail-val" style="color:var(--muted);font-size:12px">#${p.idPago}</span></div>
      </div>`;

    document.getElementById('detailActions').innerHTML = confirmado
      ? `<button class="btn-anular" onclick="cambiarEstadoPago(${p.idPago}, false)">✕ Marcar pendiente</button>
         <button class="btn-icon" style="border-color:var(--border)" title="Editar" onclick="cerrarDetalle();editarPago(${p.idPago})">✏</button>`
      : `<button class="btn-confirm" onclick="cambiarEstadoPago(${p.idPago}, true)">✓ Confirmar pago</button>
         <button class="btn-icon" style="border-color:var(--border)" title="Editar" onclick="cerrarDetalle();editarPago(${p.idPago})">✏</button>`;

    document.getElementById('detailOverlay').classList.add('open');
  }

  // ── Modal ─────────────────────────────────────────────────────────────────────
  function abrirModalNuevo() {
    pagoEdit = null;
    document.getElementById('modalTitle').textContent  = 'REGISTRAR PAGO';
    document.getElementById('btnGuardar').textContent  = 'GUARDAR';
    document.getElementById('fMembresia').value        = '';
    document.getElementById('fMonto').value            = '';
    document.getElementById('fMedio').value            = '';
    document.getElementById('fEstado').value           = 'true';
    document.getElementById('fPeriodoMes').value       = String(hoy.getMonth() + 1).padStart(2, '0');
    document.getElementById('fPeriodoAnio').value      = hoy.getFullYear();
    document.getElementById('fFechaPago').value        = hoy.toISOString().split('T')[0];
    document.getElementById('fObservaciones').value    = '';
    document.getElementById('previewBox').style.display = 'none';
    document.getElementById('modalOverlay').classList.add('open');
    setTimeout(() => document.getElementById('fMembresia').focus(), 200);
  }

  function editarPago(id) {
    const p = pagos.find(x => x.idPago === id);
    if (!p) return;
    pagoEdit = p;
    document.getElementById('modalTitle').textContent = 'EDITAR PAGO';
    document.getElementById('btnGuardar').textContent = 'ACTUALIZAR';
    // Intentar seleccionar la membresía correspondiente
    if (p.idMembresia) document.getElementById('fMembresia').value = p.idMembresia;
    document.getElementById('fMonto').value         = p.monto || '';
    document.getElementById('fMedio').value         = p.medioPago || '';
    document.getElementById('fEstado').value        = String(p.confirmado === true || p.confirmado === 1 ? 'true' : 'false');
    document.getElementById('fPeriodoMes').value    = String(p.periodoMes).padStart(2, '0');
    document.getElementById('fPeriodoAnio').value   = p.periodoAnio || hoy.getFullYear();
    document.getElementById('fFechaPago').value     = p.fechaPago ? p.fechaPago.split('T')[0] : '';
    document.getElementById('fObservaciones').value = p.observaciones || '';
    actualizarPreview();
    document.getElementById('modalOverlay').classList.add('open');
  }

  function onMembresiaChange() {
    const sel = document.getElementById('fMembresia');
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) { document.getElementById('previewBox').style.display = 'none'; return; }
    const monto = opt.getAttribute('data-monto');
    document.getElementById('fMonto').value = monto || '';
    actualizarPreview();
  }

  function actualizarPreview() {
    const sel   = document.getElementById('fMembresia');
    const opt   = sel.options[sel.selectedIndex];
    const monto = parseFloat(document.getElementById('fMonto').value) || 0;
    if (!opt || !opt.value || !monto) { document.getElementById('previewBox').style.display = 'none'; return; }
    document.getElementById('previewMonto').textContent = `$${monto.toLocaleString('es-AR')}`;
    document.getElementById('previewSocio').textContent = opt.getAttribute('data-socio') || '—';
    document.getElementById('previewPlan').textContent  = opt.getAttribute('data-plan')  || '—';
    document.getElementById('previewBox').style.display = 'flex';
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────────
  async function guardarPago() {
    const idMembresia = document.getElementById('fMembresia').value;
    const monto       = document.getElementById('fMonto').value;
    const medio       = document.getElementById('fMedio').value;
    const fecha       = document.getElementById('fFechaPago').value;
    const mes         = document.getElementById('fPeriodoMes').value;
    const anio        = document.getElementById('fPeriodoAnio').value;

    if (!idMembresia) { showToast('Seleccioná una membresía', 'error'); return; }
    if (!monto || parseFloat(monto) <= 0) { showToast('Ingresá un monto válido', 'error'); return; }
    if (!medio)       { showToast('Seleccioná el medio de pago', 'error'); return; }
    if (!fecha)       { showToast('Indicá la fecha del pago', 'error'); return; }

    const btn = document.getElementById('btnGuardar');
    btn.disabled = true; btn.textContent = '...';

    const body = {
      idMembresia:    parseInt(idMembresia),
      monto:          parseFloat(monto),
      medioPago:      medio,
      fechaPago:      fecha,
      periodoMes:     mes,
      periodoAnio:    String(anio),
      estado:         document.getElementById('fEstado').value === 'true',
      observaciones:  document.getElementById('fObservaciones').value.trim() || null,
    };

    try {
      let res;
      if (pagoEdit) {
        // Al editar: DELETE el viejo + POST el nuevo con los datos actualizados
        await fetch(`${API_BASE}/api/pagos/${pagoEdit.idPago}`, { method: 'DELETE', headers: authHeaders() });
        res = await fetch(`${API_BASE}/api/pagos`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
      } else {
        res = await fetch(`${API_BASE}/api/pagos`, {
          method: 'POST', headers: authHeaders(), body: JSON.stringify(body)
        });
      }

      if (res.ok) {
        showToast(pagoEdit ? 'Pago actualizado correctamente' : 'Pago registrado correctamente', 'success');
        cerrarModal('modalOverlay');
        await cargarPagos();
        actualizarStats();
        actualizarResumen();
        poblarFiltroMes();
      } else {
        showToast('Error al guardar el pago', 'error');
      }
    } catch { showToast('Sin conexión a la API', 'error'); }
    finally {
      btn.disabled = false;
      btn.textContent = pagoEdit ? 'ACTUALIZAR' : 'GUARDAR';
    }
  }

  async function cambiarEstadoPago(id, nuevoEstado) {
    const p = pagos.find(x => x.idPago === id);
    if (!p) return;
    try {
      const body = { confirmado: nuevoEstado };
      const res = await fetch(`${API_BASE}/api/pagos/${id}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast(nuevoEstado ? 'Pago confirmado' : 'Marcado como pendiente', 'success');
        cerrarDetalle();
        await cargarPagos();
        actualizarStats();
        actualizarResumen();
      } else { showToast('No se pudo actualizar el estado', 'error'); }
    } catch { showToast('Sin conexión a la API', 'error'); }
  }

  async function eliminarPago(id) {
    const p = pagos.find(x => x.idPago === id);
    if (!confirm(`¿Eliminar este pago de ${p ? p.nombreSocio : ''}?\nEsta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/pagos/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        showToast('Pago eliminado correctamente', 'success');
        await cargarPagos();
        actualizarStats();
        actualizarResumen();
        poblarFiltroMes();
      } else { showToast('No se pudo eliminar el pago', 'error'); }
    } catch { showToast('Sin conexión a la API', 'error'); }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function cerrarModal(id)             { document.getElementById(id).classList.remove('open'); }
  function cerrarModalSiOverlay(e, id) { if (e.target === document.getElementById(id)) cerrarModal(id); }
  function cerrarDetalle()             { document.getElementById('detailOverlay').classList.remove('open'); }
  function cerrarDetalleSiOverlay(e)   { if (e.target === document.getElementById('detailOverlay')) cerrarDetalle(); }


  init();