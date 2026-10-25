"use strict";

const root = document.documentElement;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  themeColorMeta.setAttribute("content", isDark ? "#121212" : "#f4f4f6");
  themeListeners.forEach((fn) => fn(theme));
}

themeToggle.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  try { localStorage.setItem("theme", next); } catch (e) { /* storage unavailable */ }
});

applyTheme(root.getAttribute("data-theme") || "dark");

/* ---------------------------------------------------------
   Mobile menu
   --------------------------------------------------------- */
const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.getElementById("nav-links");

function setMenu(open) {
  navLinks.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  menuToggle.innerHTML = `<i class="fa-solid fa-${open ? "xmark" : "bars"}" aria-hidden="true"></i>`;
}

menuToggle.addEventListener("click", () => setMenu(!navLinks.classList.contains("open")));
navLinks.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
document.addEventListener("click", (e) => {
  if (navLinks.classList.contains("open") && !e.target.closest(".nav")) setMenu(false);
});
window.matchMedia("(min-width: 769px)").addEventListener("change", () => setMenu(false));

/* ---------------------------------------------------------
   Highlight the nav link for the section in view
   --------------------------------------------------------- */
const sectionLinks = new Map(
  [...navLinks.querySelectorAll("a")].map((a) => [a.getAttribute("href").slice(1), a])
);

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach((link) => link.classList.remove("active"));
      const link = sectionLinks.get(entry.target.id);
      if (link) link.classList.add("active");
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
document.querySelectorAll("main section[id]").forEach((s) => sectionObserver.observe(s));

/* ---------------------------------------------------------
   Scroll reveal
   --------------------------------------------------------- */
const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* ---------------------------------------------------------
   Typewriter
   --------------------------------------------------------- */
const roles = ["System Developer", "Web Developer", "BSIT Graduate", "Graphic Designer"];
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
    submitBtn.textContent = "Send Message";
  }
});

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

  // Wireframe boxes
  const boxMaterial = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.4 });
  const boxes = [
    { size: 5, pos: [-10, 0, -10], spin: [0.006, 0.008], bob: [1, 0.7, 0] },
    { size: 4, pos: [0, 3, -18], spin: [0.008, 0.006], bob: [1.2, 0.5, 1] },
    { size: 3, pos: [10, -2, -26], spin: [0.007, 0.009], bob: [0.8, 0.6, -1] },
  ].map((cfg) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(cfg.size, cfg.size, cfg.size), boxMaterial);
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
  const particleMaterial = new THREE.PointsMaterial({ size: 0.07, transparent: true, opacity: 0.9 });
  scene.add(new THREE.Points(particleGeometry, particleMaterial));

  // Colors per theme: glowing additive red on dark, solid deeper red on light
  function setBackgroundTheme(theme) {
    const dark = theme === "dark";
    const color = dark ? 0xff0a3a : 0xc40f0f;
    boxMaterial.color.setHex(color);
    particleMaterial.color.setHex(color);
    particleMaterial.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    particleMaterial.size = dark ? 0.07 : 0.09;
    particleMaterial.needsUpdate = true;
    renderer.render(scene, camera);
  }
  themeListeners.push(setBackgroundTheme);
  setBackgroundTheme(root.getAttribute("data-theme"));

  let running = !prefersReducedMotion;

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);

    const time = performance.now() * 0.001;
    boxes.forEach(({ mesh, spin, bob }) => {
      mesh.rotation.x += spin[0];
      mesh.rotation.y += spin[1];
      mesh.position.y = Math.sin(time * bob[0]) * bob[1] + bob[2];
    });

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
