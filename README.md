# ⚖️ Il Tribunale dei 30 Anni

Un gioco goliardico a tema tribunale per feste di compleanno dei 30 anni. Due imputati si sfidano davanti a una giuria popolare (gli amici alla festa), moderati da un giudice (un amico travestito da magistrato). Ad ogni round viene estratto un capo d'accusa: entrambi gli imputati devono confessare la propria storia peggiore legata al tema. La giuria vota chi ha fatto peggio, e il colpevole beve.

## 🎮 Regole del gioco

### Ruoli

| Ruolo | Chi | Cosa fa |
|-------|-----|---------|
| **Giudice** | Un amico (possibilmente travestito da magistrato) | Usa l'app, legge i testi narrativi ad alta voce, modera il dibattimento, assegna penalità |
| **Imputato 1** | Festeggiato o sfidante | Confessa le proprie storie peggiori |
| **Imputato 2** | Festeggiato o sfidante | Confessa le proprie storie peggiori |
| **Giuria** | Tutti gli altri presenti alla festa | Vota per alzata di mano chi ha fatto peggio |

### Setup

1. Il giudice apre l'app e inserisce i nomi dei due imputati
2. Sceglie il numero di round (da 3 a 20, consigliato 10)
3. Opzionalmente filtra le categorie di accuse (Alcol, Sesso & Relazioni, Sostanze, Figuracce)
4. Opzionalmente attiva il **timer** per le arringhe (30/45/60/90/120 secondi)
5. Opzionalmente aggiunge **accuse personalizzate** specifiche per i festeggiati, con possibilità di usare solo quelle

### Svolgimento di un round

1. **Capo d'accusa**: il giudice legge il testo narrativo e l'accusa estratta
2. **Arringa Imputato 1**: il primo imputato racconta la sua storia peggiore legata al tema
3. **Arringa Imputato 2**: il secondo imputato racconta la sua
4. **Voto della Giuria**: i presenti votano per alzata di mano chi ha fatto peggio
5. **Verdetto**: il giudice conta i voti, seleziona il colpevole (o pareggio) nell'app

### Punteggio e penalità

- Chi viene dichiarato **colpevole** nel round accumula una **condanna** e **beve**
- In caso di **pareggio** nel round, **entrambi bevono**
- Il giudice può assegnare **sorsi penalità** in qualsiasi momento a chiunque (imputati, giuria o se stesso) tramite il bottone martello
- Alla **sentenza finale**: chi ha accumulato più condanne è il **Colpevole Supremo** e **beve doppio**
- Se il totale è in **pareggio**, **entrambi bevono doppio**

### Testi narrativi

L'app fornisce al giudice testi scritti in legalese goliardico da leggere ad alta voce in ogni fase. Ci sono varianti multiple (60+) per evitare ripetizioni. Il giudice non deve improvvisare (ma può aggiungere del suo).

## 🌐 Demo

👉 [**Gioca ora**](https://alessandrocapelli.github.io/Tribunale-Dei-30/)

## 🗂️ Struttura

```
├── index.html      # App principale (HTML/CSS/JS standalone)
├── data.json       # 200 capi d'accusa suddivisi in 4 categorie
└── README.md
```

## ✨ Funzionalità

- **Duello 2v2** con giudice e giuria popolare
- **200 capi d'accusa** in 4 categorie (Alcol, Sesso & Relazioni, Sostanze, Figuracce)
- **Accuse personalizzate**: aggiungi capi d'accusa specifici per i festeggiati, con possibilità di giocare solo con quelli
- **Timer opzionale** per le arringhe (30-120 secondi) con countdown visivo
- **Narrazione in legalese goliardico**: 60+ varianti di testo per il giudice, tutte diverse
- **Penalità**: il giudice può assegnare sorsi penalità a chiunque in qualsiasi momento
- **Fedina Penale**: schermata finale screenshot-friendly con il verdetto
- **Animazioni**: transizioni, gavel smash, shake, glow pulse, timer countdown
- **Persistenza**: lo stato del gioco si salva in localStorage (ripresa automatica se il browser si chiude)
- **Zero dipendenze**: HTML/CSS/JS puro, nessun framework, caricamento istantaneo

## ✏️ Personalizzazione

Tutti i capi d'accusa sono nel file `data.json`. Puoi:

- **Modificare** i prompt esistenti per adattarli ai festeggiati
- **Aggiungere** nuovi prompt a una categoria
- **Creare nuove categorie** aggiungendo un oggetto con `category`, `icon`, `color` e `prompts`

Esempio di struttura:

```json
{
  "category": "Nome Categoria",
  "icon": "🎯",
  "color": "#e74c3c",
  "prompts": [
    "Gli imputati confessino il peggior episodio di ... La Corte esige dettagli.",
    "La Corte domanda agli imputati chi abbia ..."
  ]
}
```

In alternativa, le accuse personalizzate possono essere aggiunte direttamente dall'app durante il setup, senza modificare il file.

## 🚀 Deploy su GitHub Pages

1. Crea un nuovo repository su GitHub
2. Carica `index.html`, `data.json` e `README.md`
3. Vai in **Settings → Pages**
4. Seleziona il branch `main` e la cartella `/ (root)`
5. In pochi secondi il sito sarà live

## ⚠️ Disclaimer

I capi d'accusa sono **puramente goliardici** e pensati per far ridere tra amici. Il contenuto è esplicito e volutamente sopra le righe. Bevi responsabilmente e divertiti.

## 📜 Licenza

Fanne quello che vuoi. È una festa, non un tribunale (anche se il gioco dice il contrario).
