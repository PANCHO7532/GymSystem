/**
 * GymSystem — index.js
 * Lógica del módulo de index (dashboard).
 * Dependencias: auth.js (debe cargarse antes)
 */

// ── Auth guard ─────────────────────────────────────────────────────────────

  // Verificar si el token expiró
  }

  // ── Cargar datos de usuario ────────────────────────────────────────────────

  // ── Fecha de hoy ────────────────────────────────────────────────────────────
  const hoy = new Date();
  document.getElementById('fechaHoy').textContent = hoy.toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // ── Headers con token ────────────────────────────────────────────────────────

  // ── Cargar stats ─────────────────────────────────────────────────────────────
  async function cargarStats() {
    try {
      // Socios activos
      const socios = await fetch(`${API_BASE}/api/socios`, { headers: authHeaders() });
      if (socios.ok) {
        const data = await socios.json();
        const activos = data.filter(s => s.activo).length;
        document.getElementById('totalSocios').textContent = activos;
        document.getElementById('trendSocios').textContent = `${activos} activos`;
      }

      // Membresías por vencer en 7 días
      const membresias = await fetch(`${API_BASE}/api/membresias/por-vencer?dias=7`, { headers: authHeaders() });
      if (membresias.ok) {
        const data = await membresias.json();
        document.getElementById('membresiasVencer').textContent = data.length;
        document.getElementById('trendMembresias').textContent = `${data.length} en 7 días`;
        cargarTablaMembresias(data);
      }

      // Asistencias de hoy
      const fechaHoyStr = hoy.toISOString().split('T')[0];
      const asist = await fetch(`${API_BASE}/api/asistencias/fecha/${fechaHoyStr}`, { headers: authHeaders() });
      if (asist.ok) {
        const data = await asist.json();
        document.getElementById('asistenciasHoy').textContent = data.length;
      }

      // Total recaudado este mes
      const mes  = String(hoy.getMonth() + 1).padStart(2, '0');
      const anio = hoy.getFullYear();
      const pagos = await fetch(`${API_BASE}/api/pagos/periodo/total?mes=${mes}&anio=${anio}`, { headers: authHeaders() });
      if (pagos.ok) {
        const data = await pagos.json();
        document.getElementById('totalPagos').textContent = `$${(data.totalRecaudado || 0).toLocaleString('es-AR')}`;
      }

    } catch (err) {
      // Datos de demo si la API no responde
      document.getElementById('totalSocios').textContent     = '—';
      document.getElementById('membresiasVencer').textContent = '—';
      document.getElementById('asistenciasHoy').textContent  = '—';
      document.getElementById('totalPagos').textContent      = '—';
    }
  }

  // ── Tabla membresías ──────────────────────────────────────────────────────────
  function cargarTablaMembresias(data) {
    const tbody = document.getElementById('tablaMembresias');
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="4">
        <div class="empty-state"><span>✅</span><p>No hay membresías por vencer</p></div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = data.slice(0, 8).map(m => {
      const venc   = new Date(m.fechaVencimiento);
      const diff   = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
      const badge  = diff <= 2 ? 'badge-red' : diff <= 5 ? 'badge-yellow' : 'badge-green';
      const estado = diff <= 2 ? 'Urgente' : diff <= 5 ? `${diff} días` : `${diff} días`;
      return `
        <tr>
          <td>${m.nombreSocio || '—'}</td>
          <td>${m.nombrePlan || '—'}</td>
          <td>${venc.toLocaleDateString('es-AR')}</td>
          <td><span class="badge ${badge}">${estado}</span></td>
        </tr>
      `;
    }).join('');
  }

  // ── Actividad reciente ────────────────────────────────────────────────────────
  async function cargarActividad() {
    const lista = document.getElementById('actividadLista');
    try {
      const fechaHoyStr = hoy.toISOString().split('T')[0];
      const res = await fetch(`${API_BASE}/api/asistencias/fecha/${fechaHoyStr}`, { headers: authHeaders() });

      if (res.ok) {
        const data = await res.json();
        if (!data.length) {
          lista.innerHTML = `<div class="empty-state"><span>😴</span><p>Sin actividad hoy</p></div>`;
          return;
        }
        lista.innerHTML = data.slice(0, 8).map(a => `
          <div class="activity-item">
            <div class="activity-dot dot-green"></div>
            <div>
              <div class="activity-text"><strong>${a.nombreSocio || 'Socio'}</strong> ingresó al gym</div>
              <div class="activity-time">${a.horaEntrada} — ${a.tipoNombre || 'Entrenamiento libre'}</div>
            </div>
          </div>
        `).join('');
      }
    } catch {
      lista.innerHTML = `<div class="empty-state"><span>📡</span><p>Sin conexión a la API</p></div>`;
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────────

  // ── Init ──────────────────────────────────────────────────────────────────────
  cargarStats();
  cargarActividad();
