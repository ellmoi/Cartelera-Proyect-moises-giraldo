class ActorCard extends HTMLElement {
    set actor(value) {
        this._actor = value;
        if (this.isConnected) this.render();
    }

    connectedCallback() {
        this.render();
    }

    // MODIFICAR AQUÍ: este render recibe el actor y produce su tarjeta y el
    // evento actor-select. Revisa esta seccion para cambiar datos del reparto.
    render() {
        const actor = this._actor;
        if (!actor) return;

        const button = document.createElement("button");
        button.className = "actor-card__button";
        button.type = "button";
        button.setAttribute("aria-label", `Ver información de ${actor.name || "actor"}`);

        if (actor.profileUrl) {
            const image = document.createElement("img");
            image.className = "cast-card__photo";
            image.src = actor.profileUrl;
            image.alt = `Fotografía de ${actor.name || "actor"}`;
            button.appendChild(image);
        } else {
            const placeholder = document.createElement("div");
            placeholder.className = "cast-card__photo image-placeholder";
            placeholder.setAttribute("role", "img");
            placeholder.setAttribute("aria-label", "Fotografía no disponible");
            placeholder.textContent = "Fotografía no disponible";
            button.appendChild(placeholder);
        }

        const information = document.createElement("div");
        information.className = "cast-card__information";
        const name = document.createElement("h4");
        name.dataset.personId = String(actor.id);
        name.textContent = actor.name || "Nombre no disponible";
        const character = document.createElement("p");
        character.textContent = actor.character || "Personaje no disponible";
        information.append(name, character);
        button.appendChild(information);

        button.addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("actor-select", {
                bubbles: true,
                detail: { actorId: actor.id }
            }));
        });

        this.replaceChildren(button);
    }
}

customElements.define("actor-card", ActorCard);
