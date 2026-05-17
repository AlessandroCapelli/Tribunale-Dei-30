const CUSTOM_KEY = "tribunale30_custom";
const STORAGE_KEY = "tribunale30_state";

const $ = (id) => document.getElementById(id);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const t = (s, v = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

const loadCustom = () => {
	try {
		return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || [];
	} catch {
		return [];
	}
};
const saveCustom = (list) =>
	localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));

const defaultState = () => ({
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
	timerEnabled: false,
	timerSeconds: 60,
	customOnly: false,
});

let data = null;
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
			showToast(data.ui.timerExpired);
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
	const el = $("timerProgress");
	const txt = $("timerText");
	if (!el || !txt) return;
	const pct = timerRemaining / state.timerSeconds;
	el.style.strokeDashoffset = 226 * (1 - pct);
	txt.textContent = timerRemaining;
	el.classList.remove("warning", "danger", "expired");
	if (timerRemaining <= 0) el.classList.add("expired");
	else if (pct <= 0.2) el.classList.add("danger");
	else if (pct <= 0.4) el.classList.add("warning");
}

const saveState = () =>
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

function loadState() {
	const saved = localStorage.getItem(STORAGE_KEY);
	if (!saved) return false;
	try {
		const parsed = JSON.parse(saved);
		if (parsed?.phase && parsed.phase !== "setup") {
			Object.assign(state, parsed);
			return true;
		}
	} catch {}
	return false;
}

function resetState() {
	stopTimer();
	state = defaultState();
	localStorage.removeItem(STORAGE_KEY);
}

function newTrial() {
	resetState();
	state.selectedCats = data.categories.map((_, i) => i);
	render();
}

function goto(phase) {
	state.phase = phase;
	saveState();
	render();
}

fetch("data.json")
	.then((r) => r.json())
	.then((json) => {
		data = json;
		document.title = data.ui.htmlTitle;
		document.documentElement.lang = data.ui.locale.split("-")[0];
		if (!loadState()) state.selectedCats = data.categories.map((_, i) => i);
		initEvents();
		render();
	})
	.catch(() => {
		$("app").innerHTML = `<div class="loading">⚠️</div>`;
	});

function buildAvailablePrompts() {
	state.availablePrompts = [];
	let i = 0;
	if (!state.customOnly) {
		data.categories.forEach((cat, catIdx) => {
			cat.prompts.forEach((text) => {
				if (state.selectedCats.includes(catIdx)) {
					state.availablePrompts.push({
						index: i,
						text,
						category: cat.category,
						icon: cat.icon,
						color: cat.color,
					});
				}
				i++;
			});
		});
	}
	const cp = data.customPrompts;
	loadCustom().forEach((text, k) => {
		state.availablePrompts.push({
			index: 10000 + k,
			text,
			category: cp.category,
			icon: cp.icon,
			color: cp.color,
		});
	});
}

function drawPrompt() {
	const avail = state.availablePrompts.filter(
		(p) => !state.usedIndices.includes(p.index),
	);
	if (!avail.length) return null;
	const chosen = pick(avail);
	state.usedIndices.push(chosen.index);
	return chosen;
}

function startNextRound() {
	state.currentRound++;
	const prompt = drawPrompt();
	if (!prompt) {
		showToast(data.ui.promptsExhausted);
		goto("final");
		return;
	}
	state.currentPrompt = prompt;
	goto("charge");
}

const PHASES_NO_FAB = ["setup", "opening", "final"];
const TURN_PHASES = ["player1", "player2"];

const RENDERERS = {
	setup: renderSetup,
	opening: renderOpening,
	charge: renderCharge,
	player1: () => renderPlayerTurn(1),
	player2: () => renderPlayerTurn(2),
	vote: renderVote,
	result: renderResult,
	final: renderFinal,
};

function render() {
	stopTimer();
	const app = $("app");
	app.innerHTML =
		RENDERERS[state.phase]() +
		(PHASES_NO_FAB.includes(state.phase)
			? ""
			: `<button class="penalty-fab" data-act="penalty" title="${data.ui.penalty.tooltip}">${data.ui.icons.gavel}</button>`);
	if (state.phase === "setup") validateSetup();
	if (state.timerEnabled && TURN_PHASES.includes(state.phase)) startTimer();
}

