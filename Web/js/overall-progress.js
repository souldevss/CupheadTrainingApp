let overallSmoothingPercent = 0, overallViewport, showOverallAverage = !1, selectedOverallBoss = null;
function renderOverallProgress(report) {
  const chart = document.getElementById("overall-progress-chart");
  if (!report) {
    chart.textContent = t("autolog.loading-history");
    return;
  }
  let longest = 0;
  const entries = Array.from(bossArt.values(), (art, index) => {
    // Reuse the averaging helper's value field; these values are percentage
    // points from StatsReport, not seconds to normalize again.
    const history = Object.hasOwn(report.bosses, art.name) ? report.bosses[art.name] : null, clears = (history?.clears || []).map(percentagePoints => ({timeSeconds:percentagePoints}));
    return longest = Math.max(longest, clears.length), { art, index, clears, intervals: history?.intervals || [], color: art.background || "#aab3bd" };
  }), left = 62, right = 755, top = 16, bottom = 212, percent = new Intl.NumberFormat(getActiveLanguage(), {
    style: "percent",
    maximumFractionDigits: 1,
    signDisplay: "exceptZero"
  }), historyPercent = new Intl.NumberFormat(getActiveLanguage(), { style: "percent", maximumFractionDigits: 1 }), ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const y = bottom - fraction * (bottom - top);
    return `<line x1="${left}" x2="${right}" y1="${y}" y2="${y}"/>
            <text class="overall-y-tick" x="${left - 8}" y="${y}" text-anchor="end"></text>`;
  }).join("");
  if (chart.innerHTML = `
        ${longest ? `
            <label class="average-slider-label" for="overall-smoothing"><span>${t("autolog.overall-smoothing")}</span><output id="overall-smoothing-value">${historyPercent.format(overallSmoothingPercent / 100)}</output></label>
            <input id="overall-smoothing" class="average-window-slider" type="range" min="0" max="100" value="${overallSmoothingPercent}" aria-valuetext="${historyPercent.format(overallSmoothingPercent / 100)}" ${longest < 2 ? "disabled" : ""}>
            <div class="chart-controls"><label class="graph-color-setting">
                <input id="overall-show-average" type="checkbox" ${showOverallAverage ? "checked" : ""}>
                ${t("autolog.overall-show-average")}
            </label><span>
                <button class="chart-zoom" data-overall-zoom="out" type="button" aria-label="${t("autolog.zoom-out")}">−</button>
                <button class="chart-zoom" data-overall-zoom="in" type="button" aria-label="${t("autolog.zoom-in")}">+</button>
            </span></div>
            <div class="history-svg-wrap"><svg class="overall-chart" viewBox="0 0 780 245" role="img" aria-label="${t("autolog.overall-improvement")}">
                <defs><clipPath id="overall-plot-clip"><rect x="${left}" y="${top - 4}" width="${right - left}" height="${bottom - top + 8}"/></clipPath></defs>
                ${ticks}
                <g class="overall-zero-reference">
                    <line x1="${left}" x2="${right}" y1="0" y2="0"/>
                    <text x="${left - 8}" y="0" text-anchor="end">${historyPercent.format(0)}</text>
                </g>
                <g clip-path="url(#overall-plot-clip)"><g class="overall-boss-lines"></g></g>
                <g class="overall-death-layer" clip-path="url(#overall-plot-clip)"><polyline class="death-rate-line"/></g>
                <circle class="overall-hover-point" r="4" visibility="hidden"/>
                <rect class="overall-plot-target" x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" fill="transparent"/>
                <text class="overall-first-clear" x="${left}" y="232" text-anchor="middle">0%</text>
                <text x="${(left + right) / 2}" y="232" text-anchor="middle">${t("autolog.overall-history-progress")}</text>
                <text class="overall-last-clear" x="${right}" y="232" text-anchor="middle"></text>
            </svg><div class="chart-hover-tooltip" hidden></div></div>` : `<p class="history-empty">${t("autolog.no-clear-times")}</p>`}
        <div class="overall-boss-legend">
            ${entries.map(({ art, index, color }) => `
                <button type="button" class="overall-boss-key" aria-pressed="${selectedOverallBoss === index}" data-series="${index}" title="${safeText(cupheadDisplayName(art.name))}" style="background:${safeText(color)};color:${safeText(art.color || "#121212")}">
                    ${art.icon ? `<img src="${safeText(art.icon)}" alt="${safeText(cupheadDisplayName(art.name))}" loading="lazy">` : `<span aria-label="${safeText(cupheadDisplayName(art.name))}">${safeText(cupheadDisplayName(art.name).slice(0, 2))}</span>`}
                </button>`).join("")}
        </div>`, !longest) return;
  const layer = chart.querySelector(".overall-boss-lines"), value = chart.querySelector("#overall-smoothing-value"), plot = chart.querySelector(".overall-plot-target"), zoomOut = chart.querySelector('[data-overall-zoom="out"]'), zoomIn = chart.querySelector('[data-overall-zoom="in"]'), firstClear = chart.querySelector(".overall-first-clear"), lastClear = chart.querySelector(".overall-last-clear"), fullSpan = longest, minSpan = 1;
  let span = Math.min(fullSpan, overallViewport?.span ?? fullSpan), start = Math.min(fullSpan - span, overallViewport?.start ?? 0), displayed, rangeMotion = null, series = [], deathTrend, smoothingFrame = null, navigationTimer = null, hoverTimer = null, pointer, released = false;
  const ticksY = [...chart.querySelectorAll(".overall-y-tick")], zeroReference = chart.querySelector(".overall-zero-reference"), tooltip = chart.querySelector(".chart-hover-tooltip"), marker = chart.querySelector(".overall-hover-point");
  function showHover() {
    if (tooltip.hidden = !0, marker.setAttribute("visibility", "hidden"), !pointer || !displayed) return;
    const bounds = plot.getBoundingClientRect(), xRatio = (pointer.x - bounds.left) / bounds.width;
    if (xRatio < 0 || xRatio > 1) return;
    const position = displayed.start + xRatio * displayed.span, average = series.find(trend => trend.key === selectedOverallBoss) || series.find((trend) => trend.key === "average"), change = average ? sampleTrendAtX(average.shown, position) : series.reduce((sum, trend) => sum + sampleTrendAtX(trend.shown, position), 0) / series.length;
    if (average && change >= displayed.low && change <= displayed.high) {
      const yRatio = (displayed.high - change) / (displayed.high - displayed.low);
      marker.setAttribute("cx", left + xRatio * (right - left)), marker.setAttribute("cy", top + yRatio * (bottom - top)), marker.setAttribute("fill", average.color), marker.setAttribute("visibility", "visible");
    }
    const magnitude = historyPercent.format(Math.abs(change) / 100), improvement = Math.abs(change) < 0.05 ? t("autolog.overall-no-change") : tf(change < 0 ? "autolog.overall-faster" : "autolog.overall-slower", { percent: magnitude }), deaths = historyPercent.format(sampleTrendAtX(deathTrend.shown, position) / 100);
    tooltip.textContent = `${improvement} · ${tf("autolog.overall-deaths-percent", { percent: deaths })}`;
    const wrap = tooltip.parentElement.getBoundingClientRect();
    tooltip.hidden = !1, tooltip.style.left = `${Math.max(0, Math.min(wrap.width - tooltip.offsetWidth, pointer.x - wrap.left + 10))}px`, tooltip.style.top = `${Math.max(0, pointer.y - wrap.top - tooltip.offsetHeight - 8)}px`;
  }
  function fitRange() {
    let low = 0, high = 0;
    const end = start + span;
    for (const { points } of series.filter(trend => selectedOverallBoss === null || trend.key === selectedOverallBoss)) {
      const last = points.at(-1).x;
      if (last < start) continue;
      const from = sampleTrendAtX(points, start), to = sampleTrendAtX(points, Math.min(end, last));
      low = Math.min(low, from, to), high = Math.max(high, from, to);
      for (const point of points)
        point.x < start || point.x > end || (low = Math.min(low, point.y), high = Math.max(high, point.y));
    }
    const padding = Math.max(0.5, (high - low) * 0.1);
    return { start, span, low: low - padding, high: high + padding };
  }
  function paint() {
    const xScale = (right - left) / displayed.span, yScale = (bottom - top) / (displayed.high - displayed.low), zeroY = bottom + displayed.low * yScale;
    const deathPath = chart.querySelector(".overall-death-layer polyline");
    deathPath.setAttribute("points", deathTrend.shown.map(point => `${left+(point.x-displayed.start)*xScale},${bottom-point.y/100*(bottom-top)}`).join(" "));
    layer.setAttribute("transform", `translate(${left - displayed.start * xScale},${zeroY}) scale(${xScale},${-yScale})`), zeroReference.setAttribute("transform", `translate(0,${zeroY})`), firstClear.textContent = historyPercent.format(displayed.start / fullSpan), lastClear.textContent = historyPercent.format((displayed.start + displayed.span) / fullSpan), ticksY.forEach((tick, index) => {
      const value2 = displayed.low + (displayed.high - displayed.low) * index / 4;
      tick.textContent = Math.abs(value2 * yScale) < 12 ? "" : percent.format(value2 / 100);
    }), showHover();
  }
  function advanceRange(now) {
    if (!rangeMotion) return false;
    const progress = graphTransitionProgress(rangeMotion.started,now);
    for (const key of Object.keys(rangeMotion.target)) displayed[key] = rangeMotion.from[key]+(rangeMotion.target[key]-rangeMotion.from[key])*progress;
    if (progress === 1) rangeMotion = null;
    return progress < 1;
  }
  function advanceTrend(trend,now) {
    if (!trend?.tween) return false;
    const progress = graphTransitionProgress(trend.started,now);
    for (let i=0;i<trend.tween.length;i++) {const point=trend.tween[i];trend.shown[i].y=point.from+(point.to-point.from)*progress;}
    if (progress === 1) {trend.shown=trend.points;trend.tween=null;}
    return progress < 1;
  }
  function queueAnimation() {
    if (navigationTimer!==null || released) return;
    navigationTimer=setTimeout(()=>{
      navigationTimer=null;
      if(released || !layer.isConnected)return;
      const now=performance.now();let moving=advanceRange(now);
      for(const trend of [...series,deathTrend]) {
        const changed=!!trend?.tween;
        moving=advanceTrend(trend,now)||moving;
        if(changed)trend.path?.setAttribute("points",pointMarkup(trend.shown));
      }
      paint();if(moving)queueAnimation();
    },33);
  }
  function navigate(nextStart,nextSpan) {
    span=Math.max(minSpan,Math.min(fullSpan,nextSpan));start=Math.max(0,Math.min(fullSpan-span,nextStart));
    overallViewport=span===fullSpan?undefined:{start,span};
    zoomOut.disabled=span===fullSpan;zoomIn.disabled=span===minSpan;plot.classList.toggle("can-pan",span<fullSpan);
    const target=fitRange(),now=performance.now();advanceRange(now);
    if(!displayed) {displayed=target;rangeMotion=null;}
    else if(Object.keys(target).some(key=>Math.abs(displayed[key]-target[key])>1e-7)) rangeMotion={started:now,from:{...displayed},target};
    else rangeMotion=null;
    queueAnimation();
  }
  disposeTimeChart=()=>{released=true;clearTimeout(navigationTimer);clearTimeout(hoverTimer);if(smoothingFrame!==null)cancelAnimationFrame(smoothingFrame);};
  function zoom(factor, anchor = 0.5) {
    const nextSpan = Math.max(minSpan, Math.min(fullSpan, span / factor));
    navigate(start + anchor * (span - nextSpan), nextSpan);
  }
  zoomOut.addEventListener("click", () => zoom(0.8)), zoomIn.addEventListener("click", () => zoom(1.25)), plot.addEventListener("wheel", (event) => {
    if (fullSpan === minSpan) return;
    event.preventDefault();
    const bounds = plot.getBoundingClientRect(), unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.width : 1;
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      const delta = event.shiftKey ? event.deltaY : event.deltaX;
      navigate(start + delta * unit / bounds.width * span, span);
      return;
    }
    const anchor = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    zoom(Math.exp(-Math.max(-240, Math.min(240, event.deltaY * unit)) * 2e-3), anchor);
  }, { passive: !1 });
  let drag;
  plot.addEventListener("pointerdown", (event) => {
    event.button !== 0 || span === fullSpan || (pointer = void 0, drag = { id: event.pointerId, x: event.clientX, start }, plot.setPointerCapture(event.pointerId), plot.classList.add("is-panning"));
  }), plot.addEventListener("pointermove", (event) => {
    if(drag?.id===event.pointerId) navigate(drag.start-(event.clientX-drag.x)/plot.getBoundingClientRect().width*span,span);
    else {pointer={x:event.clientX,y:event.clientY};if(hoverTimer===null)hoverTimer=setTimeout(()=>{hoverTimer=null;showHover();},33);}
  }), plot.addEventListener("lostpointercapture", () => {
    drag = void 0, plot.classList.remove("is-panning");
  }), plot.addEventListener("pointerleave", () => {
    pointer = void 0, showHover();
  });
  function makeTrend(key,name,color,points,previous=series.find(trend=>trend.key===key)) {
    const now=performance.now();advanceTrend(previous,now);
    if(!previous || previous.points.length===points.length && points.every((point,i)=>point.x===previous.points[i].x && point.y===previous.points[i].y)) return {key,name,color,points,shown:points};
    const tween=points.map(point=>({x:point.x,from:sampleTrendAtX(previous.shown,point.x),to:point.y}));
    return {key,name,color,points,shown:tween.map(point=>({x:point.x,y:point.from})),tween,started:now};
  }
  function pointMarkup(points) {
    return points.map((point) => `${point.x.toFixed(4)},${point.y.toFixed(4)}`).join(" ");
  }
  function averagePoints(lines) {
    return [...new Set(lines.flatMap(points=>points.map(point=>point.x)))].sort((a,b)=>a-b).map((x) => ({
      x,
      y: lines.reduce((sum, points) => sum + sampleTrendAtX(points, x), 0) / lines.length
    }));
  }
  function draw() {
    const deathLines = [], next = entries.filter((entry) => entry.clears.length).map(({ art, index, clears, intervals, color }) => {
      const window = 1 + Math.round((maxSmoothing(clears.length) - 1) * overallSmoothingPercent / 100), samples = averageTrend(clears, intervals, window, 240), initialValue = samples[0].timeSeconds;
      samples.length === 1 && samples.push(samples[0]);
      const position = (point) => fullSpan * point / (samples.length - 1), points = samples.map((sample, point) => ({
        x: position(point),
        // C# already normalized clears to percentage points around the boss's
        // average. Only offset the first sample; their mean is approximately zero.
        y: sample.timeSeconds - initialValue
      }));
      return deathLines.push({index,points:samples.map((sample, point) => ({
        x: position(point),
        y: sample.deathRate
      }))}), makeTrend(index, cupheadDisplayName(art.name), color, points);
    });
    if (deathTrend = makeTrend("death", "", "", averagePoints(deathLines.filter(line=>selectedOverallBoss===null||line.index===selectedOverallBoss).map(line=>line.points)), deathTrend), showOverallAverage) {
      const points = averagePoints(next.map((trend) => trend.points));
      next.push(makeTrend("average", t("autolog.overall-average-label"), "#fff", points));
    }
    series = next, layer.classList.toggle("show-overall-average", showOverallAverage), layer.innerHTML = series.map((trend) => `<g ${trend.key === "average" ? 'class="overall-average-line"' : `data-series="${trend.key}"`}
            style="color:${safeText(trend.color)}"><polyline points="${pointMarkup(trend.shown)}"/></g>`).join(""), layer.querySelectorAll("polyline").forEach((path, index) => {
      series[index].path = path;
    }), navigate(start, span);
    for(const group of layer.children) group.classList.toggle("is-unselected",selectedOverallBoss!==null&&group.dataset.series!==String(selectedOverallBoss));
  }
  chart.querySelector("#overall-show-average").addEventListener("change", (event) => {
    showOverallAverage = event.target.checked, draw();
  }), chart.querySelector("#overall-smoothing").addEventListener("input", (event) => {
    overallSmoothingPercent = Number(event.target.value);
    const label = historyPercent.format(overallSmoothingPercent / 100);
    value.value = label, event.target.setAttribute("aria-valuetext", label), smoothingFrame === null && (smoothingFrame = requestAnimationFrame(() => {
      smoothingFrame = null, layer.isConnected && draw();
    }));
  });
  for (const key of chart.querySelectorAll(".overall-boss-key")) {
    if (!entries[Number(key.dataset.series)].clears.length) continue;
    const highlight = () => {
      for (const series2 of layer.children)
        series2.classList.toggle("is-muted", series2.hasAttribute("data-series") && series2.dataset.series !== key.dataset.series);
    }, reset = () => {
      for (const series2 of layer.children) series2.classList.remove("is-muted");
    };
    key.addEventListener("click",()=>{const index=Number(key.dataset.series);selectedOverallBoss=selectedOverallBoss===index?null:index;for(const control of chart.querySelectorAll(".overall-boss-key"))control.setAttribute("aria-pressed",String(Number(control.dataset.series)===selectedOverallBoss));draw();});
    key.addEventListener("mouseenter", highlight), key.addEventListener("focus", highlight), key.addEventListener("mouseleave", reset), key.addEventListener("blur", reset);
  }
  draw();
}
