const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const db = JSON.parse(fs.readFileSync(path.join(root, 'db', 'db.json'), 'utf8'));
const appSource = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const errors = [];

// No modifica db.json: acumula todos los errores para informarlos juntos.
const requiredCollections = ['billboard', 'functions', 'rooms', 'seats', 'functionSeats', 'users', 'reservations', 'purchases', 'ratings'];
for (const name of requiredCollections) {
  if (!Array.isArray(db[name])) errors.push(`La colección ${name} no existe o no es un arreglo.`);
}

function idsOf(collection) {
  return new Set((collection || []).map((item) => String(item.id)));
}

function validateUniqueIds(name) {
  const ids = (db[name] || []).map((item) => String(item.id));
  if (ids.length !== new Set(ids).size) errors.push(`${name} contiene identificadores duplicados.`);
}

for (const name of requiredCollections) validateUniqueIds(name);

const billboardMovies = new Set(db.billboard.map((item) => String(item.tmdbId)));
const functionIds = idsOf(db.functions);
const roomIds = idsOf(db.rooms);
const seatIds = idsOf(db.seats);
const usersById = idsOf(db.users);
const seatsById = new Map(db.seats.map((seat) => [String(seat.id), seat]));
const functionsById = new Map(db.functions.map((fn) => [String(fn.id), fn]));
const allowedSeatStates = new Set(['available', 'reserved', 'sold']);

