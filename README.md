# THE MOI CINEMAS

Aplicación web académica para explorar películas, consultar una cartelera local, seleccionar asientos, registrar reservas, simular compras y publicar valoraciones.

El proyecto utiliza un frontend construido con HTML, CSS y JavaScript sin frameworks. La información cinematográfica proviene de TMDB y los datos locales se administran mediante JSON Server.

> **Importante:** es una demostración local. No procesa pagos reales, no envía SMS y no ofrece autenticación ni transacciones de nivel productivo.

## Funcionalidades

- Página de inicio con películas populares, mejor valoradas y categorías.
- Cartelera local definida mediante identificadores de TMDB.
- Búsqueda con sugerencias, pósteres y año de estreno.
- Exploración por géneros, orden y categorías.
- Detalle de películas con sinopsis, duración, géneros y puntuación.
- Consulta de director, reparto, tráileres y recomendaciones.
- Registro, inicio y cierre de sesión de cuentas académicas.
- Recuperación y validación de la sesión almacenada en el navegador.
- Funciones asociadas con sala, fecha, hora, duración y precio.
- Mapa de asientos independiente para cada función.
- Reservas con revalidación y bloqueo de asientos.
- Compras y pagos completamente simulados.
- Historial de reservas y compras filtrado por usuario.
- Pago o cancelación de reservas activas.
- Valoraciones de 1 a 5 estrellas y comentarios opcionales.
- Diseño adaptable para escritorio y dispositivos móviles.

## Tecnologías

- HTML5
- CSS3
- JavaScript Vanilla
- Node.js y npm
- JSON Server `1.0.0-beta.3`
- TMDB API
- YouTube Embed

## Arquitectura

```text
Navegador
   |
   |-- Frontend local: http://localhost:5500
   |      |-- index.html
   |      |-- css/styles.css
   |      `-- js/app.js
   |
   |-- TMDB API
   |      `-- Películas, géneros, detalles, créditos y vídeos
   |
   `-- JSON Server: http://localhost:3000
          `-- Usuarios, cartelera, funciones, asientos y operaciones
```

El frontend combina datos de dos orígenes:

1. TMDB proporciona información pública de películas.
2. JSON Server expone `db/db.json` como una API REST local.

Los títulos, pósteres y sinopsis no se duplican en `db.json`. Las colecciones locales guardan `tmdbId` y el frontend consulta TMDB cuando necesita completar la información visual.

## API y servicios utilizados

### TMDB API

Base utilizada:

```text
https://api.themoviedb.org/3
```

TMDB se utiliza para:

| Recurso | Uso en la aplicación |
|---|---|
| `/genre/movie/list` | Obtener los géneros oficiales. |
| `/movie/now_playing` | Mostrar películas actualmente en cartelera. |
| `/movie/upcoming` | Mostrar próximos estrenos. |
| `/movie/{id}` | Consultar detalles, duración y datos de una película. |
| `/movie/{id}/credits` | Obtener director y reparto. |
| `/movie/{id}/videos` | Obtener tráileres y otros vídeos. |
| `/movie/{id}/recommendations` | Mostrar películas recomendadas. |
| `/discover/movie` | Explorar películas por género. |
| `/search/movie` | Realizar búsquedas y sugerencias. |

La API se consulta en español mediante `language=es-ES` y utiliza `region=CO` cuando el endpoint lo permite.

### TMDB Images

Los pósteres se construyen con:

```text
https://image.tmdb.org/t/p/w500
```

Las sugerencias de búsqueda utilizan imágenes de menor tamaño para reducir la carga. Cuando una imagen no existe o falla, la interfaz muestra un reemplazo accesible.

### YouTube

Los vídeos devueltos por TMDB se reproducen mediante YouTube Embed. Antes de construir el `iframe`, la aplicación valida el identificador del vídeo. Si YouTube impide la reproducción embebida, se ofrece un enlace directo.

### JSON Server

JSON Server convierte `db/db.json` en una API REST local:

