const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const $ = (sel, root = document) => root.querySelector(sel);

document.addEventListener("DOMContentLoaded", () => {
  setupReveal();
  setupActiveDots();
  setupModalCharts();
  setupScrollHint();
});

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

function setupScrollHint() {
  const modal = $("#chartModal");
  const stage = $(".chart-stage");
  const hint = $("#scrollHint");

  if (!modal || !stage || !hint) return;

  function updateHint() {
    const isModalOpen = modal.classList.contains("active");

    if (!isModalOpen) {
      hint.classList.remove("show");
      return;
    }

    const canScroll = stage.scrollHeight > stage.clientHeight + 20;
    const nearBottom = stage.scrollTop + stage.clientHeight >= stage.scrollHeight - 20;

    if (canScroll && !nearBottom) {
      hint.classList.add("show");
    } else {
      hint.classList.remove("show");
    }
  }

  stage.addEventListener("scroll", updateHint);
  window.addEventListener("resize", updateHint);

  window.updateScrollHint = updateHint;
}

function setupModalCharts() {
  const modal = $("#chartModal");
  const closeBtn = $("#closeModal");
  const chartTitle = $("#chartTitle");
  const chartSubtitle = $("#chartSubtitle");
  const clickablePanels = $$(".clickable");
  const stage = $(".chart-stage");
  const hint = $("#scrollHint");

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

      if (stage) stage.scrollTop = 0;

      setTimeout(() => {
        if (window.updateScrollHint) window.updateScrollHint();
      }, 120);
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

    if (stage) stage.scrollTop = 0;
    if (hint) hint.classList.remove("show");
  }
}

function activateChartPanel(key, chartPanels) {
  Object.values(chartPanels).forEach((panel) => {
    if (panel) panel.classList.remove("active");
  });

  const activePanel = chartPanels[key];
  if (!activePanel) return;

  activePanel.classList.add("active");

  const iframe = $(".chart-iframe", activePanel);
  if (iframe && !iframe.getAttribute("src")) {
    const src = iframe.getAttribute("data-src");
    if (src) {
      iframe.setAttribute("src", src);

      iframe.addEventListener(
        "load",
        () => {
          setTimeout(() => {
            if (window.updateScrollHint) window.updateScrollHint();
          }, 100);
        },
        { once: true }
      );
    }
  } else {
    setTimeout(() => {
      if (window.updateScrollHint) window.updateScrollHint();
    }, 100);
  }
}