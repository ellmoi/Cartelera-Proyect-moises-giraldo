/*
 * GUIA DE ESTUDIO - COMO FUNCIONA ESTE ARCHIVO
 *
 * Este archivo es el controlador principal del frontend. Su trabajo es:
 * 1. Leer elementos de index.html mediante el DOM.
 * 2. Escuchar acciones del usuario: clics y busquedas.
 * 3. Pedir datos a dos APIs usando fetch(): TMDB y JSON Server.
 * 4. Convertir los datos recibidos en HTML.
 * 5. Insertar ese HTML dentro de moviesContainer.
 *
 * Flujo general:
 * index.html carga -> app.js inicia loadNowPlaying() ->
 * fetch consulta TMDB -> displayMovies() crea tarjetas ->
 * el usuario hace clic -> se consulta el siguiente dato ->
 * el DOM se actualiza sin recargar toda la pagina.
 *
 * TMDB es una API externa: peliculas, posters, detalles, creditos,
 * trailers y recomendaciones.
 * JSON Server es una API local: salas, funciones, sillas y reservas.
 */

// CONFIGURACION: constantes con las direcciones de las API.
// const crea un valor que no se reasigna durante la ejecucion.
// La API key permite autenticar las peticiones a TMDB.
// En un frontend la clave puede ser visible; en produccion se protegeria
// en un backend, nunca se confiaria en ella como un secreto.
const API_KEY = "7d940bf2e9411d225472ea694e9a0c15";
// TMDB entrega rutas como /abc123.jpg; esta URL completa la ruta de imagen.
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
// JSON Server lee db/db.json y expone sus colecciones en este puerto.
const LOCAL_API_URL = "http://localhost:3000";

// DOM (Document Object Model):
// el navegador convierte el HTML en objetos que JavaScript puede consultar,
// modificar y escuchar. getElementById busca un elemento por su atributo id.
const searchInput = document.getElementById("searchinput");
const searchButton = document.getElementById("searchButton");
const searchSuggestions = document.getElementById("searchSuggestions");
const moviesContainer = document.getElementById("moviesContainer");
const upcomingLink = document.getElementById("upcomingLink");
const categoriesLink = document.getElementById("categoriesLink");
const reservationsLink = document.getElementById("reservationsLink");
const purchasesLink = document.getElementById("purchasesLink");
const nowPlayingLink = document.getElementById("nowPlayingLink");
const homeLink = document.getElementById("homeLink");
const brandLink = document.getElementById("brandLink");

// ESTADO DE LA APLICACION:
// Son variables que recuerdan en que pantalla y paso se encuentra el usuario.
// let permite reasignar; [] representa una lista; null significa "ninguno".
let currentMovies = [];
let currentSectionTitle = "";
let currentShowBackButton = false;
let currentEmptyMessage = "";
let currentDetailsMovieId = null;
let currentDetailsMovie = null;
let selectedSeats = [];
let currentSelectedFunction = null;
let currentSelectedRoom = null;
let currentRoomSeats = [];
let currentFunctionSeats = [];
let operationConfirmationInProgress = false;
let desiredTicketQuantity = 1;
let currentCustomerData = null;
let currentOperationType = null;
let operationRecordCreated = false;
let selectedMovieRating = 0;
let ratingSaveInProgress = false;
let currentSeatSelectionFunctionId = null;
let currentListRequestId = 0;
let suggestionDebounceId = null;
let suggestionRequestId = 0;
let suggestionResults = [];
let activeSuggestionIndex = -1;
const suggestionCache = new Map();
const tmdbListCache = new Map();
const tmdbMovieCache = new Map();
const personNameCache = new Map();
let currentRecommendationMovies = [];
let visibleRecommendationCount = 0;
let currentMovieReturnView = "list";
let currentGenreView = null;

// ESTADO DE EXPLORACION DE LISTAS:
// genreMap relaciona cada id oficial de TMDB con su nombre en espanol.
// Los filtros siempre actuan sobre una copia de currentMovies.
let genreMap = {};
let genreLoadPromise = null;
let currentGenreFilter = "";
let currentSortOption = "featured";

// FUNCIONES DE PRESENTACION (RENDERIZADO)
// Una funcion de presentacion recibe datos y produce/cambia HTML.
// No consulta APIs: solo se ocupa de mostrar la informacion.

// Crea y devuelve el encabezado; un operador ternario decide si incluye el boton Volver.
function createSectionHeading(sectionTitle, showBackButton) {
    const backButton = showBackButton
        ? `<button class="back-button" id="backToNowPlaying" type="button">Volver a cartelera</button>`
        : "";

    return `
        <div class="section-heading">
            <p class="section-heading__number">01</p>
            <h2>${sectionTitle}</h2>
            ${backButton}
        </div>
    `;
}

// innerHTML reemplaza el contenido interno de un elemento interpretando texto HTML.
// Aqui se usa para estados de carga, error y listas vacias.
function showMessage(message, sectionTitle, showBackButton) {
    moviesContainer.innerHTML = `
        ${createSectionHeading(sectionTitle, showBackButton)}
        <p class="movies__message">${message}</p>
    `;
}

// TMDB puede no tener poster o backdrop. Esta funcion devuelve una imagen
// cuando existe imagePath y un placeholder accesible cuando no existe.
function createImage(imagePath, className, alternativeText, fallbackText) {
    if (imagePath) {
        return `
            <img
                class="${className}"
                src="${IMAGE_BASE_URL}${imagePath}"
                alt="${alternativeText}"
                data-fallback-text="${fallbackText}"
            >
        `;
    }

    return `
        <div class="${className} image-placeholder" role="img" aria-label="${fallbackText}">
            <span class="image-placeholder__mark">M</span>
            <span>THE MOI CINEMAS</span>
            <small>${fallbackText}</small>
        </div>
    `;
}

// Ademas de comprobar si falta una ruta, comprobamos si la URL de imagen falla.
// querySelectorAll selecciona todas las imagenes que tengan ese atributo.
function activateImageFallbacks() {
    const images = moviesContainer.querySelectorAll("img[data-fallback-text]");

    images.forEach(function (image) {
        image.addEventListener("error", function () {
            const placeholder = document.createElement("div");
            placeholder.className = `${image.className} image-placeholder`;
            placeholder.setAttribute("role", "img");
            placeholder.setAttribute("aria-label", image.dataset.fallbackText);
            placeholder.innerHTML = `
                <span class="image-placeholder__mark">M</span>
                <span>THE MOI CINEMAS</span>
                <small>${image.dataset.fallbackText}</small>
            `;

            image.replaceWith(placeholder);
        });
    });
}