function renderSetup() {
	const u = data.ui.setup;
	const customs = loadCustom();
	const dim = state.customOnly ? "opacity:0.3;pointer-events:none;" : "";

	const catFilters = data.categories
		.map((cat, i) => {
			const active = state.selectedCats.includes(i);
			const colors = active
				? `background:${cat.color}33;border-color:${cat.color};color:${cat.color};`
				: "";
			return `<div class="cat-filter ${active ? "active" : ""}" data-act="catFilter" data-idx="${i}" style="${dim}${colors}">${cat.icon} ${cat.category}</div>`;
		})
		.join("");

	const roundOpts = Array.from({ length: 18 }, (_, i) => i + 3)
		.map(
			(n) =>
				`<option value="${n}" ${n === state.totalRounds ? "selected" : ""}>${t(u.roundOption, { n })}${n === 10 ? u.roundRecommended : ""}</option>`,
		)
		.join("");

	const timerOpts = [30, 45, 60, 90, 120]
		.map(
			(n) =>
				`<option value="${n}" ${n === state.timerSeconds ? "selected" : ""}>${t(u.timerSecondsOption, { n })}</option>`,
		)
		.join("");

	const customItems = customs
		.map(
			(txt, i) =>
				`<div class="custom-item"><span>${txt}</span><button data-act="delCustom" data-idx="${i}">${data.ui.icons.delete}</button></div>`,
		)
		.join("");

	return `
		<div class="header">
			<div class="icon">${data.ui.icons.scale}</div>
			<h1>${data.ui.appTitle}</h1>
			<p>${data.ui.appSubtitle}</p>
		</div>
		<div class="container">
			<div class="setup-card">
				<h2>${u.imputatiHeader}</h2>
				<div class="form-group">
					<label>${u.p1Label}</label>
					<input type="text" data-field="p1Name" value="${state.p1Name}" placeholder="${u.p1Placeholder}" maxlength="20">
				</div>
				<div class="form-group">
					<label>${u.p2Label}</label>
					<input type="text" data-field="p2Name" value="${state.p2Name}" placeholder="${u.p2Placeholder}" maxlength="20">
				</div>
			</div>
			<div class="setup-card">
				<h2>${u.judgeHeader}</h2>
				<div class="form-group">
					<label>${u.judgeLabel}</label>
					<input type="text" data-field="judgeName" value="${state.judgeName}" placeholder="${u.judgePlaceholder}" maxlength="20">
				</div>
			</div>
			<div class="setup-card">
				<h2>${u.configHeader}</h2>
				<div class="form-group">
					<label>${u.roundsLabel}</label>
					<select data-field="totalRounds">${roundOpts}</select>
				</div>
				<div class="form-group">
					<label>${u.categoriesLabel}</label>
					<div class="cat-filters">${catFilters}</div>
				</div>
				<div class="toggle-row">
					<label class="toggle-label">${u.timerLabel}</label>
					<label class="toggle">
						<input type="checkbox" data-field="timerEnabled" ${state.timerEnabled ? "checked" : ""}>
						<span class="toggle-slider"></span>
					</label>
				</div>
				<div class="${state.timerEnabled ? "" : "hidden"}">
					<div class="form-group">
						<label>${u.timerDurationLabel}</label>
						<select data-field="timerSeconds">${timerOpts}</select>
					</div>
				</div>
			</div>
			<div class="setup-card">
				<h2>${u.customHeader}</h2>
				<p class="setup-hint muted-sm">${u.customHint}</p>
				<div class="custom-input-row">
					<input type="text" id="customInput" placeholder="${u.customPlaceholder}" maxlength="300">
					<button data-act="addCustom">${u.customAddBtn}</button>
				</div>
				${
					customs.length > 0
						? `<div class="custom-count">${t(u.customCount, { n: customs.length })}</div>
				<div class="custom-list">${customItems}</div>
				<div class="toggle-row mt">
					<label class="toggle-label">${u.customOnlyLabel}</label>
					<label class="toggle">
						<input type="checkbox" data-field="customOnly" ${state.customOnly ? "checked" : ""}>
						<span class="toggle-slider"></span>
					</label>
				</div>
				<div class="custom-only-hint ${state.customOnly ? "" : "hidden"}">${t(u.customOnlyHint, { n: customs.length })}</div>`
						: '<div class="custom-list"></div>'
				}
			</div>
			<button class="btn-main" id="startBtn" data-act="start">${u.startBtn}</button>
		</div>
	`;
}

