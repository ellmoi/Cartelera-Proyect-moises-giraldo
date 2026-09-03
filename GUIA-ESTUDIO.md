# GUÍA DE ESTUDIO — THE MOI CINEMAS

Esta guía explica el proyecto paso a paso y con palabras sencillas. El README presenta el producto; este archivo sirve para aprender, practicar y preparar cambios.

## 1. Mapa del proyecto

```text
index.html
├── css/
│   ├── styles.css
│   ├── actor-details.css
│   └── favorites.css
├── js/
│   ├── app.js
│   ├── components/
│   │   ├── movie-card.js
│   │   ├── actor-card.js
│   │   └── actor-details.js
│   └── services/
│       └── favorites.js
├── db/db.json
├── package.json
└── package-lock.json
```

### `index.html`

**¿Qué es?** La estructura base de la página.
**¿Qué hace?** Crea encabezado, navegación, buscador, contenedor principal y carga `app.js` con `type="module"`.
**¿Cuándo lo modificaría?** Al agregar una zona fija, un enlace del menú o una hoja de estilos.

### `css/styles.css`

**¿Qué es?** La hoja de estilos principal.
**¿Qué hace?** Define colores, tamaños, tarjetas, formularios, salas, asientos y diseño adaptable.
**¿Cuándo lo modificaría?** Cuando una parte existente deba verse diferente.

### `css/actor-details.css` y `css/favorites.css`

**¿Qué son?** Estilos especializados.
**¿Qué hacen?** El primero diseña actor y reparto; el segundo, botones y vista de favoritos.
**¿Cuándo los modificaría?** Cuando el requisito afecte exactamente esas interfaces.

### `js/app.js`

**¿Qué es?** El coordinador principal.
**¿Qué hace?** Escucha eventos, consulta APIs, guarda estado temporal, cambia el DOM y dirige todos los flujos.
**¿Cuándo lo modificaría?** Al agregar una vista, petición, evento o regla del proceso del cine.

### `js/components/movie-card.js`

**¿Qué es?** El Web Component `<movie-card>`.
**¿Qué hace?** Dibuja una película y avisa con `movie-select` o `favorite-toggle`.
**¿Cuándo lo modificaría?** Al cambiar los datos o acciones de cada tarjeta.

### `js/components/actor-card.js`

**¿Qué es?** El Web Component `<actor-card>`.
**¿Qué hace?** Dibuja una persona del reparto y emite `actor-select`.
**¿Cuándo lo modificaría?** Al cambiar una tarjeta de reparto.

### `js/components/actor-details.js`

**¿Qué es?** El Web Component `<actor-details>`.
**¿Qué hace?** Muestra carga, error, fotografía y biografía; emite `actor-back`.
**¿Cuándo lo modificaría?** Al cambiar la ficha completa del actor.

### `js/services/favorites.js`

**¿Qué es?** Un módulo de servicio.
**¿Qué hace?** Consulta, crea y elimina favoritos en JSON Server y evita duplicados.
**¿Cuándo lo modificaría?** Al cambiar las reglas de persistencia de favoritos.

### `db/db.json`

**¿Qué es?** Un archivo JSON que funciona como base de datos local.
**¿Qué hace?** Guarda cartelera, funciones, salas, asientos, usuarios y operaciones.
**¿Cuándo lo modificaría?** Para datos iniciales o una colección nueva. No edites registros reales sin necesidad.

### `package.json`

**¿Qué es?** La configuración mínima de npm.
**¿Qué hace?** Declara JSON Server y el comando `npm run server`.
**¿Cuándo lo modificaría?** Solo si cambia la forma de ejecutar la API local.

## 2. Cómo arranca la aplicación

```text
servidor estático abre index.html
              ↓
<script type="module"> carga js/app.js
              ↓
app.js importa componentes y servicio de favoritos
              ↓
lee la sesión de localStorage y la valida en JSON Server
              ↓
lee ?view=... de la URL
              ↓
consulta TMDB o JSON Server según la vista
              ↓
crea HTML y Web Components
              ↓
el navegador muestra la pantalla
```

`index.html` solo crea el “escenario”. `app.js` decide qué colocar en `moviesContainer`. Si la URL no tiene vista, carga Inicio. Si tiene `?view=movie&id=123`, vuelve a pedir esa película; no recupera HTML viejo.

## 3. JavaScript desde cero con ejemplos reales