// Obtiene una sola vez los generos oficiales. Si falla, devuelve un mapa vacio:
// la cartelera sigue funcionando y el selector de categorias queda deshabilitado.
function loadMovieGenres() {
    // Si la consulta ya comenzo, todas las vistas esperan la misma promesa.
    // Asi se evita repetir /genre/movie/list al cambiar rapidamente de seccion.
    if (genreLoadPromise) return genreLoadPromise;

    const url = `https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}&language=es-ES`;

    genreLoadPromise = (async function () {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error de generos TMDB: ${response.status}`);

            const data = await response.json();
            genreMap = {};

            data.genres.forEach(function (genre) {
                genreMap[String(genre.id)] = genre.name;
            });
        } catch (error) {
            console.error("No se pudieron cargar los generos:", error);
        }

        return genreMap;
    })();

    return genreLoadPromise;
}

// Al entrar a Cartelera, Proximamente o una nueva busqueda se vuelve al estado base.
function resetMovieExploration() {
    currentGenreFilter = "";
    currentSortOption = "featured";
}

// Traduce como maximo dos genre_ids usando exclusivamente el mapa oficial de TMDB.
function getMovieGenreNames(movie) {
    if (!Array.isArray(movie.genre_ids)) return [];

    return movie.genre_ids
        .map(function (genreId) {
            return genreMap[String(genreId)];
        })
        .filter(function (genreName) {
            return Boolean(genreName);
        })
        .slice(0, 2);
}

// Crea un unico desplegable con los generos oficiales de TMDB.
function createMovieExplorer() {
    const genres = Object.entries(genreMap).sort(function (a, b) { return a[1].localeCompare(b[1], "es"); });
    const selectedGenreName = genreMap[currentGenreFilter] || "Categor\u00edas";
    const genreOptions = [["", "Todas"]].concat(genres).map(function (genre) {
        const isSelected = currentGenreFilter === genre[0];
        return `<button class="genre-menu__option ${isSelected ? "genre-menu__option--active" : ""}" type="button" role="option" data-genre-id="${genre[0]}" aria-selected="${isSelected}" tabindex="-1"><span>${genre[1]}</span><span class="genre-menu__check" aria-hidden="true">${isSelected ? "\u2713" : ""}</span></button>`;
    }).join("");
    return `<div class="movie-explorer" aria-label="Opciones de exploración"><div class="movie-explorer__controls"><div class="genre-dropdown"><button class="genre-dropdown__toggle" id="genreMenuToggle" type="button" aria-expanded="false" aria-controls="genreMenu" aria-haspopup="listbox" ${genres.length === 0 ? "disabled" : ""}><span>${selectedGenreName}</span><span aria-hidden="true">&#9662;</span></button><div class="genre-menu" id="genreMenu" role="listbox" aria-label="Categorías de películas" hidden>${genreOptions}</div></div><label class="explorer-field" for="sortMovies"><span>Ordenar por</span><select id="sortMovies"><option value="featured" ${currentSortOption === "featured" ? "selected" : ""}>Destacadas</option><option value="release-date" ${currentSortOption === "release-date" ? "selected" : ""}>Fecha de lanzamiento</option><option value="rating" ${currentSortOption === "rating" ? "selected" : ""}>Mejor puntuación</option><option value="popularity" ${currentSortOption === "popularity" ? "selected" : ""}>Más vistos</option></select></label><button class="explorer-reset" id="resetMovieFilters" type="button">Restablecer</button></div></div>`;
}

// Devuelve una copia ordenada. currentMovies nunca recibe sort() directamente.
function sortMovies(movies, sortOption) {
    const orderedMovies = movies.slice();

    if (sortOption === "release-date") {
        orderedMovies.sort(function (firstMovie, secondMovie) {
            const firstDate = firstMovie.release_date
                ? new Date(firstMovie.release_date).getTime()
                : Number.NEGATIVE_INFINITY;
            const secondDate = secondMovie.release_date
                ? new Date(secondMovie.release_date).getTime()
                : Number.NEGATIVE_INFINITY;
            return secondDate - firstDate;
        });
    }

    if (sortOption === "rating") {
        orderedMovies.sort(function (firstMovie, secondMovie) {
            return Number(secondMovie.vote_average || 0) - Number(firstMovie.vote_average || 0);
        });
    }

    if (sortOption === "popularity") {
        // TMDB no entrega un contador de reproducciones; se utiliza popularity
        // como indicador de popularidad para la opcion visual "Mas vistos".
        orderedMovies.sort(function (firstMovie, secondMovie) {
            return Number(secondMovie.popularity || 0) - Number(firstMovie.popularity || 0);
        });
    }

    return orderedMovies;
}

function createMovieCard(movie, returnView) {
    const movieCard = document.createElement("article");
    movieCard.className = "movie-card";
    const poster = createImage(movie.poster_path, "movie-card__poster", `Póster de ${movie.title}`, "Póster no disponible");
    const rating = Number(movie.vote_average || 0).toFixed(1);
    const genreNames = getMovieGenreNames(movie);
    const genres = genreNames.length ? genreNames.join(", ") : "Género no disponible";
    movieCard.innerHTML = `<button class="movie-card__visual" type="button" data-movie-id="${movie.id}" aria-label="Abrir ${movie.title}">${poster}<span class="movie-card__overlay" aria-hidden="true"><span class="movie-card__overlay-title">${movie.title}</span><span class="movie-card__genres">${genres}</span><span class="movie-card__rating"><span aria-hidden="true">★</span> ${rating}</span></span></button><h3>${movie.title}</h3>`;
    movieCard.querySelector(".movie-card__visual").addEventListener("click", function () { currentMovieReturnView = returnView || "list"; loadMovieDetails(movie.id); });
    return movieCard;
}
// Solo renderiza. No modifica currentMovies ni llama displayMovies(), evitando ciclos.
function renderMovieList(movies) {
    const sectionDescription = currentSectionTitle === "Ahora en cartelera"
        ? "Descubre las pel�culas que puedes disfrutar en THE MOI CINEMAS."
        : "Explora, filtra y encuentra tu pr�xima experiencia en la gran pantalla.";

    moviesContainer.innerHTML = `
        <div class="movies-hero">
            ${createSectionHeading(currentSectionTitle, currentShowBackButton)}
            <p>${sectionDescription}</p>
        </div>
        ${createMovieExplorer()}
        <p class="movie-results-count">${movies.length} ${movies.length === 1 ? "pel�cula" : "pel�culas"}</p>
        <div class="movies-grid"></div>
    `;

    const moviesGrid = moviesContainer.querySelector(".movies-grid");

    if (movies.length === 0) {
        moviesGrid.innerHTML = `
            <div class="movies-empty">
                <p>No encontramos pel�culas de esta categor�a en la lista actual.</p>
                <button class="primary-action" id="viewAllMovies" type="button">Ver todas</button>
            </div>`;
        return;
    }

    movies.forEach(function (movie) { moviesGrid.appendChild(createMovieCard(movie, "list")); });

    activateImageFallbacks();
}

// Funcion central: copia, filtra por genre_ids, ordena y despues renderiza.
function applyMovieFiltersAndSort() {
    let visibleMovies = currentMovies.slice();

    if (currentGenreFilter !== "") {
        const selectedGenreId = Number(currentGenreFilter);
        visibleMovies = visibleMovies.filter(function (movie) {
            return Array.isArray(movie.genre_ids)
                && movie.genre_ids.includes(selectedGenreId);
        });
    }

    visibleMovies = sortMovies(visibleMovies, currentSortOption);
    renderMovieList(visibleMovies);
}

// Una nueva lista reemplaza el origen. preserveExplorationState solo se usa al volver
// desde Detalles para conservar exactamente el filtro y orden que el usuario tenia.
function displayMovies(movies, sectionTitle, showBackButton, emptyMessage, preserveExplorationState) {
    currentDetailsMovieId = null;
    currentMovies = movies.slice();
    currentSectionTitle = sectionTitle;
    currentShowBackButton = showBackButton;
    currentEmptyMessage = emptyMessage || "";

    if (!preserveExplorationState) resetMovieExploration();

    if (currentMovies.length === 0) {
        showMessage(
            currentEmptyMessage || "No encontramos pel�culas con ese nombre.",
            currentSectionTitle,
            currentShowBackButton
        );
        return;
    }

    applyMovieFiltersAndSort();
}

// Primero muestra la estructura y mensajes de carga; luego otras funciones
// reemplazan cada seccion cuando llegan creditos, videos, recomendaciones y funciones.
function displayMovieDetails(movie) {
    currentDetailsMovie = movie;
    selectedMovieRating = 0;
    ratingSaveInProgress = false;
    const poster = createImage(
        movie.poster_path,
        "movie-details__poster",
        `P\u00f3ster de ${movie.title}`,
        "P\u00f3ster no disponible"
    );
    const backdrop = movie.backdrop_path ? createImage(movie.backdrop_path, "movie-details__backdrop", "", "Imagen de fondo no disponible") : "";
    const genres = movie.genres.length > 0
        ? movie.genres.map(function (genre) {
            return genre.name;
        }).join(", ")
        : "G\u00e9neros no disponibles";
    const runtime = movie.runtime
        ? `${movie.runtime} min`
        : "Duraci\u00f3n no disponible";
    const releaseDate = movie.release_date || "Fecha no disponible";
    const overview = movie.overview || "Sinopsis no disponible.";
    const originalTitle = movie.original_title || "T\u00edtulo original no disponible";

    moviesContainer.innerHTML = `
        <article class="movie-details">
            <button class="details-back-button" id="backToPreviousList" type="button">
                \u2190 Volver
            </button>
            ${backdrop}
            <div class="movie-details__body">
                ${poster}
                <div class="movie-details__information">
                    <p class="movie-details__eyebrow">THE MOI CINEMAS presenta</p>
                    <h2>${movie.title}</h2>
                    <p class="movie-details__original-title">${originalTitle}</p>
                    <div class="movie-details__facts">
                        <span>${releaseDate}</span>
                        <span>${runtime}</span>
                        <span class="movie-details__rating" aria-label="Puntuación TMDB ${movie.vote_average.toFixed(1)} de 10">TMDB \u2605 ${movie.vote_average.toFixed(1)} / 10</span>
                    </div>
                    <p><strong>G\u00e9neros:</strong> ${genres}</p>
                    <p class="movie-details__overview">${overview}</p>
                </div>
            </div>
            <section class="movie-showtimes" id="movieShowtimes">
                <p class="movie-details__eyebrow">En nuestros cines</p>
                <h3>Funciones disponibles</h3>
                <p class="movies__message">Consultando funciones...</p>
            </section>
            <section class="movie-trailer" id="movieTrailer">
                <p class="movie-details__eyebrow">Video</p>
                <h3>Tr\u00e1iler</h3>
                <p class="movies__message">Cargando tr\u00e1iler...</p>
            </section>
            <section class="movie-credits" id="movieCredits">
                <h3>Director y reparto principal</h3>
                <p class="movies__message">Cargando reparto...</p>
            </section>
            <section class="movie-ratings" id="movieRatings" data-tmdb-id="${movie.id}" aria-labelledby="movieRatingsTitle">
                <p class="movie-details__eyebrow">Comunidad THE MOI CINEMAS</p>
                <h3 id="movieRatingsTitle">Valoración THE MOI CINEMAS</h3>
                <div class="movie-ratings__summary" aria-live="polite">
                    <p class="movie-ratings__average-stars" id="ratingAverageStars" aria-hidden="true">☆☆☆☆☆</p>
                    <p id="ratingAverageText">Consultando valoraciones...</p>
                    <p id="ratingCountText"></p>
                </div>
                <form class="rating-form" id="ratingForm" novalidate>
                    <fieldset>
                        <legend>Tu valoración, de 1 a 5 estrellas</legend>
                        <div class="rating-stars" role="group" aria-label="Selecciona una valoración">
                            ${[1,2,3,4,5].map(function(value){return `<button class="rating-star" type="button" data-rating-value="${value}" aria-label="${value} de 5 estrellas" aria-pressed="false">☆</button>`;}).join("")}
                        </div>
                    </fieldset>
                    <label for="ratingUserName">Nombre</label>
                    <input id="ratingUserName" name="userName" type="text" autocomplete="name" required>
                    <label for="ratingEmail">Correo electrónico</label>
                    <input id="ratingEmail" name="email" type="email" autocomplete="email" required>
                    <button class="primary-action" id="saveMovieRating" type="submit">Guardar valoración</button>
                </form>
                <p class="rating-feedback" id="ratingFeedback" role="status" aria-live="polite"></p>
            </section>
            <section class="movie-recommendations" id="movieRecommendations">
                <p class="movie-details__eyebrow">Descubre m\u00e1s</p>
                <h3>Tambi\u00e9n te puede interesar</h3>
                <p class="movies__message">Cargando recomendaciones...</p>
            </section>
        </article>
    `;

    activateImageFallbacks();
}

function isValidRatingValue(value) {
    return Number.isInteger(value) && value >= 1 && value <= 5;
}

function selectMovieRating(value) {
    const numericValue = Number(value);
    if (!isValidRatingValue(numericValue)) return;
    selectedMovieRating = numericValue;
    document.querySelectorAll("#movieRatings [data-rating-value]").forEach(function (button) {
        const active = Number(button.dataset.ratingValue) <= selectedMovieRating;
        button.textContent = active ? "★" : "☆";
        button.classList.toggle("rating-star--active", active);
        button.setAttribute("aria-pressed", String(Number(button.dataset.ratingValue) === selectedMovieRating));
    });
}

function renderMovieRatingSummary(tmdbId, ratings) {
    if (currentDetailsMovieId !== String(tmdbId)) return;
    const section = document.getElementById("movieRatings");
    if (!section || section.dataset.tmdbId !== String(tmdbId)) return;
    const validRatings = ratings.filter(function (item) { return isValidRatingValue(Number(item.rating)); });
    const stars = document.getElementById("ratingAverageStars");
    const averageText = document.getElementById("ratingAverageText");
    const countText = document.getElementById("ratingCountText");
    if (validRatings.length === 0) {
        stars.textContent = "☆☆☆☆☆";
        averageText.textContent = "Sin valoraciones todavía";
        countText.textContent = "Sé el primero en valorar esta película.";
        return;
    }
    const average = validRatings.reduce(function (total, item) { return total + Number(item.rating); }, 0) / validRatings.length;
    const filledStars = Math.round(average);
    stars.textContent = "★".repeat(filledStars) + "☆".repeat(5 - filledStars);
    averageText.textContent = `${average.toFixed(1)} / 5`;
    countText.textContent = `${validRatings.length} ${validRatings.length === 1 ? "valoración" : "valoraciones"}`;
}

async function loadMovieRatings(tmdbId) {
    try {
        const response = await fetch(`${LOCAL_API_URL}/ratings?tmdbId=${tmdbId}`);
        if (!response.ok) throw new Error("No se pudieron consultar las valoraciones");
        const ratings = await response.json();
        renderMovieRatingSummary(tmdbId, ratings);
        return ratings;
    } catch (error) {
        console.error("No se pudieron cargar las valoraciones:", error);
        if (currentDetailsMovieId === String(tmdbId)) {
            const feedback = document.getElementById("ratingFeedback");
            if (feedback) feedback.textContent = "No fue posible consultar las valoraciones.";
        }
        return [];
    }
}

async function saveMovieRating(event) {
    event.preventDefault();
    if (ratingSaveInProgress || !currentDetailsMovie) return;
    const tmdbId = currentDetailsMovie.id;
    const form = event.target;
    const userName = form.elements.userName.value.trim();
    const email = form.elements.email.value.trim().toLowerCase();
    const feedback = document.getElementById("ratingFeedback");
    if (!isValidRatingValue(selectedMovieRating)) { feedback.textContent = "Selecciona una valoración entre 1 y 5 estrellas."; return; }
    if (!userName) { feedback.textContent = "El nombre es obligatorio."; return; }
    if (!email) { feedback.textContent = "El correo electrónico es obligatorio."; return; }
    if (!form.elements.email.checkValidity() || !isValidEmail(email)) { feedback.textContent = "Escribe un correo electrónico válido."; return; }
    ratingSaveInProgress = true;
    const saveButton = document.getElementById("saveMovieRating");
    if (saveButton) { saveButton.disabled = true; saveButton.textContent = "Guardando..."; }
    try {
        const lookupResponse = await fetch(`${LOCAL_API_URL}/ratings?tmdbId=${tmdbId}&email=${encodeURIComponent(email)}`);
        if (!lookupResponse.ok) throw new Error("No se pudo comprobar la valoración existente");
        const existingRatings = await lookupResponse.json();
        const existingRating = existingRatings[0];
        const payload = { tmdbId: tmdbId, userName: userName, email: email, rating: selectedMovieRating, createdAt: new Date().toISOString() };
        const response = await fetch(existingRating ? `${LOCAL_API_URL}/ratings/${existingRating.id}` : `${LOCAL_API_URL}/ratings`, {
            method: existingRating ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("No se pudo guardar la valoración");
        if (currentDetailsMovieId !== String(tmdbId)) return;
        await loadMovieRatings(tmdbId);
        const currentFeedback = document.getElementById("ratingFeedback");
        if (currentFeedback) currentFeedback.textContent = existingRating ? "Tu valoración fue actualizada." : "Tu valoración fue guardada.";
    } catch (error) {
        console.error("No fue posible guardar la valoración:", error);
        if (currentDetailsMovieId === String(tmdbId)) {
            const currentFeedback = document.getElementById("ratingFeedback");
            if (currentFeedback) currentFeedback.textContent = "No fue posible guardar tu valoración.";
        }
    } finally {
        ratingSaveInProgress = false;
        if (currentDetailsMovieId === String(tmdbId)) {
            const currentButton = document.getElementById("saveMovieRating");
            if (currentButton) { currentButton.disabled = false; currentButton.textContent = "Guardar valoración"; }
        }
    }
}

function usesMostlyLatinAlphabet(name) {
    const letters=Array.from(name||"").filter(function(character){return /\p{L}/u.test(character);});
    if(!letters.length)return true;
    const latin=letters.filter(function(character){return /\p{Script=Latin}/u.test(character);}).length;
    return latin/letters.length>=0.7;
}

function resolvePersonDisplayName(person) {
    if(!person||!person.id||usesMostlyLatinAlphabet(person.name))return Promise.resolve(person?person.name:"");
    const key=String(person.id); if(personNameCache.has(key))return personNameCache.get(key);
    const request=fetch(`https://api.themoviedb.org/3/person/${person.id}?api_key=${API_KEY}&language=es-ES`).then(function(response){if(!response.ok)throw new Error(`Error de persona TMDB: ${response.status}`);return response.json();}).then(function(details){const candidates=[details.name].concat(Array.isArray(details.also_known_as)?details.also_known_as:[]);return candidates.find(function(candidate){return candidate&&usesMostlyLatinAlphabet(candidate);})||person.name;}).catch(function(error){console.error(`No se pudo consultar el nombre alternativo de ${person.id}:`,error);return person.name;});
    personNameCache.set(key,request); return request;
}

function resolveVisiblePersonNames(people) {
    people.filter(Boolean).forEach(function(person){if(usesMostlyLatinAlphabet(person.name))return;resolvePersonDisplayName(person).then(function(name){document.querySelectorAll(`[data-person-id="${person.id}"]`).forEach(function(element){element.textContent=name;});});});
}
// find devuelve el primer elemento que cumple una condicion.
// slice(0, 6) toma solo los seis primeros actores sin modificar el arreglo original.
function displayMovieCredits(credits) {
    const creditsContainer = document.getElementById("movieCredits");

    if (!creditsContainer) {
        return;
    }

    if (!credits) {
        creditsContainer.innerHTML = `
            <h3>Director y reparto principal</h3>
            <p class="movies__message">No pudimos cargar la informaci\u00f3n del reparto.</p>
        `;
        return;
    }

    const director = credits.crew.find(function (person) {
        return person.job === "Director";
    });
    const mainCast = credits.cast.slice(0, 6);
    const directorName = director ? director.name : "Director no disponible";

    creditsContainer.innerHTML = `
        <div class="movie-credits__director">
            <p class="movie-details__eyebrow">Direcci\u00f3n</p>
            <h3>Director</h3>
            <p data-person-id="${director ? director.id : ""}">${directorName}</p>
        </div>
        <div class="movie-credits__cast">
            <p class="movie-details__eyebrow">Cr\u00e9ditos</p>
            <h3>Reparto principal</h3>
            <div class="cast-grid"></div>
        </div>
    `;

    const castGrid = creditsContainer.querySelector(".cast-grid");

    if (mainCast.length === 0) {
        castGrid.innerHTML = `
            <p class="movies__message">Reparto no disponible.</p>
        `;
        return;
    }

    mainCast.forEach(function (person) {
        const castCard = document.createElement("article");
        castCard.classList.add("cast-card");

        const profilePhoto = createImage(
            person.profile_path,
            "cast-card__photo",
            `Fotograf\u00eda de ${person.name}`,
            "Fotograf\u00eda no disponible"
        );
        const character = person.character || "Personaje no disponible";

        castCard.innerHTML = `
            ${profilePhoto}
            <div class="cast-card__information">
                <h4 data-person-id="${person.id}">${person.name}</h4>
                <p>${character}</p>
            </div>
        `;

        castGrid.appendChild(castCard);
    });

    activateImageFallbacks();
    resolveVisiblePersonNames([director].concat(mainCast));
}

// API EXTERNA: TMDB
// async marca una funcion que devuelve una Promise.
// await espera una respuesta sin congelar el navegador.
// fetch hace una peticion HTTP GET cuando no se indica otro metodo.
async function loadMovieCredits(movieId) {
    const url = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${API_KEY}&language=es-ES`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Error de TMDB: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("No se pudieron cargar los cr\u00e9ditos:", error);
        return null;
    }
}

// Expresion regular: /^[a-zA-Z0-9_-]+$/ valida que la clave de YouTube
// tenga caracteres esperados antes de insertarla en el src del iframe.
function displayMovieTrailer(videos) {
    const trailerContainer = document.getElementById("movieTrailer");

    if (!trailerContainer) {
        return;
    }

    if (!videos) {
        trailerContainer.innerHTML = `
            <p class="movie-details__eyebrow">Video</p>
            <h3>Tr\u00e1iler</h3>
            <p class="movies__message">No pudimos cargar el tr\u00e1iler.</p>
        `;
        return;
    }

    const officialTrailer = videos.results.find(function (video) {
        return video.site === "YouTube"
            && video.type === "Trailer"
            && video.official === true
            && /^[a-zA-Z0-9_-]+$/.test(video.key);
    });

    const youtubeTrailer = videos.results.find(function (video) {
        return video.site === "YouTube"
            && video.type === "Trailer"
            && /^[a-zA-Z0-9_-]+$/.test(video.key);
    });

    const trailer = officialTrailer || youtubeTrailer;

    if (!trailer) {
        trailerContainer.innerHTML = `
            <p class="movie-details__eyebrow">Video</p>
            <h3>Tr\u00e1iler</h3>
            <p class="movies__message">Tr\u00e1iler no disponible.</p>
        `;
        return;
    }

    const youtubeUrl = `https://www.youtube.com/embed/${trailer.key}`;

    trailerContainer.innerHTML = `
        <p class="movie-details__eyebrow">Video oficial</p>
        <h3>Tr\u00e1iler</h3>
        <div class="movie-trailer__video">
            <iframe
                src="${youtubeUrl}"
                title="Tr\u00e1iler de la pel\u00edcula seleccionada"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
            ></iframe>
        </div>
    `;
}

// Cada endpoint de TMDB cambia la ultima parte de la URL:
// /movie/id, /credits, /videos y /recommendations.
async function loadMovieVideos(movieId) {
    const url = `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${API_KEY}&language=es-ES`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Error de TMDB: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("No se pudo cargar el tr\u00e1iler:", error);
        return null;
    }
}

// Las recomendaciones tienen la misma idea que la cartelera:
// datos -> crear elementos -> agregar listeners -> insertar en el DOM.
function appendRecommendationCards() {
    const grid=document.querySelector("#movieRecommendations .recommendations-grid-shared"); if(!grid)return;
    const rendered=grid.children.length;
    currentRecommendationMovies.slice(rendered,visibleRecommendationCount).forEach(function(movie){grid.appendChild(createMovieCard(movie,currentMovieReturnView));});
    const button=document.getElementById("showMoreRecommendations"); if(button)button.hidden=visibleRecommendationCount>=currentRecommendationMovies.length;
    activateImageFallbacks();
}

function displayMovieRecommendations(recommendations) {
    const container=document.getElementById("movieRecommendations"); if(!container)return;
    currentRecommendationMovies=recommendations&&Array.isArray(recommendations.results)?recommendations.results:[]; visibleRecommendationCount=Math.min(6,currentRecommendationMovies.length);
    if(!recommendations){container.innerHTML=`<p class="movie-details__eyebrow">Descubre más</p><h3>También te puede interesar</h3><p class="movies__message">No pudimos cargar las recomendaciones.</p>`;return;}
    if(!currentRecommendationMovies.length){container.innerHTML=`<p class="movie-details__eyebrow">Descubre más</p><h3>También te puede interesar</h3><p class="movies__message">No hay recomendaciones disponibles para esta película.</p>`;return;}
    container.innerHTML=`<p class="movie-details__eyebrow">Descubre más</p><h3>También te puede interesar</h3><div class="recommendations-grid-shared"></div><button class="recommendations-more" id="showMoreRecommendations" type="button">Ver más recomendaciones</button>`;
    appendRecommendationCards();
}
// Si response.ok es false, la peticion HTTP fallo aunque fetch haya terminado.
// Por eso se lanza un Error y catch muestra un estado controlado.
async function loadMovieRecommendations(movieId) {
    const url = `https://api.themoviedb.org/3/movie/${movieId}/recommendations?api_key=${API_KEY}&language=es-ES`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Error de TMDB: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("No se pudieron cargar las recomendaciones:", error);
        return null;
    }
}

// Intl.NumberFormat es una API nativa del navegador para formatos locales.
function formatShowtimePrice(price) {
    const formattedPrice = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0
    }).format(price);

    return `${formattedPrice} COP`;
}