function renderOpening() {
	const narr = t(pick(data.narr.opening), {
		p1: state.p1Name,
		p2: state.p2Name,
		judge: state.judgeName,
	});
	return `
		<div class="header">
			<div class="icon pop">${data.ui.icons.scale}</div>
			<h1>${data.ui.appTitle}</h1>
		</div>
		<div class="container">
			<div class="game-card fade-in">
				<div class="round-badge">${data.ui.opening.badge}</div>
				<div class="narration">
					<div class="label">${data.ui.narrLabelLoud}</div>
					${narr}
				</div>
			</div>
			<button class="btn-main" data-act="proceed">${data.ui.opening.proceedBtn}</button>
		</div>
	`;
}

function renderCharge() {
	const p = state.currentPrompt;
	const intro = t(pick(data.narr.roundIntro), {
		n: state.currentRound,
		tot: state.totalRounds,
	});
	return `
		<div class="container">
			${renderScoreboard()}
			<div class="game-card fade-in">
				<div class="round-badge">${t(data.ui.chargeBadge, { n: state.currentRound, tot: state.totalRounds })}</div>
				<div class="narration">
					<div class="label">${data.ui.narrLabel}</div>
					${intro}
				</div>
				<div class="charge-cat" style="color:${p.color}">${p.icon} ${p.category}</div>
				<div class="charge-text">${p.text}</div>
			</div>
			<button class="btn-main" data-act="callP1">${t(data.ui.charge.callP1Btn, { name: state.p1Name })}</button>
		</div>
	`;
}

function renderTimer() {
	if (!state.timerEnabled) return "";
	return `
		<div class="timer-container">
			<div class="timer-circle">
				<svg viewBox="0 0 80 80">
					<circle class="bg" cx="40" cy="40" r="36"/>
					<circle class="progress" id="timerProgress" cx="40" cy="40" r="36"/>
				</svg>
				<div class="timer-text" id="timerText">${state.timerSeconds}</div>
			</div>
		</div>`;
}

function renderPlayerTurn(n) {
	const isP1 = n === 1;
	const name = isP1 ? state.p1Name : state.p2Name;
	const p = state.currentPrompt;
	const u = data.ui.player;
	const nextLabel = isP1 ? t(u.callP2Btn, { name: state.p2Name }) : u.callVoteBtn;
	const nextAct = isP1 ? "callP2" : "callVote";
	const call = t(pick(data.narr.callPlayer), { name });
	return `
		<div class="container">
			${renderScoreboard(n)}
			<div class="game-card fade-in">
				<div class="round-badge">${t(data.ui.chargeBadge, { n: state.currentRound, tot: state.totalRounds })}</div>
				<div class="charge-cat sm" style="color:${p.color}">${p.icon} ${p.category}</div>
				<div class="charge-text sm">${p.text}</div>
				<div class="narration">
					<div class="label">${data.ui.narrLabel}</div>
					${call}
				</div>
				${renderTimer()}
			</div>
			<button class="btn-main" data-act="${nextAct}">${nextLabel}</button>
		</div>
	`;
}

function renderVote() {
	const u = data.ui.vote;
	return `
		<div class="container">
			${renderScoreboard()}
			<div class="game-card fade-in">
				<div class="round-badge">${t(u.badge, { n: state.currentRound })}</div>
				<div class="narration">
					<div class="label">${data.ui.narrLabel}</div>
					${pick(data.narr.callVote)}
				</div>
				<p class="vote-hint">${u.hint}</p>
				<div class="vote-buttons">
					<button class="btn-vote btn-vote-p1" data-act="vote" data-vote="p1">${t(u.btnP, { name: state.p1Name })}</button>
					<button class="btn-vote btn-vote-p2" data-act="vote" data-vote="p2">${t(u.btnP, { name: state.p2Name })}</button>
					<button class="btn-vote btn-vote-draw" data-act="vote" data-vote="draw">${u.drawBtn}</button>
				</div>
			</div>
		</div>
	`;
}

function renderResult() {
	const last = state.roundResults.at(-1);
	const isDraw = last === "draw";
	const loser = last === "p1" ? state.p1Name : state.p2Name;
	const winner = last === "p1" ? state.p2Name : state.p1Name;
	const u = data.ui.result;

	const icon = isDraw ? u.drawIcon : u.guiltyIcon;
	const text = isDraw ? u.drawText : t(u.guiltyText, { loser });
	const penalty = isDraw
		? t(u.drawPenalty, { p1: state.p1Name, p2: state.p2Name })
		: t(u.guiltyPenalty, { loser });
	const narr = isDraw
		? t(pick(data.narr.roundDraw), { p1: state.p1Name, p2: state.p2Name })
		: t(pick(data.narr.roundWin), { winner, loser });
	const verdictClass = isDraw ? "verdict-draw" : "verdict-guilty";
	const isLast = state.currentRound >= state.totalRounds;

	return `
		<div class="container">
			${renderScoreboard()}
			<div class="game-card fade-in ${verdictClass}">
				<div class="result-icon">${icon}</div>
				<div class="result-text">${text}</div>
				<div class="result-penalty">${penalty}</div>
				<div class="narration">
					<div class="label">${data.ui.narrLabel}</div>
					${narr}
				</div>
			</div>
			<button class="btn-main" data-act="nextRound">${isLast ? u.finalBtn : u.nextBtn}</button>
		</div>
	`;
}

