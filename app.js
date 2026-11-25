// app.js — Logica Flashcards multilingua con flip 3D, ripetizione, auto-audio e modalità Quiz (ES Module)

import { getDeckMetadata, loadDeck } from "./data/index.js";

const capacitorGlobal = typeof window !== "undefined" ? window.Capacitor : undefined;
const isNative = !!(
  capacitorGlobal &&
  typeof capacitorGlobal.isNativePlatform === "function" &&
  capacitorGlobal.isNativePlatform()
);
const TextToSpeech = isNative ? capacitorGlobal.Plugins && capacitorGlobal.Plugins.TextToSpeech : null;

document.addEventListener("DOMContentLoaded", async () => {
  // ============ ELEMENTI DOM ============
  // Home
  const homeScreen = document.getElementById("home-screen");
  const deckListEl = document.getElementById("deck-list");
  const btnTheme = document.getElementById("btn-theme");

  // Flashcard Trainer
  const trainerScreen = document.getElementById("trainer-screen");
  const btnBack = document.getElementById("btn-back");
  const btnAudio = document.getElementById("btn-audio");
  const btnAutoAudio = document.getElementById("btn-auto-audio");
  const btnModeToggle = document.getElementById("btn-mode-toggle");
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

  // Quiz
  const quizScreen = document.getElementById("quiz-screen");
  const btnQuizBack = document.getElementById("btn-quiz-back");
  const btnQuizAudio = document.getElementById("btn-quiz-audio");
  const btnQuizModeToggle = document.getElementById("btn-quiz-mode-toggle");
  const quizTitle = document.getElementById("quiz-title");
  
  // Quiz - Multiple Choice
  const quizMc = document.getElementById("quiz-mc");
  const quizProgressText = document.getElementById("quiz-progress-text");
  const quizProgressFill = document.getElementById("quiz-progress-fill");
  const quizScoreEl = document.getElementById("quiz-score");
  const quizTotalEl = document.getElementById("quiz-total");
  const quizPrompt = document.getElementById("quiz-prompt");
  const quizOptions = document.getElementById("quiz-options");
  const quizFeedback = document.getElementById("quiz-feedback");
  const btnQuizNext = document.getElementById("btn-quiz-next");

  // Quiz - Text Input
  const quizInput = document.getElementById("quiz-input");
  const quizInputProgressText = document.getElementById("quiz-input-progress-text");
  const quizInputProgressFill = document.getElementById("quiz-input-progress-fill");
  const quizInputScoreEl = document.getElementById("quiz-input-score");
  const quizInputTotalEl = document.getElementById("quiz-input-total");
  const quizInputPrompt = document.getElementById("quiz-input-prompt");
  const quizInputField = document.getElementById("quiz-input-field");
  const btnQuizSubmit = document.getElementById("btn-quiz-submit");
  const quizInputFeedback = document.getElementById("quiz-input-feedback");
  const btnQuizInputNext = document.getElementById("btn-quiz-input-next");

  // Quiz - Results
  const quizResults = document.getElementById("quiz-results");
  const resultsFinalScore = document.getElementById("results-final-score");
  const resultsTotal = document.getElementById("results-total");
  const resultsPercentage = document.getElementById("results-percentage");
  const resultsMessage = document.getElementById("results-message");
  const btnQuizRetry = document.getElementById("btn-quiz-retry");
  const btnQuizHome = document.getElementById("btn-quiz-home");

  // ============ STATO ============
  let currentDeck = null;
  let currentIndex = 0;
  let isFlipped = false;
  let autoAudioEnabled = loadAutoAudioPref();
  
  // SRS Progress per mazzo corrente
  let currentProgress = {};
  
  // Quiz state
  let quizMode = false; // false = flashcard, true = quiz
  let quizQuestions = [];
  let quizCurrentIndex = 0;
  let quizScore = 0;
  let quizQuestionType = "mc"; // "mc" = multiple choice, "input" = text input
  let quizAnswered = false;

  // ============ UTILITÀ AUDIO ============
  let audioUnlocked = false;

  function unlockAudio() {
    if (audioUnlocked) return;
    // Riproduce un suono silenzioso per sbloccare speechSynthesis (web)
    const utterance = new SpeechSynthesisUtterance("");
    speechSynthesis.speak(utterance);
    audioUnlocked = true;
    // Rimuove i listener dopo il primo sblocco
    document.removeEventListener("click", unlockAudio);
    document.removeEventListener("touchstart", unlockAudio);
    document.removeEventListener("keydown", unlockAudio);
  }

  // Sblocca audio alla prima interazione utente (solo web)
  if (!isNative) {
    document.addEventListener("click", unlockAudio, { once: true });
    document.addEventListener("touchstart", unlockAudio, { once: true });
    document.addEventListener("keydown", unlockAudio, { once: true });
  }

  function speakText(text, lang) {
    if (!text) return;
    
    if (isNative && TextToSpeech && typeof TextToSpeech.speak === "function") {
      // Su Android/iOS usa il bridge nativo, senza import npm (rompe il webview)
      TextToSpeech.speak({
        text: text,
        lang: lang,
        rate: 0.95,
        pitch: 1.0,
        volume: 1.0
      }).catch(err => {
        console.error("TTS error:", err);
        // Fallback a speechSynthesis se il plugin fallisce
        fallbackSpeak(text, lang);
      });
    } else {
      // Su web usa speechSynthesis con sblocco
      if (!audioUnlocked) {
        setTimeout(() => speakText(text, lang), 100);
        return;
      }
      fallbackSpeak(text, lang);
    }
  }

  function fallbackSpeak(text, lang) {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  function speakFrontCard() {
    if (!currentDeck) return;
    const card = currentDeck.cards[currentIndex];
    speakText(card.front, "it-IT");
  }

  function speakBackCard() {
    if (!currentDeck) return;
    const card = currentDeck.cards[currentIndex];
    speakText(card.back, currentDeck.lang);
  }

  function speakQuizPrompt() {
    if (!currentDeck) return;
    const q = quizQuestions[quizCurrentIndex];
    // Per MC e Input: se promptLang è it-IT, parla in italiano, altrimenti nella lingua target
    if (q.promptLang === "it-IT") {
      speakText(q.prompt, "it-IT");
    } else {
      speakText(q.prompt, currentDeck.lang);
    }
  }

  // ============ PERSISTENZA AUTO-AUDIO ============
  function loadAutoAudioPref() {
    try {
      const val = localStorage.getItem("flashcards-auto-audio");
      return val === null ? true : val === "true";
    } catch {
      return true;
    }
  }

  function saveAutoAudioPref(val) {
    try {
      localStorage.setItem("flashcards-auto-audio", val);
    } catch {}
  }

  function updateAutoAudioUI() {
    if (!btnAutoAudio) return;
    btnAutoAudio.classList.toggle("active", autoAudioEnabled);
    btnAutoAudio.setAttribute("aria-pressed", autoAudioEnabled);
    btnAutoAudio.textContent = autoAudioEnabled ? "Voce" : "Muto";
    btnAutoAudio.title = autoAudioEnabled 
      ? "Auto-audio: ON (clicca per disattivare)" 
      : "Auto-audio: OFF (clicca per attivare)";
  }

  // ============ SRS PROGRESS ============
  const PROGRESS_KEY = "flashcards_progress_v2";

  function loadAllProgress() {
    try {
      const data = localStorage.getItem(PROGRESS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  function saveAllProgress(progress) {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {}
  }

  function loadDeckProgress(deckId) {
    const all = loadAllProgress();
    return all[deckId] || {};
  }

  function saveDeckProgress(deckId, progress) {
    const all = loadAllProgress();
    all[deckId] = progress;
    saveAllProgress(all);
  }

  function getCardProgress(deckId, cardIndex) {
    const deckProgress = loadDeckProgress(deckId);
    return deckProgress[cardIndex] || { level: 0, nextReview: null, errors: 0 };
  }

  function updateCardProgress(deckId, cardIndex, known) {
    const deckProgress = loadDeckProgress(deckId);
    const cardProgress = deckProgress[cardIndex] || { level: 0, nextReview: null, errors: 0 };
    
    const now = Date.now();
    
    // SRS intervals in milliseconds: 1min, 10min, 1h, 6h, 1d, 3d, 7d, 14d, 30d, 90d
    const intervals = [
      60 * 1000,
      10 * 60 * 1000,
      60 * 60 * 1000,
      6 * 60 * 60 * 1000,
      24 * 60 * 60 * 1000,
      3 * 24 * 60 * 60 * 1000,
      7 * 24 * 60 * 60 * 1000,
      14 * 24 * 60 * 60 * 1000,
      30 * 24 * 60 * 60 * 1000,
      90 * 24 * 60 * 60 * 1000
    ];
    
    if (known) {
      cardProgress.level = Math.min(cardProgress.level + 1, intervals.length - 1);
      cardProgress.nextReview = now + intervals[cardProgress.level];
      cardProgress.errors = 0;
    } else {
      // Reset level on error
      cardProgress.level = 0;
      cardProgress.nextReview = now + intervals[0];
      cardProgress.errors = (cardProgress.errors || 0) + 1;
    }
    
    deckProgress[cardIndex] = cardProgress;
    saveDeckProgress(deckId, deckProgress);
  }

  function getDueCards(deckId, cards) {
    const deckProgress = loadDeckProgress(deckId);
    const now = Date.now();
    
    return cards.map((card, index) => ({
      ...card,
      index,
      progress: deckProgress[index] || { level: 0, nextReview: null, errors: 0 },
      isDue: !deckProgress[index] || (deckProgress[index].nextReview !== null && deckProgress[index].nextReview <= now)
    })).filter(c => c.isDue);
  }

  // ============ NAVIGAZIONE SCHERMATE ============
  function showScreen(screenEl) {
    [homeScreen, trainerScreen, quizScreen].forEach(s => s.classList.add("hidden"));
    screenEl.classList.remove("hidden");
  }

  function goHome() {
    currentDeck = null;
    currentIndex = 0;
    isFlipped = false;
    quizMode = false;
    quizQuestions = [];
    quizCurrentIndex = 0;
    quizScore = 0;
    updateAutoAudioUI();
    updateModeToggleUI();
    showScreen(homeScreen);
  }

  function goToTrainer() {
    quizMode = false;
    updateModeToggleUI();
    showScreen(trainerScreen);
  }

  function goToQuiz() {
    quizMode = true;
    quizCurrentIndex = 0;
    quizScore = 0;
    generateQuizQuestions();
    updateModeToggleUI();
    showScreen(quizScreen);
    showQuizQuestion();
  }

  // ============ TOGGLE MODALITÀ ============
  function updateModeToggleUI() {
    const isQuiz = quizMode;
    if (btnModeToggle) {
      btnModeToggle.classList.toggle("active", isQuiz);
      btnModeToggle.setAttribute("aria-pressed", isQuiz);
      btnModeToggle.textContent = isQuiz ? "Carte" : "Quiz";
      btnModeToggle.title = isQuiz ? "Passa a modalità Flashcard" : "Passa a modalità Quiz";
    }
    if (btnQuizModeToggle) {
      btnQuizModeToggle.classList.toggle("active", !isQuiz);
      btnQuizModeToggle.setAttribute("aria-pressed", !isQuiz);
      btnQuizModeToggle.textContent = isQuiz ? "Carte" : "Quiz";
      btnQuizModeToggle.title = isQuiz ? "Passa a modalità Flashcard" : "Passa a modalità Quiz";
    }
  }

  function toggleMode() {
    if (quizMode) {
      goToTrainer();
    } else {
      goToQuiz();
    }
  }

  // ============ FLASHCARD LOGIC ============
  function updateDeckCardCount(langId, count) {
    const card = deckListEl.querySelector(`[data-lang-id="${langId}"]`);
    if (card) {
      let badge = card.querySelector(".deck-count");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "deck-count";
        card.querySelector(".deck-info").appendChild(badge);
      }
      badge.textContent = `${count} carte`;
    }
  }

  async function startDeck(langId) {
    trainerTitle.textContent = "Caricamento...";
    homeScreen.classList.add("hidden");
    trainerScreen.classList.remove("hidden");

    try {
      currentDeck = await loadDeck(langId);
      
      // Carica progressi SRS per questo mazzo
      currentProgress = loadDeckProgress(langId);
      
      // Filtra solo le carte da ripassare (due)
      const dueCards = getDueCards(langId, currentDeck.cards);
      
      if (dueCards.length === 0) {
        alert("Nessuna carta da ripassare ora! Torna più tardi. 🎉");
        goHome();
        return;
      }
      
      // Usa solo le carte da ripassare
      currentDeck.cards = dueCards;
      currentIndex = 0;
      isFlipped = false;
      trainerTitle.textContent = `${currentDeck.flag} ${currentDeck.name} (${dueCards.length} da ripassare)`;

      updateDeckCardCount(langId, currentDeck.cards.length);
      loadCard();
    } catch (error) {
      console.error("Errore avvio mazzo:", error);
      alert("Errore nel caricamento del mazzo. Riprova.");
      goHome();
    }
  }

  function loadCard() {
    if (!currentDeck) return;
    const card = currentDeck.cards[currentIndex];

    // Reset flip
    isFlipped = false;
    flashcardEl.classList.remove("flipped");

    // Contenuto
    cardEmojiEl.textContent = card.emoji || "🃏";
    cardFrontText.textContent = card.front;
    cardBackText.textContent = card.back;
    cardPhon.textContent = card.phon || "";

    // Progresso
    const total = currentDeck.cards.length;
    progressText.textContent = `Carta ${currentIndex + 1} di ${total}`;
    progressFill.style.width = `${((currentIndex + 1) / total) * 100}%`;

    // Pulsanti So/Non so nascosti finché non si gira
    answerButtons.classList.add("hidden");

    // Audio automatico sul fronte (italiano) se abilitato
    // Chiamata diretta (senza setTimeout) per preservare il contesto di 'user gesture'
    // necessario a SpeechSynthesis per l'autoplay
    if (autoAudioEnabled && !isFlipped) {
      speakFrontCard();
    }
  }

  function flipCard() {
    if (!currentDeck) return;
    isFlipped = !isFlipped;
    flashcardEl.classList.toggle("flipped", isFlipped);

    if (isFlipped) {
      // Mostra pulsanti risposta
      answerButtons.classList.remove("hidden");
      // Audio automatico sul retro (lingua straniera) se abilitato
      if (autoAudioEnabled) {
        speakBackCard();
      }
    } else {
      answerButtons.classList.add("hidden");
      if (autoAudioEnabled) {
        speakFrontCard();
      }
    }
  }

  function nextCard() {
    if (!currentDeck) return;
    
    // Salva progresso: l'utente conosceva la carta
    const card = currentDeck.cards[currentIndex];
    if (card && card.index !== undefined) {
      updateCardProgress(currentDeck.id, card.index, true);
    }
    
    currentIndex++;
    if (currentIndex >= currentDeck.cards.length) {
      // Mazzo completato
      alert("Complimenti! Hai completato la sessione di ripasso 🎉");
      goHome();
      return;
    }
    loadCard();
  }

  function handleDontKnow() {
    if (!currentDeck) return;
    
    // Salva progresso: l'utente NON conosceva la carta
    const card = currentDeck.cards[currentIndex];
    if (card && card.index !== undefined) {
      updateCardProgress(currentDeck.id, card.index, false);
    }
    
    // Sposta la carta corrente in fondo al mazzo per ripeterla
    const cardObj = currentDeck.cards.splice(currentIndex, 1)[0];
    currentDeck.cards.push(cardObj);
    loadCard();
  }

  // ============ QUIZ LOGIC ============
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function generateQuizQuestions() {
    if (!currentDeck) return;
    
    const cards = [...currentDeck.cards];
    // Mescola le carte per il quiz
    const shuffled = shuffleArray(cards);
    // Limita a max 20 domande per sessione quiz
    const selected = shuffled.slice(0, Math.min(20, shuffled.length));
    
    quizQuestions = [];
    
    for (const card of selected) {
      // 50% multiple choice, 50% text input
      // Alterniamo anche la direzione: IT→Lingua e Lingua→IT
      const useMC = Math.random() < 0.5;
      const directionITtoLang = Math.random() < 0.5;
      
      if (useMC) {
        // Multiple Choice
        if (directionITtoLang) {
          // Prompt: italiano, Risposta: lingua straniera
          const correct = card.back;
          // Genera 3 distrattori dalle altre carte
          const distractors = shuffleArray(
            currentDeck.cards
              .filter(c => c.back !== correct)
              .map(c => c.back)
          ).slice(0, 3);
          
          const options = shuffleArray([correct, ...distractors]);
          
          quizQuestions.push({
            type: "mc",
            prompt: card.front,
            promptLang: "it-IT",
            options: options,
            correct: correct,
            correctIndex: options.indexOf(correct),
            card: card
          });
        } else {
          // Prompt: lingua straniera, Risposta: italiano
          const correct = card.front;
          const distractors = shuffleArray(
            currentDeck.cards
              .filter(c => c.front !== correct)
              .map(c => c.front)
          ).slice(0, 3);
          
          const options = shuffleArray([correct, ...distractors]);
          
          quizQuestions.push({
            type: "mc",
            prompt: card.back,
            promptLang: currentDeck.lang,
            options: options,
            correct: correct,
            correctIndex: options.indexOf(correct),
            card: card
          });
        }
      } else {
        // Text Input
        if (directionITtoLang) {
          quizQuestions.push({
            type: "input",
            prompt: card.front,
            promptLang: "it-IT",
            answer: card.back,
            answerLang: currentDeck.lang,
            card: card
          });
        } else {
          quizQuestions.push({
            type: "input",
            prompt: card.back,
            promptLang: currentDeck.lang,
            answer: card.front,
            answerLang: "it-IT",
            card: card
          });
        }
      }
    }
    
    // Aggiorna totali UI
    quizTotalEl.textContent = quizQuestions.length;
    quizInputTotalEl.textContent = quizQuestions.length;
  }

  function showQuizQuestion() {
    if (quizCurrentIndex >= quizQuestions.length) {
      showQuizResults();
      return;
    }
    
    const q = quizQuestions[quizCurrentIndex];
    quizAnswered = false;
    
    // Nascondi entrambi i tipi di domanda
    quizMc.classList.add("hidden");
    quizInput.classList.add("hidden");
    quizResults.classList.add("hidden");
    
    // Progresso
    const total = quizQuestions.length;
    const current = quizCurrentIndex + 1;
    quizProgressText.textContent = `Domanda ${current} di ${total}`;
    quizInputProgressText.textContent = `Domanda ${current} di ${total}`;
    const pct = (current / total) * 100;
    quizProgressFill.style.width = `${pct}%`;
    quizInputProgressFill.style.width = `${pct}%`;
    
    // Punteggio
    quizScoreEl.textContent = quizScore;
    quizInputScoreEl.textContent = quizScore;
    
    if (q.type === "mc") {
      // Multiple Choice
      quizMc.classList.remove("hidden");
      quizPrompt.textContent = q.prompt;
      
      // Genera bottoni opzioni
      quizOptions.innerHTML = "";
      q.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt;
        btn.dataset.index = idx;
        btn.addEventListener("click", () => selectMCOption(btn, idx, q));
        quizOptions.appendChild(btn);
      });
      
      quizFeedback.classList.add("hidden");
      btnQuizNext.classList.add("hidden");
      
    } else {
      // Text Input
      quizInput.classList.remove("hidden");
      quizInputPrompt.textContent = q.prompt;
      quizInputField.value = "";
      quizInputField.classList.remove("correct", "wrong");
      quizInputField.disabled = false;
      quizInputField.focus();
      
      quizInputFeedback.classList.add("hidden");
      btnQuizInputNext.classList.add("hidden");
      btnQuizSubmit.classList.remove("hidden");
      btnQuizSubmit.disabled = false;
    }
    
    // Auto-audio per il prompt
    if (autoAudioEnabled) {
      speakQuizPrompt();
    }
  }

  function selectMCOption(btn, selectedIndex, q) {
    if (quizAnswered) return;
    quizAnswered = true;
    
    const options = quizOptions.querySelectorAll(".quiz-option");
    options.forEach(opt => opt.classList.add("disabled"));
    
    const isCorrect = selectedIndex === q.correctIndex;
    
    // Salva progresso SRS
    if (q.card && q.card.index !== undefined && currentDeck) {
      updateCardProgress(currentDeck.id, q.card.index, isCorrect);
    }
    
    if (isCorrect) {
      btn.classList.add("correct");
      quizScore++;
      quizFeedback.className = "quiz-feedback correct";
      quizFeedback.innerHTML = "✅ Corretto!";
      quizScoreEl.textContent = quizScore;
    } else {
      btn.classList.add("wrong");
      // Evidenzia la risposta corretta
      options[q.correctIndex].classList.add("correct");
      quizFeedback.className = "quiz-feedback wrong";
      quizFeedback.innerHTML = `❌ Sbagliato. La risposta corretta era: <span class="correct-answer">${q.correct}</span>`;
    }
    
    quizFeedback.classList.remove("hidden");
    btnQuizNext.classList.remove("hidden");
    
    // Auto-audio per la risposta corretta
    if (autoAudioEnabled && isCorrect) {
      speakText(q.correct, q.promptLang === "it-IT" ? currentDeck.lang : "it-IT");
    }
  }

  function handleQuizInputSubmit() {
    if (quizAnswered) return;
    const q = quizQuestions[quizCurrentIndex];
    if (q.type !== "input") return;
    
    const userAnswer = quizInputField.value.trim();
    if (!userAnswer) return;
    
    quizAnswered = true;
    quizInputField.disabled = true;
    btnQuizSubmit.classList.add("hidden");
    btnQuizSubmit.disabled = true;
    
    // Confronto case-insensitive e ignorando accenti per flessibilità
    const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isCorrect = normalize(userAnswer) === normalize(q.answer);
    
    // Salva progresso SRS
    if (q.card && q.card.index !== undefined && currentDeck) {
      updateCardProgress(currentDeck.id, q.card.index, isCorrect);
    }
    
    if (isCorrect) {
      quizInputField.classList.add("correct");
      quizScore++;
      quizInputFeedback.className = "quiz-feedback correct";
      quizInputFeedback.innerHTML = "✅ Corretto!";
      quizInputScoreEl.textContent = quizScore;
    } else {
      quizInputField.classList.add("wrong");
      quizInputFeedback.className = "quiz-feedback wrong";
      quizInputFeedback.innerHTML = `❌ Sbagliato. La risposta corretta era: <span class="correct-answer">${q.answer}</span>`;
    }
    
    quizInputFeedback.classList.remove("hidden");
    btnQuizInputNext.classList.remove("hidden");
    
    // Auto-audio per la risposta corretta
    if (autoAudioEnabled && isCorrect) {
      speakText(q.answer, q.answerLang);
    }
  }

  function nextQuizQuestion() {
    quizCurrentIndex++;
    showQuizQuestion();
  }

  function showQuizResults() {
    quizMc.classList.add("hidden");
    quizInput.classList.add("hidden");
    quizResults.classList.remove("hidden");
    
    const total = quizQuestions.length;
    const percentage = total > 0 ? Math.round((quizScore / total) * 100) : 0;
    
    resultsFinalScore.textContent = quizScore;
    resultsTotal.textContent = total;
    resultsPercentage.textContent = `${percentage}%`;
    
    // Messaggio in base al punteggio
    if (percentage === 100) {
      resultsMessage.textContent = "Perfetto! Hai imparato tutto! 🌟";
    } else if (percentage >= 80) {
      resultsMessage.textContent = "Ottimo lavoro! Continua così! 👏";
    } else if (percentage >= 60) {
      resultsMessage.textContent = "Buon risultato, ma c'è margine di miglioramento 📈";
    } else {
      resultsMessage.textContent = "Continua a esercitarti, migliorerai! 💪";
    }
  }

  function retryQuiz() {
    quizCurrentIndex = 0;
    quizScore = 0;
    generateQuizQuestions();
    showQuizQuestion();
  }

  // ============ EVENT LISTENERS ============
  // Home: click su mazzo
  deckListEl.addEventListener("click", (e) => {
    const card = e.target.closest(".deck-card");
    if (card) {
      const langId = card.dataset.langId;
      if (langId) startDeck(langId);
    }
  });

  // Trainer: indietro
  btnBack.addEventListener("click", goHome);

  // Theme toggle
  if (btnTheme) {
    btnTheme.addEventListener("click", toggleTheme);
  }

  // Trainer: audio manuale (fronte o retro a seconda dello stato)
  btnAudio.addEventListener("click", () => {
    if (isFlipped) speakBackCard();
    else speakFrontCard();
  });

  // Trainer: toggle auto-audio
  btnAutoAudio.addEventListener("click", () => {
    autoAudioEnabled = !autoAudioEnabled;
    saveAutoAudioPref(autoAudioEnabled);
    updateAutoAudioUI();
  });

  // Trainer: toggle modalità Flashcard/Quiz
  btnModeToggle.addEventListener("click", toggleMode);

  // Trainer: flip carta
  flashcardEl.addEventListener("click", flipCard);

  // Trainer: pulsanti So/Non so
  btnKnow.addEventListener("click", nextCard);
  btnDontKnow.addEventListener("click", handleDontKnow);

  // Quiz: indietro
  btnQuizBack.addEventListener("click", goHome);

  // Quiz: audio manuale
  btnQuizAudio.addEventListener("click", speakQuizPrompt);

  // Quiz: toggle modalità
  btnQuizModeToggle.addEventListener("click", toggleMode);

  // Quiz: multiple choice - prossima domanda
  btnQuizNext.addEventListener("click", nextQuizQuestion);

  // Quiz: text input - invio risposta
  btnQuizSubmit.addEventListener("click", handleQuizInputSubmit);
  quizInputField.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !quizAnswered) {
      handleQuizInputSubmit();
    }
  });

  // Quiz: text input - prossima domanda
  btnQuizInputNext.addEventListener("click", nextQuizQuestion);

  // Quiz: risultati - riprova / home
  btnQuizRetry.addEventListener("click", retryQuiz);
  btnQuizHome.addEventListener("click", goHome);

  // ============ INIZIALIZZAZIONE ============
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

  updateAutoAudioUI();
  updateModeToggleUI();
});