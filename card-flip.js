// card-flip.js — Effetto flip 3D della carta e feedback risposta
// Si collega agli elementi esistenti di app.js senza sovrascriverli.

(function () {
  const card = document.getElementById("card");
  const knowBtn = document.getElementById("know");
  const dontKnowBtn = document.getElementById("dontknow");
  const frontEl = card ? card.querySelector(".front") : null;
  const backEl = card ? card.querySelector(".back") : null;

  if (!card || !frontEl || !backEl) return;

  let isFlipped = false;

  // --- Flip della carta al click ---
  card.addEventListener("click", () => {
    if (isFlipped) {
      card.classList.remove("flipped");
      isFlipped = false;
    } else {
      card.classList.add("flipped");
      isFlipped = true;
    }
  });

  // --- Reset flip quando si risponde ---
  function resetFlip() {
    card.classList.remove("flipped");
    isFlipped = false;
  }

  if (knowBtn) {
    knowBtn.addEventListener("click", () => {
      showAnswerChip("correct", "✅ Benissimo!");
      resetFlip();
    });
  }

  if (dontKnowBtn) {
    dontKnowBtn.addEventListener("click", () => {
      showAnswerChip("wrong", "❌ Riprova più tardi");
      resetFlip();
    });
  }

  // --- Chip di risposta temporaneo ---
  let chipEl = null;
  function showAnswerChip(type, text) {
    if (chipEl) chipEl.remove();
    chipEl = document.createElement("div");
    chipEl.className = `answer-chip ${type}`;
    chipEl.textContent = text;
    document.body.appendChild(chipEl);

    // Posiziona sopra i bottoni
    const rect = knowBtn ? knowBtn.getBoundingClientRect() : null;
    if (rect) {
      chipEl.style.position = "fixed";
      chipEl.style.top = (rect.top - 60) + "px";
      chipEl.style.left = (rect.left + rect.width / 2 - chipEl.offsetWidth / 2) + "px";
    }

    setTimeout(() => {
      chipEl.style.opacity = "0";
      setTimeout(() => chipEl.remove(), 300);
      chipEl = null;
    }, 1400);
  }
})();
