let data = [];

const CUSTOM_KEY = "tribunale30_custom";
const STORAGE_KEY = "tribunale30_state";
const RESET_CONFIRM_MSG =
	"Sei sicuro? I fascicoli processuali verranno archiviati e la sessione verrà chiusa.";

function loadCustom() {
	try {
		return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || [];
	} catch {
		return [];
	}
}

function saveCustom(list) {
	localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}

function defaultState() {
	return {
		phase: "setup",
		p1Name: "",
		p2Name: "",
		judgeName: "",
		totalRounds: 10,
		currentRound: 0,
		p1Score: 0,
		p2Score: 0,
		roundResults: [],
		selectedCats: [],
		availablePrompts: [],
		usedIndices: [],
		currentPrompt: null,
		currentPromptCat: null,
		timerEnabled: false,
		timerSeconds: 60,
		customOnly: false,
	};
}

let state = defaultState();
let timerInterval = null;
let timerRemaining = 0;

function startTimer() {
	stopTimer();
	timerRemaining = state.timerSeconds;
	updateTimerDisplay();
	timerInterval = setInterval(() => {
		timerRemaining--;
		updateTimerDisplay();
		if (timerRemaining <= 0) {
			stopTimer();
			showToast(
				"⏰ Tempo scaduto! La Corte intima di concludere immediatamente!",
			);
		}
	}, 1000);
}

function stopTimer() {
	if (timerInterval) {
		clearInterval(timerInterval);
		timerInterval = null;
	}
}

function updateTimerDisplay() {
	const el = document.getElementById("timerProgress");
	const txt = document.getElementById("timerText");
	if (!el || !txt) return;
	const pct = timerRemaining / state.timerSeconds;
	el.style.strokeDashoffset = 226 * (1 - pct);
	txt.textContent = timerRemaining;
	el.classList.remove("warning", "danger", "expired");
	if (timerRemaining <= 0) el.classList.add("expired");
	else if (pct <= 0.2) el.classList.add("danger");
	else if (pct <= 0.4) el.classList.add("warning");
}

function saveState() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
	const saved = localStorage.getItem(STORAGE_KEY);
	if (saved) {
		try {
			const parsed = JSON.parse(saved);
			if (parsed && parsed.phase && parsed.phase !== "setup") {
				Object.assign(state, parsed);
				return true;
			}
		} catch (e) {}
	}
	return false;
}

function resetState() {
	stopTimer();
	state = defaultState();
	localStorage.removeItem(STORAGE_KEY);
}

function newTrial() {
	resetState();
	state.selectedCats = data.map((_, i) => i);
	render();
}

function goto(phase) {
	state.phase = phase;
	saveState();
	render();
}

