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
const accountMenuToggle=document.getElementById("accountMenuToggle");
const accountMenuPanel=document.getElementById("accountMenuPanel");
const loginAction=document.getElementById("loginAction");
const registerAction=document.getElementById("registerAction");
const logoutAction=document.getElementById("logoutAction");
const accountIdentity=document.getElementById("accountIdentity");
const myAccountAction=document.getElementById("myAccountAction");

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
let pendingPaymentContext = null;
let safePaymentData = null;
let paymentEditValues = null;
let purchaseTicketContexts = new Map();
let simulatedPaymentInProgress = false;
const USER_SESSION_KEY="theMoiCurrentUser";
let currentUser=restoreCurrentUser();

// ESTADO DE EXPLORACION DE LISTAS:
// genreMap relaciona cada id oficial de TMDB con su nombre en espanol.
// Los filtros siempre actuan sobre una copia de currentMovies.
let genreMap = {};
let genreLoadPromise = null;
let currentGenreFilter = "";
let currentSortOption = "featured";


// Sesión académica: nunca persiste la contraseña en el navegador.
function normalizeEmail(value){return String(value||"").trim().toLowerCase();}
function sanitizeSessionUser(user){if(!user||user.id===undefined||!String(user.name||"").trim()||!isValidEmail(normalizeEmail(user.email)))return null;return{id:String(user.id),name:String(user.name).trim(),email:normalizeEmail(user.email)};}
function restoreCurrentUser(){try{return sanitizeSessionUser(JSON.parse(localStorage.getItem(USER_SESSION_KEY)));}catch(error){localStorage.removeItem(USER_SESSION_KEY);return null;}}
function updateAccountUI(){accountMenuToggle.textContent=currentUser?`Hola, ${currentUser.name.split(/\s+/)[0]}`:"Cuenta";loginAction.hidden=!!currentUser;registerAction.hidden=!!currentUser;accountIdentity.hidden=!currentUser;myAccountAction.hidden=!currentUser;logoutAction.hidden=!currentUser;accountIdentity.textContent=currentUser?`${currentUser.name} · ${currentUser.email}`:"";}
function closeAccountMenu(){accountMenuPanel.hidden=true;accountMenuToggle.setAttribute("aria-expanded","false");}
function logoutCurrentUser(){currentUser=null;currentCustomerData=null;localStorage.removeItem(USER_SESSION_KEY);closeAccountMenu();updateAccountUI();loadHome();}
function displayAccountForm(mode,message){clearTemporaryReservationState();const register=mode==="register";moviesContainer.innerHTML=`<section class="reservation-view account-view"><p class="movie-details__eyebrow">Cuenta</p><h2>${register?"Crear cuenta":"Iniciar sesión"}</h2><p class="reservation-status" id="accountFormStatus" role="status" hidden></p><form class="customer-form" id="${register?"registerForm":"loginForm"}" novalidate>${register?'<label for="registerName">Nombre</label><input id="registerName" name="name" autocomplete="name" required>':""}<label for="accountEmail">Correo electrónico</label><input id="accountEmail" name="email" type="email" autocomplete="email" required><label for="accountPassword">Contraseña</label><input id="accountPassword" name="password" type="password" autocomplete="${register?"new-password":"current-password"}" minlength="6" required>${register?'<label for="confirmPassword">Confirmar contraseña</label><input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" required>':""}<div class="reservation-actions"><button class="secondary-action" type="button" data-account-view="${register?"login":"register"}">${register?"Ya tengo cuenta":"Crear cuenta"}</button><button class="primary-action" type="submit">${register?"Registrarme":"Entrar"}</button></div></form></section>`;if(message){const status=document.getElementById("accountFormStatus");status.textContent=message;status.hidden=false;}}
async function handleRegisterSubmit(event){event.preventDefault();const f=event.target,n=f.elements.name.value.trim(),e=normalizeEmail(f.elements.email.value),p=f.elements.password.value;if(n.length<2||!isValidEmail(e)||p.length<6||p!==f.elements.confirmPassword.value)return displayAccountForm("register","Revisa el nombre, correo y contraseñas (mínimo 6 caracteres).");try{const check=await fetch(`${LOCAL_API_URL}/users?email=${encodeURIComponent(e)}`);if(!check.ok)throw Error();if((await check.json()).length)return displayAccountForm("register","Ya existe una cuenta con ese correo.");const response=await fetch(`${LOCAL_API_URL}/users`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n,email:e,password:p,createdAt:new Date().toISOString()})});if(!response.ok)throw Error();displayAccountForm("login","Registro completado. Ya puedes iniciar sesión.");document.getElementById("accountEmail").value=e;}catch(error){displayAccountForm("register","No fue posible completar el registro.");}}
async function handleLoginSubmit(event){event.preventDefault();const f=event.target,e=normalizeEmail(f.elements.email.value),p=f.elements.password.value;try{const response=await fetch(`${LOCAL_API_URL}/users?email=${encodeURIComponent(e)}`);if(!response.ok)throw Error();const user=(await response.json()).find(item=>item.password===p);if(!user)return displayAccountForm("login","Correo o contraseña incorrectos.");currentUser=sanitizeSessionUser(user);localStorage.setItem(USER_SESSION_KEY,JSON.stringify(currentUser));updateAccountUI();loadHome();}catch(error){displayAccountForm("login","No fue posible iniciar sesión.");}}
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
function selectPreferredTrailer(videos) {
    const results = videos && Array.isArray(videos.results) ? videos.results : [];
    const isValidYoutubeVideo = function (video) {
        return video.site === "YouTube" && /^[a-zA-Z0-9_-]+$/.test(video.key);
    };
    return results.find(function (video) {
        return isValidYoutubeVideo(video) && video.type === "Trailer" && video.official === true;
    }) || results.find(function (video) {
        return isValidYoutubeVideo(video) && video.type === "Trailer";
    }) || results.find(function (video) {
        return isValidYoutubeVideo(video) && video.type === "Teaser";
    });
}

function displayMovieTrailer(videos) {
    const trailerContainer = document.getElementById("movieTrailer");
    if (!trailerContainer) return;

    trailerContainer.replaceChildren();
    const eyebrow = document.createElement("p");
    eyebrow.className = "movie-details__eyebrow";
    eyebrow.textContent = "Video oficial";
    const title = document.createElement("h3");
    title.textContent = "Tráiler";
    trailerContainer.append(eyebrow, title);
    const trailer = selectPreferredTrailer(videos);

    if (!trailer) {
        const message = document.createElement("p");
        message.className = "movies__message";
        message.textContent = "Tráiler no disponible.";
        trailerContainer.appendChild(message);
        return;
    }

    const videoContainer = document.createElement("div");
    videoContainer.className = "movie-trailer__video";
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${trailer.key}`;
    iframe.title = "Tráiler de la película seleccionada";
    iframe.loading = "lazy";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;
    videoContainer.appendChild(iframe);

    const youtubeLink = document.createElement("a");
    youtubeLink.className = "trailer-youtube-link";
    youtubeLink.href = `https://www.youtube.com/watch?v=${trailer.key}`;
    youtubeLink.target = "_blank";
    youtubeLink.rel = "noopener noreferrer";
    youtubeLink.textContent = "▶ Ver tráiler en YouTube";
    trailerContainer.append(videoContainer, youtubeLink);
}

