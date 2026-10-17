/**
 * GymSystem — auth.js
 * Utilidades compartidas: autenticación, cabeceras HTTP, toast, logout.
 * Debe cargarse ANTES que el JS de cada página.
 */

/* ── Configuración ───────────────────────────────────────────── */
const API_BASE = 'http://localhost:7158';

/* ── Auth guard ──────────────────────────────────────────────── */
const token  = localStorage.getItem('token');
const expira = localStorage.getItem('expira');

if (!token) {
  window.location.href = _loginPath();
}

if (expira && new Date(expira) < new Date()) {
  localStorage.clear();
  window.location.href = _loginPath();
}

/** Detecta si la página está en /pages/ o en la raíz */
function _loginPath() {
  return window.location.pathname.includes('/pages/')
    ? '../login.html'
    : 'login.html';
}

/* ── Info de usuario en el DOM ───────────────────────────────── */
const _userEmail = localStorage.getItem('email') || 'usuario@gym.com';
const _userRol   = localStorage.getItem('rol')   || 'Admin';

document.addEventListener('DOMContentLoaded', () => {
  const elEmail  = document.getElementById('userEmail');
  const elRol    = document.getElementById('userRol');
  const elAvatar = document.getElementById('userAvatar');

  if (elEmail)  elEmail.textContent  = _userEmail;
  if (elRol)    elRol.textContent    = _userRol;
  if (elAvatar) elAvatar.textContent = _userEmail.charAt(0).toUpperCase();
});

/* ── Headers con Bearer token ────────────────────────────────── */
function authHeaders() {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/* ── Toast notification ──────────────────────────────────────── */
let _toastTimer;

function showToast(msg, type = 'success') {
  const t       = document.getElementById('toast');
  const icon    = document.getElementById('toastIcon');
  const msgEl   = document.getElementById('toastMsg');

  if (!t) return;

  if (icon)  icon.textContent = type === 'success' ? '✅' : '❌';
  if (msgEl) msgEl.textContent = msg;

  t.className = `toast ${type} show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

/* ── Logout ──────────────────────────────────────────────────── */
function logout() {
  localStorage.clear();
  window.location.href = _loginPath();
}

/* ── Helpers de fecha ────────────────────────────────────────── */
function formatFecha(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d) ? dateStr : d.toLocaleDateString('es-AR');
}

function fechaHoyISO() {
  return new Date().toISOString().split('T')[0];
}


/* ── Sidebar toggle (mobile/tablet) ─────────────────────────── */
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const isOpen  = sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

// Cerrar sidebar al hacer clic en un nav-item (mobile)
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });
});