// Convierte una fecha YYYY-MM-DD en texto legible en espanol.
function formatShowtimeDate(date) {
    const dateParts = date.split("-");
    const year = Number(dateParts[0]);
    const month = Number(dateParts[1]);
    const day = Number(dateParts[2]);
    const localDate = new Date(year, month - 1, day);

    return new Intl.DateTimeFormat("es-CO", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(localDate);
}

// API LOCAL: JSON Server
// functions contiene horarios; rooms, seats y functionSeats modelan la sala y su disponibilidad.
function displayMovieFunctions(functionData) {
    const functionsContainer = document.getElementById("movieShowtimes");
    if (!functionsContainer) return;
    if (!functionData) {
        functionsContainer.innerHTML = `<p class="movie-details__eyebrow">En nuestros cines</p><h3>Funciones disponibles</h3><p class="movies__message">No pudimos consultar las funciones del cine.</p>`;
        return;
    }
    const movieFunctions = functionData.functions;
    const rooms = functionData.rooms;
    if (movieFunctions.length === 0) {
        functionsContainer.innerHTML = `<p class="movie-details__eyebrow">En nuestros cines</p><h3>Funciones disponibles</h3><p class="movies__message">No hay funciones disponibles en THE MOI CINEMAS para esta película.</p>`;
        return;
    }
    functionsContainer.innerHTML = `<p class="movie-details__eyebrow">Elige tu horario</p><h3>Funciones disponibles</h3><div class="showtimes-grid"></div>`;
    const functionsGrid = functionsContainer.querySelector(".showtimes-grid");
    movieFunctions.forEach(function (movieFunction) {
        const room = rooms.find(function (item) { return String(item.id) === String(movieFunction.roomId); });
        const availableCount = movieFunction.availableCount;
        const availabilityText = availableCount === 0 ? "Agotada" : `${availableCount} ${availableCount === 1 ? "asiento disponible" : "asientos disponibles"}`;
        const functionCard = document.createElement("article");
        functionCard.classList.add("showtime-card");
        if(availableCount>0&&availableCount<=10)functionCard.classList.add("showtime-card--low");
        if(availableCount===0)functionCard.classList.add("showtime-card--sold-out");
        functionCard.innerHTML = `<div class="showtime-card__schedule"><p class="showtime-card__date">${formatShowtimeDate(movieFunction.date)}</p><p class="showtime-card__time">${movieFunction.time}</p></div><p class="showtime-card__room">${room ? room.name : "Sala no disponible"} · ${room ? room.type : "Tipo no disponible"}</p><p class="showtime-card__availability${availableCount === 0 ? " showtime-card__availability--sold-out" : ""}">${availabilityText}</p><div class="showtime-card__footer"><p class="showtime-card__price">${formatShowtimePrice(movieFunction.price)}</p><button class="showtime-card__button" type="button" data-function-id="${movieFunction.id}"${availableCount === 0 ? " disabled" : ""}>Elegir función</button></div>`;
        functionsGrid.appendChild(functionCard);
    });
}

async function loadMovieFunctions(tmdbId) {
    try {
        const [functionsResponse, roomsResponse] = await Promise.all([
            fetch(`${LOCAL_API_URL}/functions?tmdbId=${tmdbId}`),
            fetch(`${LOCAL_API_URL}/rooms`)
        ]);
        if (!functionsResponse.ok || !roomsResponse.ok) throw new Error("No se pudieron consultar las funciones locales");
        const movieFunctions = await functionsResponse.json();
        const rooms = await roomsResponse.json();
        const functionsWithAvailability = await Promise.all(movieFunctions.map(async function (movieFunction) {
            const response = await fetch(`${LOCAL_API_URL}/functionSeats?functionId=${movieFunction.id}`);
            if (!response.ok) throw new Error("No se pudo consultar la disponibilidad de una función");
            const functionSeats = await response.json();
            return Object.assign({}, movieFunction, { availableCount: functionSeats.filter(function (item) { return item.status === "available"; }).length });
        }));
        return { functions: functionsWithAvailability, rooms: rooms };
    } catch (error) {
        console.error("No se pudieron consultar las funciones:", error);
        return null;
    }
}

function getValidTicketQuantity() {
    return Number.isInteger(desiredTicketQuantity) && desiredTicketQuantity >= 1
        ? desiredTicketQuantity : null;
}

function formatSelectedSeat(seat) {
    return `Silla: ${seat.seatCode} · Fila: ${seat.row} · Número: ${seat.number} · Ubicación: ${seat.location}`;
}

function bookingStepsMarkup(activeStep) {
    return `<ol class="booking-steps" aria-label="Progreso de la reserva"><li class="${activeStep >= 1 ? "is-complete" : ""}"><span>1</span>Entradas</li><li class="${activeStep >= 2 ? "is-complete" : ""}"><span>2</span>Asientos</li><li class="${activeStep >= 3 ? "is-complete" : ""}"><span>3</span>Confirmar</li></ol>`;
}

function updateSeatSelectionSummary(movieFunction, message) {
    const quantity = getValidTicketQuantity();
    const selectedSeatsText = document.getElementById("selectedSeatsText");
    const ticketCount = document.getElementById("ticketCount");
    const selectionTotal = document.getElementById("selectionTotal");
    const continueButton = document.getElementById("continueWithSeats");
    const selectionMessage = document.getElementById("ticketSelectionMessage");
    selectedSeatsText.replaceChildren();
    if (selectedSeats.length) {
        selectedSeats.forEach(function (seat) {
            const item = document.createElement("article"); item.className = "selected-seat-card";
            const code = document.createElement("strong"); code.textContent = seat.seatCode;
            const detail = document.createElement("span"); detail.textContent = `Fila ${seat.row} · Número ${seat.number}`;
            const location = document.createElement("span"); location.textContent = seat.location;
            item.append(code, detail, location); selectedSeatsText.appendChild(item);
        });
    } else selectedSeatsText.textContent = "Ningún asiento seleccionado";
    ticketCount.textContent = quantity || 0;
    selectionTotal.textContent = formatShowtimePrice((quantity || 0) * movieFunction.price);
    let feedback = message || "";
    if (!feedback && !quantity) feedback = "La cantidad debe ser un número entero mayor o igual a 1.";
    if (!feedback && selectedSeats.length !== quantity) feedback = selectedSeats.length
        ? `Has seleccionado ${selectedSeats.length} de ${quantity} asientos.`
        : `Selecciona ${quantity} ${quantity === 1 ? "asiento" : "asientos"} para continuar.`;
    selectionMessage.textContent = feedback;
    continueButton.disabled = !quantity || selectedSeats.length !== quantity;
}
function toggleSeat(seat, movieFunction, seatButton) {
    const selectedIndex = selectedSeats.findIndex(function (item) { return String(item.seatId) === String(seat.id); });
    if (selectedIndex >= 0) {
        selectedSeats = selectedSeats.filter(function (item) { return String(item.seatId) !== String(seat.id); });
        seatButton.classList.remove("seat--selected");
        seatButton.setAttribute("aria-label", `Asiento ${seat.seatCode}, fila ${seat.row}, número ${seat.number}, ubicación ${seat.location}, disponible`);
        seatButton.setAttribute("aria-pressed", "false");
        updateSeatSelectionSummary(movieFunction);
        return;
    }
    const quantity = getValidTicketQuantity();
    if (!quantity || selectedSeats.length >= quantity) {
        updateSeatSelectionSummary(movieFunction, quantity
            ? `Ya seleccionaste ${quantity} ${quantity === 1 ? "silla" : "sillas"}. Deselecciona una para cambiarla.`
            : "Indica primero una cantidad válida de tickets.");
        return;
    }
    selectedSeats.push({ seatId: seat.id, seatCode: seat.seatCode, row: seat.row, number: seat.number, location: seat.location });
    seatButton.classList.add("seat--selected");
    seatButton.setAttribute("aria-label", `Asiento ${seat.seatCode}, fila ${seat.row}, número ${seat.number}, ubicación ${seat.location}, seleccionado`);
    seatButton.setAttribute("aria-pressed", "true");
    updateSeatSelectionSummary(movieFunction);
}

function displaySeatSelection(movieFunction, room, seats, functionSeats, preserveSelection) {
    if (!preserveSelection) selectedSeats = [];
    const availabilityBySeatId = new Map(functionSeats.map(function (item) { return [String(item.seatId), item.status]; }));
    selectedSeats = selectedSeats.filter(function (seat) { return availabilityBySeatId.get(String(seat.seatId)) === "available"; });
    const movieTitle = currentDetailsMovie && String(currentDetailsMovie.id) === String(movieFunction.tmdbId) ? currentDetailsMovie.title : "Película seleccionada";
    moviesContainer.innerHTML = `<section class="seat-selection" aria-labelledby="seatSelectionTitle"><button class="details-back-button" id="backToShowtimes" type="button">← Volver a funciones</button><div class="seat-selection__header"><p class="movie-details__eyebrow">Película</p><h2 id="seatSelectionTitle">${movieTitle}</h2><div class="seat-selection__facts"><span>${room.name} · ${room.type}</span><span>${formatShowtimeDate(movieFunction.date)} · ${movieFunction.time}</span><strong>${formatShowtimePrice(movieFunction.price)} por entrada</strong></div>${bookingStepsMarkup(2)}</div><div class="seat-booking-layout"><div class="seat-selection__main"><div class="ticket-quantity"><label for="ticketQuantity">Cantidad de entradas</label><input id="ticketQuantity" type="number" min="1" step="1" inputmode="numeric" required value="${getValidTicketQuantity() || ""}"><p>Selecciona la misma cantidad de asientos.</p></div><div class="seat-map-scroll" tabindex="0" aria-label="Mapa de asientos; desplázate horizontalmente si es necesario"><div class="seat-map"><div class="cinema-screen" aria-label="Pantalla del cine">PANTALLA</div><p class="seat-map__title">ASIENTOS</p><div class="seat-rows" id="seatRows"></div></div></div><div class="seat-legend" aria-label="Leyenda de estados de asientos"><span><i class="seat-legend__sample"></i> Disponible</span><span><i class="seat-legend__sample seat--selected"></i> Seleccionado</span><span><i class="seat-legend__sample seat--reserved"></i> Reservado</span><span><i class="seat-legend__sample seat--sold"></i> Vendido</span></div></div><aside class="seat-selection__summary" aria-live="polite"><p class="movie-details__eyebrow">Tu selección</p><h3>Asientos seleccionados</h3><div id="selectedSeatsText" class="selected-seats-list">Ningún asiento seleccionado</div><p class="ticket-selection-message" id="ticketSelectionMessage" role="status"></p><div class="seat-selection__totals"><span>Entradas <strong id="ticketCount">0</strong></span><span>Precio unitario <strong>${formatShowtimePrice(movieFunction.price)}</strong></span><span>Total <strong id="selectionTotal">${formatShowtimePrice(0)}</strong></span></div><button id="continueWithSeats" type="button" disabled>Continuar</button></aside></div></section>`;
    const seatRows = document.getElementById("seatRows"); seatRows.style.setProperty("--seat-count", room.seatsPerRow);
    const seatsByRow = new Map(); seats.forEach(function (seat) { if (!seatsByRow.has(seat.row)) seatsByRow.set(seat.row, []); seatsByRow.get(seat.row).push(seat); });
    seatsByRow.forEach(function (rowSeats, row) {
        const seatRow = document.createElement("div"); seatRow.className = "seat-row"; seatRow.innerHTML = `<span class="seat-row__label">${row}</span>`;
        rowSeats.sort(function (a,b) { return a.number-b.number; }).forEach(function (seat) {
            const status = availabilityBySeatId.get(String(seat.id)) || "sold";
            const isSelected = selectedSeats.some(function (item) { return String(item.seatId) === String(seat.id); });
            const button = document.createElement("button"); button.type="button"; button.className=`seat${isSelected?" seat--selected":""}${status==="reserved"?" seat--reserved":""}${status==="sold"?" seat--sold":""}`; button.textContent=seat.number; button.dataset.seatId=seat.id; button.disabled=status!=="available";
            const state=isSelected?"seleccionado":(status==="sold"?"vendido":(status==="reserved"?"reservado":"disponible")); const description=`Asiento ${seat.seatCode}, fila ${seat.row}, número ${seat.number}, ubicación ${seat.location}, ${state}`; button.setAttribute("aria-label",description); button.title=description; button.setAttribute("aria-pressed",String(isSelected));
            if(status==="available") button.addEventListener("click",function(){toggleSeat(seat,movieFunction,button);}); seatRow.appendChild(button);
        }); seatRows.appendChild(seatRow);
    }); updateSeatSelectionSummary(movieFunction);
}
async function loadSeatSelection(functionId) {
    clearTemporaryReservationState();currentSeatSelectionFunctionId=String(functionId);showDetailsMessage("Cargando selección de asientos...");
    try { const functionResponse=await fetch(`${LOCAL_API_URL}/functions/${functionId}`);if(!functionResponse.ok)throw new Error("No se pudo consultar la función");const movieFunction=await functionResponse.json();
        const [roomResponse,seatsResponse,functionSeatsResponse]=await Promise.all([fetch(`${LOCAL_API_URL}/rooms/${movieFunction.roomId}`),fetch(`${LOCAL_API_URL}/seats?roomId=${movieFunction.roomId}`),fetch(`${LOCAL_API_URL}/functionSeats?functionId=${movieFunction.id}`)]);if(!roomResponse.ok||!seatsResponse.ok||!functionSeatsResponse.ok)throw new Error("No se pudieron consultar los asientos");if(currentSeatSelectionFunctionId!==String(functionId))return;
        currentSelectedFunction=movieFunction;currentSelectedRoom=await roomResponse.json();currentRoomSeats=await seatsResponse.json();currentFunctionSeats=await functionSeatsResponse.json();displaySeatSelection(movieFunction,currentSelectedRoom,currentRoomSeats,currentFunctionSeats,false);
    } catch(error){console.error("No se pudo cargar la selección de asientos:",error);if(currentSeatSelectionFunctionId===String(functionId))showDetailsMessage("No pudimos cargar la selección de asientos.");}
}

async function revalidateSelectedSeats() {
    if(!currentSelectedFunction||selectedSeats.length===0)return {available:false,conflicts:selectedSeats};
    const response=await fetch(`${LOCAL_API_URL}/functionSeats?functionId=${currentSelectedFunction.id}`);if(!response.ok)throw new Error("No se pudo revalidar la disponibilidad");currentFunctionSeats=await response.json();
    const conflicts=selectedSeats.filter(function(seat){const relation=currentFunctionSeats.find(function(item){return String(item.seatId)===String(seat.seatId);});return !relation||relation.status!=="available";});return {available:conflicts.length===0,conflicts};
}

async function continueToCustomerData() {
    if(!getValidTicketQuantity()||selectedSeats.length!==desiredTicketQuantity){updateSeatSelectionSummary(currentSelectedFunction);return;}
    const result=await revalidateSelectedSeats();if(!result.available){displaySeatSelection(currentSelectedFunction,currentSelectedRoom,currentRoomSeats,currentFunctionSeats,true);updateSeatSelectionSummary(currentSelectedFunction,`Ya no están disponibles: ${result.conflicts.map(function(seat){return seat.seatCode;}).join(", ")}`);return;}displayCustomerForm();
}

function displayCustomerForm(message) {
    const movieTitle=currentDetailsMovie?currentDetailsMovie.title:"Película seleccionada";moviesContainer.innerHTML=`<section class="reservation-view customer-data-view" aria-labelledby="customerDataTitle">${bookingStepsMarkup(3)}<p class="movie-details__eyebrow">Reserva o compra</p><h2 id="customerDataTitle">Datos del cliente</h2><p>${movieTitle} · ${desiredTicketQuantity} ${desiredTicketQuantity===1?"entrada":"entradas"}</p>${message?`<p class="reservation-status" role="alert">${message}</p>`:""}<form class="customer-form" id="customerForm" novalidate><label for="customerName">Nombre</label><input id="customerName" name="userName" type="text" autocomplete="name" required><label for="customerEmail">Correo electrónico</label><input id="customerEmail" name="email" type="email" autocomplete="email" required><p class="customer-form__help">No solicitamos datos bancarios. La compra es una simulación académica.</p><div class="customer-operation-options"><div><button class="secondary-action" type="button" data-operation="reservation">Reservar</button><p>Los asientos quedarán reservados.</p></div><div><button class="primary-action" type="button" data-operation="purchase">Comprar</button><p>Simula la compra y marca los asientos como vendidos.</p></div></div><button class="text-action" id="backToSeats" type="button">← Volver a asientos</button></form></section>`;
    if(currentCustomerData){document.getElementById("customerName").value=currentCustomerData.userName;document.getElementById("customerEmail").value=currentCustomerData.email;}
}
function isValidEmail(email){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);}
function handleCustomerOperation(operation){const form=document.getElementById("customerForm");const userName=form.elements.userName.value.trim();const email=form.elements.email.value.trim();if(!userName)return displayCustomerForm("El nombre es obligatorio.");if(!email)return displayCustomerForm("El correo electrónico es obligatorio.");if(!form.elements.email.checkValidity()||!isValidEmail(email))return displayCustomerForm("Escribe un correo electrónico válido.");currentCustomerData={userName,email};currentOperationType=operation;displayOperationSummary();}
function handleCustomerFormSubmit(event){event.preventDefault();displayCustomerForm("Elige explícitamente Reservar tickets o Comprar tickets.");}