// Cada endpoint de TMDB cambia la ultima parte de la URL:
// /movie/id, /credits, /videos y /recommendations.
async function loadMovieVideos(movieId) {
    try {
        const fetchVideosByLanguage = async function (language) {
            const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${API_KEY}&language=${language}`);
            if (!response.ok) throw new Error(`Error de TMDB: ${response.status}`);
            return response.json();
        };
        const spanishVideos = await fetchVideosByLanguage("es-ES");
        if (selectPreferredTrailer(spanishVideos)) return spanishVideos;
        return await fetchVideosByLanguage("en-US");
    } catch (error) {
        console.error("No se pudo cargar el tráiler:", error);
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
            const code = document.createElement("strong"); code.textContent = `Silla: ${seat.seatCode}`;
            const detail = document.createElement("span"); detail.textContent = `Fila ${seat.row} · Número ${seat.number}`;
            const location = document.createElement("span"); location.textContent = `Ubicación: ${seat.location}`;
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
    const customer=currentCustomerData||(currentUser?{userName:currentUser.name,email:currentUser.email}:null);if(customer){document.getElementById("customerName").value=customer.userName;document.getElementById("customerEmail").value=customer.email;}
}
function isValidEmail(email){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);}
function handleCustomerOperation(operation){const form=document.getElementById("customerForm");const userName=form.elements.userName.value.trim();const email=form.elements.email.value.trim();if(!userName)return displayCustomerForm("El nombre es obligatorio.");if(!email)return displayCustomerForm("El correo electrónico es obligatorio.");if(!form.elements.email.checkValidity()||!isValidEmail(email))return displayCustomerForm("Escribe un correo electrónico válido.");currentCustomerData={userName,email};currentOperationType=operation;displayOperationSummary();}
function handleCustomerFormSubmit(event){event.preventDefault();displayCustomerForm("Elige explícitamente Reservar tickets o Comprar tickets.");}

function displayOperationSummary(message){if(!currentCustomerData||!["reservation","purchase"].includes(currentOperationType))return displayCustomerForm("Elige si deseas reservar o comprar.");const isPurchase=currentOperationType==="purchase";const movieFunction=currentSelectedFunction;const room=currentSelectedRoom;const title="Confirma tus datos";moviesContainer.innerHTML=`<section class="reservation-view" aria-labelledby="operationSummaryTitle">${bookingStepsMarkup(3)}<p class="movie-details__eyebrow">${isPurchase?"Compra simulada":"Reserva"}</p><h2 id="operationSummaryTitle">${title}</h2>${message?`<p class="reservation-status" role="alert">${message}</p>`:""}<dl class="reservation-details"><div><dt>Película</dt><dd>${currentDetailsMovie?currentDetailsMovie.title:"Película seleccionada"}</dd></div><div><dt>Fecha</dt><dd>${formatShowtimeDate(movieFunction.date)}</dd></div><div><dt>Hora</dt><dd>${movieFunction.time}</dd></div><div><dt>Sala</dt><dd>${room.name} · ${room.type}</dd></div><div><dt>Asientos</dt><dd>${selectedSeats.map(function(seat){return seat.seatCode;}).join(", ")}</dd></div><div class="reservation-details__wide"><dt>Detalle</dt><dd class="selected-seats-details">${selectedSeats.map(function(seat){return `${seat.seatCode} — Fila ${seat.row} — Número ${seat.number} — ${seat.location} — ${formatShowtimePrice(movieFunction.price)}`;}).join("\n")}</dd></div><div><dt>Entradas</dt><dd>${desiredTicketQuantity}</dd></div><div><dt>Precio unitario</dt><dd>${formatShowtimePrice(movieFunction.price)}</dd></div><div><dt>Total</dt><dd>${formatShowtimePrice(desiredTicketQuantity*movieFunction.price)}</dd></div><div><dt>Nombre</dt><dd id="operationCustomerName"></dd></div><div><dt>Correo</dt><dd id="operationCustomerEmail"></dd></div></dl><div class="reservation-actions"><button class="secondary-action" id="backToCustomerData" type="button">Editar datos</button><button class="primary-action" id="confirmOperation" type="button">${isPurchase?"Confirmar compra":"Confirmar reserva"}</button></div></section>`;document.getElementById("operationCustomerName").textContent=currentCustomerData.userName;document.getElementById("operationCustomerEmail").textContent=currentCustomerData.email;}

function displayOperationConfirmation(operation, confirmationContext){const isPurchase=confirmationContext.operationType==="purchase";const title=isPurchase?"Compra confirmada":"Reserva confirmada";moviesContainer.innerHTML=`<section class="reservation-view reservation-confirmation digital-ticket" aria-labelledby="confirmationTitle"><p class="reservation-success">✓ ${title}</p><h2 id="confirmationTitle">${isPurchase?"Compra":"Reserva"} #${operation.id}</h2><dl class="reservation-details"><div><dt>Película</dt><dd>${confirmationContext.movieTitle}</dd></div><div><dt>Función</dt><dd>${formatShowtimeDate(confirmationContext.movieFunction.date)} · ${confirmationContext.movieFunction.time}</dd></div><div><dt>Sala</dt><dd>${confirmationContext.room.name} · ${confirmationContext.room.type}</dd></div><div><dt>Asientos</dt><dd>${operation.seats.map(function(seat){return seat.seatCode;}).join(", ")}</dd></div><div><dt>Cantidad</dt><dd>${operation.quantity}</dd></div><div><dt>Total</dt><dd>${formatShowtimePrice(operation.total)}</dd></div><div><dt>Nombre</dt><dd id="confirmationCustomerName"></dd></div><div><dt>Correo</dt><dd id="confirmationCustomerEmail"></dd></div></dl><div class="reservation-actions"><button class="secondary-action" id="backToMovies" type="button">Volver a cartelera</button><button class="primary-action" id="viewConfirmedOperations" data-confirmation-type="${isPurchase?"purchase":"reservation"}" type="button">${isPurchase?"Ver mis compras":"Ver mis reservas"}</button></div></section>`;document.getElementById("confirmationCustomerName").textContent=operation.userName;document.getElementById("confirmationCustomerEmail").textContent=operation.email;}
async function confirmTicketOperation(){if(operationConfirmationInProgress)return;if(operationRecordCreated)return displayOperationSummary("La operación ya fue registrada; no se enviará nuevamente.");if(!currentSelectedFunction||!currentCustomerData||selectedSeats.length!==desiredTicketQuantity)return displayOperationSummary("La operación no está completa.");operationConfirmationInProgress=true;const button=document.getElementById("confirmOperation");if(button){button.disabled=true;button.textContent="Procesando...";}let created=false;try{const validation=await revalidateSelectedSeats();if(!validation.available){displayOperationSummary(`No están disponibles: ${validation.conflicts.map(function(seat){return seat.seatCode;}).join(", ")}. No se creó la operación.`);return;}const isPurchase=currentOperationType==="purchase";const endpoint=isPurchase?"purchases":"reservations";const targetStatus=isPurchase?"sold":"reserved";const operationData={userId:currentUser.id,userName:currentCustomerData.userName,email:currentCustomerData.email,tmdbId:currentSelectedFunction.tmdbId,functionId:currentSelectedFunction.id,roomId:currentSelectedFunction.roomId,quantity:desiredTicketQuantity,seats:selectedSeats.map(function(seat){return {seatId:seat.seatId,seatCode:seat.seatCode,location:seat.location};}),unitPrice:currentSelectedFunction.price,total:desiredTicketQuantity*currentSelectedFunction.price,status:isPurchase?"paid":"active",createdAt:new Date().toISOString()};const response=await fetch(`${LOCAL_API_URL}/${endpoint}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(operationData)});if(!response.ok)return displayOperationSummary(`No pudimos registrar la ${isPurchase?"compra":"reserva"}.`);const operation=await response.json();created=true;operationRecordCreated=true;const selectedRelations=currentFunctionSeats.filter(function(item){return selectedSeats.some(function(seat){return String(seat.seatId)===String(item.seatId);});});const updates=await Promise.all(selectedRelations.map(function(relation){return fetch(`${LOCAL_API_URL}/functionSeats/${relation.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:targetStatus})});}));if(updates.some(function(response){return !response.ok;}))return displayOperationSummary(`La ${isPurchase?"compra":"reserva"} fue registrada, pero no se actualizaron todas las sillas.`);const confirmationContext={operationType:currentOperationType,movieTitle:currentDetailsMovie?currentDetailsMovie.title:"Película seleccionada",movieFunction:currentSelectedFunction,room:currentSelectedRoom};clearTemporaryReservationState();displayOperationConfirmation(operation,confirmationContext);}catch(error){console.error("No se pudo confirmar la operación:",error);displayOperationSummary(created?"La operación fue registrada, pero ocurrió un problema al actualizar los asientos.":"No pudimos registrar la operación.");}finally{operationConfirmationInProgress=false;}}

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
    pendingPaymentContext = null;
    safePaymentData = null;
    paymentEditValues = null;
    simulatedPaymentInProgress = false;
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

