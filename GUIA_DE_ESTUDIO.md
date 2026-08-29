# Guia de estudio completa

JSON puro no permite comentarios. Por eso db/db.json, package.json y
package-lock.json se explican aqui: agregar // o /* */ los volveria invalidos.

## Conexion general

~~~text
index.html -> styles.css
    |
    +-> #moviesContainer <- app.js
                            |-> TMDB: peliculas, imagenes, creditos y videos
                            '--> localhost:3000: billboard, funciones, asientos, operaciones y ratings
package.json -> npm run server -> JSON Server -> db/db.json
~~~

fetch envia una solicitud HTTP, await espera, response.json convierte la respuesta
a objetos y las funciones display convierten esos objetos en DOM.

## Archivos

- index.html: estructura inicial, menu, buscador y contenedor dinamico.
- styles.css: apariencia, estados, rejillas y responsive.
- app.js: estado, eventos, peticiones, relaciones y renderizado.
- db.json: base local simulada.
- package.json: script y dependencia directa.
- package-lock.json: versiones exactas; npm lo genera y no se edita manualmente.

## Estado de app.js

- `currentMovies` y los datos de sección permiten volver a la lista anterior.
- `currentDetailsMovieId/currentDetailsMovie` guardan la película abierta.
- `selectedSeats`, `currentSelectedFunction` y `currentSelectedRoom` conservan el flujo temporal de entradas.
- `currentSeatSelectionFunctionId` descarta cargas antiguas de asientos.
- `operationConfirmationInProgress` y `operationRecordCreated` evitan confirmaciones duplicadas.
- `currentListRequestId` descarta respuestas antiguas que llegan tarde.
## Funciones, una por una

- `createSectionHeading`, `showMessage`, `createImage` y `displayMovies`: presentación común.
- `loadHome`: descubrimiento amplio desde TMDB.
- `loadLocalBillboard`: obtiene `/billboard` y completa cada `tmdbId` con `/movie/{id}` de TMDB.
- `loadUpcoming`, `searchMovies`, categorías y géneros: exploración TMDB.
- `displayMovieDetails`, créditos, tráiler y recomendaciones: detalle enriquecido desde TMDB.
- `displayMovieFunctions/loadMovieFunctions`: unen `functions`, `rooms` y disponibilidad de `functionSeats`.
- `displaySeatSelection/loadSeatSelection`: generan el mapa con `rooms`, `seats` y `functionSeats`.
- `updateSeatSelectionSummary/toggleSeat`: controlan cantidad y selección temporal.
- `displayCustomerForm/displayOperationSummary`: datos y revisión previa.
- `confirmTicketOperation`: revalida, crea reserva o compra y actualiza `functionSeats`.
- `displayOperationConfirmation`: muestra el resultado final.
- `displayOperations/loadOperations`: reconstruyen Mis reservas y Mis compras.
- `loadMovieRatings/saveMovieRating`: consulta, crea o actualiza valoraciones internas.

`async` devuelve una Promise. `await` pausa esa función, no la página. `try/catch`
maneja fallos y `response.ok` detecta errores HTTP. `Promise.all` permite cargar
detalles independientes o varias películas locales en paralelo.
## Delegacion de eventos

moviesContainer recibe un solo listener porque sus botones se crean despues.
event.target es lo pulsado, closest busca su boton ancestro y dataset lee data-*.

## db.json campo por campo

- `billboard`: define las películas activas del cine mediante `tmdbId`; los datos visuales siguen en TMDB.
- `functions`: relaciona `tmdbId` con `roomId`, fecha, hora y precio.
- `rooms`: define nombre, capacidad, tipo, filas y asientos por fila.
- `seats`: representa cada silla física con sala, fila, número, código, ubicación y tipo.
- `functionSeats`: relaciona una silla física con una función y guarda `available`, `reserved` o `sold`.
- `reservations` y `purchases`: guardan cliente, función, sala, asientos, cantidad, precios y fecha.
- `ratings`: guarda valoración, nombre y email por película.

Antes se guardaban asientos ocupados dentro de la función. En la arquitectura actual,
`seats` define una sola vez la silla física y `functionSeats` define su estado independiente
en cada función. `$schema` ayuda al editor y no es una colección de negocio.
## package.json

name/version/description identifican; private evita publicar; scripts.server ejecuta
json-server db/db.json --port 3000; devDependencies contiene la herramienta local.
package-lock fija el arbol completo y hashes para instalaciones reproducibles.

## Flujo de reserva o compra

1. `loadLocalBillboard` muestra la cartelera configurada por el cine.
2. Clic en un póster → `loadMovieDetails` → `loadMovieFunctions`.
3. `data-function-id` → `loadSeatSelection` → `displaySeatSelection`.
4. `toggleSeat` → `updateSeatSelectionSummary`.
5. Datos del cliente → `displayOperationSummary`.
6. `confirmTicketOperation` vuelve a consultar `functionSeats` para detectar conflictos.
7. POST a `reservations` o `purchases` y PATCH de relaciones a `reserved` o `sold`.
8. `displayOperationConfirmation` muestra el resultado y `loadOperations` lo reconstruye después.

POST y PATCH no son atómicos: JSON Server es una simulación, no un backend de producción.
## Como estudiarlo

Empieza por ids HTML y constantes DOM. Sigue `loadHome` para Inicio y `loadLocalBillboard -> displayMovies -> loadMovieDetails` para Cartelera. Despues sigue el flujo anterior. Compara cada clase generada con
CSS. Usa DevTools Elements, Network, Console y Sources; coloca breakpoints y observa
parametros, estado y respuestas antes de cambiar valores.

La API key en frontend es visible. innerHTML con fuentes no confiables puede causar
inyeccion. En produccion se usaria backend, validacion, autenticacion y transacciones.


## Etapa 17: exploracion, categorias y orden

La lista original permanece en currentMovies. sortMovies empieza con slice(), por lo que nunca muta el origen. currentGenreFilter guarda Todas o el id oficial elegido; currentSortOption guarda featured, release-date, rating o popularity.

- loadMovieGenres comparte genreLoadPromise: varias vistas esperan una sola solicitud.
- getMovieGenreNames traduce genre_ids con genreMap y limita cada tarjeta a dos.
- createMovieExplorer produce selectores, labels y chips con aria-pressed.
- resetMovieExploration vuelve a Todas + Destacadas sin consultar TMDB.
- sortMovies coloca fechas vacias al final; usa vote_average para puntuacion y popularity para Mas vistos.
- renderMovieList crea hero, controles, contador, grid, tarjetas y estado vacio.
- applyMovieFiltersAndSort copia, filtra con includes y despues ordena.
- displayMovies guarda la fuente; al volver desde Detalles conserva exploracion.

Los controles solo nacen en renderMovieList. Detalles, funciones, asientos, resumen, confirmacion y Mis reservas utilizan otros renderizadores y no los muestran.