function displayOperationSummary(message){if(!currentCustomerData||!["reservation","purchase"].includes(currentOperationType))return displayCustomerForm("Elige si deseas reservar o comprar.");const isPurchase=currentOperationType==="purchase";const movieFunction=currentSelectedFunction;const room=currentSelectedRoom;const title=isPurchase?"Resumen de la compra":"Resumen de la reserva";moviesContainer.innerHTML=`<section class="reservation-view" aria-labelledby="operationSummaryTitle">${bookingStepsMarkup(3)}<p class="movie-details__eyebrow">${isPurchase?"Compra simulada":"Reserva"}</p><h2 id="operationSummaryTitle">${title}</h2>${message?`<p class="reservation-status" role="alert">${message}</p>`:""}<dl class="reservation-details"><div><dt>Película</dt><dd>${currentDetailsMovie?currentDetailsMovie.title:"Película seleccionada"}</dd></div><div><dt>Función</dt><dd>${formatShowtimeDate(movieFunction.date)} · ${movieFunction.time}</dd></div><div><dt>Sala</dt><dd>${room.name} · ${room.type}</dd></div><div><dt>Asientos</dt><dd>${selectedSeats.map(function(seat){return seat.seatCode;}).join(", ")}</dd></div><div class="reservation-details__wide"><dt>Detalle</dt><dd class="selected-seats-details">${selectedSeats.map(function(seat){return `${seat.seatCode} — Fila ${seat.row} — Número ${seat.number} — ${seat.location}`;}).join("\n")}</dd></div><div><dt>Entradas</dt><dd>${desiredTicketQuantity}</dd></div><div><dt>Precio unitario</dt><dd>${formatShowtimePrice(movieFunction.price)}</dd></div><div><dt>Total</dt><dd>${formatShowtimePrice(desiredTicketQuantity*movieFunction.price)}</dd></div><div><dt>Nombre</dt><dd id="operationCustomerName"></dd></div><div><dt>Correo</dt><dd id="operationCustomerEmail"></dd></div></dl><div class="reservation-actions"><button class="secondary-action" id="backToCustomerData" type="button">Editar datos</button><button class="primary-action" id="confirmOperation" type="button">${isPurchase?"Confirmar compra":"Confirmar reserva"}</button></div></section>`;document.getElementById("operationCustomerName").textContent=currentCustomerData.userName;document.getElementById("operationCustomerEmail").textContent=currentCustomerData.email;}

