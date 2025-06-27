// Hamburger Menu Toggle
function hamburg() {
  const navbar = document.querySelector(".dropdown");
  navbar.style.transform = "translateY(0px)"; // Show dropdown menu
}

function cancel() {
  const navbar = document.querySelector(".dropdown");
  navbar.style.transform = "translateY(-500px)"; // Hide dropdown menu
}

// Typewriter Effect
const texts = ["DEVELOPER", "DESIGNER"];
let speed = 100;
const textElements = document.querySelector(".typewriter-text");
let textIndex = 0;
let characterIndex = 0;

function typeWriter() {
  if (characterIndex < texts[textIndex].length) {
    textElements.innerHTML += texts[textIndex].charAt(characterIndex);
    characterIndex++;
    setTimeout(typeWriter, speed);
  } else {
    setTimeout(eraseText, 1000);
  }
}

function eraseText() {
  if (textElements.innerHTML.length > 0) {
    textElements.innerHTML = textElements.innerHTML.slice(0, -1);
    setTimeout(eraseText, 50);
  } else {
    textIndex = (textIndex + 1) % texts.length;
    characterIndex = 0;
    setTimeout(typeWriter, 500);
  }
}

window.onload = typeWriter;

// Form Validation and Email Sending
function sendMail(event) {
  event.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const message = document.getElementById("message").value;
  const notification = document.getElementById("notification");
  const notificationMessage = document.getElementById("notification-message");

  if (name === "" || email === "" || message === "") {
    notificationMessage.textContent = "All fields are required.";
    notification.classList.add("show");
    setTimeout(() => notification.classList.remove("show"), 3000);
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    notificationMessage.textContent = "Please enter a valid email address.";
    notification.classList.add("show");
    setTimeout(() => notification.classList.remove("show"), 3000);
    return;
  }

  let parms = { name, email, message };

  emailjs
    .send("service_kocf3in", "template_cbcrfih", parms)
    .then(() => {
      notificationMessage.textContent = "Message sent successfully!";
      notification.classList.add("show");
      setTimeout(() => notification.classList.remove("show"), 3000);
      document.getElementById("name").value = "";
      document.getElementById("email").value = "";
      document.getElementById("message").value = "";
    })
    .catch((error) => {
      notificationMessage.textContent = "Failed to send message. Please try again.";
      notification.classList.add("show");
      setTimeout(() => notification.classList.remove("show"), 3000);
      console.error("Error sending email: ", error);
    });
}

document.querySelector("form").addEventListener("submit", sendMail);
document.getElementById("notification-close").addEventListener("click", () => {
  document.getElementById("notification").classList.remove("show");
});

// Theme Toggle
function toggleTheme() {
  const themeIcon = document.getElementById("theme-toggle-icon");
  const body = document.body;

  body.classList.toggle("dark-mode");
  if (body.classList.contains("dark-mode")) {
    body.classList.remove("light-mode");
    themeIcon.src = "assets/moon.png";
    themeIcon.alt = "Light Mode";
  } else {
    body.classList.add("light-mode");
    themeIcon.src = "assets/sun.png";
    themeIcon.alt = "Dark Mode";
  }
}

// Card Flip
const cards = document.querySelectorAll(".card");
cards.forEach((card) => {
  card.addEventListener("click", function () {
    this.classList.toggle("clicked");
  });
});

// Three.js Animation
document.addEventListener("DOMContentLoaded", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("holographic-bg").appendChild(renderer.domElement);

  const createHolographicBox = (size, x, y, z) => {
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0a3a,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
      emissive: 0xff0a3a,
      emissiveIntensity: 0.8,
    });
    const box = new THREE.Mesh(geometry, material);
    box.position.set(x, y, z);
    return box;
  };

  const box1 = createHolographicBox(5, -10, 0, -10);
  const box2 = createHolographicBox(4, 0, 3, -18);
  const box3 = createHolographicBox(3, 10, -2, -26);
  scene.add(box1, box2, box3);

  const particleCount = 1500;
  const particlesGeometry = new THREE.BufferGeometry();
  const posArray = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    posArray[i * 3 + 0] = (Math.random() - 0.5) * 60;
    posArray[i * 3 + 1] = (Math.random() - 0.5) * 60;
    posArray[i * 3 + 2] = (Math.random() - 0.5) * 60;
    velocities[i] = (Math.random() - 0.5) * 0.01;
  }

  particlesGeometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.07,
    color: 0xff0a3a,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particles);

  camera.position.z = 20;

  function animate() {
    requestAnimationFrame(animate);
    box1.rotation.x += 0.006;
    box1.rotation.y += 0.008;
    box2.rotation.x += 0.008;
    box2.rotation.y += 0.006;
    box3.rotation.x += 0.007;
    box3.rotation.y += 0.009;

    const time = Date.now() * 0.001;
    box1.position.y = Math.sin(time) * 0.7;
    box2.position.y = Math.sin(time * 1.2) * 0.5 + 1;
    box3.position.y = Math.sin(time * 0.8) * 0.6 - 1;

    const positions = particlesGeometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      const yIndex = i * 3 + 1;
      positions[yIndex] += velocities[i];
      if (positions[yIndex] > 30 || positions[yIndex] < -30) {
        positions[yIndex] = (Math.random() - 0.5) * 60;
      }
    }
    particlesGeometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
});