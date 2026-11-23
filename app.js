// app.js — Logica Flashcards multilingua con flip 3D, ripetizione e auto-audio (ES Module)

import { getDeckMetadata, loadDeck } from "./data/index.js";

document.addEventListener("DOMContentLoaded", async () => {
  const homeScreen = document.getElementById("home-screen");
  const trainerScreen = document.getElementById("trainer-screen");
  const deckListEl = document.getElementById("deck-list");

  const btnBack = document.getElementById("btn-back");
  const btnAudio = document.getElementById("btn-audio");
  const btnAutoAudio = document.getElementById("btn-auto-audio");
  const trainerTitle = document.getElementById("trainer-title");

  const flashcardEl = document.getElementById("flashcard");
  const cardEmojiEl = document.getElementById("card-emoji");
  const cardFrontText = document.getElementById("card-front-text");
  const cardBackText = document.getElementById("card-back-text");
  const cardPhon = document.getElementById("card-phon");

  const progressText = document.getElementById("progress-text");
  const progressFill = document.getElementById("progress-fill");
  const answerButtons = document.getElementById("answer-buttons");
  const btnKnow = document.getElementById("btn-know");
  const btnDontKnow = document.getElementById("btn-dontknow");

  let currentDeck = null;
  let currentIndex = 0;
  let isFlipped = false;
  let autoAudioEnabled = loadAutoAudioPref();

  // Aggiorna UI toggle auto-audio
  function updateAutoAudioUI() {
    btnAutoAudio.classList.toggle("active", autoAudioEnabled);
    btnAutoAudio.setAttribute("aria-pressed", autoAudioEnabled);
    btnAutoAudio.title = autoAudioEnabled
      ? "Auto-audio ATTIVO — clicca per disattivare"
      : "Auto-audio SPENTO — clicca per attivare";
  }

  // Carica preferenza da localStorage
  function loadAutoAudioPref() {
    try {
      const pref = localStorage.getItem("flashcards-auto-audio");
      return pref === "true";
    } catch {
      return false; // default: spento
    }
  }

  // Salva preferenza
  function saveAutoAudioPref(enabled) {
    try {
      localStorage.setItem("flashcards-auto-audio", enabled);
    } catch {
      // ignora errori (privacy mode, quota exceeded, etc.)
    }
  }

  // Pronuncia testo con SpeechSynthesis
  function speakText(text, lang) {
    if (!text || !window.speechSynthesis) return;

    // Annulla eventuali pronunce in corso
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || "it-IT";
    utterance.rate = 0.95; // leggermente più lento per chiarezza
    utterance.pitch = 1;
    utterance.volume = 1;

    // Su alcuni browser mobile serve interazione utente prima di speak()
    // Qui l'utente ha già cliccato per girare la carta o cambiare carta
    window.speechSynthesis.speak(utterance);
  }

  // Auto-audio: parla il lato corrente della carta
  function autoSpeakCurrentCard() {
    if (!autoAudioEnabled || !currentDeck) return;
    const card = currentDeck.cards[currentIndex];
    const textToSpeak = isFlipped ? card.back : card.front;
    const lang = isFlipped ? currentDeck.lang : "it-IT";
    speakText(textToSpeak, lang);
  }

  // Mostra loading iniziale
  deckListEl.innerHTML = '<div class="loading">Caricamento mazzi...</div>';

  try {
    const deckMetadata = getDeckMetadata();
    renderDecks(deckMetadata);
  } catch (error) {
    console.error("Errore caricamento metadati:", error);
    deckListEl.innerHTML = '<div class="error">Errore caricamento mazzi</div>';
  }

  // Renderizza lista mazzi (solo metadati)
  function renderDecks(deckMetadata) {
    deckListEl.innerHTML = "";
    deckMetadata.forEach((meta) => {
      const card = document.createElement("div");
      card.className = "deck-card";
      card.innerHTML = `
        <div class="deck-info">
          <span class="deck-flag">${meta.flag}</span>
          <div class="deck-title">
            <h3>${meta.name}</h3>
            <span>Caricamento...</span>
          </div>
        </div>
        <div class="deck-arrow">›</div>
      `;
      card.addEventListener("click", () => startDeck(meta.id));
      deckListEl.appendChild(card);
    });
  }

  async function startDeck(langId) {
    trainerTitle.textContent = "Caricamento...";
    homeScreen.classList.add("hidden");
    trainerScreen.classList.remove("hidden");

    try {
      currentDeck = await loadDeck(langId);
      currentIndex = 0;
      isFlipped = false;
      trainerTitle.textContent = `${currentDeck.flag} ${currentDeck.name}`;

      updateDeckCardCount(langId, currentDeck.cards.length);
      loadCard();
    } catch (error) {
      console.error("Errore avvio mazzo:", error);
      alert("Errore nel caricamento del mazzo. Riprova.");
      goHome();
    }
  }

  function updateDeckCardCount(langId, count) {
    const cards = deckListEl.querySelectorAll(".deck-card");
    cards.forEach((card) => {
      if (card.dataset.langId === langId) {
        const span = card.querySelector(".deck-title span");
        if (span) span.textContent = `${count} parole`;
      }
    });
  }

  function loadCard() {
    if (!currentDeck || currentDeck.cards.length === 0) return;

    isFlipped = false;
    flashcardEl.classList.remove("flipped");
    answerButtons.classList.add("hidden");

    const card = currentDeck.cards[currentIndex];
    cardEmojiEl.textContent = card.emoji || "💡";
    cardEmojiEl.style.display = card.emoji ? "block" : "none";

    cardFrontText.textContent = card.front;
    cardBackText.textContent = card.back;
    cardPhon.textContent = card.phon || "";
    cardPhon.style.display = card.phon ? "block" : "none";

    progressText.textContent = `Carta ${currentIndex + 1} di ${currentDeck.cards.length}`;
    progressFill.style.width = `${((currentIndex + 1) / currentDeck.cards.length) * 100}%`;

    // Auto-audio sul fronte della carta (nuova carta caricata)
    autoSpeakCurrentCard();
  }

  // Click sulla carta per girarla
  flashcardEl.addEventListener("click", () => {
    isFlipped = !isFlipped;
    if (isFlipped) {
      flashcardEl.classList.add("flipped");
      answerButtons.classList.remove("hidden");
      // Auto-audio sul retro (traduzione)
      autoSpeakCurrentCard();
    } else {
      flashcardEl.classList.remove("flipped");
      answerButtons.classList.add("hidden");
    }
  });

  // Pulsante So
  btnKnow.addEventListener("click", (e) => {
    e.stopPropagation();
    nextCard();
  });

  // Pulsante Non so
  btnDontKnow.addEventListener("click", (e) => {
    e.stopPropagation();
    const card = currentDeck.cards.splice(currentIndex, 1)[0];
    currentDeck.cards.push(card);
    loadCard();
  });

  function nextCard() {
    currentIndex++;
    if (currentIndex >= currentDeck.cards.length) {
      alert("Complimenti! Hai completato tutte le carte di questo mazzo 🎉");
      goHome();
    } else {
      loadCard();
    }
  }

  // Pronuncia manuale (pulsante 🔊)
  btnAudio.addEventListener("click", () => {
    if (!currentDeck) return;
    const card = currentDeck.cards[currentIndex];
    const textToSpeak = isFlipped ? card.back : card.front;
    const lang = isFlipped ? currentDeck.lang : "it-IT";
    speakText(textToSpeak, lang);
  });

  // Toggle auto-audio
  btnAutoAudio.addEventListener("click", () => {
    autoAudioEnabled = !autoAudioEnabled;
    saveAutoAudioPref(autoAudioEnabled);
    updateAutoAudioUI();

    // Se attivo e siamo su una carta, parla subito il lato corrente
    if (autoAudioEnabled) {
      autoSpeakCurrentCard();
    }
  });

  btnBack.addEventListener("click", goHome);

  function goHome() {
    trainerScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
    currentDeck = null;
  }

  // Inizializza UI toggle
  updateAutoAudioUI();
});