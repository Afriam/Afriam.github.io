"use strict";

/* =========================================================
   Extra IT Arcade games: Type Master, Bug Hunt, Hex Hue,
   Signal Memory. They plug into the shared score, difficulty
   and tabs from script.js through window.Arcade.
   ========================================================= */
(function () {
  const Arcade = window.Arcade;
  if (!Arcade) return;

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

  /* ---------- Saved records (best WPM, best memory round) ---------- */
  let records = {};
  try { records = JSON.parse(load("arcade-records")) || {}; } catch (e) { records = {}; }
  records.type = { easy: 0, hard: 0, ...(records.type || {}) };
  records.memory = { easy: 0, hard: 0, ...(records.memory || {}) };
  const saveRecords = () => store("arcade-records", JSON.stringify(records));

  /* ---------------------------------------------------------
     Sound engine (Web Audio): nothing plays until a game asks
     --------------------------------------------------------- */
  const Sound = (function () {
    let ctx = null;
    let out = null;
    let enabled = load("sound") !== "off";
    const toggle = document.getElementById("sound-toggle");

    function context() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        // Soft low-pass so brighter waveforms never sound harsh
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 3200;
        out = ctx.createGain();
        out.gain.value = 0.8;
        out.connect(filter).connect(ctx.destination);
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }

    const midi = (note) => 440 * Math.pow(2, (note - 69) / 12);

    function tone(note, opts = {}) {
      if (!enabled) return;
      const ac = context();
      if (!ac) return;
      const { dur = 0.3, type = "sine", vol = 0.15, delay = 0 } = opts;
      const t = ac.currentTime + delay;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(midi(note), t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }

    function render() {
      toggle.setAttribute("aria-pressed", String(enabled));
      toggle.setAttribute("aria-label", enabled ? "Sound on" : "Sound off");
      toggle.innerHTML = `<i class="fa-solid fa-volume-${enabled ? "high" : "xmark"}" aria-hidden="true"></i>`;
    }

    toggle.addEventListener("click", () => {
      enabled = !enabled;
      store("sound", enabled ? "on" : "off");
      render();
    });
    render();

    return { tone };
  })();

  /* =========================================================
     Type Master — 3D word tunnel + melody that follows your speed
     ========================================================= */
  (function typeMaster() {
    const WORDS = {
      easy: [
        "server", "router", "binary", "cache", "kernel", "pixel", "cloud", "debug", "array", "laptop",
        "python", "script", "syntax", "cursor", "domain", "backup", "upload", "driver", "folder", "switch",
        "packet", "update", "online", "system", "widget", "coding", "github", "module", "object", "string",
        "boolean", "network", "monitor", "compile", "storage", "browser", "firewall", "database", "keyboard", "function",
      ],
      hard: [
        "const x = [];", "git commit -m \"fix\"", "SELECT * FROM users;", "<div class=\"card\">",
        "npm install three", "if (a && !b) {", "for (i = 0; i < n; i++)", "echo $_POST['id'];",
        "print(len(data))", "ping 192.168.1.1", "ssh admin@server", "return a ?? b;",
        "border-radius: 8px;", "git push origin main", "console.log(\"ok\");", "def main():",
        "x => x * 2", "sudo apt update", "UPDATE logs SET seen = 1;", "#include <stdio.h>",
      ],
    };
    const CONFIG = {
      easy: { seconds: 30, points: 2 },
      hard: { seconds: 45, points: 5 },
    };
    // An original looping phrase (MIDI notes); each correct key plays the next one
    const MELODY = [60, 64, 67, 69, 72, 69, 67, 64, 65, 69, 72, 74, 72, 69, 67, 65,
                    64, 67, 71, 72, 76, 74, 72, 67, 69, 72, 76, 79, 76, 72, 69, 67];
    const TEMPO = [
      { name: "calm", type: "sine", shift: 0, dur: 0.38, vol: 0.16 },
      { name: "groove", type: "triangle", shift: 12, dur: 0.24, vol: 0.15 },
      { name: "hyper", type: "sawtooth", shift: 12, dur: 0.16, vol: 0.07 },
    ];
    const QUEUE = 5;

    const el = {
      stage: document.getElementById("tm-stage"),
      words: document.getElementById("tm-words"),
      overlay: document.getElementById("tm-overlay"),
      input: document.getElementById("tm-input"),
      time: document.getElementById("tm-time"),
      wpm: document.getElementById("tm-wpm"),
      acc: document.getElementById("tm-acc"),
      combo: document.getElementById("tm-combo"),
      tempo: document.getElementById("tm-tempo"),
      best: document.getElementById("tm-best"),
      restart: document.getElementById("tm-restart"),
      feedback: document.getElementById("tm-feedback"),
    };

    let s = {};

    function newWord(level, avoid) {
      let word;
      do { word = pick(WORDS[level]); } while (word === avoid);
      return word;
    }

    function wordElement(text, depth) {
      const node = document.createElement("div");
      node.className = "tm-word";
      node.style.setProperty("--d", depth);
      node.textContent = text;
      return node;
    }

    function renderCurrent() {
      const target = s.queue[0];
      const typed = el.input.value;
      const node = s.nodes[0];
      s.nodes.forEach((n, i) => n.classList.toggle("is-current", i === 0));
      node.replaceChildren();
      [...target].forEach((ch, i) => {
        const span = document.createElement("span");
        span.className = "tm-ch";
        if (ch === " ") span.classList.add("sp");
        if (i < typed.length) span.classList.add(typed[i] === ch ? "ok" : "bad");
        else if (i === typed.length) span.classList.add("cursor");
        span.textContent = ch === " " ? " " : ch;
        node.appendChild(span);
      });
    }

    function setHeat(level) {
      if (level === s.heat) return;
      s.heat = level;
      el.stage.classList.remove("heat-0", "heat-1", "heat-2");
      el.stage.classList.add(`heat-${level}`);
      el.tempo.textContent = TEMPO[level].name;
    }

    function playKey() {
      // Speed = smoothed time between correct keys
      const now = performance.now();
      const gap = s.lastKey ? Math.min(now - s.lastKey, 1200) : 600;
      s.lastKey = now;
      s.gap = s.gap * 0.65 + gap * 0.35;
      const perSecond = 1000 / s.gap;
      setHeat(perSecond < 3 ? 0 : perSecond < 5.5 ? 1 : 2);

      const t = TEMPO[s.heat];
      const note = MELODY[s.note % MELODY.length] + t.shift;
      s.note += 1;
      Sound.tone(note, { type: t.type, dur: t.dur, vol: t.vol });
      if (s.heat >= 1) Sound.tone(note + 7, { type: "sine", dur: t.dur, vol: 0.05 }); // fifth harmony
      if (s.heat === 2) Sound.tone(note + 24, { type: "sine", dur: 0.08, vol: 0.04, delay: 0.04 }); // sparkle
    }

    function playMiss() {
      Sound.tone(45, { type: "triangle", dur: 0.12, vol: 0.12 });
    }

    function updateStats() {
      const elapsed = s.running ? (performance.now() - s.start) / 1000 : s.elapsed;
      const minutes = Math.max(elapsed, 1) / 60;
      const wpm = Math.round(s.correct / 5 / minutes);
      el.wpm.textContent = s.correct ? wpm : 0;
      el.acc.textContent = s.total ? `${Math.round((s.correct / s.total) * 100)}%` : "100%";
      el.combo.textContent = s.combo;
      return wpm;
    }

    function advance() {
      const done = s.nodes.shift();
      done.classList.add("tm-out");
      setTimeout(() => done.remove(), 450);

      s.queue.shift();
      s.queue.push(newWord(s.level, s.queue[s.queue.length - 1]));
      s.nodes.forEach((node, i) => node.style.setProperty("--d", i));

      const fresh = wordElement(s.queue[QUEUE - 1], QUEUE);
      fresh.classList.add("tm-in");
      el.words.appendChild(fresh);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fresh.classList.remove("tm-in");
        fresh.style.setProperty("--d", QUEUE - 1);
      }));
      s.nodes.push(fresh);

      el.input.value = "";
      s.prevLen = 0;
      s.done += 1;
      Arcade.addPoints(CONFIG[s.level].points);
      el.stage.classList.remove("pulse-hit");
      void el.stage.offsetWidth;
      el.stage.classList.add("pulse-hit");
      renderCurrent();
    }

    function startRound() {
      s.running = true;
      s.start = performance.now();
      s.timer = setInterval(() => {
        const left = Math.max(0, CONFIG[s.level].seconds - (performance.now() - s.start) / 1000);
        el.time.textContent = Math.ceil(left);
        el.time.parentElement.classList.toggle("low", left <= 5);
        updateStats();
        if (left <= 0) finish();
      }, 100);
    }

    function finish() {
      clearInterval(s.timer);
      s.elapsed = CONFIG[s.level].seconds;
      s.running = false;
      s.ended = true;
      el.time.parentElement.classList.remove("low");
      const wpm = updateStats();
      const accuracy = s.total ? Math.round((s.correct / s.total) * 100) : 0;

      let message = `${wpm} WPM · ${accuracy}% accuracy · ${s.done} words`;
      if (wpm > records.type[s.level]) {
        records.type[s.level] = wpm;
        saveRecords();
        el.best.textContent = wpm;
        message += " · New record!";
      }
      Arcade.setFeedback(el.feedback, message, "good");
      el.overlay.innerHTML = `<strong>${wpm} WPM</strong><span>Press Restart to go again</span>`;
      el.stage.classList.add("ended");
      setHeat(0);
    }

    el.input.addEventListener("input", () => {
      if (s.ended) {
        el.input.value = "";
        return;
      }
      const target = s.queue[0];
      let value = el.input.value;

      // A space typed between words is just habit, so ignore it quietly
      if (s.prevLen === 0 && value === " ") {
        el.input.value = "";
        return;
      }
      if (value.length > target.length) {
        value = value.slice(0, target.length);
        el.input.value = value;
      }

      if (value.length > s.prevLen) {
        if (!s.running) startRound();
        for (let i = s.prevLen; i < value.length; i++) {
          s.total += 1;
          if (value[i] === target[i]) {
            s.correct += 1;
            s.combo += 1;
            playKey();
          } else {
            s.combo = 0;
            playMiss();
            el.stage.classList.remove("shake");
            void el.stage.offsetWidth;
            el.stage.classList.add("shake");
          }
        }
      }
      s.prevLen = value.length;
      updateStats();

      if (value === target) advance();
      else renderCurrent();
    });

    el.input.addEventListener("paste", (e) => e.preventDefault());
    el.input.addEventListener("focus", () => el.stage.classList.add("focused"));
    el.input.addEventListener("blur", () => el.stage.classList.remove("focused"));
    el.restart.addEventListener("click", () => {
      reset(Arcade.level());
      el.input.focus();
    });

    function reset(level) {
      clearInterval(s.timer);
      s = {
        level, queue: [], nodes: [], running: false, ended: false, start: 0, elapsed: 0,
        correct: 0, total: 0, combo: 0, done: 0, prevLen: 0, note: 0, gap: 600, lastKey: 0, heat: -1,
      };
      for (let i = 0; i < QUEUE; i++) s.queue.push(newWord(level, s.queue[i - 1]));
      el.words.replaceChildren();
      s.nodes = s.queue.map((word, i) => {
        const node = wordElement(word, i);
        el.words.appendChild(node);
        return node;
      });
      el.input.value = "";
      el.input.maxLength = 60;
      el.time.textContent = CONFIG[level].seconds;
      el.best.textContent = records.type[level];
      el.overlay.innerHTML = '<i class="fa-solid fa-keyboard" aria-hidden="true"></i> Click here and start typing';
      el.stage.classList.remove("ended", "shake");
      Arcade.setFeedback(el.feedback, "");
      setHeat(0);
      updateStats();
      renderCurrent();
    }

    Arcade.register({
      tab: "tab-type",
      reset,
      stop: () => { if (s.running) reset(s.level); },
      enter: () => { if (window.matchMedia("(pointer: fine)").matches) el.input.focus({ preventScroll: true }); },
    });
  })();

  /* =========================================================
     Bug Hunt — click the broken line
     ========================================================= */
  (function bugHunt() {
    const SNIPPETS = {
      easy: [
        {
          lang: "JavaScript",
          code: ['function greet(name) {', '  let message = "Hello, " + name;', '  console.log(message;', '  return message;', '}'],
          bug: 3,
          why: "The closing parenthesis is missing: console.log(message);",
        },
        {
          lang: "HTML",
          code: ["<ul>", "  <li>Home</li>", "  <li>About</li>", "  <li>Contact</li>", "</lu>"],
          bug: 5,
          why: "The closing tag is misspelled. It should be </ul>.",
        },
        {
          lang: "Python",
          code: ["total = 0", "for n in [1, 2, 3]", "    total += n", "print(total)"],
          bug: 2,
          why: "A for loop needs a colon at the end: for n in [1, 2, 3]:",
        },
        {
          lang: "PHP",
          code: ["<?php", '$name = "Afriam";', 'echo "Hi, " . $name', 'echo "!";', "?>"],
          bug: 3,
          why: "The statement is missing its semicolon at the end of the line.",
        },
        {
          lang: "CSS",
          code: [".card {", "  color: #fff;", "  padding 12px;", "  border-radius: 8px;", "}"],
          bug: 3,
          why: "Every CSS property needs a colon: padding: 12px;",
        },
        {
          lang: "SQL",
          code: ["SELECT name, email", "FROM users", "WHERE age > 18", "ORDER name ASC;"],
          bug: 4,
          why: "Sorting uses ORDER BY, not just ORDER.",
        },
        {
          lang: "JavaScript",
          code: ['const items = ["a", "b", "c"];', "if (items.length = 3) {", '  console.log("three items");', "}"],
          bug: 2,
          why: "A single = assigns a value. Comparing needs === (items.length === 3).",
        },
      ],
      hard: [
        {
          lang: "JavaScript",
          code: ["const nums = [4, 8, 15];", "let sum = 0;", "for (let i = 0; i <= nums.length; i++) {", "  sum += nums[i];", "}", "console.log(sum);"],
          bug: 3,
          why: "Off-by-one: i <= nums.length reads nums[3], which is undefined, so sum becomes NaN. Use i < nums.length.",
        },
        {
          lang: "JavaScript",
          code: ["async function loadUser(id) {", "  const res = fetch(`/api/users/${id}`);", "  const user = await res.json();", "  return user;", "}"],
          bug: 2,
          why: "fetch returns a Promise. Without await, res.json is not a function.",
        },
        {
          lang: "PHP",
          code: ["<?php", "$id = $_GET['id'];", '$sql = "SELECT * FROM reports WHERE id = $id";', "$result = $db->query($sql);", "?>"],
          bug: 3,
          why: "User input goes straight into the SQL string, which allows SQL injection. Use a prepared statement.",
        },
        {
          lang: "Python",
          code: ["def add_item(item, bucket=[]):", "    bucket.append(item)", "    return bucket", "", 'print(add_item("a"))', 'print(add_item("b"))'],
          bug: 1,
          why: "The default list is created once and shared by every call, so the second call prints ['a', 'b']. Default to None instead.",
        },
        {
          lang: "JavaScript",
          code: ["function label(level) {", "  switch (level) {", "    case 1:", '      return "low";', "    case 2:", '      console.log("medium");', "    case 3:", '      return "high";', "  }", "}"],
          bug: 6,
          why: "Case 2 has no break or return, so it falls through and level 2 returns \"high\".",
        },
        {
          lang: "C#",
          code: ["int passed = 7;", "int total = 8;", "double rate = passed / total * 100;", "Console.WriteLine(rate);"],
          bug: 3,
          why: "passed / total is integer division (7 / 8 = 0), so rate is 0. Cast to double first.",
        },
        {
          lang: "JavaScript",
          code: ['const input = "5";', "const limit = 10;", "if (input + 1 > limit) {", '  console.log("over limit");', "}"],
          bug: 3,
          why: "\"5\" + 1 joins strings into \"51\", so the check is wrongly true. Convert with Number(input) first.",
        },
      ],
    };

    const el = {
      lang: document.getElementById("bh-lang"),
      code: document.getElementById("bh-code"),
      feedback: document.getElementById("bh-feedback"),
      next: document.getElementById("bh-new"),
    };
    let current = null;
    let level = "easy";

    function next() {
      let snippet;
      do { snippet = pick(SNIPPETS[level]); } while (snippet === current && SNIPPETS[level].length > 1);
      current = snippet;
      el.lang.textContent = snippet.lang;
      el.code.replaceChildren();
      snippet.code.forEach((line, i) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "code-line";
        btn.dataset.line = i + 1;
        btn.setAttribute("aria-label", `Line ${i + 1}: ${line || "empty"}`);
        const num = document.createElement("span");
        num.className = "ln";
        num.textContent = i + 1;
        const code = document.createElement("code");
        code.textContent = line || " ";
        btn.append(num, code);
        li.appendChild(btn);
        el.code.appendChild(li);
      });
      el.code.classList.remove("flip-in");
      void el.code.offsetWidth;
      el.code.classList.add("flip-in");
      Arcade.setFeedback(el.feedback, "");
    }

    el.code.addEventListener("click", (e) => {
      const btn = e.target.closest(".code-line");
      if (!btn || btn.disabled) return;
      const lines = [...el.code.querySelectorAll(".code-line")];
      lines.forEach((b) => {
        b.disabled = true;
        if (Number(b.dataset.line) === current.bug) b.classList.add("is-right");
      });
      if (Number(btn.dataset.line) === current.bug) {
        Arcade.win(Arcade.points());
        Arcade.setFeedback(el.feedback, `Bug squashed! +${Arcade.points()} points. ${current.why}`, "good");
      } else {
        btn.classList.add("is-wrong");
        Arcade.lose();
        Arcade.setFeedback(el.feedback, `Not that one. Line ${current.bug} is the bug: ${current.why}`, "bad");
      }
    });

    el.next.addEventListener("click", next);

    Arcade.register({
      tab: "tab-bug",
      reset(lvl) { level = lvl; current = null; next(); },
    });
  })();

  /* =========================================================
     Hex Hue — match hex codes and colors
     ========================================================= */
  (function hexHue() {
    const el = {
      card: document.getElementById("hx-card"),
      help: document.getElementById("hx-help"),
      options: document.getElementById("hx-options"),
      feedback: document.getElementById("hx-feedback"),
      next: document.getElementById("hx-new"),
    };
    let level = "easy";
    let timer = null;

    const toHex = (rgb) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

    function hslToRgb(h, s, l) {
      s /= 100;
      l /= 100;
      const k = (n) => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
    }

    const hueGap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

    function easyRound() {
      // Target + 3 colors with clearly different hues
      const hues = [];
      while (hues.length < 4) {
        const h = rand(0, 359);
        if (hues.every((x) => hueGap(x, h) >= 50)) hues.push(h);
      }
      const colors = hues.map((h) => toHex(hslToRgb(h, rand(65, 90), rand(45, 60))));
      return { answer: colors[0], options: colors };
    }

    function hardRound() {
      // Target + 3 near-misses that change one or two channels
      const base = hslToRgb(rand(0, 359), rand(50, 85), rand(40, 62));
      const answer = toHex(base);
      const options = [answer];
      while (options.length < 4) {
        const rgb = [...base];
        const channels = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, rand(1, 2));
        channels.forEach((c) => {
          const delta = rand(40, 90) * (Math.random() < 0.5 ? -1 : 1);
          rgb[c] = Math.max(0, Math.min(255, rgb[c] + delta));
        });
        const hex = toHex(rgb);
        if (!options.includes(hex)) options.push(hex);
      }
      return { answer, options };
    }

    function render() {
      clearTimeout(timer);
      const round = level === "easy" ? easyRound() : hardRound();
      const options = [...round.options].sort(() => Math.random() - 0.5);

      el.card.classList.remove("flip-in");
      void el.card.offsetWidth;
      el.card.classList.add("flip-in");

      if (level === "easy") {
        el.help.textContent = "Which color matches this hex code?";
        el.card.style.background = "";
        el.card.innerHTML = `<span class="hex-code mono">${round.answer}</span>`;
      } else {
        el.help.textContent = "Which hex code matches this color?";
        el.card.style.background = round.answer;
        el.card.innerHTML = "";
      }

      el.options.replaceChildren();
      options.forEach((hex, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "option-btn hex-option";
        btn.dataset.hex = hex;
        if (level === "easy") {
          btn.classList.add("swatch");
          btn.style.background = hex;
          btn.setAttribute("aria-label", `Color option ${i + 1}`);
          btn.innerHTML = `<span class="hex-reveal mono">${hex}</span>`;
        } else {
          btn.innerHTML = `<span class="mono">${hex}</span><span class="hex-dot" style="background:${hex}"></span>`;
        }
        el.options.appendChild(btn);
      });
      el.options.dataset.answer = round.answer;
      Arcade.setFeedback(el.feedback, "");
    }

    el.options.addEventListener("click", (e) => {
      const btn = e.target.closest(".hex-option");
      if (!btn || btn.disabled) return;
      const answer = el.options.dataset.answer;
      el.options.classList.add("revealed");
      [...el.options.children].forEach((b) => {
        b.disabled = true;
        if (b.dataset.hex === answer) b.classList.add("is-right");
      });
      if (btn.dataset.hex === answer) {
        Arcade.win(Arcade.points());
        Arcade.setFeedback(el.feedback, `Sharp eye! +${Arcade.points()} points.`, "good");
        timer = setTimeout(next, 1800);
      } else {
        btn.classList.add("is-wrong");
        Arcade.lose();
        Arcade.setFeedback(el.feedback, `Not quite. The answer was ${answer}.`, "bad");
      }
    });

    function next() {
      el.options.classList.remove("revealed");
      render();
    }

    el.next.addEventListener("click", next);

    Arcade.register({
      tab: "tab-hex",
      reset(lvl) { level = lvl; next(); },
      stop() { clearTimeout(timer); },
    });
  })();

  /* =========================================================
     Signal Memory — repeat the growing signal
     ========================================================= */
  (function signalMemory() {
    const CONFIG = {
      easy: { labels: ["00", "01", "10", "11"], on: 520, gap: 260, points: 5 },
      hard: { labels: ["AND", "OR", "XOR", "NAND", "NOR", "NOT"], on: 380, gap: 170, points: 10 },
    };
    const NOTES = [60, 64, 67, 72, 76, 79];

    const el = {
      grid: document.getElementById("sm-grid"),
      round: document.getElementById("sm-round"),
      best: document.getElementById("sm-best"),
      start: document.getElementById("sm-start"),
      feedback: document.getElementById("sm-feedback"),
    };
    let level = "easy";
    let seq = [];
    let step = 0;
    let phase = "idle"; // idle | watch | input
    let timers = [];

    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const tiles = () => [...el.grid.querySelectorAll(".sm-tile")];

    function flash(index, ms) {
      const tile = tiles()[index];
      tile.classList.add("lit");
      Sound.tone(NOTES[index], { type: "triangle", dur: ms / 1000 + 0.1, vol: 0.14 });
      later(() => tile.classList.remove("lit"), ms);
    }

    function setInput(enabled) {
      tiles().forEach((t) => { t.disabled = !enabled; });
    }

    function playback() {
      phase = "watch";
      setInput(false);
      Arcade.setFeedback(el.feedback, "Watch the signal…");
      const { on, gap } = CONFIG[level];
      seq.forEach((index, i) => later(() => flash(index, on), 500 + i * (on + gap)));
      later(() => {
        phase = "input";
        step = 0;
        setInput(true);
        Arcade.setFeedback(el.feedback, "Your turn!");
      }, 500 + seq.length * (on + gap));
    }

    function nextRound() {
      seq.push(rand(0, CONFIG[level].labels.length - 1));
      el.round.textContent = seq.length;
      playback();
    }

    function gameOver() {
      phase = "idle";
      setInput(false);
      Arcade.lose();
      Sound.tone(36, { type: "sine", dur: 0.35, vol: 0.15 });
      el.grid.classList.remove("shake");
      void el.grid.offsetWidth;
      el.grid.classList.add("shake");

      const reached = seq.length - 1;
      let message = `Signal lost at round ${seq.length}. You cleared ${reached}.`;
      if (reached > records.memory[level]) {
        records.memory[level] = reached;
        saveRecords();
        el.best.textContent = reached;
        message += " New record!";
      }
      Arcade.setFeedback(el.feedback, message, "bad");
      el.start.disabled = false;
      el.start.innerHTML = '<i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Play again';
    }

    el.grid.addEventListener("click", (e) => {
      const tile = e.target.closest(".sm-tile");
      if (!tile || phase !== "input") return;
      const index = Number(tile.dataset.index);
      flash(index, 220);

      if (index !== seq[step]) {
        gameOver();
        return;
      }
      step += 1;
      if (step === seq.length) {
        phase = "watch";
        setInput(false);
        Arcade.win(CONFIG[level].points);
        Arcade.setFeedback(el.feedback, `Round ${seq.length} cleared! +${CONFIG[level].points}`, "good");
        later(nextRound, 900);
      }
    });

    el.start.addEventListener("click", () => {
      stop();
      seq = [];
      el.start.disabled = true;
      nextRound();
    });

    function stop() {
      timers.forEach(clearTimeout);
      timers = [];
      phase = "idle";
      tiles().forEach((t) => t.classList.remove("lit"));
      setInput(false);
      el.start.disabled = false;
    }

    function reset(lvl) {
      stop();
      level = lvl;
      seq = [];
      const { labels } = CONFIG[level];
      el.grid.className = `sm-grid sm-${labels.length}`;
      el.grid.innerHTML = labels
        .map((label, i) => `<button type="button" class="sm-tile mono" data-index="${i}" disabled>${label}</button>`)
        .join("");
      el.round.textContent = "0";
      el.best.textContent = records.memory[level];
      el.start.innerHTML = '<i class="fa-solid fa-play" aria-hidden="true"></i> Start';
      Arcade.setFeedback(el.feedback, "");
    }

    Arcade.register({
      tab: "tab-memory",
      reset,
      stop() {
        if (phase !== "idle") {
          stop();
          el.start.innerHTML = '<i class="fa-solid fa-play" aria-hidden="true"></i> Start';
          Arcade.setFeedback(el.feedback, "");
        }
      },
    });
  })();
})();
