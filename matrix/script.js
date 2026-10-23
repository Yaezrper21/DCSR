/* MATRIX — A Discrete Structures Visual Novel. Vanilla JS, no libraries. */

/* ===== 1. SETTINGS (edit names / image paths here) ===== */
const PRESENTERS = "[NAME 1] [NAME 2] [NAME 3] [NAME 4]";
const CHARS = {
  1: { name: "Character 1", color: "#2f9e5a", x: "76%" },   // green hoodie, sunglasses
  2: { name: "Character 2", color: "#4a63d8", x: "24%" },   // glasses
  3: { name: "Character 3", color: "#d9822b", x: "50%" }    // white shirt
};
// Only 3 images exist per character (happy / surprised / thinking). Other expression names map to the closest one.
const EXPR = { neutral: "happy", happy: "happy", excited: "happy", surprised: "surprised", worried: "surprised", thinking: "thinking" };
const portrait = (c, e) => `assets/character${c}/${EXPR[e] || "happy"}.png`; // change image paths here

/* ===== 2. MATRIX DATA ===== */
const grid = (n, f) => Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => f(r, c)));
const ADD_A = grid(6, (r, c) => r * 6 + c + 1);          // 1..36
const ADD_B = grid(6, (r, c) => 36 - (r * 6 + c));       // 36..1
const SUB_A = grid(6, (r, c) => 10 * (c + 1) + r);       // 10,20,..60 / 11,21,..
const SUB_B = grid(6, (r, c) => c + 1);                  // 1..6 in every row
const MUL_A = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
const MUL_B = [[9, 8, 7], [6, 5, 4], [3, 2, 1]];

/* ===== 3. MATRIX CALCULATIONS (computed, never hard-coded) ===== */
const addMatrices = (A, B) => A.map((row, r) => row.map((v, c) => v + B[r][c]));
const subtractMatrices = (A, B) => A.map((row, r) => row.map((v, c) => v - B[r][c]));
function multiplyMatrices(A, B) {
  if (A[0].length !== B.length) return null;              // inner dimensions must match
  return A.map((row, r) => B[0].map((_, c) => row.reduce((s, v, k) => s + v * B[k][c], 0)));
}

/* ===== 4. UI HELPERS ===== */
const $ = s => document.querySelector(s);
const board = $("#board");
const wait = ms => new Promise(r => setTimeout(r, ms));
const isPres = () => document.body.classList.contains("pres");
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

function createMatrix(data, label, cls) {
  const m = el("div", "matrix " + (cls || "")), g = el("div", "mgrid");
  m.append(el("div", "mlabel", label));
  g.style.gridTemplateColumns = `repeat(${data[0].length},auto)`;
  data.forEach((row, r) => row.forEach((v, c) => { const d = el("div", "cell", v); d.dataset.r = r; d.dataset.c = c; g.append(d); }));
  m.append(g); m.grid = g; m.cols = data[0].length; return m;
}
const cellAt = (m, r, c) => m.grid.children[r * m.cols + c];
const clearHL = m => m.grid.querySelectorAll(".cell").forEach(x => x.classList.remove("hl", "row", "col"));
const highlightCell = (m, r, c, cls = "hl") => cellAt(m, r, c).classList.add(cls);
const highlightRow = (m, r) => { for (let c = 0; c < m.cols; c++) highlightCell(m, r, c, "row"); };
const highlightColumn = (m, c) => { for (let r = 0; r < m.grid.children.length / m.cols; r++) highlightCell(m, r, c, "col"); };

let cur = {}, anim = 0;   // cur = interactive objects of the board on screen

