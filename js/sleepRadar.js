const RADAR_DATA_URL = "data/nhanes_2017_mar2020_sleep_merged_extended_clean_with_caffeine.csv";

const RADAR_METRICS = [
    { key: "stability", label: "Stability", accessor: stabilityScore },
    { key: "caffeine", label: "Caffeine", accessor: caffeineScore },
    { key: "sedentary", label: "Sedentary", accessor: sedentaryScore },
    { key: "activity", label: "Activity", accessor: activityScore },
    { key: "bmi", label: "BMI", accessor: bmiScore }
];

const RADAR_DIMENSIONS = [
    { key: "education", label: "Education" },
    { key: "income", label: "Income" }
];

/** NHANES-style education (DMDEDUC2) and poverty-category notes for cluster labels. */
const CLUSTER_LEVEL_NOTES = {
    education: {
        "1.0": "Less than 9th grade",
        "2.0": "9–11th grade (incl. 12th, no diploma)",
        "3.0": "High school graduate / GED or equivalent",
        "4.0": "Some college or AA degree",
        "5.0": "College graduate or above"
    },
    income: {
        "1.0": "Lowest income group (vs. poverty threshold)",
        "2.0": "Lower income group",
        "3.0": "Lower-middle income group",
        "4.0": "Upper-middle income group",
        "5.0": "Highest income group",
        "Below poverty": "Family income below federal poverty threshold",
        "Near poverty": "Just above poverty threshold",
        "Middle income": "Middle range vs. poverty threshold",
        "Higher income": "Highest income range in fallback groups"
    }
};

let radarRows = [];
let selectedDimension = "education";
const selectedGroupsByDimension = { education: null, income: null };

function clamp01(v) {
    return Math.max(0, Math.min(1, v));
}

function normalizeLowerBetter(value, good, bad) {
    if (!Number.isFinite(value)) return null;
    const t = (bad - value) / (bad - good);
    return clamp01(t) * 100;
}

function normalizeHigherBetter(value, low, high) {
    if (!Number.isFinite(value)) return null;
    const t = (value - low) / (high - low);
    return clamp01(t) * 100;
}

function parseHHMM(value) {
    if (!value) return null;
    const digits = String(value).replace(/\D/g, "");
    if (!digits) return null;
    const text = digits.padStart(4, "0");
    const hh = Number(text.slice(0, 2));
    const mm = Number(text.slice(2, 4));
    if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh > 23 || mm > 59) return null;
    return hh * 60 + mm;
}

function circularDiff(a, b) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const diff = Math.abs(a - b);
    return Math.min(diff, 1440 - diff);
}

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function cleanCategory(value) {
    if (value == null) return null;
    const text = String(value).trim();
    if (!text) return null;
    const lower = text.toLowerCase();
    if (lower === "nan" || lower === "na" || lower === "refused" || lower === "don't know" || lower === "dont know") {
        return null;
    }
    return text;
}

function incomeCluster(row) {
    const label = cleanCategory(row.family_monthly_poverty_category);
    if (label) return label;

    const idx = toNumber(row.family_monthly_poverty_index) ?? toNumber(row.family_poverty_income_ratio);
    if (!Number.isFinite(idx)) return null;
    if (idx < 1) return "Below poverty";
    if (idx < 2) return "Near poverty";
    if (idx < 4) return "Middle income";
    return "Higher income";
}

function activityMinutesPerWeek(row) {
    const mvw = toNumber(row.minutes_vigorous_work_per_day);
    const mmw = toNumber(row.minutes_moderate_work_per_day);
    const dvw = toNumber(row.days_vigorous_work_per_week);
    const dmw = toNumber(row.days_moderate_work_per_week);
    const mvr = toNumber(row.minutes_vigorous_recreation_per_day);
    const mmr = toNumber(row.minutes_moderate_recreation_per_day);
    const dvr = toNumber(row.days_vigorous_recreation_per_week);
    const dmr = toNumber(row.days_moderate_recreation_per_week);
    const walk = toNumber(row.minutes_walk_or_bike_transport_per_day);
    const walkDays = toNumber(row.days_walk_or_bike_transport_per_week);

    const pieces = [
        (mvw ?? 0) * (dvw ?? 0),
        (mmw ?? 0) * (dmw ?? 0),
        (mvr ?? 0) * (dvr ?? 0),
        (mmr ?? 0) * (dmr ?? 0),
        (walk ?? 0) * (walkDays ?? 0)
    ];

    if (pieces.every(v => v === 0)) return null;
    return pieces.reduce((sum, v) => sum + v, 0);
}

