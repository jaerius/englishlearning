// Version 2 keeps the version 1 recording store and adds learning data.
const DB_NAME = 'lingo-loop-audio';
const DB_VERSION = 2;
const RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
const LEGACY_CARDS = 'lingo-loop-cards-fsrs-v1';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('recordings')) db.createObjectStore('recordings', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('cards')) db.createObjectStore('cards', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('reviews')) db.createObjectStore('reviews', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Storage upgrade blocked by another open tab'));
  });
}

async function transact(storeNames, mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let result;
    const transaction = db.transaction(storeNames, mode);
    try { result = action(transaction); } catch (error) { transaction.abort(); db.close(); reject(error); return; }
    transaction.oncomplete = () => { db.close(); resolve(result); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error('Storage transaction aborted')); };
  });
}

async function read(storeName, method, ...args) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName)[method](...args);
    let value;
    request.onsuccess = () => { value = request.result; };
    tx.oncomplete = () => { db.close(); resolve(value); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

function validCard(card) { return card && typeof card.id === 'string' && typeof card.front === 'string' && typeof card.back === 'string' && card.fsrs && !Number.isNaN(Date.parse(card.fsrs.dueAt)); }

export async function listCards() {
  const cards = await read('cards', 'getAll');
  if (cards.length) return cards;
  let legacy;
  try { legacy = JSON.parse(localStorage.getItem(LEGACY_CARDS) || 'null'); } catch { legacy = null; }
  if (Array.isArray(legacy) && legacy.length && legacy.every(validCard)) {
    await replaceCards(legacy);
    localStorage.removeItem(LEGACY_CARDS);
    return legacy;
  }
  return [];
}

export async function replaceCards(cards) {
  if (!Array.isArray(cards) || !cards.every(validCard)) throw new TypeError('Invalid card data');
  await transact(['cards'], 'readwrite', tx => {
    const store = tx.objectStore('cards'); store.clear();
    for (const card of cards) store.put(card);
  });
}

export async function saveReview(card, revlog) {
  if (!validCard(card) || !revlog || typeof revlog !== 'object') throw new TypeError('Invalid review');
  const entry = { ...revlog, id: crypto.randomUUID(), cardId: card.id, savedAt: new Date().toISOString() };
  await transact(['cards', 'reviews'], 'readwrite', tx => {
    tx.objectStore('cards').put(card);
    tx.objectStore('reviews').put(entry);
  });
  return entry;
}

export const listReviewLogs = () => read('reviews', 'getAll');

export async function putRecording(blob) {
  if (!(blob instanceof Blob) || blob.size === 0) throw new TypeError('Empty recording');
  const now = Date.now();
  const item = { id: crypto.randomUUID(), createdAt: now, expiresAt: now + RETENTION_MS, blob };
  await transact(['recordings'], 'readwrite', tx => { tx.objectStore('recordings').put(item); });
  return item;
}

export const listRecordings = () => read('recordings', 'getAll');
export const deleteRecording = id => transact(['recordings'], 'readwrite', tx => { tx.objectStore('recordings').delete(id); });
export async function pruneRecordings(now = Date.now()) {
  const items = await listRecordings();
  const expired = items.filter(item => item.expiresAt <= now);
  if (expired.length) await transact(['recordings'], 'readwrite', tx => {
    const store = tx.objectStore('recordings');
    for (const item of expired) store.delete(item.id);
  });
  return items.filter(item => item.expiresAt > now);
}

// Backups contain learning data only. Audio would make exports large and includes private speech.
export async function exportLearningData() {
  const [cards, reviews] = await Promise.all([listCards(), listReviewLogs()]);
  return { format: 'lingo-loop-learning', version: 1, exportedAt: new Date().toISOString(), cards, reviews };
}

export async function importLearningData(backup) {
  if (backup?.format !== 'lingo-loop-learning' || backup.version !== 1 || !Array.isArray(backup.cards) || !backup.cards.every(validCard) || !Array.isArray(backup.reviews) || !backup.reviews.every(item => item && typeof item.id === 'string' && typeof item.cardId === 'string')) throw new TypeError('Invalid learning backup');
  await transact(['cards', 'reviews'], 'readwrite', tx => {
    const cards = tx.objectStore('cards'), reviews = tx.objectStore('reviews');
    cards.clear(); reviews.clear();
    for (const card of backup.cards) cards.put(card);
    for (const item of backup.reviews) reviews.put(item);
  });
}