/* Addition / subtraction board: click a cell -> highlight matching cells + show the sum */
function opBoard(sym, A, B, fn) {
  board.className = "";
  const C = fn(A, B), ma = createMatrix(A, "A"), mb = createMatrix(B, "B"), mc = createMatrix(C, `A ${sym} B`);
  mc.grid.querySelectorAll(".cell").forEach(c => c.classList.add("unk"));
  const info = el("div", "info", "Click any number to see its calculation."), row = el("div", "mrow");
  row.append(ma, el("div", "op", sym), mb, el("div", "op", "="), mc);
  board.replaceChildren(row, info);
  const show = (r, c) => {
    [ma, mb, mc].forEach(m => { clearHL(m); highlightCell(m, r, c); });
    cellAt(mc, r, c).classList.remove("unk");
    info.innerHTML = `A[${r + 1},${c + 1}] ${sym} B[${r + 1},${c + 1}]<br><b>${A[r][c]} ${sym} ${B[r][c]} = ${C[r][c]}</b>`;
  };
  [ma, mb, mc].forEach(m => m.addEventListener("click", e => { const d = e.target.closest(".cell"); if (d) show(+d.dataset.r, +d.dataset.c); }));
  cur = { show, mc };
}
const revealAll = () => cur.mc.querySelectorAll(".unk").forEach(c => c.classList.remove("unk"));

/* Multiplication board: click a result cell -> animated Row x Column */
function mulBoard() {
  board.className = "big";
  const A = MUL_A, B = MUL_B, C = multiplyMatrices(A, B);
  const ma = createMatrix(A, "A"), mb = createMatrix(B, "B"), mc = createMatrix(C, "A × B");
  mc.grid.querySelectorAll(".cell").forEach(c => c.classList.add("unk"));
  const info = el("div", "info", "Click any cell of A × B to see its row × column."), row = el("div", "mrow");
  row.append(ma, el("div", "op", "×"), mb, el("div", "op", "="), mc);
  board.replaceChildren(row, info);
  const show = async (r, c) => {
    const id = ++anim; [ma, mb, mc].forEach(clearHL);
    highlightRow(ma, r); highlightColumn(mb, c); highlightCell(mc, r, c);
    info.innerHTML = `C[${r + 1},${c + 1}] = row ${r + 1} of A × column ${c + 1} of B`;
    const terms = [], prods = [];
    for (let k = 0; k < A[0].length; k++) {
      await wait(isPres() ? 200 : 700); if (id !== anim) return;
      ma.grid.querySelectorAll(".hl").forEach(x => x.classList.remove("hl")); mb.grid.querySelectorAll(".hl").forEach(x => x.classList.remove("hl"));
      highlightCell(ma, r, k); highlightCell(mb, k, c);
      terms.push(`(${A[r][k]}×${B[k][c]})`); prods.push(A[r][k] * B[k][c]);
      info.innerHTML = `${terms.join(" + ")}<br>= ${prods.join(" + ")}`;
    }
    await wait(isPres() ? 200 : 700); if (id !== anim) return;
    info.innerHTML += `<br>= <b>${C[r][c]}</b>`; cellAt(mc, r, c).classList.remove("unk"); highlightCell(mc, r, c);
  };
  [ma, mb, mc].forEach(m => m.addEventListener("click", e => { const d = e.target.closest(".cell"); if (d && m === mc) show(+d.dataset.r, +d.dataset.c); }));
  cur = { show, mc };
}

/* Basics board: rows / columns / elements of a 3x3 matrix */
function basicsBoard() {
  board.className = "big";
  const m = createMatrix(MUL_A, "A"), info = el("div", "info", "A is a 3×3 matrix: 3 rows and 3 columns."), bar = el("div", "bar");
  const say = (html, fn) => { clearHL(m); fn(); info.innerHTML = html; };
  for (let i = 0; i < 3; i++) {
    const rb = el("button", "", `Row ${i + 1}`), cb = el("button", "", `Column ${i + 1}`);
    rb.onclick = () => say(`Row ${i + 1} = [ ${MUL_A[i].join("  ")} ] <b>(horizontal)</b>`, () => highlightRow(m, i));
    cb.onclick = () => say(`Column ${i + 1} = [ ${MUL_A.map(r => r[i]).join("  ")} ] <b>(vertical)</b>`, () => highlightColumn(m, i));
    bar.append(rb, cb);
  }
  m.addEventListener("click", e => { const d = e.target.closest(".cell"); if (d) { const r = +d.dataset.r, c = +d.dataset.c; say(`A[${r + 1},${c + 1}] = <b>${MUL_A[r][c]}</b> (row ${r + 1}, column ${c + 1})`, () => highlightCell(m, r, c)); } });
  board.replaceChildren(m, info, bar); cur = { m };
}

