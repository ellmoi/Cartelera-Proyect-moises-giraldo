# THE MOI CINEMAS

Aplicación web académica para explorar películas y simular la experiencia de un cine: cartelera local, próximos estrenos, búsqueda, detalles cinematográficos, reparto, actores, funciones, selección de asientos, reservas, compras, valoraciones, comentarios y películas favoritas por usuario.

## Tecnologías

- **HTML5:** estructura semántica y accesible de la interfaz.
- **CSS3:** diseño adaptable, estados visuales y distribución de tarjetas, detalles y procesos de compra.
- **JavaScript Vanilla:** lógica completa del frontend sin frameworks.
- **Web Components nativos:** componentes reutilizables basados en `HTMLElement` y `customElements`.
- **ES Modules:** separación de componentes y servicios mediante `import` y `export`.
- **Fetch API:** comunicación asíncrona con TMDB y JSON Server.
- **TMDB:** fuente externa de información cinematográfica e imágenes.
- **JSON Server:** API REST local y persistencia del dominio de THE MOI CINEMAS.
- **History API:** representación y restauración de vistas mediante parámetros de URL.
- **localStorage:** almacenamiento exclusivo de los datos mínimos de la sesión activa.

Node.js y npm se usan únicamente como soporte de desarrollo para instalar y ejecutar JSON Server. No forman parte de la lógica del frontend.

## Funcionalidades

- Inicio con filas de tendencias, cartelera, estrenos, populares, mejor valoradas, destacadas y géneros.
- Cartelera local combinada con información actualizada de TMDB.
- Próximos estrenos, categorías, filtros, ordenamiento y búsqueda con sugerencias.
- Detalle de película con sinopsis, géneros, duración, tráiler, recomendaciones y funciones disponibles.
- Reparto, dirección, detalle individual de actores y selección de otras películas de su filmografía.
- Registro, inicio y cierre de sesión y consulta de cuenta.
- Selección validada de función, cantidad de entradas y asientos.
- Reservas, cancelación y consulta del historial personal.
- Compras y pagos simulados, incluidos pagos de reservas existentes.
- Ticket y confirmación de operaciones.
- Calificaciones de una a cinco estrellas y comentarios por usuario.
- Favoritos personales con protección frente a duplicados.
- Restauración de la vista al recargar y navegación con los botones Atrás/Adelante del navegador.

## Arquitectura

El proyecto conserva una arquitectura frontend sencilla orientada a eventos:

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
├── db/
│   └── db.json
├── package.json
└── package-lock.json
```

- `index.html` define la estructura base, navegación y punto de carga del módulo principal.
- `css/` contiene los estilos globales y los estilos específicos de actores y favoritos.
- `js/app.js` coordina estado, DOM, eventos, navegación, peticiones y flujos del cine.
- `js/components/` contiene los Custom Elements reutilizables.
- `js/services/favorites.js` encapsula las operaciones REST de favoritos.
- `db/db.json` es la base de datos persistente publicada por JSON Server.

La interfaz no usa un router externo. `app.js` guarda la vista en parámetros como `?view=movie&id=123`; al recargar interpreta la URL y vuelve a solicitar los datos necesarios.

## Web Components

### `<movie-card>`

Muestra póster, título, géneros, puntuación y control de favorito. Emite:

- `movie-select` al seleccionar una película.
- `favorite-toggle` al agregarla o quitarla de favoritos.

### `<actor-card>`

Representa a una persona del reparto con fotografía, nombre y personaje. Emite `actor-select` con el identificador de TMDB.

### `<actor-details>`

Presenta fotografía, información biográfica y estados de carga/error del actor. Emite `actor-back` para volver al detalle de la película.

Los componentes comparten el CSS global y no utilizan Shadow DOM.

## APIs

### TMDB

TMDB aporta:

- listas de películas, tendencias, cartelera y próximos estrenos;
- búsqueda, categorías y detalles de películas;
- pósteres y fondos;
- créditos, reparto, dirección y datos biográficos de actores;
- vídeos/tráilers y recomendaciones.

La aplicación necesita conexión a internet para TMDB, sus imágenes y los vídeos de YouTube.

### JSON Server

JSON Server publica `db/db.json` en `http://localhost:3000`. Almacena los datos creados o administrados por la aplicación local; no sustituye a TMDB.

## Persistencia y base de datos

Colecciones reales de `db/db.json`:

- `billboard`: películas habilitadas en la cartelera local.
- `functions`: fechas, horarios, precios y relación con película/sala.
- `rooms`: configuración de salas.
- `seats`: asientos físicos.
- `functionSeats`: disponibilidad de cada asiento por función.
- `users`: cuentas académicas.
- `reservations`: reservas personales.
- `purchases`: compras y pagos simulados.
- `ratings`: calificaciones y comentarios.
- `favorites`: películas favoritas por usuario.

`localStorage` solo conserva la clave `theMoiCurrentUser`, con identificador, nombre y correo de la sesión. La contraseña y los datos operativos permanecen en JSON Server; la sesión se valida contra `/users/:id` al iniciar.

## Instalación y ejecución

Requisitos: Git, Node.js, npm y un servidor estático para el frontend.

```bash
git clone https://github.com/ellmoi/Cartelera-Proyect-moises-giraldo.git
cd Cartelera-Proyect-moises-giraldo
npm install
npm run server
```

En otra terminal, sirve la raíz con un servidor estático, por ejemplo la extensión Live Server de Visual Studio Code. No se recomienda abrir `index.html` mediante `file://`, porque los ES Modules necesitan un origen HTTP. JSON Server debe permanecer en `http://localhost:3000`.

## Uso de Git

El historial utiliza Conventional Commits para expresar claramente el propósito de cada cambio, por ejemplo `feat:`, `fix:`, `docs:`, `style:`, `refactor:` y `chore:`.

## Consideraciones académicas

- Los pagos y notificaciones son simulados; no procesan dinero real.
- Las credenciales son adecuadas para una demostración local, no para producción.
- La clave de TMDB está en el frontend y no debe considerarse un secreto de producción.
- JSON Server simula una API REST y no reemplaza un backend con seguridad y transacciones reales.

## Autor

Moisés Giraldo — [ellmoi](https://github.com/ellmoi)
