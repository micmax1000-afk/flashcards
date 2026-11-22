// app.js — Logica dell'app Flashcards

const STORAGE_KEY = "flashcards_progress_v2";
const THEME_KEY = "flashcards_theme_v1";
const STREAK_KEY = "flashcards_streak_v1";
const CUSTOM_CARDS_KEY = "flashcards_custom_v1";
const CUSTOM_DECK_ID = "custom";

// Wrapper sicuro: in alcuni ambienti sandbox (es. anteprima) localStorage
// è bloccato e lancia un errore. Qui si passa a un archivio in memoria,
// così l'app non si blocca — nel file scaricato ed eseguito normalmente
// il salvataggio reale in localStorage funziona senza problemi.
const memoryStore = {};
const safeStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      if (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED") {
        // Spazio pieno: prova a liberare qualcosa, poi salva in memoria come fallback
        try { window.localStorage.clear(); } catch {}
      }
      memoryStore[key] = value;
    }
  },
};
const DAY = 24 * 60 * 60 * 1000;
const LEVEL_INTERVALS_DAYS = [1, 3, 7, 16, 35]; // giorni di attesa dopo aver raggiunto il livello 1..5
const WRONG_RETRY_MS = 10 * 60 * 1000; // 10 minuti prima che una carta sbagliata torni "dovuta"

const screens = {
  home: document.getElementById("home"),
  trainer: document.getElementById("trainer"),
  stats: document.getElementById("stats"),
};

const deckListEl = document.getElementById("deck-list");
const deckTitleEl = document.getElementById("deck-title");
const cardEl = document.getElementById("card");
const frontEl = cardEl.querySelector(".front");
const backEl = cardEl.querySelector(".back");
const knowBtn = document.getElementById("know");
const dontKnowBtn = document.getElementById("dontknow");
const quizBtn = document.getElementById("quiz-mode");
const backBtn = document.getElementById("back");
const statsBackBtn = document.getElementById("stats-back");
const totalCardsEl = document.getElementById("total-cards");
const knownCardsEl = document.getElementById("known-cards");
const accuracyEl = document.getElementById("accuracy");
const themeToggleBtn = document.getElementById("theme-toggle");

let state = {
  deck: null,
  queue: [], // indici delle carte, in ordine di ripasso per questa sessione
  quizMode: false,
  answered: false,
  allCaughtUp: false,
};

