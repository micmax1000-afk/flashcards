# Flashcards App

Un'applicazione web (PWA) e mobile (Capacitor) per l'apprendimento di vocaboli stranieri tramite il metodo della ripetizione dilazionata (Spaced Repetition).

## Caratteristiche

- 🌍 **Multilingua**: Supporto per Tedesco, Inglese, Spagnolo e Francese.
- 🃏 **Flip 3D**: Interfaccia intuitiva con carte che si girano al tocco.
- 🔊 **Sintesi Vocale (TTS)**: Ascolta la pronuncia corretta delle parole.
- 🧠 **Modalità Quiz**: Metti alla prova la tua memoria con quiz a scelta multipla o inserimento testo.
- 🌓 **Tema Chiaro/Scuro**: Supporto completo per il dark mode.
- 💾 **Offline First**: Funziona senza connessione grazie al Service Worker.
- 📱 **Android Ready**: Integrata con Capacitor per un'esperienza nativa su Android.

## Sviluppo

Il progetto è costruito con tecnologie web standard (HTML, CSS, JavaScript) e non richiede build step complessi per la parte web.

### Prerequisiti

- Node.js (per la gestione delle dipendenze di Capacitor)
- Android Studio (per la build dell'APK)

### Installazione

1. Clona il repository:
   ```bash
   git clone https://github.com/micmax1000-afk/flashcards.git
   ```
2. Installa le dipendenze:
   ```bash
   npm install
   ```

### Comandi Capacitor

- Sincronizza il codice web con il progetto Android:
  ```bash
  npm run cap:sync
  ```
- Apri Android Studio:
  ```bash
  npm run cap:open
  ```

## Licenza

Questo progetto è distribuito sotto licenza MIT.
