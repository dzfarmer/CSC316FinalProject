// main.js
// Final integrated version for 8-panel story + modal charts

const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const $ = (sel, root = document) => root.querySelector(sel);

document.addEventListener("DOMContentLoaded", () => {
  setupReveal();
  setupActiveDots();
  setupModalCharts();
});

/* -----------------------------
   Reveal animation on scroll
----------------------------- */
function setupReveal() {
  const revealTargets = $$(".hero-copy, .hero-card, .story-copy, .story-image");
  revealTargets.forEach((el) => el.classList.add("reveal"));

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
        }
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -40px 0px"
    }
  );

  revealTargets.forEach((el) => revealObserver.observe(el));
}

/* -----------------------------
   Progress dots active state
----------------------------- */
function setupActiveDots() {
  const sections = $$("main section[id]");
  const dots = $$(".progress .dot");

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const activeId = entry.target.id;

        dots.forEach((dot) => {
          const href = dot.getAttribute("href");
          dot.classList.toggle("active", href === `#${activeId}`);
        });
      });
    },
    { threshold: 0.5 }
  );

  sections.forEach((section) => sectionObserver.observe(section));

  dots.forEach((dot) => {
    dot.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = dot.getAttribute("href");
      const target = $(targetId);
      if (!target) return;

      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });
}

/* -----------------------------
   Modal + chart switching
----------------------------- */
function setupModalCharts() {
  const modal = $("#chartModal");
  const closeBtn = $("#closeModal");
  const chartTitle = $("#chartTitle");
  const chartSubtitle = $("#chartSubtitle");
  const clickablePanels = $$(".clickable");

  if (!modal || !closeBtn || !chartTitle) return;

  const chartPanels = {
    clock: $("#panel-clock"),
    heatmap: $("#panel-heatmap"),
    sedentary: $("#panel-sedentary"),
    night: $("#panel-night"),
    bmi: $("#panel-bmi"),
    loop: $("#panel-loop"),
    balance: $("#panel-balance"),
    simulator: $("#panel-simulator")
  };

  clickablePanels.forEach((panel) => {
    panel.addEventListener("click", () => {
      const chartKey = panel.dataset.chart;
      const title = panel.dataset.title || "Data Visualization";
      const subtitle = panel.dataset.subtitle || "Explore the data behind this scene.";

      chartTitle.textContent = title;
      if (chartSubtitle) chartSubtitle.textContent = subtitle;

      activateChartPanel(chartKey, chartPanels);

      modal.classList.add("active");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    });
  });

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("active")) {
      closeModal();
    }
  });

  function closeModal() {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
}

function activateChartPanel(key, chartPanels) {
  Object.values(chartPanels).forEach((panel) => {
    if (panel) panel.classList.remove("active");
  });

  const activePanel = chartPanels[key];
  if (!activePanel) return;
  activePanel.classList.add("active");

  // Lazy load iframe only once
  const iframe = $(".chart-iframe", activePanel);
  if (iframe && !iframe.getAttribute("src")) {
    const src = iframe.getAttribute("data-src");
    if (src) iframe.setAttribute("src", src);
  }

  // Init or render charts only once
  if (key === "heatmap" && !window.__heatmapInitialized) {
    if (typeof window.initCaffeineHeatmap === "function") {
      window.initCaffeineHeatmap();
      window.__heatmapInitialized = true;
    }
  }

  if (key === "sedentary" && !window.__sedentaryChart) {
    renderSedentaryChart();
    window.__sedentaryChart = true;
  }

  if (key === "night" && !window.__nightChart) {
    renderNightChart();
    window.__nightChart = true;
  }

  if (key === "loop" && !window.__loopChart) {
    renderLoopChart();
    window.__loopChart = true;
  }

  if (key === "balance" && !window.__balanceChart) {
    renderBalanceChart();
    window.__balanceChart = true;
  }
}

/* -----------------------------
   Small built-in charts
----------------------------- */

