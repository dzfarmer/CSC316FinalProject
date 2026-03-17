const DATA_URL = "data/nhanes_2017_mar2020_sleep_merged_extended_clean_with_caffeine.csv";

// ========= bin rules =========
function sleepBin(h) {
    if (h < 7) return "short";
    if (h <= 9) return "normal";
    return "long";
}

function caffeineBin(mg) {
    if (mg <= 0) return "0";
    if (mg <= 100) return "low";
    if (mg <= 200) return "mid";
    return "high";
}

function ageBin(a) {
    if (a < 30) return "20–29";
    if (a < 40) return "30–39";
    return "40–50";
}

// trouble: 1 = Yes, 2 = No
function trouble01(v) {
    return v === 1 ? 1 : 0;
}

// ========= svg =========
const svg = d3.select("#chart");
const width = +svg.attr("width");
const height = +svg.attr("height");

const margin = { top: 40, right: 40, bottom: 120, left: 110 };
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const xCats = ["0", "low", "mid", "high"];
const yCats = ["long", "normal", "short"];

const x = d3.scaleBand()
    .domain(xCats)
    .range([0, innerW])
    .padding(0.08);

const y = d3.scaleBand()
    .domain(yCats)
    .range([0, innerH])
    .padding(0.08);

const heatColors = [
    "#f6f2b8",
    "#edd57a",
    "#e7ad52",
    "#df7a3c",
    "#cf4d33",
    "#b4282f"
];

const color = d3.scaleLinear()
    .domain([0, 0.12, 0.24, 0.36, 0.48, 0.60])
    .range(heatColors)
    .clamp(true);

// ========= axes =========
const xAxis = g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x));

const yAxis = g.append("g")
    .call(d3.axisLeft(y));

xAxis.selectAll("text").attr("class", "axis-text");
yAxis.selectAll("text").attr("class", "axis-text");
xAxis.selectAll("path,line").attr("class", "axis-line");
yAxis.selectAll("path,line").attr("class", "axis-line");

g.append("text")
    .attr("class", "axis-label")
    .attr("x", innerW / 2)
    .attr("y", innerH + 66)
    .attr("text-anchor", "middle")
    .text("Caffeine level");

g.append("text")
    .attr("class", "axis-label")
    .attr("x", -innerH / 2)
    .attr("y", -90)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Sleep time");

// ========= legend =========
const legendWidth = 300;
const legendHeight = 16;
const legendX = 16;
const legendY = height - 52;

const defs = svg.append("defs");

