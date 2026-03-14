(function initSeesaw() {
    const root = document.getElementById("seesaw-viz");
    if (!root || typeof d3 === "undefined") return;

    const DATA_PATH = "project.csv";
    const buckets = [
        { key: "short", label: "Short (<7h)", color: "#ff8a80" },
        { key: "just", label: "Just right (7-9h)", color: "#81c784" },
        { key: "long", label: "Long (>9h)", color: "#64b5f6" }
    ];
    const bmiCats = [
        { key: "Healthy", test: b => b >= 18.5 && b < 25 },
        { key: "Overweight", test: b => b >= 25 && b < 30 },
        { key: "Obese", test: b => b >= 30 }
    ];

    let activeBuckets = new Set(buckets.map(b => b.key));
    let lockedRow = null;
    let raw = [];

    const margin = { top: 26, right: 26, bottom: 52, left: 150 };
    const width = 920;
    const height = 320;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const chartRoot = d3.select(root.querySelector(".ss-chart"));
    const svg = chartRoot.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("height", "auto");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
    const y = d3.scaleBand().domain(bmiCats.map(c => c.key)).range([0, innerH]).padding(0.32);
    const tooltip = d3.select(root.querySelector(".ss-tooltip"));

    const xAxis = d3.axisBottom(x).ticks(5).tickFormat(d3.format(".0%"));
    g.append("g")
        .attr("class", "ss-axis")
        .attr("transform", `translate(0,${innerH})`)
        .call(xAxis);

    g.append("text")
        .attr("x", innerW / 2)
        .attr("y", innerH + 40)
        .attr("text-anchor", "middle")
        .attr("fill", "#6b4226")
        .attr("font-size", 14)
        .attr("font-weight", 800)
        .text("Percentage within BMI group");

    function getPillowPath(x0, y0, w, h) {
        if (w <= 0 || !Number.isFinite(w)) return "";
        const r = h * 0.32;
        const bulge = h * 0.14;
        return `
          M ${x0 + r}, ${y0}
          Q ${x0 + w / 2}, ${y0 - bulge} ${x0 + w - r}, ${y0}
          Q ${x0 + w + bulge * 0.45}, ${y0 + h / 2} ${x0 + w}, ${y0 + h - r}
          Q ${x0 + w / 2}, ${y0 + h + bulge} ${x0 + r}, ${y0 + h}
          Q ${x0 - bulge * 0.45}, ${y0 + h / 2} ${x0}, ${y0 + r}
          Q ${x0}, ${y0} ${x0 + r}, ${y0}
          Z
        `;
    }

    function bmiCategory(bmi) {
        if (!Number.isFinite(bmi)) return null;
        for (const cat of bmiCats) {
            if (cat.test(bmi)) return cat.key;
        }
        return null;
    }

    function sleepBucket(hours) {
        if (!Number.isFinite(hours)) return null;
        if (hours < 7) return "short";
        if (hours <= 9) return "just";
        return "long";
    }

    function applyFilters(rows) {
        const sleepMeasure = root.querySelector(".ss-sleep-measure").value;
        const sex = root.querySelector(".ss-sex-filter").value;
        const pov = root.querySelector(".ss-pov-filter").value;

        return rows
            .map(d => {
                const bmi = Number(d.bmi);
                const sleep = Number(d[sleepMeasure]);
                return {
                    ...d,
                    bmiCat: bmiCategory(bmi),
                    bucket: sleepBucket(sleep)
                };
            })
            .filter(d => d.bmiCat && d.bucket)
            .filter(d => sex === "all" ? true : String(Number(d.sex)) === sex)
            .filter(d => {
                if (pov === "all") return true;
                const val = Number(d.family_monthly_poverty_category);
                return Number.isFinite(val) && String(val) === pov;
            });
    }

    function summarize(rows) {
        const counts = d3.rollup(rows, v => v.length, d => d.bmiCat, d => d.bucket);
        const totals = d3.rollup(rows, v => v.length, d => d.bmiCat);
        return bmiCats.map(cat => {
            const n = totals.get(cat.key) || 0;
            const out = { bmiCat: cat.key, n };
            buckets.forEach(bucket => {
                const count = counts.get(cat.key)?.get(bucket.key) || 0;
                out[bucket.key] = n ? count / n : 0;
                out[`${bucket.key}_n`] = count;
            });
            return out;
        });
    }

    function renderLegend() {
        const wrap = d3.select(root.querySelector(".ss-legend"));
        wrap.selectAll("*").remove();
        const item = wrap.selectAll(".ss-leg-item")
            .data(buckets)
            .enter()
            .append("div")
            .attr("class", "ss-leg-item")
            .style("opacity", d => activeBuckets.has(d.key) ? 1 : 0.45)
            .on("click", (_, d) => {
                if (activeBuckets.has(d.key)) activeBuckets.delete(d.key);
                else activeBuckets.add(d.key);
                update();
            });

        item.append("span")
            .attr("class", "ss-swatch")
            .style("background-color", d => d.color);
        item.append("span").text(d => d.label);
    }

    function showTip(html, xPos, yPos) {
        tooltip.html(html).style("transform", `translate(${xPos + 14}px, ${yPos + 14}px)`);
    }

    function hideTip() {
        tooltip.style("transform", "translate(-9999px, -9999px)");
    }

    function update() {
        renderLegend();
        const filtered = applyFilters(raw);
        const rows = summarize(filtered);
        const keys = buckets.map(b => b.key).filter(k => activeBuckets.has(k));
        const series = d3.stack().keys(keys)(rows);

        const rowGroup = g.selectAll("g.ss-row")
            .data(rows, d => d.bmiCat);

        const rowEnter = rowGroup.enter()
            .append("g")
            .attr("class", "ss-row")
            .style("cursor", "pointer")
            .on("click", (_, d) => {
                lockedRow = lockedRow === d.bmiCat ? null : d.bmiCat;
                update();
            });

        rowEnter.append("text")
            .attr("class", "ss-row-label")
            .attr("x", -12)
            .attr("y", y.bandwidth() / 2)
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "middle")
            .text(d => d.bmiCat);

        rowGroup.merge(rowEnter)
            .attr("transform", d => `translate(0,${y(d.bmiCat)})`)
            .style("opacity", d => lockedRow && d.bmiCat !== lockedRow ? 0.3 : 1);

        rowGroup.exit().remove();

        const layers = g.selectAll("g.ss-layer")
            .data(series, s => s.key);

        layers.enter()
            .append("g")
            .attr("class", "ss-layer")
            .merge(layers)
            .attr("fill", s => buckets.find(b => b.key === s.key).color);

        layers.exit().remove();

        const pillows = g.selectAll("g.ss-layer").selectAll("path.ss-segment")
            .data(s => s.map(v => ({ key: s.key, v })), d => d.v.data.bmiCat);

        pillows.enter()
            .append("path")
            .attr("class", "ss-segment")
            .merge(pillows)
            .attr("d", d => {
                const x0 = x(d.v[0]);
                const x1 = x(d.v[1]);
                const widthPx = Math.max(0, x1 - x0);
                const pad = widthPx > 6 ? 1.5 : 0;
                return getPillowPath(x0 + pad, y(d.v.data.bmiCat), Math.max(0, widthPx - pad * 2), y.bandwidth());
            })
            .style("stroke", "#8c5e35")
            .style("stroke-width", 2.6)
            .style("opacity", d => lockedRow && d.v.data.bmiCat !== lockedRow ? 0.3 : 1)
            .on("mousemove", (event, d) => {
                const pct = d.v.data[d.key];
                const n = d.v.data[`${d.key}_n`];
                const total = d.v.data.n;
                const label = buckets.find(b => b.key === d.key).label;
                showTip(
                    `<div><strong>${d.v.data.bmiCat}</strong></div><div>${label}</div><div>${d3.format(".1%")(pct)} (${n}/${total})</div>`,
                    event.clientX,
                    event.clientY
                );
            })
            .on("mouseleave", hideTip);

        pillows.exit().remove();

        const texts = g.selectAll("g.ss-layer").selectAll("text.ss-pct-text")
            .data(s => s.map(v => ({ key: s.key, v })), d => d.v.data.bmiCat);

        texts.enter()
            .append("text")
            .attr("class", "ss-pct-text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .merge(texts)
            .attr("x", d => (x(d.v[0]) + x(d.v[1])) / 2)
            .attr("y", d => y(d.v.data.bmiCat) + y.bandwidth() / 2)
            .text(d => (x(d.v[1]) - x(d.v[0]) < 52 ? "" : d3.format(".1%")(d.v.data[d.key])))
            .style("opacity", d => lockedRow && d.v.data.bmiCat !== lockedRow ? 0.18 : 1);

        texts.exit().remove();
    }

    root.querySelector(".ss-sleep-measure").addEventListener("change", update);
    root.querySelector(".ss-sex-filter").addEventListener("change", update);
    root.querySelector(".ss-pov-filter").addEventListener("change", update);
    root.querySelector(".ss-reset-lock").addEventListener("click", () => {
        lockedRow = null;
        update();
    });

    d3.csv(DATA_PATH, d3.autoType).then(data => {
        raw = data;
        update();
    }).catch(() => {
        chartRoot.append("div").text("Failed to load seesaw data.");
    });
}());