// ---------- Persistenza ----------
function loadProgress() {
  try {
    return JSON.parse(safeStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProgress(data) {
  safeStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function ensureDeckEntry(data, deckId) {
  if (!data[deckId]) data[deckId] = { cards: {}, stats: { known: 0, attempts: 0 } };
  if (!data[deckId].cards) data[deckId].cards = {};
  if (!data[deckId].stats) data[deckId].stats = { known: 0, attempts: 0 };
  return data[deckId];
}

// ---------- Streak giornaliero ----------
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadStreak() {
  try {
    return JSON.parse(safeStorage.getItem(STREAK_KEY)) || { streak: 0, longest: 0, lastDate: null };
  } catch {
    return { streak: 0, longest: 0, lastDate: null };
  }
}

function saveStreak(s) {
  safeStorage.setItem(STREAK_KEY, JSON.stringify(s));
}

// Da chiamare quando l'utente risponde ad almeno una carta in giornata.
function registerStudyToday() {
  const s = loadStreak();
  const today = todayStr();
  if (s.lastDate === today) return s; // già contato oggi
  s.streak = s.lastDate === yesterdayStr() ? s.streak + 1 : 1;
  s.longest = Math.max(s.longest || 0, s.streak);
  s.lastDate = today;
  saveStreak(s);
  return s;
}

function updateStreakBadge() {
  const s = loadStreak();
  const lit = s.lastDate === todayStr();
  streakCountEl.textContent = s.streak || 0;
  streakBadgeEl.classList.toggle("lit", lit);
}

// ---------- Parole personalizzate ----------
function loadCustomCards() {
  try {
    return JSON.parse(safeStorage.getItem(CUSTOM_CARDS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCustomCards(cards) {
  safeStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(cards));
}

function getCustomDeck() {
  return { id: CUSTOM_DECK_ID, name: "Le mie parole", flag: "✏️", lang: null, cards: loadCustomCards() };
}

function allDecks() {
  const custom = getCustomDeck();
  return custom.cards.length ? [...DECKS, custom] : [...DECKS];
}

// Modale per aggiungere/rimuovere parole personalizzate
const customModal = document.createElement("div");
customModal.id = "custom-modal";
customModal.className = "modal hidden";
customModal.innerHTML = `
  <div class="modal-card">
    <h2>Le mie parole</h2>
    <div id="custom-list" class="custom-list"></div>
    <div class="custom-form">
      <input id="custom-front" type="text" placeholder="Parola in italiano" />
      <input id="custom-back" type="text" placeholder="Traduzione" />
      <input id="custom-phon" type="text" placeholder="Pronuncia (facoltativa)" />
      <button id="custom-add" class="quiz-btn">+ Aggiungi parola</button>
    </div>
    <div class="custom-bulk">
      <p class="custom-bulk-label">Importa un elenco grande (una parola per riga: <code>italiano = traduzione</code>)</p>
      <textarea id="custom-bulk-text" rows="4" placeholder="casa = house&#10;cane = dog&#10;mangiare = to eat"></textarea>
      <button id="custom-bulk-import" class="quiz-btn">📥 Importa elenco</button>
      <p id="custom-bulk-status" class="custom-bulk-status"></p>
    </div>
    <button id="custom-close" class="back-btn">Chiudi</button>
  </div>
`;
document.body.appendChild(customModal);

const customListEl = document.getElementById("custom-list");
const customFrontInput = document.getElementById("custom-front");
const customBackInput = document.getElementById("custom-back");
const customPhonInput = document.getElementById("custom-phon");

function renderCustomList() {
  const cards = loadCustomCards();
  customListEl.innerHTML = "";
  if (cards.length === 0) {
    customListEl.innerHTML = `<p class="custom-empty">Non hai ancora aggiunto parole tue.</p>`;
    return;
  }
  cards.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "custom-row";
    row.innerHTML = `<span>${c.front} — ${c.back}</span>`;
    const del = document.createElement("button");
    del.className = "custom-del";
    del.textContent = "×";
    del.addEventListener("click", () => {
      const updated = loadCustomCards();
      updated.splice(i, 1);
      saveCustomCards(updated);
      renderCustomList();
    });
    row.appendChild(del);
    customListEl.appendChild(row);
  });
}

document.getElementById("custom-add").addEventListener("click", () => {
  const front = customFrontInput.value.trim();
  const back = customBackInput.value.trim();
  const phon = customPhonInput.value.trim();
  if (!front || !back) return;
  const cards = loadCustomCards();
  cards.push({ front, back, phon: phon || undefined });
  saveCustomCards(cards);
  customFrontInput.value = "";
  customBackInput.value = "";
  customPhonInput.value = "";
  customFrontInput.focus();
  renderCustomList();
});

document.getElementById("custom-close").addEventListener("click", () => {
  customModal.classList.add("hidden");
  renderDeckList();
});

// Importazione in blocco: una riga per parola, "italiano = traduzione[ = pronuncia]"
function parseBulkText(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("=").map((p) => p.trim());
      if (parts.length < 2 || !parts[0] || !parts[1]) return null;
      return { front: parts[0], back: parts[1], phon: parts[2] || undefined };
    })
    .filter(Boolean);
}

document.getElementById("custom-bulk-import").addEventListener("click", () => {
  const textarea = document.getElementById("custom-bulk-text");
  const status = document.getElementById("custom-bulk-status");
  const parsed = parseBulkText(textarea.value);
  if (parsed.length === 0) {
    status.textContent = "Nessuna riga valida trovata. Usa il formato: italiano = traduzione";
    return;
  }
  const cards = loadCustomCards();
  saveCustomCards([...cards, ...parsed]);
  textarea.value = "";
  status.textContent = `✅ Aggiunte ${parsed.length} parole.`;
  renderCustomList();
});

// Bottone per aprire la gestione delle parole personalizzate, in home
const customOpenBtn = document.createElement("button");
customOpenBtn.id = "custom-open";
customOpenBtn.className = "quiz-btn";
customOpenBtn.textContent = "✏️ Aggiungi le tue parole";
document.querySelector("#home").insertBefore(customOpenBtn, deckListEl);
customOpenBtn.addEventListener("click", () => {
  renderCustomList();
  customModal.classList.remove("hidden");
});

function getCardState(deckId, idx) {
  const data = loadProgress();
  const deck = data[deckId];
  if (deck && deck.cards && deck.cards[idx]) return deck.cards[idx];
  return { level: 0, due: 0 }; // due 0 = sempre "dovuta" (carta nuova)
}

// Registra una risposta: aggiorna sia le statistiche sia il livello di ripetizione dilazionata.
function recordAnswer(deckId, idx, correct) {
  const data = loadProgress();
  const entry = ensureDeckEntry(data, deckId);
  entry.stats.attempts += 1;
  if (correct) entry.stats.known += 1;

  const cur = entry.cards[idx] || { level: 0, due: 0 };
  const now = Date.now();
  let next;
  if (correct) {
    const level = Math.min(cur.level + 1, LEVEL_INTERVALS_DAYS.length);
    next = { level, due: now + LEVEL_INTERVALS_DAYS[level - 1] * DAY };
  } else {
    next = { level: 0, due: now + WRONG_RETRY_MS };
  }
  entry.cards[idx] = next;
  saveProgress(data);
  return next;
}

// ---------- Navigazione schermate ----------
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffledIndices(n) {
  return shuffleArray(Array.from({ length: n }, (_, i) => i));
}

function dueIndices(deck) {
  const now = Date.now();
  return deck.cards.map((_, i) => i).filter((i) => getCardState(deck.id, i).due <= now);
}

// Badge streak in home, inserito dinamicamente sotto il sottotitolo
let streakBadgeEl = document.getElementById("streak-badge");
let streakCountEl;
if (!streakBadgeEl) {
  streakBadgeEl = document.createElement("div");
  streakBadgeEl.id = "streak-badge";
  streakBadgeEl.className = "streak-badge";
  streakBadgeEl.innerHTML = `🔥 <span id="streak-count">0</span> giorni di fila`;
  document.querySelector("#home p").insertAdjacentElement("afterend", streakBadgeEl);
}
streakCountEl = document.getElementById("streak-count");

// ---------- Home: elenco mazzi ----------
function renderDeckList() {
  updateStreakBadge();
  const progress = loadProgress();
  deckListEl.innerHTML = "";
  allDecks().forEach((deck) => {
    const p = (progress[deck.id] && progress[deck.id].stats) || { known: 0, attempts: 0 };
    const pct = p.attempts ? Math.round((p.known / p.attempts) * 100) : 0;
    const due = dueIndices(deck).length;

    const item = document.createElement("button");
    item.className = "deck-item";
    item.innerHTML = `
      <span class="deck-flag">${deck.flag}</span>
      <span class="deck-info">
        <span class="deck-name">${deck.name}</span>
        <span class="deck-meta">${deck.cards.length} parole · ${due > 0 ? `${due} da ripassare` : "tutto in regola"}</span>
      </span>
      <span class="deck-bar"><span class="deck-bar-fill" style="width:${pct}%"></span></span>
    `;
    item.addEventListener("click", () => openDeck(deck));
    deckListEl.appendChild(item);
  });
}

// ---------- Trainer ----------
function openDeck(deck) {
  state.deck = deck;
  state.quizMode = false;
  quizBtn.textContent = "Modalità Quiz";
  deckTitleEl.textContent = `${deck.flag} ${deck.name}`;
  showScreen("trainer");
  buildQueue();
  showCard();
}

function buildQueue(ignoreDue) {
  const due = ignoreDue
    ? state.deck.cards.map((_, i) => i)
    : dueIndices(state.deck);
  state.queue = shuffleArray(due);
  state.allCaughtUp = state.queue.length === 0;
}

function currentIndex() {
  return state.queue[0];
}

// ---------- Pronuncia vocale ----------
function speak(text, lang) {
  if (!("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  if (lang) utter.lang = lang;
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);
}

function resetCardVisual() {
  window.speechSynthesis.cancel();
  cardEl.classList.remove("flipped", "correct", "wrong");
  cardEl.style.transition = "none";
  cardEl.style.transform = "";
  const sr = cardEl.querySelector(".swipe-right");
  const sl = cardEl.querySelector(".swipe-left");
  if (sr) sr.style.opacity = 0;
  if (sl) sl.style.opacity = 0;
  const cu = document.getElementById("caught-up-btn");
  if (cu) cu.remove();
  state.answered = false;
}

function showCard() {
  resetCardVisual();

  if (state.allCaughtUp || state.queue.length === 0) {
    if (!state.allCaughtUp) buildQueue(); // ricontrolla: risposte sbagliate potrebbero essere di nuovo dovute
    if (state.queue.length === 0) {
      state.allCaughtUp = true;
      renderCaughtUp();
      return;
    }
  }

  const idx = currentIndex();
  const c = state.deck.cards[idx];

  if (state.quizMode) {
    renderQuiz(c);
  } else {
    renderStudy(c);
  }
}

function renderStudy(c) {
  document.querySelector(".buttons").classList.remove("hidden");
  const existingQuiz = cardEl.querySelector(".quiz-options");
  if (existingQuiz) existingQuiz.remove();
  frontEl.innerHTML = `${c.emoji ? `<span class="card-emoji">${c.emoji}</span>` : ""}${c.front}`;
  backEl.innerHTML = `${c.back}${c.phon ? `<span class="phon">${c.phon}</span>` : ""}`;

  const speakBtn = document.createElement("button");
  speakBtn.className = "speak-btn";
  speakBtn.setAttribute("aria-label", "Ascolta la pronuncia");
  speakBtn.textContent = "🔊";
  speakBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
  speakBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    speak(c.back, state.deck.lang);
  });
  backEl.appendChild(speakBtn);
}

function renderCaughtUp() {
  document.querySelector(".buttons").classList.add("hidden");
  const existingQuiz = cardEl.querySelector(".quiz-options");
  if (existingQuiz) existingQuiz.remove();
  cardEl.classList.add("flipped");
  frontEl.textContent = "";
  backEl.innerHTML = "🎉 Tutto ripassato per ora";

  const btn = document.createElement("button");
  btn.id = "caught-up-btn";
  btn.className = "quiz-btn";
  btn.style.position = "absolute";
  btn.style.bottom = "-52px";
  btn.style.left = "0";
  btn.textContent = "Ripassa comunque tutte le carte";
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    state.allCaughtUp = false;
    buildQueue(true);
    showCard();
  });
  cardEl.appendChild(btn);
}

