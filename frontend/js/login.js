/**
 * GymSystem — login.js
 * Lógica de autenticación y pantalla de login.
 * No depende de auth.js (esta ES la pantalla de auth).
 */

const API_BASE = 'http://localhost:7158';
  let rolSeleccionado = 'Admin';

  function selectRol(btn) {
    document.querySelectorAll('.rol-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    rolSeleccionado = btn.dataset.rol;
  }

  function togglePassword() {
    const input = document.getElementById('password');
    const btn   = document.getElementById('toggleBtn');
    input.type  = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? '👁' : '🙈';
  }

  function showError(msg) {
    const el = document.getElementById('errorMsg');
    el.textContent = msg;
    el.classList.add('show');
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = '';
  }

  function hideError() {
    document.getElementById('errorMsg').classList.remove('show');
  }

  async function submitLogin() {
    hideError();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn      = document.getElementById('submitBtn');

    if (!email)    { showError('Por favor ingresá tu email.'); return; }
    if (!password) { showError('Por favor ingresá tu contraseña.'); return; }

    btn.classList.add('loading');

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();

        // Verificar que el rol del token coincida con el rol seleccionado
        if (data.rol.toLowerCase() !== rolSeleccionado.toLowerCase()) {
          showError(`Credenciales incorrectas para el rol "${rolSeleccionado}".`);
          btn.classList.remove('loading');
          return;
        }

        localStorage.setItem('token',  data.token);
        localStorage.setItem('rol',    data.rol);
        localStorage.setItem('email',  data.email);
        localStorage.setItem('expira', data.expira);
        window.location.href = 'pages/index.html';

      } else if (response.status === 401) {
        showError('Email o contraseña incorrectos.');
      } else {
        showError('Error en el servidor. Intentá de nuevo.');
      }
    } catch (err) {
      showError('No se pudo conectar con la API. Verificá que esté corriendo en Visual Studio.');
    } finally {
      btn.classList.remove('loading');
    }
  }

  window.addEventListener('load', () => {
    if (localStorage.getItem('token')) window.location.href = 'pages/index.html';
  });
