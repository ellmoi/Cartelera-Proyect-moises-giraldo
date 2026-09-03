class MovieCard extends HTMLElement {
    set movie(value) {
        this._movie = value;
        if (this.isConnected) this.render();
    }

    get movieId() {
        return this._movie ? this._movie.id : null;
    }

    set favorite(value) {
        this._favorite = Boolean(value);
        if (this.isConnected) this.render();
    }

    set favoritePending(value) {
        this._favoritePending = Boolean(value);
        if (this.isConnected) this.render();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const movie = this._movie;
        if (!movie) return;
        const title = String(movie.title || "Película sin título");
        const rating = Number(movie.vote_average || 0).toFixed(1);
        const genres = Array.isArray(movie.genres) && movie.genres.length
            ? movie.genres.slice(0, 2).map((genre) => genre.name).join(", ")
            : "Género no disponible";
        const poster = movie.poster_path
            ? `<img class="movie-card__poster" src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="Póster de ${title}">`
            : `<div class="movie-card__poster image-placeholder" role="img" aria-label="Póster no disponible"><span class="image-placeholder__mark">M</span><span>THE MOI CINEMAS</span><small>Póster no disponible</small></div>`;
        const favoriteText = this._favorite ? "♥ Quitar de Favoritos" : "♡ Agregar a Favoritos";

        this.innerHTML = `
            <article class="movie-card">
                <button class="movie-card__visual" type="button" data-movie-id="${movie.id}" aria-label="Abrir ${title}">
                    ${poster}
                    <span class="movie-card__overlay" aria-hidden="true">
                        <span class="movie-card__overlay-title">${title}</span>
                        <span class="movie-card__genres">${genres}</span>
                        <span class="movie-card__rating"><span aria-hidden="true">★</span> ${rating}</span>
                    </span>
                </button>
                <button class="movie-card__favorite" type="button" aria-pressed="${String(Boolean(this._favorite))}" aria-label="${favoriteText}: ${title}"${this._favoritePending ? " disabled" : ""}>
                    ${favoriteText}
                </button>
                <h3>${title}</h3>
            </article>
        `;

        this.querySelector(".movie-card__visual").addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("movie-select", {
                bubbles: true,
                detail: { movie, returnView: this.getAttribute("return-view") || "list" }
            }));
        });

        this.querySelector(".movie-card__favorite").addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("favorite-toggle", {
                bubbles: true,
                detail: { movieId: movie.id }
            }));
        });
    }
}

customElements.define("movie-card", MovieCard);