function renderSedentaryChart() {
  const svg = d3.select("#sedentaryChart");
  if (svg.empty()) return;
  svg.selectAll("*").remove();

  const width = 960;
  const height = 420;
  const margin = { top: 40, right: 40, bottom: 60, left: 70 };

  const data = [
    { time: "8AM", sit: 20, energy: 88 },
    { time: "10AM", sit: 85, energy: 76 },
    { time: "12PM", sit: 150, energy: 64 },
    { time: "2PM", sit: 220, energy: 55 },
    { time: "4PM", sit: 305, energy: 42 },
    { time: "6PM", sit: 360, energy: 35 }
  ];

  const x = d3.scalePoint()
    .domain(data.map(d => d.time))
    .range([margin.left, width - margin.right]);

  const yLeft = d3.scaleLinear()
    .domain([0, 400])
    .range([height - margin.bottom, margin.top]);

  const yRight = d3.scaleLinear()
    .domain([0, 100])
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .call(g => g.select(".domain").remove());

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yLeft))
    .call(g => g.select(".domain").remove());

  svg.append("g")
    .attr("transform", `translate(${width - margin.right},0)`)
    .call(d3.axisRight(yRight))
    .call(g => g.select(".domain").remove());

  const sitLine = d3.line()
    .x(d => x(d.time))
    .y(d => yLeft(d.sit))
    .curve(d3.curveMonotoneX);

  const energyLine = d3.line()
    .x(d => x(d.time))
    .y(d => yRight(d.energy))
    .curve(d3.curveMonotoneX);

  svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#7b8cff")
    .attr("stroke-width", 4)
    .attr("d", sitLine);

  svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#ff9f66")
    .attr("stroke-width", 4)
    .attr("d", energyLine);

  svg.selectAll(".sit-dot")
    .data(data)
    .join("circle")
    .attr("cx", d => x(d.time))
    .attr("cy", d => yLeft(d.sit))
    .attr("r", 6)
    .attr("fill", "#7b8cff");

  svg.selectAll(".energy-dot")
    .data(data)
    .join("circle")
    .attr("cx", d => x(d.time))
    .attr("cy", d => yRight(d.energy))
    .attr("r", 6)
    .attr("fill", "#ff9f66");

  svg.append("text")
    .attr("x", margin.left)
    .attr("y", margin.top - 12)
    .attr("fill", "#7b8cff")
    .attr("font-weight", 800)
    .text("Accumulated sitting minutes");

  svg.append("text")
    .attr("x", width - margin.right - 180)
    .attr("y", margin.top - 12)
    .attr("fill", "#ff9f66")
    .attr("font-weight", 800)
    .text("Energy level");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 18)
    .attr("text-anchor", "middle")
    .attr("font-weight", 700)
    .text("Day timeline");
}