for (const fn of db.functions) {
  // Relaciona película, sala, horario, duración y precio de cada función.
  if (!billboardMovies.has(String(fn.tmdbId))) errors.push(`La función ${fn.id} apunta a una película fuera de billboard.`);
  if (!roomIds.has(String(fn.roomId))) errors.push(`La función ${fn.id} apunta a una sala inexistente.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fn.date || '')) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(fn.time || ''))) errors.push(`La función ${fn.id} no tiene una fecha y hora válidas.`);
  if (!Number.isInteger(Number(fn.durationMinutes)) || Number(fn.durationMinutes) < 30 || Number(fn.durationMinutes) > 360) errors.push(`La función ${fn.id} debe tener una duración entre 30 y 360 minutos.`);
  if (!Number.isFinite(Number(fn.price)) || Number(fn.price) <= 0) errors.push(`La función ${fn.id} tiene un precio inválido.`);
}

const functionSeatKeys = new Set();
for (const relation of db.functionSeats) {
  // Una relación representa un asiento concreto dentro de una función concreta.
  const fn = functionsById.get(String(relation.functionId));
  const seat = seatsById.get(String(relation.seatId));
  if (!fn) errors.push(`functionSeats ${relation.id} apunta a una función inexistente.`);
  if (!seat) errors.push(`functionSeats ${relation.id} apunta a un asiento inexistente.`);
  if (!allowedSeatStates.has(relation.status)) errors.push(`functionSeats ${relation.id} tiene un estado inválido.`);
  if (relation.operationToken) errors.push(`functionSeats ${relation.id} conserva un bloqueo incompleto (${relation.operationToken}).`);
  if (fn && seat && String(fn.roomId) !== String(seat.roomId)) errors.push(`functionSeats ${relation.id} relaciona una función y un asiento de salas diferentes.`);
  const relationKey = `${relation.functionId}:${relation.seatId}`;
  if (functionSeatKeys.has(relationKey)) errors.push(`Existe más de un estado para la función ${relation.functionId} y el asiento ${relation.seatId}.`);
  functionSeatKeys.add(relationKey);
}

for (const [name, records] of [['reservations', db.reservations], ['purchases', db.purchases]]) {
  // Comprueba propietario, función, sala, asientos, cantidad y total económico.
  for (const record of records) {
    const fn = functionsById.get(String(record.functionId));
    if (!functionIds.has(String(record.functionId))) errors.push(`${name} ${record.id} apunta a una función inexistente.`);
    if (!roomIds.has(String(record.roomId))) errors.push(`${name} ${record.id} apunta a una sala inexistente.`);
    if (!record.userId || !usersById.has(String(record.userId))) errors.push(`${name} ${record.id} apunta a un usuario inexistente.`);
    if (fn && (String(fn.roomId) !== String(record.roomId) || String(fn.tmdbId) !== String(record.tmdbId))) errors.push(`${name} ${record.id} no coincide con la película o sala de su función.`);
    if (!Array.isArray(record.seats) || record.seats.length !== Number(record.quantity)) errors.push(`${name} ${record.id} no coincide con su cantidad de asientos.`);
    if (!Number.isInteger(Number(record.quantity)) || Number(record.quantity) < 1) errors.push(`${name} ${record.id} tiene una cantidad inválida.`);
    if (!Number.isFinite(Number(record.unitPrice)) || Number(record.unitPrice) <= 0 || Number(record.total) !== Number(record.quantity) * Number(record.unitPrice)) errors.push(`${name} ${record.id} tiene un total incoherente.`);
    if (name === 'reservations' && !['active', 'confirmed', 'paid', 'cancelled'].includes(record.status)) errors.push(`La reserva ${record.id} tiene un estado inválido.`);
    if (name === 'purchases' && record.status !== 'paid') errors.push(`La compra ${record.id} debe tener estado paid.`);
    for (const seat of record.seats || []) {
      if (!seatIds.has(String(seat.seatId))) errors.push(`${name} ${record.id} contiene un asiento inexistente.`);
      const physicalSeat = seatsById.get(String(seat.seatId));
      if (physicalSeat && String(physicalSeat.roomId) !== String(record.roomId)) errors.push(`${name} ${record.id} contiene un asiento de otra sala.`);
    }
  }
}

const purchaseReservationIds = new Set();
for (const purchase of db.purchases) {
  if (!purchase.reservationId) continue;
  if (purchaseReservationIds.has(String(purchase.reservationId))) errors.push(`Existe más de una compra para la reserva ${purchase.reservationId}.`);
  purchaseReservationIds.add(String(purchase.reservationId));
  if (!db.reservations.some((reservation) => String(reservation.id) === String(purchase.reservationId))) errors.push(`La compra ${purchase.id} apunta a una reserva inexistente.`);
}

const operationTokens = new Set();
for (const [name, records] of [['reservations', db.reservations], ['purchases', db.purchases]]) {
  for (const record of records) {
    if (!record.operationToken) continue;
    if (operationTokens.has(record.operationToken)) errors.push(`El token de operación ${record.operationToken} está duplicado.`);
    operationTokens.add(record.operationToken);
  }
}

const normalizedUserEmails = new Set();
for (const user of db.users) {
  const email = String(user.email || '').trim().toLowerCase();
  if (!String(user.name || '').trim()) errors.push(`El usuario ${user.id} no tiene nombre.`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`El usuario ${user.id} tiene un correo inválido.`);
  if (String(user.password || '').length < 6) errors.push(`El usuario ${user.id} tiene una contraseña de demostración inválida.`);
  if (normalizedUserEmails.has(email)) errors.push(`Existe más de un usuario con el correo ${email}.`);
  normalizedUserEmails.add(email);
}

const ratingKeys = new Set();
for (const rating of db.ratings) {
  if (!usersById.has(String(rating.userId))) errors.push(`La valoración ${rating.id} apunta a un usuario inexistente.`);
  if (!Number.isInteger(Number(rating.tmdbId)) || Number(rating.tmdbId) <= 0) errors.push(`La valoración ${rating.id} tiene un tmdbId inválido.`);
  if (!Number.isInteger(Number(rating.rating)) || Number(rating.rating) < 1 || Number(rating.rating) > 5) errors.push(`La valoración ${rating.id} debe estar entre 1 y 5.`);
  if (rating.comment !== undefined && typeof rating.comment !== 'string') errors.push(`El comentario de la valoración ${rating.id} debe ser texto.`);
  if (typeof rating.comment === 'string' && (rating.comment.length > 1000 || rating.comment.includes('\u0000'))) errors.push(`El comentario de la valoración ${rating.id} contiene datos inválidos o supera 1000 caracteres.`);
  const ratingUser = db.users.find((user) => String(user.id) === String(rating.userId));
  if (ratingUser && String(rating.email || '').trim().toLowerCase() !== String(ratingUser.email || '').trim().toLowerCase()) errors.push(`La valoración ${rating.id} no coincide con el correo de su usuario.`);
  if (!rating.createdAt || Number.isNaN(new Date(rating.createdAt).getTime())) errors.push(`La valoración ${rating.id} no tiene una fecha de creación válida.`);
  const key = `${rating.userId}:${rating.tmdbId}`;
  if (ratingKeys.has(key)) errors.push(`Existe más de una valoración del usuario ${rating.userId} para TMDB ${rating.tmdbId}.`);
  ratingKeys.add(key);
}
const functionNames = [...appSource.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)].map((match) => match[1]);
const duplicateFunctions = [...new Set(functionNames.filter((name, index) => functionNames.indexOf(name) !== index))];
if (duplicateFunctions.length) errors.push(`Funciones duplicadas en app.js: ${duplicateFunctions.join(', ')}.`);

if (errors.length) {
  console.error('Validación fallida:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Validación completada: sintaxis, colecciones y relaciones consistentes.');
