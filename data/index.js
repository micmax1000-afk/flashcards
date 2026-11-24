// data/index.js — Entry point per i mazzi di vocabolario
// Supporta sia import statico che dynamic import per lazy-loading

// Mappa delle lingue disponibili con metadati
export const DECK_METADATA = [
  { id: "en", name: "Inglese", flag: "🇬🇧", lang: "en-US", file: "./en.js" },
  { id: "es", name: "Spagnolo", flag: "🇪🇸", lang: "es-ES", file: "./es.js" },
  { id: "fr", name: "Francese", flag: "🇫🇷", lang: "fr-FR", file: "./fr.js" },
  { id: "de", name: "Tedesco", flag: "🇩🇪", lang: "de-DE", file: "./de.js" },
];

// Cache per i mazzi già caricati
const deckCache = new Map();

/**
 * Carica un mazzo in modo asincrono (lazy-loading)
 * @param {string} langId - ID della lingua (es. "en", "es", "fr", "de")
 * @returns {Promise<Object>} Il mazzo completo con carte
 */
export async function loadDeck(langId) {
  // Controlla cache
  if (deckCache.has(langId)) {
    return deckCache.get(langId);
  }

  // Trova i metadati
  const meta = DECK_METADATA.find((d) => d.id === langId);
  if (!meta) {
    throw new Error(`Mazzo non trovato: ${langId}`);
  }

  try {
    // Dynamic import del file della lingua
    const module = await import(meta.file);
    const deck = module.deck;

    // Valida struttura
    if (!deck || !Array.isArray(deck.cards)) {
      throw new Error(`Struttura mazzo non valida per ${langId}`);
    }

    // Aggiungi metadati se mancanti
    deck.id = deck.id || meta.id;
    deck.name = deck.name || meta.name;
    deck.flag = deck.flag || meta.flag;
    deck.lang = deck.lang || meta.lang;

    // Cache
    deckCache.set(langId, deck);
    return deck;
  } catch (error) {
    console.error(`Errore caricamento mazzo ${langId}:`, error);
    throw error;
  }
}

/**
 * Carica tutti i mazzi disponibili
 * @returns {Promise<Array>} Array di tutti i mazzi
 */
export async function loadAllDecks() {
  const promises = DECK_METADATA.map((meta) => loadDeck(meta.id));
  return Promise.all(promises);
}

/**
 * Ottiene i metadati di tutti i mazzi (senza caricare le carte)
 * @returns {Array} Metadati dei mazzi
 */
export function getDeckMetadata() {
  return DECK_METADATA;
}

/**
 * Controlla se un mazzo è già in cache
 * @param {string} langId
 * @returns {boolean}
 */
export function isDeckCached(langId) {
  return deckCache.has(langId);
}

/**
 * Svuota la cache
 */
export function clearDeckCache() {
  deckCache.clear();
}

// Export di default per compatibilità
export default {
  DECK_METADATA,
  loadDeck,
  loadAllDecks,
  getDeckMetadata,
  isDeckCached,
  clearDeckCache,
};