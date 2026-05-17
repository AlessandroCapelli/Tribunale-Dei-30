const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { JSDOM } = require("jsdom");

const HTML = fs.readFileSync("./index.html", "utf8");
const DATA_TEXT = fs.readFileSync("./data.json", "utf8");
const APP_JS = fs.readFileSync("./app.js", "utf8");
const DATA = JSON.parse(DATA_TEXT);

async function flush(win, ticks = 6) {
	for (let i = 0; i < ticks; i++) {
		await new Promise((r) => setTimeout(r, 0));
	}
}

async function makeApp({
	preState = null,
	preCustoms = null,
	fetchFails = false,
	confirmReturn = true,
} = {}) {
	const dom = new JSDOM(HTML, {
		url: "http://localhost/",
		runScripts: "outside-only",
		pretendToBeVisual: true,
	});
	const win = dom.window;
	if (preState) win.localStorage.setItem("tribunale30_state", preState);
	if (preCustoms) win.localStorage.setItem("tribunale30_custom", preCustoms);
	win.fetch = fetchFails
		? async () => {
				throw new Error("network");
			}
		: async () => ({ json: async () => JSON.parse(DATA_TEXT) });
	win.confirm = () => confirmReturn;
	win.Math.random = () => 0;
	win.eval(APP_JS);
	await flush(win);
	return { dom, win };
}

const $ = (win, sel) => win.document.querySelector(sel);
const $$ = (win, sel) => [...win.document.querySelectorAll(sel)];

function fillField(win, field, value) {
	const el = $(win, `[data-field="${field}"]`);
	assert.ok(el, `field ${field} missing`);
	if (el.type === "checkbox") el.checked = !!value;
	else el.value = String(value);
	el.dispatchEvent(new win.Event("input", { bubbles: true }));
}

function click(win, target) {
	const el = typeof target === "string" ? $(win, target) : target;
	assert.ok(el, `target ${target} missing`);
	el.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
}

const clickAct = (win, act) => click(win, `[data-act="${act}"]`);

function phase(win) {
	const d = win.document;
	if (d.getElementById("startBtn")) return "setup";
	if (d.querySelector('[data-act="proceed"]')) return "opening";
	if (d.querySelector('[data-act="callP1"]')) return "charge";
	if (d.querySelector('[data-act="callP2"]')) return "player1";
	if (d.querySelector('[data-act="callVote"]')) return "player2";
	if (d.querySelector("[data-vote]")) return "vote";
	if (d.querySelector('[data-act="nextRound"]')) return "result";
	if (d.querySelector('[data-act="newTrial"]')) return "final";
	return "unknown";
}

function scores(win) {
	const pts = $$(win, ".points").map((e) => +e.textContent);
	if (pts.length >= 2) return { p1: pts[0], p2: pts[1] };
	const fp = $$(win, ".fp-score").map((e) => +e.textContent);
	if (fp.length >= 2) return { p1: fp[0], p2: fp[1] };
	return null;
}

async function fillSetup(win, opts = {}) {
	fillField(win, "p1Name", opts.p1 ?? "Marco");
	fillField(win, "p2Name", opts.p2 ?? "Luca");
	fillField(win, "judgeName", opts.judge ?? "Anna");
	if (opts.rounds != null) fillField(win, "totalRounds", opts.rounds);
	if (opts.timer) fillField(win, "timerEnabled", true);
	if (opts.timerSeconds != null)
		fillField(win, "timerSeconds", opts.timerSeconds);
	await flush(win);
}

async function startGame(win, opts) {
	await fillSetup(win, opts);
	clickAct(win, "start");
	await flush(win);
}

async function playOneRound(win, vote) {
	if (phase(win) === "opening") {
		clickAct(win, "proceed");
		await flush(win);
	}
	assert.equal(phase(win), "charge");
	clickAct(win, "callP1");
	await flush(win);
	clickAct(win, "callP2");
	await flush(win);
	clickAct(win, "callVote");
	await flush(win);
	click(win, `[data-vote="${vote}"]`);
	await flush(win);
}

async function advanceRound(win) {
	clickAct(win, "nextRound");
	await flush(win);
}

async function playFullGame(win, votes) {
	for (let i = 0; i < votes.length; i++) {
		await playOneRound(win, votes[i]);
		await advanceRound(win);
	}
}