function displayOperations(operations,movieFunctions,rooms,moviesById,type){const isPurchase=type==="purchase";const title=isPurchase?"Mis compras":"Mis reservas";if(operations.length===0){moviesContainer.innerHTML=`${createSectionHeading(title,false)}<div class="reservations-empty"><p>Todavía no hay ${isPurchase?"compras":"reservas"} registradas.</p><button class="primary-action" id="viewMoviesFromReservations" type="button">Ver cartelera</button></div>`;return;}const ordered=operations.slice().sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);});moviesContainer.innerHTML=`${createSectionHeading(title,false)}<div class="reservations-grid" id="reservationsGrid"></div>`;const grid=document.getElementById("reservationsGrid");ordered.forEach(function(operation){const movieFunction=movieFunctions.find(function(item){return String(item.id)===String(operation.functionId);});const room=rooms.find(function(item){return String(item.id)===String(operation.roomId);});const movie=moviesById[String(operation.tmdbId)];const movieTitle=movie?movie.title:"Película no disponible";const poster=createImage(movie?movie.poster_path:null,"reservation-card__poster",`Póster de ${movieTitle}`,"Póster no disponible");const functionInformation=movieFunction?`${formatShowtimeDate(movieFunction.date)} · ${movieFunction.time}`:"Información de función no disponible";const roomInformation=room?`${room.name} · ${room.type}`:"Sala no disponible";const seats=Array.isArray(operation.seats)?operation.seats:[];const card=document.createElement("article");card.className="reservation-card";card.innerHTML=`${poster}<div class="reservation-card__information"><p class="movie-details__eyebrow">${isPurchase?"Compra":"Reserva"} #${operation.id}</p><h3>${movieTitle}</h3><p><strong>Función:</strong> #${operation.functionId}</p><p><strong>Fecha y hora:</strong> ${functionInformation}</p><p><strong>Sala:</strong> ${roomInformation}</p><p class="reservation-card__customer"><strong>Nombre:</strong> <span></span></p><p class="reservation-card__email"><strong>Correo:</strong> <span></span></p><p><strong>Asientos:</strong> ${seats.length?seats.map(function(seat){return `${seat.seatCode} — ${seat.location}`;}).join(", "):"No disponibles"}</p><p><strong>Cantidad:</strong> ${operation.quantity} ${operation.quantity===1?"entrada":"entradas"}</p><p><strong>Precio unitario:</strong> ${formatShowtimePrice(operation.unitPrice)}</p><p class="reservation-card__total">Total: ${formatShowtimePrice(operation.total)}</p><p class="reservation-card__created">${isPurchase?"Comprada":"Reservada"}: ${formatReservationCreatedAt(operation.createdAt)}</p></div>`;card.querySelector(".reservation-card__customer span").textContent=operation.userName;card.querySelector(".reservation-card__email span").textContent=operation.email;grid.appendChild(card);});activateImageFallbacks();}
async function loadOperations(type){const requestId=++currentListRequestId;clearTemporaryReservationState();currentDetailsMovieId=null;const isPurchase=type==="purchase";const endpoint=isPurchase?"purchases":"reservations";const title=isPurchase?"Mis compras":"Mis reservas";showMessage(`Cargando ${isPurchase?"compras":"reservas"}...`,title,false);try{const [operationsResponse,functionsResponse,roomsResponse]=await Promise.all([fetch(`${LOCAL_API_URL}/${endpoint}`),fetch(`${LOCAL_API_URL}/functions`),fetch(`${LOCAL_API_URL}/rooms`)]);if(!operationsResponse.ok||!functionsResponse.ok||!roomsResponse.ok)throw new Error("No se pudieron consultar las operaciones");const allOperations=await operationsResponse.json();const operations=currentUser?allOperations.filter(function(operation){return operation.userId?String(operation.userId)===String(currentUser.id):normalizeEmail(operation.email)===currentUser.email;}):allOperations;const movieFunctions=await functionsResponse.json();const rooms=await roomsResponse.json();if(requestId!==currentListRequestId)return;const moviesById=operations.length?await loadOperationMovies(operations):{};if(requestId!==currentListRequestId)return;displayOperations(operations,movieFunctions,rooms,moviesById,type);}catch(error){console.error(`No se pudieron cargar las ${isPurchase?"compras":"reservas"}:`,error);if(requestId!==currentListRequestId)return;showMessage(`No pudimos cargar tus ${isPurchase?"compras":"reservas"}.`,title,false);}}
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
    moviesContainer.innerHTML=`<div class="discovery-home">${createDiscoverySection("homeTrending","Tendencias de hoy","Ver más tendencias","trending")}${createDiscoverySection("homeNow","Ahora en cartelera","Ver cartelera","now-playing")}${createDiscoverySection("homeUpcoming","Estrenos / Más nuevas","Ver próximos estrenos","upcoming")}${createDiscoverySection("homePopular","Más populares","Ver más populares","popular")}${createDiscoverySection("homeRated","Mejor valoradas","Ver más","top-rated")}${createDiscoverySection("homeFeatured","Destacadas","Ver más","featured")}<div id="homeGenreRows"></div><button class="categories-more" id="viewMoreCategories" type="button">Ver más categorías</button></div>`;
    const trending=loadHomeRow("homeTrending","trending-day","/trending/movie/day?",requestId);
    const now=loadHomeRow("homeNow","now-playing","/movie/now_playing?",requestId);
    const upcoming=loadHomeRow("homeUpcoming","upcoming","/movie/upcoming?",requestId);
    const popular=loadHomeRow("homePopular","popular","/movie/popular?",requestId);
    const rated=loadHomeRow("homeRated","top-rated","/movie/top_rated?",requestId);
    Promise.all([fetchTmdbMovieList("popular","/movie/popular?"),fetchTmdbMovieList("top-rated","/movie/top_rated?")]).then(function(groups){if(requestId!==currentListRequestId)return;const unique=new Map();groups.flat().forEach(function(movie){unique.set(movie.id,movie);});// Destacadas combina exclusivamente popularity y vote_average reales de TMDB.
        const featured=Array.from(unique.values()).sort(function(a,b){const scoreA=Number(a.popularity||0)+Number(a.vote_average||0)*10;const scoreB=Number(b.popularity||0)+Number(b.vote_average||0)*10;return scoreB-scoreA;});tmdbListCache.set("featured",Promise.resolve(featured));renderDiscoveryRow("homeFeatured",featured,"home");}).catch(function(error){console.error("No se pudieron cargar las destacadas:",error);if(requestId===currentListRequestId)renderDiscoveryRow("homeFeatured",[],"home","No pudimos cargar esta fila.");});
    loadHomeGenreRows(requestId); return Promise.allSettled([trending,now,upcoming,popular,rated]);
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
accountMenuToggle.addEventListener("click",function(){const open=accountMenuPanel.hidden;accountMenuPanel.hidden=!open;accountMenuToggle.setAttribute("aria-expanded",String(open));});
loginAction.addEventListener("click",function(){closeAccountMenu();displayAccountForm("login");});
registerAction.addEventListener("click",function(){closeAccountMenu();displayAccountForm("register");});
logoutAction.addEventListener("click",logoutCurrentUser);
document.addEventListener("click",function(event){if(!event.target.closest(".account-menu"))closeAccountMenu();});
accountMenuPanel.addEventListener("keydown",function(event){if(event.key==="Escape"){closeAccountMenu();accountMenuToggle.focus();}});

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
    if (event.target.id === "registerForm") handleRegisterSubmit(event);
    if (event.target.id === "loginForm") handleLoginSubmit(event);
    if (event.target.id === "ratingForm") saveMovieRating(event);
});