function renderFinal() {
	const isDraw = state.p1Score === state.p2Score;
	const p1Loses = state.p1Score > state.p2Score;
	const loser = p1Loses ? state.p1Name : state.p2Name;
	const winner = p1Loses ? state.p2Name : state.p1Name;
	const ls = Math.max(state.p1Score, state.p2Score);
	const ws = Math.min(state.p1Score, state.p2Score);
	const u = data.ui.final;

	const narr = isDraw
		? t(pick(data.narr.finalDraw), {
				p1: state.p1Name,
				p2: state.p2Name,
				score: state.p1Score,
				tot: state.totalRounds,
			})
		: t(pick(data.narr.finalWin), {
				winner,
				loser,
				ws,
				ls,
				tot: state.totalRounds,
			});

	const recapRows = state.roundResults
		.map((r, i) => {
			const label =
				r === "draw"
					? `<span class="text-draw">${u.recapDraw}</span>`
					: r === "p1"
						? `<span class="text-p1">${t(u.recapGuilty, { name: state.p1Name })}</span>`
						: `<span class="text-p2">${t(u.recapGuilty, { name: state.p2Name })}</span>`;
			return `<div class="recap-row"><span class="round-num">${t(u.roundLabel, { n: i + 1 })}</span><span class="winner-name">${label}</span></div>`;
		})
		.join("");

	const draws = state.roundResults.filter((r) => r === "draw").length;
	const verdictText = isDraw
		? u.drawVerdict
		: t(u.guiltyVerdict, { name: loser.toUpperCase() });
	const verdictClass = isDraw ? "draw" : "guilty";

	const dateStr = new Date().toLocaleDateString(data.ui.locale, data.ui.dateFormat);

	return `
		<div class="header">
			<div class="icon smash">${data.ui.icons.gavel}</div>
			<h1>${u.title}</h1>
		</div>
		<div class="container">
			<div class="game-card fade-in">
				<div class="narration">
					<div class="label">${data.ui.narrLabelSentence}</div>
					${narr}
				</div>
			</div>
			<div class="game-card fade-in">
				<div class="recap-title">${u.recapTitle}</div>
				<div class="rounds-recap">${recapRows}</div>
			</div>
			<p class="screenshot-hint">${u.screenshotHint}</p>
			<div class="fedina-card fade-in">
				<div class="fedina-header">${u.fedinaHeader}</div>
				<div class="fedina-title">${u.fedinaTitle}</div>
				<div class="fedina-vs">
					<div class="fedina-player">
						<div class="fp-name text-p1">${state.p1Name}</div>
						<div class="fp-score text-p1">${state.p1Score}</div>
						<div class="fp-label">${data.ui.condanneLabel}</div>
					</div>
					<div class="vs-label">${data.ui.vs}</div>
					<div class="fedina-player">
						<div class="fp-name text-p2">${state.p2Name}</div>
						<div class="fp-score text-p2">${state.p2Score}</div>
						<div class="fp-label">${data.ui.condanneLabel}</div>
					</div>
				</div>
				${draws > 0 ? `<div class="fedina-draws">${t(u.drawsLabel, { n: draws })}</div>` : ""}
				<div class="fedina-verdict ${verdictClass}">${verdictText}</div>
				<div class="fedina-footer">${t(u.footer, { date: dateStr })}</div>
			</div>
			<div class="actions">
				<button class="btn-main" data-act="newTrial">${u.newBtn}</button>
			</div>
		</div>
	`;
}

function renderScoreboard(active) {
	return `
		<div class="scoreboard">
			<div class="score-player ${active === 1 ? "active-turn" : ""}">
				<div class="name text-p1">${state.p1Name}</div>
				<div class="points">${state.p1Score}</div>
				<div class="score-label">${data.ui.condanneLabel}</div>
			</div>
			<div class="score-vs">${data.ui.vs}</div>
			<div class="score-player ${active === 2 ? "active-turn" : ""}">
				<div class="name text-p2">${state.p2Name}</div>
				<div class="points">${state.p2Score}</div>
				<div class="score-label">${data.ui.condanneLabel}</div>
			</div>
		</div>
	`;
}

