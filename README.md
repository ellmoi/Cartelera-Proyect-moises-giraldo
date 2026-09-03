# THE MOI CINEMAS

Aplicación académica de cartelera, reservas, compras simuladas y valoraciones.

## Tecnologías

El frontend utiliza exclusivamente HTML5, CSS3, JavaScript Vanilla, ES Modules y Web Components nativos. Node.js, npm y JSON Server se usan solamente para publicar la base de datos local; no contienen lógica del frontend.

## Instalación y ejecución

1. Instala la dependencia local:

```bash
npm install
```

2. Inicia la base de datos:

```bash
npm run server
```

3. Sirve esta carpeta con un servidor estático y abre `index.html` en el navegador.

JSON Server queda disponible en `http://localhost:3000` y utiliza `db/db.json`.

## Arquitectura

```text
HTML
  ↓
JavaScript Vanilla / <movie-card>
  ↓ eventos
app.js
  ↓ fetch()
JSON Server
  ↓
db/db.json
```

TMDB continúa siendo la fuente externa de películas, géneros, pósteres, detalles, créditos, vídeos y recomendaciones.

## Organización

```text
index.html
├── css/styles.css
├── js/app.js
├── js/components/movie-card.js
└── db/db.json
```

- `app.js` controla el estado, eventos y actualización del DOM.
- `movie-card.js` registra el Custom Element `<movie-card>`.
- `db/db.json` conserva usuarios, cartelera, funciones, salas, asientos, reservas, compras y valoraciones.
- `package.json` contiene únicamente el comando para ejecutar JSON Server.

## Persistencia

JSON Server guarda en `db/db.json`:

- Usuarios.
- Cartelera local.
- Funciones y salas.
- Asientos y su estado por función.
- Reservas.
- Compras simuladas.
- Calificaciones y comentarios.

`localStorage` se utiliza únicamente para recordar la sesión actual mediante la clave `theMoiCurrentUser`. Solo guarda identificador, nombre y correo; la cuenta completa continúa en JSON Server y se valida al cargar la aplicación.

El proyecto actual no contiene funcionalidades ni colecciones de Me gusta o Favoritos. “Actividad” es el nombre del indicador visual de peticiones, no una sección de actividad del usuario; no se inventaron funciones fuera del alcance existente.

## Web Component

`MovieCard extends HTMLElement` usa `connectedCallback()`, una propiedad `movie`, el atributo `return-view` y el evento personalizado `movie-select`. No usa Shadow DOM porque comparte los estilos globales de las tarjetas existentes.

## Alcance académico

Los pagos son simulados. Las contraseñas de demostración no tienen seguridad de producción. Se necesita conexión a internet para TMDB, sus imágenes y los tráileres de YouTube.