moviesContainer.addEventListener("click", function (event) {
    const accountViewButton=event.target.closest("[data-account-view]");if(accountViewButton){displayAccountForm(accountViewButton.dataset.accountView);return;}if(event.target.id==="showMoreRecommendations"){visibleRecommendationCount=Math.min(visibleRecommendationCount+6,currentRecommendationMovies.length);appendRecommendationCards();return;}
    const carouselControl=event.target.closest("[data-carousel-target]");
    if(carouselControl){const viewport=document.getElementById(carouselControl.dataset.carouselTarget);if(viewport){const card=viewport.querySelector(".movie-card");const track=viewport.querySelector(".discovery-track");const styles=track?getComputedStyle(track):null;const gap=styles?parseFloat(styles.columnGap||styles.gap)||0:0;const cardWidth=card?card.getBoundingClientRect().width:viewport.clientWidth/5;viewport.scrollBy({left:Number(carouselControl.dataset.carouselDirection)*(cardWidth+gap)*5,behavior:"smooth"});}return;}
    const homeAction=event.target.closest("[data-home-action]");
    if(homeAction){const action=homeAction.dataset.homeAction;if(action==="now-playing")loadLocalBillboard();else if(action==="upcoming")loadUpcoming();else if(action.startsWith("genre:")){const id=action.split(":")[1];loadGenreMovies(id,genreMap[id],1,false);}else if(["trending","popular","top-rated","featured"].includes(action)){const titles={trending:"Tendencias de hoy",popular:"Más populares","top-rated":"Mejor valoradas",featured:"Destacadas"};const endpoints={trending:"/trending/movie/day?",popular:"/movie/popular?","top-rated":"/movie/top_rated?",featured:"/movie/top_rated?"};fetchTmdbMovieList(action,endpoints[action]).then(function(movies){displayMovies(movies,titles[action],false);}).catch(function(){showMessage("No pudimos cargar esta selección.",titles[action],false);});}return;}
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
updateAccountUI();
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

// CIERRE MULTIUSUARIO: propiedad, pago posterior y cancelación.
function showAuthenticationRequired(){moviesContainer.innerHTML='<section class="reservation-view" aria-labelledby="authRequiredTitle"><p class="movie-details__eyebrow">Cuenta requerida</p><h2 id="authRequiredTitle">Necesitas iniciar sesión para continuar.</h2><div class="reservation-actions"><button class="text-action" data-auth-cancel type="button">Cancelar</button><button class="secondary-action" data-account-view="register" type="button">Registrarse</button><button class="primary-action" data-account-view="login" type="button">Iniciar sesión</button></div></section>';}
function isOwnedReservation(reservation){return !!currentUser&&(reservation.userId?String(reservation.userId)===String(currentUser.id):normalizeEmail(reservation.email)===currentUser.email);}
function isActiveReservation(reservation){return ["active","confirmed"].includes(reservation.status);}
function reservationStatusLabel(status){return status==="paid"?"Pagada":status==="cancelled"?"Cancelada":"Activa";}
const continueToCustomerDataBase=continueToCustomerData;
continueToCustomerData=async function(){if(!currentUser)return showAuthenticationRequired();return continueToCustomerDataBase();};
const confirmTicketOperationBase=confirmTicketOperation;
confirmTicketOperation=async function(){if(!currentUser)return showAuthenticationRequired();return confirmTicketOperationBase();};
const loadOperationsBase=loadOperations;
loadOperations=function(type){if(!currentUser){showAuthenticationRequired();return Promise.resolve();}return loadOperationsBase(type);};

async function displayMyAccount(){
    if(!currentUser)return showAuthenticationRequired();
    moviesContainer.innerHTML='<section class="reservation-view account-view" aria-labelledby="myAccountTitle"><p class="movie-details__eyebrow">Cuenta</p><h2 id="myAccountTitle">Mi cuenta</h2><dl class="reservation-details"><div><dt>Nombre</dt><dd id="myAccountName"></dd></div><div><dt>Correo</dt><dd id="myAccountEmail"></dd></div><div><dt>Registro</dt><dd id="myAccountCreated">Consultando...</dd></div></dl><div class="reservation-actions"><button class="secondary-action" data-account-reservations type="button">Mis reservas</button><button class="secondary-action" data-account-purchases type="button">Mis compras</button><button class="primary-action" data-account-logout type="button">Cerrar sesión</button></div></section>';
    document.getElementById("myAccountName").textContent=currentUser.name;document.getElementById("myAccountEmail").textContent=currentUser.email;
    try{const response=await fetch(`${LOCAL_API_URL}/users/${encodeURIComponent(currentUser.id)}`);if(!response.ok)throw Error();const user=await response.json();document.getElementById("myAccountCreated").textContent=user.createdAt?formatReservationCreatedAt(user.createdAt):"No disponible";}catch(error){document.getElementById("myAccountCreated").textContent="No disponible";}
}

function displayOperations(operations,movieFunctions,rooms,moviesById,type){
    const purchase=type==="purchase",title=purchase?"Mis compras":"Mis reservas";
    if(!operations.length){moviesContainer.innerHTML=`${createSectionHeading(title,false)}<div class="reservations-empty"><p>Todavía no hay ${purchase?"compras":"reservas"} registradas.</p><button class="primary-action" id="viewMoviesFromReservations" type="button">Ver cartelera</button></div>`;return;}
    moviesContainer.innerHTML=`${createSectionHeading(title,false)}<div class="reservations-grid" id="reservationsGrid"></div>`;const grid=document.getElementById("reservationsGrid");
    operations.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).forEach(function(operation){
        const fn=movieFunctions.find(item=>String(item.id)===String(operation.functionId)),room=rooms.find(item=>String(item.id)===String(operation.roomId)),movie=moviesById[String(operation.tmdbId)],titleText=movie?movie.title:"Película no disponible",seats=Array.isArray(operation.seats)?operation.seats:[];
        const card=document.createElement("article");card.className="reservation-card";card.innerHTML=`${createImage(movie?movie.poster_path:null,"reservation-card__poster",`Póster de ${titleText}`,"Póster no disponible")}<div class="reservation-card__information"><p class="movie-details__eyebrow">${purchase?"Compra":"Reserva"} #${operation.id}</p><h3 class="operation-movie-title"></h3><p><strong>Fecha y hora:</strong> ${fn?`${formatShowtimeDate(fn.date)} · ${fn.time}`:"No disponible"}</p><p><strong>Sala:</strong> ${room?`${room.name} · ${room.type}`:"No disponible"}</p><p><strong>Asientos:</strong> ${seats.map(seat=>`${seat.seatCode} — ${seat.location}`).join(", ")||"No disponibles"}</p><p><strong>Cantidad:</strong> ${operation.quantity}</p><p><strong>Precio unitario:</strong> ${formatShowtimePrice(operation.unitPrice)}</p><p class="reservation-card__total">Total: ${formatShowtimePrice(operation.total)}</p><p><strong>Estado:</strong> ${purchase?"Pagada":reservationStatusLabel(operation.status)}</p><p>${purchase?`<strong>Origen:</strong> ${operation.reservationId?`Reserva #${operation.reservationId}`:"Compra directa"}`:`<strong>Creada:</strong> ${formatReservationCreatedAt(operation.createdAt)}`}</p>${!purchase&&isActiveReservation(operation)?`<div class="reservation-actions"><button class="secondary-action" data-cancel-reservation="${operation.id}" type="button">Cancelar reserva</button><button class="primary-action" data-pay-reservation="${operation.id}" type="button">Pagar</button></div>`:""}</div>`;
        card.querySelector(".operation-movie-title").textContent=titleText;grid.appendChild(card);
    });activateImageFallbacks();
}

async function getOwnedReservation(id){
    if(!currentUser)throw new Error("auth");const response=await fetch(`${LOCAL_API_URL}/reservations/${encodeURIComponent(id)}`);if(!response.ok)throw new Error("missing");const reservation=await response.json();if(!isOwnedReservation(reservation))throw new Error("owner");return reservation;
}
function displayReservationAction(reservation,action,message){
    const pay=action==="pay";moviesContainer.innerHTML=`<section class="reservation-view" aria-labelledby="reservationActionTitle"><p class="movie-details__eyebrow">${pay?"Pago de reserva":"Cancelación"}</p><h2 id="reservationActionTitle">${pay?"Confirmar compra":"¿Seguro que deseas cancelar esta reserva?"}</h2>${message?`<p class="reservation-status" role="alert">${message}</p>`:""}<dl class="reservation-details"><div><dt>Reserva</dt><dd>#${reservation.id}</dd></div><div><dt>Película</dt><dd>${reservation._movieTitle||`TMDB #${reservation.tmdbId}`}</dd></div><div><dt>Fecha</dt><dd>${reservation._functionDate||"No disponible"}</dd></div><div><dt>Hora</dt><dd>${reservation._functionTime||"No disponible"}</dd></div><div><dt>Sala</dt><dd>${reservation._roomText||"No disponible"}</dd></div><div><dt>Asientos</dt><dd>${reservation.seats.map(seat=>seat.seatCode).join(", ")}</dd></div><div><dt>Total</dt><dd>${formatShowtimePrice(reservation.total)}</dd></div></dl><div class="reservation-actions"><button class="secondary-action" data-account-reservations type="button">Volver</button><button class="primary-action" data-confirm-${pay?"pay":"cancel"}="${reservation.id}" type="button">${pay?"Confirmar compra":"Confirmar cancelación"}</button></div></section>`;
}
async function openReservationAction(id,action){try{const reservation=await getOwnedReservation(id);const [fnResponse,roomResponse,movieResponse]=await Promise.all([fetch(`${LOCAL_API_URL}/functions/${reservation.functionId}`),fetch(`${LOCAL_API_URL}/rooms/${reservation.roomId}`),fetch(`https://api.themoviedb.org/3/movie/${reservation.tmdbId}?api_key=${API_KEY}&language=es-ES`)]);if(fnResponse.ok){const fn=await fnResponse.json();reservation._functionDate=formatShowtimeDate(fn.date);reservation._functionTime=fn.time;}if(roomResponse.ok){const room=await roomResponse.json();reservation._roomText=`${room.name} · ${room.type}`;}if(movieResponse.ok)reservation._movieTitle=(await movieResponse.json()).title;if(!isActiveReservation(reservation))return displayReservationAction(reservation,action,reservation.status==="paid"?"Esta reserva ya fue pagada.":"Esta reserva ya fue cancelada.");displayReservationAction(reservation,action);}catch(error){showMessage(error.message==="owner"?"No puedes operar una reserva de otro usuario.":"No pudimos consultar la reserva.","Mis reservas",false);}}
async function validateReservedSeats(reservation){
    const response=await fetch(`${LOCAL_API_URL}/functionSeats?functionId=${encodeURIComponent(reservation.functionId)}`);if(!response.ok)throw Error();const relations=await response.json(),owned=reservation.seats.map(seat=>relations.find(item=>String(item.seatId)===String(seat.seatId)));return {valid:owned.every(item=>item&&item.status==="reserved"),relations:owned};
}
async function payReservation(id){
    try{const reservation=await getOwnedReservation(id);if(!isActiveReservation(reservation))return displayReservationAction(reservation,"pay","Esta reserva no está activa.");const duplicate=await fetch(`${LOCAL_API_URL}/purchases?reservationId=${encodeURIComponent(id)}`);if(!duplicate.ok||((await duplicate.json()).length))return displayReservationAction(reservation,"pay","Esta reserva ya tiene una compra asociada.");const check=await validateReservedSeats(reservation);if(!check.valid)return displayReservationAction(reservation,"pay","Uno o más asientos ya no están disponibles.");const data={userId:currentUser.id,userName:currentUser.name,email:currentUser.email,tmdbId:reservation.tmdbId,functionId:reservation.functionId,roomId:reservation.roomId,quantity:reservation.quantity,seats:reservation.seats,unitPrice:reservation.unitPrice,total:reservation.total,reservationId:reservation.id,status:"paid",createdAt:new Date().toISOString()};const created=await fetch(`${LOCAL_API_URL}/purchases`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});if(!created.ok)throw Error();const updates=await Promise.all(check.relations.map(item=>fetch(`${LOCAL_API_URL}/functionSeats/${item.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:'{"status":"sold"}'})));if(updates.some(response=>!response.ok))throw Error();await fetch(`${LOCAL_API_URL}/reservations/${reservation.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"paid",paidAt:new Date().toISOString()})});loadPurchases();}catch(error){showMessage("No fue posible completar el pago.","Mis reservas",false);}}