/* Dimension rule board (stage 1 = valid example, stage 2 = adds invalid example) */
function dimBoard(stage) {
  board.className = "";
  let h = `<div class="drow">(2×<mark>3</mark>)(<mark>3</mark>×4) → <b>2×4</b><small>✓ Inner numbers match (3 = 3). The outside numbers give the result size: 2×4.</small></div>`;
  if (stage > 1) h += `<div class="drow">(2×<mark>3</mark>)(<mark>2</mark>×4)<small>✕ Inner numbers differ (3 ≠ 2). These cannot be multiplied.</small></div>`;
  board.replaceChildren(el("div", "dim", h));
}

function reviewBoard() {
  board.className = "";
  const card = (t, ps) => `<div class="card"><h3>${t}</h3>${ps.map(p => `<p>• ${p}</p>`).join("")}</div>`;
  board.replaceChildren(el("div", "cards",
    card("MATRIX ADDITION", ["Add corresponding elements.", "Same dimensions required."]) +
    card("MATRIX SUBTRACTION", ["Subtract corresponding elements.", "Same dimensions required."]) +
    card("MATRIX MULTIPLICATION", ["Multiply rows by columns.", "Columns of the first matrix must equal rows of the second.", "Result uses the outside dimensions."])));
}

/* ===== 5. DIALOGUE ENGINE ===== */
// Entry: {c:character, e:expression, t:text, run:fn, ch:[choices]}  (entries with no t only run code)
// Choice: {t, go:[entries]}  or  {t, ok:true/false, fb:"feedback"} for questions
let queue = [], idx = 0, typing = false, ready = false, timer, fullText = "", onType = null;

function buildCast() {
  const cast = $("#cast");
  [1, 2, 3].forEach(c => {
    const f = el("figure", "hide"); f.id = "fig" + c; f.style.setProperty("--x", CHARS[c].x);
    const i = el("img"); i.alt = CHARS[c].name; i.src = portrait(c, "happy"); f.append(i); cast.append(f);
  });
}
// all=true shows all three students; otherwise only the speaker is visible
function speaker(c, e, all) {
  [1, 2, 3].forEach(n => { const f = $("#fig" + n); f.classList.toggle("on", n === c); f.classList.toggle("hide", !(all || n === c)); });
  if (!c) return;
  $("#fig" + c + " img").src = portrait(c, e || "neutral");
  const w = $("#who"); w.textContent = CHARS[c].name; w.style.background = CHARS[c].color;
}
function say(c, e, t) { speaker(c, e); clearInterval(timer); typing = false; $("#txt").textContent = t; }
function type(t, done) {
  clearInterval(timer); let i = 0; typing = true; fullText = t; onType = done;
  $("#txt").textContent = ""; $("#next").style.visibility = "hidden";
  timer = setInterval(() => { $("#txt").textContent = t.slice(0, ++i); if (i >= t.length) endType(); }, isPres() ? 6 : 18);
}
function endType() {
  clearInterval(timer); typing = false; $("#txt").textContent = fullText;
  const d = onType; onType = null; if (d) d();
}
function play(list) { queue = list.slice(); idx = 0; ready = false; step(); }
function step() {
  $("#choices").innerHTML = ""; ready = false;
  if (idx >= queue.length) return;
  const e = queue[idx++];
  if (e.run) e.run();
  $("#game").classList.toggle("math", board.children.length > 0);   // matrices on screen -> characters shrink
  if (!e.t) { step(); return; }
  speaker(e.c, e.e, e.all);
  type(e.t, () => { if (e.ch) showChoices(e.ch, e.c); else { ready = true; $("#next").style.visibility = "visible"; } });
}
function advance() {
  if (typing) { endType(); return; }
  if (ready) step();
}
function showChoices(list, c) {
  const box = $("#choices"); box.innerHTML = ""; $("#next").style.visibility = "hidden";
  list.forEach(o => {
    const b = el("button", "", o.t);
    b.onclick = () => {
      if (o.ok === undefined) { queue.splice(idx, 0, ...(o.go || [])); step(); }
      else if (o.ok) {
        b.className = "good"; b.innerHTML = "✓ CORRECT — " + o.t;
        box.querySelectorAll("button").forEach(x => x.disabled = true);
        say(c, "happy", o.fb); ready = true; $("#next").style.visibility = "visible";
      } else { b.className = "bad"; b.innerHTML = "✕ TRY AGAIN — " + o.t; b.disabled = true; say(c, "surprised", o.fb); }
    };
    box.append(b);
  });
}
const WRONG = "Not quite. Remember to use the corresponding positions.";

