// --- js/cartoon_clock.js ---
document.addEventListener("DOMContentLoaded", () => {
    // --- 1. D3 SETUP ---
    const width = 300, height = 300; 
    const margin = 40; 
    const radius = width / 2 - margin;
    const cornerRadius = 20;

    // Color scale for trouble sleeping rate (Blue = Good, Red = Bad)
    const colorScale = d3.scaleSequential(d3.interpolateRdYlBu).domain([0.35, 0.15]); 
    const angleScale = d3.scaleLinear().domain([0, 24]).range([0, 2 * Math.PI]);
    const tooltip = d3.select("#tooltip");

    // --- Helper Functions ---
    function parseTime(str) {
        if (!str || str === "NaN") return null;
        const s = str.replace(/[b']/g, "");
        const [h, m] = s.split(":").map(Number);
        return h + (m / 60);
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

    function getSleepCategory(d) {
        const wkday = parseFloat(d.sleep_hours_weekday);
        const wkend = parseFloat(d.sleep_hours_weekend);
        if (isNaN(wkday) || isNaN(wkend)) return null;
        const diff = wkend - wkday; 
        if (Math.abs(diff) <= 1.0) return "stable";
        if (diff > 1.0) return "weekend_sleeper";
        if (diff < -1.0) return "weekday_sleeper";
        return "stable";
    }

    // --- 2. UI COMPONENTS ---
    function createLegend() {
        const w = 250, h = 15;
        d3.select("#legend").selectAll("*").remove();
        const svg = d3.select("#legend").append("svg").attr("width", w + 40).attr("height", 50);
        
        const defs = svg.append("defs");
        const gradient = defs.append("linearGradient").attr("id", "legend-grad").attr("x1", "0%").attr("x2", "100%");
        const stops = 10;
        for (let i = 0; i <= stops; i++) {
            const val = 0.20 + (i/stops) * 0.10; 
            gradient.append("stop").attr("offset", (i/stops)*100 + "%").attr("stop-color", colorScale(val));
        }

        svg.append("rect")
            .attr("width", w).attr("height", h).attr("x", 20).attr("rx", h/2)
            .style("fill", "url(#legend-grad)")
            .style("stroke", "#000").style("stroke-width", "2px");

        const axisScale = d3.scaleLinear().domain([0.20, 0.30]).range([0, w]);
        const axis = d3.axisBottom(axisScale).ticks(5).tickFormat(d => Math.round(d * 100) + "%");
        svg.append("g").attr("class", "legend-axis").attr("transform", `translate(20, ${h+8})`).call(axis);
    }

    function initClock(containerId) {
        d3.select(containerId).selectAll("*").remove();
        const svg = d3.select(containerId).append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width/2},${height/2})`);

        // Draw clock face border
        svg.append("circle").attr("r", radius).attr("class", "clock-circle");

        // Draw ticks and numbers
        d3.range(0, 24).forEach(h => {
            const angle = angleScale(h) - Math.PI/2; // -PI/2 to start 0 at the top
            const rMark = radius - 5;
            const rText = radius + 15;
            const isMajor = h % 6 === 0;

            svg.append("line")
                .attr("x1", Math.cos(angle) * radius)
                .attr("y1", Math.sin(angle) * radius)
                .attr("x2", Math.cos(angle) * (radius - (isMajor?10:5)))
                .attr("y2", Math.sin(angle) * (radius - (isMajor?10:5)))
                .attr("class", "clock-tick");

            if (isMajor || h % 2 === 0) {
                svg.append("text")
                    .attr("x", Math.cos(angle) * rText)
                    .attr("y", Math.sin(angle) * rText)
                    .attr("class", "clock-num")
                    .text(h);
            }
        });

        svg.append("text").attr("y", -radius - 25).attr("text-anchor", "middle")
            .style("font-size", "12px").style("fill", "#95a5a6").style("font-weight", "bold")
            .text("MIDNIGHT");

        return svg.append("g").attr("class", "data-layer");
    }

    function updateStats(metrics, rawData) {
        const wd = metrics[0];
        const we = metrics[1];
        if (!wd || !we) return;

        // Bedtime shift
        const bedDiff = getTimeDiff(wd.start, we.start);
        d3.select("#stat-bedtime").text(formatTimeDiff(bedDiff));
        const bedInd = d3.select("#ind-bedtime");
        if (Math.abs(bedDiff) < 0.5) { bedInd.text("Same-ish").attr("class", "indicator ind-neutral"); }
        else if (bedDiff > 0) { bedInd.text("Later").attr("class", "indicator ind-red"); }
        else { bedInd.text("Earlier").attr("class", "indicator ind-green"); }

        // Wake time shift
        const wakeDiff = getTimeDiff(wd.end, we.end);
        d3.select("#stat-wake").text(formatTimeDiff(wakeDiff));
        const wakeInd = d3.select("#ind-wake");
        if (Math.abs(wakeDiff) < 0.5) { wakeInd.text("Same-ish").attr("class", "indicator ind-neutral"); }
        else if (wakeDiff > 0) { wakeInd.text("Sleeping In").attr("class", "indicator ind-red"); } 
        else { wakeInd.text("Up Early").attr("class", "indicator ind-green"); }

        // Duration shift
        const durWd = (wd.end < wd.start ? wd.end + 24 : wd.end) - wd.start;
        const durWe = (we.end < we.start ? we.end + 24 : we.end) - we.start;
        const durDiff = durWe - durWd;
        d3.select("#stat-duration").text(formatTimeDiff(durDiff));
        const durInd = d3.select("#ind-duration");
        if (Math.abs(durDiff) < 0.5) { durInd.text("Equal").attr("class", "indicator ind-neutral"); }
        else if (durDiff > 0) { durInd.text("Catch-up").attr("class", "indicator ind-green"); }
        else { durInd.text("Less").attr("class", "indicator ind-red"); }

        // Habit Stats
        const avgCaffeine = d3.mean(rawData, d => +d.caffeine_mg_day1 || 0);
        d3.select("#stat-caffeine").text(Math.round(avgCaffeine));

        const avgSnore = d3.mean(rawData, d => +d.snore_frequency || 0);
        d3.select("#stat-snore").text(avgSnore ? avgSnore.toFixed(1) : "?");

        const avgSed = d3.mean(rawData, d => +d.minutes_sedentary_per_day || 0);
        d3.select("#stat-sedentary").text(Math.round(avgSed));
    }

    // --- 3. MAIN DATA LOAD & DRAWING ---
    d3.csv("data/nhanes_2017_mar2020_sleep_merged_extended_clean_with_caffeine.csv").then(data => {
        data.forEach(d => d.category = getSleepCategory(d));
        createLegend();
        const gWeekday = initClock("#chart-weekday");
        const gWeekend = initClock("#chart-weekend");

        const updateViz = (groupId) => {
            const filtered = (groupId === "all") ? data : data.filter(d => d.category === groupId);

            const metrics = ["weekday", "weekend"].map(type => {
                const sCol = `usual_sleep_time_${type}_hhmm`;
                const wCol = `usual_wake_time_${type}_hhmm`;
                const valid = filtered.filter(d => d[sCol] && d[wCol]);
                if (!valid.length) return null;
                const processTime = (t) => t < 12 ? t + 24 : t;
                const avgStart = d3.mean(valid, d => processTime(parseTime(d[sCol])));
                const avgEnd = d3.mean(valid, d => processTime(parseTime(d[wCol])));
                const trouble = d3.mean(valid, d => d.told_doctor_trouble_sleeping == 1 ? 1 : 0);
                return { type, start: avgStart%24, end: avgEnd%24, rate: trouble };
            });

            updateStats(metrics, filtered);

            const draw = (selection, datum) => {
                if (!datum) { selection.selectAll(".sector").remove(); return; }
                
                const arcGenerator = d3.arc()
                    .innerRadius(0)
                    .outerRadius(radius - 10)
                    .cornerRadius(cornerRadius);

                const paths = selection.selectAll(".sector").data([datum]);
                
                paths.join(
                    enter => enter.append("path")
                        .attr("class", "sector")
                        .each(function(d) {
                            // Calculate initial angles properly
                            let sAngle = angleScale(d.start);
                            let eAngle = angleScale(d.end);
                            if (eAngle < sAngle) eAngle += 2 * Math.PI; // Wrap around midnight
                            
                            // Store the actual angles for future transitions
                            this._current = { startAngle: sAngle, endAngle: eAngle }; 
                        })
                        .attr("d", function(d) {
                            return arcGenerator(this._current);
                        })
                        .attr("fill", d => colorScale(d.rate))
                        .style("opacity", 0)
                        .call(enter => enter.transition().duration(800).style("opacity", 1)),
                        
                    update => update.transition().duration(800)
                        .attr("fill", d => colorScale(d.rate))
                        .attrTween("d", function(d) {
                            let oldState = this._current;
                            let newStartAngle = angleScale(d.start);

                            // --- SHORTEST PATH LOGIC ---
                            // If the new angle is more than half a circle away, wrap it around
                            // so the animation takes the shortest route across midnight.
                            while (newStartAngle - oldState.startAngle > Math.PI) {
                                newStartAngle -= 2 * Math.PI;
                            }
                            while (newStartAngle - oldState.startAngle < -Math.PI) {
                                newStartAngle += 2 * Math.PI;
                            }

                            // Calculate the total duration in radians to maintain arc size
                            let durationHours = (d.end < d.start ? d.end + 24 : d.end) - d.start;
                            let durationRadians = (durationHours / 24) * 2 * Math.PI;
                            let newEndAngle = newStartAngle + durationRadians;

                            // Create interpolators for smooth frame-by-frame rendering
                            let iStart = d3.interpolate(oldState.startAngle, newStartAngle);
                            let iEnd = d3.interpolate(oldState.endAngle, newEndAngle);

                            // Store the new target angles for the NEXT time the user clicks a button
                            this._current = { startAngle: newStartAngle, endAngle: newEndAngle };

                            return function(t) {
                                return arcGenerator({
                                    startAngle: iStart(t),
                                    endAngle: iEnd(t)
                                });
                            };
                        })
                )
                .on("mouseover", (e, d) => {
                    const fmt = t => `${Math.floor(t)}:${Math.round((t%1)*60).toString().padStart(2,'0')}`;
                    const dur = (d.end < d.start ? d.end+24 : d.end) - d.start;
                    tooltip.style("opacity", 1)
                        .html(`<div><strong>${d.type.toUpperCase()}</strong></div>
                               <div>🛏️ ${fmt(d.start)} - ${fmt(d.end)}</div>
                               <div>⏳ ${dur.toFixed(1)} hrs</div>
                               <div style="margin-top:5px; color:${d3.interpolateRdYlBu(1-(d.rate-0.15)/0.2)}">
                                  Trouble Sleeping: ${(d.rate*100).toFixed(1)}%
                               </div>`);
                })
                .on("mousemove", e => tooltip.style("left", e.pageX+"px").style("top", e.pageY+"px"))
                .on("mouseout", () => tooltip.style("opacity", 0));
            };
            
            draw(gWeekday, metrics[0]);
            draw(gWeekend, metrics[1]);
        };

        // Handle button clicks
        d3.selectAll(".toggle-btn").on("click", function() {
            d3.selectAll(".toggle-btn").classed("active", false);
            d3.select(this).classed("active", true);
            updateViz(d3.select(this).attr("data-val"));
        });

        // Init view
        updateViz("all");
    }).catch(error => {
        console.error("Error loading CSV data:", error);
    });
});