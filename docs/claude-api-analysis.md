# GymSystem Frontend — API Contract Analysis

*Everything below is inferred from how the frontend calls the API, so field types and shapes are what the code expects, not necessarily what the backend actually returns. Endpoint paths, field names and enum values are kept exactly as they appear in the code.*

## 1. Overview

| Item | Value |
| --- | --- |
| Base URL | `http://localhost:7158` (`API_BASE`, defined in `auth.js`; duplicated in `login.js`) |
| Backend style | ASP.NET Core Web API (inferred from port 7158, `err.title` ProblemDetails usage, and the Visual Studio hint in the login error) |
| Auth | JWT Bearer token on every request except login |
| Standard headers | `Authorization: Bearer <token>` and `Content-Type: application/json` (via `authHeaders()`) |
| Success check | Always `res.ok`; the frontend almost never reads status codes except 401 (login) and 404 (salida) |
| Error body | Only `err.title` is read (ProblemDetails), and only in `socios.js` and `asistencias.js` |
| JSON naming | camelCase, with `id` + entity prefix for keys (`idSocio`, `idMembresia`, ...) |
| Total distinct endpoints used | 37 |

### Session storage (localStorage)

| Key | Set by | Meaning |
| --- | --- | --- |
| `token` | login.js | JWT |
| `rol` | login.js | Role string from the API (default shown in UI: `Admin`) |
| `email` | login.js | User email (shown in sidebar) |
| `expira` | login.js | Token expiry timestamp; `auth.js` compares it with `new Date()` and logs out if expired |

## 2. Endpoint index

| Method | Path | Used by |
| --- | --- | --- |
| POST | `/api/auth/login` | login |
| GET | `/api/socios` | socios, membresias, asistencias, rutinas, index |
| POST | `/api/socios` | socios |
| PUT | `/api/socios/{id}` | socios |
| DELETE | `/api/socios/{id}` | socios |
| PATCH | `/api/socios/{id}/activar` | socios |
| PATCH | `/api/socios/{id}/desactivar` | socios |
| GET | `/api/membresias` | membresias, pagos |
| GET | `/api/membresias/por-vencer?dias=7` | index |
| POST | `/api/membresias` | membresias |
| PUT | `/api/membresias/{id}` | membresias (edit + renew) |
| DELETE | `/api/membresias/{id}` | membresias |
| GET | `/api/planes` | membresias |
| GET | `/api/pagos` | membresias, pagos |
| GET | `/api/pagos/membresia/{id}` | membresias (detail modal) |
| GET | `/api/pagos/periodo/total?mes={MM}&anio={YYYY}` | index, membresias |
| POST | `/api/pagos` | pagos, membresias |
| PUT | `/api/pagos/{id}` | pagos (confirm / unconfirm only) |
| DELETE | `/api/pagos/{id}` | pagos |
| GET | `/api/asistencias/fecha/{YYYY-MM-DD}` | asistencias, index |
| POST | `/api/asistencias/entrada` | asistencias |
| PUT | `/api/asistencias/salida/{idSocio}` | asistencias |
| GET | `/api/tipos-entrenamiento` | asistencias (has a fallback) |
| GET | `/api/clases` | clases, asistencias (fallback) |
| POST | `/api/clases` | clases |
| PUT | `/api/clases/{id}` | clases (edit + enroll/unenroll) |
| DELETE | `/api/clases/{id}` | clases |
| GET | `/api/profesores` | clases (has a fallback) |
| GET | `/api/profesores/combo` | rutinas |
| GET | `/api/ejercicios` | ejercicios, rutinas |
| POST | `/api/ejercicios` | ejercicios |
| DELETE | `/api/ejercicios/{id}` | ejercicios |
| GET | `/api/rutinas` | rutinas |
| GET | `/api/rutinas/{id}/ejercicios` | rutinas (detail modal) |
| POST | `/api/rutinas` | rutinas |
| PUT | `/api/rutinas/{id}` | rutinas |
| DELETE | `/api/rutinas/{id}` | rutinas |

