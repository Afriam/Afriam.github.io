"use strict";

const root = document.documentElement;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function store(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
}

function load(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

/* ---------------------------------------------------------
   Theme (light / dark) — saved per visitor
   --------------------------------------------------------- */
const themeToggle = document.getElementById("theme-toggle");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const themeListeners = [];

function applyTheme(theme) {
  root.setAttribute("data-theme", theme);
  const isDark = theme === "dark";
  themeToggle.innerHTML = `<i class="fa-solid fa-${isDark ? "sun" : "moon"}" aria-hidden="true"></i>`;
  themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  themeColorMeta.setAttribute("content", isDark ? "#050a1a" : "#eef1f8");
  themeListeners.forEach((fn) => fn(theme));
}

themeToggle.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  store("theme", next);
});

applyTheme(root.getAttribute("data-theme") || "dark");

/* ---------------------------------------------------------
   Sidebar — collapse (desktop) and drawer (mobile)
   --------------------------------------------------------- */
const sidebar = document.getElementById("sidebar");
const collapseToggle = document.getElementById("collapse-toggle");
const menuToggle = document.getElementById("menu-toggle");
const scrim = document.getElementById("scrim");
const mobileQuery = window.matchMedia("(max-width: 900px)");

function setCollapsed(collapsed) {
  root.classList.toggle("sidebar-collapsed", collapsed);
  collapseToggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
  store("sidebar", collapsed ? "collapsed" : "expanded");
}

collapseToggle.addEventListener("click", () => setCollapsed(!root.classList.contains("sidebar-collapsed")));
setCollapsed(root.classList.contains("sidebar-collapsed"));

function setDrawer(open) {
  root.classList.toggle("sidebar-open", open);
  scrim.hidden = !open;
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  menuToggle.innerHTML = `<i class="fa-solid fa-${open ? "xmark" : "bars"}" aria-hidden="true"></i>`;
  if (open) sidebar.querySelector(".side-nav a.active, .side-nav a").focus();
}

menuToggle.addEventListener("click", () => setDrawer(!root.classList.contains("sidebar-open")));
scrim.addEventListener("click", () => setDrawer(false));
mobileQuery.addEventListener("change", () => setDrawer(false));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && root.classList.contains("sidebar-open")) {
    setDrawer(false);
    menuToggle.focus();
  }
});

/* ---------------------------------------------------------
   Page router — each sidebar button shows its own page
   --------------------------------------------------------- */
const pages = new Map([...document.querySelectorAll(".page")].map((p) => [p.dataset.page, p]));
const navItems = new Map([...document.querySelectorAll(".side-nav a")].map((a) => [a.dataset.page, a]));
const navIndicator = document.querySelector(".nav-indicator");
const topbarPage = document.getElementById("topbar-page");
const mainEl = document.getElementById("main");
const pageLeaveHooks = [];
const pageEnterHooks = [];
let currentPage = null;

function moveIndicator() {
  const link = navItems.get(currentPage);
  if (!link) return;
  navIndicator.style.transform = `translateY(${link.offsetTop}px)`;
  navIndicator.style.opacity = "1";
}