test("bootstrap: setup phase visible after fetch", async () => {
	const { win } = await makeApp();
	assert.equal(phase(win), "setup");
	assert.equal(win.document.title, DATA.ui.htmlTitle);
	assert.equal(win.document.documentElement.lang, "it");
});

test("bootstrap: fetch error shows fallback", async () => {
	const { win } = await makeApp({ fetchFails: true });
	const app = win.document.getElementById("app");
	assert.match(app.innerHTML, /⚠️/);
});

test("setup: start disabled with empty form", async () => {
	const { win } = await makeApp();
	assert.equal($(win, "#startBtn").disabled, true);
});

test("setup: all categories pre-selected", async () => {
	const { win } = await makeApp();
	assert.equal($$(win, ".cat-filter.active").length, DATA.categories.length);
});

test("setup: enable start with all 3 names + categories", async () => {
	const { win } = await makeApp();
	fillField(win, "p1Name", "A");
	assert.equal($(win, "#startBtn").disabled, true);
	fillField(win, "p2Name", "B");
	assert.equal($(win, "#startBtn").disabled, true);
	fillField(win, "judgeName", "C");
	assert.equal($(win, "#startBtn").disabled, false);
});

test("setup: whitespace-only names don't enable start", async () => {
	const { win } = await makeApp();
	fillField(win, "p1Name", "   ");
	fillField(win, "p2Name", "   ");
	fillField(win, "judgeName", "   ");
	assert.equal($(win, "#startBtn").disabled, true);
});

test("setup: deselect all categories disables start", async () => {
	const { win } = await makeApp();
	await fillSetup(win);
	assert.equal($(win, "#startBtn").disabled, false);
	while ($$(win, ".cat-filter.active").length > 0) {
		click(win, $(win, ".cat-filter.active"));
		await flush(win);
	}
	assert.equal($(win, "#startBtn").disabled, true);
});

test("setup: cat-filter toggle adds/removes active class", async () => {
	const { win } = await makeApp();
	const first = $$(win, ".cat-filter")[0];
	assert.ok(first.classList.contains("active"));
	click(win, first);
	await flush(win);
	const refresh = $$(win, ".cat-filter")[0];
	assert.equal(refresh.classList.contains("active"), false);
	click(win, refresh);
	await flush(win);
	assert.ok($$(win, ".cat-filter")[0].classList.contains("active"));
});

test("setup: rounds select reflects state", async () => {
	const { win } = await makeApp();
	fillField(win, "totalRounds", 5);
	const sel = $(win, '[data-field="totalRounds"]');
	assert.equal(+sel.value, 5);
});

test("setup: timer toggle reveals duration select", async () => {
	const { win } = await makeApp();
	assert.equal(
		$(win, '[data-field="timerSeconds"]').closest("div.hidden") !== null,
		true,
	);
	fillField(win, "timerEnabled", true);
	await flush(win);
	assert.equal(
		$(win, '[data-field="timerSeconds"]').closest("div.hidden"),
		null,
	);
});

test("setup: custom prompt add via button", async () => {
	const { win } = await makeApp();
	$(win, "#customInput").value = "Test prompt";
	clickAct(win, "addCustom");
	await flush(win);
	const customs = JSON.parse(win.localStorage.getItem("tribunale30_custom"));
	assert.deepEqual(customs, ["Test prompt"]);
	assert.match($(win, ".custom-list").innerHTML, /Test prompt/);
});

test("setup: empty custom prompt ignored", async () => {
	const { win } = await makeApp();
	$(win, "#customInput").value = "   ";
	clickAct(win, "addCustom");
	await flush(win);
	assert.equal(win.localStorage.getItem("tribunale30_custom"), null);
	assert.equal($$(win, ".custom-item").length, 0);
});

test("setup: custom prompt via Enter key", async () => {
	const { win } = await makeApp();
	const input = $(win, "#customInput");
	input.value = "Via Enter";
	const ev = new win.KeyboardEvent("keydown", {
		key: "Enter",
		bubbles: true,
	});
	input.dispatchEvent(ev);
	await flush(win);
	assert.match($(win, ".custom-list").innerHTML, /Via Enter/);
});

test("setup: delete custom prompt", async () => {
	const { win } = await makeApp({
		preCustoms: JSON.stringify(["A", "B", "C"]),
	});
	const delBtns = $$(win, "[data-act='delCustom']");
	assert.equal(delBtns.length, 3);
	click(win, delBtns[1]);
	await flush(win);
	const customs = JSON.parse(win.localStorage.getItem("tribunale30_custom"));
	assert.deepEqual(customs, ["A", "C"]);
});

