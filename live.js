"use strict";

/* =========================================================
   Live Duel: everyone viewing the site floats in the lobby as
   a bubble. Tap a bubble to challenge that visitor to a
   Logic Duel (same questions, first correct answer scores).

   How visitors find each other:
   1. Firebase Realtime Database, when LIVE_FIREBASE is filled in
      below (most reliable; setup steps are in README.md).
   2. Otherwise free public relays (Trystero over Nostr). No account
      needed, but those relays are run by volunteers.
   Add ?live=local to the URL to test with two tabs of one browser.
   ========================================================= */

// Firebase console → Project settings → Your apps → Web app → config
const LIVE_FIREBASE = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  appId: "",
};

(function () {
  const Arcade = window.Arcade;
  if (!Arcade) return;

  const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/13.1.0/";
  const TRYSTERO = "https://cdn.jsdelivr.net/npm/trystero@0.26.0/+esm";
  const TARGET = 5;                       // points needed to win a duel
  const INVITE_MS = 20000;
  const QUESTION_MS = { easy: 15000, hard: 12000 };
  const LEAVE_GRACE_MS = 6000;            // opponent vanished for this long = forfeit

  const tone = (note, opts) => { if (Arcade.tone) Arcade.tone(note, opts); };
  const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const $ = (id) => document.getElementById(id);

  /* ---------- Who you are: random, anonymous identity ---------- */
  const ADJECTIVES = ["Neon", "Quantum", "Cyber", "Pixel", "Binary", "Turbo", "Async", "Hyper", "Nano", "Logic", "Vector", "Cosmic"];
  const NOUNS = ["Fox", "Byte", "Owl", "Kernel", "Falcon", "Node", "Panda", "Socket", "Comet", "Tiger", "Router", "Lynx"];
  const ICONS = ["robot", "user-astronaut", "ghost", "dragon", "rocket", "cat", "frog", "kiwi-bird"];
  const COLORS = ["#3ee6ff", "#d9b46a", "#3ddc97", "#ff6b7d", "#a78bfa", "#ff9f43", "#4f8bff", "#f472b6"];
  const PAGE_NAMES = { home: "Home", about: "About", journey: "Journey", projects: "Projects", arcade: "IT Arcade", contact: "Contact" };

  const rnd = (n) => Math.floor(Math.random() * n);

  function randomIdentity() {
    return {
      name: `${ADJECTIVES[rnd(ADJECTIVES.length)]} ${NOUNS[rnd(NOUNS.length)]}`,
      icon: rnd(ICONS.length),
      color: rnd(COLORS.length),
    };
  }

  let identity = null;
  try { identity = JSON.parse(load("live-identity")); } catch (e) { identity = null; }
  if (!identity || typeof identity.name !== "string") {
    identity = randomIdentity();
    store("live-identity", JSON.stringify(identity));
  }

  const profile = () => ({
    name: identity.name,
    icon: identity.icon,
    color: identity.color,
    page: location.hash.slice(1) || "home",
    status: inDuel() ? "playing" : "idle",
  });

  // Other visitors' data is never trusted: clamp everything before it touches the page
  function clean(p) {
    p = p || {};
    const clamp = (v, max) => (Number.isInteger(v) && v >= 0 && v < max ? v : 0);
    return {
      name: String(p.name || "Guest").replace(/[^\w -]/g, "").slice(0, 20) || "Guest",
      icon: clamp(p.icon, ICONS.length),
      color: clamp(p.color, COLORS.length),
      page: PAGE_NAMES[p.page] ? p.page : "home",
      status: p.status === "playing" ? "playing" : "idle",
    };
  }

  function avatar(el, p) {
    el.style.setProperty("--c", COLORS[p.color]);
    el.innerHTML = `<i class="fa-solid fa-${ICONS[p.icon]}" aria-hidden="true"></i>`;
  }

  /* =========================================================
     Connections. Each one returns { id, mode, update(profile), send(to, msg) }
     and reports through handlers.peers(map) / handlers.message(from, msg).
     ========================================================= */
  async function connectFirebase(handlers) {
    const [{ initializeApp }, fb] = await Promise.all([
      import(FIREBASE_SDK + "firebase-app.js"),
      import(FIREBASE_SDK + "firebase-database.js"),
    ]);
    const db = fb.getDatabase(initializeApp(LIVE_FIREBASE, "live"));
    const id = newId();
    const me = fb.ref(db, `live/presence/${id}`);
    const inbox = fb.ref(db, `live/inbox/${id}`);
    let current = profile();
    let offset = 0;
    const write = () => fb.set(me, { ...current, ts: fb.serverTimestamp() }).catch(handlers.down);

    fb.onValue(fb.ref(db, ".info/serverTimeOffset"), (s) => { offset = s.val() || 0; });
    fb.onValue(fb.ref(db, ".info/connected"), (s) => {
      if (!s.val()) return;
      fb.onDisconnect(me).remove();
      fb.onDisconnect(inbox).remove();
      write();
    });
    setInterval(write, 60000); // heartbeat, so crashed tabs age out

    fb.onValue(fb.ref(db, "live/presence"), (s) => {
      const now = Date.now() + offset;
      const peers = {};
      s.forEach((child) => {
        const v = child.val();
        if (child.key !== id && v && now - (v.ts || 0) < 180000) peers[child.key] = v;
      });
      handlers.peers(peers);
    }, handlers.down);

    fb.onChildAdded(inbox, (s) => {
      const v = s.val();
      fb.remove(s.ref);
      if (v && typeof v.from === "string" && v.msg) handlers.message(v.from, v.msg);
    });

    return {
      id,
      mode: "Live server",
      update(p) { current = p; write(); },
      send(to, msg) { fb.push(fb.ref(db, `live/inbox/${to}`), { from: id, msg }); },
    };
  }

  async function connectRelay(handlers) {
    const { joinRoom, selfId } = await import(TRYSTERO);
    const room = joinRoom({ appId: "afriam-github-io-live-v1", relayConfig: { warnOnRelayFailure: false } }, "lobby");
    const hello = room.makeAction("hello");
    const msg = room.makeAction("msg");
    const peers = {};
    let current = profile();

    room.onPeerJoin = (peerId) => hello.send(current, { target: peerId });
    room.onPeerLeave = (peerId) => { delete peers[peerId]; handlers.peers({ ...peers }); };
    hello.onMessage = (data, { peerId }) => { peers[peerId] = data; handlers.peers({ ...peers }); };
    msg.onMessage = (data, { peerId }) => handlers.message(peerId, data);
    window.addEventListener("pagehide", () => room.leave());

    handlers.peers({});
    return {
      id: selfId,
      mode: "Peer-to-peer",
      update(p) { current = p; hello.send(p); },
      send(to, m) { msg.send(m, { target: to }); },
    };
  }

  // Testing only: tabs of the same browser talk through BroadcastChannel
  function connectLocal(handlers) {
    const channel = new BroadcastChannel("afriam-live");
    const id = newId();
    const peers = {};
    let current = profile();
    const post = (m) => channel.postMessage({ ...m, from: id });

    channel.onmessage = ({ data: m }) => {
      if (m.to && m.to !== id) return;
      if (m.type === "hello") {
        peers[m.from] = m.profile;
        handlers.peers({ ...peers });
        if (m.ask) post({ type: "hello", profile: current, to: m.from });
      } else if (m.type === "bye") {
        delete peers[m.from];
        handlers.peers({ ...peers });
      } else if (m.type === "msg") {
        handlers.message(m.from, m.msg);
      }
    };
    post({ type: "hello", profile: current, ask: true });
    window.addEventListener("pagehide", () => post({ type: "bye" }));

    handlers.peers({});
    return {
      id,
      mode: "Local test",
      update(p) { current = p; post({ type: "hello", profile: p }); },
      send(to, msg) { post({ type: "msg", to, msg }); },
    };
  }

  /* ---------- Elements ---------- */
  const el = {
    arena: $("lv-arena"),
    empty: $("lv-empty"),
    match: $("lv-match"),
    meAvatar: $("lv-me-avatar"),
    meName: $("lv-me-name"),
    mePips: $("lv-me-pips"),
    oppAvatar: $("lv-opp-avatar"),
    oppName: $("lv-opp-name"),
    oppPips: $("lv-opp-pips"),
    qnum: $("lv-qnum"),
    prompt: $("lv-prompt"),
    timerBar: $("lv-timer-bar"),
    options: $("lv-options"),
    myAvatar: $("lv-my-avatar"),
    myName: $("lv-my-name"),
    reroll: $("lv-reroll"),
    status: $("lv-status"),
    statusText: $("lv-status-text"),
    feedback: $("lv-feedback"),
    rematch: $("lv-rematch"),
    leave: $("lv-leave"),
    invite: $("lv-invite"),
    inviteAvatar: $("lv-invite-avatar"),
    inviteText: $("lv-invite-text"),
    inviteBar: $("lv-invite-bar"),
    accept: $("lv-accept"),
    decline: $("lv-decline"),
    pill: $("live-pill"),
    count: $("live-count"),
    question: document.querySelector(".lv-question"),
    victory: $("lv-victory"),
    victoryKicker: $("lv-victory-kicker"),
    victoryTitle: $("lv-victory-title"),
    victoryName: $("lv-victory-name"),
    victoryScore: $("lv-victory-score"),
    sparks: $("lv-sparks"),
    trophies: $("lv-trophies"),
  };

  /* ---------- State ---------- */
  let link = null;        // active connection
  let peers = {};         // id -> cleaned profile (other visitors only)
  let match = null;       // current duel
  let pending = null;     // challenge you sent
  let incoming = null;    // challenge you received
  let goneTimer = null;   // opponent missing from the lobby
  let trophies = Number(load("live-trophies")) || 0;

  const inDuel = () => Boolean(match && match.phase !== "over");
  const feedback = (text, kind) => Arcade.setFeedback(el.feedback, text, kind);
  const nameOf = (id) => (peers[id] ? peers[id].name : (match && match.opp === id ? match.oppProfile.name : "Your opponent"));

  function send(to, msg) {
    if (link) link.send(to, msg);
  }

  function publish() {
    if (link) link.update(profile());
  }

  function renderMe() {
    avatar(el.myAvatar, identity);
    el.myName.textContent = identity.name;
    el.reroll.disabled = Boolean(inDuel() || pending);
    el.trophies.textContent = trophies;
  }

  function setStatus(state) {
    el.status.dataset.state = state;
    if (state === "connecting") el.statusText.textContent = "Connecting to the live lobby…";
    else if (state === "down") el.statusText.textContent = "Live lobby unavailable. Check your connection.";
    else if (link) {
      const n = Object.keys(peers).length + 1;
      el.statusText.textContent = `${n} online · ${link.mode}`;
    }
  }

  /* =========================================================
     Lobby: floating bubbles
     ========================================================= */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bubbles = new Map(); // id -> { el, x, y, vx, vy }
  let running = false;
  let lastFrame = 0;

  function bubbleRadius() {
    return window.innerWidth < 600 ? 40 : 52;
  }

  function placeBubble(b) {
    const r = bubbleRadius();
    const w = Math.max(el.arena.clientWidth, 2 * r + 1);
    const h = Math.max(el.arena.clientHeight, 2 * r + 1);
    b.x = r + Math.random() * (w - 2 * r);
    b.y = r + Math.random() * (h - 2 * r);
    const speed = reduceMotion ? 0 : 18 + Math.random() * 16;
    const angle = Math.random() * Math.PI * 2;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
  }

  function fillBubble(node, id, p) {
    const self = id === "self";
    const busy = !self && p.status === "playing";
    node.style.setProperty("--c", COLORS[p.color]);
    node.classList.toggle("is-busy", busy);
    node.classList.toggle("is-pending", Boolean(pending && pending.to === id));
    const meta = self ? "You" : busy ? "In a duel" : `on ${PAGE_NAMES[p.page]}`;
    node.innerHTML = `<span class="lv-bubble-core"><i class="fa-solid fa-${ICONS[p.icon]}" aria-hidden="true"></i>` +
      `<span class="lv-bubble-name"></span><span class="lv-bubble-meta"></span></span>`;
    node.querySelector(".lv-bubble-name").textContent = p.name;
    node.querySelector(".lv-bubble-meta").textContent = meta;
    if (!self) {
      node.disabled = busy || inDuel();
      node.setAttribute("aria-label", busy ? `${p.name} is in a duel` : `Challenge ${p.name}, viewing ${PAGE_NAMES[p.page]}`);
    }
  }

  function syncBubbles() {
    const wanted = { self: { ...identity, page: location.hash.slice(1) || "home", status: "idle" }, ...peers };

    bubbles.forEach((b, id) => {
      if (wanted[id]) return;
      bubbles.delete(id);
      b.el.classList.add("is-leaving");
      setTimeout(() => b.el.remove(), 400);
    });

    Object.keys(wanted).forEach((id) => {
      let b = bubbles.get(id);
      if (!b) {
        const node = document.createElement(id === "self" ? "div" : "button");
        node.className = "lv-bubble" + (id === "self" ? " is-self" : "");
        if (id !== "self") {
          node.type = "button";
          node.addEventListener("click", () => challenge(id));
        }
        b = { el: node, fresh: !el.arena.clientWidth };
        placeBubble(b);
        bubbles.set(id, b);
        el.arena.appendChild(node);
        draw(b);
      }
      fillBubble(b.el, id, wanted[id]);
    });

    const others = Object.keys(peers).length;
    el.empty.hidden = others > 0;
    el.empty.textContent = link
      ? "Only you are here right now. Bubbles appear as other visitors arrive."
      : "";
  }

  function draw(b) {
    const r = bubbleRadius();
    b.el.style.transform = `translate3d(${b.x - r}px, ${b.y - r}px, 0)`;
  }

  function frame(time) {
    if (!running) return;
    const dt = Math.min((time - (lastFrame || time)) / 1000, 0.05);
    lastFrame = time;
    const r = bubbleRadius();
    const w = el.arena.clientWidth;
    const h = el.arena.clientHeight;

    if (w && h) {
      const list = [...bubbles.values()];
      list.forEach((b) => {
        if (b.fresh) { placeBubble(b); b.fresh = false; } // was added while the lobby was hidden
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx); }
        if (b.x > w - r) { b.x = w - r; b.vx = -Math.abs(b.vx); }
        if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy); }
        if (b.y > h - r) { b.y = h - r; b.vy = -Math.abs(b.vy); }
      });

      // Bubbles bounce off each other
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const c = list[j];
          const dx = c.x - a.x;
          const dy = c.y - a.y;
          const dist = Math.hypot(dx, dy) || 1;
          const overlap = 2 * r + 6 - dist;
          if (overlap <= 0) continue;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
          c.x += nx * overlap / 2; c.y += ny * overlap / 2;
          const along = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
          if (along < 0) {
            a.vx += along * nx; a.vy += along * ny;
            c.vx -= along * nx; c.vy -= along * ny;
          }
        }
      }
      list.forEach(draw);
    }
    requestAnimationFrame(frame);
  }

  function startLoop() {
    if (running) return;
    running = true;
    lastFrame = 0;
    requestAnimationFrame(frame);
  }

  // Animate only while the lobby is actually on screen
  function wake() {
    const visible = !$("page-arcade").hidden && !$("game-duel").hidden && !el.arena.hidden;
    if (visible) startLoop();
    else running = false;
  }

  /* =========================================================
     Challenges
     ========================================================= */
  function challenge(id) {
    if (!link || inDuel() || pending || !peers[id] || peers[id].status === "playing") return;
    const mid = newId();
    pending = {
      mid,
      to: id,
      seed: Math.floor(Math.random() * 1e9),
      level: Arcade.level(),
      timer: setTimeout(() => endPending(`${nameOf(id)} didn't answer. Try someone else.`), INVITE_MS),
    };
    send(id, { t: "invite", mid, seed: pending.seed, level: pending.level });
    feedback(`Challenge sent to ${nameOf(id)}. Waiting for them to accept…`);
    el.leave.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i> Cancel challenge';
    el.leave.hidden = false;
    renderMe();
    syncBubbles();
  }

  function endPending(message, kind) {
    if (!pending) return;
    clearTimeout(pending.timer);
    pending = null;
    el.leave.hidden = true;
    feedback(message || "", kind);
    renderMe();
    syncBubbles();
  }

  function showInvite(from, msg) {
    const p = peers[from] || clean({});
    incoming = {
      mid: msg.mid,
      from,
      seed: Number(msg.seed) || 1,
      level: msg.level === "hard" ? "hard" : "easy",
      timer: setTimeout(() => answerInvite(false), INVITE_MS),
    };
    avatar(el.inviteAvatar, p);
    el.inviteText.innerHTML = "";
    const who = document.createElement("b");
    who.textContent = p.name;
    el.inviteText.append(who, ` challenges you to a Logic Duel (${incoming.level === "hard" ? "Hard" : "Easy"}).`);
    el.inviteBar.style.animation = "none";
    void el.inviteBar.offsetWidth;
    el.inviteBar.style.animation = `lv-drain ${INVITE_MS}ms linear forwards`;
    el.invite.hidden = false;
    tone(76, { dur: 0.18, vol: 0.12 });
    tone(83, { dur: 0.3, vol: 0.1, delay: 0.14 });
  }

  function hideInvite() {
    if (incoming) clearTimeout(incoming.timer);
    incoming = null;
    el.invite.hidden = true;
  }

  function answerInvite(yes) {
    if (!incoming) return;
    const inv = incoming;
    hideInvite();
    if (!yes || !peers[inv.from]) {
      send(inv.from, { t: "decline", mid: inv.mid });
      return;
    }
    send(inv.from, { t: "accept", mid: inv.mid });
    if (location.hash !== "#arcade") location.hash = "arcade";
    Arcade.open("tab-duel");
    startMatch({ mid: inv.mid, opp: inv.from, role: "guest", seed: inv.seed, level: inv.level });
  }

  el.accept.addEventListener("click", () => answerInvite(true));
  el.decline.addEventListener("click", () => answerInvite(false));

  /* =========================================================
     Logic Duel questions: both players generate the same
     questions from the shared seed, so only answers travel.
     ========================================================= */
  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const TRIVIA = {
    easy: [
      ["HTML stands for HyperText ___ Language", "Markup", ["Machine", "Modern", "Media"]],
      ["Which one is an output device?", "Monitor", ["Keyboard", "Mouse", "Scanner"]],
      ["1 byte = ? bits", "8", ["4", "16", "32"]],
      ["CPU stands for Central ___ Unit", "Processing", ["Power", "Program", "Control"]],
      ["Which one is a web browser?", "Firefox", ["Linux", "Python", "MySQL"]],
      ["Which HTML tag makes a link?", "<a>", ["<link>", "<href>", "<p>"]],
      ["Which one is a programming language?", "Python", ["HTTP", "Excel", "USB"]],
      ["RAM loses its data when…", "power is off", ["it is full", "you log out", "Wi-Fi drops"]],
    ],
    hard: [
      ["Default port for HTTPS?", "443", ["80", "22", "8080"]],
      ["Default port for SSH?", "22", ["21", "25", "3389"]],
      ["HTTP status for Not Found?", "404", ["403", "500", "301"]],
      ["SQL clause that filters groups?", "HAVING", ["WHERE", "ORDER BY", "LIMIT"]],
      ["Time complexity of binary search?", "O(log n)", ["O(n)", "O(n log n)", "O(1)"]],
      ["Which is NOT a private IPv4 range?", "172.32.0.0/16", ["10.0.0.0/8", "192.168.0.0/16", "172.16.0.0/12"]],
      ["Get remote changes without merging?", "git fetch", ["git pull", "git push", "git clone"]],
      ["Protocol used to SEND email?", "SMTP", ["IMAP", "POP3", "FTP"]],
    ],
  };

  const GATES = {
    AND: (a, b) => a & b,
    OR: (a, b) => a | b,
    XOR: (a, b) => a ^ b,
    NAND: (a, b) => 1 - (a & b),
    NOR: (a, b) => 1 - (a | b),
  };

  function makeQuestion(seed, q, level) {
    const r = seeded(seed + q * 7919);
    const int = (min, max) => min + Math.floor(r() * (max - min + 1));
    const pick = (list) => list[Math.floor(r() * list.length)];
    const hard = level === "hard";
    const kind = pick(hard ? ["bin", "dec", "hex", "gate", "trivia"] : ["bin", "dec", "gate", "trivia"]);
    let prompt;
    let answer;
    let candidates = [];

    if (kind === "bin" || kind === "dec") {
      const bits = hard ? 8 : 4;
      const n = int(1, 2 ** bits - 1);
      const asBin = (v) => v.toString(2).padStart(bits, "0");
      const near = [n + 1, n - 1, n + 2, n - 2, n ^ 1, n ^ 2, n ^ 4, n ^ 8, n ^ (1 << (bits - 1))]
        .filter((v) => v > 0 && v < 2 ** bits);
      if (kind === "bin") {
        prompt = `${asBin(n)} in decimal = ?`;
        answer = String(n);
        candidates = near.map(String);
      } else {
        prompt = `${n} in binary = ?`;
        answer = asBin(n);
        candidates = near.map(asBin);
      }
    } else if (kind === "hex") {
      const n = int(17, 254);
      const hex = n.toString(16).toUpperCase().padStart(2, "0");
      prompt = `0x${hex} in decimal = ?`;
      answer = String(n);
      const swapped = parseInt(hex[1] + hex[0], 16);
      candidates = [n + 16, n - 16, n + 1, n - 1, swapped, n + 10].filter((v) => v > 0 && v < 256).map(String);
    } else if (kind === "gate") {
      const a = int(0, 1);
      const b = int(0, 1);
      if (hard) {
        const c = int(0, 1);
        const g1 = pick(Object.keys(GATES));
        const g2 = pick(Object.keys(GATES));
        prompt = `(${a} ${g1} ${b}) ${g2} ${c} = ?`;
        answer = String(GATES[g2](GATES[g1](a, b), c));
      } else {
        const g = pick(["AND", "OR", "XOR"]);
        prompt = `${a} ${g} ${b} = ?`;
        answer = String(GATES[g](a, b));
      }
      candidates = [answer === "1" ? "0" : "1"];
    } else {
      // Same shuffled deck for the whole match, so trivia never repeats
      const deck = TRIVIA[level].slice();
      const shuffle = seeded(seed);
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(shuffle() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      const [question, right, wrong] = deck[q % deck.length];
      prompt = question;
      answer = right;
      candidates = wrong;
    }

    const options = [answer];
    candidates.forEach((c) => { if (options.length < 4 && !options.includes(c)) options.push(c); });
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return { prompt, answer, options };
  }

  /* =========================================================
     Match flow. The challenger ("host") decides who scored,
     so both screens always agree.
     ========================================================= */
  function pips(node, score) {
    node.innerHTML = "";
    for (let i = 0; i < TARGET; i++) {
      const pip = document.createElement("i");
      if (i < score) pip.className = "on";
      node.appendChild(pip);
    }
  }

  function renderScores() {
    pips(el.mePips, match.me);
    pips(el.oppPips, match.them);
  }

  function startMatch(opts) {
    if (match) match.timers.forEach(clearTimeout);
    endPending();
    hideInvite();
    match = {
      ...opts,
      oppProfile: peers[opts.opp] || clean({}),
      q: -1,
      lastPoint: -1,                 // last question whose point was shown
      me: 0,
      them: 0,
      phase: "countdown",
      missed: { host: false, guest: false },
      timers: [],
    };
    clearTimeout(goneTimer);

    avatar(el.meAvatar, identity);
    el.meName.textContent = "You";
    avatar(el.oppAvatar, match.oppProfile);
    el.oppName.textContent = match.oppProfile.name;
    renderScores();

    el.arena.hidden = true;
    el.match.hidden = false;
    wake();
    el.rematch.hidden = true;
    el.leave.innerHTML = '<i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i> Leave match';
    el.leave.hidden = false;
    el.options.innerHTML = "";
    el.victory.hidden = true;
    el.question.hidden = false;
    el.options.hidden = false;
    el.qnum.textContent = `First to ${TARGET} · ${match.level === "hard" ? "Hard" : "Easy"}`;
    feedback(`Duel vs ${match.oppProfile.name}!`);
    renderMe();
    publish();

    [3, 2, 1].forEach((n, i) => later(() => {
      el.prompt.textContent = `Starting in ${n}…`;
      tone(64, { dur: 0.12, vol: 0.1 });
    }, i * 800));
    later(() => showQuestion(0), 2400);
  }

  function later(fn, ms) {
    const m = match;
    const t = setTimeout(() => { if (match === m) fn(); }, ms);
    match.timers.push(t);
    return t;
  }

  function showQuestion(q) {
    if (q <= match.lastPoint || match.phase === "over") return;
    match.q = q;
    match.phase = "question";
    match.missed = { host: false, guest: false };
    match.question = makeQuestion(match.seed, q, match.level);

    el.qnum.textContent = `Question ${q + 1} · first to ${TARGET}`;
    el.prompt.textContent = match.question.prompt;
    el.prompt.classList.remove("flip-in");
    void el.prompt.offsetWidth;
    el.prompt.classList.add("flip-in");

    el.options.innerHTML = "";
    match.question.options.forEach((value) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.textContent = value;
      btn.addEventListener("click", () => pickAnswer(btn, value));
      el.options.appendChild(btn);
    });
    feedback("");

    const ms = QUESTION_MS[match.level];
    el.timerBar.style.animation = "none";
    void el.timerBar.offsetWidth;
    el.timerBar.style.animation = `lv-drain ${ms}ms linear forwards`;
    if (match.role === "host") match.questionTimer = later(() => resolve(q, "none"), ms);
  }

  function lockOptions() {
    el.options.querySelectorAll("button").forEach((b) => { b.disabled = true; });
  }

  function pickAnswer(btn, value) {
    if (!match || match.phase !== "question" || match.answered === match.q) return;
    match.answered = match.q;
    lockOptions();
    const q = match.q;

    if (value === match.question.answer) {
      btn.classList.add("is-right");
      tone(79, { dur: 0.15, vol: 0.12 });
      if (match.role === "host") resolve(q, "host");
      else {
        feedback("Correct! Checking who was faster…");
        send(match.opp, { t: "got", mid: match.mid, q });
      }
    } else {
      btn.classList.add("is-wrong");
      tone(45, { dur: 0.25, type: "triangle", vol: 0.14 });
      feedback("Wrong answer. You're locked out of this one.", "bad");
      if (match.role === "host") miss(q, "host");
      else send(match.opp, { t: "miss", mid: match.mid, q });
    }
  }

  // Host only
  function miss(q, role) {
    if (q !== match.q) return;
    match.missed[role] = true;
    if (match.missed.host && match.missed.guest) resolve(q, "none");
  }

  // Host only: first claim for the current question wins
  function resolve(q, winner) {
    if (!match || q !== match.q || q <= match.lastPoint) return;
    if (winner === "host") match.me += 1;
    if (winner === "guest") match.them += 1;
    const msg = { t: "point", mid: match.mid, q, w: winner, hs: match.me, gs: match.them };
    send(match.opp, msg);
    showPoint(msg);
  }

  function showPoint(msg) {
    clearTimeout(match.questionTimer);
    match.phase = "reveal";
    match.lastPoint = msg.q;
    const guest = match.role === "guest";
    match.me = guest ? msg.gs : msg.hs;
    match.them = guest ? msg.hs : msg.gs;
    const mine = msg.w === match.role;
    renderScores();
    lockOptions();
    el.timerBar.style.animation = "none";
    el.options.querySelectorAll("button").forEach((b) => {
      if (b.textContent === match.question.answer) b.classList.add("is-right");
    });

    if (msg.w === "none") feedback(`No point. The answer was ${match.question.answer}.`);
    else if (mine) {
      feedback("Point for you!", "good");
      [72, 76, 79].forEach((n, i) => tone(n, { dur: 0.2, vol: 0.12, delay: i * 0.07 }));
    } else {
      feedback(`${match.oppProfile.name} answered first. It was ${match.question.answer}.`, "bad");
      tone(55, { dur: 0.3, type: "triangle", vol: 0.12 });
    }

    if (match.me >= TARGET || match.them >= TARGET) later(() => finish(match.me >= TARGET), 1300);
    else later(() => showQuestion(msg.q + 1), 1600);
  }

  /* ---------- Trophy ceremony ---------- */
  function sparks(count, colors) {
    el.sparks.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const s = document.createElement("i");
      s.style.setProperty("--a", `${Math.round((360 / count) * i + Math.random() * 12)}deg`);
      s.style.setProperty("--d", `${110 + Math.round(Math.random() * 120)}px`);
      s.style.setProperty("--c", colors[i % colors.length]);
      s.style.animationDelay = `${0.75 + Math.random() * 0.5}s`;
      el.sparks.appendChild(s);
    }
  }

  function ceremony(won, forfeit) {
    el.question.hidden = true;
    el.options.hidden = true;
    el.victory.classList.toggle("is-won", won);
    el.victory.classList.toggle("is-lost", !won);
    el.victoryKicker.textContent = forfeit ? "Win by forfeit" : "Duel complete";
    el.victoryTitle.textContent = won ? "CHAMPION" : "RUNNER-UP";
    el.victoryTitle.dataset.text = el.victoryTitle.textContent;
    el.victoryName.textContent = won ? "The trophy is yours!" : `${match.oppProfile.name} takes the trophy`;
    el.victoryScore.textContent = `${match.me} – ${match.them}`;
    sparks(won ? 32 : 12, won ? ["#ffe08a", "#3ee6ff", "#ffffff", "#f472b6"] : ["#3ee6ff"]);

    // Restart every animation in the ceremony
    el.victory.hidden = true;
    void el.victory.offsetWidth;
    el.victory.hidden = false;
  }

  function finish(won, reason) {
    match.timers.forEach(clearTimeout);
    match.phase = "over";
    el.timerBar.style.animation = "none";
    el.options.innerHTML = "";
    ceremony(won, Boolean(reason) && won);

    if (won) {
      const bonus = match.level === "hard" ? 100 : 50;
      Arcade.addPoints(bonus);
      trophies += 1;
      store("live-trophies", String(trophies));
      renderMe();
      feedback(reason || `Trophy earned! +${bonus} points added to your score.`, "good");
      // Rising fanfare as the trophy lifts off the platform
      [60, 64, 67, 72].forEach((n, i) => tone(n, { dur: 0.25, type: "triangle", vol: 0.1, delay: i * 0.11 }));
      [76, 79, 84].forEach((n) => tone(n, { dur: 1.1, vol: 0.09, delay: 0.55 }));
      tone(96, { dur: 0.4, vol: 0.05, delay: 0.9 });
    } else {
      feedback(reason || "Good game! Ask for a rematch?");
      tone(60, { dur: 0.4, type: "triangle", vol: 0.1 });
      tone(55, { dur: 0.5, type: "triangle", vol: 0.1, delay: 0.2 });
    }

    el.rematch.hidden = !peers[match.opp];
    el.leave.innerHTML = '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back to lobby';
    publish();
  }

  function backToLobby() {
    if (match) match.timers.forEach(clearTimeout);
    match = null;
    clearTimeout(goneTimer);
    el.match.hidden = true;
    el.arena.hidden = false;
    el.rematch.hidden = true;
    el.leave.hidden = true;
    renderMe();
    publish();
    syncBubbles();
    wake();
  }

  el.leave.addEventListener("click", () => {
    if (pending) {
      send(pending.to, { t: "cancel", mid: pending.mid });
      endPending("Challenge cancelled.");
      return;
    }
    if (!match) return;
    const quit = match.phase !== "over";
    if (quit) send(match.opp, { t: "leave", mid: match.mid });
    backToLobby();
    feedback(quit ? "You left the duel." : "");
  });

  el.rematch.addEventListener("click", () => {
    if (!match) return;
    const opp = match.opp;
    backToLobby();
    challenge(opp);
  });

  function opponentLeft() {
    if (!match) return;
    if (match.phase === "over") {
      el.rematch.hidden = true;
      return;
    }
    finish(true, `${match.oppProfile.name} left the duel. You win by forfeit!`);
    el.rematch.hidden = true;
  }

  window.addEventListener("pagehide", () => {
    if (match && match.phase !== "over") send(match.opp, { t: "leave", mid: match.mid });
  });

  /* ---------- Incoming messages ---------- */
  function onMessage(from, msg) {
    if (!msg || typeof msg.t !== "string") return;
    const ours = (m) => m && m.mid === msg.mid;

    switch (msg.t) {
      case "invite":
        if (inDuel() || pending || incoming) send(from, { t: "decline", mid: msg.mid, busy: true });
        else showInvite(from, msg);
        break;
      case "cancel":
        if (incoming && incoming.mid === msg.mid) hideInvite();
        break;
      case "accept":
        if (ours(pending) && pending.to === from) {
          const p = pending;
          startMatch({ mid: p.mid, opp: from, role: "host", seed: p.seed, level: p.level });
        } else if (!ours(match)) send(from, { t: "expired", mid: msg.mid });
        break;
      case "decline":
        if (ours(pending) && pending.to === from) {
          endPending(msg.busy ? `${nameOf(from)} is busy right now.` : `${nameOf(from)} can't play right now.`);
        }
        break;
      case "got":
        if (ours(match) && match.role === "host" && match.phase === "question") resolve(msg.q, "guest");
        break;
      case "miss":
        if (ours(match) && match.role === "host" && match.phase === "question") miss(msg.q, "guest");
        break;
      case "point":
        if (!ours(match) || match.role !== "guest" || match.phase === "over" || !(msg.q > match.lastPoint)) break;
        if (msg.q !== match.q) showQuestion(msg.q); // a slow connection fell behind: catch up
        showPoint(msg);
        break;
      case "expired":
        if (ours(match) && match.role === "guest") {
          backToLobby();
          feedback("That challenge had already expired.");
        }
        break;
      case "leave":
        if (ours(match)) opponentLeft();
        break;
    }
  }

  /* ---------- Lobby updates ---------- */
  function onPeers(map) {
    peers = {};
    Object.keys(map).forEach((id) => { peers[id] = clean(map[id]); });

    if (match && match.phase !== "over") {
      if (peers[match.opp]) clearTimeout(goneTimer);
      else {
        clearTimeout(goneTimer);
        goneTimer = setTimeout(() => { if (match && !peers[match.opp]) opponentLeft(); }, LEAVE_GRACE_MS);
      }
    } else if (match && !peers[match.opp]) {
      el.rematch.hidden = true;
    }
    if (pending && !peers[pending.to]) endPending("They left the site before answering.");
    if (incoming && !peers[incoming.from]) hideInvite();

    el.count.textContent = Object.keys(peers).length + 1;
    el.pill.hidden = false;
    setStatus("online");
    syncBubbles();
  }

  /* ---------- Your identity ---------- */
  el.reroll.addEventListener("click", () => {
    if (inDuel() || pending) return;
    identity = randomIdentity();
    store("live-identity", JSON.stringify(identity));
    renderMe();
    syncBubbles();
    publish();
  });

  el.pill.addEventListener("click", () => {
    setTimeout(() => Arcade.open("tab-duel"));
  });

  pageEnterHooks.push(() => {
    publish();
    wake();
  });

  /* ---------- Connect ---------- */
  async function connect() {
    setStatus("connecting");
    const handlers = { peers: onPeers, message: onMessage, down: () => setStatus("down") };
    const local = new URLSearchParams(location.search).get("live") === "local";
    try {
      if (local) link = connectLocal(handlers);
      else if (LIVE_FIREBASE.apiKey && LIVE_FIREBASE.databaseURL) {
        try {
          link = await connectFirebase(handlers);
        } catch (e) {
          console.warn("Firebase lobby unavailable, using public relays.", e);
          link = await connectRelay(handlers);
        }
      } else link = await connectRelay(handlers);
      setStatus("online");
      syncBubbles();
    } catch (e) {
      console.warn("Live lobby unavailable.", e);
      setStatus("down");
      el.empty.textContent = "The live lobby couldn't connect. The other games still work offline.";
    }
  }

  renderMe();
  syncBubbles();

  Arcade.register({
    tab: "tab-duel",
    reset() {},                       // the duel keeps its own difficulty per match
    stop() { running = false; },      // pause the bubbles; a running duel carries on
    enter: startLoop,
  });

  if (document.readyState === "complete") setTimeout(connect, 300);
  else window.addEventListener("load", () => setTimeout(connect, 300));
})();