function showPage(name, fromUser) {
  if (name === currentPage) return;
  const target = pages.get(name);
  const previous = currentPage;

  pages.forEach((page, key) => { page.hidden = key !== name; });
  navItems.forEach((link, key) => {
    link.classList.toggle("active", key === name);
    if (key === name) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  currentPage = name;
  moveIndicator();
  const label = navItems.get(name).querySelector("span").textContent;
  topbarPage.textContent = label;
  document.title = name === "home" ? "Afriam Mana-ing | IT Staff" : `${label} · Afriam Mana-ing`;

  if (!prefersReducedMotion) {
    target.classList.remove("is-entering");
    void target.offsetWidth; // restart the animation
    target.classList.add("is-entering");
    setTimeout(() => target.classList.remove("is-entering"), 900);
  }

  window.scrollTo(0, 0);
  if (fromUser) mainEl.focus({ preventScroll: true });
  setDrawer(false);

  pageLeaveHooks.forEach((fn) => fn(previous, name));
  pageEnterHooks.forEach((fn) => fn(name));
}

function route(fromUser) {
  const name = location.hash.slice(1);
  if (pages.has(name)) showPage(name, fromUser);
  else if (!currentPage) showPage("home", false);
}

window.addEventListener("hashchange", () => route(true));
window.addEventListener("resize", moveIndicator);
sidebar.addEventListener("transitionend", moveIndicator);

// Keyboard shortcuts 1–6 jump between pages
const pageOrder = [...navItems.keys()];
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest("input, textarea, select, .game")) return;
  const index = Number(e.key) - 1;
  if (index >= 0 && index < pageOrder.length) location.hash = pageOrder[index];
});

/* ---------------------------------------------------------
   Clock + time-based greeting
   --------------------------------------------------------- */
const clock = document.getElementById("clock");

function updateClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  clock.dateTime = now.toISOString();
}
updateClock();
setInterval(updateClock, 15000);

const hour = new Date().getHours();
const partOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
document.getElementById("greeting").textContent = `// Good ${partOfDay}, visitor`;

/* ---------------------------------------------------------
   Typewriter (home)
   --------------------------------------------------------- */
// The intro already says "IT Staff" and "BSIT graduate", so the typewriter adds new info
const roles = ["System Developer", "Web Developer", "Graphic Designer", "Problem Solver"];
const typeTarget = document.querySelector(".typewriter-text");

if (!prefersReducedMotion) {
  let roleIndex = 0;
  let charIndex = roles[0].length;
  let deleting = true;

  (function tick() {
    const word = roles[roleIndex];
    charIndex += deleting ? -1 : 1;
    typeTarget.textContent = word.slice(0, charIndex);

    let delay = deleting ? 45 : 95;
    if (!deleting && charIndex === word.length) {
      deleting = true;
      delay = 1600;
    } else if (deleting && charIndex === 0) {
      deleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      delay = 400;
    }
    setTimeout(tick, delay);
  })();
}

/* ---------------------------------------------------------
   Home visitor console — personal info about *this* visitor
   (time, visit count, arcade record), so it never repeats
   what the rest of the page already says.
   --------------------------------------------------------- */
const terminal = document.getElementById("terminal");
const visits = (Number(load("visits")) || 0) + 1;
store("visits", visits);
let terminalTyped = false;

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function consoleLines() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  let stats = {};
  try { stats = JSON.parse(load("arcade")) || {}; } catch (e) { stats = {}; }
  const arcadeLine = stats.score
    ? `${stats.score} pts · best streak ${stats.bestStreak || 0}`
    : "no games played yet";

  return [
    ["prompt", "$ visitor --status"],
    ["", [["key", "time    "], ["", `${time} · ${date}`]]],
    ["", [["key", "visit   "], ["", visits === 1 ? "1st visit · welcome!" : `${ordinal(visits)} visit · welcome back`]]],
    ["", [["key", "arcade  "], ["", arcadeLine]]],
    ["ok", "● connection secure · all systems online"],
  ];
}

function lineElement([cls, content]) {
  const line = document.createElement("span");
  if (cls) line.className = cls;
  if (Array.isArray(content)) {
    content.forEach(([partCls, text]) => {
      const part = document.createElement("span");
      if (partCls) part.className = partCls;
      part.textContent = text;
      line.appendChild(part);
    });
  } else {
    line.textContent = content;
  }
  line.appendChild(document.createTextNode("\n"));
  return line;
}

let consoleRun = 0;

