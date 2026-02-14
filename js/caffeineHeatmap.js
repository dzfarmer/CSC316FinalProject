const DATA_URL = "data/nhanes.csv";

// ========= 分箱规则 =========

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

// trouble: 1=Yes, 2=No
function trouble01(v) {
    return v === 1 ? 1 : 0;
}

// ========= SVG =========

const svg = d3.select("#chart");
const width = +svg.attr("width");
const height = +svg.attr("height");

const margin = {top:40,right:40,bottom:120,left:110};
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const xCats = ["0","low","mid","high"];
const yCats = ["long","normal","short"];

const x = d3.scaleBand().domain(xCats).range([0,innerW]).padding(0.08);
const y = d3.scaleBand().domain(yCats).range([0,innerH]).padding(0.08);

const color = d3.scaleSequential(d3.interpolateYlOrRd).domain([0,1]);

g.append("g")
    .attr("transform",`translate(0,${innerH})`)
    .call(d3.axisBottom(x));

g.append("g")
    .call(d3.axisLeft(y));

// =========================
// Cute Legend
// =========================
const legendWidth = 300;
const legendHeight = 14;

const legendX = 200;   // 调位置
const legendY = height - 22;

const defs = svg.append("defs");

const gradient = defs.append("linearGradient")
    .attr("id", "cute-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "0%");

d3.range(0, 1.01, 0.1).forEach(t => {
    gradient.append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", d3.interpolateYlOrRd(t));
});

const legendGroup = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${legendX},${legendY})`);

legendGroup.append("text")
    .attr("x", 0)
    .attr("y", -8)
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .text("🌼 Sleep trouble rate (%)");

legendGroup.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("rx", 10)
    .attr("fill", "url(#cute-gradient)");

const legendScale = d3.scaleLinear()
    .domain([0, 1])
    .range([0, legendWidth]);

legendGroup.append("g")
    .attr("transform", `translate(0,${legendHeight})`)
    .call(
        d3.axisBottom(legendScale)
            .ticks(5)
            .tickFormat(d => `${Math.round(d * 100)}%`)
    )
    .call(g => g.select(".domain").remove());


g.append("text")
    .attr("x",innerW/2)
    .attr("y",innerH+50)
    .attr("text-anchor","middle")
    .text("Caffeine level");

g.append("text")
    .attr("x",-innerH/2)
    .attr("y",-70)
    .attr("transform","rotate(-90)")
    .attr("text-anchor","middle")
    .text("Sleep time");

const tooltip = d3.select("#tooltip");

// ========= 数据加载 =========

d3.csv(DATA_URL, d => ({
    ageGroup: ageBin(+d.age_years),
    sleepCat: sleepBin(+d.sleep_hours_weekly_avg),
    cafCat: caffeineBin(+d.caffeine_mg_day1),
    trouble: trouble01(+d.told_doctor_trouble_sleeping)
})).then(data => {

    data = data.filter(d =>
        d.ageGroup && d.sleepCat && d.cafCat
    );

    const ageGroups = [...new Set(data.map(d=>d.ageGroup))];

    const select = d3.select("#ageSelect");
    select.selectAll("option")
        .data(["All",...ageGroups])
        .join("option")
        .attr("value",d=>d)
        .property("selected",d=>d==="All")
        .text(d=>d);

    function getSelectedAges(){
        const selected = Array.from(select.node().selectedOptions).map(o=>o.value);
        if(selected.includes("All")) return null;
        return new Set(selected);
    }

    function aggregate(filtered){
        const map = d3.rollup(
            filtered,
            v => ({
                n: v.length,
                rate: d3.mean(v,d=>d.trouble)
            }),
            d=>d.sleepCat,
            d=>d.cafCat
        );

        const cells=[];
        yCats.forEach(yKey=>{
            xCats.forEach(xKey=>{
                const val = map.get(yKey)?.get(xKey);
                cells.push({
                    sleepCat:yKey,
                    cafCat:xKey,
                    n:val?val.n:0,
                    rate:val?val.rate:0
                });
            });
        });
        return cells;
    }

    function render(){
        const ages = getSelectedAges();
        const filtered = ages? data.filter(d=>ages.has(d.ageGroup)):data;

        const cells = aggregate(filtered);

        const rect = g.selectAll(".cell")
            .data(cells, d=>d.sleepCat+d.cafCat);

        rect.join(
            enter=>enter.append("rect")
                .attr("class","cell")
                .attr("x",d=>x(d.cafCat))
                .attr("y",d=>y(d.sleepCat))
                .attr("width",x.bandwidth())
                .attr("height",y.bandwidth())
                .attr("rx",18)
                .attr("fill",d=>color(d.rate))
                .on("mousemove",(event,d)=>{
                    tooltip
                        .style("opacity",1)
                        .style("left",event.pageX+"px")
                        .style("top",event.pageY+"px")
                        .html(`
              Sleep: ${d.sleepCat}<br>
              Caffeine: ${d.cafCat}<br>
              n=${d.n}<br>
              Trouble rate=${(d.rate*100).toFixed(1)}%
            `);
                })
                .on("mouseleave",()=>tooltip.style("opacity",0)),
            update=>update
                .transition().duration(300)
                .attr("fill",d=>color(d.rate))
        );

        const labels = g.selectAll(".label")
            .data(cells,d=>d.sleepCat+d.cafCat);

        labels.join(
            enter=>enter.append("text")
                .attr("class","label")
                .attr("x",d=>x(d.cafCat)+x.bandwidth()/2)
                .attr("y",d=>y(d.sleepCat)+y.bandwidth()/2)
                .attr("text-anchor","middle")
                .attr("dominant-baseline","middle")
                .text(d=>"n="+d.n),
            update=>update.text(d=>"n="+d.n)
        );
    }

    select.on("change",render);

    render();
});