```text
http://localhost:3000
```

| Endpoint | Finalidad |
|---|---|
| `/billboard` | Define las películas disponibles en el cine local. |
| `/functions` | Guarda película, sala, fecha, hora, duración y precio. |
| `/rooms` | Describe las salas y su distribución. |
| `/seats` | Contiene los asientos físicos de cada sala. |
| `/functionSeats` | Guarda el estado de cada asiento para cada función. |
| `/users` | Almacena las cuentas académicas. |
| `/reservations` | Conserva reservas activas, pagadas o canceladas. |
| `/purchases` | Conserva las compras simuladas. |
| `/ratings` | Conserva puntuaciones y comentarios. |

## Requisitos

- Node.js instalado.
- npm instalado.
- Navegador moderno.
- Conexión a internet para TMDB, imágenes y YouTube.

## Instalación

Clona el repositorio:

```bash
git clone https://github.com/ellmoi/Cartelera-Proyect-moises-giraldo.git
cd Cartelera-Proyect-moises-giraldo
```

Instala las dependencias:

```bash
npm install
```

## Ejecución recomendada

Inicia JSON Server, el servidor del frontend y el navegador:

```bash
npm start
```

En PowerShell también puedes utilizar:

```powershell
npm.cmd start
```

Direcciones locales:

- Frontend: `http://localhost:5500`
- API local: `http://localhost:3000`

La terminal debe permanecer abierta mientras se utiliza el proyecto.

### Iniciar solamente JSON Server

```bash
npm run server
```

Este comando ejecuta:

```text
json-server db/db.json --port 3000
```

Si solo ejecutas este comando, todavía necesitarás servir el frontend por separado.

### Accesos directos de Windows

También puedes usar:

- `Iniciar THE MOI CINEMAS.vbs`
- `Detener THE MOI CINEMAS.vbs`

El primer archivo inicia la API y el frontend en segundo plano. El segundo detiene ambos procesos.

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `npm start` | Inicia API, frontend y navegador. |
| `npm run server` | Inicia solamente JSON Server en el puerto 3000. |
| `npm run check` | Comprueba sintaxis, colecciones y relaciones. |
| `npm test` | Ejecuta la validación completa disponible. |

## Modelo de datos

Relación principal:

```text
billboard.tmdbId
        |
        v
functions.tmdbId ----> functions.roomId ----> rooms.id
        |                                        |
        v                                        v
functionSeats.functionId                    seats.roomId
        |
        `---- functionSeats.seatId --------> seats.id
