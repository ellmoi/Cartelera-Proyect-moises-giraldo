# Notas para desarrollo

## Arquitectura

El frontend es HTML, CSS y JavaScript Vanilla. Consume dos fuentes:

- TMDB: descubrimiento, detalles, imágenes, créditos, vídeos y recomendaciones.
- JSON Server: cartelera local, funciones, salas, asientos, operaciones y ratings.

La relación principal es:

```text
billboard.tmdbId -> functions.tmdbId -> rooms
                                      -> functionSeats -> seats
```

`seats` representa las sillas físicas. `functionSeats` conserva el estado de cada silla para una función concreta: `available`, `reserved` o `sold`.

## Puntos de entrada

- `loadHome()`: descubrimiento general desde TMDB.
- `loadLocalBillboard()`: cartelera configurada en `/billboard`.
- `loadMovieDetails()`: detalle y cargas secundarias.
- `loadMovieFunctions()`: funciones locales y disponibilidad.
- `loadSeatSelection()`: mapa dinámico de asientos.
- `confirmTicketOperation()`: reserva o compra con revalidación.
- `loadOperations()`: Mis reservas y Mis compras.
- `saveMovieRating()`: POST o PATCH de una valoración.

## Reglas de mantenimiento

- No duplicar datos visuales de TMDB en `db.json`.
- No guardar disponibilidad dentro de `seats`; usar `functionSeats`.
- Revalidar asientos inmediatamente antes del POST.
- Presentar nombre y correo con `textContent`.
- Mantener los estados `reserved` y `sold` deshabilitados.
- Conservar el scroll horizontal dentro del mapa, nunca en la página completa.
- Validar claves de YouTube antes de construir URLs.

## Ejecución y validación

```bash
npm install
npm run server
node --check js/app.js
```

En PowerShell puede usarse `npm.cmd run server`. El frontend debe servirse con Live Server o cualquier servidor estático.

Antes de probar escrituras, guardar una copia exacta de `db/db.json`. Después de pruebas de reserva, compra o rating, restaurar registros y estados temporales.

## Limitaciones conocidas

- JSON Server simula el backend y no ofrece transacciones atómicas.
- La clave TMDB es visible porque el proyecto es frontend académico.
- YouTube puede bloquear algunos embeds; el detalle incluye enlace directo como fallback.
- No existen autenticación ni pagos reales.