- **`const`:** crea una referencia que no será reasignada. En `app.js`, `const API_KEY` conserva la clave de TMDB.
- **`let`:** crea una variable que sí puede cambiar. `let currentDetailsMovieId = null` cambia al abrir películas.
- **String:** texto entre comillas, como `"favorites"`.
- **Número:** `desiredTicketQuantity = 1` comienza con una entrada.
- **Booleano:** `ratingSaveInProgress = false` dice “ahora no está guardando”.
- **Array:** `selectedSeats = []` es una lista inicialmente vacía.
- **Objeto:** `{ view, ...parameters }` reúne propiedades con nombres y valores.
- **Función:** una receta reutilizable. `loadHome()` construye Inicio.
- **Parámetro:** dato que recibe una función. `loadMovieDetails(movieId)` recibe el ID.
- **`return`:** devuelve un resultado o detiene la función. En favoritos, devuelve `{ isFavorite: true, record }`.
- **`if` / `else`:** toma decisiones. Si no hay usuario, favoritos muestra autenticación; en caso contrario consulta sus datos.
- **Operadores:** `===` compara estrictamente; `&&` exige ambas condiciones; `||` usa una alternativa; `!` niega.
- **`for`:** repite pasos. `loadOperationMovies()` recorre IDs y espera cada película.
- **`forEach`:** ejecuta una acción por elemento. `records.forEach(...)` arma el mapa de favoritos.
- **`map`:** transforma una lista. Los asientos seleccionados se convierten en objetos para una reserva.
- **`filter`:** conserva elementos que cumplen una regla. Las valoraciones válidas se filtran entre 1 y 5.
- **`find`:** busca el primer elemento coincidente. El login encuentra el usuario cuya contraseña coincide.
- **`async`:** marca una función que trabaja con tareas que terminan después, como una petición.
- **`await`:** espera esa tarea sin congelar toda la página. `await response.json()` espera el JSON.
- **`try`:** contiene trabajo que podría fallar.
- **`catch`:** recibe el error y permite mostrar un mensaje útil.

Ejemplo mental:

```js
async function pedirDatos() {
    try {
        const response = await fetch("direccion");
        return await response.json();
    } catch (error) {
        console.error(error);
    }
}
```

Ese patrón aparece muchas veces en `app.js`.

## 4. DOM

El HTML es como un árbol de piezas. El **DOM** es la representación que JavaScript usa para encontrar y modificar esas piezas.

- `document`: representa la página.
- `document.getElementById("moviesContainer")`: encuentra una pieza por ID.
- `querySelector(".favorites-grid")`: encuentra la primera coincidencia CSS.
- `querySelectorAll("movie-card")`: encuentra todas las tarjetas.
- `createElement("movie-card")`: crea un elemento nuevo.
- `appendChild(card)`: agrega una pieza como hija.
- `textContent`: coloca texto sin interpretarlo como HTML; es apropiado para datos de usuario.
- `innerHTML`: crea una estructura completa desde texto HTML; el proyecto lo usa para vistas controladas.
- `replaceChildren(...)`: reemplaza los hijos, usado por los componentes de actores.

## 5. Eventos

Un evento es un aviso: “algo ocurrió”. `addEventListener()` registra qué función debe responder.

Eventos normales:

- `click`: seleccionar una película, actor, asiento o botón.
- `submit`: enviar búsqueda, login, registro, datos de compra o valoración.
- `input` y `change`: actualizar sugerencias, cantidad o método de pago.
- `popstate`: responder a Atrás/Adelante del navegador.

Eventos personalizados:

- `movie-select`: `<movie-card>` envía película y vista de regreso a `app.js`.
- `favorite-toggle`: la tarjeta envía el ID que debe agregarse o quitarse.
- `actor-select`: `<actor-card>` envía el ID de persona.
- `actor-back`: `<actor-details>` pide volver a la película.

`bubbles: true` significa que el mensaje “sube” por el árbol DOM hasta `moviesContainer`, donde un solo listener puede recibirlo.

## 6. Web Components

Observa esta idea real:

```js
class MovieCard extends HTMLElement
```

- **`class`:** un molde para crear objetos parecidos.
- **`MovieCard`:** nombre JavaScript del molde.
- **`extends`:** indica que hereda capacidades de otra clase.
- **`HTMLElement`:** clase que representa un elemento HTML real.

`connectedCallback()` es un método especial. El navegador lo ejecuta cuando el componente entra al DOM. Allí se llama `render()` para dibujarlo.

```js
customElements.define("movie-card", MovieCard);
```

Esto registra la etiqueta. Sin registro, el navegador no sabría qué clase usar. Después:

```html
<movie-card></movie-card>
```

se convierte en una instancia de `MovieCard`, recibe la propiedad `movie`, ejecuta `render()` y crea la tarjeta.

Componentes reales:

