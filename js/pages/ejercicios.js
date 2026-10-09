/**
 * GymSystem — ejercicios.js
 * Lógica del módulo de ejercicios.
 * Dependencias: auth.js (debe cargarse antes)
 */

// Verificar si el token expiró
  }


  const GRUPOS_EMOJI = {
    'Pecho': '🫁', 'Espalda': '🔙', 'Hombros': '💪',
    'Bíceps': '💪', 'Tríceps': '💪', 'Piernas': '🦵',
    'Glúteos': '🍑', 'Abdominales': '⚡', 'Cardio': '❤️',
    'Cuerpo completo': '🏋️'
  };

  const GRUPOS_COLOR = {
    'Pecho': '#ff6b6b', 'Espalda': '#4ecdc4', 'Hombros': '#45b7d1',
    'Bíceps': '#96ceb4', 'Tríceps': '#ffeaa7', 'Piernas': '#dda0dd',
    'Glúteos': '#f0a500', 'Abdominales': '#e8ff47', 'Cardio': '#ff4757',
    'Cuerpo completo': '#47ffd4'
  };

  let ejercicios = [];
  let ejerciciosFiltrados = [];
  let grupoActual = 'Todos';
  let ejEditando = null;

  // ── Cargar ejercicios ────────────────────────────────────────────────────────
  async function cargarEjercicios() {
    try {
      const res = await fetch(`${API_BASE}/api/ejercicios`, { headers: authHeaders() });
      ejercicios = res.ok ? await res.json() : [];
    } catch {
      ejercicios = [];
      showToast('Sin conexión a la API', 'error');
    }
    actualizarStats();
    renderGrupos();
    filtrar();
  }

  function actualizarStats() {
    const grupos    = new Set(ejercicios.map(e => e.grupoMuscular).filter(Boolean));
    const conVideo  = ejercicios.filter(e => e.videoUrl).length;
    document.getElementById('statTotal').textContent    = ejercicios.length;
    document.getElementById('statGrupos').textContent   = grupos.size;
    document.getElementById('statConVideo').textContent = conVideo;
  }

  // ── Chips de grupos ──────────────────────────────────────────────────────────
  function renderGrupos() {
    const grupos   = ['Todos', ...new Set(ejercicios.map(e => e.grupoMuscular).filter(Boolean)).values()];
    const wrap = document.getElementById('gruposWrap');
    wrap.innerHTML = grupos.map(g => {
      const count  = g === 'Todos' ? ejercicios.length : ejercicios.filter(e => e.grupoMuscular === g).length;
      const emoji  = GRUPOS_EMOJI[g] || '💪';
      const activo = g === grupoActual;
      return `<button class="grupo-chip ${activo ? 'active' : ''}" onclick="seleccionarGrupo('${g}')">
        <span>${emoji}</span> ${g} <span class="chip-count">${count}</span>
      </button>`;
    }).join('');
  }

  function seleccionarGrupo(g) {
    grupoActual = g;
    renderGrupos();
    filtrar();
  }

  // ── Filtrar ──────────────────────────────────────────────────────────────────
  function filtrar() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    ejerciciosFiltrados = ejercicios.filter(e => {
      const matchGrupo = grupoActual === 'Todos' || e.grupoMuscular === grupoActual;
      const matchQ     = !q ||
        (e.nombre        || '').toLowerCase().includes(q) ||
        (e.grupoMuscular || '').toLowerCase().includes(q) ||
        (e.descripcion   || '').toLowerCase().includes(q);
      return matchGrupo && matchQ && e.estado !== false;
    });
    document.getElementById('statFiltrados').textContent = ejerciciosFiltrados.length;
    document.getElementById('countLabel').textContent =
      ejerciciosFiltrados.length === ejercicios.length
        ? `${ejercicios.length} ejercicios en total`
        : `${ejerciciosFiltrados.length} de ${ejercicios.length} ejercicios`;
    renderGrid();
  }

  // ── Render grid ──────────────────────────────────────────────────────────────
  function renderGrid() {
    const grid = document.getElementById('ejerciciosGrid');
    if (!ejerciciosFiltrados.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <span>🔍</span>
          <h3>Sin resultados</h3>
          <p>No se encontraron ejercicios con esos filtros.<br>Probá cambiar el grupo muscular o la búsqueda.</p>
        </div>`;
      return;
    }

    grid.innerHTML = ejerciciosFiltrados.map((e, i) => {
      const emoji = GRUPOS_EMOJI[e.grupoMuscular] || '💪';
      const color = GRUPOS_COLOR[e.grupoMuscular] || 'var(--accent)';
      return `
        <div class="ejercicio-card" style="animation-delay:${i * .04}s">
          <div class="ej-thumb" style="background: linear-gradient(135deg, var(--surface2), rgba(${hexToRgb(color)},.08))">
            <span style="filter:drop-shadow(0 4px 8px rgba(0,0,0,.4))">${emoji}</span>
            <span class="ej-grupo-tag" style="color:${color}">${e.grupoMuscular || '—'}</span>
          </div>
          <div class="ej-body">
            <div class="ej-nombre">${e.nombre || '—'}</div>
            <div class="ej-desc">${e.descripcion || 'Sin descripción disponible.'}</div>
            <div class="ej-actions">
              <button class="btn-sm" onclick="editarEjercicio(${e.idEjercicio})">✏ Editar</button>
              ${e.videoUrl
                ? `<a class="btn-sm" href="${e.videoUrl}" target="_blank" rel="noopener">▶ Video</a>`
                : ''}
              <button class="btn-sm danger" onclick="eliminarEjercicio(${e.idEjercicio},'${(e.nombre||'').replace(/'/g,'')}')">🗑</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function hexToRgb(hex) {
    // Para colores CSS var() devuelve genérico
    if (hex.startsWith('var')) return '232,255,71';
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return isNaN(r) ? '232,255,71' : `${r},${g},${b}`;
  }

  // ── Preview grupo en modal ────────────────────────────────────────────────────
  function actualizarPreview() {
    const grupo = document.getElementById('fGrupo').value;
    const preview = document.getElementById('grupoPreview');
    if (grupo) {
      document.getElementById('previewIcon').textContent = GRUPOS_EMOJI[grupo] || '💪';
      document.getElementById('previewName').textContent = grupo;
      preview.style.display = 'flex';
    } else {
      preview.style.display = 'none';
    }
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────────
  function abrirModal() {
    ejEditando = null;
    document.getElementById('modalTitle').textContent = 'NUEVO EJERCICIO';
    document.getElementById('btnGuardar').textContent = 'GUARDAR';
    document.getElementById('fNombre').value = '';
    document.getElementById('fGrupo').value  = '';
    document.getElementById('fDesc').value   = '';
    document.getElementById('fVideo').value  = '';
    document.getElementById('grupoPreview').style.display = 'none';
    document.getElementById('modalOverlay').classList.add('open');
    setTimeout(() => document.getElementById('fNombre').focus(), 200);
  }

  function editarEjercicio(id) {
    const e = ejercicios.find(x => x.idEjercicio === id);
    if (!e) return;
    ejEditando = e;
    document.getElementById('modalTitle').textContent = 'EDITAR EJERCICIO';
    document.getElementById('btnGuardar').textContent = 'ACTUALIZAR';
    document.getElementById('fNombre').value = e.nombre        || '';
    document.getElementById('fGrupo').value  = e.grupoMuscular || '';
    document.getElementById('fDesc').value   = e.descripcion   || '';
    document.getElementById('fVideo').value  = e.videoUrl      || '';
    actualizarPreview();
    document.getElementById('modalOverlay').classList.add('open');
  }

  async function guardarEjercicio() {
    const nombre = document.getElementById('fNombre').value.trim();
    const grupo  = document.getElementById('fGrupo').value;
    if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }
    if (!grupo)  { showToast('Seleccioná un grupo muscular', 'error'); return; }

    const btn = document.getElementById('btnGuardar');
    btn.disabled = true;
    btn.textContent = '...';

    const body = {
      nombre,
      grupoMuscular: grupo,
      descripcion:   document.getElementById('fDesc').value.trim()  || null,
      videoUrl:      document.getElementById('fVideo').value.trim() || null
    };

    try {
      // Si editando, eliminamos el anterior y creamos uno nuevo
      // (la API solo tiene POST y DELETE para ejercicios)
      if (ejEditando) {
        await fetch(`${API_BASE}/api/ejercicios/${ejEditando.idEjercicio}`, {
          method: 'DELETE', headers: authHeaders()
        });
      }
      const res = await fetch(`${API_BASE}/api/ejercicios`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast(ejEditando ? 'Ejercicio actualizado correctamente' : 'Ejercicio creado correctamente', 'success');
        cerrarModal();
        await cargarEjercicios();
      } else {
        showToast('Error al guardar el ejercicio', 'error');
      }
    } catch { showToast('Sin conexión a la API', 'error'); }
    finally {
      btn.disabled = false;
      btn.textContent = ejEditando ? 'ACTUALIZAR' : 'GUARDAR';
    }
  }

  async function eliminarEjercicio(id, nombre) {
    if (!confirm(`¿Eliminar el ejercicio "${nombre}"?\nEsta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/ejercicios/${id}`, {
        method: 'DELETE', headers: authHeaders()
      });
      if (res.ok) {
        showToast(`"${nombre}" eliminado correctamente`, 'success');
        await cargarEjercicios();
      } else { showToast('No se pudo eliminar el ejercicio', 'error'); }
    } catch { showToast('Sin conexión a la API', 'error'); }
  }

  function cerrarModal() { document.getElementById('modalOverlay').classList.remove('open'); }
  function cerrarModalSiOverlay(e) { if (e.target === document.getElementById('modalOverlay')) cerrarModal(); }


  cargarEjercicios();