function showPenaltyModal() {
	const u = data.ui.penalty;
	const targets = [
		state.p1Name,
		state.p2Name,
		t(u.judgeTarget, { name: state.judgeName }),
		u.juryTarget,
	];
	const buttons = targets
		.map(
			(target) =>
				`<button class="penalty-btn" data-target="${target}">${t(u.targetBtn, { target })}</button>`,
		)
		.join("");

	const modal = document.createElement("div");
	modal.className = "modal-overlay";
	modal.innerHTML = `
		<div class="modal">
			<h3>${u.modalTitle}</h3>
			${buttons}
			<hr class="divider">
			<button class="penalty-btn reset" data-action="reset">${u.resetBtn}</button>
			<button class="close-btn" data-action="close">${u.closeBtn}</button>
		</div>
	`;
	document.body.appendChild(modal);

	modal.addEventListener("click", (e) => {
		if (e.target === modal || e.target.dataset.action === "close") {
			modal.remove();
			return;
		}
		if (e.target.dataset.action === "reset") {
			if (confirm(data.ui.resetConfirm)) {
				modal.remove();
				newTrial();
			}
			return;
		}
		const target = e.target.dataset.target;
		if (target) {
			modal.remove();
			showToast(t(pick(data.narr.penalty), { name: target }));
		}
	});
}

function showToast(message) {
	document.querySelector(".toast")?.remove();
	const toast = document.createElement("div");
	toast.className = "toast";
	toast.innerHTML = message;
	document.body.appendChild(toast);
	setTimeout(() => toast.remove(), 5000);
}

function validateSetup() {
	const btn = $("startBtn");
	if (!btn) return;
	const hasNames =
		state.p1Name.trim() && state.p2Name.trim() && state.judgeName.trim();
	let hasCats = state.selectedCats.length > 0;
	let roundsOk = true;
	if (state.customOnly) {
		const c = loadCustom().length;
		hasCats = c > 0;
		roundsOk = state.totalRounds <= c;
	}
	btn.disabled = !(hasNames && hasCats && roundsOk);
}

function handleStart() {
	buildAvailablePrompts();
	if (state.availablePrompts.length < state.totalRounds) {
		showToast(t(data.ui.insufficientPrompts, { n: state.availablePrompts.length }));
		return;
	}
	goto("opening");
}

function handleAddCustom() {
	const input = $("customInput");
	const txt = input.value.trim();
	if (!txt) return;
	saveCustom([...loadCustom(), txt]);
	render();
}

function handleVote(vote) {
	state.roundResults.push(vote);
	if (vote === "p1") state.p1Score++;
	else if (vote === "p2") state.p2Score++;
	goto("result");
}

function handleDelCustom(i) {
	const customs = loadCustom();
	customs.splice(i, 1);
	saveCustom(customs);
	render();
}

function handleCatFilter(i) {
	const pos = state.selectedCats.indexOf(i);
	if (pos >= 0) state.selectedCats.splice(pos, 1);
	else state.selectedCats.push(i);
	render();
}

const ACTIONS = {
	callP1: () => goto("player1"),
	callP2: () => goto("player2"),
	callVote: () => goto("vote"),
	proceed: startNextRound,
	nextRound: () =>
		state.currentRound >= state.totalRounds
			? goto("final")
			: startNextRound(),
	newTrial: () => confirm(data.ui.resetConfirm) && newTrial(),
	penalty: showPenaltyModal,
	start: handleStart,
	addCustom: handleAddCustom,
	vote: (tgt) => handleVote(tgt.dataset.vote),
	delCustom: (tgt) => handleDelCustom(+tgt.dataset.idx),
	catFilter: (tgt) => handleCatFilter(+tgt.dataset.idx),
};

function initEvents() {
	const app = $("app");

	app.addEventListener("click", (e) => {
		const tgt = e.target.closest("[data-act]");
		if (tgt) ACTIONS[tgt.dataset.act]?.(tgt);
	});

	app.addEventListener("input", (e) => {
		const el = e.target;
		const f = el.dataset.field;
		if (!f) return;
		state[f] =
			el.type === "checkbox"
				? el.checked
				: el.tagName === "SELECT"
					? +el.value
					: el.value;
		if (f === "customOnly" || f === "timerEnabled") render();
		else validateSetup();
	});

	app.addEventListener("keydown", (e) => {
		if (e.target.id === "customInput" && e.key === "Enter")
			handleAddCustom();
	});
}