function displayOperationConfirmation(operation){const isPurchase=currentOperationType==="purchase";const movieFunction=currentSelectedFunction;const title=isPurchase?"Compra confirmada":"Reserva confirmada";moviesContainer.innerHTML=`<section class="reservation-view reservation-confirmation digital-ticket" aria-labelledby="confirmationTitle"><p class="reservation-success">✓ ${title}</p><h2 id="confirmationTitle">${isPurchase?"Compra":"Reserva"} #${operation.id}</h2><dl class="reservation-details"><div><dt>Película</dt><dd>${currentDetailsMovie?currentDetailsMovie.title:"Película seleccionada"}</dd></div><div><dt>Función</dt><dd>${formatShowtimeDate(movieFunction.date)} · ${movieFunction.time}</dd></div><div><dt>Sala</dt><dd>${currentSelectedRoom.name} · ${currentSelectedRoom.type}</dd></div><div><dt>Asientos</dt><dd>${operation.seats.map(function(seat){return seat.seatCode;}).join(", ")}</dd></div><div><dt>Cantidad</dt><dd>${operation.quantity}</dd></div><div><dt>Total</dt><dd>${formatShowtimePrice(operation.total)}</dd></div><div><dt>Nombre</dt><dd id="confirmationCustomerName"></dd></div><div><dt>Correo</dt><dd id="confirmationCustomerEmail"></dd></div></dl><div class="reservation-actions"><button class="secondary-action" id="backToMovies" type="button">Volver a cartelera</button><button class="primary-action" id="viewConfirmedOperations" data-confirmation-type="${isPurchase?"purchase":"reservation"}" type="button">${isPurchase?"Ver mis compras":"Ver mis reservas"}</button></div></section>`;document.getElementById("confirmationCustomerName").textContent=operation.userName;document.getElementById("confirmationCustomerEmail").textContent=operation.email;}
async function confirmTicketOperation(){if(operationConfirmationInProgress)return;if(operationRecordCreated)return displayOperationSummary("La operación ya fue registrada; no se enviará nuevamente.");if(!currentSelectedFunction||!currentCustomerData||selectedSeats.length!==desiredTicketQuantity)return displayOperationSummary("La operación no está completa.");operationConfirmationInProgress=true;const button=document.getElementById("confirmOperation");if(button){button.disabled=true;button.textContent="Procesando...";}let created=false;try{const validation=await revalidateSelectedSeats();if(!validation.available){displayOperationSummary(`No están disponibles: ${validation.conflicts.map(function(seat){return seat.seatCode;}).join(", ")}. No se creó la operación.`);return;}const isPurchase=currentOperationType==="purchase";const endpoint=isPurchase?"purchases":"reservations";const targetStatus=isPurchase?"sold":"reserved";const operationData={userName:currentCustomerData.userName,email:currentCustomerData.email,tmdbId:currentSelectedFunction.tmdbId,functionId:currentSelectedFunction.id,roomId:currentSelectedFunction.roomId,quantity:desiredTicketQuantity,seats:selectedSeats.map(function(seat){return {seatId:seat.seatId,seatCode:seat.seatCode,location:seat.location};}),unitPrice:currentSelectedFunction.price,total:desiredTicketQuantity*currentSelectedFunction.price,status:"confirmed",createdAt:new Date().toISOString()};const response=await fetch(`${LOCAL_API_URL}/${endpoint}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(operationData)});if(!response.ok)return displayOperationSummary(`No pudimos registrar la ${isPurchase?"compra":"reserva"}.`);const operation=await response.json();created=true;operationRecordCreated=true;const selectedRelations=currentFunctionSeats.filter(function(item){return selectedSeats.some(function(seat){return String(seat.seatId)===String(item.seatId);});});const updates=await Promise.all(selectedRelations.map(function(relation){return fetch(`${LOCAL_API_URL}/functionSeats/${relation.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:targetStatus})});}));if(updates.some(function(response){return !response.ok;}))return displayOperationSummary(`La ${isPurchase?"compra":"reserva"} fue registrada, pero no se actualizaron todas las sillas.`);displayOperationConfirmation(operation);clearTemporaryReservationState();}catch(error){console.error("No se pudo confirmar la operación:",error);displayOperationSummary(created?"La operación fue registrada, pero ocurrió un problema al actualizar los asientos.":"No pudimos registrar la operación.");}finally{operationConfirmationInProgress=false;}}

// Reinicia las variables temporales del proceso de reserva.
function clearTemporaryReservationState() {
    selectedSeats = [];
    currentSelectedFunction = null;
    currentSelectedRoom = null;
    currentRoomSeats = [];
    currentFunctionSeats = [];
    operationConfirmationInProgress = false;
    desiredTicketQuantity = 1;
    currentCustomerData = null;
    currentOperationType = null;
    operationRecordCreated = false;
    currentSeatSelectionFunctionId = null;
}
// Muestra un mensaje dentro de la vista de detalles.
function showDetailsMessage(message) {
    moviesContainer.innerHTML = `
        <div class="section-heading">
            <p class="section-heading__number">01</p>
            <h2>Detalles de pel\u00edcula</h2>
            <button class="back-button" id="backToPreviousList" type="button">Volver</button>
        </div>
        <p class="movies__message">${message}</p>
    `;
}