async function cancelReservation(id){
    try{const reservation=await getOwnedReservation(id);if(!isActiveReservation(reservation))return displayReservationAction(reservation,"cancel",reservation.status==="paid"?"Esta reserva ya fue pagada.":"Esta reserva ya fue cancelada.");const check=await validateReservedSeats(reservation);if(!check.valid)return displayReservationAction(reservation,"cancel","Los asientos ya no conservan el estado reservado.");const changed=await fetch(`${LOCAL_API_URL}/reservations/${reservation.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"cancelled",cancelledAt:new Date().toISOString()})});if(!changed.ok)throw Error();const updates=await Promise.all(check.relations.map(item=>fetch(`${LOCAL_API_URL}/functionSeats/${item.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:'{"status":"available"}'})));if(updates.some(response=>!response.ok))throw Error();loadReservations();}catch(error){showMessage("No fue posible cancelar la reserva.","Mis reservas",false);}}
myAccountAction.addEventListener("click",function(){closeAccountMenu();displayMyAccount();});
moviesContainer.addEventListener("click",function(event){const pay=event.target.closest("[data-pay-reservation]"),cancel=event.target.closest("[data-cancel-reservation]"),confirmPay=event.target.closest("[data-confirm-pay]"),confirmCancel=event.target.closest("[data-confirm-cancel]");if(pay)openReservationAction(pay.dataset.payReservation,"pay");else if(cancel)openReservationAction(cancel.dataset.cancelReservation,"cancel");else if(confirmPay)payReservation(confirmPay.dataset.confirmPay);else if(confirmCancel)cancelReservation(confirmCancel.dataset.confirmCancel);else if(event.target.closest("[data-account-reservations]"))loadReservations();else if(event.target.closest("[data-account-purchases]"))loadPurchases();else if(event.target.closest("[data-account-logout]"))logoutCurrentUser();else if(event.target.closest("[data-auth-cancel]"))loadHome();});
// PAGO SIMULADO: capa compartida para compra directa y pago de reservas.

function paymentMethodLabel(method){if(method==='transfer')return 'Transferencia bancaria';if(method==='card')return 'Tarjeta débito/crédito';return 'Simulación académica anterior';}
function generatePaymentReference(){return 'MOI-'+new Date().getFullYear()+'-'+String(Date.now()).slice(-6);}
function normalizeColombianPhone(value){const digits=String(value||"").replace(/\D/g,"");return digits.startsWith("57")&&digits.length===12?digits.slice(2):digits;}
function isValidColombianPhone(value){return /^3\d{9}$/.test(normalizeColombianPhone(value));}
function maskPhone(value){const digits=normalizeColombianPhone(value);return digits.length===10?`+57 *** *** ${digits.slice(-4)}`:"número registrado";}
function isValidSimulatedCard(number){const digits=String(number||"").replace(/[\s-]/g,"");if(!/^\d{13,19}$/.test(digits))return false;let sum=0,alternate=false;for(let index=digits.length-1;index>=0;index-=1){let digit=Number(digits[index]);if(alternate){digit*=2;if(digit>9)digit-=9;}sum+=digit;alternate=!alternate;}return sum%10===0;}
function isValidExpiry(value){const match=/^(0[1-9]|1[0-2])\/(\d{2})$/.exec(String(value||"").trim());if(!match)return false;const now=new Date();const year=2000+Number(match[2]);return year>now.getFullYear()||(year===now.getFullYear()&&Number(match[1])>=now.getMonth()+1);}
function paymentError(name,errors){return errors[name]?`<span class="payment-field-error" id="${name}Error">${errors[name]}</span>`:"";}
function escapePaymentHtml(value){return String(value||"").replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[character]);}

