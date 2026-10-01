/* MATRIX — A Discrete Structures Visual Novel. Vanilla JS, no libraries. */

/* ===== 1. SETTINGS (edit names / image paths here) ===== */
const PRESENTERS = "[NAME 1] [NAME 2] [NAME 3] [NAME 4]";
const CHARS = {
  1: { name: "Character 1", color: "#4ade80" },
  2: { name: "Character 2", color: "#a78bfa" },
  3: { name: "Character 3", color: "#7dd3fc" },
  4: { name: "Character 4", color: "#fb7185" }
};
const portrait = (c, e) => `assets/character${c}/${e}.png`; // change image paths here

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
  [1, 2, 3, 4].forEach(c => {
    const f = el("figure"); f.id = "fig" + c; f.style.setProperty("--cc", CHARS[c].color);
    const i = el("img"); i.alt = CHARS[c].name; i.src = portrait(c, "neutral"); f.append(i); cast.append(f);
  });
}
function speaker(c, e) {
  [1, 2, 3, 4].forEach(n => $("#fig" + n).classList.toggle("on", n === c));
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
  if (!e.t) { step(); return; }
  speaker(e.c, e.e);
  type(e.t, () => { if (e.ch) showChoices(e.ch); else { ready = true; $("#next").style.visibility = "visible"; } });
}
function advance() {
  if (typing) { endType(); return; }
  if (ready) step();
}
function showChoices(list) {
  const box = $("#choices"); box.innerHTML = ""; $("#next").style.visibility = "hidden";
  list.forEach(o => {
    const b = el("button", "", o.t);
    b.onclick = () => {
      if (o.ok === undefined) { queue.splice(idx, 0, ...(o.go || [])); step(); }
      else if (o.ok) {
        b.className = "good"; b.innerHTML = "✓ CORRECT — " + o.t;
        box.querySelectorAll("button").forEach(x => x.disabled = true);
        say(1, "excited", o.fb); ready = true; $("#next").style.visibility = "visible";
      } else { b.className = "bad"; b.innerHTML = "✕ TRY AGAIN — " + o.t; b.disabled = true; say(1, "worried", o.fb); }
    };
    box.append(b);
  });
}
const WRONG = "Not quite. Remember to use the corresponding positions.";

/* ===== 6. DIALOGUE DATA ===== */
const INTRO = [
  { c: 1, e: "happy", t: "So... we're supposed to report about matrices today?", run: () => { board.className = ""; board.innerHTML = '<div class="final"><h1>MATRICES</h1></div>'; } },
  { c: 3, e: "thinking", t: "Yeah. But aren't matrices just boxes filled with numbers?" },
  { c: 2, e: "neutral", t: "Not exactly." },
  { c: 2, e: "neutral", t: "A matrix is a rectangular arrangement of numbers organized into rows and columns.", run: basicsBoard },
  { c: 2, e: "thinking", t: "This is a 3×3 matrix because it has 3 rows and 3 columns.", run: () => { highlightRow(cur.m, 0); highlightColumn(cur.m, 2); } },
  { c: 4, e: "neutral", t: "Rows go horizontally. Columns go vertically. (Try the buttons under the matrix.)" },
  { c: 3, e: "happy", t: "Okay, that makes sense! What should we do next?", ch: [
    { t: "1. Continue", go: [] },
    { t: "2. Explain rows and columns", go: [
      { c: 2, e: "neutral", t: "Every number has an address: row first, then column. A[2,3] is row 2, column 3 — the number 6.", run: () => { clearHL(cur.m); highlightCell(cur.m, 1, 2); } },
      { c: 4, e: "neutral", t: "Row first. Column second. Always." }] },
    { t: "3. What can matrices do?", go: [
      { c: 2, e: "neutral", t: "They store organized data: tables, scores, even images and networks in computer science." },
      { c: 3, e: "excited", t: "And we can add, subtract and multiply them?" },
      { c: 2, e: "happy", t: "Exactly. Let's learn those three operations." }] }] },
  { run: () => showMenu() }
];