// Esta funcion coordina varias peticiones asincronas relacionadas con una pelicula.
// currentDetailsMovieId evita que una respuesta vieja sobrescriba una pantalla
// nueva si el usuario hace varios clics rapidamente.
async function loadMovieDetails(movieId) {
    currentListRequestId += 1;
    clearTemporaryReservationState();
    const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&language=es-ES`;

    currentDetailsMovieId = String(movieId);
    showDetailsMessage("Cargando detalles...");

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Error de TMDB: ${response.status}`);
        }

        const movie = await response.json();

        if (currentDetailsMovieId !== String(movieId)) {
            return;
        }

        displayMovieDetails(movie);
        loadMovieRatings(movieId);
        const detailTasks = [
            loadMovieFunctions(movieId).then(function(data){if(currentDetailsMovieId===String(movieId))displayMovieFunctions(data);}),
            loadMovieVideos(movieId).then(function(data){if(currentDetailsMovieId===String(movieId))displayMovieTrailer(data);}),
            loadMovieCredits(movieId).then(function(data){if(currentDetailsMovieId===String(movieId))displayMovieCredits(data);}),
            loadMovieRecommendations(movieId).then(function(data){if(currentDetailsMovieId===String(movieId))displayMovieRecommendations(data);})
        ];
        await Promise.all(detailTasks);
    } catch (error) {
        console.error("No se pudieron cargar los detalles:", error);
        if (currentDetailsMovieId !== String(movieId)) return;
        showDetailsMessage(
            "No pudimos cargar los detalles de esta pel\u00edcula. Int\u00e9ntalo nuevamente."
        );
    }
}

// Las fechas de la API se convierten de texto ISO a una fecha legible local.
function formatReservationCreatedAt(createdAt) {
    const reservationDate = new Date(createdAt);

    if (Number.isNaN(reservationDate.getTime())) {
        return "Fecha de reserva no disponible";
    }

    return new Intl.DateTimeFormat("es-CO", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    }).format(reservationDate);
}

// Las operaciones guardan tmdbId y relacionan functions, rooms y TMDB.
async function loadOperationMovies(operations) {
    const ids=[...new Set(operations.map(function(operation){return String(operation.tmdbId);} ))];const moviesById={};
    for(const id of ids){try{const response=await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&language=es-ES`);if(!response.ok)throw new Error(`Error de TMDB: ${response.status}`);moviesById[id]=await response.json();}catch(error){console.error(`No se pudo cargar la película ${id}:`,error);moviesById[id]=null;}}
    return moviesById;
}

function displayOperations(operations,movieFunctions,rooms,moviesById,type){const isPurchase=type==="purchase";const title=isPurchase?"Mis compras":"Mis reservas";if(operations.length===0){moviesContainer.innerHTML=`${createSectionHeading(title,false)}<div class="reservations-empty"><p>Todavía no hay ${isPurchase?"compras":"reservas"} registradas.</p><button class="primary-action" id="viewMoviesFromReservations" type="button">Ver cartelera</button></div>`;return;}const ordered=operations.slice().sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);});moviesContainer.innerHTML=`${createSectionHeading(title,false)}<div class="reservations-grid" id="reservationsGrid"></div>`;const grid=document.getElementById("reservationsGrid");ordered.forEach(function(operation){const movieFunction=movieFunctions.find(function(item){return String(item.id)===String(operation.functionId);});const room=rooms.find(function(item){return String(item.id)===String(operation.roomId);});const movie=moviesById[String(operation.tmdbId)];const movieTitle=movie?movie.title:"Película no disponible";const poster=createImage(movie?movie.poster_path:null,"reservation-card__poster",`Póster de ${movieTitle}`,"Póster no disponible");const functionInformation=movieFunction?`${formatShowtimeDate(movieFunction.date)} · ${movieFunction.time}`:"Información de función no disponible";const roomInformation=room?`${room.name} · ${room.type}`:"Sala no disponible";const seats=Array.isArray(operation.seats)?operation.seats:[];const card=document.createElement("article");card.className="reservation-card";card.innerHTML=`${poster}<div class="reservation-card__information"><p class="movie-details__eyebrow">${isPurchase?"Compra":"Reserva"} #${operation.id}</p><h3>${movieTitle}</h3><p>${functionInformation}</p><p>${roomInformation}</p><p class="reservation-card__customer"><strong>Cliente:</strong> <span></span></p><p><strong>Asientos:</strong> ${seats.length?seats.map(function(seat){return `${seat.seatCode} — ${seat.location}`;}).join(", "):"No disponibles"}</p><p>${operation.quantity} ${operation.quantity===1?"entrada":"entradas"}</p><p>${formatShowtimePrice(operation.unitPrice)} por entrada</p><p class="reservation-card__total">Total: ${formatShowtimePrice(operation.total)}</p><p class="reservation-card__created">${isPurchase?"Comprada":"Reservada"}: ${formatReservationCreatedAt(operation.createdAt)}</p></div>`;card.querySelector(".reservation-card__customer span").textContent=operation.userName;grid.appendChild(card);});activateImageFallbacks();}

async function loadOperations(type){const requestId=++currentListRequestId;clearTemporaryReservationState();currentDetailsMovieId=null;const isPurchase=type==="purchase";const endpoint=isPurchase?"purchases":"reservations";const title=isPurchase?"Mis compras":"Mis reservas";showMessage(`Cargando ${isPurchase?"compras":"reservas"}...`,title,false);try{const [operationsResponse,functionsResponse,roomsResponse]=await Promise.all([fetch(`${LOCAL_API_URL}/${endpoint}`),fetch(`${LOCAL_API_URL}/functions`),fetch(`${LOCAL_API_URL}/rooms`)]);if(!operationsResponse.ok||!functionsResponse.ok||!roomsResponse.ok)throw new Error("No se pudieron consultar las operaciones");const operations=await operationsResponse.json();const movieFunctions=await functionsResponse.json();const rooms=await roomsResponse.json();if(requestId!==currentListRequestId)return;const moviesById=operations.length?await loadOperationMovies(operations):{};if(requestId!==currentListRequestId)return;displayOperations(operations,movieFunctions,rooms,moviesById,type);}catch(error){console.error(`No se pudieron cargar las ${isPurchase?"compras":"reservas"}:`,error);if(requestId!==currentListRequestId)return;showMessage(`No pudimos cargar tus ${isPurchase?"compras":"reservas"}.`,title,false);}}
function loadReservations(){return loadOperations("reservation");}
function loadPurchases(){return loadOperations("purchase");}
function fetchTmdbMovieList(cacheKey, endpoint) {
    if (tmdbListCache.has(cacheKey)) return tmdbListCache.get(cacheKey);
    const request = fetch(`https://api.themoviedb.org/3${endpoint}${endpoint.includes("?") ? "&" : "?"}api_key=${API_KEY}&language=es-ES&region=CO`).then(function(response){ if(!response.ok) throw new Error(`Error de TMDB: ${response.status}`); return response.json(); }).then(function(data){ return data.results || []; }).catch(function(error){ tmdbListCache.delete(cacheKey); throw error; });
    tmdbListCache.set(cacheKey, request);
    return request;
}

function fetchTmdbMovieDetails(tmdbId) {
    const cacheKey = String(tmdbId);
    if (tmdbMovieCache.has(cacheKey)) return tmdbMovieCache.get(cacheKey);
    const request = fetch(`https://api.themoviedb.org/3/movie/${encodeURIComponent(tmdbId)}?api_key=${API_KEY}&language=es-ES`)
        .then(function (response) {
            if (!response.ok) throw new Error(`Error de TMDB: ${response.status}`);
            return response.json();
        })
        .catch(function (error) {
            tmdbMovieCache.delete(cacheKey);
            throw error;
        });
    tmdbMovieCache.set(cacheKey, request);
    return request;
}
function createDiscoverySection(id, title, actionLabel, action) {
    const endLabel=actionLabel||"Ver más";
    return `<section class="discovery-row" aria-labelledby="${id}Title"><div class="discovery-row__heading"><h2 id="${id}Title">${title}</h2></div><div class="discovery-carousel"><button class="carousel-control carousel-control--previous" type="button" data-carousel-target="${id}Viewport" data-carousel-direction="-1" aria-label="Ver cinco películas anteriores" hidden>‹</button><div class="discovery-row__viewport" id="${id}Viewport" data-end-label="${endLabel}" data-end-action="${action}"><div class="discovery-track" id="${id}Track"><p class="discovery-row__status">Cargando películas...</p></div></div><button class="carousel-control carousel-control--next" type="button" data-carousel-target="${id}Viewport" data-carousel-direction="1" aria-label="Ver cinco películas siguientes">›</button></div></section>`;
}

function updateCarouselControls(viewport) {
    const carousel=viewport.closest(".discovery-carousel"); if(!carousel)return;
    const previous=carousel.querySelector(".carousel-control--previous");
    const next=carousel.querySelector(".carousel-control--next");
    const atStart=viewport.scrollLeft<=2;
    const atEnd=viewport.scrollLeft+viewport.clientWidth>=viewport.scrollWidth-2;
    previous.hidden=atStart; next.hidden=atEnd;
}

function setupCarousel(viewport) {
    if(!viewport||viewport.dataset.carouselReady==="true")return;
    viewport.dataset.carouselReady="true";
    viewport.addEventListener("scroll",function(){updateCarouselControls(viewport);},{passive:true});
    requestAnimationFrame(function(){updateCarouselControls(viewport);});
}

function renderDiscoveryRow(id, movies, returnView, errorMessage) {
    const track=document.getElementById(`${id}Track`); if(!track)return; track.replaceChildren();
    const viewport=track.closest(".discovery-row__viewport");
    if(errorMessage||!movies.length){const status=document.createElement("p");status.className="discovery-row__status";status.textContent=errorMessage||"No hay películas disponibles.";track.appendChild(status);setupCarousel(viewport);return;}
    movies.slice(0,14).forEach(function(movie){track.appendChild(createMovieCard(movie,returnView));});
    const endAction=document.createElement("button");endAction.type="button";endAction.className="carousel-end-action";endAction.dataset.homeAction=viewport.dataset.endAction;endAction.textContent=viewport.dataset.endLabel||"Ver más";track.appendChild(endAction);
    activateImageFallbacks(); setupCarousel(viewport);
}
async function loadHomeRow(id, cacheKey, endpoint, requestId) { try { let movies=await fetchTmdbMovieList(cacheKey,endpoint); if(cacheKey==="popular")movies=movies.slice().sort(function(a,b){return Number(b.popularity||0)-Number(a.popularity||0);});if(cacheKey==="top-rated")movies=movies.filter(function(movie){return Number(movie.vote_count||0)>=50;}).sort(function(a,b){return Number(b.vote_average||0)-Number(a.vote_average||0);});if(requestId!==currentListRequestId)return; renderDiscoveryRow(id,movies,"home"); } catch(error){ console.error(`No se pudo cargar ${id}:`,error); if(requestId===currentListRequestId)renderDiscoveryRow(id,[],"home","No pudimos cargar esta fila."); } }

async function loadHomeGenreRows(requestId) {
    await loadMovieGenres(); if(requestId!==currentListRequestId)return;
    const entries=Object.entries(genreMap); const preferred=["Acción","Comedia","Terror"].map(function(name){return entries.find(function(entry){return entry[1]===name;});}).filter(Boolean);
    const selected=preferred.concat(entries.filter(function(entry){return !preferred.some(function(item){return item[0]===entry[0];});})).slice(0,3);
    const area=document.getElementById("homeGenreRows"); if(!area)return;
    area.innerHTML=selected.map(function(entry,index){return createDiscoverySection(`homeGenre${index}`,entry[1],"Ver más",`genre:${entry[0]}`);}).join("");
    selected.forEach(function(entry,index){ loadHomeRow(`homeGenre${index}`,`genre-${entry[0]}`,`/discover/movie?with_genres=${entry[0]}&sort_by=popularity.desc`,requestId); });
}

async function loadHome() {
    const requestId=++currentListRequestId; clearTemporaryReservationState(); currentDetailsMovieId=null; currentMovieReturnView="home";
    moviesContainer.innerHTML=`<div class="discovery-home">${createDiscoverySection("homeNow","Ahora en cartelera","Ver cartelera","now-playing")}${createDiscoverySection("homeUpcoming","Estrenos / Más nuevas","Ver próximos estrenos","upcoming")}${createDiscoverySection("homePopular","Más populares","Ver más populares","popular")}${createDiscoverySection("homeRated","Mejor valoradas","Ver más","top-rated")}${createDiscoverySection("homeFeatured","Destacadas","Ver más","featured")}<div id="homeGenreRows"></div><button class="categories-more" id="viewMoreCategories" type="button">Ver más categorías</button></div>`;
    const now=loadHomeRow("homeNow","now-playing","/movie/now_playing?",requestId);
    const upcoming=loadHomeRow("homeUpcoming","upcoming","/movie/upcoming?",requestId);
    const popular=loadHomeRow("homePopular","popular","/movie/popular?",requestId);
    const rated=loadHomeRow("homeRated","top-rated","/movie/top_rated?",requestId);
    Promise.all([fetchTmdbMovieList("popular","/movie/popular?"),fetchTmdbMovieList("top-rated","/movie/top_rated?")]).then(function(groups){if(requestId!==currentListRequestId)return;const unique=new Map();groups.flat().forEach(function(movie){unique.set(movie.id,movie);});// Destacadas combina exclusivamente popularity y vote_average reales de TMDB.
        const featured=Array.from(unique.values()).sort(function(a,b){const scoreA=Number(a.popularity||0)+Number(a.vote_average||0)*10;const scoreB=Number(b.popularity||0)+Number(b.vote_average||0)*10;return scoreB-scoreA;});tmdbListCache.set("featured",Promise.resolve(featured));renderDiscoveryRow("homeFeatured",featured,"home");}).catch(function(error){console.error("No se pudieron cargar las destacadas:",error);if(requestId===currentListRequestId)renderDiscoveryRow("homeFeatured",[],"home","No pudimos cargar esta fila.");});
    loadHomeGenreRows(requestId); return Promise.allSettled([now,upcoming,popular,rated]);
}

async function displayCategories() {
    const requestId=++currentListRequestId; clearTemporaryReservationState(); currentDetailsMovieId=null; currentMovieReturnView="categories"; showMessage("Cargando categorías...","Categorías",false);
    await loadMovieGenres(); if(requestId!==currentListRequestId)return; const genres=Object.entries(genreMap).sort(function(a,b){return a[1].localeCompare(b[1],"es");});
    moviesContainer.innerHTML=`<section class="categories-view"><div class="category-view__navigation"><button class="back-button" id="backToHome" type="button">Volver a Inicio</button></div><h1>Categorías</h1><p>Explora películas por género.</p><div class="categories-grid"></div></section>`;
    const grid=moviesContainer.querySelector(".categories-grid");genres.forEach(function(entry){const button=document.createElement("button");button.type="button";button.className="category-chip";button.dataset.discoverGenreId=entry[0];button.dataset.discoverGenreName=entry[1];button.textContent=entry[1];grid.appendChild(button);});
}

function renderGenreView() {
    const state=currentGenreView; moviesContainer.innerHTML=`<section class="genre-view"><div class="category-view__navigation"><button class="back-button" id="backToCategories" type="button">Categorías</button><button class="back-button" id="backToHome" type="button">Inicio</button></div><h1>${state.name}</h1><div class="movies-grid genre-movies-grid"></div><button class="primary-action genre-load-more" id="loadMoreGenreMovies" type="button"${state.page>=state.totalPages?" hidden":""}>Cargar más</button></section>`; const grid=moviesContainer.querySelector(".genre-movies-grid");state.movies.forEach(function(movie){grid.appendChild(createMovieCard(movie,"genre"));});activateImageFallbacks();
}

async function loadGenreMovies(genreId,genreName,page,append) {
    const requestedPage=page||1; if(!append){currentGenreView={id:String(genreId),name:genreName,page:0,totalPages:1,movies:[]};showMessage("Cargando películas...",genreName,false);} const state=currentGenreView;
    try{const response=await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&language=es-ES&region=CO&sort_by=popularity.desc&page=${requestedPage}`);if(!response.ok)throw new Error(`Error de TMDB: ${response.status}`);const data=await response.json();if(!currentGenreView||currentGenreView.id!==String(genreId))return;const byId=new Map(state.movies.map(function(movie){return [movie.id,movie];}));data.results.forEach(function(movie){byId.set(movie.id,movie);});state.movies=Array.from(byId.values());state.page=data.page;state.totalPages=data.total_pages;currentMovieReturnView="genre";renderGenreView();}catch(error){console.error("No se pudo cargar el género:",error);if(!append)showMessage("No pudimos cargar esta categoría.",genreName,false);else{const button=document.getElementById("loadMoreGenreMovies");if(button){button.disabled=false;button.textContent="Cargar más";}}}
}
// Endpoint TMDB: now_playing. region=CO solicita resultados para Colombia.
async function loadNowPlaying() {
    const requestId = ++currentListRequestId;
    clearTemporaryReservationState();
    currentDetailsMovieId = null;
    const url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&language=es-ES&region=CO`;

    showMessage("Cargando cartelera...", "Ahora en cartelera", false);

    try {
        const data = { results: await fetchTmdbMovieList("now-playing", "/movie/now_playing?") };
        if (requestId !== currentListRequestId) return;
        await loadMovieGenres();
        if (requestId !== currentListRequestId) return;
        displayMovies(data.results, "Ahora en cartelera", false);
    } catch (error) {
        console.error("No se pudo cargar la cartelera:", error);
        if (requestId !== currentListRequestId) return;
        showMessage(
            "No pudimos cargar la cartelera. Int\u00e9ntalo nuevamente.",
            "Ahora en cartelera",
            false
        );
    }
}

async function loadLocalBillboard() {
    const requestId = ++currentListRequestId;
    clearTemporaryReservationState();
    currentDetailsMovieId = null;
    currentMovieReturnView = "list";
    showMessage("Cargando cartelera del cine...", "Cartelera", false);

    let billboard;
    try {
        const response = await fetch(`${LOCAL_API_URL}/billboard`);
        if (!response.ok) throw new Error(`Error de JSON Server: ${response.status}`);
        billboard = await response.json();
    } catch (error) {
        console.error("No se pudo consultar la cartelera local:", error);
        if (requestId === currentListRequestId) {
            showMessage("No pudimos consultar la cartelera del cine.", "Cartelera", false);
        }
        return;
    }

    if (requestId !== currentListRequestId) return;
    const activeMovies = billboard.filter(function (item) {
        return !Object.prototype.hasOwnProperty.call(item, "active") || item.active === true;
    });
    if (activeMovies.length === 0) {
        displayMovies([], "Cartelera", false, "No hay películas disponibles actualmente en la cartelera del cine.");
        return;
    }

    try {
        const movies = await Promise.all(activeMovies.map(function (item) {
            return fetchTmdbMovieDetails(item.tmdbId);
        }));
        if (requestId !== currentListRequestId) return;
        await loadMovieGenres();
        if (requestId !== currentListRequestId) return;
        displayMovies(movies, "Cartelera", false);
    } catch (error) {
        console.error("No se pudieron cargar las películas de la cartelera local:", error);
        if (requestId === currentListRequestId) {
            showMessage("No pudimos cargar los datos de las películas de la cartelera.", "Cartelera", false);
        }
    }
}
// Endpoint TMDB: upcoming. La funcion es casi igual a loadNowPlaying,
// pero cambia la URL y el titulo de la seccion.
async function loadUpcoming() {
    const requestId = ++currentListRequestId;
    clearTemporaryReservationState();
    currentDetailsMovieId = null;
    const url = `https://api.themoviedb.org/3/movie/upcoming?api_key=${API_KEY}&language=es-ES&region=CO`;

    showMessage("Cargando pr\u00f3ximos estrenos...", "Pr\u00f3ximamente", true);

    try {
        const data = { results: await fetchTmdbMovieList("upcoming", "/movie/upcoming?") };
        if (requestId !== currentListRequestId) return;
        await loadMovieGenres();
        if (requestId !== currentListRequestId) return;
        displayMovies(
            data.results,
            "Pr\u00f3ximamente",
            true,
            "No hay pr\u00f3ximos estrenos disponibles en este momento."
        );
    } catch (error) {
        console.error("No se pudieron cargar los pr\u00f3ximos estrenos:", error);
        if (requestId !== currentListRequestId) return;
        showMessage(
            "No pudimos cargar los pr\u00f3ximos estrenos. Int\u00e9ntalo nuevamente.",
            "Pr\u00f3ximamente",
            true
        );
    }
}

// encodeURIComponent convierte espacios y caracteres especiales en una forma
// segura para colocarlos dentro de una URL, por ejemplo "Toy Story".
async function searchMovies(movieName) {
    const requestId = ++currentListRequestId;
    clearTemporaryReservationState();
    currentDetailsMovieId = null;
    const encodedMovieName = encodeURIComponent(movieName);
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodedMovieName}&language=es-ES&region=CO`;
    const sectionTitle = `Resultados para: ${movieName}`;

    showMessage("Buscando pel\u00edculas...", sectionTitle, true);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Error de TMDB: ${response.status}`);
        }

        const data = await response.json();
        if (requestId !== currentListRequestId) return;
        await loadMovieGenres();
        if (requestId !== currentListRequestId) return;
        displayMovies(data.results, sectionTitle, true);
    } catch (error) {
        console.error("No se pudieron obtener las pel\u00edculas:", error);
        if (requestId !== currentListRequestId) return;
        showMessage(
            "No pudimos cargar las pel\u00edculas. Int\u00e9ntalo nuevamente.",
            sectionTitle,
            true
        );
    }
}

