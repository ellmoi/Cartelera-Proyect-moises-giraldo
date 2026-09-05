const TMDB_API_KEY = "7d940bf2e9411d225472ea694e9a0c15";
const TMDB_API_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w185";
const LOCAL_API_URL = `http://${window.location.hostname || "localhost"}:3000`;

const elements = {
tableBody: document.querySelector("#functionsTableBody"), resultCount: document.querySelector("#resultCount"),
total: document.querySelector("#totalFunctions"), active: document.querySelector("#activeFunctions"),
cancelled: document.querySelector("#cancelledFunctions"), average: document.querySelector("#averagePrice"),
movieFilter: document.querySelector("#movieFilter"), roomFilter: document.querySelector("#roomFilter"),
dateFilter: document.querySelector("#dateFilter"), statusFilter: document.querySelector("#statusFilter"),
sort: document.querySelector("#sortFunctions"), clearFilters: document.querySelector("#clearFiltersButton"),
notice: document.querySelector("#pageNotice"), dialog: document.querySelector("#functionDialog"),
form: document.querySelector("#functionForm"), formTitle: document.querySelector("#formTitle"),
formMessage: document.querySelector("#formMessage"), tmdbId: document.querySelector("#tmdbId"),
roomId: document.querySelector("#roomId"), date: document.querySelector("#functionDate"),
time: document.querySelector("#functionTime"), price: document.querySelector("#functionPrice"),
functionId: document.querySelector("#functionId"), save: document.querySelector("#saveFunctionButton")
};