test("setup: customOnly + 0 customs keeps start disabled even with names", async () => {
	const { win } = await makeApp({ preCustoms: JSON.stringify(["only one"]) });
	await fillSetup(win, { rounds: 3 });
	fillField(win, "customOnly", true);
	await flush(win);
	assert.equal($(win, "#startBtn").disabled, true);
});

test("setup: customOnly with enough customs enables start", async () => {
	const customs = Array.from({ length: 5 }, (_, i) => `prompt ${i}`);
	const { win } = await makeApp({ preCustoms: JSON.stringify(customs) });
	await fillSetup(win, { rounds: 3 });
	fillField(win, "customOnly", true);
	await flush(win);
	assert.equal($(win, "#startBtn").disabled, false);
});

test("setup → opening transition", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	assert.equal(phase(win), "opening");
});

test("opening → charge (round 1)", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	clickAct(win, "proceed");
	await flush(win);
	assert.equal(phase(win), "charge");
	assert.match($(win, ".round-badge").textContent, /1 \/ 3/);
});

test("charge → player1 → player2 → vote phase chain", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	clickAct(win, "proceed");
	await flush(win);
	clickAct(win, "callP1");
	await flush(win);
	assert.equal(phase(win), "player1");
	clickAct(win, "callP2");
	await flush(win);
	assert.equal(phase(win), "player2");
	clickAct(win, "callVote");
	await flush(win);
	assert.equal(phase(win), "vote");
});

test("vote p1 increments p1 score (p1 colpevole)", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	await playOneRound(win, "p1");
	const s = scores(win);
	assert.equal(s.p1, 1);
	assert.equal(s.p2, 0);
});

test("vote p2 increments p2 score (p2 colpevole)", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	await playOneRound(win, "p2");
	const s = scores(win);
	assert.equal(s.p1, 0);
	assert.equal(s.p2, 1);
});

test("vote draw leaves both scores 0", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	await playOneRound(win, "draw");
	const s = scores(win);
	assert.equal(s.p1, 0);
	assert.equal(s.p2, 0);
});

test("result: pareggio text on draw vote", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	await playOneRound(win, "draw");
	assert.match($(win, ".result-text").textContent, /PAREGGIO/i);
});

test("result: guilty text on p1 vote includes p1 name", async () => {
	const { win } = await makeApp();
	await startGame(win, { p1: "Marco", rounds: 3 });
	await playOneRound(win, "p1");
	assert.match($(win, ".result-text").textContent, /Marco/);
});

test("result: button label = next on middle round", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	await playOneRound(win, "p1");
	const btn = $(win, '[data-act="nextRound"]');
	assert.match(btn.textContent, /Prossimo/i);
});

test("result: button label = final on last round", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	await playOneRound(win, "p1");
	await advanceRound(win);
	await playOneRound(win, "p1");
	await advanceRound(win);
	await playOneRound(win, "p1");
	const btn = $(win, '[data-act="nextRound"]');
	assert.match(btn.textContent, /Sentenza/i);
});

test("full game: 3 rounds, p1 all guilty → final p1 colpevole supremo", async () => {
	const { win } = await makeApp();
	await startGame(win, { p1: "Alpha", p2: "Beta", rounds: 3 });
	await playFullGame(win, ["p1", "p1", "p1"]);
	assert.equal(phase(win), "final");
	const s = scores(win);
	assert.equal(s.p1, 3);
	assert.equal(s.p2, 0);
	assert.match($(win, ".fedina-verdict").textContent, /ALPHA/);
});

test("full game: 3 rounds, p2 all guilty → final p2 colpevole supremo", async () => {
	const { win } = await makeApp();
	await startGame(win, { p1: "Alpha", p2: "Beta", rounds: 3 });
	await playFullGame(win, ["p2", "p2", "p2"]);
	const s = scores(win);
	assert.equal(s.p1, 0);
	assert.equal(s.p2, 3);
	assert.match($(win, ".fedina-verdict").textContent, /BETA/);
});

test("full game: tied scores → doppia condanna", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	await playFullGame(win, ["p1", "p2", "draw"]);
	const s = scores(win);
	assert.equal(s.p1, 1);
	assert.equal(s.p2, 1);
	assert.match($(win, ".fedina-verdict").textContent, /DOPPIA/);
});

