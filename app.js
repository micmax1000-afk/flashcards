// app.js — Logica Flashcards multilingua con flip 3D e ripetizione

document.addEventListener("DOMContentLoaded", () => {
  const homeScreen = document.getElementById("home-screen");
  const trainerScreen = document.getElementById("trainer-screen");
  const deckListEl = document.getElementById("deck-list");
  
  const btnBack = document.getElementById("btn-back");
  const btnAudio = document.getElementById("btn-audio");
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

  // Renderizza la lista dei mazzi in home
  function renderDecks() {
    deckListEl.innerHTML = "";
    DECKS.forEach(deck => {
      const card = document.createElement("div");
      card.className = "deck-card";
      card.innerHTML = `
        <div class="deck-info">
          <span class="deck-flag">${deck.flag}</span>
          <div class="deck-title">
            <h3>${deck.name}</h3>
            <span>${deck.cards.length} parole</span>
          </div>
        </div>
        <div class="deck-arrow">›</div>
      `;
      card.addEventListener("click", () => startDeck(deck));
      deckListEl.appendChild(card);
    });
  }

  function startDeck(deck) {
    currentDeck = deck;
    currentIndex = 0;
    isFlipped = false;
    trainerTitle.textContent = `${deck.flag} ${deck.name}`;
    
    homeScreen.classList.add("hidden");
    trainerScreen.classList.remove("hidden");
    
    loadCard();
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
  }

  // Click sulla carta per girarla
  flashcardEl.addEventListener("click", () => {
    isFlipped = !isFlipped;
    if (isFlipped) {
      flashcardEl.classList.add("flipped");
      answerButtons.classList.remove("hidden");
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
    // Sposta la carta in fondo per ripeterla
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

  // Pronuncia audio
  btnAudio.addEventListener("click", () => {
    if (!currentDeck) return;
    const card = currentDeck.cards[currentIndex];
    const textToSpeak = isFlipped ? card.back : card.front;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = isFlipped ? currentDeck.lang : "it-IT";
    window.speechSynthesis.speak(utterance);
  });

  btnBack.addEventListener("click", goHome);

  function goHome() {
    trainerScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
    currentDeck = null;
  }

  renderDecks();
});