function renderConsole() {
  const run = ++consoleRun; // pending typing from an older render stops when this changes
  const lines = consoleLines().map(lineElement);
  terminal.replaceChildren();

  // Type it out the first time; afterwards just refresh the values
  if (terminalTyped || prefersReducedMotion) {
    lines.forEach((line) => terminal.appendChild(line));
    return;
  }
  terminalTyped = true;

  const [prompt, ...rest] = lines;
  const promptText = prompt.textContent;
  const typing = document.createElement("span");
  typing.className = "prompt";
  terminal.appendChild(typing);

  let char = 0;
  (function type() {
    if (run !== consoleRun) return;
    char += 1;
    typing.textContent = promptText.slice(0, char);
    if (char < promptText.length) {
      setTimeout(type, 55);
      return;
    }
    rest.forEach((line, i) => setTimeout(() => {
      if (run === consoleRun) terminal.appendChild(line);
    }, 250 + i * 220));
  })();
}

pageEnterHooks.push((name) => { if (name === "home") renderConsole(); });

/* ---------------------------------------------------------
   Project filter
   --------------------------------------------------------- */
const filterButtons = document.querySelectorAll("[data-filter]");
const projectCards = document.querySelectorAll("#project-grid .card");

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const filter = btn.dataset.filter;
    filterButtons.forEach((b) => {
      b.classList.toggle("is-active", b === btn);
      b.setAttribute("aria-pressed", String(b === btn));
    });
    projectCards.forEach((card) => {
      card.hidden = filter !== "all" && card.dataset.category !== filter;
    });
  });
});

/* ---------------------------------------------------------
   Footer year
   --------------------------------------------------------- */
document.getElementById("year").textContent = new Date().getFullYear();

/* ---------------------------------------------------------
   Toast notification
   --------------------------------------------------------- */
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toast-message");
let toastTimer;

function showToast(message) {
  toastMessage.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 4000);
}

document.getElementById("toast-close").addEventListener("click", () => toast.classList.remove("show"));

/* ---------------------------------------------------------
   Contact form (EmailJS)
   --------------------------------------------------------- */
const EMAILJS = {
  publicKey: "IhfDl2mm_1IZ9xEQm",
  serviceId: "service_7xi796q",
  templateId: "template_dkcfpy3",
};

if (window.emailjs) emailjs.init({ publicKey: EMAILJS.publicKey });

const form = document.getElementById("contact-form");
const submitBtn = form.querySelector('button[type="submit"]');
const submitLabel = submitBtn.innerHTML;

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fields = form.elements;
  const params = {
    name: fields.namedItem("name").value.trim(),
    email: fields.namedItem("email").value.trim(),
    message: fields.namedItem("message").value.trim(),
  };

  if (!params.name || !params.email || !params.message) {
    showToast("All fields are required.");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.email)) {
    showToast("Please enter a valid email address.");
    return;
  }
  if (!window.emailjs) {
    showToast("Message service is unavailable. Please email me directly.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";
  try {
    await emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, params);
    showToast("Message sent successfully! I'll get back to you soon.");
    form.reset();
  } catch (error) {
    console.error("EmailJS error:", error);
    showToast("Failed to send message. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = submitLabel;
  }
});

/* =========================================================
   IT Arcade
   ========================================================= */