function closeSearchSuggestions() { clearTimeout(suggestionDebounceId); suggestionRequestId += 1; suggestionResults = []; activeSuggestionIndex = -1; searchSuggestions.hidden = true; searchSuggestions.replaceChildren(); searchInput.setAttribute("aria-expanded", "false"); searchInput.removeAttribute("aria-activedescendant"); }
function setActiveSuggestion(index) { const options = Array.from(searchSuggestions.querySelectorAll("[role=option]")); if (!options.length) return; activeSuggestionIndex = (index + options.length) % options.length; options.forEach(function(option,i){ const active=i===activeSuggestionIndex; option.classList.toggle("search-suggestion--active",active); option.setAttribute("aria-selected",String(active)); }); const active=options[activeSuggestionIndex]; searchInput.setAttribute("aria-activedescendant",active.id); active.scrollIntoView({block:"nearest"}); }
function selectSuggestion(movie) { searchInput.value=movie.title; closeSearchSuggestions(); loadMovieDetails(movie.id); }
function renderSearchSuggestions(movies,query,message) { searchSuggestions.replaceChildren(); suggestionResults=movies; activeSuggestionIndex=-1; searchInput.removeAttribute("aria-activedescendant"); if(message){ const status=document.createElement("p"); status.className="search-suggestions__message"; status.textContent=message; searchSuggestions.appendChild(status); } else movies.forEach(function(movie,index){ const option=document.createElement("button"); option.type="button"; option.className="search-suggestion"; option.id=`searchSuggestion-${movie.id}-${index}`; option.setAttribute("role","option"); option.setAttribute("aria-selected","false"); const poster=movie.poster_path?document.createElement("img"):document.createElement("span"); poster.className=`search-suggestion__poster${movie.poster_path?"":" search-suggestion__poster--empty"}`; if(movie.poster_path){poster.src=`https://image.tmdb.org/t/p/w92${movie.poster_path}`;poster.alt="";}else poster.setAttribute("aria-hidden","true"); const info=document.createElement("span"); info.className="search-suggestion__information"; const title=document.createElement("strong"); title.textContent=movie.title; const year=document.createElement("span"); year.textContent=movie.release_date?movie.release_date.slice(0,4):"Año no disponible"; info.append(title,year); option.append(poster,info); option.addEventListener("click",function(){selectSuggestion(movie);}); searchSuggestions.appendChild(option); }); searchSuggestions.hidden=false; searchInput.setAttribute("aria-expanded","true"); }
async function loadSearchSuggestions(query) { const key=query.trim().toLocaleLowerCase("es"); const requestId=++suggestionRequestId; if(suggestionCache.has(key)){ const cachedMovies=suggestionCache.get(key); if(searchInput.value.trim().toLocaleLowerCase("es")===key) renderSearchSuggestions(cachedMovies,query,cachedMovies.length?"":`No encontramos películas para «${query}».`); return; } try { const url=`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES&region=CO`; const response=await fetch(url); if(!response.ok) throw new Error(`Error de TMDB: ${response.status}`); const data=await response.json(); if(requestId!==suggestionRequestId||searchInput.value.trim().toLocaleLowerCase("es")!==key)return; const movies=data.results.slice(0,6); suggestionCache.set(key,movies); renderSearchSuggestions(movies,query,movies.length?"":`No encontramos películas para «${query}».`); } catch(error){ console.error("No fue posible obtener sugerencias:",error); if(requestId!==suggestionRequestId||searchInput.value.trim().toLocaleLowerCase("es")!==key)return; renderSearchSuggestions([],query,"No fue posible obtener sugerencias."); } }

