// progress-utils.js — Esporta / importa / reset dei progressi
// Usa le stesse chiavi di app.js:
//   flashcards_progress_v2   → stato carte (livello, data prossima revisione, errori)
//   flashcards_theme_v1      → tema chiaro/scuro
//   flashcards_streak_v1     → streak giornaliero
//   flashcards_custom_v1     → parole personalizzate

const PROGRESS_KEYS = [
  "flashcards_progress_v2",
  "flashcards_theme_v1",
  "flashcards_streak_v1",
  "flashcards_custom_v1",
];

/** Esporta tutti i progressi in un file JSON scaricabile. */
export function exportProgress() {
  const data = {};
  let something = false;
  for (const key of PROGRESS_KEYS) {
    try {
      const value = window.localStorage.getItem(key);
      if (value !== null) {
        data[key] = value;
        something = true;
      }
    } catch (e) {
      // ignora chiavi illeggibili
    }
  }
  if (!something) {
    alert("Nessun progresso da esportare.");
    return;
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "flashcards-progress.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Importa progressi da un file JSON selezionato dall'utente. */
export function importProgress(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      let imported = 0;
      for (const [key, value] of Object.entries(data)) {
        if (PROGRESS_KEYS.includes(key) && typeof value === "string") {
          try {
            window.localStorage.setItem(key, value);
            imported++;
          } catch (e) {
            // ignora errori di quota su singole chiavi
          }
        }
      }
      if (imported > 0) {
        alert(`Importati ${imported} blocco/i di progressi. Ricarica la pagina per applicare le modifiche.`);
      } else {
        alert("Nessun dato valido trovato nel file.");
      }
    } catch (err) {
      alert("File non valido o illeggibile.");
    }
  };
  reader.readAsText(file);
}

/** Resetta tutti i progressi (cancella le chiavi di localStorage). */
export function resetProgress() {
  if (!confirm("Attenzione: questa operazione cancella tutti i progressi, lo streak e le parole personalizzate. Continuare?")) {
    return;
  }
  let removed = 0;
  for (const key of PROGRESS_KEYS) {
    try {
      const existed = window.localStorage.getItem(key) !== null;
      window.localStorage.removeItem(key);
      if (existed) removed++;
    } catch (e) {
      // ignora
    }
  }
  alert(`Rimosse ${removed} voci. Ricarica la pagina per ricominciare da zero.`);
  window.location.reload();
}