- `MovieCard`: renderiza película y favorito.
- `ActorCard`: construye la tarjeta con nodos DOM.
- `ActorDetails`: controla estados `loading`, `ready` y `error`.

No usan Shadow DOM: sus estilos vienen de las hojas CSS generales. Siguen siendo Web Components nativos.

## 7. ES Modules

Un módulo es un archivo JavaScript que puede compartir o recibir partes.

```js
export async function fetchUserFavorites(...) { ... }
```

`export` permite que otro archivo use esa función.

```js
import { fetchUserFavorites } from "./services/favorites.js";
```

`import` la trae a `app.js`. Los componentes se importan para que se registren.

```html
<script type="module" src="js/app.js"></script>
```

`type="module"` activa imports, exports y alcance modular. Esto sigue siendo JavaScript Vanilla: “Vanilla” significa usar el lenguaje y APIs del navegador sin React, Vue, Angular u otro framework.

## 8. Fetch y APIs

`fetch()` es como enviar una solicitud:

```text
JavaScript pide una dirección
        ↓
el servidor recibe la petición
        ↓
responde con estado y datos
        ↓
response.json() convierte el JSON
        ↓
JavaScript utiliza los objetos
```

`await fetch(url)` espera la respuesta. `response.ok` dice si el código HTTP fue exitoso. `await response.json()` convierte el cuerpo a valores JavaScript. `try/catch` evita que un fallo deje la pantalla sin explicación.

## 9. TMDB

TMDB es el proveedor externo de cine. Endpoints usados:

- `/trending/movie/day`: tendencias.
- `/movie/now_playing`: películas actuales.
- `/movie/upcoming`: próximos estrenos.
- `/movie/popular` y `/movie/top_rated`: populares y mejor valoradas.
- `/discover/movie`: películas por género.
- `/search/movie`: búsqueda y sugerencias.
- `/genre/movie/list`: nombres de géneros.
- `/movie/:id`: detalle.
- `/movie/:id/credits`: reparto y dirección.
- `/movie/:id/videos`: tráilers.
- `/movie/:id/recommendations`: recomendaciones.
- `/person/:id`: nombre, fotografía, nacimiento, profesión y biografía del actor.

Las imágenes usan `image.tmdb.org`; los tráilers elegidos se muestran desde YouTube.

## 10. JSON Server

```text
TMDB → información cinematográfica externa
JSON Server → información creada o controlada por THE MOI CINEMAS
```

`db/db.json` contiene:

- `billboard`: oferta local.
- `functions`: funciones con fecha, hora y precio.
- `rooms`: salas.
- `seats`: sillas físicas.
- `functionSeats`: estado de cada silla en cada función.
- `users`: cuentas.
- `reservations`: reservas.
- `purchases`: compras simuladas.
- `ratings`: estrellas y comentarios.
- `favorites`: favoritos personales.

Al ejecutar `npm run server`, cada colección se vuelve una dirección REST, por ejemplo `http://localhost:3000/favorites`.

### Cómo se conecta una función del cine

```text
billboard.tmdbId
→ functions.tmdbId
→ functions.roomId
→ rooms.id
→ functionSeats.functionId
→ seats.id y estado disponible/reservado/vendido
```

Para agregar un horario no basta con crear `functions`: también debes crear en `functionSeats` una relación para cada asiento de la sala. La hora es el inicio de la función; la programación actual no inicia después de las 23:00.

## 11. CRUD

CRUD son las cuatro acciones básicas sobre datos:

- **GET — consultar:** `GET /favorites?userId=...` trae favoritos; `GET /ratings?tmdbId=...` trae opiniones.
- **POST — crear:** `POST /users` registra una cuenta; `POST /reservations` crea una reserva; `POST /purchases` crea una compra.
- **PATCH — modificar una parte:** `PATCH /functionSeats/:id` cambia un asiento; `PATCH /ratings/:id` actualiza una valoración; `PATCH /reservations/:id` cambia su estado.
- **DELETE — eliminar:** `DELETE /favorites/:id` quita un favorito. El registro también elimina la cuenta recién creada si detecta una duplicación durante su verificación.

El método se pasa en las opciones de `fetch`. GET es el predeterminado.

## 12. localStorage

`localStorage` es una pequeña memoria de texto del navegador que permanece tras F5. Este proyecto usa solo `theMoiCurrentUser`, con `id`, `name` y `email`. No guarda contraseña, favoritos, reservas ni HTML.

Al iniciar, `validateStoredSession()` consulta `/users/:id`. Así se comprueba que la cuenta todavía existe. Los datos personales reales siguen en JSON Server.

## 13. Estado de navegación y recarga

El problema: antes, F5 ejecutaba Inicio aunque estuvieras en otra vista.