const arcade = (function () {
  /* ---------- Shared state: difficulty + score ---------- */
  let saved = {};
  try { saved = JSON.parse(load("arcade")) || {}; } catch (e) { saved = {}; }

  const state = {
    level: saved.level === "hard" ? "hard" : "easy",
    score: Number(saved.score) || 0,
    bestStreak: Number(saved.bestStreak) || 0,
    blitzBest: { easy: 0, hard: 0, ...(saved.blitzBest || {}) },
    streak: 0,
  };

  const scoreEl = document.getElementById("score");
  const streakEl = document.getElementById("streak");
  const bestStreakEl = document.getElementById("best-streak");

  function save() {
    store("arcade", JSON.stringify({
      level: state.level,
      score: state.score,
      bestStreak: state.bestStreak,
      blitzBest: state.blitzBest,
    }));
  }

  function bump(el) {
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }

  function renderScore() {
    scoreEl.textContent = state.score;
    streakEl.textContent = state.streak;
    bestStreakEl.textContent = state.bestStreak;
  }

  function win(points) {
    state.score += points;
    state.streak += 1;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    renderScore();
    bump(scoreEl);
    bump(streakEl);
    save();
  }

  function lose() {
    state.streak = 0;
    renderScore();
  }

  function addPoints(points) {
    state.score += points;
    renderScore();
    bump(scoreEl);
    save();
  }

  const points = () => (state.level === "hard" ? 25 : 10);

  function setFeedback(el, text, kind) {
    el.textContent = text;
    el.className = "feedback" + (kind ? " " + kind : "");
  }

  /* ---------- Boolean expressions ---------- */
  const GATES = {
    AND: (a, b) => a & b,
    OR: (a, b) => a | b,
    XOR: (a, b) => a ^ b,
    NAND: (a, b) => 1 - (a & b),
    NOR: (a, b) => 1 - (a | b),
    XNOR: (a, b) => 1 - (a ^ b),
  };

  const LEVELS = {
    easy: { vars: ["A", "B"], ops: ["AND", "OR"], depth: 1, notChance: 0.35 },
    hard: { vars: ["A", "B", "C"], ops: ["AND", "OR", "XOR", "NAND", "NOR"], depth: 2, notChance: 0.3 },
  };

  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function generate(cfg, depth) {
    if (depth === 0 || (depth < cfg.depth && Math.random() < 0.35)) {
      const leaf = { type: "var", name: pick(cfg.vars) };
      return Math.random() < cfg.notChance ? { type: "not", a: leaf } : leaf;
    }
    const node = { type: "bin", op: pick(cfg.ops), a: generate(cfg, depth - 1), b: generate(cfg, depth - 1) };
    return depth === cfg.depth && Math.random() < cfg.notChance / 2 ? { type: "not", a: node } : node;
  }

  function evaluate(node, env) {
    if (node.type === "var") return env[node.name];
    if (node.type === "not") return 1 - evaluate(node.a, env);
    return GATES[node.op](evaluate(node.a, env), evaluate(node.b, env));
  }

  function usedVars(node, set = new Set()) {
    if (node.type === "var") set.add(node.name);
    else {
      usedVars(node.a, set);
      if (node.b) usedVars(node.b, set);
    }
    return set;
  }

  function rows(vars) {
    const n = vars.length;
    return Array.from({ length: 2 ** n }, (_, i) =>
      Object.fromEntries(vars.map((v, k) => [v, (i >> (n - 1 - k)) & 1]))
    );
  }

  const signature = (node, vars) => rows(vars).map((env) => evaluate(node, env)).join("");

  // Random expression that uses every variable and is not always 0 / always 1
  function puzzle(level) {
    const cfg = LEVELS[level];
    for (let tries = 0; tries < 300; tries++) {
      const expr = generate(cfg, cfg.depth);
      const sig = signature(expr, cfg.vars);
      if (usedVars(expr).size === cfg.vars.length && /0/.test(sig) && /1/.test(sig)) return expr;
    }
    return { type: "bin", op: "AND", a: { type: "var", name: "A" }, b: { type: "var", name: "B" } };
  }

  function toHTML(node, nested) {
    if (node.type === "var") return `<span class="var">${node.name}</span>`;
    if (node.type === "not") return `<span class="op">NOT</span> ${toHTML(node.a, true)}`;
    const inner = `${toHTML(node.a, true)} <span class="op">${node.op}</span> ${toHTML(node.b, true)}`;
    return nested ? `(${inner})` : inner;
  }

  function tableHead(vars, outLabel) {
    return `<thead><tr>${vars.map((v) => `<th scope="col">${v}</th>`).join("")}<th scope="col" class="out">${outLabel}</th></tr></thead>`;
  }

  /* ---------- Game 1: Truth Table ---------- */
  const tt = {
    expr: document.getElementById("tt-expr"),
    table: document.getElementById("tt-table"),
    check: document.getElementById("tt-check"),
    feedback: document.getElementById("tt-feedback"),
    answer: [],
    solved: false,
    timer: null,
  };

  function newTruthTable() {
    clearTimeout(tt.timer);
    const vars = LEVELS[state.level].vars;
    const expr = puzzle(state.level);
    const envs = rows(vars);
    tt.answer = envs.map((env) => evaluate(expr, env));
    tt.solved = false;
    tt.check.disabled = false;

    tt.expr.innerHTML = `Out = ${toHTML(expr, false)}`;
    tt.table.innerHTML =
      tableHead(vars, "Out") +
      "<tbody>" +
      envs.map((env, i) =>
        `<tr>${vars.map((v) => `<td>${env[v]}</td>`).join("")}<td class="out"><button type="button" class="cell-btn" data-row="${i}" data-value="" aria-label="Output for row ${i + 1}">?</button></td></tr>`
      ).join("") +
      "</tbody>";
    setFeedback(tt.feedback, "");
  }

  function setCell(btn, value) {
    btn.dataset.value = value;
    btn.textContent = value;
    btn.classList.remove("is-right", "is-wrong");
  }

  tt.table.addEventListener("click", (e) => {
    const btn = e.target.closest(".cell-btn");
    if (!btn || tt.solved) return;
    setCell(btn, btn.dataset.value === "0" ? "1" : "0");
  });

  tt.table.addEventListener("keydown", (e) => {
    const btn = e.target.closest(".cell-btn");
    if (!btn || tt.solved || (e.key !== "0" && e.key !== "1")) return;
    setCell(btn, e.key);
    const next = tt.table.querySelector(`.cell-btn[data-row="${Number(btn.dataset.row) + 1}"]`);
    if (next) next.focus();
  });

  tt.check.addEventListener("click", () => {
    if (tt.solved) return;
    const cells = [...tt.table.querySelectorAll(".cell-btn")];
    if (cells.some((c) => c.dataset.value === "")) {
      setFeedback(tt.feedback, "Fill in every output cell first.", "bad");
      return;
    }

    let wrong = 0;
    cells.forEach((cell, i) => {
      const ok = Number(cell.dataset.value) === tt.answer[i];
      cell.classList.toggle("is-right", ok);
      cell.classList.toggle("is-wrong", !ok);
      if (!ok) wrong += 1;
    });

    if (wrong === 0) {
      tt.solved = true;
      tt.check.disabled = true;
      win(points());
      setFeedback(tt.feedback, `Correct! +${points()} points. Loading the next one…`, "good");
      tt.timer = setTimeout(newTruthTable, 1800);
    } else {
      lose();
      setFeedback(tt.feedback, `${wrong} of ${cells.length} rows are wrong. Fix the red cells and check again.`, "bad");
    }
  });

  document.getElementById("tt-new").addEventListener("click", newTruthTable);

  /* ---------- Game 2: Mystery Gate ---------- */
  const mg = {
    help: document.getElementById("mg-help"),
    table: document.getElementById("mg-table"),
    options: document.getElementById("mg-options"),
    feedback: document.getElementById("mg-feedback"),
    timer: null,
  };

  function newMysteryGate() {
    clearTimeout(mg.timer);
    setFeedback(mg.feedback, "");
    let vars;
    let outputs;
    let choices; // [{ html, correct }]

    if (state.level === "easy") {
      vars = ["A", "B"];
      const gate = pick(Object.keys(GATES));
      outputs = rows(vars).map((env) => GATES[gate](env.A, env.B));
      choices = Object.keys(GATES).map((g) => ({ html: g, correct: g === gate }));
      mg.help.textContent = "This hidden gate produced the output below. Which gate is it?";
      mg.options.classList.remove("wide");
    } else {
      vars = LEVELS.hard.vars;
      const answer = puzzle("hard");
      const seen = new Set([signature(answer, vars)]);
      choices = [{ html: toHTML(answer, false), correct: true }];
      while (choices.length < 4) {
        const decoy = puzzle("hard");
        const sig = signature(decoy, vars);
        if (seen.has(sig)) continue;
        seen.add(sig);
        choices.push({ html: toHTML(decoy, false), correct: false });
      }
      choices.sort(() => Math.random() - 0.5);
      outputs = rows(vars).map((env) => evaluate(answer, env));
      mg.help.textContent = "This hidden circuit produced the output below. Which expression is it?";
      mg.options.classList.add("wide");
    }

    mg.table.innerHTML =
      tableHead(vars, "Out") +
      "<tbody>" +
      rows(vars).map((env, i) => `<tr>${vars.map((v) => `<td>${env[v]}</td>`).join("")}<td class="out">${outputs[i]}</td></tr>`).join("") +
      "</tbody>";

    mg.options.innerHTML = "";
    choices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn expression-option";
      btn.innerHTML = choice.html;
      btn.dataset.correct = choice.correct ? "1" : "0";
      mg.options.appendChild(btn);
    });
  }

  mg.options.addEventListener("click", (e) => {
    const btn = e.target.closest(".option-btn");
    if (!btn || btn.disabled) return;
    const buttons = [...mg.options.querySelectorAll(".option-btn")];
    buttons.forEach((b) => {
      b.disabled = true;
      if (b.dataset.correct === "1") b.classList.add("is-right");
    });

    if (btn.dataset.correct === "1") {
      win(points());
      setFeedback(mg.feedback, `Correct! +${points()} points. Next circuit incoming…`, "good");
      mg.timer = setTimeout(newMysteryGate, 1800);
    } else {
      btn.classList.add("is-wrong");
      lose();
      setFeedback(mg.feedback, "Not quite. The green one is the answer. Compare the rows, then try the next circuit.", "bad");
    }
  });

  document.getElementById("mg-new").addEventListener("click", newMysteryGate);

  /* ---------- Game 3: Binary Blitz ---------- */
  const bb = {
    target: document.getElementById("bb-target"),
    time: document.getElementById("bb-time"),
    timeWrap: document.getElementById("bb-time").parentElement,
    solved: document.getElementById("bb-solved"),
    best: document.getElementById("bb-best"),
    bits: document.getElementById("bb-bits"),
    value: document.getElementById("bb-value"),
    start: document.getElementById("bb-start"),
    feedback: document.getElementById("bb-feedback"),
    goal: 0,
    count: 0,
    left: 0,
    interval: null,
    running: false,
  };

  const BLITZ = {
    easy: { bits: 4, seconds: 60, points: 5 },
    hard: { bits: 8, seconds: 45, points: 10 },
  };

  function bitButtons() {
    return [...bb.bits.querySelectorAll("button")];
  }

  function currentValue() {
    return bitButtons().reduce((sum, b) => sum * 2 + (b.getAttribute("aria-pressed") === "true" ? 1 : 0), 0);
  }

  function renderBits() {
    const n = BLITZ[state.level].bits;
    bb.bits.innerHTML = Array.from({ length: n }, (_, i) => {
      const weight = 2 ** (n - 1 - i);
      return `<div class="bit"><button type="button" aria-pressed="false" aria-label="Bit worth ${weight}" disabled>0</button><small>${weight}</small></div>`;
    }).join("");
    bb.value.textContent = "0";
  }

  function nextTarget() {
    const cfg = BLITZ[state.level];
    const max = 2 ** cfg.bits - 1;
    const now = currentValue();
    let goal;
    do { goal = 1 + Math.floor(Math.random() * max); } while (goal === now);
    bb.goal = goal;
    // Hard mode sometimes shows the target in hexadecimal
    bb.target.textContent = state.level === "hard" && Math.random() < 0.5
      ? "0x" + goal.toString(16).toUpperCase()
      : String(goal);
  }

  function resetBlitz() {
    stopBlitz(false);
    const cfg = BLITZ[state.level];
    renderBits();
    bb.target.textContent = "—";
    bb.time.textContent = cfg.seconds;
    bb.count = 0;
    bb.solved.textContent = "0";
    bb.best.textContent = state.blitzBest[state.level];
    setFeedback(bb.feedback, "");
  }

  function startBlitz() {
    resetBlitz();
    const cfg = BLITZ[state.level];
    bb.running = true;
    bb.left = cfg.seconds;
    bitButtons().forEach((b) => { b.disabled = false; });
    bb.start.disabled = true;
    nextTarget();
    bitButtons()[0].focus();

    bb.interval = setInterval(() => {
      bb.left -= 1;
      bb.time.textContent = bb.left;
      bb.timeWrap.classList.toggle("low", bb.left <= 10);
      if (bb.left <= 0) stopBlitz(true);
    }, 1000);
  }

  function stopBlitz(finished) {
    if (!bb.running) return;
    bb.running = false;
    clearInterval(bb.interval);
    bb.timeWrap.classList.remove("low");
    bitButtons().forEach((b) => { b.disabled = true; });
    bb.start.disabled = false;
    bb.start.innerHTML = '<i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Play again';

    if (!finished) return;
    let message = `Time's up! You solved ${bb.count}.`;
    if (bb.count > state.blitzBest[state.level]) {
      state.blitzBest[state.level] = bb.count;
      bb.best.textContent = bb.count;
      save();
      message += " New personal best!";
    }
    setFeedback(bb.feedback, message, bb.count > 0 ? "good" : "");
  }

  bb.bits.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn || !bb.running) return;
    const on = btn.getAttribute("aria-pressed") !== "true";
    btn.setAttribute("aria-pressed", String(on));
    btn.textContent = on ? "1" : "0";

    const value = currentValue();
    bb.value.textContent = value;
    if (value === bb.goal) {
      bb.count += 1;
      bb.solved.textContent = bb.count;
      addPoints(BLITZ[state.level].points);
      setFeedback(bb.feedback, `Nice! ${bb.target.textContent} = ${value.toString(2).padStart(BLITZ[state.level].bits, "0")}`, "good");
      nextTarget();
    }
  });

  bb.start.addEventListener("click", startBlitz);

  /* ---------- Extra games (games.js) plug in here ---------- */
  // Each game: { tab: "tab-id", reset(level), stop(), enter() }
  const games = [];

  function stopAll(exceptTab) {
    if (exceptTab !== "tab-binary") stopBlitz(false);
    games.forEach((g) => { if (g.tab !== exceptTab && g.stop) g.stop(); });
  }

  /* ---------- Tabs ---------- */
  const tabs = [...document.querySelectorAll('.game-tabs [role="tab"]')];

  function selectTab(tab) {
    tabs.forEach((t) => {
      const selected = t === tab;
      t.setAttribute("aria-selected", String(selected));
      t.tabIndex = selected ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !selected;
    });
    stopAll(tab.id);
    const game = games.find((g) => g.tab === tab.id);
    if (game && game.enter) game.enter();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (e) => {
      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      const next = tabs[(i + step + tabs.length) % tabs.length];
      next.focus();
      selectTab(next);
    });
  });

  /* ---------- Difficulty ---------- */
  const levelButtons = document.querySelectorAll("[data-level]");

  function setLevel(level) {
    state.level = level;
    levelButtons.forEach((b) => {
      const active = b.dataset.level === level;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    save();
    newTruthTable();
    newMysteryGate();
    resetBlitz();
    bb.start.innerHTML = '<i class="fa-solid fa-play" aria-hidden="true"></i> Start round';
    games.forEach((g) => g.reset(level));
  }

  levelButtons.forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.level !== state.level) setLevel(b.dataset.level);
  }));

  renderScore();
  setLevel(state.level);

  return {
    stop: () => stopAll(null),
    level: () => state.level,
    points,
    win,
    lose,
    addPoints,
    setFeedback,
    register(game) {
      games.push(game);
      game.reset(state.level);
    },
  };
})();