// EVENTOS DEL USUARIO
// addEventListener registra una funcion callback que se ejecuta cuando ocurre
// un evento. El evento no recarga la pagina: modifica el contenido existente.
searchButton.addEventListener("click", function () {
    closeSearchSuggestions();
    const movieName = searchInput.value.trim();

    if (movieName === "") {
        showMessage(
            "Escribe el nombre de una pel\u00edcula para buscar.",
            "Pel\u00edculas",
            true
        );
        return;
    }

    searchMovies(movieName);
});

searchInput.addEventListener("input",function(){ clearTimeout(suggestionDebounceId); suggestionRequestId+=1; const query=searchInput.value.trim(); if(query.length<2){closeSearchSuggestions();return;} suggestionDebounceId=setTimeout(function(){loadSearchSuggestions(query);},300); });
searchInput.addEventListener("keydown",function(event){ const hasOptions=!searchSuggestions.hidden&&suggestionResults.length>0; if(event.key==="ArrowDown"&&hasOptions){event.preventDefault();setActiveSuggestion(activeSuggestionIndex+1);}else if(event.key==="ArrowUp"&&hasOptions){event.preventDefault();setActiveSuggestion(activeSuggestionIndex-1);}else if(event.key==="Enter"){event.preventDefault();if(hasOptions&&activeSuggestionIndex>=0)selectSuggestion(suggestionResults[activeSuggestionIndex]);else searchButton.click();}else if(event.key==="Escape")closeSearchSuggestions(); });
document.addEventListener("click",function(event){if(!event.target.closest(".search"))closeSearchSuggestions();});

// Varias opciones de navegacion ejecutan la misma funcion para evitar duplicacion.
function showNowPlayingFromNavigation() {
    loadLocalBillboard();
}

nowPlayingLink.addEventListener("click", showNowPlayingFromNavigation);
homeLink.addEventListener("click", loadHome);
brandLink.addEventListener("click", loadHome);
upcomingLink.addEventListener("click", function () {
    loadUpcoming();
});
categoriesLink.addEventListener("click", displayCategories);

reservationsLink.addEventListener("click", function () { loadReservations(); });
purchasesLink.addEventListener("click", function () { loadPurchases(); });

// DELEGACION DE EVENTOS:
// Los botones de tarjetas y reservas se crean despues con innerHTML/createElement.
// Por eso el listener se coloca en el contenedor que ya existe.
// event.target indica el elemento pulsado; closest permite encontrar un ancestro
// con data-function-id. Esta tecnica evita registrar listeners repetidos.
moviesContainer.addEventListener("change", function (event) {
    if (event.target.id === "ticketQuantity") {
        const value = Number(event.target.value);
        desiredTicketQuantity = Number.isInteger(value) && value >= 1 ? value : null;
        updateSeatSelectionSummary(currentSelectedFunction);
    }

    if (event.target.id === "sortMovies") {
        currentSortOption = event.target.value;
        applyMovieFiltersAndSort();
    }
});

moviesContainer.addEventListener("submit", function (event) {
    if (event.target.id === "customerForm") handleCustomerFormSubmit(event);
    if (event.target.id === "ratingForm") saveMovieRating(event);
});

moviesContainer.addEventListener("click", function (event) {
    if(event.target.id==="showMoreRecommendations"){visibleRecommendationCount=Math.min(visibleRecommendationCount+6,currentRecommendationMovies.length);appendRecommendationCards();return;}
    const carouselControl=event.target.closest("[data-carousel-target]");
    if(carouselControl){const viewport=document.getElementById(carouselControl.dataset.carouselTarget);if(viewport){const card=viewport.querySelector(".movie-card");const track=viewport.querySelector(".discovery-track");const styles=track?getComputedStyle(track):null;const gap=styles?parseFloat(styles.columnGap||styles.gap)||0:0;const cardWidth=card?card.getBoundingClientRect().width:viewport.clientWidth/5;viewport.scrollBy({left:Number(carouselControl.dataset.carouselDirection)*(cardWidth+gap)*5,behavior:"smooth"});}return;}
    const homeAction=event.target.closest("[data-home-action]");
    if(homeAction){const action=homeAction.dataset.homeAction;if(action==="now-playing")loadLocalBillboard();else if(action==="upcoming")loadUpcoming();else if(action.startsWith("genre:")){const id=action.split(":")[1];loadGenreMovies(id,genreMap[id],1,false);}else if(["popular","top-rated","featured"].includes(action)){const titles={popular:"Más populares","top-rated":"Mejor valoradas",featured:"Destacadas"};fetchTmdbMovieList(action,action==="popular"?"/movie/popular?":"/movie/top_rated?").then(function(movies){displayMovies(movies,titles[action],false);}).catch(function(){showMessage("No pudimos cargar esta selección.",titles[action],false);});}return;}
    const discoverGenre=event.target.closest("[data-discover-genre-id]");
    if(discoverGenre){loadGenreMovies(discoverGenre.dataset.discoverGenreId,discoverGenre.dataset.discoverGenreName,1,false);return;}
    if(event.target.id==="viewMoreCategories"){displayCategories();return;}
    if(event.target.id==="backToCategories"){displayCategories();return;}
    if(event.target.id==="backToHome"){loadHome();return;}
    if(event.target.id==="loadMoreGenreMovies"){event.target.disabled=true;event.target.textContent="Cargando...";loadGenreMovies(currentGenreView.id,currentGenreView.name,currentGenreView.page+1,true);return;}
    const ratingButton = event.target.closest("[data-rating-value]");
    if (ratingButton) { selectMovieRating(ratingButton.dataset.ratingValue); return; }
    const operationButton = event.target.closest("[data-operation]");
    if (operationButton) { handleCustomerOperation(operationButton.dataset.operation); return; }
    const genreOption = event.target.closest("[data-genre-id]");
    if (genreOption) {
        currentGenreFilter = genreOption.dataset.genreId;
        applyMovieFiltersAndSort();
        return;
    }

    const genreMenuToggle = event.target.closest("#genreMenuToggle");
    if (genreMenuToggle) {
        const genreMenu = document.getElementById("genreMenu");
        const willOpen = genreMenu.hidden;
        genreMenu.hidden = !willOpen;
        genreMenuToggle.setAttribute("aria-expanded", String(willOpen));
        return;
    }

    if (event.target.id === "resetMovieFilters") {
        resetMovieExploration();
        applyMovieFiltersAndSort();
        return;
    }

    if (event.target.id === "viewAllMovies") {
        currentGenreFilter = "";
        applyMovieFiltersAndSort();
        return;
    }
    if (event.target.id === "viewMoviesFromReservations") {
        loadLocalBillboard();
        return;
    }
    if (event.target.id === "continueWithSeats") {
        event.target.disabled = true;
        continueToCustomerData();
        return;
    }
    if (event.target.id === "backToSeats") {
        displaySeatSelection(currentSelectedFunction, currentSelectedRoom, currentRoomSeats, currentFunctionSeats, true);
        return;
    }
    if (event.target.id === "backToCustomerData") { displayCustomerForm(); return; }
    if (event.target.id === "confirmOperation") { confirmTicketOperation(); return; }
    if (event.target.id === "viewConfirmedOperations") {
        const confirmationType = event.target.dataset.confirmationType;
        clearTemporaryReservationState();
        if (confirmationType === "purchase") loadPurchases();
        else loadReservations();
        return;
    }
    if (event.target.id === "backToMovies") {
        clearTemporaryReservationState();
        loadLocalBillboard();
        return;
    }
    const functionButton = event.target.closest("[data-function-id]");
    if (functionButton) {
        functionButton.disabled = true;
        loadSeatSelection(functionButton.dataset.functionId);
        return;
    }
    if (event.target.id === "backToShowtimes") {
        loadMovieDetails(currentDetailsMovieId);
        return;
    }
    if (event.target.id === "backToNowPlaying") {
        loadLocalBillboard();
    }

    if (event.target.id === "backToPreviousList") {
        if(currentMovieReturnView==="home"){loadHome();return;}
        if(currentMovieReturnView==="categories"){displayCategories();return;}
        if(currentMovieReturnView==="genre"&&currentGenreView){renderGenreView();return;}
        displayMovies(
            currentMovies,
            currentSectionTitle,
            currentShowBackButton,
            currentEmptyMessage,
            true
        );
    }
});

// PUNTO DE ENTRADA: se ejecuta al final porque las constantes DOM ya existen.
// Al abrir index.html, esta llamada carga la página de descubrimiento.
loadHome();

moviesContainer.addEventListener("keydown", function (event) {
    const toggleTarget = event.target.closest("#genreMenuToggle");
    const optionTarget = event.target.closest("[data-genre-id]");
    if (!toggleTarget && !optionTarget) return;
    const menu = document.getElementById("genreMenu");
    const toggle = document.getElementById("genreMenuToggle");
    const options = Array.from(menu.querySelectorAll("[data-genre-id]"));
    if (event.key === "Escape") { menu.hidden = true; toggle.setAttribute("aria-expanded", "false"); toggle.focus(); event.preventDefault(); return; }
    if (toggleTarget && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        menu.hidden = false; toggle.setAttribute("aria-expanded", "true");
        const selectedIndex = options.findIndex(option => option.getAttribute("aria-selected") === "true");
        options[selectedIndex >= 0 ? selectedIndex : (event.key === "ArrowDown" ? 0 : options.length - 1)].focus(); event.preventDefault(); return;
    }
    if (optionTarget && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        const currentIndex = options.indexOf(optionTarget); let nextIndex = currentIndex;
        if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % options.length;
        if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + options.length) % options.length;
        if (event.key === "Home") nextIndex = 0; if (event.key === "End") nextIndex = options.length - 1;
        options[nextIndex].focus(); event.preventDefault();
    }
});
document.addEventListener("click", function (event) {
    const dropdown = moviesContainer.querySelector(".genre-dropdown");
    if (!dropdown || dropdown.contains(event.target)) return;
    const menu = document.getElementById("genreMenu"); const toggle = document.getElementById("genreMenuToggle");
    if (menu && toggle) { menu.hidden = true; toggle.setAttribute("aria-expanded", "false"); }
});