const NARR = {
	opening: [
		(p1, p2, judge) =>
			`Onorevoli membri della Corte, stimati presenti muniti di paletta e voi due disgraziati sul banco degli imputati — <strong>${p1}</strong> e <strong>${p2}</strong> — il Tribunale vi dà il benvenuto a questa udienza speciale, presieduta da Sua Onorevolissima Eccellenza il Giudice <strong>${judge}</strong>. Siete qui perché avete compiuto 30 anni senza aver ancora sviluppato un senso della vergogna funzionante. Per ciascuno degli otto capi d'accusa, gli imputati saranno chiamati a deporre uno alla volta, argomentando la propria versione dei fatti con piena trasparenza e onestà brutale — ogni omissione, edulcorazione o menzogna sarà punita con sorso aggiuntivo. Al termine delle due arringhe, la Corte alzerà la paletta recante il volto di chi ha fatto peggio — intendendosi per "peggio" colui la cui vicenda risulti più vergognosa, indegna o moralmente riprovevole agli occhi della Corte rispetto al capo d'accusa in esame: il più votato è dichiarato colpevole del capo d'accusa e beve; in caso di parità, bevono entrambi senza diritto di protesta. Si ricorda inoltre che il Giudice <strong>${judge}</strong>, nella pienezza dei propri insindacabili poteri, può in qualsiasi momento comminare sorsi di penalità a chiunque in quest'aula — imputati, Corte, testimoni, passanti e persino a se stesso — per qualsivoglia motivo gli aggradi, senza obbligo di motivazione né possibilità di appello. Al termine degli otto capi d'accusa, chi avrà collezionato più condanne sarà incoronato Colpevole Supremo e condannato a bevuta doppia. Il perdente beve. Il vincitore... anche, ma con più dignità. Si aprano i lavori.`,
	],
	roundIntro: [
		(n, tot) =>
			`La Corte procede con il capo d'accusa numero ${n} su ${tot}. Si prega la Giuria di prestare la massima attenzione e il minimo rispetto.`,
		(n, tot) =>
			`Fascicolo ${n} di ${tot}. Il Cancelliere apra la busta sigillata. Ciò che segue potrebbe urtare la sensibilità dei presenti. La Corte se ne compiace.`,
		(n, tot) =>
			`Procedimento numero ${n} su ${tot}. La Corte invita gli imputati a prepararsi psicologicamente. Non che servirà a qualcosa.`,
		(n, tot) =>
			`Si passi all'udienza numero ${n} di ${tot}. La Corte ha già perso ogni speranza nell'umanità, ma procediamo comunque per dovere istituzionale.`,
		(n, tot) =>
			`Capo d'accusa ${n} di ${tot}. Il Tribunale ricorda che mentire sotto giuramento è punibile con sorso doppio. La verità, per quanto dolorosa, è l'unica via.`,
		(n, tot) =>
			`Atto ${n} di ${tot}. La Corte si è ripresa a malapena dall'udienza precedente. Si proceda, che tanto peggio di così non può andare. O forse sì.`,
		(n, tot) =>
			`Articolo ${n} su ${tot} del fascicolo processuale. La Corte si augura che gli imputati abbiano ancora un briciolo di dignità da perdere. Probabilmente no.`,
		(n, tot) =>
			`Il Cancelliere estragga il capo d'accusa numero ${n} di ${tot}. La Giuria affili le orecchie. Quello che sentirete non potrà essere rimosso dalla memoria.`,
		(n, tot) =>
			`Siamo all'udienza ${n} di ${tot}. La Corte nota che gli imputati sudano già. Ottimo segno. Significa che le accuse stanno colpendo nel segno.`,
		(n, tot) =>
			`Procedimento ${n} su ${tot}. A questo punto del processo, la Corte non si stupisce più di nulla. Ma vediamo se gli imputati riescono ancora a sorprenderci.`,
		(n, tot) =>
			`Fascicolo numero ${n} di ${tot}. La Corte invita i presenti a non filmare. O a filmare, tanto finirà comunque su un gruppo WhatsApp.`,
		(n, tot) =>
			`Capo d'accusa ${n} su ${tot}. Il Giudice ricorda alla Giuria che siamo qui per la giustizia, non per il divertimento. Anche se le due cose, stranamente, coincidono.`,
	],
	callPlayer: [
		(name) =>
			`Ha la parola l'imputato <strong>${name}</strong>. La Corte ricorda che la confessione spontanea è apprezzata, ma non ridurrà la pena. Racconti pure la sua versione dei fatti, con dovizia di dettagli vergognosi.`,
		(name) =>
			`Si alzi l'imputato <strong>${name}</strong> e confessi i propri misfatti. La Corte consiglia vivamente di non omettere nulla: la Giuria fiuta le bugie.`,
		(name) =>
			`La parola passa a <strong>${name}</strong>. Il Tribunale si aspetta una confessione completa, circostanziata e preferibilmente imbarazzante. Prego, si accomodi nella propria vergogna.`,
		(name) =>
			`<strong>${name}</strong>, è il suo turno. La Corte le ricorda che il diritto al silenzio non è previsto in questa giurisdizione. Parli, e che sia memorabile.`,
		(name) =>
			`L'imputato <strong>${name}</strong> è chiamato a testimoniare contro se stesso. La Corte si metta comoda. Siamo tutti orecchie e giudizio.`,
		(name) =>
			`La Corte concede la parola a <strong>${name}</strong>. Si ricordi che la Giuria apprezza i dettagli: luoghi, orari, testimoni e livello di pentimento. O di assenza dello stesso.`,
		(name) =>
			`È il turno di <strong>${name}</strong>. La Corte lo avvisa che la Giuria ha già sentito cose indicibili, quindi non si trattenga. Il peggio che può succedere è una condanna. Che probabilmente arriverà comunque.`,
		(name) =>
			`L'imputato <strong>${name}</strong> prenda la parola. La Corte gli ricorda che stiamo giudicando chi ha fatto peggio, non chi racconta la storia migliore. Onestà brutale, prego.`,
		(name) =>
			`Si chiama a deporre <strong>${name}</strong>. La Corte nota il suo sguardo nervoso. È un buon segno: significa che ha qualcosa di succoso da raccontare.`,
		(name) =>
			`<strong>${name}</strong>, il microfono è suo. La Corte consiglia di guardare la Giuria negli occhi mentre confessa. L'imbarazzo fa parte della pena.`,
	],
	callVote: [
		`La Giuria è ora chiamata ad esprimersi! Chi tra i due imputati ha toccato il fondo più profondo? Si alzi la mano per il colpevole. La Corte conta.`,
		`Onorevoli giurati, avete ascoltato entrambe le confessioni. È il momento della verità. Chi merita la condanna? La Giuria si esprima per alzata di mano.`,
		`La Corte chiede alla Giuria di deliberare. Ricordate: non si giudica la persona, si giudica l'azione. Anzi no, si giudica anche la persona. Mani in alto.`,
		`Silenzio in aula! La Giuria deliberi: chi ha fatto peggio? Chi ha raggiunto vette più alte di indegnità? Si voti ora, per alzata di mano.`,
		`È giunto il momento del verdetto popolare. Stimata Giuria, alzate la mano per chi secondo voi merita la condanna. Il Giudice conta i voti e non accetta tangenti. Forse.`,
		`La Corte si rivolge alla Giuria: avete udito entrambe le deposizioni. Ora esprimete il vostro insindacabile giudizio per alzata di mano. Chi ha raggiunto il fondo?`,
		`Giurati, la delibera è nelle vostre mani. Letteralmente: alzatele. La Corte desidera un verdetto rapido, inequivocabile e possibilmente unanime. Ma ci accontentiamo della maggioranza.`,
		`Attenzione, si procede alla votazione. La Giuria esprima il proprio voto per alzata di mano. La Corte ricorda che astenersi è da vigliacchi e che qui non si accettano vigliacchi.`,
		`Il momento è solenne. La Giuria deve decidere: chi tra i due ha dimostrato una più completa e raffinata mancanza di dignità? Mani in alto per il colpevole.`,
		`La Corte chiede alla Giuria di non lasciarsi influenzare da simpatie personali, amicizie o debiti pregressi. Votate con la coscienza. O con lo stomaco. Mani in alto.`,
	],
	roundWin: [
		(winner, loser) =>
			`La Giuria ha parlato! <strong>${loser}</strong> è dichiarato COLPEVOLE per questo capo d'accusa. La condanna è immediata: un sorso di penitenza.`,
		(winner, loser) =>
			`Il verdetto è unanime... o quasi. <strong>${loser}</strong> si è distinto per la maggiore indegnità. La Corte lo condanna a bere.`,
		(winner, loser) =>
			`La Corte registra la sconfitta morale di <strong>${loser}</strong>. La pena è chiara: si beva, e si rifletta sulle proprie scelte di vita.`,
		(winner, loser) =>
			`Colpevole! <strong>${loser}</strong> ha perso questo round in modo netto. La Giuria non ha avuto dubbi. Si esegua la condanna: un sorso, con vergogna.`,
		(winner, loser) =>
			`La Corte prende atto della confessione di <strong>${loser}</strong> e la ritiene peggiore. La condanna è un sorso. <strong>${winner}</strong> se la cava. Per ora.`,
		(winner, loser) =>
			`Verdetto emesso! <strong>${loser}</strong> si è guadagnato una condanna per manifesta indegnità. Il sorso è obbligatorio e non ammette appello.`,
		(winner, loser) =>
			`La Giuria ha deliberato con velocità sospetta. <strong>${loser}</strong> è il colpevole di questo round. La pena: bere. Il movente: avere fatto peggio. La difesa: inesistente.`,
		(winner, loser) =>
			`Caso chiuso per questo capo d'accusa. <strong>${loser}</strong>, lei ha fatto peggio e la Giuria lo sa. Un sorso, prego. La dignità la recupererà un'altra volta.`,
	],
	roundDraw: [
		(p1, p2) =>
			`La Giuria è spaccata! Entrambi gli imputati hanno dimostrato un livello di indegnità perfettamente equivalente. La Corte condanna <strong>${p1}</strong> e <strong>${p2}</strong> a bere entrambi. Nessuno è innocente qui.`,
		(p1, p2) =>
			`Pareggio! La Corte rileva con sgomento che entrambi gli imputati sono ugualmente colpevoli. Pena doppia: bevete entrambi. La giustizia è cieca, ma non sorda a queste storie.`,
		(p1, p2) =>
			`La Giuria non riesce a decidere, e onestamente la Corte capisce perché. <strong>${p1}</strong> e <strong>${p2}</strong> sono entrambi terribili. Bevete tutti e due, così imparerete. O più probabilmente no.`,
		(p1, p2) =>
			`Situazione di stallo! La Corte dichiara <strong>${p1}</strong> e <strong>${p2}</strong> equamente colpevoli. La sentenza: un sorso ciascuno. La vergogna: condivisa. L'umanità: perduta.`,
		(p1, p2) =>
			`Parità assoluta. La Giuria è divisa come il Mar Rosso, ma qui non si salva nessuno. <strong>${p1}</strong> e <strong>${p2}</strong>, bevete entrambi. La Corte non sa chi compatire di più.`,
		(p1, p2) =>
			`Un pareggio raro e meritato. Entrambi gli imputati hanno toccato il fondo con la stessa grazia. La Corte condanna <strong>${p1}</strong> e <strong>${p2}</strong> a un sorso simultaneo di solidarietà nella vergogna.`,
	],
	finalWin: [
		(winner, loser, wScore, lScore, tot) =>
			`Dopo attenta e sofferta deliberazione, questa Corte dichiara <strong>${loser}</strong> COLPEVOLE SUPREMO di indegnità cronica, con ${lScore} condanne su ${tot} capi d'accusa. La sentenza è INAPPELLABILE. Il condannato è obbligato a bere DOPPIO come risarcimento morale per la Giuria che ha dovuto ascoltare tali nefandezze. <strong>${winner}</strong> è dichiarato "il meno peggio", il che non è esattamente un complimento. Si chiuda il fascicolo.`,
		(winner, loser, wScore, lScore, tot) =>
			`Il Tribunale, nella sua infinita saggezza, emette la sentenza finale: <strong>${loser}</strong> è riconosciuto colpevole con ${lScore} condanne su ${tot} capi d'accusa. Non si era visto un curriculum criminale così imbarazzante dai tempi del Medioevo. La pena: DOPPIO SORSO. <strong>${winner}</strong> se la cava con una fedina penale leggermente meno disastrosa. Caso chiuso.`,
		(winner, loser, wScore, lScore, tot) =>
			`La Corte Suprema delle Figuracce, riunita in camera di consiglio, pronuncia la seguente sentenza: <strong>${loser}</strong>, con ${lScore} condanne su ${tot}, è dichiarato il campione indiscusso dell'indegnità. La pena: DOPPIO SORSO e il disonore eterno. <strong>${winner}</strong> riceve una menzione d'onore per essere stato leggermente meno orribile. Congratulazioni, se così si possono chiamare.`,
		(winner, loser, wScore, lScore, tot) =>
			`In nome del popolo, la Corte dichiara chiuso il dibattimento. <strong>${loser}</strong>, con ${lScore} condanne su ${tot} capi d'accusa, è giudicato il peggiore. La condanna: BEVUTA DOPPIA, immediata e senza appello. <strong>${winner}</strong>, lei è libero di andare. Ma sappia che "meno colpevole" non significa "innocente". Si archivi il fascicolo con la dicitura "vergogna bilaterale".`,
		(winner, loser, wScore, lScore, tot) =>
			`Sentenza finale! Il fascicolo si chiude con <strong>${loser}</strong> condannato ${lScore} volte su ${tot}. Un record che resterà negli annali di questo Tribunale. La pena massima: DOPPIO SORSO. <strong>${winner}</strong>, con sole ${wScore} condanne, se la cava come il minore dei due mali. La Corte si congeda, profondamente segnata da questa esperienza.`,
	],
	finalDraw: [
		(p1, p2, score, tot) =>
			`Caso senza precedenti nella storia della giurisprudenza goliardica! <strong>${p1}</strong> e <strong>${p2}</strong> hanno pareggiato con ${score} condanne ciascuno su ${tot} capi d'accusa. La Corte, incapace di stabilire chi sia il peggiore — perché siete ENTRAMBI terribili — condanna i due imputati a bere DOPPIO entrambi. La doppia condanna è la pena minima per un livello di indegnità così uniformemente distribuito. Si chiuda il fascicolo con disonore condiviso.`,
		(p1, p2, score, tot) =>
			`Incredibile! ${score} condanne a testa su ${tot} capi d'accusa. <strong>${p1}</strong> e <strong>${p2}</strong> sono perfettamente equivalenti nel loro essere terribili. La Corte non ha mai assistito a un pareggio così equilibrato nell'indegnità. La sentenza: DOPPIO SORSO per entrambi. Nessuno vince, tutti perdono, come nella vita.`,
		(p1, p2, score, tot) =>
			`La Corte è esterrefatta. Un pareggio perfetto: ${score} a ${score} su ${tot} round. <strong>${p1}</strong> e <strong>${p2}</strong>, siete due facce della stessa medaglia di vergogna. La condanna è DOPPIA per entrambi. Il Tribunale si ritira a meditare su cosa abbia sbagliato l'umanità per produrre due individui così simmetricamente indegni.`,
	],
	penaltyTemplates: [
		(name) =>
			`⚖️ La Corte commina un SORSO DI PENALITÀ a ${name} per condotta inappropriata in aula!`,
		(name) =>
			`⚖️ OBIEZIONE RESPINTA! ${name} è condannato a un sorso penalità per oltraggio alla Corte!`,
		(name) =>
			`⚖️ Articolo 30-bis: ${name} beva immediatamente un sorso penalità per manifesta mancanza di decoro!`,
		(name) =>
			`⚖️ Il Giudice, nell'esercizio dei propri poteri, infligge un sorso penalità a ${name}!`,
		(name) =>
			`⚖️ La Corte sanziona ${name} con un sorso penalità per disturbo del procedimento giudiziario!`,
		(name) =>
			`⚖️ Per turbativa dell'ordine di oggi, ${name} è condannato a un sorso penalità con effetto immediato!`,
		(name) =>
			`⚖️ ${name} è richiamato all'ordine con un sorso penalità! La Corte non tollera insubordinazione!`,
		(name) =>
			`⚖️ Il Tribunale, con fermezza e un pizzico di sadismo, assegna un sorso penalità a ${name}!`,
	],
};