const gradient = defs.append("linearGradient")
    .attr("id", "cute-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "0%");

    [
        [0.00, "#f6f2b8"],
        [0.20, "#edd57a"],
        [0.40, "#e7ad52"],
        [0.60, "#df7a3c"],
        [0.80, "#cf4d33"],
        [1.00, "#b4282f"]
    ].forEach(([t, c]) => {
        gradient.append("stop")
            .attr("offset", `${t * 100}%`)
            .attr("stop-color", c);
    });


const legendGroup = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${legendX},${legendY})`);

legendGroup.append("text")
    .attr("class", "legend-title")
    .attr("x", 0)
    .attr("y", -10)
    .text("🌼 Sleep trouble rate (%)");

legendGroup.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("rx", 999)
    .attr("fill", "url(#cute-gradient)");

const legendScale = d3.scaleLinear()
    .domain([0, 0.60])
    .range([0, legendWidth]);

legendGroup.append("g")
    .attr("transform", `translate(0,${legendHeight})`)
    .call(
        d3.axisBottom(legendScale)
            .ticks(5)
            .tickFormat(d => `${Math.round(d * 100)}%`)
    )
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("text").attr("class", "legend-tick"))
    .call(g => g.selectAll("line").attr("class", "legend-line"));

// ========= tooltip =========
let tooltip = d3.select("#heatmap-tooltip");

if (tooltip.empty()) {
    tooltip = d3.select("body")
        .append("div")
        .attr("id", "heatmap-tooltip")
        .attr("class", "heatmap-tooltip");
}

// ========= data =========
d3.csv(DATA_URL, d => ({
    ageGroup: ageBin(+d.age_years),
    sleepCat: sleepBin(+d.sleep_hours_weekly_avg),
    cafCat: caffeineBin(+d.caffeine_mg_day1),
    trouble: trouble01(+d.told_doctor_trouble_sleeping)
})).then(data => {

    data = data.filter(d => d.ageGroup && d.sleepCat && d.cafCat);

    const ageGroups = [...new Set(data.map(d => d.ageGroup))];

    // ========= age buttons =========
    const buttonWrap = d3.select("#ageButtons");

    buttonWrap.selectAll("button")
        .data(["All", ...ageGroups])
        .join("button")
        .attr("type", "button")
        .attr("class", "age-btn")
        .classed("active", d => d === "All")
        .text(d => d)
        .on("click", function (event, d) {
            const clicked = d3.select(this);

            if (d === "All") {
                buttonWrap.selectAll(".age-btn").classed("active", false);
                clicked.classed("active", true);
            } else {
                buttonWrap.selectAll(".age-btn")
                    .filter(v => v === "All")
                    .classed("active", false);

                clicked.classed("active", !clicked.classed("active"));

                const activeNonAll = buttonWrap.selectAll(".age-btn.active")
                    .filter(v => v !== "All")
                    .nodes()
                    .length;

                if (activeNonAll === 0) {
                    buttonWrap.selectAll(".age-btn")
                        .filter(v => v === "All")
                        .classed("active", true);
                }
            }

            render();
        });

    function getSelectedAges() {
        const active = [];
        buttonWrap.selectAll(".age-btn.active").each(function (d) {
            active.push(d);
        });

        if (active.includes("All")) return null;
        return new Set(active);
    }

    function aggregate(filtered) {
        const map = d3.rollup(
            filtered,
            v => ({
                n: v.length,
                rate: d3.mean(v, d => d.trouble)
            }),
            d => d.sleepCat,
            d => d.cafCat
        );

        const cells = [];
        yCats.forEach(yKey => {
            xCats.forEach(xKey => {
                const val = map.get(yKey)?.get(xKey);
                cells.push({
                    sleepCat: yKey,
                    cafCat: xKey,
                    n: val ? val.n : 0,
                    rate: val ? val.rate : 0
                });
            });
        });
        return cells;
    }

    function render() {
        const ages = getSelectedAges();
        const filtered = ages ? data.filter(d => ages.has(d.ageGroup)) : data;
        const cells = aggregate(filtered);

        const rects = g.selectAll(".cell")
            .data(cells, d => d.sleepCat + d.cafCat);

        rects.join(
            enter => enter.append("rect")
                .attr("class", "cell")
                .attr("x", d => x(d.cafCat))
                .attr("y", d => y(d.sleepCat))
                .attr("width", x.bandwidth())
                .attr("height", y.bandwidth())
                .attr("rx", 18)
                .attr("fill", d => color(d.rate))
                .on("mousemove", function (event, d) {
                    tooltip
                        .style("opacity", 1)
                        .html(`
                          <div><strong>Sleep:</strong> ${d.sleepCat}</div>
                          <div><strong>Caffeine:</strong> ${d.cafCat}</div>
                          <div><strong>Sample size:</strong> n = ${d.n}</div>
                          <div><strong>Trouble rate:</strong> ${(d.rate * 100).toFixed(1)}%</div>
                        `)
                        .style("left", `${event.pageX + 14}px`)
                        .style("top", `${event.pageY - 18}px`);
                })
                .on("mouseleave", function () {
                    tooltip.style("opacity", 0);
                }),
            update => update
                .transition()
                .duration(350)
                .attr("fill", d => color(d.rate))
        );

        const labels = g.selectAll(".label")
            .data(cells, d => d.sleepCat + d.cafCat);

        labels.join(
            enter => enter.append("text")
                .attr("class", "label")
                .attr("x", d => x(d.cafCat) + x.bandwidth() / 2)
                .attr("y", d => y(d.sleepCat) + y.bandwidth() / 2)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .text(d => `n=${d.n}`),
            update => update
                .text(d => `n=${d.n}`)
        );
    }

    render();
});