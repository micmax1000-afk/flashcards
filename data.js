// data.js — Mazzi multilingua per Flashcards
const DECKS = [
  {
    id: "en",
    name: "Inglese",
    flag: "🇬🇧",
    lang: "en-US",
    cards: [
      { front: "ciao / buongiorno", back: "hello", phon: "/həˈloʊ/", emoji: "👋" },
      { front: "grazie", back: "thank you", phon: "/ˈθæŋk juː/", emoji: "🙏" },
      { front: "per favore", back: "please", phon: "/pliːz/", emoji: "🤲" },
      { front: "acqua", back: "water", phon: "/ˈwɔːtər/", emoji: "💧" },
      { front: "famiglia", back: "family", phon: "/ˈfæməli/", emoji: "👪" },
      { front: "casa", back: "house", phon: "/haʊs/", emoji: "🏠" },
      { front: "amico", back: "friend", phon: "/frɛnd/", emoji: "🤝" },
      { front: "libro", back: "book", phon: "/bʊk/", emoji: "📚" },
      { front: "sole", back: "sun", phon: "/sʌn/", emoji: "☀️" },
      { front: "felice", back: "happy", phon: "/ˈhæpi/", emoji: "😊" },
      { front: "mangiare", back: "to eat", phon: "/tuː iːt/", emoji: "🍽️" },
      { front: "bere", back: "to drink", phon: "/tuː drɪŋk/", emoji: "🥤" },
      { front: "dormire", back: "to sleep", phon: "/tuː sliːp/", emoji: "😴" },
      { front: "lavoro", back: "work", phon: "/wɜːrk/", emoji: "💼" },
      { front: "scuola", back: "school", phon: "/skuːl/", emoji: "🏫" }
    ]
  },
  {
    id: "fr",
    name: "Francese",
    flag: "🇫🇷",
    lang: "fr-FR",
    cards: [
      { front: "ciao / buongiorno", back: "bonjour", phon: "/bɔ̃.ʒuʁ/", emoji: "👋" },
      { front: "grazie", back: "merci", phon: "/mɛʁ.si/", emoji: "🙏" },
      { front: "per favore", back: "s'il vous plaît", phon: "/sil vu ple/", emoji: "🤲" },
      { front: "acqua", back: "eau", phon: "/o/", emoji: "💧" },
      { front: "famiglia", back: "famille", phon: "/fa.mij/", emoji: "👪" },
      { front: "casa", back: "maison", phon: "/mɛ.zɔ̃/", emoji: "🏠" },
      { front: "amico", back: "ami", phon: "/a.mi/", emoji: "🤝" },
      { front: "libro", back: "livre", phon: "/livʁ/", emoji: "📚" },
      { front: "sole", back: "soleil", phon: "/sɔ.lɛj/", emoji: "☀️" },
      { front: "felice", back: "heureux", phon: "/œ.ʁø/", emoji: "😊" },
      { front: "mangiare", back: "manger", phon: "/mɑ̃.ʒe/", emoji: "🍽️" },
      { front: "bere", back: "boire", phon: "/bwaʁ/", emoji: "🥤" },
      { front: "dormire", back: "dormir", phon: "/dɔʁ.miʁ/", emoji: "😴" },
      { front: "lavoro", back: "travail", phon: "/tʁa.vaj/", emoji: "💼" },
      { front: "scuola", back: "école", phon: "/e.kɔl/", emoji: "🏫" }
    ]
  },
  {
    id: "de",
    name: "Tedesco",
    flag: "🇩🇪",
    lang: "de-DE",
    cards: [
      { front: "ciao / buongiorno", back: "hallo", phon: "/ˈhalo/", emoji: "👋" },
      { front: "grazie", back: "danke", phon: "/ˈdaŋkə/", emoji: "🙏" },
      { front: "per favore", back: "bitte", phon: "/ˈbɪtə/", emoji: "🤲" },
      { front: "acqua", back: "wasser", phon: "/ˈvasɐ/", emoji: "💧" },
      { front: "famiglia", back: "familie", phon: "/faˈmiːli̯ə/", emoji: "👪" },
      { front: "casa", back: "haus", phon: "/haʊs/", emoji: "🏠" },
      { front: "amico", back: "freund", phon: "/fʁɔɪ̯nt/", emoji: "🤝" },
      { front: "libro", back: "buch", phon: "/buːx/", emoji: "📚" },
      { front: "sole", back: "sonne", phon: "/ˈzɔnə/", emoji: "☀️" },
      { front: "felice", back: "glücklich", phon: "/ˈɡlʏklɪç/", emoji: "😊" },
      { front: "mangiare", back: "essen", phon: "/ˈɛsn̩/", emoji: "🍽️" },
      { front: "bere", back: "trinken", phon: "/ˈtʁɪŋkn̩/", emoji: "🥤" },
      { front: "dormire", back: "schlafen", phon: "/ˈʃlaːfn̩/", emoji: "😴" },
      { front: "lavoro", back: "arbeit", phon: "/ˈaʁbaɪ̯t/", emoji: "💼" },
      { front: "scuola", back: "schule", phon: "/ˈʃuːlə/", emoji: "🏫" }
    ]
  },
  {
    id: "es",
    name: "Spagnolo",
    flag: "🇪🇸",
    lang: "es-ES",
    cards: [
      { front: "ciao / buongiorno", back: "hola", phon: "/ˈola/", emoji: "👋" },
      { front: "grazie", back: "gracias", phon: "/ˈɡɾasjas/", emoji: "🙏" },
      { front: "per favore", back: "por favor", phon: "/poɾ faˈboɾ/", emoji: "🤲" },
      { front: "acqua", back: "agua", phon: "/ˈaɣwa/", emoji: "💧" },
      { front: "famiglia", back: "familia", phon: "/faˈmilja/", emoji: "👪" },
      { front: "casa", back: "casa", phon: "/ˈkasa/", emoji: "🏠" },
      { front: "amico", back: "amigo", phon: "/aˈmiɣo/", emoji: "🤝" },
      { front: "libro", back: "libro", phon: "/ˈliβɾo/", emoji: "📚" },
      { front: "sole", back: "sol", phon: "/sol/", emoji: "☀️" },
      { front: "felice", back: "feliz", phon: "/feˈliθ/", emoji: "😊" },
      { front: "mangiare", back: "comer", phon: "/koˈmeɾ/", emoji: "🍽️" },
      { front: "bere", back: "beber", phon: "/beˈbeɾ/", emoji: "🥤" },
      { front: "dormire", back: "dormir", phon: "/doɾˈmiɾ/", emoji: "😴" },
      { front: "lavoro", back: "trabajo", phon: "/tɾaˈβaxo/", emoji: "💼" },
      { front: "scuola", back: "escuela", phon: "/esˈkwe.la/", emoji: "🏫" }
    ]
  }
];
