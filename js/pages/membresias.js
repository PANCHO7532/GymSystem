/**
 * GymSystem — membresias.js
 * Lógica del módulo de membresias.
 * Dependencias: auth.js (debe cargarse antes)
 */

// ── Estado ───────────────────────────────────────────────────────────────────
  let membresias = [], pagos = [], socios = [], planes = [];
  let membresiasFiltradas = [], pagosFiltrados = [];
  let paginaM = 1, paginaP = 1;
  const POR_PAG = 10;
  let tabActual = 'membresias';
  let membresiaDetalle = null;
  const hoy = new Date();

  // ── Cargar datos ─────────────────────────────────────────────────────────────
  async function cargarTodo() {
    await Promise.all([cargarMembresias(), cargarPagos(), cargarSocios(), cargarPlanes()]);
    actualizarStats();
    verificarVencimientos();
  }

  async function cargarMembresias() {
    try {
      const res = await fetch(`${API_BASE}/api/membresias`, { headers: authHeaders() });
      membresias = res.ok ? await res.json() : [];
    } catch { membresias = []; }
    filtrar();
  }

  async function cargarPagos() {
    try {
      const res = await fetch(`${API_BASE}/api/pagos`, { headers: authHeaders() });
      pagos = res.ok ? await res.json() : [];
    } catch { pagos = []; }
    renderPagos();
  }

  async function cargarSocios() {
    try {
      const res = await fetch(`${API_BASE}/api/socios`, { headers: authHeaders() });
      socios = res.ok ? await res.json() : [];
      const sel = document.getElementById('fSocio');
      sel.innerHTML = '<option value="">Seleccioná un socio...</option>' +
        socios.filter(s => s.activo).map(s =>
          `<option value="${s.idSocio}">${s.apellido} ${s.nombre} — DNI ${s.dni}</option>`
        ).join('');
    } catch { socios = []; }
  }

  async function cargarPlanes() {
    try {
      const res = await fetch(`${API_BASE}/api/planes`, { headers: authHeaders() });
      planes = res.ok ? await res.json() : [];
      const sel = document.getElementById('fPlan');
      sel.innerHTML = '<option value="">Seleccioná un plan...</option>' +
        planes.filter(p => p.activo).map(p =>
          `<option value="${p.idPlan}">${p.nombre} — $${p.precioMensual}/mes</option>`
        ).join('');
    } catch { planes = []; }
  }

  function actualizarStats() {
    const activas  = membresias.filter(m => m.activo && !estaVencida(m)).length;
    const porVencer = membresias.filter(m => m.activo && diasParaVencer(m) <= 7 && diasParaVencer(m) >= 0).length;
    document.getElementById('statTotal').textContent   = membresias.length;
    document.getElementById('statActivas').textContent = activas;
    document.getElementById('statVencer').textContent  = porVencer;

    // Recaudado este mes
    const mes  = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    fetch(`${API_BASE}/api/pagos/periodo/total?mes=${mes}&anio=${anio}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { document.getElementById('statRecaudado').textContent = `$${(d.totalRecaudado||0).toLocaleString('es-AR')}`; })
      .catch(() => { document.getElementById('statRecaudado').textContent = '—'; });
  }

  function verificarVencimientos() {
    const porVencer = membresias.filter(m => m.activo && diasParaVencer(m) <= 7 && diasParaVencer(m) >= 0);
    if (porVencer.length) {
      document.getElementById('alertVencer').style.display = 'flex';
      document.getElementById('alertVencerMsg').innerHTML =
        `<strong>${porVencer.length} membresía${porVencer.length > 1 ? 's' : ''}</strong> vencen en los próximos 7 días. Contactá a los socios para renovar.`;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function diasParaVencer(m) {
    const venc = new Date(m.fechaVencimiento);
    return Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
  }
  function estaVencida(m) { return diasParaVencer(m) < 0; }

  function estadoMembresia(m) {
    const dias = diasParaVencer(m);
    if (!m.activo) return { label: 'Inactiva', cls: 'badge-red' };
    if (dias < 0)  return { label: 'Vencida',  cls: 'badge-red' };
    if (dias <= 7) return { label: `${dias}d`, cls: 'badge-yellow' };
    return { label: 'Activa', cls: 'badge-green' };
  }

  // ── Filtrar membresías ────────────────────────────────────────────────────────
  function filtrar() {
    const q      = document.getElementById('searchInput').value.toLowerCase();
    const estado = document.getElementById('filterEstado').value;

    membresiasFiltradas = membresias.filter(m => {
      const nombre = (m.nombreSocio || '').toLowerCase();
      const plan   = (m.nombrePlan  || '').toLowerCase();
      const matchQ = !q || nombre.includes(q) || plan.includes(q);
      let matchE = true;
      if (estado === 'activa')  matchE = m.activo && !estaVencida(m);
      if (estado === 'vencer')  matchE = m.activo && diasParaVencer(m) <= 7 && diasParaVencer(m) >= 0;
      if (estado === 'vencida') matchE = estaVencida(m);
      return matchQ && matchE;
    });

    paginaM = 1;
    renderMembresias();
  }

  // ── Render membresías ─────────────────────────────────────────────────────────
  function renderMembresias() {
    const tbody  = document.getElementById('tablaMembresias');
    const inicio = (paginaM - 1) * POR_PAG;
    const fin    = inicio + POR_PAG;
    const pag    = membresiasFiltradas.slice(inicio, fin);

    if (!pag.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><span>🪪</span><h3>Sin membresías</h3><p>No se encontraron resultados</p></div></td></tr>`;
      document.getElementById('pagInfoM').textContent = '0 resultados';
      document.getElementById('pagBtnsM').innerHTML = '';
      return;
    }

    tbody.innerHTML = pag.map(m => {
      const est = estadoMembresia(m);
      const dias = diasParaVencer(m);
      const pct  = Math.max(0, Math.min(100, dias / 30 * 100));
      const barColor = dias <= 3 ? 'var(--error)' : dias <= 7 ? '#ffc847' : 'var(--success)';
      return `
        <tr onclick="verDetalle(${m.idMembresia})">
          <td>${m.nombreSocio || '—'}</td>
          <td>${m.nombrePlan || '—'}</td>
          <td>$${(m.precioMensual||0).toLocaleString('es-AR')}</td>
          <td>${formatFecha(m.fechaInicio)}</td>
          <td>
            ${formatFecha(m.fechaVencimiento)}
            <div class="progress-wrap">
              <div class="progress-bar" style="width:${pct}%;background:${barColor}"></div>
            </div>
          </td>
          <td><span class="badge ${est.cls}">${est.label}</span></td>
          <td onclick="event.stopPropagation()">
            <div class="actions">
              <button class="btn-icon success-btn" title="Registrar pago" onclick="abrirModalPago(${m.idMembresia})">💳</button>
              <button class="btn-icon" title="Renovar" onclick="renovarMembresia(${m.idMembresia})">🔄</button>
              <button class="btn-icon" title="Editar" onclick="abrirModalEditar(${m.idMembresia})">✏</button>
              <button class="btn-icon danger" title="Eliminar" onclick="confirmarEliminar(${m.idMembresia}, '${m.nombreSocio || m.idMembresia}')">🗑</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    renderPaginacion('M', membresiasFiltradas.length, paginaM, 'pagInfoM', 'pagBtnsM', n => { paginaM = n; renderMembresias(); });
  }

  // ── Render pagos ──────────────────────────────────────────────────────────────
  function renderPagos() {
    const tbody  = document.getElementById('tablaPagos');
    const inicio = (paginaP - 1) * POR_PAG;
    const fin    = inicio + POR_PAG;
    const pag    = pagos.slice(inicio, fin);

    if (!pag.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><span>💰</span><h3>Sin pagos</h3><p>No hay pagos registrados</p></div></td></tr>`;
      document.getElementById('pagInfoP').textContent = '0 resultados';
      document.getElementById('pagBtnsP').innerHTML = '';
      return;
    }

    tbody.innerHTML = pag.map(p => `
      <tr>
        <td>${p.nombreSocio || '—'}</td>
        <td>${mesToNombre(p.periodoMes)} ${p.periodoAnio}</td>
        <td>${p.medioPago || '—'}</td>
        <td>${formatFecha(p.fechaPago)}</td>
        <td><span style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:var(--accent);letter-spacing:1px">$${(p.monto||0).toLocaleString('es-AR')}</span></td>
        <td><span class="badge ${p.estado ? 'badge-green' : 'badge-red'}">${p.estado ? 'Confirmado' : 'Pendiente'}</span></td>
      </tr>`).join('');

    renderPaginacion('P', pagos.length, paginaP, 'pagInfoP', 'pagBtnsP', n => { paginaP = n; renderPagos(); });
  }

  function renderPaginacion(key, total, actual, infoId, btnsId, onChange) {
    const totalPag = Math.ceil(total / POR_PAG);
    const inicio   = (actual - 1) * POR_PAG;
    document.getElementById(infoId).textContent = `Mostrando ${inicio + 1}–${Math.min(inicio + POR_PAG, total)} de ${total}`;
    let html = `<button class="pag-btn" onclick="(${onChange})(${actual - 1})" ${actual === 1 ? 'disabled' : ''}>‹</button>`;
    for (let i = 1; i <= totalPag; i++) {
      if (totalPag <= 7 || i === 1 || i === totalPag || Math.abs(i - actual) <= 1)
        html += `<button class="pag-btn ${i === actual ? 'active' : ''}" onclick="(${onChange})(${i})">${i}</button>`;
      else if (Math.abs(i - actual) === 2)
        html += `<button class="pag-btn" disabled>…</button>`;
    }
    html += `<button class="pag-btn" onclick="(${onChange})(${actual + 1})" ${actual === totalPag ? 'disabled' : ''}>›</button>`;
    document.getElementById(btnsId).innerHTML = html;
  }

  function mesToNombre(m) {
    const meses = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return meses[parseInt(m)] || m;
  }

  // ── TABS ─────────────────────────────────────────────────────────────────────
  function cambiarTab(tab, btn) {
    tabActual = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panelMembresias').style.display = tab === 'membresias' ? '' : 'none';
    document.getElementById('panelPagos').style.display      = tab === 'pagos'      ? '' : 'none';
  }

  // ── MODAL MEMBRESÍA ──────────────────────────────────────────────────────────
  function abrirModalNuevo() {
    document.getElementById('modalMembresiaTitle').textContent        = 'Nueva Membresía';
    document.getElementById('btnGuardarMembresia').onclick   = guardarMembresia;
    const hoyStr = hoy.toISOString().split('T')[0];
    const unMes  = new Date(hoy); unMes.setMonth(unMes.getMonth() + 1);
    document.getElementById('fFechaInicio').value = hoyStr;
    document.getElementById('fFechaVenc').value   = unMes.toISOString().split('T')[0];
    document.getElementById('fSocio').value = '';
    document.getElementById('fPlan').value  = '';
    document.getElementById('modalMembresia').classList.add('open');
  }

  async function guardarMembresia() {
    const idSocio = document.getElementById('fSocio').value;
    const idPlan  = document.getElementById('fPlan').value;
    const inicio  = document.getElementById('fFechaInicio').value;
    const venc    = document.getElementById('fFechaVenc').value;
    if (!idSocio || !idPlan || !inicio || !venc) { showToast('Completá todos los campos', 'error'); return; }

    const btn = document.getElementById('btnGuardarMembresia');
    btn.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/api/membresias`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ idSocio: +idSocio, idPlan: +idPlan, fechaInicio: inicio, fechaVencimiento: venc })
      });
      if (res.ok) {
        showToast('Membresía creada correctamente', 'success');
        cerrarModal('modalMembresia');
        await cargarMembresias();
        actualizarStats();
      } else { showToast('Error al crear la membresía', 'error'); }
    } catch { showToast('Sin conexión a la API', 'error'); }
    finally { btn.disabled = false; }
  }

  // ── MODAL PAGO ────────────────────────────────────────────────────────────────
  function abrirModalPago(idMembresia) {
    const m = membresias.find(x => x.idMembresia === idMembresia);
    document.getElementById('fPagoMembresia').value    = m ? `${m.nombreSocio} — ${m.nombrePlan}` : '';
    document.getElementById('fPagoMembresiaId').value  = idMembresia;
    document.getElementById('fMonto').value            = m ? m.precioMensual : '';
    document.getElementById('fFechaPago').value        = hoy.toISOString().split('T')[0];
    document.getElementById('fPeriodoMes').value       = String(hoy.getMonth() + 1).padStart(2, '0');
    document.getElementById('fPeriodoAnio').value      = hoy.getFullYear();
    document.getElementById('modalPago').classList.add('open');
  }

  async function guardarPago() {
    const idMembresia = +document.getElementById('fPagoMembresiaId').value;
    const monto       = +document.getElementById('fMonto').value;
    const medio       = document.getElementById('fMedioPago').value;
    const mes         = document.getElementById('fPeriodoMes').value;
    const anio        = document.getElementById('fPeriodoAnio').value;
    const fecha       = document.getElementById('fFechaPago').value;
    if (!monto || !fecha) { showToast('Completá monto y fecha', 'error'); return; }

    const btn = document.getElementById('btnGuardarPago');
    btn.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/api/pagos`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ idMembresia, monto, fechaPago: fecha, periodoMes: mes, periodoAnio: anio, medioPago: medio })
      });
      if (res.ok) {
        showToast('Pago registrado correctamente', 'success');
        cerrarModal('modalPago');
        await cargarPagos();
        actualizarStats();
      } else { showToast('Error al registrar el pago', 'error'); }
    } catch { showToast('Sin conexión a la API', 'error'); }
    finally { btn.disabled = false; }
  }

  // ── RENOVAR ───────────────────────────────────────────────────────────────────
  // ── EDITAR MEMBRESÍA ─────────────────────────────────────────────────────────
  function abrirModalEditar(id) {
    const m = membresias.find(x => x.idMembresia === id);
    if (!m) return;
    document.getElementById('modalMembresiaTitle').textContent = 'Editar Membresía';
    document.getElementById('fSocio').value          = m.idSocio;
    document.getElementById('fPlan').value           = m.idPlan;
    document.getElementById('fFechaInicio').value           = m.fechaInicio?.split('T')[0] || '';
    document.getElementById('fFechaVenc').value              = m.fechaVencimiento?.split('T')[0] || '';
    document.getElementById('btnGuardarMembresia').onclick = () => actualizarMembresia(id);
    document.getElementById('modalMembresia').classList.add('open');
  }

  async function actualizarMembresia(id) {
    const venc   = document.getElementById('fFechaVenc').value;
    const idPlan = parseInt(document.getElementById('fPlan').value);
    if (!venc)   { showToast('Ingresá la fecha de vencimiento', 'error'); return; }
    if (!idPlan) { showToast('Seleccioná un plan', 'error'); return; }
    const m = membresias.find(x => x.idMembresia === id);
    try {
      const res = await fetch(`${API_BASE}/api/membresias/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ idMembresia: id, idPlan: idPlan, fechaVencimiento: venc, activo: m?.activo ?? true })
      });
      if (res.ok) {
        showToast('Membresía actualizada', 'success');
        cerrarModal('modalMembresia');
        await cargarMembresias();
      } else { showToast('Error al actualizar', 'error'); }
    } catch { showToast('No se pudo conectar', 'error'); }
  }

  // ── ELIMINAR MEMBRESÍA ────────────────────────────────────────────────────────
  async function confirmarEliminar(id, nombre) {
    if (!confirm(`¿Eliminar la membresía de ${nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/membresias/${id}`, {
        method: 'DELETE', headers: authHeaders()
      });
      if (res.ok) {
        showToast('Membresía eliminada', 'success');
        await cargarMembresias();
      } else { showToast('Error al eliminar', 'error'); }
    } catch { showToast('No se pudo conectar', 'error'); }
  }

  async function renovarMembresia(id) {
    const m = membresias.find(x => x.idMembresia === id);
    if (!m) return;
    const vencActual = new Date(m.fechaVencimiento);
    const nuevaVenc  = new Date(vencActual);
    nuevaVenc.setMonth(nuevaVenc.getMonth() + 1);
    if (!confirm(`¿Renovar membresía de ${m.nombreSocio} hasta ${nuevaVenc.toLocaleDateString('es-AR')}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/membresias/${id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ fechaVencimiento: nuevaVenc.toISOString().split('T')[0], activo: true })
      });
      if (res.ok) { showToast('Membresía renovada correctamente', 'success'); await cargarMembresias(); actualizarStats(); }
      else { showToast('Error al renovar', 'error'); }
    } catch { showToast('Sin conexión a la API', 'error'); }
  }

  // ── DETALLE ───────────────────────────────────────────────────────────────────
  async function verDetalle(id) {
    const m = membresias.find(x => x.idMembresia === id);
    if (!m) return;
    membresiaDetalle = m;
    const dias = diasParaVencer(m);
    const pct  = Math.max(0, Math.min(100, dias / 30 * 100));
    const barColor = dias <= 3 ? 'var(--error)' : dias <= 7 ? '#ffc847' : 'var(--success)';
    const est = estadoMembresia(m);

    let pagosHTML = '<div class="empty-state"><span>💰</span><p>Sin pagos registrados</p></div>';
    try {
      const res = await fetch(`${API_BASE}/api/pagos/membresia/${id}`, { headers: authHeaders() });
      if (res.ok) {
        const pagosMem = await res.json();
        if (pagosMem.length) {
          pagosHTML = pagosMem.slice(0, 6).map(p => `
            <div class="pago-item">
              <div class="pago-left">
                <span class="pago-periodo">${mesToNombre(p.periodoMes)} ${p.periodoAnio}</span>
                <span class="pago-fecha">${formatFecha(p.fechaPago)} — ${p.medioPago}</span>
              </div>
              <span class="pago-monto">$${(p.monto||0).toLocaleString('es-AR')}</span>
            </div>`).join('');
        }
      }
    } catch {}

    document.getElementById('detailBody').innerHTML = `
      <div style="padding-bottom:16px;border-bottom:1px solid var(--border)">
        <div style="font-size:13px;color:var(--muted);margin-bottom:4px">Socio</div>
        <div style="font-size:18px;font-weight:500">${m.nombreSocio || '—'}</div>
        <div style="margin-top:8px"><span class="badge ${est.cls}">${est.label}</span></div>
      </div>
      <div>
        <div class="detail-section-title">Información del plan</div>
        <div class="detail-row"><span class="detail-label">Plan</span><span class="detail-value">${m.nombrePlan||'—'}</span></div>
        <div class="detail-row"><span class="detail-label">Precio mensual</span><span class="detail-value" style="color:var(--accent)">$${(m.precioMensual||0).toLocaleString('es-AR')}</span></div>
        <div class="detail-row"><span class="detail-label">Fecha inicio</span><span class="detail-value">${formatFecha(m.fechaInicio)}</span></div>
        <div class="detail-row"><span class="detail-label">Vencimiento</span><span class="detail-value">${formatFecha(m.fechaVencimiento)}</span></div>
        <div class="detail-row"><span class="detail-label">Días restantes</span><span class="detail-value">${dias >= 0 ? dias + ' días' : 'Vencida'}</span></div>
        <div style="margin-top:8px">
          <div class="progress-wrap" style="height:8px">
            <div class="progress-bar" style="width:${pct}%;background:${barColor}"></div>
          </div>
        </div>
      </div>
      <div>
        <div class="detail-section-title" style="margin-bottom:0">Historial de pagos</div>
        ${pagosHTML}
      </div>
      <div style="display:flex;gap:10px;padding-top:8px">
        <button class="btn-edit" onclick="abrirModalPago(${m.idMembresia});cerrarDetail()" style="flex:1;padding:10px;background:rgba(232,255,71,.1);border:1px solid var(--accent);border-radius:var(--radius);color:var(--accent);font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:2px;cursor:pointer">💳 PAGO</button>
        <button onclick="renovarMembresia(${m.idMembresia});cerrarDetail()" style="flex:1;padding:10px;background:rgba(71,255,212,.1);border:1px solid var(--accent2);border-radius:var(--radius);color:var(--accent2);font-family:'Bebas Neue',sans-serif;font-size:15px;letter-spacing:2px;cursor:pointer">🔄 RENOVAR</button>
      </div>
    `;
    document.getElementById('detailOverlay').classList.add('open');
  }

  function cerrarDetail() { document.getElementById('detailOverlay').classList.remove('open'); }
  function cerrarDetailSiOverlay(e) { if (e.target === document.getElementById('detailOverlay')) cerrarDetail(); }

  // ── MODALES ───────────────────────────────────────────────────────────────────
  function cerrarModal(id) { document.getElementById(id).classList.remove('open'); }
  function cerrarModalSiOverlay(e, id) { if (e.target === document.getElementById(id)) cerrarModal(id); }

  // ── TOAST ─────────────────────────────────────────────────────────────────────


  // ── Init ──────────────────────────────────────────────────────────────────────
  cargarTodo();
