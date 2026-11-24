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
    if (!btnAutoAudio) return;
    btnAutoAudio.classList.toggle("active", autoAudioEnabled);
    btnAutoAudio.setAttribute("aria-pressed", autoAudioEnabled);
    btnAutoAudio.title = autoAudioEnabled
      ? "Audio automatico ATTIVO — la pronuncia parte quando giri la carta"
      : "Audio automatico DISATTIVATO — clicca per attivare";
    btnAutoAudio.textContent = autoAudioEnabled ? "🔊 Auto" : "🔈 Auto";
  }

  // Carica preferenza da localStorage (DEFAULT: true / ATTIVO)
  function loadAutoAudioPref() {
    try {
      const pref = localStorage.getItem("flashcards-auto-audio");
      if (pref === null) return true; // Di default attivo!
      return pref === "true";
    } catch {
      return true; // default attivo
    }
  }

  // Salva preferenza
  function saveAutoAudioPref(enabled) {
    try {
      localStorage.setItem("flashcards-auto-audio", enabled);
    } catch {
      // ignora errori
    }
  }

  // Pronuncia testo con SpeechSynthesis
  function speakText(text, lang) {
    if (!text || !window.speechSynthesis) return;

    // Annulla eventuali pronunce in corso
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || "it-IT";
    utterance.rate = 0.95; // ritmo di lettura chiaro
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  }

  // Pronuncia il retro della carta (traduzione nella lingua di destinazione)
  function speakBackCard() {
    if (!currentDeck) return;
    const card = currentDeck.cards[currentIndex];
    speakText(card.back, currentDeck.lang);
  }

  // Pronuncia il fronte della carta (italiano)
  function speakFrontCard() {
    if (!currentDeck) return;
    const card = currentDeck.cards[currentIndex];
    speakText(card.front, "it-IT");
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
      card.dataset.langId = meta.id;
      card.innerHTML = `
        <div class="deck-info">
          <span class="deck-flag">${meta.flag}</span>
          <div class="deck-title">
            <h3>${meta.name}</h3>
            <span>Tocca per allenarti</span>
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

    // Quando carica una nuova carta si parte sempre dal fronte
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

    // Audio automatico sul fronte (italiano) se abilitato
    // Chiamata diretta (senza setTimeout) per preservare il contesto di 'user gesture'
    // necessario a SpeechSynthesis per l'autoplay
    if (autoAudioEnabled && !isFlipped) {
      speakFrontCard();
    }
  }

  // CLICK SULLA CARTA: Girala e pronuncia AUTOMATICAMENTE la traduzione se autoAudio è attivo
  flashcardEl.addEventListener("click", () => {
    isFlipped = !isFlipped;
    if (isFlipped) {
      flashcardEl.classList.add("flipped");
      answerButtons.classList.remove("hidden");

      // Quando si gira la carta sul retro, riproduce in AUTOMATICO la voce nella lingua straniera
      if (autoAudioEnabled) {
        // Piccolo ritardo di 150ms per sincronizzare la pronuncia con l'animazione della rotazione
        setTimeout(() => {
          if (isFlipped) speakBackCard();
        }, 150);
      }
    } else {
      flashcardEl.classList.remove("flipped");
      answerButtons.classList.add("hidden");
      // Se si rigira sul fronte e l'auto-audio è attivo, cancella pronunce in corso
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  });

  // Pulsante "So"
  btnKnow.addEventListener("click", (e) => {
    e.stopPropagation();
    nextCard();
  });

  // Pulsante "Non so"
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

  // Pronuncia manuale (pulsante 🔊 nell'header)
  btnAudio.addEventListener("click", () => {
    if (!currentDeck) return;
    if (isFlipped) {
      speakBackCard();
    } else {
      speakFrontCard();
    }
  });

  // Toggle On/Off dell'audio automatico al flip
  if (btnAutoAudio) {
    btnAutoAudio.addEventListener("click", () => {
      autoAudioEnabled = !autoAudioEnabled;
      saveAutoAudioPref(autoAudioEnabled);
      updateAutoAudioUI();

      // Se l'utente lo attiva mentre la carta è già girata sul retro, la legge subito
      if (autoAudioEnabled && isFlipped) {
        speakBackCard();
      }
    });
  }

  btnBack.addEventListener("click", () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    goHome();
  });

  function goHome() {
    trainerScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
    currentDeck = null;
  }

  // Inizializza UI del pulsante auto-audio
  updateAutoAudioUI();
});