function stabilityScore(row) {
    const weekdaySleep = toNumber(row.sleep_hours_weekday);
    const weekendSleep = toNumber(row.sleep_hours_weekend);
    const weekdayBed = parseHHMM(row.usual_sleep_time_weekday_hhmm);
    const weekendBed = parseHHMM(row.usual_sleep_time_weekend_hhmm);
    const weekdayWake = parseHHMM(row.usual_wake_time_weekday_hhmm);
    const weekendWake = parseHHMM(row.usual_wake_time_weekend_hhmm);

    const durationShift = (Number.isFinite(weekdaySleep) && Number.isFinite(weekendSleep))
        ? Math.abs(weekendSleep - weekdaySleep) * 60
        : null;
    const bedShift = circularDiff(weekdayBed, weekendBed);
    const wakeShift = circularDiff(weekdayWake, weekendWake);

    const shifts = [durationShift, bedShift, wakeShift].filter(Number.isFinite);
    if (!shifts.length) return null;

    const avgShiftMinutes = d3.mean(shifts);
    return normalizeLowerBetter(avgShiftMinutes, 0, 240);
}

function bmiScore(row) {
    const bmi = toNumber(row.bmi);
    if (!Number.isFinite(bmi)) return null;
    const dist = Math.abs(bmi - 22);
    return normalizeLowerBetter(dist, 0, 15);
}

function caffeineScore(row) {
    return normalizeLowerBetter(toNumber(row.caffeine_mg_day1), 0, 400);
}

function sedentaryScore(row) {
    return normalizeLowerBetter(toNumber(row.minutes_sedentary_per_day), 240, 900);
}

function activityScore(row) {
    return normalizeHigherBetter(activityMinutesPerWeek(row), 0, 900);
}

function buildRadarRows(data) {
    return data.map(row => {
        const scores = {};
        RADAR_METRICS.forEach(metric => {
            scores[metric.key] = metric.accessor(row);
        });

        return {
            education: cleanCategory(row.education_level),
            income: incomeCluster(row),
            sleepHours: toNumber(row.sleep_hours_weekly_avg),
            scores
        };
    });
}

function buildClusterProfiles(rows, dimensionKey) {
    const grouped = d3.group(rows, row => row[dimensionKey]);
    const clusters = [];

    grouped.forEach((clusterRows, clusterName) => {
        if (!clusterName) return;

        const metrics = RADAR_METRICS.map(metric => {
            const values = clusterRows
                .map(row => row.scores[metric.key])
                .filter(Number.isFinite);

            return {
                key: metric.key,
                label: metric.label,
                value: values.length ? d3.mean(values) : 0,
                sample: values.length
            };
        });

        const sampleSize = d3.max(metrics, d => d.sample) || 0;
        if (sampleSize < 35) return;

        const sleepHourValues = clusterRows
            .map(row => row.sleepHours)
            .filter(Number.isFinite);
        const avgSleepHours = sleepHourValues.length ? d3.mean(sleepHourValues) : null;

        clusters.push({
            key: clusterName,
            label: clusterName,
            sample: sampleSize,
            avg: d3.mean(metrics, d => d.value),
            avgSleepHours,
            metrics
        });
    });

    if (dimensionKey === "income") {
        const incomeOrder = new Map([
            ["Below poverty", 0],
            ["Near poverty", 1],
            ["Middle income", 2],
            ["Higher income", 3]
        ]);

        return clusters.sort((a, b) => {
            const ai = incomeOrder.has(a.label) ? incomeOrder.get(a.label) : Number.POSITIVE_INFINITY;
            const bi = incomeOrder.has(b.label) ? incomeOrder.get(b.label) : Number.POSITIVE_INFINITY;
            if (ai !== bi) return ai - bi;
            return d3.ascending(a.label, b.label);
        });
    }

    const numericLabels = clusters.every(cluster => /^-?\d+(\.\d+)?$/.test(cluster.label));
    if (numericLabels) {
        return clusters.sort((a, b) => Number(a.label) - Number(b.label));
    }

    return clusters.sort((a, b) => d3.ascending(a.label, b.label));
}

function ensureRadarTooltip() {
    let tooltip = d3.select("#radar-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body")
            .append("div")
            .attr("id", "radar-tooltip")
            .attr("class", "radar-tooltip");
    }
    return tooltip;
}

function renderToggleButtons() {
    const wrap = d3.select("#radarClusterButtons");
    if (wrap.empty()) return;

    wrap.selectAll("button")
        .data(RADAR_DIMENSIONS)
        .join("button")
        .attr("type", "button")
        .attr("class", "age-btn radar-toggle-btn")
        .classed("active", d => d.key === selectedDimension)
        .text(d => d.label)
        .on("click", (_, d) => {
            selectedDimension = d.key;
            renderToggleButtons();
            renderRadar();
        });
}

