# GymSystem — Frontend

Sistema de gestión para gimnasio. Frontend puro (HTML + CSS + JS vanilla), consumiendo una API REST en .NET.

---

## Estructura del proyecto

```
GymSystem/
├── login.html              # Pantalla de login
│
├── pages/                  # Páginas internas (requieren auth)
│   ├── dashboard.html
│   ├── socios.html
│   ├── membresias.html
│   ├── pagos.html
│   ├── asistencias.html
│   ├── clases.html
│   ├── rutinas.html
│   └── ejercicios.html
│
├── css/
│   ├── base.css            # Variables, reset, layout, componentes compartidos
│   ├── login.css           # Estilos exclusivos de la pantalla de login
│   ├── dashboard.css       # Estilos específicos del dashboard
│   ├── socios.css
│   ├── membresias.css
│   ├── pagos.css
│   ├── asistencias.css
│   ├── clases.css
│   ├── rutinas.css
│   └── ejercicios.css
│
├── js/
│   ├── auth.js             # Auth guard, token, headers, toast, logout (compartido)
│   ├── login.js            # Lógica exclusiva del login
│   └── pages/
│       ├── dashboard.js
│       ├── socios.js
│       ├── membresias.js
│       ├── pagos.js
│       ├── asistencias.js
│       ├── clases.js
│       ├── rutinas.js
│       └── ejercicios.js
│
└── img/                    # Imágenes e íconos estáticos
```

---

## Orden de carga de archivos

### Páginas internas (`/pages/*.html`)

```html
<!-- En el <head> -->
<link rel="stylesheet" href="../css/base.css" />
<link rel="stylesheet" href="../css/[modulo].css" />

<!-- Antes de </body> -->
<script src="../js/auth.js"></script>
<script src="../js/pages/[modulo].js"></script>
```

### Login (`/login.html`)

```html
<link rel="stylesheet" href="css/base.css" />
<link rel="stylesheet" href="css/login.css" />
<script src="js/login.js"></script>
```

> `auth.js` **no** se carga en login — esa página es la fuente del token.

---

## Responsabilidades por archivo

### `css/base.css`
- Variables CSS (`:root`)
- Reset universal
- Layout `.app` (grid sidebar + main)
- Topbar, sidebar, nav-items
- Componentes reutilizables: `.badge`, `.btn-primary`, `.toast`, `.modal`, `.panel`, tabla, paginación, skeleton, empty-state

### `css/[modulo].css`
- Estilos únicos de cada página (grids de tarjetas, chips de filtro, paneles laterales de detalle, etc.)

### `js/auth.js`
- `API_BASE` — URL base de la API
- Guard de autenticación (redirect si no hay token o expiró)
- Inyecta email/rol/avatar del usuario en el DOM
- `authHeaders()` — headers con Bearer token
- `showToast(msg, type)` — notificación visual
- `logout()` — limpia storage y redirige
- `formatFecha(str)` y `fechaHoyISO()` — helpers de fecha

### `js/pages/[modulo].js`
- Todo lo específico del módulo: carga de datos, filtros, modales, CRUD

---

## Configuración de la API

Cambiar la URL en un solo lugar:

```js
// js/auth.js
const API_BASE = 'https://localhost:7158';
```

---

## Convenciones

- CSS: kebab-case (`.stats-row`, `.mini-stat-val`)
- JS: camelCase (`cargarSocios`, `renderTabla`)
- IDs HTML: camelCase (`tablaHistorial`, `userEmail`)
- Comentarios de sección en CSS con `/* ── Nombre ── */`
- Comentarios de sección en JS con `// ── Nombre ─────`