function renderNightChart() {
  const svg = d3.select("#nightChart");
  if (svg.empty()) return;
  svg.selectAll("*").remove();

  const width = 960;
  const height = 420;
  const margin = { top: 40, right: 30, bottom: 60, left: 80 };

  const data = [
    { habit: "Screen time", low: 18, medium: 26, high: 38 },
    { habit: "Late caffeine", low: 22, medium: 24, high: 34 },
    { habit: "Alcohol", low: 10, medium: 16, high: 24 },
    { habit: "Late exercise", low: 12, medium: 18, high: 20 }
  ];

  const x = d3.scaleBand()
    .domain(data.map(d => d.habit))
    .range([margin.left, width - margin.right])
    .padding(0.25);

  const y = d3.scaleLinear()
    .domain([0, 100])
    .range([height - margin.bottom, margin.top]);

  const stack = d3.stack().keys(["low", "medium", "high"]);
  const series = stack(data);

  const colors = {
    low: "#9bd3ae",
    medium: "#f0d58c",
    high: "#ef8a7a"
  };

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .call(g => g.select(".domain").remove());

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}%`))
    .call(g => g.select(".domain").remove());

  svg.selectAll(".series")
    .data(series)
    .join("g")
    .attr("fill", d => colors[d.key])
    .selectAll("rect")
    .data(d => d)
    .join("rect")
    .attr("x", d => x(d.data.habit))
    .attr("y", d => y(d[1]))
    .attr("height", d => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth())
    .attr("rx", 10);

  const legend = svg.append("g").attr("transform", `translate(${width - 250}, ${margin.top})`);
  ["low", "medium", "high"].forEach((key, i) => {
    const g = legend.append("g").attr("transform", `translate(0, ${i * 26})`);
    g.append("rect").attr("width", 14).attr("height", 14).attr("rx", 4).attr("fill", colors[key]);
    g.append("text")
      .attr("x", 22)
      .attr("y", 11)
      .text(`${key} contribution`)
      .attr("font-size", 12)
      .attr("font-weight", 700)
      .attr("fill", "#ffffff");
  });
}

function renderLoopChart() {
  const svg = d3.select("#loopChart");
  if (svg.empty()) return;
  svg.selectAll("*").remove();

  const width = 960;
  const height = 420;

  const nodes = [
    { name: "Sleep loss", x: 180, y: 90, color: "#7b8cff" },
    { name: "Coffee", x: 470, y: 90, color: "#f5b971" },
    { name: "Fatigue", x: 760, y: 180, color: "#ef8a7a" },
    { name: "Less movement", x: 650, y: 330, color: "#9ac7f0" },
    { name: "Unstable sleep", x: 290, y: 330, color: "#c3a6e8" }
  ];

  const links = [[0,1],[1,2],[2,3],[3,4],[4,0]];

  const defs = svg.append("defs");
  defs.append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 9)
    .attr("refY", 0)
    .attr("markerWidth", 8)
    .attr("markerHeight", 8)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#9da6bb");

  svg.selectAll(".loop-link")
    .data(links)
    .join("path")
    .attr("d", d => {
      const s = nodes[d[0]];
      const t = nodes[d[1]];
      return `M${s.x},${s.y} Q${(s.x+t.x)/2},${(s.y+t.y)/2 - 40} ${t.x},${t.y}`;
    })
    .attr("fill", "none")
    .attr("stroke", "#9da6bb")
    .attr("stroke-width", 3)
    .attr("marker-end", "url(#arrowhead)");

  const g = svg.selectAll(".loop-node")
    .data(nodes)
    .join("g")
    .attr("transform", d => `translate(${d.x},${d.y})`);

  g.append("circle")
    .attr("r", 48)
    .attr("fill", d => d.color)
    .attr("opacity", 0.95)
    .attr("stroke", "#fff")
    .attr("stroke-width", 4);

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", 5)
    .attr("fill", "#1f2430")
    .attr("font-weight", 800)
    .text(d => d.name);
}

function renderBalanceChart() {
  const svg = d3.select("#balanceChart");
  if (svg.empty()) return;
  svg.selectAll("*").remove();

  const width = 960;
  const height = 500;
  const cx = width / 2;
  const cy = height / 2 + 20;
  const radius = 150;

  const categories = [
    { name: "Sleep timing", value: 70 },
    { name: "Caffeine", value: 48 },
    { name: "Activity", value: 62 },
    { name: "Sedentary", value: 35 },
    { name: "BMI", value: 58 },
    { name: "Weekend shift", value: 44 }
  ];

  const angle = d3.scaleLinear()
    .domain([0, categories.length])
    .range([0, Math.PI * 2]);

  for (let level = 1; level <= 5; level++) {
    const r = radius * (level / 5);
    const points = categories.map((_, i) => {
      const a = angle(i) - Math.PI / 2;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    });
    svg.append("polygon")
      .attr("points", points.map(p => p.join(",")).join(" "))
      .attr("fill", "none")
      .attr("stroke", "#d8deec")
      .attr("stroke-width", 1.5);
  }

  categories.forEach((d, i) => {
    const a = angle(i) - Math.PI / 2;
    const x2 = cx + Math.cos(a) * radius;
    const y2 = cy + Math.sin(a) * radius;

    svg.append("line")
      .attr("x1", cx)
      .attr("y1", cy)
      .attr("x2", x2)
      .attr("y2", y2)
      .attr("stroke", "#d8deec")
      .attr("stroke-width", 1.5);

    const lx = cx + Math.cos(a) * (radius + 34);
    const ly = cy + Math.sin(a) * (radius + 34);

    svg.append("text")
      .attr("x", lx)
      .attr("y", ly)
      .attr("text-anchor", "middle")
      .attr("font-weight", 700)
      .text(d.name);
  });

  const points = categories.map((d, i) => {
    const a = angle(i) - Math.PI / 2;
    const r = radius * (d.value / 100);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });

  svg.append("polygon")
    .attr("points", points.map(p => p.join(",")).join(" "))
    .attr("fill", "rgba(115,133,255,0.28)")
    .attr("stroke", "#7385ff")
    .attr("stroke-width", 3);

  svg.selectAll(".radar-dot")
    .data(points)
    .join("circle")
    .attr("cx", d => d[0])
    .attr("cy", d => d[1])
    .attr("r", 6)
    .attr("fill", "#7385ff");

  svg.append("text")
    .attr("x", cx)
    .attr("y", 40)
    .attr("text-anchor", "middle")
    .attr("font-size", 24)
    .attr("font-weight", 800)
    .text("Behavioral Balance Summary");
}