test("full game: all draws → doppia condanna with 0-0", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	await playFullGame(win, ["draw", "draw", "draw"]);
	const s = scores(win);
	assert.equal(s.p1, 0);
	assert.equal(s.p2, 0);
	assert.match($(win, ".fedina-verdict").textContent, /DOPPIA/);
	assert.match($(win, ".fedina-draws").textContent, /Pareggi: 3/);
});

test("final: recap rows = totalRounds", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	await playFullGame(win, ["p1", "draw", "p2"]);
	assert.equal($$(win, ".recap-row").length, 3);
});

test("final: newTrial → setup with cleared state", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	await playFullGame(win, ["p1", "p1", "p1"]);
	clickAct(win, "newTrial");
	await flush(win);
	assert.equal(phase(win), "setup");
	assert.equal($(win, '[data-field="p1Name"]').value, "");
	assert.equal($(win, "#startBtn").disabled, true);
});

test("final: newTrial cancelled keeps final phase", async () => {
	const { win } = await makeApp({ confirmReturn: false });
	await startGame(win, { rounds: 3 });
	await playFullGame(win, ["p1", "p1", "p1"]);
	clickAct(win, "newTrial");
	await flush(win);
	assert.equal(phase(win), "final");
});

test("penalty fab visible in gameplay phases", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	clickAct(win, "proceed");
	await flush(win);
	assert.ok($(win, ".penalty-fab"));
});

test("penalty fab hidden in setup/opening/final", async () => {
	const { win } = await makeApp();
	assert.equal($(win, ".penalty-fab"), null);
	await startGame(win, { rounds: 3 });
	assert.equal($(win, ".penalty-fab"), null);
	await playFullGame(win, ["p1", "p1", "p1"]);
	assert.equal($(win, ".penalty-fab"), null);
});

test("penalty modal opens with 4 targets + reset + close", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	clickAct(win, "proceed");
	await flush(win);
	click(win, ".penalty-fab");
	await flush(win);
	const modal = $(win, ".modal-overlay");
	assert.ok(modal);
	assert.equal(modal.querySelectorAll("[data-target]").length, 4);
	assert.ok(modal.querySelector('[data-action="reset"]'));
	assert.ok(modal.querySelector('[data-action="close"]'));
});

test("penalty modal: close button removes modal", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	clickAct(win, "proceed");
	await flush(win);
	click(win, ".penalty-fab");
	await flush(win);
	click(win, '[data-action="close"]');
	await flush(win);
	assert.equal($(win, ".modal-overlay"), null);
});

test("penalty modal: overlay click removes modal", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	clickAct(win, "proceed");
	await flush(win);
	click(win, ".penalty-fab");
	await flush(win);
	const modal = $(win, ".modal-overlay");
	modal.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
	await flush(win);
	assert.equal($(win, ".modal-overlay"), null);
});

test("penalty modal: target click shows toast", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	clickAct(win, "proceed");
	await flush(win);
	click(win, ".penalty-fab");
	await flush(win);
	const target = $$(win, "[data-target]")[0];
	click(win, target);
	await flush(win);
	assert.ok($(win, ".toast"));
	assert.equal($(win, ".modal-overlay"), null);
});

test("penalty modal: reset → setup phase", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	clickAct(win, "proceed");
	await flush(win);
	click(win, ".penalty-fab");
	await flush(win);
	click(win, '[data-action="reset"]');
	await flush(win);
	assert.equal(phase(win), "setup");
});

test("persistence: mid-game reload restores phase + scores", async () => {
	const { win } = await makeApp();
	await startGame(win, { p1: "X", p2: "Y", rounds: 4 });
	await playOneRound(win, "p1");
	await advanceRound(win);
	await playOneRound(win, "p2");
	const savedState = win.localStorage.getItem("tribunale30_state");
	assert.ok(savedState);
	const { win: win2 } = await makeApp({ preState: savedState });
	const s = scores(win2);
	assert.equal(s.p1, 1);
	assert.equal(s.p2, 1);
	assert.equal(phase(win2), "result");
});

test("persistence: setup phase NOT restored", async () => {
	const { win } = await makeApp();
	fillField(win, "p1Name", "TypedName");
	const savedState = win.localStorage.getItem("tribunale30_state");
	assert.equal(savedState, null);
	const { win: win2 } = await makeApp();
	assert.equal(phase(win2), "setup");
	assert.equal($(win2, '[data-field="p1Name"]').value, "");
});