let functions = [];
let rooms = [];
const movies = new Map();
const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function localToday() {
const now = new Date();
return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function request(url, options = {}) {
return fetch(url, options).then(async (response) => {
if (!response.ok) throw new Error(`Solicitud rechazada (${response.status})`);
return response.status === 204 ? null : response.json();
});
}

async function fetchMovie(tmdbId, strict = false) {
const key = String(tmdbId);
if (movies.has(key) && !movies.get(key).invalid) return movies.get(key);
try {
const movie = await request(`${TMDB_API_URL}/movie/${encodeURIComponent(key)}?api_key=${TMDB_API_KEY}&language=es-CO`);
if (!movie?.id || !movie?.title) throw new Error("Respuesta inválida de TMDB");
movies.set(key, movie);
return movie;
} catch (error) {
if (strict) throw new Error("No se encontró una película con este identificador.");
const fallback = { id: tmdbId, title: `Película #${tmdbId}`, poster_path: null, invalid: true };
movies.set(key, fallback);
return fallback;
}
}

function normalizedFunction(item) {
return { ...item, roomId: String(item.roomId), tmdbId: Number(item.tmdbId), price: Number(item.price), status: item.status === "cancelled" ? "cancelled" : "active" };
}

async function loadData(message = "") {
setTableMessage("Cargando funciones…");
try {
const [functionData, roomData] = await Promise.all([
request(`${LOCAL_API_URL}/functions`), request(`${LOCAL_API_URL}/rooms`)
]);
functions = functionData.map(normalizedFunction);
rooms = roomData;
populateRooms();
await Promise.all([...new Set(functions.map((item) => item.tmdbId))].map((id) => fetchMovie(id)));
updateView();
if (message) showNotice(message);
} catch (error) {
console.error(error);
setTableMessage("No se pudieron consultar las funciones. Comprueba que JSON Server esté activo en el puerto 3000.");
showNotice("No fue posible conectar con JSON Server.", "error");
}
}

function populateRooms() {
const currentFilter = elements.roomFilter.value;
const currentFormRoom = elements.roomId.value;
elements.roomFilter.replaceChildren(new Option("Todas", ""), ...rooms.map((room) => new Option(room.name, room.id)));
elements.roomId.replaceChildren(new Option("Selecciona una sala", ""), ...rooms.map((room) => new Option(`${room.name} · ${room.type}`, room.id)));
elements.roomFilter.value = currentFilter;
elements.roomId.value = currentFormRoom;
}

function updateView() {
updateStats();
const movieQuery = elements.movieFilter.value.trim().toLocaleLowerCase("es");
const filtered = functions.filter((item) => {
const title = movies.get(String(item.tmdbId))?.title || "";
return (!movieQuery || title.toLocaleLowerCase("es").includes(movieQuery) || String(item.tmdbId).includes(movieQuery))
&& (!elements.roomFilter.value || item.roomId === elements.roomFilter.value)
&& (!elements.dateFilter.value || item.date === elements.dateFilter.value)
&& (!elements.statusFilter.value || item.status === elements.statusFilter.value);
});
sortFunctions(filtered, elements.sort.value);
renderRows(filtered);
}

function sortFunctions(items, option) {
const [field, direction] = option.split("-");
const multiplier = direction === "desc" ? -1 : 1;
items.sort((a, b) => {
if (field === "price") return (a.price - b.price) * multiplier;
if (field === "time") return a.time.localeCompare(b.time) * multiplier;
return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`) * multiplier;
});
}

function updateStats() {
const active = functions.filter((item) => item.status === "active").length;
const totalPrice = functions.reduce((sum, item) => sum + item.price, 0);
elements.total.textContent = functions.length;
elements.active.textContent = active;
elements.cancelled.textContent = functions.length - active;
elements.average.textContent = currency.format(functions.length ? totalPrice / functions.length : 0);
}

function renderRows(items) {
elements.tableBody.replaceChildren();
elements.resultCount.textContent = `${items.length} ${items.length === 1 ? "resultado" : "resultados"}`;
if (!items.length) return setTableMessage("No hay funciones que coincidan con los filtros.");
items.forEach((item) => elements.tableBody.append(createRow(item)));
}

function createRow(item) {
const movie = movies.get(String(item.tmdbId));
const room = rooms.find((candidate) => String(candidate.id) === item.roomId);
const row = document.createElement("tr");
const movieCell = document.createElement("td");
const movieWrapper = document.createElement("div");
movieWrapper.className = "movie-cell";
const poster = movie?.poster_path ? document.createElement("img") : document.createElement("span");
if (movie?.poster_path) { poster.src = `${IMAGE_BASE_URL}${movie.poster_path}`; poster.alt = `Póster de ${movie.title}`; poster.loading = "lazy"; }
else { poster.className = "poster-placeholder"; poster.textContent = "Sin póster"; }
const info = document.createElement("div");
const title = document.createElement("strong"); title.textContent = movie?.title || `Película #${item.tmdbId}`;
const id = document.createElement("small"); id.textContent = `TMDB ${item.tmdbId}${movie?.invalid ? " · no disponible" : ""}`;
info.append(title, id); movieWrapper.append(poster, info); movieCell.append(movieWrapper);
row.append(movieCell, cell(item.date), cell(item.time), cell(room?.name || `Sala ${item.roomId}`), cell(currency.format(item.price)));
const statusCell = document.createElement("td");
const status = document.createElement("span"); status.className = `status status--${item.status}`; status.textContent = item.status === "active" ? "Activa" : "Cancelada"; statusCell.append(status); row.append(statusCell);
const actionCell = document.createElement("td"); actionCell.className = "actions";
actionCell.append(actionButton("Editar", "edit", item.id), actionButton(item.status === "active" ? "Cancelar" : "Activar", "toggle", item.id), actionButton("Eliminar", "delete", item.id, true));
row.append(actionCell); return row;
}

function cell(value) { const element = document.createElement("td"); element.textContent = value; return element; }
function actionButton(label, action, id, danger = false) { const button = document.createElement("button"); button.type = "button"; button.className = `action${danger ? " action--danger" : ""}`; button.dataset.action = action; button.dataset.id = id; button.textContent = label; return button; }
function setTableMessage(message) { elements.tableBody.innerHTML = ""; const row = document.createElement("tr"); const data = cell(message); data.colSpan = 7; data.className = "empty-state"; row.append(data); elements.tableBody.append(row); }
function showNotice(message, type = "success") { elements.notice.textContent = message; elements.notice.dataset.type = type; elements.notice.hidden = false; window.clearTimeout(showNotice.timer); showNotice.timer = window.setTimeout(() => { elements.notice.hidden = true; }, 4500); }
function showFormError(message, field) { elements.formMessage.textContent = message; elements.formMessage.hidden = false; if (field) { field.setAttribute("aria-invalid", "true"); field.focus(); } }

function openCreateForm() {
elements.form.reset(); elements.functionId.value = ""; elements.formTitle.textContent = "Nueva función";
elements.tmdbId.disabled = false; elements.date.min = localToday(); elements.formMessage.hidden = true;
elements.dialog.showModal(); elements.tmdbId.focus();
}

function openEditForm(id) {
const item = functions.find((candidate) => String(candidate.id) === String(id));
if (!item) return;
elements.form.reset(); elements.functionId.value = item.id; elements.tmdbId.value = item.tmdbId;
elements.roomId.value = item.roomId; elements.date.value = item.date; elements.time.value = item.time; elements.price.value = item.price;
elements.tmdbId.disabled = true; elements.date.min = localToday(); elements.formTitle.textContent = "Editar función"; elements.formMessage.hidden = true;
elements.dialog.showModal(); elements.roomId.focus();
}

async function saveFunction(event) {
event.preventDefault();
elements.formMessage.hidden = true; elements.form.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
const id = elements.functionId.value;
const data = { tmdbId: Number(elements.tmdbId.value), roomId: Number(elements.roomId.value), date: elements.date.value, time: elements.time.value, price: Number(elements.price.value) };
if (!Number.isInteger(data.tmdbId) || data.tmdbId <= 0) return showFormError("Escribe un TMDB ID válido.", elements.tmdbId);
if (!data.roomId) return showFormError("Selecciona una sala.", elements.roomId);
if (!data.date) return showFormError("Selecciona una fecha.", elements.date);
if (data.date < localToday()) return showFormError("La fecha no puede ser anterior a la fecha actual.", elements.date);
if (!data.time) return showFormError("Selecciona una hora.", elements.time);
if (!Number.isFinite(data.price) || data.price <= 0) return showFormError("El precio debe ser mayor que cero.", elements.price);
const conflict = functions.some((item) => String(item.id) !== String(id) && item.roomId === String(data.roomId) && item.date === data.date && item.time === data.time);
if (conflict) return showFormError("Ya existe una función en la misma sala, fecha y hora.", elements.time);
elements.save.disabled = true; elements.save.textContent = id ? "Guardando…" : "Comprobando TMDB…";
try {
let movie;
if (id) movie = movies.get(String(data.tmdbId));
else movie = await fetchMovie(data.tmdbId, true);
data.durationMinutes = Number(movie?.runtime) || 0;
if (!id) data.status = "active";
await request(`${LOCAL_API_URL}/functions${id ? `/${encodeURIComponent(id)}` : ""}`, {
method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { roomId: data.roomId, date: data.date, time: data.time, price: data.price } : data)
});
elements.dialog.close(); await loadData(id ? "Función actualizada correctamente." : "Función registrada correctamente.");
} catch (error) { console.error(error); showFormError(error.message.includes("película") ? error.message : "No fue posible guardar la función. Inténtalo de nuevo."); }
finally { elements.save.disabled = false; elements.save.textContent = "Guardar función"; }
}

async function toggleStatus(id) {
const item = functions.find((candidate) => String(candidate.id) === String(id));
if (!item) return;
const next = item.status === "active" ? "cancelled" : "active";
try { await request(`${LOCAL_API_URL}/functions/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) }); await loadData(next === "cancelled" ? "Función cancelada correctamente." : "Función activada correctamente."); }
catch (error) { console.error(error); showNotice("No se pudo cambiar el estado de la función.", "error"); }
}

async function deleteFunction(id) {
if (!window.confirm("¿Está seguro de eliminar esta función?")) return;
try { await request(`${LOCAL_API_URL}/functions/${encodeURIComponent(id)}`, { method: "DELETE" }); await loadData("Función eliminada correctamente."); }
catch (error) { console.error(error); showNotice("No se pudo eliminar la función.", "error"); }
}

document.querySelector("#newFunctionButton").addEventListener("click", openCreateForm);
document.querySelector("#closeDialogButton").addEventListener("click", () => elements.dialog.close());
document.querySelector("#cancelFormButton").addEventListener("click", () => elements.dialog.close());
elements.form.addEventListener("submit", saveFunction);
elements.form.addEventListener("input", (event) => event.target.removeAttribute("aria-invalid"));
[elements.movieFilter, elements.roomFilter, elements.dateFilter, elements.statusFilter, elements.sort].forEach((control) => control.addEventListener("input", updateView));
elements.clearFilters.addEventListener("click", () => { elements.movieFilter.value = ""; elements.roomFilter.value = ""; elements.dateFilter.value = ""; elements.statusFilter.value = ""; elements.sort.value = "date-asc"; updateView(); });
elements.tableBody.addEventListener("click", (event) => { const button = event.target.closest("[data-action]"); if (!button) return; if (button.dataset.action === "edit") openEditForm(button.dataset.id); if (button.dataset.action === "toggle") toggleStatus(button.dataset.id); if (button.dataset.action === "delete") deleteFunction(button.dataset.id); });
elements.dialog.addEventListener("click", (event) => { if (event.target === elements.dialog) elements.dialog.close(); });

elements.date.min = localToday();
loadData();