Ahora `updateNavigation()` representa la ubicación:

```text
?view=home
?view=billboard
?view=upcoming
?view=movie&id=123&from=list
?view=actor&id=456&movie=123&from=list
?view=favorites
```

- **`history`:** historial de páginas/vistas de la pestaña.
- **`pushState`:** agrega una entrada sin recargar el documento.
- **`replaceState`:** reemplaza la entrada actual.
- **`popstate`:** evento disparado al usar Atrás o Adelante.

Al presionar F5:

```text
URL conserva view e id
        ↓
se valida la sesión
        ↓
restoreNavigationFromUrl() interpreta la URL
        ↓
se hacen nuevas peticiones GET
        ↓
se reconstruye la vista
```

No guardamos HTML porque podría estar viejo, ocupar espacio o mostrar datos de otra sesión. Tampoco se restauran formularios incompletos de forma peligrosa. La URL guarda ubicación, no una operación.

Para agregar una vista futura:

1. Decide un nombre corto para `view`.
2. En su función de carga llama `updateNavigation("nombre", { id })`.
3. Agrega el caso GET seguro a `restoreNavigationFromUrl()`.
4. Prueba F5, Atrás y sesión inválida.
5. Nunca llames un POST desde la restauración.

### Flujos completos

### Seleccionar película

```text
click en movie-card
→ evento movie-select
→ app.js recibe movie.id
→ updateNavigation("movie", ...)
→ TMDB detalle/créditos/vídeos/recomendaciones
→ JSON Server funciones y ratings
→ vista de detalle
```

### Seleccionar actor

```text
película → actor-card → actor-select → actorId
→ URL guarda actor y película de origen
→ TMDB /person/:id → actor-details
→ actor-back/Atrás → película
```

### Favorito

```text
click → favorite-toggle → handleFavoriteToggle()
→ comprobar sesión → GET coincidencia
→ POST si no existe / DELETE si existe
→ segunda verificación contra duplicados
→ actualizar tarjetas
```

### Registro y login

```text
formulario → submit → validar campos
→ GET para comprobar cuenta
→ POST /users al registrar o comparar contraseña al entrar
→ guardar sesión mínima → validar contra servidor
```

### Reserva

```text
película → función → asientos → datos → confirmar
→ reclamar asientos → POST /reservations
→ finalizar bloqueos → confirmación
→ Volver a Inicio o Continuar aquí en la película
```

### Compra

```text
función/asientos → comprador → pago simulado → resumen
→ reclamar asientos → POST /purchases → marcar vendidos
→ ticket → Volver a Inicio o Continuar aquí
```

Una reserva existente puede pagarse: se valida propiedad, se comprueba que no tenga compra asociada, se cambian asientos y reserva y se crea la compra.

### Calificación y comentario

```text
película → estrellas/comentario → submit
→ GET rating del usuario → POST nuevo o PATCH existente
→ recargar resumen → confirmación
→ Volver a Inicio o Continuar aquí
```

## 14. Mapa “Quiero cambiar...”

| Quiero modificar... | Primero revisa... | Después revisa... |
|---|---|---|
| Tarjeta de película | `js/components/movie-card.js`, `render()` | `css/styles.css`, `css/favorites.css` |
| Detalle de película | `displayMovieDetails()`, `loadMovieDetails()` en `js/app.js` | funciones de créditos, vídeos y recomendaciones |
| Actores | `actor-card.js`, `actor-details.js` | `loadMovieCredits()`, `loadActorDetails()` |
| Favoritos | `js/services/favorites.js` | `handleFavoriteToggle()`, `loadFavorites()`, `favorites.css` |
| Inicio/cartelera | `loadHome()`, `loadLocalBillboard()` | `renderDiscoveryRow()`, `displayMovies()` |
| Búsqueda | `searchMovies()`, `loadSearchSuggestions()` | formulario `searchForm` en `index.html` |
| Categorías | `displayCategories()`, `loadGenreMovies()` | filtros en `applyMovieFiltersAndSort()` |
| Registro/login | `handleRegisterSubmit()`, `handleLoginSubmit()` | `displayAccountForm()`, colección `users` |
| Reservas | `confirmTicketOperation()`, `loadReservations()` | `claimSeats()`, `functionSeats`, `reservations` |
| Compras | `createDirectSimulatedPurchase()` | pago, `purchases`, `displayPaidTicket()` |
| Asientos | `displaySeatSelection()`, `toggleSeat()` | `loadSeatSelection()`, `functionSeats` |
| Calificaciones | `saveMovieRating()` | `loadMovieRatings()`, `ratings` |
| Comentarios | `saveMovieRating()` | `renderMovieRatingSummary()` |
| Navegación/F5 | `updateNavigation()` | `restoreNavigationFromUrl()`, listener `popstate` |
| API TMDB | constantes y funciones `fetchTmdb...` | función específica de carga |
| Base de datos | `db/db.json` | petición `fetch` relacionada |