/* ===== 6. DIALOGUE DATA ===== */
// PRESENTATION SCRIPT: each character presents only their own topic, speaking to the audience.
//   Intro: Character 1 · Addition: Character 2 · Subtraction: Character 3
//   Multiplication: Characters 1 and 4 · Review: Character 4
const INTRO = [
  { c: 1, e: "happy", all: true, t: "Good morning, everyone! Our report today is about MATRICES. We will cover addition, subtraction and multiplication.", run: () => { board.className = ""; board.replaceChildren(); } },
  { c: 1, e: "neutral", t: "A matrix is a rectangular arrangement of numbers organized into rows and columns.", run: basicsBoard },
  { c: 1, e: "thinking", t: "This is a 3×3 matrix because it has 3 rows and 3 columns.", run: () => { highlightRow(cur.m, 0); highlightColumn(cur.m, 2); } },
  { c: 1, e: "neutral", t: "Rows go horizontally. Columns go vertically. What would you like to see next?", ch: [
    { t: "1. Continue", go: [] },
    { t: "2. Explain rows and columns", go: [
      { c: 1, e: "neutral", t: "Every number has an address: row first, then column. A[2,3] is row 2, column 3, which is the number 6.", run: () => { clearHL(cur.m); highlightCell(cur.m, 1, 2); } },
      { c: 1, e: "happy", t: "Remember: row first, column second. Always." }] },
    { t: "3. What can matrices do?", go: [
      { c: 1, e: "neutral", t: "Matrices store organized data such as tables, scores, images and networks in computer science." },
      { c: 1, e: "happy", t: "We can add, subtract and multiply them. Let's look at each operation." }] }] },
  { run: () => showMenu() }
];