## 3. Authentication

### `POST /api/auth/login`

**Request**

```json
{ "email": "string", "password": "string" }
```

(No auth header.)

**Expected responses**

| Status | Frontend behaviour |
| --- | --- |
| 200 | Reads `{ token, rol, email, expira }` and stores all four in localStorage, then redirects to `pages/index.html` |
| 401 | Shows `Email o contraseña incorrectos.` |
| anything else | Shows `Error en el servidor. Intentá de nuevo.` |
| network failure | Shows the "API not running in Visual Studio" message |

**Client-side role check:** the login screen has role buttons (default `Admin`, via `data-rol`). After a successful 200, if `data.rol.toLowerCase()` differs from the selected role, the login is rejected locally with `Credenciales incorrectas para el rol "X"`. The API itself is not sent the selected role, so this is a UI-only gate.

### Auth guard (`auth.js`)

- No `token` in localStorage means redirect to `login.html` (or `../login.html` when the path contains `/pages/`).
- `expira` in the past means `localStorage.clear()` and redirect.
- `login.js` redirects to `pages/index.html` on load if a token already exists (it doesn't check expiry there).
- No page handles a `401`/`403` coming back from a data endpoint; expiry is only detected client-side by `expira`.

## 4. Modules

### 4.1 Socios (`socios.js`)

**`GET /api/socios`** returns an array of:

| Field | Type | Notes |
| --- | --- | --- |
| `idSocio` | number |  |
| `apellido`, `nombre` | string |  |
| `dni` | string | `.toLowerCase()` is called on it, so it must be a string, not a number |
| `telefono`, `email`, `direccion` | string / null |  |
| `fechaNacimiento` | ISO datetime / null | Frontend does `.split('T')[0]` |
| `fechaAlta` | date string |  |
| `fotoUrl` | string / null | Rendered in `<img>` with a fallback to the surname initial |
| `activo` | boolean |  |

**`POST /api/socios`** body:

```json
{ "apellido": "", "nombre": "", "dni": "", "telefono": null, "email": null,
  "direccion": null, "fechaNacimiento": null, "fotoUrl": null }
```

Only `apellido`, `nombre`, `dni` are required by the UI; the rest are sent as `null` when empty. Errors: reads `err.title`.

**`PUT /api/socios/{id}`** body: same as POST plus `activo` (the existing value).

**`DELETE /api/socios/{id}`**: no body, only `res.ok` is checked.

**`PATCH /api/socios/{id}/activar`** and **`/desactivar`**: no body, only `res.ok` is checked.

### 4.2 Membresías and Planes (`membresias.js`)

**`GET /api/membresias`** returns an array of:

| Field | Type | Notes |
| --- | --- | --- |
| `idMembresia`, `idSocio`, `idPlan` | number |  |
| `nombreSocio`, `nombrePlan` | string | Pre-joined names, used for display and search |
| `precioMensual` | number | Used to prefill the payment amount |
| `fechaInicio`, `fechaVencimiento` | ISO date(time) | Both get `.split('T')[0]` in the edit form |
| `activo` | boolean |  |

The frontend computes status itself: days to expiry = `ceil((fechaVencimiento − now) / 1 day)`; `Vencida` if < 0, warning if ≤ 7, `Inactiva` if `!activo`.

**`GET /api/membresias/por-vencer?dias=7`** (dashboard): array of memberships with at least `nombreSocio`, `nombrePlan`, `fechaVencimiento`.

**`POST /api/membresias`**

```json
{ "idSocio": 1, "idPlan": 1, "fechaInicio": "YYYY-MM-DD", "fechaVencimiento": "YYYY-MM-DD" }
```

**`PUT /api/membresias/{id}`** is used in two different shapes:

| Caller | Body |
| --- | --- |
| Edit modal | `{ idMembresia, idPlan, fechaVencimiento, activo }` |
| Renew button (+1 month on current expiry) | `{ fechaVencimiento, activo: true }` (no `idMembresia`, no `idPlan`) |

**`DELETE /api/membresias/{id}`**: no body.

**`GET /api/planes`** returns an array of `{ idPlan, nombre, precioMensual, activo }`. Only `activo` plans are shown in the dropdown.

### 4.3 Pagos (`pagos.js` + parts of `membresias.js` and `index.js`)

**`GET /api/pagos`** returns an array of:

| Field | Type | Notes |
| --- | --- | --- |
| `idPago` | number |  |
| `idMembresia` | number | Used to preselect the membership when editing |
| `nombreSocio` | string |  |
| `nombrePlan` or `nombreMembresia` | string | Frontend accepts either |
| `fotoUrl` | string / null | Used for the avatar in the table |
| `periodoMes` | string or number | Compared as `String(...)`, `padStart(2,'0')` and `parseInt` all over, so the type is ambiguous |
| `periodoAnio` | string or number | Same ambiguity |
| `medioPago` | string | Known values: `Efectivo`, `Débito`, `Crédito`, `Transferencia`, `MercadoPago` |
| `fechaPago` | ISO date(time) |  |
| `monto` | number |  |
| `confirmado` or `estado` | boolean (or `0/1`) | **Inconsistent, see section 5** |
| `observaciones` | string / null |  |

**`GET /api/pagos/membresia/{id}`**: array of pagos for one membership. Fields read: `periodoMes`, `periodoAnio`, `fechaPago`, `medioPago`, `monto`.

**`GET /api/pagos/periodo/total?mes=MM&anio=YYYY`** returns:

```json
{ "totalRecaudado": 123456 }
```

`mes` is sent zero-padded (`"09"`).

**`POST /api/pagos`** has two different bodies depending on the page:

```json
// pagos.js
{ "idMembresia": 1, "monto": 1000.0, "medioPago": "Efectivo", "fechaPago": "YYYY-MM-DD",
  "periodoMes": "09", "periodoAnio": "2026", "estado": true, "observaciones": null }

// membresias.js (quick-pay modal)
{ "idMembresia": 1, "monto": 1000, "fechaPago": "YYYY-MM-DD",
  "periodoMes": "09", "periodoAnio": "2026", "medioPago": "Efectivo" }
```

**`PUT /api/pagos/{id}`**: only ever sent as `{ "confirmado": true|false }` to toggle status.

**`DELETE /api/pagos/{id}`**: no body. Also used as step 1 of the "edit" flow (see section 5).

### 4.4 Asistencias (`asistencias.js`, `index.js`)

**`GET /api/asistencias/fecha/{YYYY-MM-DD}`** returns an array of:

| Field | Type | Notes |
| --- | --- | --- |
| `idSocio` | number |  |
| `nombreSocio` | string |  |
| `tipoNombre` | string / null | Falls back to `Entrenamiento` in the UI |
| `fecha` | date |  |
| `horaEntrada` | string `HH:mm:ss` | Parsed with `.split(':')` into h/m/s |
| `horaSalida` | string / null | Null means the member is still in the gym |
| `duracion` | string `HH:mm[:ss]` / null | Parsed with `.split(':')` into h/m for the average-duration stat |
| `activo` | boolean | "In gym now" = `activo && !horaSalida` |

**`POST /api/asistencias/entrada`**

```json
{ "idSocio": 1, "idTipoEntrenamiento": 2, "fecha": "YYYY-MM-DD", "horaEntrada": "HH:mm:ss" }
```

Errors: reads `err.title`.

**`PUT /api/asistencias/salida/{idSocio}`**: no body. Success returns JSON containing `duracion` (shown in the toast). `404` is interpreted as *this member has no active entry*.

**`GET /api/tipos-entrenamiento`** returns an array of `{ idTipoEntrenamiento, nombre }`. If it fails, the frontend falls back to deriving the list from `GET /api/clases` (`idTipoEntrenamiento` + `tipoNombre`).

The page auto-refreshes every 60 s; the in-gym card durations re-render every 30 s.

### 4.5 Clases and Profesores (`clases.js`)

**`GET /api/clases`** returns an array of:

| Field | Type | Notes |
| --- | --- | --- |
| `idClase` | number |  |
| `idTipoEntrenamiento`, `tipoNombre` | number, string |  |
| `idProfesor`, `nombreProfesor` | number, string |  |
| `diaSemana` | string | **Spanish day name**, must be one of `Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo` (matched by string equality) |
| `horaInicio`, `horaFin` | string `HH:mm:ss` | UI slices to `HH:mm` |
| `capacidadMax` | number |  |
| `lugaresDisponible` | number | Note the singular spelling |
| `activo` | boolean |  |

**`POST /api/clases`**

```json
{ "idTipoEntrenamiento": 1, "idProfesor": 1, "diaSemana": "Lunes",
  "horaInicio": "HH:mm", "horaFin": "HH:mm", "capacidadMax": 20 }
```

**`PUT /api/clases/{id}`** is used in two different shapes:

| Caller | Body |
| --- | --- |
| Edit modal | `{ idProfesor, diaSemana, horaInicio (HH:mm), horaFin (HH:mm), capacidadMax, activo: true }` |
| Enroll / unenroll buttons | `{ idTipoEntrenamiento, idProfesor, diaSemana, horaInicio (as received), horaFin (as received), capacidadMax, lugaresDisponible, activo }` |

There is no enrollment endpoint; enrolling a member is simulated by decrementing `lugaresDisponible` via PUT (and "Dar de baja" increments it).

**`DELETE /api/clases/{id}`**: no body.

**`GET /api/profesores`** returns an array of `{ idProfesor, nombre, apellido, activo }`. If it fails, the frontend derives professors from existing clases (`idProfesor` + `nombreProfesor`).

The class-type dropdown (`fTipo`) is not populated by the JS, so it is presumably hardcoded in the HTML (not provided).

### 4.6 Ejercicios (`ejercicios.js`)

**`GET /api/ejercicios`** returns an array of:

| Field | Type | Notes |
| --- | --- | --- |
| `idEjercicio` | number |  |
| `nombre` | string |  |
| `grupoMuscular` | string | Known values: `Pecho, Espalda, Hombros, Bíceps, Tríceps, Piernas, Glúteos, Abdominales, Cardio, Cuerpo completo` |
| `descripcion` | string / null |  |
| `videoUrl` | string / null |  |
| `estado` | boolean | Items with `estado === false` are hidden |

**`POST /api/ejercicios`**

```json
{ "nombre": "", "grupoMuscular": "", "descripcion": null, "videoUrl": null }
```

**`DELETE /api/ejercicios/{id}`**: no body.

The code comment states the API only has POST and DELETE for ejercicios, so **edit = DELETE then POST** (see section 5).

### 4.7 Rutinas (`rutinas.js`)

**`GET /api/rutinas`** returns an array of:

| Field | Type | Notes |
| --- | --- | --- |
| `idRutina`, `idSocio`, `idProfesor` | number |  |
| `nombre`, `objetivo`, `notas`, `tipo` | string / null |  |
| `nivel` | string | `Principiante`, `Intermedio`, `Avanzado` |
| `diasSemana`, `duracionMinutos` | number / null |  |
| `nombreSocio` or `NombreSocio` | string | Frontend accepts both casings |
| `nombreProfesor` or `NombreProfesor` | string | Same |
| `ejercicios` | array (optional) | Used for the card preview and to prefill the edit modal. Item fields read: `idEjercicio`, `nombreEjercicio` or `nombre`, `grupoMuscular`, `series`, `repeticiones` |

**`GET /api/rutinas/{id}/ejercicios`** (detail modal) returns an array. The frontend defensively accepts alternative names for each field:

| Displayed as | Fields tried, in order |
| --- | --- |
| Exercise | `ejercicio`, `nombreEjercicio`, `nombre` |
| Group | `grupoMuscular` |
| Series | `serie`, `series` |
| Reps / time | `repeticion`, `repeticiones` |
| Rest | `descansoSeg`, `descansoSegundos` (shown with an `s` suffix) |

**`POST /api/rutinas`** and **`PUT /api/rutinas/{id}`** share the same body:

```json
{
  "idSocio": 1, "idProfesor": 1, "nombre": "", "objetivo": null, "nivel": "Principiante",
  "diasSemana": 3, "duracionMinutos": 60, "tipo": null, "notas": null,
  "ejercicios": [ { "idEjercicio": "5", "orden": 1, "series": "3", "repeticiones": "12" } ]
}
```

Notes: `idEjercicio`, `series` and `repeticiones` are sent as **strings** (they come straight from inputs/selects); `diasSemana` and `duracionMinutos` are parsed to ints or `null`; `descanso` is never sent even though the detail view can display it.

**`DELETE /api/rutinas/{id}`**: no body. Also step 1 of the DELETE+POST fallback.

**`GET /api/profesores/combo`** returns an array of `{ idProfesor, nombre }`. This is a **different shape** than `/api/profesores` (which has separate `nombre` and `apellido`).

### 4.8 Dashboard (`index.js`)

Pure consumer, no writes. Calls: `/api/socios` (counts `activo`), `/api/membresias/por-vencer?dias=7`, `/api/asistencias/fecha/{today}`, `/api/pagos/periodo/total?mes&anio` (reads `totalRecaudado`). Shows only the first 8 rows for the expiring-memberships table and the activity feed.

## 5. Inconsistencies, risks and things worth fixing

### Contract inconsistencies

1. **Payment status field name.** `pagos.js` reads `confirmado`; `membresias.js` reads `estado`; `POST /api/pagos` sends `estado`; `PUT /api/pagos/{id}` sends `confirmado`. The API probably exposes one of them, and one of the two pages is probably showing every payment as pending or confirmed incorrectly.
2. **`POST /api/pagos` payload differs by page.** `membresias.js` omits `estado` and `observaciones`.
3. **`PUT /api/membresias/{id}` has two shapes** (edit vs renew). The renew body lacks `idMembresia` and `idPlan`, which will fail if the backend validates a matching ID or requires the plan.
4. **`PUT /api/clases/{id}` has two shapes.** The edit modal forces `activo: true` and doesn't send `lugaresDisponible`, which may reset availability or reactivate an inactive class. It also ignores the class type, so the type cannot be changed.
5. **Profesores come in two shapes** (`/api/profesores` vs `/api/profesores/combo`).
6. **Defensive field aliases** in rutinas (`serie`/`series`, `repeticion`/`repeticiones`, `descansoSeg`/`descansoSegundos`, `NombreSocio`/`nombreSocio`, ...) and pagos (`nombrePlan`/`nombreMembresia`) suggest the frontend author wasn't sure of the real names. Worth locking these down in the backend DTOs.
7. **`periodoMes` / `periodoAnio` types** are sent as strings and compared several ways. Decide on `int` or `string` and stick with it.
8. **String IDs and numbers in rutinas ejercicios.** New items send `idEjercicio` as a string; existing ones keep the number from the API.

### Destructive "edit" workflows (data-loss risk)

- **Ejercicios edit:** `DELETE` then `POST`. The exercise gets a **new ID**, which can orphan rows in routines referencing the old one, and if the POST fails the exercise is already gone.
- **Pagos edit:** same `DELETE` then `POST` pattern. It also changes `idPago` and any audit trail.
- **Rutinas edit:** tries `PUT`, and if it returns *any* non-OK status (including a 400 validation error) it silently `DELETE`s the routine and `POST`s a new one. A validation failure can therefore delete the original and then fail to recreate it.
- **Rutinas edit prefill** depends on `r.ejercicios` being present in `GET /api/rutinas`. If the list endpoint doesn't embed exercises, editing and saving would send an empty `ejercicios` array and wipe them.
- The ejercicios and pagos DELETE+POST flows don't check the DELETE result at all.

### Client-side logic that probably belongs on the server

- **Class enrollment** is faked by editing `lugaresDisponible` (race conditions between two users, no record of *who* is enrolled).
- **Role check at login** is UI-only; authorization isn't enforced by anything in these files.
- **Membership expiry, "por vencer" and status** are computed in the browser (also `por-vencer` is requested from the server, but `membresias.js` recomputes the same logic locally).
- **"Este mes" attendance stat** is a placeholder (`historial.length + '+'`), not backed by an endpoint.
- **Monthly payment summary** (`pagos.js`) is computed client-side from the full `/api/pagos` list even though `/api/pagos/periodo/total` exists.
- **No server-side pagination or filtering:** every list endpoint is fetched in full and paginated in JS (`POR_PAG` 10–12).

### Date and time gotchas

- `new Date().toISOString().split('T')[0]` returns the **UTC** date. For es-AR (UTC−3), after about 21:00 local this is already tomorrow, so `fecha` in `POST /api/asistencias/entrada` and the `/fecha/{date}` queries can point at the wrong day. Meanwhile `horaEntrada` uses `toTimeString()` (local time), so date and time can be inconsistent.
- The "in gym now" panel always queries *today's* date, even if the history filter is set to another day.
- The days-left math uses `Date` subtraction with timezone-less date strings, so results can be off by one near midnight.

### Bugs found while reading

- `socios.js` defines `eliminarDesdeDetail` **twice**. The second definition overrides the first and calls `confirmarBaja(...)`, which doesn't exist, so the detail-modal delete would throw.
- `asistencias.js`, `clases.js`, `ejercicios.js`, `index.js` and `rutinas.js` each start with an orphaned `}` after the comment `// Verificar si el token expiró`. As uploaded these are syntax errors, probably left over from moving inline code (the expiry check now lives in `auth.js`).
- `login.js` redeclares `API_BASE` and is meant to run without `auth.js`. If both were loaded on one page, `const` would throw.
- In `index.js` the catch block only handles network errors; non-OK responses leave the placeholder values in place.
- Names are injected into `innerHTML` and inline `onclick` strings (`nombreSocio`, `descripcion`, `notas`, `videoUrl`, ...) without escaping, which is an XSS risk if any of that data is user-controlled. Apostrophes in names are only stripped in some places (clases, ejercicios, rutinas) and not in others (socios, membresias).
- The JWT is stored in `localStorage`, which is readable by any script on the page (relevant given the XSS point above).

## 6. Open questions for the backend

1. What is the real name of the payment status field (`estado` or `confirmado`)? Should both pages use the same one?
2. Does `GET /api/rutinas` embed `ejercicios`? What are the exact property names in both that and `/api/rutinas/{id}/ejercicios`?
3. Does `PUT /api/rutinas/{id}` exist and accept the full body including `ejercicios`? Same question for `PUT /api/ejercicios/{id}` and `PUT /api/pagos/{id}` (full update).
4. Is `PUT /api/membresias/{id}` tolerant of partial bodies (renew case)?
5. What does `PUT /api/clases/{id}` do when `lugaresDisponible` is omitted?
6. Does `PUT /api/asistencias/salida/{idSocio}` return `duracion` as `HH:mm:ss` or another format?
7. Where do the class-type and routine `tipo` values come from? `/api/tipos-entrenamiento` exists but `clases.js` doesn't use it.
8. Which other roles besides `Admin` can log in, and what are they allowed to do?
