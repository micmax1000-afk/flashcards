/**
 * Gestione del tema (chiaro/scuro) dell'applicazione.
 */

export function initTheme() {
  const savedTheme = localStorage.getItem("flashcards-theme");
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
}

export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || 
                       (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("flashcards-theme", newTheme);
  return newTheme;
}