function renderQuiz(c) {
  document.querySelector(".buttons").classList.add("hidden");
  frontEl.innerHTML = `${c.emoji ? `<span class="card-emoji">${c.emoji}</span>` : ""}${c.front}`;
  backEl.innerHTML = "";
  cardEl.classList.add("flipped"); // il fronte con la domanda resta sempre visibile

  let existingQuiz = cardEl.querySelector(".quiz-options");
  if (existingQuiz) existingQuiz.remove();

  const others = state.deck.cards.filter((x) => x !== c);
  const distractors = shuffledIndices(others.length)
    .slice(0, 3)
    .map((i) => others[i].back);
  const options = shuffleArray([c.back, ...distractors]);

  const wrap = document.createElement("div");
  wrap.className = "quiz-options";
  options.forEach((opt) => {
    const b = document.createElement("button");
    b.className = "quiz-option";
    b.textContent = opt;
    b.addEventListener("click", () => handleQuizAnswer(b, opt === c.back));
    wrap.appendChild(b);
  });
  cardEl.appendChild(wrap);
}

function advanceAfterAnswer(idx, correct) {
  recordAnswer(state.deck.id, idx, correct);
  registerStudyToday();
  updateStreakBadge();
  state.queue.shift();
  if (!correct) {
    // la carta torna a breve nella stessa sessione, per rinforzo immediato
    const pos = Math.min(3, state.queue.length);
    state.queue.splice(pos, 0, idx);
  }
  showCard();
}

