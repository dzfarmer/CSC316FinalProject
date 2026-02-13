/* main.js
   - Adds reveal animations on scroll
   - Draws simple placeholder charts on canvas
   - Highlights the active nav link and progress dot
   Replace placeholder drawing with real chart code later (D3, Chart.js, etc).
*/

const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const $ = (sel, root = document) => root.querySelector(sel);

function drawPlaceholderChart(canvas, seed = 1){
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Background glow
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "rgba(47,107,255,0.16)");
  g.addColorStop(1, "rgba(255,91,189,0.14)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = "rgba(20,33,61,0.12)";
  ctx.lineWidth = 1;
  const grid = 10;
  for(let i = 1; i < grid; i++){
    const x = (w / grid) * i;
    const y = (h / grid) * i;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = "rgba(20,33,61,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(70, 30);
  ctx.lineTo(70, h - 60);
  ctx.lineTo(w - 30, h - 60);
  ctx.stroke();

  // Seeded randomness
  let t = seed * 999;
  const rand = () => {
    t = (t * 1664525 + 1013904223) % 4294967296;
    return t / 4294967296;
  };

  // Bars and dots
  const left = 90, right = w - 50, top = 50, bottom = h - 80;
  const n = 12;
  const dx = (right - left) / n;

  // Bars
  for(let i = 0; i < n; i++){
    const r = rand();
    const barH = (bottom - top) * (0.15 + r * 0.75);
    const x = left + i * dx + dx * 0.15;
    const y = bottom - barH;
    const bw = dx * 0.55;

    ctx.fillStyle = i % 2 === 0 ? "rgba(47,107,255,0.55)" : "rgba(255,91,189,0.45)";
    ctx.fillRect(x, y, bw, barH);

    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, bw, barH);
  }

  // Dots line
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(20,33,61,0.45)";
  ctx.beginPath();
  for(let i = 0; i < n; i++){
    const r = rand();
    const x = left + i * dx + dx * 0.42;
    const y = top + (1 - r) * (bottom - top);
    if(i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Dots
  for(let i = 0; i < n; i++){
    const r = rand();
    const x = left + i * dx + dx * 0.42;
    const y = top + (1 - r) * (bottom - top);
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.arc(x, y, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(20,33,61,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Title
  ctx.fillStyle = "rgba(20,33,61,0.78)";
  ctx.font = "700 24px Plus Jakarta Sans, system-ui, sans-serif";
  ctx.fillText("Chart Placeholder", 86, 42);

  ctx.font = "600 14px Plus Jakarta Sans, system-ui, sans-serif";
  ctx.fillStyle = "rgba(20,33,61,0.65)";
  ctx.fillText("Swap with a real visualization later", 86, h - 22);
}

function setupPlaceholderCharts(){
  $$(".chart").forEach((box) => {
    const canvas = box.querySelector("canvas");
    if(!canvas) return;
    const seed = Number(box.dataset.chart || 1);

    // High DPI and responsive sizing
    const dpr = window.devicePixelRatio || 1;
    const cssW = box.getBoundingClientRect().width - 24; // padding
    const cssH = Math.max(280, Math.min(480, cssW * 0.42));

    canvas.style.height = cssH + "px";
    canvas.style.width = "100%";
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const temp = document.createElement("canvas");
    temp.width = Math.floor(cssW);
    temp.height = Math.floor(cssH);
    drawPlaceholderChart(temp, seed);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.drawImage(temp, 0, 0);
  });
}

function setupReveal(){
  const targets = $$(".card, .section-head, .hero-card, .hero-grid > div");
  targets.forEach(el => el.classList.add("reveal"));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting) e.target.classList.add("show");
    });
  }, { threshold: 0.16 });

  targets.forEach(el => io.observe(el));
}

function setupActiveNav(){
  const sections = $$("main section[id]");
  const navLinks = $$(".nav a");
  const dots = $$(".progress .dot");

  const setActive = (id) => {
    navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
    dots.forEach(d => d.classList.toggle("active", d.getAttribute("href") === "#" + id));
  };

  const io = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if(visible) setActive(visible.target.id);
  }, { threshold: [0.25, 0.5, 0.75] });

  sections.forEach(s => io.observe(s));
}

function setupMobileNav(){
  const toggle = $(".nav-toggle");
  const nav = $(".nav");
  if(!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", (e) => {
    if(!nav.classList.contains("open")) return;
    const clickedInside = nav.contains(e.target) || toggle.contains(e.target);
    if(!clickedInside){
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  $$(".nav a").forEach(a => a.addEventListener("click", () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }));
}

function setupResizeRedraw(){
  let raf = null;
  window.addEventListener("resize", () => {
    if(raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => setupPlaceholderCharts());
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupPlaceholderCharts();
  setupReveal();
  setupMobileNav();
  setupActiveNav();
  setupResizeRedraw();
});
