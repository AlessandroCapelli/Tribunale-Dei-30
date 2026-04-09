# ⚖️ Il Processo dei 30 Anni

Un gioco goliardico e alcolico per feste di compleanno dei 30 anni. Il festeggiato siede sulla "sedia degli imputati" e gli amici pescano accuse assurde, imbarazzanti e borderline. Se ammette: beve. Se nega e viene smascherato: beve doppio. In pratica, beve sempre.

## 🎮 Come si gioca

1. Apri la pagina dal telefono durante la festa
2. Premi **🎲 Pesca un'accusa** per estrarne una a caso
3. Leggi l'accusa al festeggiato davanti a tutti
4. Il festeggiato deve **ammettere** o **negare**
5. Gli amici decidono se sta mentendo
6. Si beve. Sempre.

## 🌐 Demo

👉 [**Gioca ora**](https://alessandrocapelli.github.io/processo-dei-30-anni/)

## 🗂️ Struttura

```
├── index.html      # App principale (HTML/CSS/JS standalone)
├── data.json       # Database delle accuse (modificabile)
└── README.md
```

## ✏️ Personalizzazione

Tutte le accuse sono nel file `data.json`. Puoi:

- **Modificare** le frasi esistenti per adattarle al festeggiato
- **Aggiungere** nuove accuse ad una categoria
- **Creare nuove categorie** aggiungendo un oggetto con `category`, `icon`, `color` e `phrases`

Esempio di struttura:

```json
{
  "category": "Nome Categoria",
  "icon": "🎯",
  "color": "#e74c3c",
  "phrases": [
    "L'imputato è accusato di ...",
    "L'imputato è accusato di ..."
  ]
}
```

## 🚀 Deploy su GitHub Pages

1. Crea un nuovo repository su GitHub
2. Carica `index.html`, `data.json` e `README.md`
3. Vai in **Settings → Pages**
4. Seleziona il branch `main` e la cartella `/ (root)`
5. In pochi secondi il sito sarà live

## ⚠️ Disclaimer

Le accuse sono **puramente goliardiche** e pensate per far ridere tra amici. Il contenuto è esplicito e volutamente sopra le righe. Bevi responsabilmente e divertiti.

## 📜 Licenza

Fanne quello che vuoi. È una festa, non un tribunale (anche se il gioco dice il contrario).
