/**
 * GymSystem — asistencias.js
 * Lógica del módulo de asistencias.
 * Dependencias: auth.js (debe cargarse antes)
 */



  // ── Estado ───────────────────────────────────────────────────────────────────
  let historial = [], historialFiltrado = [];
  let pagina = 1;
  const POR_PAG = 12;
  const hoy = new Date();
  let timerDuraciones;

  // ── Reloj en vivo ─────────────────────────────────────────────────────────────
  function actualizarReloj() {
    const ahora = new Date();
    document.getElementById('clockTime').textContent =
      ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('clockDate').textContent =
      ahora.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  setInterval(actualizarReloj, 1000);
  actualizarReloj();

  // ── Cargar selectores ─────────────────────────────────────────────────────────
  async function cargarSocios() {
    try {
      const res = await fetch(`${API_BASE}/api/socios`, { headers: authHeaders() });
      if (!res.ok) return;
      const socios = await res.json();
      const activos = socios.filter(s => s.activo);
      const opts = '<option value="">Seleccioná un socio...</option>' +
        activos.map(s => `<option value="${s.idSocio}">${s.apellido} ${s.nombre}</option>`).join('');
      document.getElementById('entradaSocio').innerHTML = opts;
      document.getElementById('salidaSocio').innerHTML  = opts;
    } catch {}
  }

  async function cargarTipos() {
    try {
      const res = await fetch(`${API_BASE}/api/tipos-entrenamiento`, { headers: authHeaders() });
      if (res.ok) {
        const tipos = await res.json();
        document.getElementById('entradaTipo').innerHTML =
          '<option value="">Seleccioná el tipo...</option>' +
          tipos.map(t => `<option value="${t.idTipoEntrenamiento}">${t.nombre}</option>`).join('');
        return;
      }
    } catch {}
    // Fallback desde clases si el endpoint de tipos falla
    try {
      const res2 = await fetch(`${API_BASE}/api/clases`, { headers: authHeaders() });
      if (res2.ok) {
        const clases = await res2.json();
        const tipos = [...new Map(clases.map(c => [c.idTipoEntrenamiento, c.tipoNombre])).entries()];
        document.getElementById('entradaTipo').innerHTML =
          '<option value="">Seleccioná el tipo...</option>' +
          tipos.map(([id, nom]) => `<option value="${id}">${nom || 'Tipo ' + id}</option>`).join('');
      }
    } catch {}
  }

  // ── Registrar entrada ─────────────────────────────────────────────────────────
  async function registrarEntrada() {
    const idSocio = document.getElementById('entradaSocio').value;
    const idTipo  = document.getElementById('entradaTipo').value;
    if (!idSocio) { showToast('Seleccioná un socio', 'error'); return; }
    if (!idTipo)  { showToast('Seleccioná el tipo de entrenamiento', 'error'); return; }

    const btn = document.getElementById('btnEntrada');
    btn.disabled = true;
    btn.textContent = '...';

    const ahora = new Date();
    const fechaStr = ahora.toISOString().split('T')[0];
    const horaStr  = ahora.toTimeString().split(' ')[0];

    try {
      const res = await fetch(`${API_BASE}/api/asistencias/entrada`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          idSocio: +idSocio,
          idTipoEntrenamiento: +idTipo,
          fecha: fechaStr,
          horaEntrada: horaStr
        })
      });
      if (res.ok) {
        showToast('Entrada registrada correctamente ✅', 'success');
        document.getElementById('entradaSocio').value = '';
        document.getElementById('entradaTipo').value  = '';
        await cargarEnGym();
        await cargarHistorial();
        actualizarStats();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.title || 'Error al registrar entrada', 'error');
      }
    } catch { showToast('Sin conexión a la API', 'error'); }
    finally {
      btn.disabled = false;
      btn.textContent = '✅ REGISTRAR ENTRADA';
    }
  }

  // ── Registrar salida ──────────────────────────────────────────────────────────
  async function registrarSalida() {
    const idSocio = document.getElementById('salidaSocio').value;
    if (!idSocio) { showToast('Seleccioná un socio', 'error'); return; }

    const btn = document.getElementById('btnSalida');
    btn.disabled = true;
    btn.textContent = '...';

    try {
      const res = await fetch(`${API_BASE}/api/asistencias/salida/${idSocio}`, {
        method: 'PUT', headers: authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const dur  = data.duracion ? `Duración: ${data.duracion}` : '';
        showToast(`Salida registrada correctamente 🔚 ${dur}`, 'success');
        document.getElementById('salidaSocio').value = '';
        await cargarEnGym();
        await cargarHistorial();
        actualizarStats();
      } else if (res.status === 404) {
        showToast('Este socio no tiene una entrada activa', 'error');
      } else {
        showToast('Error al registrar salida', 'error');
      }
    } catch { showToast('Sin conexión a la API', 'error'); }
    finally {
      btn.disabled = false;
      btn.textContent = '🔚 REGISTRAR SALIDA';
    }
  }

  // ── Socios en el gym ahora ────────────────────────────────────────────────────
  async function cargarEnGym() {
    try {
      const fechaHoy = hoy.toISOString().split('T')[0];
      const res = await fetch(`${API_BASE}/api/asistencias/fecha/${fechaHoy}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const todas = await res.json();
      const enGym = todas.filter(a => a.activo && !a.horaSalida);
      document.getElementById('statEnGym').textContent = enGym.length;
      document.getElementById('enGymCount').textContent = enGym.length;

      const grid = document.getElementById('enGymGrid');
      if (!enGym.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span>🏠</span><p>No hay socios en el gym ahora</p></div>`;
        return;
      }

      // Limpiar timer anterior
      clearInterval(timerDuraciones);

      const render = () => {
        const ahora = new Date();
        grid.innerHTML = enGym.map(a => {
          const [h, m, s] = a.horaEntrada.split(':').map(Number);
          const entradaDate = new Date(hoy);
          entradaDate.setHours(h, m, s || 0, 0);
          const diffMin = Math.floor((ahora - entradaDate) / 60000);
          const horas   = Math.floor(diffMin / 60);
          const minutos = diffMin % 60;
          const durStr  = horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;
          return `
            <div class="socio-en-gym">
              <div class="seg-avatar">${(a.nombreSocio||'?').charAt(0).toUpperCase()}</div>
              <div class="seg-name">${a.nombreSocio || '—'}</div>
              <div class="seg-hora">Entró: ${a.horaEntrada}</div>
              <div class="seg-tipo">${a.tipoNombre || 'Entrenamiento'}</div>
              <div class="seg-duracion">${durStr}</div>
              <button class="btn-registrar-salida" onclick="registrarSalidaRapida(${a.idSocio})">
                🔚 Registrar salida
              </button>
            </div>`;
        }).join('');
      };

      render();
      timerDuraciones = setInterval(render, 30000);

    } catch {
      document.getElementById('enGymGrid').innerHTML =
        `<div class="empty-state" style="grid-column:1/-1"><span>📡</span><p>Sin conexión a la API</p></div>`;
    }
  }

  async function registrarSalidaRapida(idSocio) {
    try {
      const res = await fetch(`${API_BASE}/api/asistencias/salida/${idSocio}`, {
        method: 'PUT', headers: authHeaders()
      });
      if (res.ok) {
        showToast('Salida registrada 🔚', 'success');
        await cargarEnGym();
        await cargarHistorial();
        actualizarStats();
      } else { showToast('Error al registrar salida', 'error'); }
    } catch { showToast('Sin conexión', 'error'); }
  }

  // ── Historial ─────────────────────────────────────────────────────────────────
  async function cargarHistorial() {
    const fechaFiltro = document.getElementById('filterFecha').value;
    const fechaStr    = fechaFiltro || hoy.toISOString().split('T')[0];
    try {
      const res = await fetch(`${API_BASE}/api/asistencias/fecha/${fechaStr}`, { headers: authHeaders() });
      historial = res.ok ? await res.json() : [];
    } catch { historial = []; }
    historialFiltrado = [...historial];
    pagina = 1;
    renderHistorial();
    actualizarStats();
  }

  function filtrarHistorial() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    historialFiltrado = !q ? [...historial] :
      historial.filter(a => (a.nombreSocio || '').toLowerCase().includes(q));
    pagina = 1;
    renderHistorial();
  }

  async function cargarPorFecha() {
    await cargarHistorial();
  }

  function limpiarFiltros() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterFecha').value = hoy.toISOString().split('T')[0];
    cargarHistorial();
  }

  function renderHistorial() {
    const tbody  = document.getElementById('tablaHistorial');
    const inicio = (pagina - 1) * POR_PAG;
    const fin    = inicio + POR_PAG;
    const pag    = historialFiltrado.slice(inicio, fin);

    if (!pag.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><span>📋</span><p>Sin asistencias para esta fecha</p></div></td></tr>`;
      document.getElementById('pagInfo').textContent = '0 resultados';
      document.getElementById('pagBtns').innerHTML = '';
      return;
    }

    tbody.innerHTML = pag.map(a => {
      const activo = a.activo && !a.horaSalida;
      return `<tr>
        <td>${a.nombreSocio || '—'}</td>
        <td>${a.tipoNombre || '—'}</td>
        <td>${formatFecha(a.fecha)}</td>
        <td>${a.horaEntrada || '—'}</td>
        <td>${a.horaSalida || '—'}</td>
        <td>${a.duracion || '—'}</td>
        <td><span class="badge ${activo ? 'badge-green' : a.horaSalida ? 'badge-blue' : 'badge-yellow'}">
          ${activo ? 'En gym' : a.horaSalida ? 'Completada' : 'Sin salida'}
        </span></td>
      </tr>`;
    }).join('');

    // Paginación
    const totalPag = Math.ceil(historialFiltrado.length / POR_PAG);
    document.getElementById('pagInfo').textContent =
      `Mostrando ${inicio + 1}–${Math.min(fin, historialFiltrado.length)} de ${historialFiltrado.length}`;

    let html = `<button class="pag-btn" onclick="cambiarPagina(${pagina-1})" ${pagina===1?'disabled':''}>‹</button>`;
    for (let i = 1; i <= totalPag; i++) {
      if (totalPag <= 7 || i === 1 || i === totalPag || Math.abs(i - pagina) <= 1)
        html += `<button class="pag-btn ${i===pagina?'active':''}" onclick="cambiarPagina(${i})">${i}</button>`;
      else if (Math.abs(i - pagina) === 2)
        html += `<button class="pag-btn" disabled>…</button>`;
    }
    html += `<button class="pag-btn" onclick="cambiarPagina(${pagina+1})" ${pagina===totalPag?'disabled':''}>›</button>`;
    document.getElementById('pagBtns').innerHTML = html;
  }

  function cambiarPagina(n) {
    const total = Math.ceil(historialFiltrado.length / POR_PAG);
    if (n < 1 || n > total) return;
    pagina = n;
    renderHistorial();
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────
  async function actualizarStats() {
    // Hoy
    document.getElementById('statHoy').textContent = historial.length;

    // En gym ahora
    const enGym = historial.filter(a => a.activo && !a.horaSalida).length;
    document.getElementById('statEnGym').textContent = enGym;

    // Duración promedio
    const conDuracion = historial.filter(a => a.duracion);
    if (conDuracion.length) {
      const totalMin = conDuracion.reduce((acc, a) => {
        const [h, m] = a.duracion.split(':').map(Number);
        return acc + h * 60 + m;
      }, 0);
      const prom = Math.round(totalMin / conDuracion.length);
      document.getElementById('statPromedio').textContent = prom >= 60
        ? `${Math.floor(prom/60)}h${prom%60}m`
        : `${prom}m`;
    } else {
      document.getElementById('statPromedio').textContent = '—';
    }

    // Este mes
    try {
      const mes  = String(hoy.getMonth() + 1).padStart(2, '0');
      const anio = hoy.getFullYear();
      // Estimación: llamamos a asistencias de hoy y multiplicamos
      document.getElementById('statMes').textContent = historial.length + '+';
    } catch {}
  }


  // ── TOAST ─────────────────────────────────────────────────────────────────────


  // ── Init ──────────────────────────────────────────────────────────────────────
  const fechaHoyStr = hoy.toISOString().split('T')[0];
  document.getElementById('filterFecha').value = fechaHoyStr;

  Promise.all([cargarSocios(), cargarTipos(), cargarEnGym(), cargarHistorial()]);

  // Auto-refresh cada 60 segundos
  setInterval(() => { cargarEnGym(); cargarHistorial(); }, 60000);
