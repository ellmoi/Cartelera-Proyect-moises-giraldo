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

## 14. Flujos completos

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

## 15. Mapa “Quiero cambiar...”

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

## 16. Método para implementar un requisito

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

## 17. Ejercicios

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

## 18. SOLUCIONES — NO MIRAR HASTA INTENTARLO

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

## 19. Git y Conventional Commits

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

## 20. Checklist antes del examen

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