## 15. Método para implementar un requisito

1. **Lee el requisito:** subraya resultado, límites y pruebas.
2. **Pregunta qué datos necesitas:** por ejemplo, favorito necesita usuario y `movieId`.
3. **Busca el componente que lo muestra:** tarjeta, actor o vista de `app.js`.
4. **Decide el evento:** `favorite-toggle` separa el clic de la persistencia.
5. **Decide si necesitas TMDB:** úsalo para información cinematográfica.
6. **Decide si debes guardar:** estado temporal puede vivir en variables; datos duraderos van a JSON Server.
7. **Elige POST, PATCH o DELETE:** crea, modifica o elimina.
8. **Actualiza la interfaz:** vuelve a renderizar desde datos confiables.
9. **Prueba:** caso normal, error, doble clic, F5, otro usuario y regresiones.
10. **Haz un Conventional Commit:** un mensaje que diga qué cambió.

### Nuevo requisito: otras películas del actor

#### 1. Cómo analizamos el requisito

```text
Quiero películas del actor
→ necesito person_id
→ consulto TMDB
→ fetch a movie_credits
→ filtro y ordeno el array
→ actor-details recibe las películas
→ crea <movie-card>
```

#### 2. Archivos revisados

- `js/app.js`: obtiene, filtra, ordena y limita los créditos.
- `js/components/actor-details.js`: presenta estados y crea las tarjetas.
- `js/components/movie-card.js`: componente reutilizado sin crear otra tarjeta.
- `css/actor-details.css`: distribución responsive.

#### 3. Cómo viaja el dato

`actor-select` entrega `person_id`. `loadActorDetails()` pide la persona y `loadActorMovieCredits()` consulta `/person/:id/movie_credits`. Después elimina datos incompletos y duplicados, excluye la película de origen y entrega el resultado mediante `details.movies`. El setter vuelve a dibujar `<actor-details>` y crea un `<movie-card>` por película.

#### 4. Por qué reutilizamos `<movie-card>`

Es como reutilizar el mismo molde: todas las tarjetas conservan diseño, accesibilidad, detalle y favoritos. Crear otra tarjeta duplicaría código y obligaría a corregir dos lugares en el futuro.

#### 5. Evento `movie-select`

Cada tarjeta avisa: “seleccionaron esta película”. Como el evento usa `bubbles: true`, llega hasta `moviesContainer`; `app.js` recibe su ID y carga el detalle mediante TMDB. La tarjeta no necesita conocer la API ni la navegación completa.

#### 6. MODIFICAR AQUÍ

En `js/app.js`, cerca del comentario **PELÍCULAS DEL ACTOR**:

- Para mostrar 5 en lugar de 10, cambia `ACTOR_MOVIE_LIMIT` de `10` a `5`.
- Para ordenar diferente, modifica `compareActorMovies()`.
- Para mostrar solo estrenos posteriores a 2020, agrega esa condición dentro del `forEach` que filtra créditos, antes de guardar en `uniqueMovies`.

No cambies `<movie-card>` para esas reglas: pertenecen a la preparación de datos.
## 16. Ejercicios

### Nivel 1 — Fácil

#### Ejercicio 1

**Objetivo:** cambiar el texto mostrado cuando favoritos está vacío.
**Pista:** busca la frase actual.
**Archivos:** `js/app.js`.

#### Ejercicio 2

**Objetivo:** mostrar también el año en cada tarjeta de película.
**Pista:** TMDB entrega `release_date`; extrae los primeros cuatro caracteres.
**Archivos:** `js/components/movie-card.js`, quizá `css/styles.css`.

### Nivel 2 — Medio

#### Ejercicio 3

**Objetivo:** agregar un orden alfabético A–Z a la lista.
**Pista:** añade una opción y un caso a `sortMovies()`, trabajando sobre la copia.
**Archivos:** `js/app.js`.

#### Ejercicio 4

**Objetivo:** crear un botón que quite todos los filtros visuales.
**Pista:** ya existe `resetMovieExploration()`. Conecta evento y render.
**Archivos:** `js/app.js`.

### Nivel 3 — Web Components

#### Ejercicio 5

**Objetivo:** hacer que `<actor-card>` muestre la profesión si el dato existe.
**Pista:** agrega una propiedad al objeto entregado al componente y un nodo con `textContent`.
**Archivos:** `js/app.js`, `js/components/actor-card.js`.