function transferPaymentFields(values,errors){
    const banks=["Bancolombia","Davivienda","Banco de Bogotá","BBVA","Nequi","Daviplata","Otro"];
    return `<div class="payment-method-panel"><label for="paymentBank">Banco</label><select id="paymentBank" name="bank"><option value="">Selecciona un banco</option>${banks.map(bank=>`<option value="${bank}" ${values.bank===bank?"selected":""}>${bank}</option>`).join("")}</select>${paymentError("bank",errors)}<label for="transferHolder">Nombre del titular</label><input id="transferHolder" name="holderName" value="${escapePaymentHtml(values.holderName)}" autocomplete="name">${paymentError("holderName",errors)}<label for="holderDocument">Documento del titular</label><input id="holderDocument" name="holderDocument" inputmode="numeric" value="${escapePaymentHtml(values.holderDocument)}">${paymentError("holderDocument",errors)}<label for="transferReference">Número o referencia de transferencia</label><input id="transferReference" name="transferReference" placeholder="TRX-84729163" value="${escapePaymentHtml(values.transferReference)}">${paymentError("transferReference",errors)}<p class="customer-form__help">Ingresa la referencia que aparecería en el comprobante de transferencia. Para este proyecto puedes utilizar una referencia simulada. Nunca solicitamos contraseñas, claves bancarias ni códigos OTP.</p></div>`;
}
function cardPaymentFields(values,errors){
    return `<div class="payment-method-panel"><label for="cardHolder">Nombre del titular</label><input id="cardHolder" name="holderName" autocomplete="cc-name" value="${escapePaymentHtml(values.holderName)}">${paymentError("holderName",errors)}<label for="cardNumber">Número de tarjeta simulada</label><input id="cardNumber" name="cardNumber" inputmode="numeric" autocomplete="cc-number" placeholder="4111 1111 1111 1111">${paymentError("cardNumber",errors)}<div class="payment-card-row"><div><label for="cardExpiry">Fecha de vencimiento</label><input id="cardExpiry" name="expiry" inputmode="numeric" autocomplete="cc-exp" placeholder="12/30">${paymentError("expiry",errors)}</div><div><label for="cardCvv">CVV</label><input id="cardCvv" name="cvv" type="password" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="123">${paymentError("cvv",errors)}</div></div><p class="customer-form__help"><strong>Datos simulados. No introduzcas información bancaria real.</strong> El número completo, vencimiento y CVV no se guardan.</p></div>`;
}
function displayPaymentForm(context,errors,values){
    pendingPaymentContext=context;errors=errors||{};values=values||{};const method=values.paymentMethod||"",isTransfer=method==="transfer",isCard=method==="card",buyer=context.type==="reservation"?currentUser:currentCustomerData;
    moviesContainer.innerHTML=`<section class="reservation-view payment-view" aria-labelledby="paymentTitle"><p class="movie-details__eyebrow">THE MOI CINEMAS</p><h2 id="paymentTitle">Datos de pago</h2><p class="payment-academic-notice"><strong>Pago simulado — Proyecto académico</strong><br>No se procesará dinero real ni se contactará a bancos.</p><form class="customer-form payment-form" id="paymentForm" novalidate><label for="paymentBuyerName">Nombre</label><input id="paymentBuyerName" readonly><label for="paymentBuyerEmail">Correo</label><input id="paymentBuyerEmail" type="email" readonly><label for="paymentPhone">Número de celular</label><input id="paymentPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+57 300 123 4567" value="${escapePaymentHtml(values.phone)}"><span class="customer-form__help">No se enviará un SMS real.</span>${paymentError("phone",errors)}<fieldset><legend>Método de pago</legend><label class="payment-option"><input type="radio" name="paymentMethod" value="transfer" ${isTransfer?"checked":""}> Transferencia bancaria</label><label class="payment-option"><input type="radio" name="paymentMethod" value="card" ${isCard?"checked":""}> Tarjeta débito/crédito simulada</label>${paymentError("paymentMethod",errors)}</fieldset><div id="paymentMethodFields">${isTransfer?transferPaymentFields(values,errors):isCard?cardPaymentFields(values,errors):""}</div><div class="reservation-actions"><button class="secondary-action" id="backFromPayment" type="button">Volver</button><button class="primary-action" type="submit">Continuar al resumen</button></div></form></section>`;document.getElementById("paymentBuyerName").value=buyer.userName||buyer.name;document.getElementById("paymentBuyerEmail").value=buyer.email;
}
function collectPaymentValues(form){const data=new FormData(form);return {paymentMethod:data.get("paymentMethod")||"",phone:String(data.get("phone")||"").trim(),bank:String(data.get("bank")||""),holderName:String(data.get("holderName")||"").trim(),holderDocument:String(data.get("holderDocument")||"").trim(),transferReference:String(data.get("transferReference")||"").trim(),cardNumber:String(data.get("cardNumber")||"").trim(),expiry:String(data.get("expiry")||"").trim(),cvv:String(data.get("cvv")||"").trim()};}
function validatePaymentValues(values){
    const errors={};if(!["transfer","card"].includes(values.paymentMethod))errors.paymentMethod="Selecciona un método de pago.";if(!isValidColombianPhone(values.phone))errors.phone="Ingresa un celular colombiano válido, por ejemplo +57 300 123 4567.";
    if(values.paymentMethod==="transfer"){if(!values.bank)errors.bank="Selecciona un banco.";if(!values.holderName)errors.holderName="Ingresa el nombre del titular.";if(!/^\d{5,15}$/.test(values.holderDocument.replace(/\D/g,"")))errors.holderDocument="Ingresa un documento válido para la simulación.";if(!values.transferReference)errors.transferReference="Ingresa una referencia de transferencia.";}
    if(values.paymentMethod==="card"){if(!values.holderName)errors.holderName="Ingresa el nombre del titular.";if(!isValidSimulatedCard(values.cardNumber))errors.cardNumber="Ingresa un número válido para la simulación.";if(!isValidExpiry(values.expiry))errors.expiry="Ingresa un vencimiento vigente en formato MM/AA.";if(!/^\d{3,4}$/.test(values.cvv))errors.cvv="Ingresa un CVV de 3 o 4 dígitos.";}
    return errors;
}
function getPaymentSummaryContext(){
    if(pendingPaymentContext.type==="reservation"){const reservation=pendingPaymentContext.reservation;return {movieTitle:pendingPaymentContext.movie.title,movieFunction:pendingPaymentContext.movieFunction,room:pendingPaymentContext.room,seats:reservation.seats,quantity:reservation.quantity,unitPrice:reservation.unitPrice,total:reservation.total,userName:currentUser.name,email:currentUser.email};}
    return {movieTitle:currentDetailsMovie?currentDetailsMovie.title:"Película seleccionada",movieFunction:currentSelectedFunction,room:currentSelectedRoom,seats:selectedSeats,quantity:desiredTicketQuantity,unitPrice:currentSelectedFunction.price,total:desiredTicketQuantity*currentSelectedFunction.price,userName:currentCustomerData.userName,email:currentCustomerData.email};
}
function displayPaymentSummary(message){
    const summary=getPaymentSummaryContext(),methodDetail=safePaymentData.paymentMethod==="transfer"?`${safePaymentData.bank} · ${safePaymentData.paymentReference}`:"Tarjeta terminada en **** "+safePaymentData.cardLast4;
    moviesContainer.innerHTML=`<section class="reservation-view payment-summary" aria-labelledby="paymentSummaryTitle"><p class="movie-details__eyebrow">THE MOI CINEMAS</p><h2 id="paymentSummaryTitle">Confirmar compra</h2><p class="payment-academic-notice">Pago simulado — Proyecto académico</p>${message?`<p class="reservation-status" role="status">${message}</p>`:""}<dl class="reservation-details"><div><dt>Película</dt><dd>${summary.movieTitle}</dd></div><div><dt>Sala</dt><dd>${summary.room.name} · ${summary.room.type}</dd></div><div><dt>Fecha</dt><dd>${formatShowtimeDate(summary.movieFunction.date)}</dd></div><div><dt>Hora</dt><dd>${summary.movieFunction.time}</dd></div><div class="reservation-details__wide"><dt>Asientos</dt><dd class="selected-seats-details">${summary.seats.map(seat=>`${seat.seatCode}\nFila ${seat.row||seat.seatCode.charAt(0)}\nNúmero ${seat.number||seat.seatCode.slice(1)}\nUbicación ${seat.location}`).join("\n\n")}</dd></div><div><dt>Cantidad</dt><dd>${summary.quantity}</dd></div><div><dt>Precio unitario</dt><dd>${formatShowtimePrice(summary.unitPrice)}</dd></div><div><dt>Total</dt><dd>${formatShowtimePrice(summary.total)}</dd></div><div><dt>Método de pago</dt><dd>${paymentMethodLabel(safePaymentData.paymentMethod)} · ${methodDetail}</dd></div><div><dt>Referencia THE MOI CINEMAS</dt><dd>${safePaymentData.cinemaReference}</dd></div><div><dt>Datos del comprador</dt><dd><span id="paymentSummaryBuyer"></span><br><span id="paymentSummaryEmail"></span><br>${safePaymentData.phoneMasked}</dd></div></dl><div class="reservation-actions"><button class="secondary-action" id="editPaymentData" type="button">Editar datos</button><button class="primary-action" id="confirmSimulatedPayment" type="button">Confirmar pago</button></div></section>`;document.getElementById("paymentSummaryBuyer").textContent=summary.userName;document.getElementById("paymentSummaryEmail").textContent=summary.email;
}
function handlePaymentSubmit(event){event.preventDefault();const values=collectPaymentValues(event.target),errors=validatePaymentValues(values);if(Object.keys(errors).length)return displayPaymentForm(pendingPaymentContext,errors,values);paymentEditValues=values;const last4=values.cardNumber.replace(/\D/g,"").slice(-4);safePaymentData={paymentMethod:values.paymentMethod,paymentStatus:"approved",paymentReference:values.paymentMethod==="transfer"?values.transferReference:"CARD-"+last4,cinemaReference:generatePaymentReference(),phoneMasked:maskPhone(values.phone)};if(values.paymentMethod==="transfer")safePaymentData.bank=values.bank;else safePaymentData.cardLast4=last4;displayPaymentSummary();}

