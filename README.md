# THE MOI CINEMAS

Aplicación web de cartelera de cine con descubrimiento TMDB, funciones locales, selección de asientos, reservas, compras simuladas y valoraciones internas.

## Funcionalidades

- Inicio con descubrimiento de películas desde TMDB.
- Cartelera local configurada mediante `billboard`.
- Búsqueda predictiva y exploración por categorías.
- Detalles, reparto, director, tráiler y recomendaciones.
- Funciones con sala, fecha, hora, precio y disponibilidad.
- Mapa dinámico de asientos por función.
- Reservas y compras simuladas con revalidación.
- Consulta de Mis reservas y Mis compras.
- Valoraciones internas de 1 a 5 estrellas.
- Diseño responsive y navegación accesible.

## Requisitos

- Node.js y npm.
- Navegador moderno.
- Conexión a internet para TMDB y YouTube.
- Live Server o un servidor web estático equivalente.

## Instalación

```bash
npm install
npm run server
```

Si PowerShell bloquea `npm.ps1`:

```powershell
npm.cmd run server
```

JSON Server quedará disponible en `http://localhost:3000`. Después, abre `index.html` mediante Live Server.

## Fuentes de datos

TMDB proporciona títulos, imágenes, géneros, sinopsis, duración, créditos, vídeos, recomendaciones y datos de descubrimiento.

JSON Server proporciona:

- `billboard`: películas activas del cine mediante `tmdbId`.
- `functions`: sala, fecha, hora y precio por película.
- `rooms`: configuración y capacidad de las salas.
- `seats`: asientos físicos.
- `functionSeats`: disponibilidad por función.
- `reservations`, `purchases` y `ratings`: información local persistente.

Los datos visuales de una película no se duplican en `db.json`; Cartelera resuelve cada `tmdbId` mediante TMDB.

## Estructura

```text
cine-proyecto/
├── assets/
├── css/styles.css
├── db/db.json
├── js/app.js
├── DEVELOPER_NOTES.md
├── index.html
├── package.json
└── README.md
```

## Validación rápida

```bash
node --check js/app.js
```

Para comprobar el proyecto completo, mantén JSON Server y el frontend activos al mismo tiempo.

## Consideraciones

- El proyecto no procesa pagos reales.
- El módulo de pagos implementado en THE MOI CINEMAS es una simulación académica. No procesa transacciones financieras reales ni almacena credenciales bancarias o datos completos de tarjetas.
- JSON Server es una API local simulada.
- Las cuentas son académicas: las contraseñas se guardan sin cifrado en JSON Server y no deben usarse en producción.
- La API key de TMDB es visible en el navegador y no debe considerarse un secreto de producción.
- Algunos vídeos pueden impedir la reproducción embebida; se ofrece un enlace directo a YouTube.

## TMDB

This product uses the TMDB API but is not endorsed or certified by TMDB.

Más información para mantenimiento: [DEVELOPER_NOTES.md](./DEVELOPER_NOTES.md).
## Estados de operaciones

- `available`: asiento disponible para una función concreta.
- `reserved`: asiento retenido por una reserva activa.
- `sold`: venta definitiva para esa función; no vuelve a estar disponible.
- Una reserva `active` puede pagarse o cancelarse.
- Una reserva `paid` conserva sus asientos vendidos y no puede cancelarse.
- Una reserva `cancelled` queda en el historial y libera sus asientos reservados.

JSON Server simula la persistencia académica. Un sistema de producción necesitaría contraseñas con hash, autenticación segura y transacciones o bloqueos en el backend para evitar carreras concurrentes reales.