function shortenLabel(label, maxLength = 22) {
    if (label.length <= maxLength) return label;
    return `${label.slice(0, maxLength - 1)}…`;
}

function normalizeLevelLookupKey(label) {
    if (label == null) return null;
    const s = String(label).trim();
    if (!s) return null;
    if (/^-?\d+(\.\d+)?$/.test(s)) {
        const n = Number(s);
        if (!Number.isFinite(n)) return s;
        return Number.isInteger(n) ? `${n}.0` : s;
    }
    return s;
}

function getClusterLevelNote(dimensionKey, label) {
    const map = CLUSTER_LEVEL_NOTES[dimensionKey];
    if (!map) return "";
    const key = normalizeLevelLookupKey(label);
    if (key && map[key]) return map[key];
    if (map[label]) return map[label];
    return "";
}

function clusterButtonTitle(dimensionKey, label) {
    const note = getClusterLevelNote(dimensionKey, label);
    if (!note) return label;
    return `${label} — ${note}`;
}

function renderGroupButtons(clusters) {
    const wrap = d3.select("#radarGroupButtons");
    if (wrap.empty()) return;

    const selectedGroups = selectedGroupsByDimension[selectedDimension];
    const options = [{ key: null, label: "All" }, ...clusters.map(d => ({ key: d.key, label: d.label }))];

    wrap.selectAll("button")
        .data(options, d => d.key ?? "__all__")
        .join("button")
        .attr("type", "button")
        .attr("class", "age-btn radar-group-btn")
        .classed("active", d => {
            if (d.key == null) return !selectedGroups || selectedGroups.size === 0;
            return !!selectedGroups?.has(d.key);
        })
        .attr("title", d => (d.key == null ? d.label : clusterButtonTitle(selectedDimension, d.label)))
        .text(d => shortenLabel(d.label))
        .on("click", (_, d) => {
            if (d.key == null) {
                selectedGroupsByDimension[selectedDimension] = null;
                renderRadar();
                return;
            }

            let nextSet = selectedGroupsByDimension[selectedDimension];
            if (!nextSet) {
                nextSet = new Set();
            } else {
                nextSet = new Set(nextSet);
            }

            if (nextSet.has(d.key)) {
                nextSet.delete(d.key);
            } else {
                nextSet.add(d.key);
            }

            selectedGroupsByDimension[selectedDimension] = nextSet.size ? nextSet : null;
            renderRadar();
        });
}

function renderLegend(clusters, color) {
    const legend = d3.select("#radarClusterLegend");
    if (legend.empty()) return;

    const items = legend.selectAll(".radar-legend-item")
        .data(clusters, d => d.key);

    items.join(
        enter => {
            const row = enter.append("div").attr("class", "radar-legend-item");
            row.append("span").attr("class", "radar-legend-swatch");
            const text = row.append("span").attr("class", "radar-legend-text");
            text.append("span").attr("class", "radar-legend-line");
            text.append("span").attr("class", "radar-legend-note");
            return row;
        },
        update => update,
        exit => exit.remove()
    );

    legend.selectAll(".radar-legend-swatch")
        .style("background-color", d => color(d.key));

    legend.selectAll(".radar-legend-line")
        .text(d => `${d.label} (n=${d.sample})`);

    legend.selectAll(".radar-legend-note")
        .text(d => getClusterLevelNote(selectedDimension, d.label))
        .style("display", d => (getClusterLevelNote(selectedDimension, d.label) ? null : "none"));
}