const handleCustomerOperationBeforePayment=handleCustomerOperation;
handleCustomerOperation=function(operation){
    if(operation!=="purchase")return handleCustomerOperationBeforePayment(operation);const form=document.getElementById("customerForm"),userName=form.elements.userName.value.trim(),email=form.elements.email.value.trim();if(!userName)return displayCustomerForm("El nombre es obligatorio.");if(!email)return displayCustomerForm("El correo electrónico es obligatorio.");if(!form.elements.email.checkValidity()||!isValidEmail(email))return displayCustomerForm("Escribe un correo electrónico válido.");currentCustomerData={userName,email};currentOperationType="purchase";displayPaymentForm({type:"direct"});
};
function displayPaidTicket(operation,context,showNotification){
    const method=paymentMethodLabel(operation.paymentMethod),masked=operation.phoneMasked||"el celular registrado",detail=operation.paymentMethod==="card"&&operation.cardLast4?` · **** ${operation.cardLast4}`:operation.bank?` · ${operation.bank}`:"",cinemaReference=operation.cinemaReference||operation.paymentReference||operation.id;
    moviesContainer.innerHTML=`<section class="reservation-view reservation-confirmation digital-ticket" aria-labelledby="paidTicketTitle"><p class="movie-details__eyebrow">THE MOI CINEMAS</p><p class="reservation-success">✓ Pago aprobado</p><h2 id="paidTicketTitle">Ticket ${cinemaReference}</h2><dl class="reservation-details"><div><dt>Estado</dt><dd><strong>PAGADO</strong></dd></div><div><dt>Película</dt><dd>${context.movieTitle}</dd></div><div><dt>Fecha</dt><dd>${formatShowtimeDate(context.movieFunction.date)}</dd></div><div><dt>Hora</dt><dd>${context.movieFunction.time}</dd></div><div><dt>Sala</dt><dd>${context.room.name} · ${context.room.type}</dd></div><div class="reservation-details__wide"><dt>Asientos</dt><dd class="selected-seats-details">${operation.seats.map(seat=>`${seat.seatCode} — Fila ${seat.row||seat.seatCode.charAt(0)} — Número ${seat.number||seat.seatCode.slice(1)} — ${seat.location}`).join("\n")}</dd></div><div><dt>Cantidad</dt><dd>${operation.quantity}</dd></div><div><dt>Precio unitario</dt><dd>${formatShowtimePrice(operation.unitPrice)}</dd></div><div><dt>Total</dt><dd>${formatShowtimePrice(operation.total)}</dd></div><div><dt>Método</dt><dd>${method}${detail}</dd></div><div><dt>Referencia de pago</dt><dd>${operation.paymentReference||"Compra anterior"}</dd></div><div><dt>Referencia THE MOI CINEMAS</dt><dd>${cinemaReference}</dd></div><div><dt>Usuario</dt><dd><span id="ticketBuyerName"></span><br><span id="ticketBuyerEmail"></span></dd></div></dl>${showNotification?`<aside class="mobile-notification" id="mobilePurchaseNotification" aria-label="Notificación simulada"><button class="mobile-notification__close" id="closeMobileNotification" type="button" aria-label="Cerrar notificación">×</button><p class="mobile-notification__brand">THE MOI CINEMAS</p><strong>✓ Compra confirmada</strong><span>${context.movieTitle}</span><span>${operation.quantity} ${operation.quantity===1?"entrada":"entradas"}</span><span>Total: ${formatShowtimePrice(operation.total)}</span><span>Referencia: ${cinemaReference}</span><span>Confirmación simulada enviada a ${masked}</span></aside>`:""}<div class="reservation-actions"><button class="secondary-action" id="backToMovies" type="button">Volver a cartelera</button><button class="primary-action" data-account-purchases type="button">Ver mis compras</button></div></section>`;document.getElementById("ticketBuyerName").textContent=operation.userName;document.getElementById("ticketBuyerEmail").textContent=operation.email;
}
async function createDirectSimulatedPurchase(){
    const validation=await revalidateSelectedSeats();if(!validation.available)throw new Error("Los asientos seleccionados ya no están disponibles.");const context=getPaymentSummaryContext();const data={userId:currentUser.id,userName:currentCustomerData.userName,email:currentCustomerData.email,tmdbId:currentSelectedFunction.tmdbId,functionId:currentSelectedFunction.id,roomId:currentSelectedFunction.roomId,quantity:desiredTicketQuantity,seats:selectedSeats.map(seat=>({seatId:seat.seatId,seatCode:seat.seatCode,row:seat.row,number:seat.number,location:seat.location})),unitPrice:currentSelectedFunction.price,total:desiredTicketQuantity*currentSelectedFunction.price,status:"paid",paymentMethod:safePaymentData.paymentMethod,paymentStatus:"approved",paymentReference:safePaymentData.paymentReference,cinemaReference:safePaymentData.cinemaReference,phoneMasked:safePaymentData.phoneMasked,createdAt:new Date().toISOString()};if(safePaymentData.bank)data.bank=safePaymentData.bank;if(safePaymentData.cardLast4)data.cardLast4=safePaymentData.cardLast4;const response=await fetch(`${LOCAL_API_URL}/purchases`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});if(!response.ok)throw new Error("No se pudo registrar la compra.");const operation=await response.json();const relations=currentFunctionSeats.filter(item=>selectedSeats.some(seat=>String(seat.seatId)===String(item.seatId)));const updates=await Promise.all(relations.map(item=>fetch(`${LOCAL_API_URL}/functionSeats/${item.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"sold"})})));if(relations.length!==selectedSeats.length||updates.some(response=>!response.ok))throw new Error("La compra se registró, pero no se actualizaron todos los asientos.");operationRecordCreated=true;paymentEditValues=null;clearTemporaryReservationState();displayPaidTicket(operation,context,true);
}
async function createReservedSimulatedPurchase(){
    const reservation=await getOwnedReservation(pendingPaymentContext.reservation.id);if(!isActiveReservation(reservation))throw new Error("La reserva ya no está activa.");const duplicate=await fetch(`${LOCAL_API_URL}/purchases?reservationId=${encodeURIComponent(reservation.id)}`);if(!duplicate.ok||(await duplicate.json()).length)throw new Error("Esta reserva ya tiene una compra asociada.");const check=await validateReservedSeats(reservation);if(!check.valid)throw new Error("Uno o más asientos ya no conservan la reserva.");const context=getPaymentSummaryContext();const data={userId:currentUser.id,userName:currentUser.name,email:currentUser.email,tmdbId:reservation.tmdbId,functionId:reservation.functionId,roomId:reservation.roomId,quantity:reservation.quantity,seats:reservation.seats,unitPrice:reservation.unitPrice,total:reservation.total,reservationId:reservation.id,status:"paid",paymentMethod:safePaymentData.paymentMethod,paymentStatus:"approved",paymentReference:safePaymentData.paymentReference,cinemaReference:safePaymentData.cinemaReference,phoneMasked:safePaymentData.phoneMasked,createdAt:new Date().toISOString()};if(safePaymentData.bank)data.bank=safePaymentData.bank;if(safePaymentData.cardLast4)data.cardLast4=safePaymentData.cardLast4;const created=await fetch(`${LOCAL_API_URL}/purchases`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});if(!created.ok)throw new Error("No se pudo registrar la compra.");const operation=await created.json();const updates=await Promise.all(check.relations.map(item=>fetch(`${LOCAL_API_URL}/functionSeats/${item.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"sold"})})));if(updates.some(response=>!response.ok))throw new Error("No se actualizaron todos los asientos.");const changed=await fetch(`${LOCAL_API_URL}/reservations/${reservation.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"paid",paidAt:new Date().toISOString()})});if(!changed.ok)throw new Error("No se pudo cerrar la reserva.");paymentEditValues=null;displayPaidTicket(operation,context,true);
}
async function prevalidatePaymentSeats(){if(pendingPaymentContext.type!=="reservation"){const validation=await revalidateSelectedSeats();if(!validation.available)throw new Error("Los asientos seleccionados ya no están disponibles.");return;}const reservation=await getOwnedReservation(pendingPaymentContext.reservation.id);if(!isActiveReservation(reservation))throw new Error("La reserva ya no está activa.");const check=await validateReservedSeats(reservation);if(!check.valid)throw new Error("Uno o más asientos ya no conservan la reserva.");}
async function confirmSimulatedPayment(){if(simulatedPaymentInProgress)return;simulatedPaymentInProgress=true;const button=document.getElementById("confirmSimulatedPayment");if(button)button.disabled=true;try{await prevalidatePaymentSeats();displayPaymentSummary("Procesando pago...");const processingButton=document.getElementById("confirmSimulatedPayment");if(processingButton)processingButton.disabled=true;await new Promise(resolve=>setTimeout(resolve,700));if(pendingPaymentContext.type==="reservation")await createReservedSimulatedPurchase();else await createDirectSimulatedPurchase();}catch(error){console.error("No se pudo aprobar el pago simulado:",error);displayPaymentSummary(error.message||"No fue posible completar el pago.");}finally{simulatedPaymentInProgress=false;}}

payReservation=async function(id){
    try{const reservation=await getOwnedReservation(id);if(!isActiveReservation(reservation))return displayReservationAction(reservation,"pay","Esta reserva no está activa.");const duplicate=await fetch(`${LOCAL_API_URL}/purchases?reservationId=${encodeURIComponent(id)}`);if(!duplicate.ok||(await duplicate.json()).length)return displayReservationAction(reservation,"pay","Esta reserva ya tiene una compra asociada.");const [functionResponse,roomResponse,movieResponse]=await Promise.all([fetch(`${LOCAL_API_URL}/functions/${reservation.functionId}`),fetch(`${LOCAL_API_URL}/rooms/${reservation.roomId}`),fetchTmdbMovieDetails(reservation.tmdbId)]);if(!functionResponse.ok||!roomResponse.ok)throw new Error();const movieFunction=await functionResponse.json(),room=await roomResponse.json();reservation._movieTitle=movieResponse.title;reservation._functionDate=formatShowtimeDate(movieFunction.date);reservation._functionTime=movieFunction.time;reservation._roomText=`${room.name} · ${room.type}`;displayPaymentForm({type:"reservation",reservation,movieFunction,room,movie:movieResponse});}catch(error){console.error("No se pudo iniciar el pago de la reserva:",error);showMessage("No fue posible iniciar el pago de la reserva.","Mis reservas",false);}
};

moviesContainer.addEventListener("change",function(event){if(event.target.name!=="paymentMethod")return;const form=document.getElementById("paymentForm");if(!form)return;const values=collectPaymentValues(form);displayPaymentForm(pendingPaymentContext,{},values);});
moviesContainer.addEventListener("submit",function(event){if(event.target.id==="paymentForm")handlePaymentSubmit(event);});
moviesContainer.addEventListener("click",function(event){
    if(event.target.id==="backFromPayment"){if(pendingPaymentContext.type==="reservation")displayReservationAction(pendingPaymentContext.reservation,"pay");else displayCustomerForm();return;}
    if(event.target.id==="editPaymentData"){displayPaymentForm(pendingPaymentContext,{},paymentEditValues||{});return;}
    if(event.target.id==="confirmSimulatedPayment"){confirmSimulatedPayment();return;}
    if(event.target.id==="closeMobileNotification"){const notification=document.getElementById("mobilePurchaseNotification");if(notification)notification.remove();return;}
    const ticketButton=event.target.closest("[data-view-purchase-ticket]");if(ticketButton){const context=purchaseTicketContexts.get(String(ticketButton.dataset.viewPurchaseTicket));if(context)displayPaidTicket(context.operation,context,false);}
});

const displayOperationsBeforePayment=displayOperations;
displayOperations=function(operations,movieFunctions,rooms,moviesById,type){
    if(type!=="purchase")return displayOperationsBeforePayment(operations,movieFunctions,rooms,moviesById,type);const title="Mis compras";purchaseTicketContexts=new Map();if(!operations.length){moviesContainer.innerHTML=`${createSectionHeading(title,false)}<div class="reservations-empty"><p>Todavía no hay compras registradas.</p><button class="primary-action" id="viewMoviesFromReservations" type="button">Ver cartelera</button></div>`;return;}moviesContainer.innerHTML=`${createSectionHeading(title,false)}<div class="reservations-grid" id="reservationsGrid"></div>`;const grid=document.getElementById("reservationsGrid");operations.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).forEach(operation=>{const movieFunction=movieFunctions.find(item=>String(item.id)===String(operation.functionId)),room=rooms.find(item=>String(item.id)===String(operation.roomId)),movie=moviesById[String(operation.tmdbId)],movieTitle=movie?movie.title:"Película no disponible",seats=Array.isArray(operation.seats)?operation.seats:[],method=operation.paymentMethod?paymentMethodLabel(operation.paymentMethod):"Simulación anterior",reference=operation.cinemaReference||operation.paymentReference||String(operation.id),origin=operation.reservationId?`Reserva #${operation.reservationId}`:"Compra directa";purchaseTicketContexts.set(String(operation.id),{operation,movieTitle,movieFunction:movieFunction||{date:"",time:"No disponible"},room:room||{name:"Sala no disponible",type:""}});const card=document.createElement("article");card.className="reservation-card";card.innerHTML=`${createImage(movie?movie.poster_path:null,"reservation-card__poster",`Póster de ${movieTitle}`,"Póster no disponible")}<div class="reservation-card__information"><p class="movie-details__eyebrow">Compra ${reference}</p><h3 class="operation-movie-title"></h3><p><strong>Fecha:</strong> ${movieFunction?`${formatShowtimeDate(movieFunction.date)} · ${movieFunction.time}`:"No disponible"}</p><p><strong>Sala:</strong> ${room?`${room.name} · ${room.type}`:"No disponible"}</p><p><strong>Asientos:</strong> ${seats.map(seat=>`${seat.seatCode} — ${seat.location}`).join(", ")||"No disponibles"}</p><p><strong>Cantidad:</strong> ${operation.quantity}</p><p><strong>Total:</strong> ${formatShowtimePrice(operation.total)}</p><p><strong>Estado:</strong> PAGADO</p><p><strong>Método:</strong> ${method}</p><p><strong>Referencia:</strong> ${reference}</p><p><strong>Origen:</strong> ${origin}</p><button class="secondary-action" data-view-purchase-ticket="${operation.id}" type="button">Ver ticket</button></div>`;card.querySelector(".operation-movie-title").textContent=movieTitle;grid.appendChild(card);});activateImageFallbacks();
};