test("persistence: custom prompts survive reload", async () => {
	const { win } = await makeApp({
		preCustoms: JSON.stringify(["persisted A", "persisted B"]),
	});
	const items = $$(win, ".custom-item");
	assert.equal(items.length, 2);
});

test("insufficient prompts: shows toast, no transition", async () => {
	const { win } = await makeApp();
	$$(win, ".cat-filter").forEach((el) => click(win, el));
	await flush(win);
	const customs = ["a", "b"];
	win.localStorage.setItem("tribunale30_custom", JSON.stringify(customs));
	const { win: win2 } = await makeApp({
		preCustoms: JSON.stringify(customs),
	});
	$$(win2, ".cat-filter").forEach((el) => click(win2, el));
	await flush(win2);
	await fillSetup(win2, { rounds: 5 });
	fillField(win2, "customOnly", true);
	await flush(win2);
	clickAct(win2, "start");
	await flush(win2);
	assert.equal(phase(win2), "setup");
	assert.ok($(win2, ".toast"));
});

test("timer: progress + text elements rendered when timer enabled", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3, timer: true, timerSeconds: 30 });
	clickAct(win, "proceed");
	await flush(win);
	clickAct(win, "callP1");
	await flush(win);
	assert.ok($(win, "#timerProgress"));
	assert.equal($(win, "#timerText").textContent, "30");
});

test("timer: not rendered when disabled", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	clickAct(win, "proceed");
	await flush(win);
	clickAct(win, "callP1");
	await flush(win);
	assert.equal($(win, "#timerProgress"), null);
});

test("scoreboard: shows player names in p1/p2 colors", async () => {
	const { win } = await makeApp();
	await startGame(win, { p1: "Tizio", p2: "Caio", rounds: 3 });
	clickAct(win, "proceed");
	await flush(win);
	const names = $$(win, ".score-player .name");
	assert.equal(names.length, 2);
	assert.equal(names[0].textContent, "Tizio");
	assert.equal(names[1].textContent, "Caio");
	assert.ok(names[0].classList.contains("text-p1"));
	assert.ok(names[1].classList.contains("text-p2"));
});

test("scoreboard: active-turn highlights p1 in player1 phase", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	clickAct(win, "proceed");
	await flush(win);
	clickAct(win, "callP1");
	await flush(win);
	const players = $$(win, ".score-player");
	assert.ok(players[0].classList.contains("active-turn"));
	assert.equal(players[1].classList.contains("active-turn"), false);
});

test("scoreboard: active-turn highlights p2 in player2 phase", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	clickAct(win, "proceed");
	await flush(win);
	clickAct(win, "callP1");
	await flush(win);
	clickAct(win, "callP2");
	await flush(win);
	const players = $$(win, ".score-player");
	assert.equal(players[0].classList.contains("active-turn"), false);
	assert.ok(players[1].classList.contains("active-turn"));
});

test("charge phase: prompt category color applied inline", async () => {
	const { win } = await makeApp();
	await startGame(win, { rounds: 3 });
	clickAct(win, "proceed");
	await flush(win);
	const cat = $(win, ".charge-cat");
	assert.match(cat.style.color, /rgb\(/);
});

test("data-vote buttons render player names in vote phase", async () => {
	const { win } = await makeApp();
	await startGame(win, { p1: "Aldo", p2: "Bruno", rounds: 3 });
	clickAct(win, "proceed");
	await flush(win);
	clickAct(win, "callP1");
	await flush(win);
	clickAct(win, "callP2");
	await flush(win);
	clickAct(win, "callVote");
	await flush(win);
	assert.match($(win, '[data-vote="p1"]').textContent, /Aldo/);
	assert.match($(win, '[data-vote="p2"]').textContent, /Bruno/);
});

test("customOnly mode: only custom prompts in pool", async () => {
	const customs = Array.from({ length: 4 }, (_, i) => `Custom ${i}`);
	const { win } = await makeApp({ preCustoms: JSON.stringify(customs) });
	await fillSetup(win, { rounds: 3 });
	fillField(win, "customOnly", true);
	await flush(win);
	clickAct(win, "start");
	await flush(win);
	clickAct(win, "proceed");
	await flush(win);
	const txt = $(win, ".charge-text").textContent;
	assert.match(txt, /^Custom /);
});