// Shared with games.js
window.Arcade = arcade;

// Leaving the arcade pauses any running timed game
pageLeaveHooks.push((from) => { if (from === "arcade") arcade.stop(); });

route(false);

/* ---------------------------------------------------------
   Holographic 3D background (Three.js)
   --------------------------------------------------------- */
(function initBackground() {
  const container = document.getElementById("holographic-bg");
  if (!window.THREE || !container) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch (e) {
    return; // WebGL not supported — page works fine without it
  }

  const isSmallScreen = window.innerWidth < 768;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 20;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Wireframe shapes — kept in the corners so they never sit behind text
  const shapeMaterial = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.2 });
  const shapes = [
    { geo: new THREE.IcosahedronGeometry(5, 1), pos: [30, 0, -14], spin: [0.002, 0.003], bob: [0.6, 0.8, 16] },
    { geo: new THREE.OctahedronGeometry(4, 0), pos: [32, 0, -12], spin: [0.004, 0.005], bob: [0.8, 0.6, -18] },
    { geo: new THREE.BoxGeometry(4, 4, 4), pos: [-30, 0, -12], spin: [0.004, 0.003], bob: [0.7, 0.6, -18] },
  ].map((cfg) => {
    const mesh = new THREE.Mesh(cfg.geo, shapeMaterial);
    mesh.position.set(...cfg.pos);
    scene.add(mesh);
    return { mesh, ...cfg };
  });

  // Particles (fewer on phones to save battery)
  const particleCount = isSmallScreen ? 600 : 1500;
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    velocities[i] = (Math.random() - 0.5) * 0.01;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  // Round dot texture with a fixed on-screen size, so particles never turn into big squares
  const dot = document.createElement("canvas");
  dot.width = dot.height = 32;
  const ctx = dot.getContext("2d");
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.8)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);

  const particleMaterial = new THREE.PointsMaterial({
    size: 3,
    sizeAttenuation: false,
    map: new THREE.CanvasTexture(dot),
    transparent: true,
    depthWrite: false,
    opacity: 0.8,
  });
  scene.add(new THREE.Points(particleGeometry, particleMaterial));

  // Gold shapes + cyan particles; glowing on dark, solid on light
  function setBackgroundTheme(theme) {
    const dark = theme === "dark";
    shapeMaterial.color.setHex(dark ? 0xd9b46a : 0xb8892f);
    particleMaterial.color.setHex(dark ? 0x3ee6ff : 0x0089b8);
    particleMaterial.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    particleMaterial.size = dark ? 3 : 3.5;
    shapeMaterial.opacity = dark ? 0.2 : 0.28;
    particleMaterial.needsUpdate = true;
    renderer.render(scene, camera);
  }
  themeListeners.push(setBackgroundTheme);
  setBackgroundTheme(root.getAttribute("data-theme"));

  // Subtle parallax that follows the pointer
  const pointer = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  let running = !prefersReducedMotion;

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);

    const time = performance.now() * 0.001;
    shapes.forEach(({ mesh, spin, bob }) => {
      mesh.rotation.x += spin[0];
      mesh.rotation.y += spin[1];
      mesh.position.y = Math.sin(time * bob[0]) * bob[1] + bob[2];
    });

    camera.position.x += (pointer.x * 2 - camera.position.x) * 0.03;
    camera.position.y += (-pointer.y * 2 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, -10);

    for (let i = 0; i < particleCount; i++) {
      const y = i * 3 + 1;
      positions[y] += velocities[i];
      if (positions[y] > 30 || positions[y] < -30) positions[y] = (Math.random() - 0.5) * 60;
    }
    particleGeometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  // Pause when the tab is hidden
  document.addEventListener("visibilitychange", () => {
    if (prefersReducedMotion) return;
    running = !document.hidden;
    if (running) animate();
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (!running) renderer.render(scene, camera);
  });

  if (running) animate();
})();