const loadMovieRatingsWithoutSession=loadMovieRatings;
loadMovieRatings=async function(tmdbId){const ratings=await loadMovieRatingsWithoutSession(tmdbId);const form=document.getElementById("ratingForm");if(form&&currentUser){form.elements.userName.value=currentUser.name;form.elements.email.value=currentUser.email;form.elements.userName.readOnly=true;form.elements.email.readOnly=true;}return ratings;};
async function saveMovieRating(event){event.preventDefault();if(!currentUser)return showAuthenticationRequired();if(ratingSaveInProgress||!currentDetailsMovie)return;const feedback=document.getElementById("ratingFeedback");if(!isValidRatingValue(selectedMovieRating)){feedback.textContent="Selecciona una valoración entre 1 y 5 estrellas.";return;}ratingSaveInProgress=true;try{const email=currentUser.email,tmdbId=currentDetailsMovie.id;const lookup=await fetch(`${LOCAL_API_URL}/ratings?tmdbId=${tmdbId}&email=${encodeURIComponent(email)}`);if(!lookup.ok)throw Error();const existing=(await lookup.json())[0];const payload={userId:currentUser.id,tmdbId,userName:currentUser.name,email,rating:selectedMovieRating,createdAt:new Date().toISOString()};const response=await fetch(existing?`${LOCAL_API_URL}/ratings/${existing.id}`:`${LOCAL_API_URL}/ratings`,{method:existing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});if(!response.ok)throw Error();feedback.textContent=existing?"Valoración actualizada.":"Valoración guardada.";await loadMovieRatings(tmdbId);}catch(error){feedback.textContent="No fue posible guardar la valoración.";}finally{ratingSaveInProgress=false;const button=document.getElementById("saveMovieRating");if(button){button.disabled=false;button.textContent="Guardar valoración";}}}
