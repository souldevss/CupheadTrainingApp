let overallSmoothingPercent = 0, overallViewport, showOverallAverage = !1;
function renderOverallProgress(report) {
  const chart = document.getElementById("overall-progress-chart");
  if (!report) {
    chart.textContent = t("projection.loading");
    return;
  }
  let longest = 0;
  const entries = Array.from(bossArt.values(), (art, index) => {
    const history = Object.hasOwn(report.bosses, art.name) ? report.bosses[art.name] : null, clears = (history?.clears || []).map((timeSeconds) => ({ timeSeconds }));
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
                <circle class="overall-hover-point" r="4" visibility="hidden"/>
                <rect class="overall-plot-target" x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" fill="transparent"/>
                <text class="overall-first-clear" x="${left}" y="232" text-anchor="middle">0%</text>
                <text x="${(left + right) / 2}" y="232" text-anchor="middle">${t("autolog.overall-history-progress")}</text>
                <text class="overall-last-clear" x="${right}" y="232" text-anchor="middle"></text>
            </svg><div class="chart-hover-tooltip" hidden></div></div>` : `<p class="history-empty">${t("autolog.no-clear-times")}</p>`}
        <div class="overall-boss-legend">
            ${entries.map(({ art, index, color }) => `
                <span class="overall-boss-key" tabindex="0" data-series="${index}" title="${safeText(cupheadDisplayName(art.name))}" style="background:${safeText(color)};color:${safeText(art.color || "#121212")}">
                    ${art.icon ? `<img src="${safeText(art.icon)}" alt="${safeText(cupheadDisplayName(art.name))}" loading="lazy">` : `<span aria-label="${safeText(cupheadDisplayName(art.name))}">${safeText(cupheadDisplayName(art.name).slice(0, 2))}</span>`}
                </span>`).join("")}
        </div>`, !longest) return;
  const layer = chart.querySelector(".overall-boss-lines"), value = chart.querySelector("#overall-smoothing-value"), plot = chart.querySelector(".overall-plot-target"), zoomOut = chart.querySelector('[data-overall-zoom="out"]'), zoomIn = chart.querySelector('[data-overall-zoom="in"]'), firstClear = chart.querySelector(".overall-first-clear"), lastClear = chart.querySelector(".overall-last-clear"), fullSpan = longest, minSpan = 1;
  let span = Math.min(fullSpan, overallViewport?.span ?? fullSpan), start = Math.min(fullSpan - span, overallViewport?.start ?? 0), frame = null, displayed, target, series = [], deathTrend, animationTime, curveAnimationStart, smoothingFrame = null, pointer;
  const ticksY = [...chart.querySelectorAll(".overall-y-tick")], zeroReference = chart.querySelector(".overall-zero-reference"), tooltip = chart.querySelector(".chart-hover-tooltip"), marker = chart.querySelector(".overall-hover-point");
  function showHover() {
    if (tooltip.hidden = !0, marker.setAttribute("visibility", "hidden"), !pointer || !displayed) return;
    const bounds = plot.getBoundingClientRect(), xRatio = (pointer.x - bounds.left) / bounds.width;
    if (xRatio < 0 || xRatio > 1) return;
    const position = displayed.start + xRatio * displayed.span, average = series.find((trend) => trend.key === "average"), change = average ? sampleTrendAtX(average.shown, position) : series.reduce((sum, trend) => sum + sampleTrendAtX(trend.shown, position), 0) / series.length;
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
    for (const { points } of series) {
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
    layer.setAttribute("transform", `translate(${left - displayed.start * xScale},${zeroY}) scale(${xScale},${-yScale})`), zeroReference.setAttribute("transform", `translate(0,${zeroY})`), firstClear.textContent = historyPercent.format(displayed.start / fullSpan), lastClear.textContent = historyPercent.format((displayed.start + displayed.span) / fullSpan), ticksY.forEach((tick, index) => {
      const value2 = displayed.low + (displayed.high - displayed.low) * index / 4;
      tick.textContent = Math.abs(value2 * yScale) < 12 ? "" : percent.format(value2 / 100);
    }), showHover();
  }
  function animate(now) {
    if (frame = null, !layer.isConnected) return;
    const blend = 1 - Math.exp(-Math.min(50, now - animationTime) / 48);
    animationTime = now;
    let moving = !1;
    for (const key of Object.keys(target)) {
      const delta = target[key] - displayed[key];
      Math.abs(delta) < 1e-3 ? displayed[key] = target[key] : (displayed[key] += delta * blend, moving = !0);
    }
    if (curveAnimationStart !== void 0) {
      const progress = Math.min(1, (now - curveAnimationStart) / 180), eased = 1 - (1 - progress) ** 3;
      for (const trend of [...series, deathTrend])
        trend?.tween && (trend.shown = progress === 1 ? trend.points : trend.tween.map((point) => ({
          x: point.x,
          y: point.fromY + (point.toY - point.fromY) * eased
        })), trend.path?.setAttribute("points", pointMarkup(trend.shown)), progress === 1 && (trend.tween = null));
      progress < 1 ? moving = !0 : curveAnimationStart = void 0;
    }
    paint(), moving && (frame = requestAnimationFrame(animate));
  }
  function navigate(nextStart, nextSpan) {
    span = Math.max(minSpan, Math.min(fullSpan, nextSpan)), start = Math.max(0, Math.min(fullSpan - span, nextStart)), overallViewport = span === fullSpan ? void 0 : { start, span }, target = fitRange(), displayed ? frame === null && (animationTime = performance.now(), frame = requestAnimationFrame(animate)) : (displayed = { ...target }, paint()), zoomOut.disabled = span === fullSpan, zoomIn.disabled = span === minSpan, plot.classList.toggle("can-pan", span < fullSpan);
  }
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
    drag?.id === event.pointerId ? navigate(drag.start - (event.clientX - drag.x) / plot.getBoundingClientRect().width * span, span) : (pointer = { x: event.clientX, y: event.clientY }, showHover());
  }), plot.addEventListener("lostpointercapture", () => {
    drag = void 0, plot.classList.remove("is-panning");
  }), plot.addEventListener("pointerleave", () => {
    pointer = void 0, showHover();
  });
  function makeTrend(key, name, color, points, previous = series.find((trend) => trend.key === key)) {
    const tween = previous ? buildTrendTween(previous.shown, points) : null, shown = tween ? tween.map((point) => ({ x: point.x, y: point.fromY })) : points;
    return { key, name, color, points, shown, tween };
  }
  function pointMarkup(points) {
    return points.map((point) => `${point.x.toFixed(4)},${point.y.toFixed(4)}`).join(" ");
  }
  function averagePoints(lines) {
    return animationCoordinates(lines.flatMap((points) => points.map((point) => point.x))).map((x) => ({
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
        y: sample.timeSeconds - initialValue
      }));
      return deathLines.push(samples.map((sample, point) => ({
        x: position(point),
        y: sample.deathRate
      }))), makeTrend(index, cupheadDisplayName(art.name), color, points);
    });
    if (deathTrend = makeTrend("death", "", "", averagePoints(deathLines), deathTrend), showOverallAverage) {
      const points = averagePoints(next.map((trend) => trend.points));
      next.push(makeTrend("average", t("autolog.overall-average-label"), "#fff", points));
    }
    series = next, layer.classList.toggle("show-overall-average", showOverallAverage), layer.innerHTML = series.map((trend) => `<g ${trend.key === "average" ? 'class="overall-average-line"' : `data-series="${trend.key}"`}
            style="color:${safeText(trend.color)}"><polyline points="${pointMarkup(trend.shown)}"/></g>`).join(""), layer.querySelectorAll("polyline").forEach((path, index) => {
      series[index].path = path;
    }), curveAnimationStart = deathTrend.tween || series.some((trend) => trend.tween) ? performance.now() : void 0, navigate(start, span);
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
    key.addEventListener("mouseenter", highlight), key.addEventListener("focus", highlight), key.addEventListener("mouseleave", reset), key.addEventListener("blur", reset);
  }
  draw();
}