#### Ejercicio 6

**Objetivo:** emitir un evento `movie-share` desde `<movie-card>`.
**Pista:** crea botón, listener y `CustomEvent` con `bubbles: true`. No implementes todavía una red social.
**Archivos:** `movie-card.js`, `app.js`.

### Nivel 4 — API

#### Ejercicio 7

**Objetivo:** mostrar el título original en el detalle cuando difiera del traducido.
**Pista:** revisa la respuesta de `/movie/:id`.
**Archivos:** `displayMovieDetails()` en `app.js`.

#### Ejercicio 8

**Objetivo:** agregar una fila de películas de animación al Inicio usando TMDB.
**Pista:** identifica el ID oficial desde el mapa de géneros y reutiliza `loadHomeRow()`.
**Archivos:** `js/app.js`.

### Nivel 5 — CRUD

#### Ejercicio 9

**Objetivo:** permitir editar solo el comentario de una valoración existente.
**Pista:** localiza el registro propio y usa PATCH.
**Archivos:** `js/app.js`, colección `ratings`.

#### Ejercicio 10

**Objetivo:** crear una colección de películas vistas por usuario.
**Pista:** define primero su forma (`userId`, `movieId`, fecha), evita duplicados y usa GET/POST/DELETE.
**Archivos:** `db/db.json`, nuevo servicio, `app.js`.

### Nivel 6 — Simulacro de examen

#### Ejercicio 11

**Objetivo:** “Como usuario quiero marcar una reserva con recordatorio y verla en Mis reservas”.
**Pista:** decide si modifica reserva con PATCH y cómo se representa el control.
**Archivos:** `displayOperations()`, eventos delegados, `reservations`.

#### Ejercicio 12

**Objetivo:** “La aplicación debe recordar una nueva vista Premios después de F5”.
**Pista:** la restauración solo debe hacer GET.
**Archivos:** `updateNavigation()`, `restoreNavigationFromUrl()`, función de carga.

#### Ejercicio 13

**Objetivo:** “Mostrar el reparto completo con un botón Ver más sin repetir peticiones”.
**Pista:** conserva datos recibidos en una variable y cambia solo lo visible.
**Archivos:** `displayMovieCredits()`, estado de `app.js`, `actor-card.js`.

## 17. SOLUCIONES — NO MIRAR HASTA INTENTARLO

---

### Solución posible 1

Busca `Todavía no tienes películas favoritas.` dentro de `renderFavorites()` y cambia únicamente ese `textContent`. Prueba la vista con un usuario sin favoritos.

### Solución posible 2

En `MovieCard.render()`, calcula el año con `movie.release_date ? movie.release_date.slice(0, 4) : "Año no disponible"` y colócalo en un elemento semántico. Verifica que `app.js` entregue `release_date`.

### Solución posible 3

Agrega `<option value="alphabetical">A–Z</option>` en `createMovieExplorer()`. En `sortMovies()`, cuando el valor coincida, ordena `orderedMovies` con `localeCompare(..., "es")`.

### Solución posible 4

Reutiliza el botón `resetMovieFilters`, llama `resetMovieExploration()` y después `applyMovieFiltersAndSort()`. En realidad el proyecto ya muestra este patrón: estúdialo y explícalo con tus palabras.

### Solución posible 5

Incluye el dato necesario al preparar `actorCard.actor`. En `ActorCard.render()`, crea un `p`, asigna el valor con `textContent` y agrégalo a `information`.

### Solución posible 6

Agrega un botón dentro del render, escucha su clic y despacha `new CustomEvent("movie-share", { bubbles: true, detail: { movieId } })`. En `app.js`, recibe el evento en `moviesContainer`.

### Solución posible 7

`loadMovieDetails()` ya recibe el objeto completo. En `displayMovieDetails()`, compara `movie.original_title` con `movie.title` y crea una línea solo si son diferentes.

### Solución posible 8

Espera `loadMovieGenres()`, localiza la entrada “Animación”, crea una sección con `createDiscoverySection()` y carga `/discover/movie?with_genres=ID`. Evita repetir una fila si no encuentras el género.

### Solución posible 9

Consulta `ratings?tmdbId=...`, encuentra la valoración del usuario y envía `PATCH /ratings/:id` con `comment` y `updatedAt`. No cambies estrellas si el requisito dice “solo comentario”.

### Solución posible 10

Agrega `watched: []`, crea funciones de servicio parecidas a favoritos y usa una clave lógica usuario–película. Después conecta un evento del componente y vuelve a consultar el servidor.

### Solución posible 11