```

Las reservas y compras relacionan:

- Usuario mediante `userId`.
- Película mediante `tmdbId`.
- Función mediante `functionId`.
- Sala mediante `roomId`.
- Asientos mediante `seatId`.

## Estados de asientos y operaciones

### Asientos por función

- `available`: disponible.
- `reserved`: retenido por una reserva activa.
- `sold`: vendido mediante una compra simulada.

Un mismo asiento físico puede estar ocupado en una función y disponible en otra. La disponibilidad siempre se consulta mediante la combinación `functionId + seatId`.

### Reservas

- `active`: puede pagarse o cancelarse antes de iniciar la función.
- `paid`: fue convertida en compra y conserva los asientos vendidos.
- `cancelled`: permanece en el historial y libera los asientos.

### Vigencia de una función

Cada función incluye `date`, `time` y `durationMinutes`. Con estos datos se calcula si está:

- Próxima.
- En curso.
- Terminada.

Solo una función futura permite nuevas reservas, compras, pagos o cancelaciones.

## Protección contra reservas duplicadas

Antes de registrar una reserva o compra, la aplicación:

1. Consulta nuevamente los asientos de la función.
2. Comprueba que continúen disponibles.
3. Asigna un token único de operación.
4. Actualiza temporalmente los estados.
5. Verifica que conserva el bloqueo.
6. Crea la reserva o compra.
7. Retira el token al finalizar.
8. Revierte los estados si la creación falla.

Este mecanismo reduce operaciones parciales y dobles reservas en la demostración local. JSON Server no ofrece transacciones atómicas; un sistema productivo debe implementar el bloqueo en un backend real.

## Cuentas y sesión

- Los correos se normalizan antes de compararlos.
- No se permiten dos cuentas con el mismo correo.
- El registro evita envíos repetidos.
- Nombre, correo, contraseña y confirmación son obligatorios.
- La contraseña debe tener al menos seis caracteres.
- Ambas contraseñas deben coincidir.
- Los formularios permiten mostrar u ocultar la contraseña.
- La sesión del navegador solo conserva `id`, nombre y correo.
- Al iniciar la aplicación se comprueba que el usuario todavía exista.
- Reservas, compras y valoraciones se asocian mediante `userId`.

Las contraseñas se guardan sin cifrado porque JSON Server es un backend académico. No utilices contraseñas reales.

## Compra simulada

El proyecto no procesa dinero ni se conecta con bancos.

- No solicita números de tarjeta.
- No solicita fecha de vencimiento.
- No solicita CVV.
- No solicita números de cuenta, claves, OTP ni credenciales bancarias.
- El teléfono, método y referencia son datos provisionales.
- La confirmación móvil es únicamente visual.

## Valoraciones

- Requieren una sesión iniciada.
- La puntuación debe estar entre 1 y 5.
- Cada usuario mantiene una valoración por película.
- Guardar nuevamente actualiza la valoración existente.
- El comentario es opcional y admite hasta 1000 caracteres.
- Los comentarios se insertan mediante `textContent` para evitar ejecutar HTML.
- El promedio utiliza solamente puntuaciones válidas.

## Estructura del proyecto

```text
cine-proyecto/
|-- css/
|   `-- styles.css
|-- db/
|   `-- db.json
|-- js/
|   `-- app.js
|-- scripts/
|   |-- start-background.js
|   |-- start-project.js
|   |-- static-server.js
|   |-- stop-background.js
|   `-- validate-data.js
|-- Detener THE MOI CINEMAS.vbs
|-- Iniciar THE MOI CINEMAS.vbs
|-- DEVELOPER_NOTES.md
|-- index.html
|-- package.json
`-- README.md
```

## Validación

Ejecuta:

```bash
npm test
```

La validación comprueba:

- Sintaxis de `js/app.js`.
- Existencia de las colecciones requeridas.
- Identificadores únicos.
- Relaciones entre películas, funciones, salas y asientos.
- Estados válidos de asientos y operaciones.
- Cantidades, precios y totales coherentes.
- Usuarios y correos válidos.
- Valoraciones únicas por usuario y película.
- Ausencia de bloqueos de asiento incompletos.

## Uso en otro computador

Después de clonar el repositorio en otro equipo:

```bash
npm install
npm start
```

Cada clon utiliza su propio `db/db.json`. Dos computadores que ejecuten servidores independientes no comparten usuarios, reservas ni disponibilidad. Para compartir datos se necesita un único backend desplegado en internet.

## Limitaciones

- La aplicación y la base de datos funcionan localmente.
- JSON Server no proporciona autenticación segura ni autorización real.
- Las contraseñas no están cifradas.
- No existen transacciones atómicas de base de datos.
- La API key de TMDB es visible en el frontend.
- GitHub Pages no ejecuta JSON Server.
- Los datos de diferentes clones no se sincronizan.
- Las funciones usan fechas de demostración y deben actualizarse cuando venzan.

## Datos de demostración

Los datos incluidos en `db/db.json` son ficticios y existen solamente para probar la aplicación. No agregues nombres, correos, contraseñas, teléfonos ni información financiera real al repositorio.

## Atribución de TMDB

This product uses the TMDB API but is not endorsed or certified by TMDB.

Consulta también [DEVELOPER_NOTES.md](./DEVELOPER_NOTES.md) para información adicional de mantenimiento.
