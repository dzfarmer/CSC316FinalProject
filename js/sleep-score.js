/**
 * Sleep Score: potions → bottle → star (sleep quality).
 * Scoped to #sleep-score section; uses prefixed IDs.
 */
(function () {
  var MAX_LEVEL = 4;
  var KEYS = ["age", "weekend", "coffee", "activity", "bmi"];
  var PREFIX = "sleep-score-";

  var colors = {
    age: "#7eb8da",
    weekend: "#b8a0d4",
    coffee: "#c4a574",
    activity: "#7ec99e",
    bmi: "#e8b88a"
  };

  /** Instructions for each level (0–4) per key. Shown when user selects a level. */
  var INSTRUCTIONS = {
    age: {
      0: "Not selected",
      1: "Under 20",
      2: "20–40",
      3: "41–60",
      4: "80+"
    },
    weekend: {
      0: "Not selected",
      1: "No weekend shift (same wake time)",
      2: "Up to 1 hour shift",
      3: "1–2 hours shift",
      4: "2+ hours shift"
    },
    coffee: {
      0: "Not selected",
      1: "None or very little",
      2: "1–2 cups per day",
      3: "3–4 cups per day",
      4: "5+ cups per day"
    },
    activity: {
      0: "Not selected",
      1: "Low / sedentary",
      2: "Light activity",
      3: "Moderate activity",
      4: "High / very active"
    },
    bmi: {
      0: "Not selected",
      1: "Underweight",
      2: "Normal",
      3: "Overweight",
      4: "Obese"
    }
  };

  var levels = { age: 1, weekend: 0, coffee: 1, activity: 2, bmi: 0 };

  function id(name) {
    return document.getElementById(PREFIX + name);
  }

  function updatePotion(key) {
    var l = levels[key];
    var fill = id("fill-" + key);
    var levelEl = id("level-" + key);
    var descEl = id("desc-" + key);
    if (!fill || !levelEl) return;
    fill.style.height = (l / MAX_LEVEL) * 100 + "%";
    fill.style.backgroundColor = colors[key];
    levelEl.textContent = l;
    if (descEl && INSTRUCTIONS[key] && INSTRUCTIONS[key][l] !== undefined) {
      descEl.textContent = INSTRUCTIONS[key][l];
    }
  }

  function cycleLevel(key) {
    levels[key] = (levels[key] + 1) % (MAX_LEVEL + 1);
    updatePotion(key);
  }

  function getRiskFromLevels() {
    var age = levels.age;
    var weekend = levels.weekend;
    var coffee = levels.coffee;
    var activity = levels.activity;
    var bmi = levels.bmi;

    var risk = 50;
    if (age <= 1) risk -= 8;
    else if (age >= 3) risk += 10;
    if (weekend >= 1) risk += 15;
    if (coffee === 0) risk -= 5;
    else if (coffee <= 2) risk += 5;
    else risk += 15;
    if (activity <= 1) risk += 12;
    else if (activity >= 3) risk -= 10;
    if (bmi === 0) risk -= 8;
    else if (bmi >= 3) risk += 12;
    else risk += 5;
    return Math.max(0, Math.min(100, Math.round(risk)));
  }

  function updateBottleLayers() {
    var total = 0;
    KEYS.forEach(function (k) { total += levels[k]; });
    if (total === 0) total = 1;
    var container = id("bottle-layers");
    if (!container) return;
    container.innerHTML = "";
    var bottom = 0;
    KEYS.forEach(function (k) {
      var l = levels[k];
      if (l === 0) return;
      var h = (l / total) * 100;
      var layer = document.createElement("div");
      layer.className = "sleep-score-bottle-layer";
      layer.style.height = h + "%";
      layer.style.bottom = bottom + "%";
      layer.style.backgroundColor = colors[k];
      container.appendChild(layer);
      bottom += h;
    });
  }

  function getAdvice(quality) {
    if (quality >= 65) {
      return {
        main: "Your sleep quality is great! Your mix of habits supports good rest.",
        tip: "Keep a consistent 7–9 hours to maintain it."
      };
    }
    if (quality >= 35) {
      return {
        main: "Your sleep quality is okay. A few changes could help.",
        tip: "Try less caffeine after 2 p.m. and similar wake times on weekends."
      };
    }
    return {
      main: "Your sleep quality can improve. Schedule, caffeine, activity, or BMI might be affecting it.",
      tip: "Pick one change: fewer coffees, more movement, or a fixed wake time."
    };
  }

  function runWhenReady() {
    var root = document.getElementById("sleep-score");
    if (!root) return;

    KEYS.forEach(function (key) {
      var el = id("potion-" + key);
      if (!el) return;
      el.addEventListener("click", function () { cycleLevel(key); });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          cycleLevel(key);
        }
      });
    });

    KEYS.forEach(updatePotion);
    updateBottleLayers();

    var btn = id("btn-pour");
    var output = id("output");
    var starWrap = id("star-wrap");
    var starChar = id("star-char");
    var qualityText = id("quality-text");
    var adviceEl = id("advice");

    if (btn && output) {
      btn.addEventListener("click", function () {
        updateBottleLayers();
        var risk = getRiskFromLevels();
        var quality = 100 - risk;

        if (starWrap && starChar) {
          var size = 24 + (quality / 100) * 80;
          starWrap.style.fontSize = size + "px";
          starChar.textContent = "★";
        }
        if (qualityText) qualityText.textContent = "Sleep quality: " + quality + "%";

        var advice = getAdvice(quality);
        if (adviceEl) {
          adviceEl.innerHTML = advice.main + "<div class=\"sleep-score-tip\">" + advice.tip + "</div>";
        }

        output.hidden = false;
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runWhenReady);
  } else {
    runWhenReady();
  }
})();