const LESSONS = {
  add: [
    { c: 2, e: "happy", t: "Good day! I will discuss Matrix Addition.", run: () => board.replaceChildren() },
    { c: 2, e: "thinking", t: "To add matrices, we add corresponding elements.", run: () => opBoard("+", ADD_A, ADD_B, addMatrices) },
    { c: 2, e: "neutral", t: "Two matrices can be added only when they have the same dimensions. Here, both are 6×6." },
    { c: 2, e: "thinking", t: "Take A[1,1] = 1. The element in the same position of B is B[1,1] = 36, so 1 + 36 = 37. Click any number to see its calculation.", run: () => cur.show(0, 0) },
    { c: 2, e: "happy", t: "Here is the full result, A + B. Every position adds up to 37.", run: revealAll },
    { c: 2, e: "neutral", t: "In short: each element is added to the element in the same position." },
    { c: 2, e: "thinking", t: "Quick check: what is A[3,4] + B[3,4]?", ch: [
      { t: "16 + 21 = 37", ok: true, fb: "Correct! 16 + 21 = 37." },
      { t: "15 + 22 = 37", ok: false, fb: WRONG },
      { t: "16 + 22 = 38", ok: false, fb: WRONG }] },
    { run: () => finish("add") }],
  sub: [
    { c: 3, e: "happy", t: "Hello, everyone! My topic is Matrix Subtraction.", run: () => board.replaceChildren() },
    { c: 3, e: "thinking", t: "To subtract matrices, we subtract corresponding elements.", run: () => opBoard("-", SUB_A, SUB_B, subtractMatrices) },
    { c: 3, e: "neutral", t: "Two matrices can be subtracted only when they have the same dimensions. Both of these are 6×6." },
    { c: 3, e: "happy", t: "For the first cell, A[1,1] - B[1,1] = 10 - 1 = 9. Click any number to check the others.", run: () => cur.show(0, 0) },
    { c: 3, e: "happy", t: "Here is the complete result, A - B.", run: revealAll },
    { c: 3, e: "thinking", t: "Quick check: what is A[4,5] - B[4,5]?", ch: [
      { t: "53 - 5 = 48", ok: true, fb: "Correct! 53 - 5 = 48." },
      { t: "53 - 6 = 47", ok: false, fb: "Not quite. Remember to subtract the corresponding elements." },
      { t: "54 - 5 = 49", ok: false, fb: "Not quite. Remember to subtract the corresponding elements." }] },
    { run: () => finish("sub") }],
  mul: [
    { c: 1, e: "surprised", t: "Now for Matrix Multiplication. This one needs closer attention!", run: () => board.replaceChildren() },
    { c: 1, e: "neutral", t: "The number of columns in the first matrix must equal the number of rows in the second matrix.", run: mulBoard },
    { c: 1, e: "thinking", t: "Matrix multiplication is NOT element-by-element. We multiply a row by a column, then add the products." },
    { c: 1, e: "neutral", t: "For C[1,1]: (1×9) + (2×6) + (3×3) = 9 + 12 + 9 = 30.", run: () => cur.show(0, 0) },
    { c: 1, e: "neutral", t: "For C[1,2]: (1×8) + (2×5) + (3×2) = 8 + 10 + 6 = 24.", run: () => cur.show(0, 1) },
    { c: 1, e: "neutral", t: "Repeating this for every cell gives the full result.", run: revealAll },
    { c: 1, e: "happy", t: "A × B = [30 24 18; 84 69 54; 138 114 90]. Click any cell to replay its calculation, for example C[2,1]." },
    { c: 1, e: "thinking", t: "Quick check: what is C[2,1]?", ch: [
      { t: "(4×9) + (5×6) + (6×3) = 84", ok: true, fb: "Correct! 36 + 30 + 18 = 84." },
      { t: "4×9 = 36", ok: false, fb: "Not quite. Add ALL the row × column products." },
      { t: "(4+5+6) × (9+6+3) = 270", ok: false, fb: "Not quite. Multiply pairs first, then add." }] },
    { c: 1, e: "neutral", t: "Before multiplying, always check the dimensions. The inner dimensions must match.", run: () => dimBoard(1) },
    { c: 1, e: "neutral", t: "For (2×3)(3×4), the inner 3 and 3 match, so we can multiply. The outside numbers give the result size: 2×4." },
    { c: 1, e: "thinking", t: "Now (2×3)(2×4): the inner dimensions, 3 and 2, do not match, so these matrices cannot be multiplied.", run: () => dimBoard(2) },
    { run: () => finish("mul") }],
  basics: [
    { c: 1, e: "neutral", t: "A quick review. A matrix has rows (horizontal) and columns (vertical).", run: basicsBoard },
    { c: 1, e: "neutral", t: "Here are the three operations in one place.", run: reviewBoard },
    { c: 1, e: "happy", t: "Same size for addition and subtraction. Inner sizes must match for multiplication." },
    { run: () => finish("basics") }]
};

