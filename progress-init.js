// progress-init.js — Collega i bottoni Esporta / Importa / Reset
import { exportProgress, importProgress, resetProgress } from "./progress-utils.js";

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