function handleQuizAnswer(btn, correct) {
  if (state.answered) return;
  state.answered = true;
  btn.classList.add(correct ? "correct" : "wrong");
  const idx = currentIndex();
  setTimeout(() => advanceAfterAnswer(idx, correct), 700);
}

knowBtn.addEventListener("click", () => advanceAfterAnswer(currentIndex(), true));
dontKnowBtn.addEventListener("click", () => advanceAfterAnswer(currentIndex(), false));

quizBtn.addEventListener("click", () => {
  state.quizMode = !state.quizMode;
  quizBtn.textContent = state.quizMode ? "Modalità Studio" : "Modalità Quiz";
  showCard();
});

backBtn.addEventListener("click", () => {
  renderDeckList();
  showScreen("home");
});

// ---------- Swipe sulla carta (modalità studio) ----------
const swipeRight = document.createElement("div");
swipeRight.className = "swipe-label swipe-right";
swipeRight.textContent = "SO";
const swipeLeft = document.createElement("div");
swipeLeft.className = "swipe-label swipe-left";
swipeLeft.textContent = "NON SO";
cardEl.appendChild(swipeRight);
cardEl.appendChild(swipeLeft);

const SWIPE_THRESHOLD = 90;
const TAP_THRESHOLD = 10;
let drag = { active: false, startX: 0, dx: 0, pointerId: null };

function resetCardPosition(animate) {
  cardEl.style.transition = animate ? "transform 0.3s ease" : "none";
  cardEl.style.transform = "";
  swipeRight.style.opacity = 0;
  swipeLeft.style.opacity = 0;
}