Agrega una propiedad booleana a la reserva mediante PATCH, dibuja su estado en `displayOperations()` y maneja el botón con delegación. Filtra por usuario antes de permitir cambios.

### Solución posible 12

La función nueva llama `updateNavigation("awards")`; la restauración reconoce `view === "awards"` y ejecuta únicamente su carga GET. Prueba F5 y `popstate`.

### Solución posible 13

Guarda el arreglo de reparto en estado, muestra una porción inicial y amplíala con un botón. La petición a `/credits` debe ocurrir una vez al abrir la película.

## 18. Git y Conventional Commits

- `git status`: muestra archivos modificados, nuevos y preparados.
- `git add archivo`: prepara exactamente ese archivo para el siguiente commit.
- `git commit -m "tipo: descripción"`: guarda una fotografía lógica del cambio.
- `git log --oneline`: muestra el historial resumido.

Tipos frecuentes:

- `feat:` funcionalidad nueva. Ejemplo: `feat: preserve application view on page reload`.
- `fix:` corrección de un error. Ejemplo: `fix: prevent duplicate favorite records`.
- `style:` presentación sin cambiar lógica. Ejemplo: `style: improve actor details layout`.
- `refactor:` reorganización interna sin cambiar resultado.
- `docs:` solo documentación o comentarios. Ejemplo: `docs: add beginner project study guide`.
- `chore:` mantenimiento, configuración o datos base.

Antes de confirmar: ejecuta `git diff`, prueba, usa `git add` selectivo, revisa `git diff --cached` y recién entonces haz commit.

## 19. Checklist antes del examen

- [ ] Puedo explicar por qué es JavaScript Vanilla.
- [ ] Entiendo DOM, `querySelector`, `createElement` y `textContent`.
- [ ] Sé conectar `click` y `submit` con `addEventListener`.
- [ ] Sé explicar `CustomEvent` y `bubbles`.
- [ ] Entiendo `class ... extends HTMLElement`, `connectedCallback()` y `customElements.define()`.
- [ ] Distingo `import` y `export`.
- [ ] Sé explicar `fetch`, `response.ok`, `response.json()`, `async/await` y `try/catch`.
- [ ] Distingo TMDB de JSON Server.
- [ ] Sé cuándo usar GET, POST, PATCH y DELETE.
- [ ] Sé qué guarda localStorage y qué no guarda.
- [ ] Entiendo favoritos por usuario y prevención de duplicados.
- [ ] Puedo narrar reserva, compra y cambio de estado de asientos.
- [ ] Entiendo URL, `pushState`, `popstate` y reconstrucción tras F5.
- [ ] Sé usar `git status`, `git add`, `git commit` y `git log`.
- [ ] Puedo proponer y probar un Conventional Commit.

## Posibles cambios rápidos del examen

1. **Cambiar el límite de películas:** edita `MOVIE_INITIAL_LIMIT` y `MOVIE_LOAD_INCREMENT` al inicio de `js/app.js`.
2. **Ordenar diferente:** agrega una opción en `createMovieExplorer()` y un caso en `sortMovies()`; ordena siempre una copia.
3. **Filtrar posteriores a un año:** en `applyMovieFiltersAndSort()`, usa `movies.filter(movie => Number(movie.release_date?.slice(0, 4)) > 2020)`.
4. **Añadir un filtro:** crea el control en `createMovieExplorer()`, una variable de estado y aplica la condición antes de ordenar.
5. **Cambiar el precio:** modifica `price` en la función correspondiente de `db/db.json`; el total se calcula con `unitPrice * quantity`.
6. **Limitar asientos:** cambia el máximo del campo `ticketQuantity` y conserva la validación de `desiredTicketQuantity`.
7. **Nueva validación:** añádela al manejador `handleRegisterSubmit()`, `handleLoginSubmit()` o `handleCustomerFormSubmit()` y muestra el error en el estado del formulario.
8. **Cambiar vacío:** edita el texto de `movies-empty`, `renderFavorites()` o `showMessage()`, según la vista.
9. **Añadir un campo:** inclúyelo en el formulario, valídalo y agrégalo al objeto enviado con `JSON.stringify()` a `/users` o `/reservations`.
10. **Crear una vista:** implementa `loadNuevaVista()`, llama `updateNavigation("nueva")` y agrega el caso a `restoreNavigationFromUrl()`.
11. **Endpoint adicional:** crea una función `async`, comprueba `response.ok`, transforma el JSON y representa carga, vacío, error y contenido.
12. **Modificar Atrás:** ajusta `backToPreviousList`, `actor-back` o `currentMovieReturnView`; evita un `pushState` cuando basta `history.back()`.
13. **Responsive:** edita los `@media` al final de `css/styles.css`; comprueba 390 px y que `document.documentElement.scrollWidth === innerWidth`.
14. **Favoritos de un género:** filtra `movies` en `renderFavorites()` comparando `movie.genres` antes de crear tarjetas.
15. **Confirmar cancelación:** conserva la vista intermedia de `openReservationAction()` y cambia el texto/botón `data-confirm-cancel`; no canceles desde el primer clic.