function pick(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

fetch("data.json")
	.then((r) => r.json())
	.then((json) => {
		data = json;
		const restored = loadState();
		if (!restored) {
			state.selectedCats = data.map((_, i) => i);
		}
		render();
	})
	.catch(() => {
		document.getElementById("app").innerHTML =
			'<div class="loading">Errore nel caricamento dei fascicoli processuali.</div>';
	});

function buildAvailablePrompts() {
	state.availablePrompts = [];
	const customs = loadCustom();
	if (!state.customOnly) {
		let globalIdx = 0;
		data.forEach((cat, catIdx) => {
			cat.prompts.forEach((prompt) => {
				if (state.selectedCats.includes(catIdx)) {
					state.availablePrompts.push({
						index: globalIdx,
						text: prompt,
						category: cat.category,
						icon: cat.icon,
						color: cat.color,
					});
				}
				globalIdx++;
			});
		});
	}
	customs.forEach((text, i) => {
		state.availablePrompts.push({
			index: 10000 + i,
			text: text,
			category: "Personalizzate",
			icon: "🎯",
			color: "#9b59b6",
		});
	});
}

function drawPrompt() {
	const available = state.availablePrompts.filter(
		(p) => !state.usedIndices.includes(p.index),
	);
	if (available.length === 0) return null;
	const chosen = pick(available);
	state.usedIndices.push(chosen.index);
	return chosen;
}

function render() {
	stopTimer();
	const app = document.getElementById("app");
	let html = "";

	switch (state.phase) {
		case "setup":
			html = renderSetup();
			break;
		case "opening":
			html = renderOpening();
			break;
		case "charge":
			html = renderCharge();
			break;
		case "player1":
			html = renderPlayerTurn(1);
			break;
		case "player2":
			html = renderPlayerTurn(2);
			break;
		case "vote":
			html = renderVote();
			break;
		case "result":
			html = renderResult();
			break;
		case "final":
			html = renderFinal();
			break;
	}

	app.innerHTML = html;

	if (!["setup", "opening", "final"].includes(state.phase)) {
		app.innerHTML += renderPenaltyFab();
	}

	bindEvents();

	if (
		state.timerEnabled &&
		(state.phase === "player1" || state.phase === "player2")
	) {
		startTimer();
	}
}

function renderSetup() {
	const catFilters = data
		.map((cat, i) => {
			const active = state.selectedCats.includes(i);
			const style = active
				? `background:${cat.color}33;border-color:${cat.color};color:${cat.color}`
				: "";
			return `<div class="cat-filter ${active ? "active" : ""}" data-cat="${i}" style="${style}">${cat.icon} ${cat.category}</div>`;
		})
		.join("");

	const roundOptions = Array.from({ length: 18 }, (_, i) => {
		const n = i + 3;
		return (
			`<option value="${n}" ${n === 10 ? "selected" : ""}>` +
			`${n} capi d'accusa` +
			`${n === 10 ? " (consigliato)" : ""}` +
			`</option>`
		);
	}).join("");

	const customs = loadCustom();
	const customItems = customs
		.map(
			(text, i) =>
				`<div class="custom-item"><span>${text}</span><button data-del-custom="${i}">✕</button></div>`,
		)
		.join("");

	const timerOptions = [30, 45, 60, 90, 120]
		.map(
			(s) =>
				`<option value="${s}" ${s === 60 ? "selected" : ""}>${s} secondi</option>`,
		)
		.join("");

	return `
		<div class="header">
			<div class="icon">⚖️</div>
			<h1>IL TRIBUNALE DEI 30 ANNI</h1>
			<p>Processo per stabilire chi è il peggiore</p>
		</div>
		<div class="container">
			<div class="setup-card">
				<h2>👤 Imputati</h2>
				<div class="form-group">
					<label>Nome Imputato 1</label>
					<input type="text" id="p1name" placeholder="Nome del primo imputato" maxlength="20">
				</div>
				<div class="form-group">
					<label>Nome Imputato 2</label>
					<input type="text" id="p2name" placeholder="Nome del secondo imputato" maxlength="20">
				</div>
			</div>
			<div class="setup-card">
				<h2>⚖️ Giudice</h2>
				<div class="form-group">
					<label>Nome del Giudice</label>
					<input type="text" id="judgeName" placeholder="Chi presiede il Tribunale?" maxlength="20">
				</div>
			</div>
			<div class="setup-card">
				<h2>📋 Configurazione Udienza</h2>
				<div class="form-group">
					<label>Numero di capi d'accusa</label>
					<select id="rounds">${roundOptions}</select>
				</div>
				<div class="form-group">
					<label>Categorie (clicca per attivare/disattivare)</label>
					<div class="cat-filters">${catFilters}</div>
				</div>
				<div class="toggle-row">
					<label class="toggle-label">⏱️ Timer per le arringhe</label>
					<label class="toggle">
						<input type="checkbox" id="timerToggle">
						<span class="toggle-slider"></span>
					</label>
				</div>
				<div id="timerConfig" class="hidden">
					<div class="form-group">
						<label>Durata per arringa</label>
						<select id="timerDuration">${timerOptions}</select>
					</div>
				</div>
			</div>
			<div class="setup-card">
				<h2>🎯 Accuse Personalizzate</h2>
				<p class="setup-hint muted-sm">Aggiungi capi d'accusa specifici per i festeggiati.</p>
				<div class="custom-input-row">
					<input type="text" id="customInput" placeholder="Es: Chi ha fatto peggio a..." maxlength="300">
					<button id="addCustomBtn">+ Aggiungi</button>
				</div>
				${
					customs.length > 0
						? `
					<div class="custom-count">${customs.length} accuse personalizzate</div>
					<div class="custom-list">${customItems}</div>
					<div class="toggle-row mt">
						<label class="toggle-label">🎯 Usa solo le personalizzate</label>
						<label class="toggle">
							<input type="checkbox" id="customOnlyToggle">
							<span class="toggle-slider"></span>
						</label>
					</div>
					<div id="customOnlyHint" class="hidden custom-only-hint">Le categorie standard verranno ignorate. Max ${customs.length} round.</div>
				`
						: '<div class="custom-list"></div>'
				}
			</div>
			<button class="btn-main" id="startBtn" disabled>⚖️ Apri il Tribunale</button>
		</div>
	`;
}

function renderOpening() {
	const text = pick(NARR.opening)(
		state.p1Name,
		state.p2Name,
		state.judgeName,
	);
	return `
		<div class="header">
			<div class="icon pop">⚖️</div>
			<h1>IL TRIBUNALE DEI 30 ANNI</h1>
		</div>
		<div class="container">
			<div class="game-card fade-in">
				<div class="round-badge">Cerimonia di Apertura</div>
				<div class="narration">
					<div class="label">📜 Il Giudice legga ad alta voce</div>
					${text}
				</div>
			</div>
			<button class="btn-main" id="proceedBtn">⚖️ Si proceda con il primo capo d'accusa</button>
		</div>
	`;
}

function renderCharge() {
	const prompt = state.currentPrompt;
	const introText = pick(NARR.roundIntro)(
		state.currentRound,
		state.totalRounds,
	);
	return `
		<div class="container">
			${renderScoreboard()}
			<div class="game-card fade-in">
				<div class="round-badge">Capo d'accusa ${state.currentRound} / ${state.totalRounds}</div>
				<div class="narration">
					<div class="label">📜 Il Giudice legga</div>
					${introText}
				</div>
				<div class="charge-cat" style="color:${prompt.color}">${prompt.icon} ${prompt.category}</div>
				<div class="charge-text">${prompt.text}</div>
			</div>
			<button class="btn-main" id="callP1Btn">🗣️ Chiamo l'imputato ${state.p1Name}</button>
		</div>
	`;
}

function renderPlayerTurn(playerNum) {
	const name = playerNum === 1 ? state.p1Name : state.p2Name;
	const callText = pick(NARR.callPlayer)(name);
	const prompt = state.currentPrompt;
	const nextLabel =
		playerNum === 1
			? `🗣️ Chiamo l'imputato ${state.p2Name}`
			: `🗳️ La Giuria si esprima!`;
	const nextId = playerNum === 1 ? "callP2Btn" : "callVoteBtn";

	const timerHtml = state.timerEnabled
		? `
		<div class="timer-container">
			<div class="timer-circle">
				<svg viewBox="0 0 80 80">
					<circle class="bg" cx="40" cy="40" r="36"/>
					<circle class="progress" id="timerProgress" cx="40" cy="40" r="36"/>
				</svg>
				<div class="timer-text" id="timerText">${state.timerSeconds}</div>
			</div>
		</div>`
		: "";

	return `
		<div class="container">
			${renderScoreboard(playerNum)}
			<div class="game-card fade-in">
				<div class="round-badge">Capo d'accusa ${state.currentRound} / ${state.totalRounds}</div>
				<div class="charge-cat sm" style="color:${prompt.color}">${prompt.icon} ${prompt.category}</div>
				<div class="charge-text sm">${prompt.text}</div>
				<div class="narration">
					<div class="label">📜 Il Giudice legga</div>
					${callText}
				</div>
				${timerHtml}
			</div>
			<button class="btn-main" id="${nextId}">${nextLabel}</button>
		</div>
	`;
}

function renderVote() {
	const voteText = pick(NARR.callVote);
	return `
		<div class="container">
			${renderScoreboard()}
			<div class="game-card fade-in">
				<div class="round-badge">Verdetto — Round ${state.currentRound}</div>
				<div class="narration">
					<div class="label">📜 Il Giudice legga</div>
					${voteText}
				</div>
				<p class="vote-hint">Chi ha fatto peggio? Il Giudice selezioni il colpevole:</p>
				<div class="vote-buttons">
					<button class="btn-vote btn-vote-p1" data-vote="p1">👎 ${state.p1Name}</button>
					<button class="btn-vote btn-vote-p2" data-vote="p2">👎 ${state.p2Name}</button>
					<button class="btn-vote btn-vote-draw" data-vote="draw">⚖️ Pareggio — entrambi colpevoli</button>
				</div>
			</div>
		</div>
	`;
}

function renderResult() {
	const lastResult = state.roundResults[state.roundResults.length - 1];
	let icon, text, narration, penalty, verdictClass;

	if (lastResult === "draw") {
		icon = "⚖️";
		text = "PAREGGIO!";
		penalty = `${state.p1Name} e ${state.p2Name} bevono entrambi!`;
		narration = pick(NARR.roundDraw)(state.p1Name, state.p2Name);
		verdictClass = "verdict-draw";
	} else {
		const loser = lastResult === "p1" ? state.p1Name : state.p2Name;
		const winner = lastResult === "p1" ? state.p2Name : state.p1Name;
		icon = "🔨";
		text = `${loser} È COLPEVOLE!`;
		penalty = `${loser} beve!`;
		narration = pick(NARR.roundWin)(winner, loser);
		verdictClass = "verdict-guilty";
	}

	const isLast = state.currentRound >= state.totalRounds;
	const nextLabel = isLast
		? "📜 Sentenza Finale"
		: "➡️ Prossimo capo d'accusa";

	return `
		<div class="container">
			${renderScoreboard()}
			<div class="game-card fade-in ${verdictClass}">
				<div class="result-icon">${icon}</div>
				<div class="result-text">${text}</div>
				<div class="result-penalty">🍺 ${penalty}</div>
				<div class="narration">
					<div class="label">📜 Il Giudice legga</div>
					${narration}
				</div>
			</div>
			<button class="btn-main" id="nextRoundBtn">${nextLabel}</button>
		</div>
	`;
}

function renderFinal() {
	const isDraw = state.p1Score === state.p2Score;
	let narration;

	if (isDraw) {
		narration = pick(NARR.finalDraw)(
			state.p1Name,
			state.p2Name,
			state.p1Score,
			state.totalRounds,
		);
	} else {
		const p1Loses = state.p1Score > state.p2Score;
		const loser = p1Loses ? state.p1Name : state.p2Name;
		const winner = p1Loses ? state.p2Name : state.p1Name;
		const loserCondanne = Math.max(state.p1Score, state.p2Score);
		const winnerCondanne = Math.min(state.p1Score, state.p2Score);
		narration = pick(NARR.finalWin)(
			winner,
			loser,
			winnerCondanne,
			loserCondanne,
			state.totalRounds,
		);
	}

	const recapRows = state.roundResults
		.map((res, i) => {
			let guiltyLabel;
			if (res === "draw")
				guiltyLabel =
					'<span class="text-draw">⚖️ Entrambi colpevoli</span>';
			else if (res === "p1")
				guiltyLabel = `<span class="text-p1">👎 Colpevole: <strong>${state.p1Name}</strong></span>`;
			else
				guiltyLabel = `<span class="text-p2">👎 Colpevole: <strong>${state.p2Name}</strong></span>`;
			return `<div class="recap-row">
			<span class="round-num">Round ${i + 1}</span>
			<span class="winner-name">${guiltyLabel}</span>
		</div>`;
		})
		.join("");

	const draws = state.roundResults.filter((r) => r === "draw").length;
	let verdictText, verdictClass;
	if (isDraw) {
		verdictText = `⚖️ DOPPIA CONDANNA — Entrambi bevono doppio`;
		verdictClass = "draw";
	} else {
		const p1Loses = state.p1Score > state.p2Score;
		const loserName = p1Loses ? state.p1Name : state.p2Name;
		verdictText = `🔨 ${loserName.toUpperCase()} — COLPEVOLE SUPREMO — Beve doppio`;
		verdictClass = "guilty";
	}

	const dateStr = new Date().toLocaleDateString("it-IT", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	return `
		<div class="header">
			<div class="icon smash">🔨</div>
			<h1>SENTENZA FINALE</h1>
		</div>
		<div class="container">
			<div class="game-card fade-in">
				<div class="narration">
					<div class="label">📜 Il Giudice legga la sentenza</div>
					${narration}
				</div>
			</div>
			<div class="game-card fade-in">
				<div class="recap-title">Registro delle Condanne</div>
				<div class="rounds-recap">${recapRows}</div>
			</div>
			<p class="screenshot-hint">📸 Fai uno screenshot della Fedina Penale qui sotto!</p>
			<div class="fedina-card fade-in">
				<div class="fedina-header">Corte Suprema delle Figuracce</div>
				<div class="fedina-title">⚖️ FEDINA PENALE ⚖️</div>
				<div class="fedina-vs">
					<div class="fedina-player">
						<div class="fp-name text-p1">${state.p1Name}</div>
						<div class="fp-score text-p1">${state.p1Score}</div>
						<div class="fp-label">condanne</div>
					</div>
					<div class="vs-label">VS</div>
					<div class="fedina-player">
						<div class="fp-name text-p2">${state.p2Name}</div>
						<div class="fp-score text-p2">${state.p2Score}</div>
						<div class="fp-label">condanne</div>
					</div>
				</div>
				${draws > 0 ? `<div class="fedina-draws">Pareggi: ${draws}</div>` : ""}
				<div class="fedina-verdict ${verdictClass}">${verdictText}</div>
				<div class="fedina-footer">Il Tribunale dei 30 Anni — ${dateStr}</div>
			</div>
			<div class="actions">
				<button class="btn-main flex-1" id="newTrialBtn">⚖️ Nuovo Processo</button>
			</div>
		</div>
	`;
}

function renderScoreboard(activeTurn) {
	return `
		<div class="scoreboard">
			<div class="score-player ${activeTurn === 1 ? "active-turn" : ""}">
				<div class="name text-p1">${state.p1Name}</div>
				<div class="points">${state.p1Score}</div>
				<div class="score-label">condanne</div>
			</div>
			<div class="score-vs">VS</div>
			<div class="score-player ${activeTurn === 2 ? "active-turn" : ""}">
				<div class="name text-p2">${state.p2Name}</div>
				<div class="points">${state.p2Score}</div>
				<div class="score-label">condanne</div>
			</div>
		</div>
	`;
}

function renderPenaltyFab() {
	return `<button class="penalty-fab" id="penaltyFab" title="Penalità">🔨</button>`;
}

function showPenaltyModal() {
	const targets = [
		state.p1Name,
		state.p2Name,
		`Il Giudice ${state.judgeName}`,
		"Tutta la Giuria",
	];

	const buttons = targets
		.map(
			(t) =>
				`<button class="penalty-btn" data-penalty-target="${t}">🍺 Sorso penalità a ${t}</button>`,
		)
		.join("");

	const modal = document.createElement("div");
	modal.className = "modal-overlay";
	modal.id = "penaltyModal";
	modal.innerHTML = `
		<div class="modal">
			<h3>⚖️ Penalità della Corte</h3>
			${buttons}
			<hr class="divider">
			<button class="penalty-btn reset" id="resetFromModal">🔄 Annulla il processo (reset)</button>
			<button class="close-btn" id="closePenalty">Chiudi</button>
		</div>
	`;
	document.body.appendChild(modal);

	modal
		.querySelector("#closePenalty")
		.addEventListener("click", () => modal.remove());
	modal.addEventListener("click", (e) => {
		if (e.target === modal) modal.remove();
	});

	modal.querySelector("#resetFromModal").addEventListener("click", () => {
		if (confirm(RESET_CONFIRM_MSG)) {
			modal.remove();
			newTrial();
		}
	});

	modal.querySelectorAll("[data-penalty-target]").forEach((btn) => {
		btn.addEventListener("click", () => {
			const target = btn.dataset.penaltyTarget;
			modal.remove();
			showToast(pick(NARR.penaltyTemplates)(target));
		});
	});
}

function showToast(message) {
	const existing = document.querySelector(".toast");
	if (existing) existing.remove();

	const toast = document.createElement("div");
	toast.className = "toast";
	toast.innerHTML = message;
	document.body.appendChild(toast);
	setTimeout(() => toast.remove(), 5000);
}

function onClick(id, fn) {
	const el = document.getElementById(id);
	if (el) el.addEventListener("click", fn);
}

function bindEvents() {
	const p1Input = document.getElementById("p1name");
	const p2Input = document.getElementById("p2name");
	const roundsSelect = document.getElementById("rounds");
	const startBtn = document.getElementById("startBtn");
	const timerToggle = document.getElementById("timerToggle");
	const timerConfig = document.getElementById("timerConfig");
	const judgeInput = document.getElementById("judgeName");
	if (p1Input && p2Input) {
		const reRenderSetup = () => {
			const formState = {
				p1: p1Input.value,
				p2: p2Input.value,
				judge: judgeInput ? judgeInput.value : "",
				rounds: roundsSelect ? roundsSelect.value : "10",
				timer: timerToggle ? timerToggle.checked : false,
				timerDur:
					document.getElementById("timerDuration")?.value || "60",
				customOnly:
					document.getElementById("customOnlyToggle")?.checked ||
					false,
			};
			render();
			const els = {
				p1: document.getElementById("p1name"),
				p2: document.getElementById("p2name"),
				judge: document.getElementById("judgeName"),
				rounds: document.getElementById("rounds"),
				timer: document.getElementById("timerToggle"),
				timerDur: document.getElementById("timerDuration"),
				timerCfg: document.getElementById("timerConfig"),
				co: document.getElementById("customOnlyToggle"),
				coHint: document.getElementById("customOnlyHint"),
			};
			if (els.p1) els.p1.value = formState.p1;
			if (els.p2) els.p2.value = formState.p2;
			if (els.judge) els.judge.value = formState.judge;
			if (els.rounds) els.rounds.value = formState.rounds;
			if (els.timer) {
				els.timer.checked = formState.timer;
				if (els.timerCfg)
					els.timerCfg.classList.toggle("hidden", !formState.timer);
			}
			if (els.timerDur) els.timerDur.value = formState.timerDur;
			if (els.co) {
				els.co.checked = formState.customOnly;
				if (els.coHint)
					els.coHint.classList.toggle(
						"hidden",
						!formState.customOnly,
					);
				document.querySelectorAll(".cat-filter").forEach((el) => {
					el.style.opacity = formState.customOnly ? "0.3" : "";
					el.style.pointerEvents = formState.customOnly ? "none" : "";
				});
			}
		};

		const validateSetup = () => {
			const curBtn = document.getElementById("startBtn");
			const co = document.getElementById("customOnlyToggle");
			const isCustomOnly = co && co.checked;
			const customCount = loadCustom().length;
			const curP1 = document.getElementById("p1name");
			const curP2 = document.getElementById("p2name");
			const curRounds = document.getElementById("rounds");
			const curJudge = document.getElementById("judgeName");
			const hasNames =
				curP1 &&
				curP1.value.trim() &&
				curP2 &&
				curP2.value.trim() &&
				curJudge &&
				curJudge.value.trim();
			const hasCats = isCustomOnly
				? customCount > 0
				: state.selectedCats.length > 0;
			const rounds = curRounds ? parseInt(curRounds.value) : 10;
			const roundsOk = isCustomOnly ? rounds <= customCount : true;
			if (curBtn) curBtn.disabled = !(hasNames && hasCats && roundsOk);
		};
		p1Input.addEventListener("input", validateSetup);
		p2Input.addEventListener("input", validateSetup);
		if (judgeInput) judgeInput.addEventListener("input", validateSetup);
		if (roundsSelect)
			roundsSelect.addEventListener("change", validateSetup);
		validateSetup();

		if (timerToggle) {
			timerToggle.addEventListener("change", () => {
				timerConfig.classList.toggle("hidden", !timerToggle.checked);
			});
		}

		const customOnlyToggle = document.getElementById("customOnlyToggle");
		const customOnlyHint = document.getElementById("customOnlyHint");
		if (customOnlyToggle) {
			customOnlyToggle.addEventListener("change", () => {
				const on = customOnlyToggle.checked;
				if (customOnlyHint)
					customOnlyHint.classList.toggle("hidden", !on);
				document.querySelectorAll(".cat-filter").forEach((el) => {
					el.style.opacity = on ? "0.3" : "";
					el.style.pointerEvents = on ? "none" : "";
				});
				validateSetup();
			});
		}

		document.querySelectorAll(".cat-filter").forEach((el) => {
			el.addEventListener("click", () => {
				const idx = parseInt(el.dataset.cat);
				const pos = state.selectedCats.indexOf(idx);
				if (pos >= 0) state.selectedCats.splice(pos, 1);
				else state.selectedCats.push(idx);
				reRenderSetup();
				validateSetup();
			});
		});

		const addBtn = document.getElementById("addCustomBtn");
		const customInput = document.getElementById("customInput");
		if (addBtn && customInput) {
			const addCustom = () => {
				const text = customInput.value.trim();
				if (!text) return;
				const customs = loadCustom();
				customs.push(text);
				saveCustom(customs);
				reRenderSetup();
				validateSetup();
			};
			addBtn.addEventListener("click", addCustom);
			customInput.addEventListener("keydown", (e) => {
				if (e.key === "Enter") addCustom();
			});
		}

		document.querySelectorAll("[data-del-custom]").forEach((btn) => {
			btn.addEventListener("click", () => {
				const idx = parseInt(btn.dataset.delCustom);
				const customs = loadCustom();
				customs.splice(idx, 1);
				saveCustom(customs);
				reRenderSetup();
				validateSetup();
			});
		});
	}

	if (startBtn) {
		startBtn.addEventListener("click", () => {
			state.p1Name = document.getElementById("p1name").value.trim();
			state.p2Name = document.getElementById("p2name").value.trim();
			state.judgeName = document
				.getElementById("judgeName")
				.value.trim();
			state.totalRounds = parseInt(
				document.getElementById("rounds").value,
			);
			const tt = document.getElementById("timerToggle");
			state.timerEnabled = tt ? tt.checked : false;
			const td = document.getElementById("timerDuration");
			state.timerSeconds = td ? parseInt(td.value) : 60;
			const co = document.getElementById("customOnlyToggle");
			state.customOnly = co ? co.checked : false;
			buildAvailablePrompts();

			if (state.availablePrompts.length < state.totalRounds) {
				showToast(
					`⚠️ Solo ${state.availablePrompts.length} domande disponibili. Riduci i round o aggiungi categorie.`,
				);
				return;
			}

			goto("opening");
		});
	}

	onClick("proceedBtn", () => startNextRound());
	onClick("callP1Btn", () => goto("player1"));
	onClick("callP2Btn", () => goto("player2"));
	onClick("callVoteBtn", () => goto("vote"));

	document.querySelectorAll("[data-vote]").forEach((btn) => {
		btn.addEventListener("click", () => {
			const vote = btn.dataset.vote;
			state.roundResults.push(vote);
			if (vote === "p1") state.p1Score++;
			else if (vote === "p2") state.p2Score++;
			goto("result");
		});
	});

	onClick("nextRoundBtn", () => {
		if (state.currentRound >= state.totalRounds) {
			goto("final");
		} else {
			startNextRound();
		}
	});

	onClick("newTrialBtn", () => {
		if (confirm(RESET_CONFIRM_MSG)) {
			newTrial();
		}
	});

	onClick("penaltyFab", showPenaltyModal);
}

function startNextRound() {
	state.currentRound++;
	const prompt = drawPrompt();
	if (!prompt) {
		showToast("⚠️ Domande esaurite!");
		goto("final");
		return;
	}
	state.currentPrompt = prompt;
	state.currentPromptCat = prompt.category;
	goto("charge");
}
