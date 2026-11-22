// progress-init.js — Collega i bottoni Esporta / Importa / Reset
// Viene caricato dopo app.js; i bottoni sono già nel DOM (index.html).

(function () {
  const btnExport = document.getElementById("btn-export");
  const btnReset = document.getElementById("btn-reset");
  const inputImport = document.getElementById("import-file");

  if (btnExport) {
    btnExport.addEventListener("click", exportProgress);
  }

  if (btnReset) {
    btnReset.addEventListener("click", resetProgress);
  }

  if (inputImport) {
    inputImport.addEventListener("change", (e) => importProgress(e.target));
  }
})();