const ENDING = [
  { c: 2, e: "happy", t: "Addition: add corresponding elements. Both matrices need the same dimensions." },
  { c: 3, e: "happy", t: "Subtraction: subtract corresponding elements. Same dimensions are required too." },
  { c: 1, e: "happy", t: "Multiplication: multiply rows by columns. Columns of the first must equal rows of the second. Matrices are organized structures with clear rules. Thank you for listening!", run: showFinal },
];

/* ===== 7. FINAL SCREEN (shown after all lessons are completed) ===== */
function showFinal() {
  board.className = "";
  const f = el("div", "final", `<h1>MATRIX</h1><p>Organized numbers.<br>Clear rules.<br>Multiple operations.</p><br><p><b>Congratulations! You completed the Matrix lesson.</b></p><br>`);
  const bar = el("div", "bar");
  [["REVIEW", () => startLesson("basics")], ["MAIN MENU", showMenu], ["RESTART", restart]].forEach(([t, fn]) => { const b = el("button", "", t); b.onclick = fn; bar.append(b); });
  f.append(bar); board.replaceChildren(f);
}

/* ===== 8. SCENE NAVIGATION ===== */
const done = new Set(); let screenId = "title";
const LABELS = { add: "1. Matrix Addition", sub: "2. Matrix Subtraction", mul: "3. Matrix Multiplication", basics: "4. Review the Basics" };
function screen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("on", s.id === id));
  screenId = id; document.body.dataset.s = id; if (document.activeElement) document.activeElement.blur();
}
function showMenu() {
  clearInterval(timer); anim++; screen("menu");
  const list = $("#menuList"); list.innerHTML = "";
  Object.keys(LABELS).forEach(k => {
    const b = el("button", "", `<span>${LABELS[k]}</span><span class="chk">${done.has(k) ? "✓ Completed" : ""}</span>`);
    b.onclick = () => startLesson(k); list.append(b);
  });
}
function startLesson(k) {
  screen("game"); board.replaceChildren(); $("#lessonName").textContent = LABELS[k].replace(/^\d\. /, "").toUpperCase(); $("#scoreTag").textContent = "";
  play(LESSONS[k]);
}
let endingShown = false;
function finish(k) {
  done.add(k);
  if (!endingShown && Object.keys(LESSONS).every(x => done.has(x))) { endingShown = true; play(ENDING); }
  else showMenu();
}
function startGame() { screen("game"); board.replaceChildren(); $("#lessonName").textContent = "INTRODUCTION"; $("#scoreTag").textContent = ""; play(INTRO); }
function restart() { done.clear(); endingShown = false; screen("title"); }

function overlay(html) { $("#oBody").innerHTML = html; $("#overlay").hidden = false; $("#oClose").focus(); }
const closeOverlay = () => { $("#overlay").hidden = true; };
function togglePres() { document.body.classList.toggle("pres"); }

/* ===== 9. EVENTS ===== */
$("#bStart").onclick = startGame;
$("#bHow").onclick = () => overlay("<h2>HOW TO PLAY</h2><p>Read the dialogue, make choices, and solve matrix problems to continue.</p><p><small>SPACE / ENTER = continue · P = Presentation Mode · ESC = menu / close</small></p>");
$("#bCred").onclick = () => overlay(`<h2>CREDITS</h2><p>Created for Discrete Structures</p><p>Presented by: ${PRESENTERS}</p>`);
$("#oClose").onclick = closeOverlay;
$("#bMenu").onclick = showMenu;
$("#bPres").onclick = togglePres;
$("#dlg").onclick = e => { if (!e.target.closest("button")) advance(); };
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { if (!$("#overlay").hidden) closeOverlay(); else if (screenId === "game") showMenu(); }
  else if (e.key === "p" || e.key === "P") togglePres();
  else if (e.key === "m" || e.key === "M") toggleMusic();
  else if ((e.key === " " || e.key === "Enter") && e.target.tagName !== "BUTTON" && $("#overlay").hidden && screenId === "game") { e.preventDefault(); advance(); }
});