## 20 preguntas teóricas probables

1. **¿Qué es el DOM?** La representación en objetos del HTML que JavaScript consulta y modifica.
2. **¿Qué hace `fetch`?** Inicia una petición HTTP y devuelve una promesa.
3. **¿Por qué comprobar `response.ok`?** Porque un 404 o 500 no rechaza automáticamente `fetch`.
4. **¿Qué hace `async/await`?** Permite expresar de forma legible operaciones asíncronas.
5. **¿Qué es JSON Server?** Una API REST académica respaldada por `db.json`.
6. **¿Qué guarda `localStorage`?** Solo la sesión mínima; los datos operativos viven en el servidor.
7. **¿Qué es un Web Component?** Un elemento personalizado con lógica de presentación reutilizable.
8. **¿Por qué eventos personalizados?** Desacoplan la tarjeta del controlador que persiste o navega.
9. **¿Qué hace `encodeURIComponent`?** Codifica un valor para insertarlo con seguridad en una URL.
10. **¿Qué hace `filter`?** Devuelve una lista con los elementos que cumplen una condición.
11. **¿Qué hace `map`?** Transforma cada elemento y devuelve una lista nueva.
12. **¿Por qué `slice()` antes de `sort()`?** Evita mutar el estado original.
13. **¿Cómo se evitan favoritos duplicados?** Se consulta la pareja usuario/película y se conserva un registro canónico.
14. **¿Cómo se protege una reserva?** Se valida usuario, función, cantidad y estado actual de cada asiento.
15. **¿Qué es `pushState`?** Añade una entrada de historial sin recargar el documento.
16. **¿Qué es `popstate`?** El evento que permite reconstruir la vista al usar Atrás/Adelante.
17. **¿Por qué guardar estado en la URL?** Permite recarga, historial y enlaces reproducibles.
18. **¿Qué aporta `aria-live`?** Anuncia cambios de estado a tecnologías de asistencia.
19. **¿Por qué evitar `innerHTML` con datos del usuario?** Reduce el riesgo de inyección de HTML o scripts.
20. **¿Qué limitación tiene JSON Server?** No ofrece transacciones reales; los bloqueos son una mitigación académica.

## 15 ejercicios prácticos probables

1. Cambia la carga inicial a 8 películas. 2. Añade orden Z–A. 3. Filtra estrenos desde 2024. 4. Añade filtro por puntuación mínima. 5. Cambia un mensaje vacío. 6. Muestra el año en una tarjeta. 7. Limita el reparto a cuatro actores. 8. Cambia el máximo de filmografía. 9. Valida un dominio de correo. 10. Añade teléfono a una reserva. 11. Impide seleccionar más de cuatro asientos. 12. Filtra favoritos por género. 13. Añade confirmación de cancelación. 14. Crea una vista “Acerca de”. 15. Consume y muestra un endpoint nuevo con sus cuatro estados.

## Prueba simulada de 60 minutos

- **0–10 min:** explica arquitectura, estado, Web Components, TMDB y JSON Server.
- **10–30 min:** añade un filtro “desde año”, conserva combinación con género y orden, y muestra vacío.
- **30–45 min:** agrega un campo opcional a reservas con validación y persistencia.
- **45–55 min:** prueba recarga, Atrás/Adelante, teclado y 390 px.
- **55–60 min:** ejecuta sintaxis, revisa `git diff` y explica decisiones.

## Comandos para iniciar y comprobar

```powershell
npm run server
npx json-server db/db.json --port 8080 --static .
node --check js/app.js
node --check js/components/movie-card.js
git diff --check
git status --short
```

## Demostración de máximo cinco minutos

1. Abre Inicio y Cartelera; combina género, A–Z y Cargar más, recarga y vuelve con Atrás.
2. Busca un título sin preocuparte por mayúsculas o tildes, abre detalle y revisa datos alternativos.
3. Entra a un actor, abre otra película, usa Atrás dos veces y demuestra la secuencia restaurada.
4. Inicia sesión, agrega/quita un favorito desde dos tarjetas y abre Mis favoritos.
5. Selecciona función y asientos, explica ocupados/total, confirma una reserva y muéstrala en Mis reservas.