const LESSONS = {
  add: [
    { c: 3, e: "thinking", t: "Let's start with addition. Is it just like normal addition?" },
    { c: 2, e: "neutral", t: "Pretty much. We add corresponding elements.", run: () => opBoard("+", ADD_A, ADD_B, addMatrices) },
    { c: 2, e: "neutral", t: "Two matrices can be added only when they have the same dimensions. Here, both are 6×6." },
    { c: 4, e: "neutral", t: "Click any number in A, B or the result to see its calculation.", run: () => cur.show(0, 0) },
    { c: 3, e: "happy", t: "A[1,1] = 1 and B[1,1] = 36, so 1 + 36 = 37!" },
    { c: 2, e: "happy", t: "Here is the full result, A + B. Every position adds up to 37.", run: revealAll },
    { c: 2, e: "neutral", t: "Each element is added to the element in the same position." },
    { c: 2, e: "thinking", t: "Your turn: what is A[3,4] + B[3,4]?", ch: [
      { t: "16 + 21 = 37", ok: true, fb: "Correct! 16 + 21 = 37." },
      { t: "15 + 22 = 37", ok: false, fb: WRONG },
      { t: "16 + 22 = 38", ok: false, fb: WRONG }] },
    { run: () => finish("add") }],
  sub: [
    { c: 1, e: "neutral", t: "Subtraction should work almost the same way, right?" },
    { c: 2, e: "neutral", t: "Exactly. We subtract corresponding elements.", run: () => opBoard("-", SUB_A, SUB_B, subtractMatrices) },
    { c: 2, e: "neutral", t: "Two matrices can be subtracted only when they have the same dimensions." },
    { c: 1, e: "happy", t: "So the first cell is 10 - 1 = 9.", run: () => cur.show(0, 0) },
    { c: 4, e: "neutral", t: "Click other cells to check the rest.", run: revealAll },
    { c: 2, e: "thinking", t: "Now you: what is A[4,5] - B[4,5]?", ch: [
      { t: "53 - 5 = 48", ok: true, fb: "Correct! 53 - 5 = 48." },
      { t: "53 - 6 = 47", ok: false, fb: "Not quite. Remember to subtract the corresponding elements." },
      { t: "54 - 5 = 49", ok: false, fb: "Not quite. Remember to subtract the corresponding elements." }] },
    { run: () => finish("sub") }],
  mul: [
    { c: 1, e: "happy", t: "Addition and subtraction were easy enough." },
    { c: 3, e: "happy", t: "How difficult can multiplication be?" },
    { c: 2, e: "thinking", t: "...This is where you need to pay attention." },
    { c: 2, e: "neutral", t: "For matrix multiplication, the number of columns in the first matrix must equal the number of rows in the second matrix.", run: mulBoard },
    { c: 1, e: "surprised", t: "Wait... so it's not just multiplying the matching numbers?" },
    { c: 2, e: "neutral", t: "Correct. It is NOT element-by-element. It is Row × Column, then we add the products." },
    { c: 2, e: "thinking", t: "C[1,1] = (1×9) + (2×6) + (3×3) = 9 + 12 + 9 = 30.", run: () => cur.show(0, 0) },
    { c: 3, e: "worried", t: "Okay... and C[1,2]?" },
    { c: 2, e: "neutral", t: "C[1,2] = (1×8) + (2×5) + (3×2) = 8 + 10 + 6 = 24.", run: () => cur.show(0, 1) },
    { c: 4, e: "happy", t: "Doing that for every cell gives the whole product.", run: () => { revealAll(); } },
    { c: 2, e: "happy", t: "A × B = [30 24 18; 84 69 54; 138 114 90]. Click any cell to replay its calculation — try C[2,1]." },
    { c: 2, e: "thinking", t: "Your turn: what is C[2,1]?", ch: [
      { t: "(4×9) + (5×6) + (6×3) = 84", ok: true, fb: "Correct! 36 + 30 + 18 = 84." },
      { t: "4×9 = 36", ok: false, fb: "Not quite. Add ALL the row × column products." },
      { t: "(4+5+6) × (9+6+3) = 270", ok: false, fb: "Not quite. Multiply pairs first, then add." }] },
    { c: 2, e: "neutral", t: "Before multiplying, always check the dimensions. The inner dimensions must match.", run: () => dimBoard(1) },
    { c: 2, e: "neutral", t: "(2×3)(3×4): the inner 3 and 3 match, so we can multiply. The outside numbers give the result: 2×4." },
    { c: 4, e: "neutral", t: "And when they don't match?", run: () => dimBoard(2) },
    { c: 2, e: "neutral", t: "(2×3)(2×4): the inner dimensions do not match, so these matrices cannot be multiplied." },
    { run: () => finish("mul") }],
  basics: [
    { c: 2, e: "neutral", t: "Quick review of the basics. A matrix has rows (horizontal) and columns (vertical).", run: basicsBoard },
    { c: 4, e: "neutral", t: "Here are the three operations in one place.", run: reviewBoard },
    { c: 3, e: "happy", t: "Same size for + and −. Inner sizes match for ×. Got it!" },
    { run: () => finish("basics") }]
};

const ENDING = [
  { c: 3, e: "happy", t: "So matrices aren't just random numbers in boxes." },
  { c: 2, e: "happy", t: "Right. They are organized structures with specific rules." },
  { c: 1, e: "excited", t: "Addition, subtraction, and multiplication!" },
  { c: 4, e: "happy", t: "And now you know how they work.", run: showFinal },
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
  screenId = id; if (document.activeElement) document.activeElement.blur();
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
  screen("game"); $("#lessonName").textContent = LABELS[k].replace(/^\d\. /, "").toUpperCase(); $("#scoreTag").textContent = "";
  play(LESSONS[k]);
}
let endingShown = false;
function finish(k) {
  done.add(k);
  if (!endingShown && Object.keys(LESSONS).every(x => done.has(x))) { endingShown = true; play(ENDING); }
  else showMenu();
}
function startGame() { screen("game"); $("#lessonName").textContent = "INTRODUCTION"; $("#scoreTag").textContent = ""; play(INTRO); }
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
  else if ((e.key === " " || e.key === "Enter") && e.target.tagName !== "BUTTON" && $("#overlay").hidden && screenId === "game") { e.preventDefault(); advance(); }
});

/* ===== 10. SETUP: portraits on title screen, cast, floating particles ===== */
[[1, "happy", "#sideL"], [2, "neutral", "#sideL"], [3, "happy", "#sideR"], [4, "neutral", "#sideR"]].forEach(([c, e, s]) => {
  const i = el("img"); i.src = portrait(c, e); i.alt = CHARS[c].name; i.style.setProperty("--cc", CHARS[c].color); $(s).append(i);
});
buildCast();
(function particles() {
  const cv = $("#bg"), x = cv.getContext("2d"), P = [];
  const size = () => { cv.width = innerWidth; cv.height = innerHeight; }; size(); addEventListener("resize", size);
  for (let i = 0; i < 45; i++) P.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: Math.random() * 2 + .5, v: Math.random() * .3 + .1 });
  (function draw() {
    x.clearRect(0, 0, cv.width, cv.height);
    if (!isPres()) { x.fillStyle = "rgba(150,170,255,.45)"; P.forEach(p => { p.y -= p.v; if (p.y < 0) p.y = cv.height; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 7); x.fill(); }); }
    requestAnimationFrame(draw);
  })();
})();