function renderRadar() {
    const svg = d3.select("#sleep-radar-chart");
    if (svg.empty()) return;

    const allClusters = buildClusterProfiles(radarRows, selectedDimension);
    const selectedGroups = selectedGroupsByDimension[selectedDimension];
    const validSet = selectedGroups
        ? new Set([...selectedGroups].filter(key => allClusters.some(cluster => cluster.key === key)))
        : null;
    selectedGroupsByDimension[selectedDimension] = validSet && validSet.size ? validSet : null;

    renderGroupButtons(allClusters);

    const clusters = selectedGroupsByDimension[selectedDimension]
        ? allClusters.filter(cluster => selectedGroupsByDimension[selectedDimension].has(cluster.key))
        : allClusters;
    const tooltip = ensureRadarTooltip();

    const width = 980;
    const height = 560;
    const margin = { top: 60, right: 220, bottom: 60, left: 120 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const radius = Math.min(innerW, innerH) / 2;
    const cx = margin.left + innerW / 2;
    const cy = margin.top + innerH / 2;
    const levels = [20, 40, 60, 80, 100];

    const color = d3.scaleOrdinal()
        .domain(allClusters.map(d => d.key))
        .range(["#4f86f7", "#3ab0a2", "#f29e4c", "#e56b6f", "#9d79d6", "#6c9f4f"]);

    renderLegend(allClusters, color);

    svg.attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();

    if (!clusters.length) {
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("class", "radar-axis-label")
            .text("No cluster has enough rows for this view");
        return;
    }

    const group = svg.append("g");
    const angleStep = (Math.PI * 2) / RADAR_METRICS.length;
    const radialScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

    function pointFor(i, value) {
        const angle = (Math.PI / 2) + (i * angleStep);
        const r = radialScale(value);
        return [cx + (Math.cos(angle) * r), cy - (Math.sin(angle) * r)];
    }

    levels.forEach(level => {
        const ring = RADAR_METRICS.map((_, i) => pointFor(i, level));
        ring.push(ring[0]);
        group.append("path")
            .attr("class", `radar-grid ${level === 100 ? "outer" : ""}`.trim())
            .attr("d", d3.line()(ring));
    });

    RADAR_METRICS.forEach((metric, i) => {
        const end = pointFor(i, 100);
        const labelPos = pointFor(i, 113);

        group.append("line")
            .attr("class", "radar-axis")
            .attr("x1", cx)
            .attr("y1", cy)
            .attr("x2", end[0])
            .attr("y2", end[1]);

        group.append("text")
            .attr("class", "radar-axis-label")
            .attr("x", labelPos[0])
            .attr("y", labelPos[1])
            .attr("text-anchor", labelPos[0] > cx + 12 ? "start" : (labelPos[0] < cx - 12 ? "end" : "middle"))
            .attr("dominant-baseline", labelPos[1] > cy + 12 ? "hanging" : (labelPos[1] < cy - 12 ? "auto" : "middle"))
            .text(metric.label);
    });

    levels.forEach(level => {
        const pos = pointFor(0, level);
        group.append("text")
            .attr("class", "radar-level-label")
            .attr("x", pos[0] + 8)
            .attr("y", pos[1] - 2)
            .text(level);
    });

    const lineGenerator = d3.line().x(d => d.x).y(d => d.y);
    const series = group.selectAll(".radar-series")
        .data(clusters, d => d.key)
        .join("g")
        .attr("class", "radar-series");

    function focusCluster(key) {
        series.classed("dimmed", d => d.key !== key);
        series.classed("focused", d => d.key === key);
    }

    function clearFocus() {
        series.classed("dimmed", false).classed("focused", false);
        tooltip.style("opacity", 0);
    }

    series.each(function (cluster) {
        const layer = d3.select(this);
        const points = cluster.metrics.map((metric, i) => {
            const [x, y] = pointFor(i, metric.value);
            return { ...metric, x, y };
        });

        const fillColor = d3.color(color(cluster.key));
        fillColor.opacity = 0.24;

        layer.append("path")
            .attr("class", "radar-area")
            .attr("fill", fillColor.toString())
            .attr("stroke", color(cluster.key))
            .datum([...points, points[0]])
            .attr("d", lineGenerator)
            .on("mousemove", (event) => {
                focusCluster(cluster.key);
                const sleepText = Number.isFinite(cluster.avgSleepHours)
                    ? `${cluster.avgSleepHours.toFixed(2)} hrs`
                    : "N/A";
                const noteHtml = getClusterLevelNote(selectedDimension, cluster.label);
                tooltip
                    .style("opacity", 1)
                    .html(`
                        <div><strong>Cluster: ${cluster.label}</strong></div>
                        ${noteHtml ? `<div>${noteHtml}</div>` : ""}
                        <div>Sleep hours: ${sleepText}</div>
                    `)
                    .style("left", `${event.pageX + 14}px`)
                    .style("top", `${event.pageY - 16}px`);
            })
            .on("mouseleave", clearFocus);

        layer.selectAll(".radar-point")
            .data(points)
            .join("circle")
            .attr("class", "radar-point")
            .attr("fill", color(cluster.key))
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", 4.5)
            .on("mousemove", (event, d) => {
                focusCluster(cluster.key);
                tooltip
                    .style("opacity", 1)
                    .html(`
                        <div><strong>Cluster: ${cluster.label}</strong></div>
                        <div><strong>${d.label}:</strong> ${Math.round(d.value)}/100</div>
                    `)
                    .style("left", `${event.pageX + 14}px`)
                    .style("top", `${event.pageY - 16}px`);
            })
            .on("mouseleave", clearFocus);
    });
}

d3.csv(RADAR_DATA_URL).then(data => {
    radarRows = buildRadarRows(data);
    renderToggleButtons();
    renderRadar();
});