/* ===== 10. SETUP: portraits on title screen, cast, floating particles ===== */
[2, 3, 1].forEach(c => { const i = el("img"); i.src = portrait(c, "happy"); i.alt = CHARS[c].name; $("#titleCast").append(i); });
buildCast();

/* ===== 11. BACKGROUND MUSIC =====
   Generated live with the Web Audio API (soft pads + gentle bells + reverb), so no audio file is needed.
   Browsers only allow sound after a click/key press, so music starts on your first interaction. */
const Music = (() => {
  let ctx, master, bus, pad, timer, beat = 0, playing = false;
  const CHORDS = [[48, 55, 59, 64], [45, 52, 57, 60], [41, 48, 52, 57], [43, 50, 55, 59]]; // Cmaj7 Am7 Fmaj7 G6
  const BELLS = [72, 74, 76, 79, 81, 84];                                                  // C major pentatonic
  const hz = m => 440 * 2 ** ((m - 69) / 12);
  function tone(m, t, dur, vol, type, dest, attack) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.1);
  }
  function tick() {                       // runs every 2 seconds; a new chord every 4th tick
    const t = ctx.currentTime + 0.1;
    if (beat % 4 === 0) CHORDS[(beat / 4) % 4].forEach(m => { tone(m, t, 9, 0.035, "sine", pad, 2.5); tone(m + 12, t, 9, 0.012, "triangle", pad, 3); });
    if (Math.random() < 0.8) tone(BELLS[Math.floor(Math.random() * BELLS.length)], t + Math.random() * 1.5, 3.5, 0.05, "sine", bus, 0.02);
    beat++;
  }
  function setup() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    bus = ctx.createGain(); bus.connect(master);
    const len = ctx.sampleRate * 3, ir = ctx.createBuffer(2, len, ctx.sampleRate);          // simple reverb impulse
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.5; }
    const rev = ctx.createConvolver(), wet = ctx.createGain(); rev.buffer = ir; wet.gain.value = 0.6;
    bus.connect(rev); rev.connect(wet); wet.connect(master);
    pad = ctx.createBiquadFilter(); pad.type = "lowpass"; pad.frequency.value = 900; pad.connect(bus);
  }
  return {
    get playing() { return playing; },
    start() {
      if (playing) return; if (!ctx) setup();
      ctx.resume(); master.gain.setTargetAtTime(0.4, ctx.currentTime, 1.5);
      tick(); timer = setInterval(tick, 2000); playing = true;
    },
    stop() {
      if (!playing) return; clearInterval(timer); playing = false;
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    }
  };
})();
let musicWanted = true;
function updateMusicBtn() { $("#bMusic").textContent = Music.playing ? "🔊 MUSIC ON (M)" : "🔇 MUSIC OFF (M)"; }
function toggleMusic() { if (Music.playing) { Music.stop(); musicWanted = false; } else { Music.start(); musicWanted = true; } updateMusicBtn(); }
function firstInteraction(e) {
  if (e.target.id === "bMusic" || e.key === "m" || e.key === "M") return;   // let the toggle handle itself
  removeEventListener("pointerdown", firstInteraction); removeEventListener("keydown", firstInteraction);
  if (musicWanted) { try { Music.start(); } catch (err) {} updateMusicBtn(); }
}
addEventListener("pointerdown", firstInteraction); addEventListener("keydown", firstInteraction);
$("#bMusic").onclick = toggleMusic; updateMusicBtn(); document.body.dataset.s = "title";
