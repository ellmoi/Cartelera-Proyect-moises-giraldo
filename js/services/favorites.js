const pendingToggles = new Set();

function favoriteKey(userId, movieId) {
    return `${userId}:${movieId}`;
}

function exactMatches(records, userId, movieId) {
    return records.filter((record) =>
        String(record.userId) === String(userId)
        && String(record.movieId) === String(movieId)
    );
}

// ======================================================
// COMUNICACION DE FAVORITOS CON JSON SERVER
// ======================================================
export async function fetchUserFavorites(apiUrl, userId) {
    const response = await fetch(`${apiUrl}/favorites?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) throw new Error("No se pudieron consultar los favoritos.");
    return (await response.json()).filter((record) => String(record.userId) === String(userId));
}

export async function toggleUserFavorite(apiUrl, userId, movieId) {
    const key = favoriteKey(userId, movieId);
    if (pendingToggles.has(key)) return null;
    pendingToggles.add(key);

    try {
        const query = `${apiUrl}/favorites?userId=${encodeURIComponent(userId)}&movieId=${encodeURIComponent(movieId)}`;
        const lookup = await fetch(query);
        if (!lookup.ok) throw new Error("No se pudo comprobar el favorito.");
        const existing = exactMatches(await lookup.json(), userId, movieId);

        if (existing.length) {
            const deletions = await Promise.all(existing.map((record) =>
                fetch(`${apiUrl}/favorites/${encodeURIComponent(record.id)}`, { method: "DELETE" })
            ));
            if (deletions.some((response) => !response.ok)) {
                throw new Error("No se pudo quitar la película de favoritos.");
            }
            return { isFavorite: false, record: null };
        }

        const creation = await fetch(`${apiUrl}/favorites`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: String(userId),
                movieId: Number(movieId),
                createdAt: new Date().toISOString()
            })
        });
        if (!creation.ok) throw new Error("No se pudo agregar la película a favoritos.");
        const created = await creation.json();

        // Una segunda lectura conserva un solo registro incluso ante pulsaciones
        // repetidas o dos vistas abiertas simultáneamente.
        const verification = await fetch(query);
        if (!verification.ok) throw new Error("El favorito se creó, pero no pudo verificarse.");
        const matches = exactMatches(await verification.json(), userId, movieId);
        const canonical = matches.find((record) => String(record.id) === String(created.id)) || matches[0];
        const duplicates = matches.filter((record) => String(record.id) !== String(canonical.id));
        await Promise.all(duplicates.map((record) =>
            fetch(`${apiUrl}/favorites/${encodeURIComponent(record.id)}`, { method: "DELETE" })
        ));

        return { isFavorite: true, record: canonical };
    } finally {
        pendingToggles.delete(key);
    }
}
