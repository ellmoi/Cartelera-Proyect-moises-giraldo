class ActorDetails extends HTMLElement {
    set person(value) {
        this._person = value;
        this._state = "ready";
        if (this.isConnected) this.render();
    }

    set imageBase(value) {
        this._imageBase = value;
    }

    set movies(value) {
        this._movies = Array.isArray(value) ? value : [];
        this._moviesState = "ready";
        if (this.isConnected) this.render();
    }

    showMoviesLoading() {
        this._moviesState = "loading";
        if (this.isConnected) this.render();
    }

    showMoviesError() {
        this._moviesState = "error";
        if (this.isConnected) this.render();
    }

    connectedCallback() {
        if (!this._state) this._state = "loading";
        this.render();
    }

    showLoading() {
        this._state = "loading";
        this.render();
    }

    showError() {
        this._state = "error";
        this.render();
    }

    createBackButton() {
        const button = document.createElement("button");
        button.className = "details-back-button actor-details__back";
        button.type = "button";
        button.textContent = "← Volver a la película";
        button.addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("actor-back", { bubbles: true }));
        });
        return button;
    }

    // ======================================================
    // PELÍCULAS DEL ACTOR
    // Recibe créditos preparados por app.js y produce hasta diez <movie-card>.
    // MODIFICAR AQUÍ: los filtros, el orden y el límite pertenecen a app.js;
    // esta función controla únicamente cómo se presentan sus resultados.
    // ======================================================
    createMoviesSection() {
        const section = document.createElement("section");
        section.className = "actor-details__movies";
        section.setAttribute("aria-labelledby", "actorMoviesTitle");
        const title = document.createElement("h3");
        title.id = "actorMoviesTitle";
        title.textContent = "Otras películas en las que participó";
        section.appendChild(title);

        if (this._moviesState === "loading") {
            const status = document.createElement("p");
            status.className = "movies__message actor-details__movies-status";
            status.textContent = "Cargando películas del actor...";
            section.appendChild(status);
            return section;
        }
        if (this._moviesState === "error") {
            const status = document.createElement("p");
            status.className = "movies__message actor-details__movies-status";
            status.setAttribute("role", "alert");
            status.textContent = "No fue posible cargar las películas del actor.";
            section.appendChild(status);
            return section;
        }
        if (!this._movies || this._movies.length === 0) {
            const status = document.createElement("p");
            status.className = "movies__message actor-details__movies-status";
            status.textContent = "No hay otras películas disponibles.";
            section.appendChild(status);
            return section;
        }

        const grid = document.createElement("div");
        grid.className = "movies-grid actor-details__movies-grid";
        this._movies.forEach((movie) => {
            const card = document.createElement("movie-card");
            card.movie = movie;
            card.favorite = Boolean(movie.isFavorite);
            card.setAttribute("return-view", "actor");
            grid.appendChild(card);
        });
        section.appendChild(grid);
        return section;
    }
    // MODIFICAR AQUÍ: recibe persona/estado y produce carga, error o biografia.
    // Cambia esta seccion si el detalle del actor necesita nuevos campos.
    render() {
        this.replaceChildren(this.createBackButton());

        if (this._state === "loading") {
            const message = document.createElement("p");
            message.className = "movies__message actor-details__status";
            message.textContent = "Cargando información del actor...";
            this.appendChild(message);
            return;
        }

        if (this._state === "error" || !this._person) {
            const message = document.createElement("p");
            message.className = "movies__message actor-details__status";
            message.setAttribute("role", "alert");
            message.textContent = "No fue posible cargar la información del actor.";
            this.appendChild(message);
            return;
        }

        const person = this._person;
        const unavailable = "Información no disponible";
        const article = document.createElement("article");
        article.className = "actor-details";

        const visual = document.createElement("div");
        visual.className = "actor-details__visual";
        if (person.profile_path && this._imageBase) {
            const image = document.createElement("img");
            image.className = "actor-details__photo";
            image.src = `${this._imageBase}${person.profile_path}`;
            image.alt = `Fotografía de ${person.name || "actor"}`;
            visual.appendChild(image);
        } else {
            const placeholder = document.createElement("div");
            placeholder.className = "actor-details__photo image-placeholder";
            placeholder.setAttribute("role", "img");
            placeholder.setAttribute("aria-label", "Fotografía no disponible");
            placeholder.textContent = "Fotografía no disponible";
            visual.appendChild(placeholder);
        }

        const information = document.createElement("div");
        information.className = "actor-details__information";
        const eyebrow = document.createElement("p");
        eyebrow.className = "movie-details__eyebrow";
        eyebrow.textContent = "Reparto";
        const title = document.createElement("h2");
        title.textContent = person.name || unavailable;
        information.append(eyebrow, title);

        const facts = [
            ["Fecha de nacimiento", person.birthday || unavailable],
            ["Lugar de nacimiento", person.place_of_birth || unavailable],
            ["Profesión conocida", person.known_for_department || unavailable]
        ];
        const list = document.createElement("dl");
        list.className = "actor-details__facts";
        facts.forEach(([label, value]) => {
            const group = document.createElement("div");
            const term = document.createElement("dt");
            term.textContent = label;
            const description = document.createElement("dd");
            description.textContent = value;
            group.append(term, description);
            list.appendChild(group);
        });

        const biographyTitle = document.createElement("h3");
        biographyTitle.textContent = "Biografía";
        const biography = document.createElement("p");
        biography.className = "actor-details__biography";
        biography.textContent = person.biography?.trim() || unavailable;
        information.append(list, biographyTitle, biography);
        article.append(visual, information);
        this.appendChild(article);
        this.appendChild(this.createMoviesSection());
    }
}

customElements.define("actor-details", ActorDetails);