function onPointerDown(e) {
  if (state.quizMode || state.allCaughtUp) return;
  drag.active = true;
  drag.startX = e.clientX;
  drag.dx = 0;
  drag.pointerId = e.pointerId;
  cardEl.setPointerCapture(e.pointerId);
  cardEl.style.transition = "none";
}

function onPointerMove(e) {
  if (!drag.active) return;
  drag.dx = e.clientX - drag.startX;
  const rotate = drag.dx / 14;
  cardEl.style.transform = `translateX(${drag.dx}px) rotate(${rotate}deg)`;
  const ratio = Math.min(Math.abs(drag.dx) / SWIPE_THRESHOLD, 1);
  if (drag.dx > 0) {
    swipeRight.style.opacity = ratio;
    swipeLeft.style.opacity = 0;
  } else {
    swipeLeft.style.opacity = ratio;
    swipeRight.style.opacity = 0;
  }
}

function onPointerUp(e) {
  if (!drag.active) return;
  drag.active = false;
  cardEl.releasePointerCapture(drag.pointerId);

  if (Math.abs(drag.dx) < TAP_THRESHOLD) {
    resetCardPosition(false);
    cardEl.classList.toggle("flipped");
    return;
  }

  if (Math.abs(drag.dx) >= SWIPE_THRESHOLD) {
    const goingRight = drag.dx > 0;
    const flyX = goingRight ? 600 : -600;
    const idx = currentIndex();
    cardEl.style.transition = "transform 0.35s ease";
    cardEl.style.transform = `translateX(${flyX}px) rotate(${flyX / 14}deg)`;
    setTimeout(() => {
      resetCardPosition(false);
      advanceAfterAnswer(idx, goingRight);
    }, 220);
  } else {
    resetCardPosition(true);
  }
}

cardEl.addEventListener("pointerdown", onPointerDown);
cardEl.addEventListener("pointermove", onPointerMove);
cardEl.addEventListener("pointerup", onPointerUp);
cardEl.addEventListener("pointercancel", onPointerUp);

// ---------- Statistiche ----------
let masteredEl = document.getElementById("mastered-cards");
if (!masteredEl) {
  masteredEl = document.createElement("p");
  masteredEl.id = "mastered-cards";
  accuracyEl.insertAdjacentElement("afterend", masteredEl);
}

let streakStatEl = document.getElementById("streak-stat");
if (!streakStatEl) {
  streakStatEl = document.createElement("p");
  streakStatEl.id = "streak-stat";
  masteredEl.insertAdjacentElement("afterend", streakStatEl);
}

function renderStats() {
  const progress = loadProgress();
  let totalCards = 0;
  let known = 0;
  let attempts = 0;
  let mastered = 0;
  allDecks().forEach((deck) => {
    totalCards += deck.cards.length;
    const entry = progress[deck.id];
    if (entry) {
      known += entry.stats.known;
      attempts += entry.stats.attempts;
      Object.values(entry.cards || {}).forEach((c) => {
        if (c.level >= LEVEL_INTERVALS_DAYS.length) mastered += 1;
      });
    }
  });
  const accuracy = attempts ? Math.round((known / attempts) * 100) : 0;
  const s = loadStreak();

  totalCardsEl.textContent = `Parole disponibili: ${totalCards}`;
  knownCardsEl.textContent = `Risposte corrette: ${known} su ${attempts} tentativi`;
  accuracyEl.textContent = `Precisione complessiva: ${accuracy}%`;
  masteredEl.textContent = `Parole padroneggiate: ${mastered}`;
  streakStatEl.textContent = `Serie più lunga: ${s.longest || 0} giorni (attuale: ${s.streak || 0})`;
}

statsBackBtn.addEventListener("click", () => {
  showScreen("trainer");
});

// Pulsante statistiche, aggiunto dinamicamente accanto al pulsante quiz
if (!document.getElementById("open-stats")) {
  const statsBtn = document.createElement("button");
  statsBtn.id = "open-stats";
  statsBtn.className = "quiz-btn stats-btn";
  statsBtn.textContent = "📊 Statistiche";
  statsBtn.addEventListener("click", () => {
    renderStats();
    showScreen("stats");
  });
  quizBtn.insertAdjacentElement("afterend", statsBtn);
}

// ---------- Tema ----------
function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
}

themeToggleBtn.addEventListener("click", () => {
  const isDark = document.body.classList.contains("dark");
  const next = isDark ? "light" : "dark";
  applyTheme(next);
  safeStorage.setItem(THEME_KEY, next);
});

// ---------- Avvio ----------
applyTheme(safeStorage.getItem(THEME_KEY) || "light");
renderDeckList();
showScreen("home");
