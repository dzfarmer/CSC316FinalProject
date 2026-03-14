(function initCartoonClock() {
    const root = document.getElementById("cartoon-clock-viz");
    if (!root || typeof d3 === "undefined") return;

    const width = 280;
    const height = 280;
    const radius = width / 2 - 36;
    const cornerRadius = 18;
    const angleScale = d3.scaleLinear().domain([0, 24]).range([0, Math.PI * 2]);
    const colorScale = d3.scaleSequential(d3.interpolateRdYlBu).domain([0.35, 0.15]);
    let tooltipNode = root.querySelector(".cc-tooltip");
    if (!tooltipNode) {
        tooltipNode = document.createElement("div");
        tooltipNode.className = "cc-tooltip";
        root.appendChild(tooltipNode);
    }
    const tooltip = d3.select(tooltipNode);

    function spawnBackground() {
        const clouds = root.querySelector(".cc-clouds");
        const stars = root.querySelector(".cc-stars");
        if (!clouds || !stars) return;
        clouds.innerHTML = "";
        stars.innerHTML = "";

        for (let i = 0; i < 4; i += 1) {
            const cloud = document.createElement("div");
            cloud.style.position = "absolute";
            cloud.style.width = `${90 + Math.random() * 120}px`;
            cloud.style.height = `${32 + Math.random() * 28}px`;
            cloud.style.left = `${Math.random() * 88}%`;
            cloud.style.top = `${Math.random() * 34}%`;
            cloud.style.opacity = "0.1";
            cloud.style.background = "#fff";
            cloud.style.borderRadius = "999px";
            clouds.appendChild(cloud);
        }

        for (let i = 0; i < 14; i += 1) {
            const star = document.createElement("div");
            star.textContent = "✦";
            star.style.position = "absolute";
            star.style.left = `${Math.random() * 96}%`;
            star.style.top = `${Math.random() * 30}%`;
            star.style.color = "#f1c40f";
            star.style.opacity = "0.4";
            star.style.fontSize = `${10 + Math.random() * 10}px`;
            stars.appendChild(star);
        }
    }

    function parseTime(value) {
        if (!value) return null;
        const text = String(value).replace(/[b']/g, "").trim();
        const parts = text.split(":");
        if (parts.length !== 2) return null;
        const hh = Number(parts[0]);
        const mm = Number(parts[1]);
        if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
        return hh + (mm / 60);
    }

    function getTimeDiff(t1, t2) {
        let diff = t2 - t1;
        if (diff > 12) diff -= 24;
        if (diff < -12) diff += 24;
        return diff;
    }

    function formatTimeDiff(hours) {
        const sign = hours >= 0 ? "+" : "-";
        const h = Math.floor(Math.abs(hours));
        const m = Math.round((Math.abs(hours) % 1) * 60);
        if (h === 0 && m === 0) return "Same";
        return `${sign}${h}h ${m}m`;
    }

    function sleepCategory(row) {
        const weekday = Number(row.sleep_hours_weekday);
        const weekend = Number(row.sleep_hours_weekend);
        if (!Number.isFinite(weekday) || !Number.isFinite(weekend)) return null;
        const diff = weekend - weekday;
        if (Math.abs(diff) <= 1) return "stable";
        if (diff > 1) return "weekend_sleeper";
        return "weekday_sleeper";
    }

    function initClock(container) {
        d3.select(container).selectAll("*").remove();
        const svg = d3.select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);

        svg.append("circle").attr("r", radius).attr("class", "cc-clock-circle");

        d3.range(0, 24).forEach(hour => {
            const angle = angleScale(hour) - Math.PI / 2;
            const isMajor = hour % 6 === 0;
            svg.append("line")
                .attr("class", "cc-clock-tick")
                .attr("x1", Math.cos(angle) * radius)
                .attr("y1", Math.sin(angle) * radius)
                .attr("x2", Math.cos(angle) * (radius - (isMajor ? 10 : 6)))
                .attr("y2", Math.sin(angle) * (radius - (isMajor ? 10 : 6)));

            if (isMajor || hour % 2 === 0) {
                svg.append("text")
                    .attr("class", "cc-clock-num")
                    .attr("x", Math.cos(angle) * (radius + 14))
                    .attr("y", Math.sin(angle) * (radius + 14))
                    .text(hour);
            }
        });

        return svg.append("g").attr("class", "cc-data-layer");
    }

    function createLegend() {
        const legendEl = root.querySelector(".cc-legend");
        d3.select(legendEl).selectAll("*").remove();

        const legendWidth = 240;
        const legendHeight = 14;
        const svg = d3.select(legendEl).append("svg").attr("width", 280).attr("height", 46);
        const defs = svg.append("defs");
        const gradient = defs.append("linearGradient")
            .attr("id", "cc-legend-grad")
            .attr("x1", "0%")
            .attr("x2", "100%");

        for (let i = 0; i <= 10; i += 1) {
            const t = i / 10;
            const v = 0.2 + (0.1 * t);
            gradient.append("stop")
                .attr("offset", `${t * 100}%`)
                .attr("stop-color", colorScale(v));
        }

        svg.append("rect")
            .attr("x", 20)
            .attr("y", 0)
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .attr("rx", 999)
            .attr("fill", "url(#cc-legend-grad)")
            .attr("stroke", "#000")
            .attr("stroke-width", 2);

        const scale = d3.scaleLinear().domain([0.2, 0.3]).range([0, legendWidth]);
        svg.append("g")
            .attr("class", "cc-legend-axis")
            .attr("transform", `translate(20, ${legendHeight + 6})`)
            .call(d3.axisBottom(scale).ticks(5).tickFormat(d => `${Math.round(d * 100)}%`));
    }

    function setIndicator(id, text, cls) {
        const el = root.querySelector(id);
        if (!el) return;
        el.textContent = text;
        el.className = `cc-indicator ${cls}`;
    }

    function updateStats(metrics, rows) {
        const weekday = metrics[0];
        const weekend = metrics[1];
        if (!weekday || !weekend) return;

        const bedtimeDiff = getTimeDiff(weekday.start, weekend.start);
        root.querySelector("#cc-stat-bedtime").textContent = formatTimeDiff(bedtimeDiff);
        if (Math.abs(bedtimeDiff) < 0.5) setIndicator("#cc-ind-bedtime", "Same-ish", "cc-ind-neutral");
        else if (bedtimeDiff > 0) setIndicator("#cc-ind-bedtime", "Later", "cc-ind-red");
        else setIndicator("#cc-ind-bedtime", "Earlier", "cc-ind-green");

        const wakeDiff = getTimeDiff(weekday.end, weekend.end);
        root.querySelector("#cc-stat-wake").textContent = formatTimeDiff(wakeDiff);
        if (Math.abs(wakeDiff) < 0.5) setIndicator("#cc-ind-wake", "Same-ish", "cc-ind-neutral");
        else if (wakeDiff > 0) setIndicator("#cc-ind-wake", "Sleeping in", "cc-ind-red");
        else setIndicator("#cc-ind-wake", "Up early", "cc-ind-green");

        const durWkday = (weekday.end < weekday.start ? weekday.end + 24 : weekday.end) - weekday.start;
        const durWkend = (weekend.end < weekend.start ? weekend.end + 24 : weekend.end) - weekend.start;
        const durDiff = durWkend - durWkday;
        root.querySelector("#cc-stat-duration").textContent = formatTimeDiff(durDiff);
        if (Math.abs(durDiff) < 0.5) setIndicator("#cc-ind-duration", "Equal", "cc-ind-neutral");
        else if (durDiff > 0) setIndicator("#cc-ind-duration", "Catch-up", "cc-ind-green");
        else setIndicator("#cc-ind-duration", "Less", "cc-ind-red");

        const avgCaffeine = d3.mean(rows, d => Number(d.caffeine_mg_day1) || 0) || 0;
        root.querySelector("#cc-stat-caffeine").textContent = Math.round(avgCaffeine);
        const avgSnore = d3.mean(rows, d => Number(d.snore_frequency) || 0);
        root.querySelector("#cc-stat-snore").textContent = Number.isFinite(avgSnore) ? avgSnore.toFixed(1) : "--";
        const avgSedentary = d3.mean(rows, d => Number(d.minutes_sedentary_per_day) || 0) || 0;
        root.querySelector("#cc-stat-sedentary").textContent = Math.round(avgSedentary);
    }

    function showTooltip(event, html) {
        const rect = root.getBoundingClientRect();
        tooltip.style("opacity", 1)
            .html(html)
            .style("left", `${event.clientX - rect.left + 12}px`)
            .style("top", `${event.clientY - rect.top + 12}px`);
    }

    spawnBackground();
    createLegend();

    const gWeekday = initClock(root.querySelector(".cc-chart-weekday"));
    const gWeekend = initClock(root.querySelector(".cc-chart-weekend"));

    d3.csv("data/nhanes_2017_mar2020_sleep_merged_extended_clean_with_caffeine.csv").then(data => {
        data.forEach(d => { d.ccCategory = sleepCategory(d); });

        function updateViz(groupId) {
            const filtered = groupId === "all" ? data : data.filter(d => d.ccCategory === groupId);

            const metrics = ["weekday", "weekend"].map(type => {
                const sCol = `usual_sleep_time_${type}_hhmm`;
                const wCol = `usual_wake_time_${type}_hhmm`;
                const valid = filtered.filter(d => d[sCol] && d[wCol]);
                if (!valid.length) return null;

                const processTime = t => t < 12 ? t + 24 : t;
                const avgStart = d3.mean(valid, d => processTime(parseTime(d[sCol])));
                const avgEnd = d3.mean(valid, d => processTime(parseTime(d[wCol])));
                const troubleRate = d3.mean(valid, d => Number(d.told_doctor_trouble_sleeping) === 1 ? 1 : 0);

                return { type, start: avgStart % 24, end: avgEnd % 24, rate: troubleRate };
            });

            updateStats(metrics, filtered);

            function draw(selection, datum) {
                selection.selectAll(".cc-sector").remove();
                if (!datum) return;

                const arc = d3.arc()
                    .innerRadius(0)
                    .outerRadius(radius - 10)
                    .cornerRadius(cornerRadius)
                    .startAngle(angleScale(datum.start))
                    .endAngle(() => {
                        let end = angleScale(datum.end);
                        if (datum.end < datum.start) end += 2 * Math.PI;
                        return end;
                    });

                selection.append("path")
                    .attr("class", "cc-sector")
                    .attr("fill", colorScale(datum.rate))
                    .attr("d", arc)
                    .on("mousemove", event => {
                        const fmt = t => `${Math.floor(t)}:${Math.round((t % 1) * 60).toString().padStart(2, "0")}`;
                        const duration = (datum.end < datum.start ? datum.end + 24 : datum.end) - datum.start;
                        showTooltip(event, `
                            <div><strong>${datum.type.toUpperCase()}</strong></div>
                            <div>${fmt(datum.start)} - ${fmt(datum.end)}</div>
                            <div>${duration.toFixed(1)} hrs</div>
                            <div>Rate: ${(datum.rate * 100).toFixed(1)}%</div>
                        `);
                    })
                    .on("mouseleave", () => tooltip.style("opacity", 0));
            }

            draw(gWeekday, metrics[0]);
            draw(gWeekend, metrics[1]);
        }

        root.querySelectorAll(".cc-toggle-btn").forEach(button => {
            button.addEventListener("click", () => {
                root.querySelectorAll(".cc-toggle-btn").forEach(b => b.classList.remove("active"));
                button.classList.add("active");
                updateViz(button.getAttribute("data-val"));
            });
        });

        updateViz("all");
    });
}());
