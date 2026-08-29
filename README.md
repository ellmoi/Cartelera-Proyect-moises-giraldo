# THE MOI CINEMAS

> Estudio detallado: [GUIA_DE_ESTUDIO.md](./GUIA_DE_ESTUDIO.md). HTML, CSS y JavaScript tambien contienen notas junto al codigo.

Aplicación académica de cartelera, reservas y compras de cine. Inicio utiliza TMDB para descubrimiento amplio; Cartelera consulta la selección real del cine en JSON Server y completa sus datos visuales desde TMDB.

## Requisitos

- Navegador moderno.
- Node.js.
- npm.
- Conexión a internet para consultar TMDB.
- Extensión Live Server o un servidor web estático equivalente.

## Instalación y ejecución

Sigue este orden:

1. Instala las dependencias:

```bash
npm install
```

2. Inicia JSON Server:

```bash
npm run server
```

Si Windows PowerShell bloquea la ejecución de `npm.ps1`, utiliza:

```powershell
npm.cmd run server
```

3. Mantén abierta la terminal de JSON Server. La API local estará en `http://localhost:3000`.
4. Abre `index.html` mediante Live Server.
5. Utiliza la aplicación desde la dirección proporcionada por Live Server.

El frontend y JSON Server deben permanecer activos al mismo tiempo.

## Arquitectura de datos

TMDB proporciona:

- cartelera y próximos estrenos;
- búsqueda y detalles;
- pósteres y backdrops;
- créditos, reparto y director;
- vídeos y recomendaciones.

JSON Server proporciona:

- `billboard`, que guarda los `tmdbId` activos de la cartelera local;
- `functions`, que relaciona cada `tmdbId` con sala, fecha, hora y precio;
- `rooms` y `seats`, que definen las salas y sus asientos físicos;
- `functionSeats`, que guarda la disponibilidad de cada asiento por función;
- `reservations`, `purchases` y `ratings`, que almacenan operaciones y valoraciones locales.

Inicio obtiene descubrimiento amplio directamente desde TMDB. Cartelera ejecuta `loadLocalBillboard()`: consulta `GET /billboard`, filtra registros activos y solicita `/movie/{tmdbId}` a TMDB para completar título, póster, sinopsis, géneros y valoración. Esos datos visuales no se duplican en `db.json`.
La clave de TMDB se configura únicamente en `js/app.js`. No se incluye su valor en esta documentación. En una aplicación puramente frontend, cualquier clave utilizada desde JavaScript puede ser visible para el navegador y no debe tratarse como un secreto de producción.

## Funcionalidades

- Inicio con descubrimiento TMDB, Cartelera local y Próximamente desde TMDB.
- Búsqueda de películas.
- Detalles, reparto, director y tráiler.
- Recomendaciones.
- Salas, funciones, horarios y precios.
- Selección visual de asientos.
- Cantidad de tickets vinculada a la selección exacta de sillas.
- Datos de nombre y correo para reservas y compras simuladas.
- Resumen, revalidación y persistencia de ambas operaciones.
- Consulta de Mis reservas y Mis compras.
- Valoraciones internas de películas en escala de 1 a 5 estrellas.
- Diseño responsive y manejo de estados de carga, vacío y error.

Cartelera muestra exclusivamente las películas activas de `billboard`. Cada `billboard.tmdbId` se relaciona con `functions.tmdbId`; las películas exploradas desde Inicio, búsqueda, categorías o Próximamente pueden no tener funciones locales y en ese caso se informa claramente.

## Flujo de demostración

1. Abrir Cartelera.
2. Seleccionar una película con funciones locales.
3. Revisar sus detalles.
4. Seleccionar una función.
5. Indicar la cantidad y elegir exactamente ese número de sillas.
6. Introducir nombre y correo.
7. Elegir Reservar tickets o Comprar tickets.
8. Revisar y confirmar la operación.
9. Consultarla en Mis reservas o Mis compras.

## Estructura

```text
cine-proyecto/
├── assets/
│   └── .gitkeep
├── css/
│   └── styles.css
├── db/
│   └── db.json
├── js/
│   └── app.js
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
└── README.md
```

## API local

Endpoints principales:

- `GET /billboard`
- `GET /functions`
- `GET /functions?tmdbId={tmdbId}`
- `GET /rooms`
- `GET /seats?roomId={roomId}`
- `GET /functionSeats?functionId={functionId}`
- `GET /reservations`
- `POST /reservations`
- `GET /purchases`
- `POST /purchases`
- `PATCH /functionSeats/{id}`
- `GET /ratings?tmdbId={tmdbId}`
- `POST /ratings`
- `PATCH /ratings/{id}`

## Atribución de TMDB

This product uses the TMDB API but is not endorsed or certified by TMDB.

La atribución también aparece en el footer de la aplicación.

El logotipo oficial aprobado debe descargarse manualmente desde:

`https://www.themoviedb.org/about/logos-attribution`

Utiliza el recurso oficial **Alt short (blue) - SVG**, sin modificarlo, y guárdalo como:

`assets/tmdb-logo.svg`

Después, en `index.html`, dentro de `<footer id="credits">` y antes del enlace de texto `TMDB`, puede añadirse:

```html
<img class="tmdb-logo" src="./assets/tmdb-logo.svg" alt="The Movie Database (TMDB)">
```

No se incluye actualmente el elemento `<img>` para evitar una imagen rota mientras el archivo oficial no exista.

## Limitaciones técnicas

- JSON Server es una API local simulada, no un backend de producción.
- El POST de una reserva o compra y los PATCH posteriores de `functionSeats` no forman una transacción atómica. Si un PATCH falla después del POST, la interfaz informa el estado parcial y evita repetir el POST automáticamente.
- No se procesan pagos reales ni existen usuarios o autenticación.
- La API key utilizada por el frontend es visible para el navegador.
- Las valoraciones internas son independientes de TMDB. Sin autenticación real, `tmdbId + email` se utiliza únicamente como identificación académica para actualizar una valoración existente.
