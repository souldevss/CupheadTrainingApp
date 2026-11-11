function completeAverage(value, clearCount, requiredCount) {
  return clearCount >= requiredCount ? value : "—";
}
function maxSmoothing(clearCount) {
  return clearCount <= 1 ? 1 : Math.floor(clearCount / 2) + 1;
}
function trendPointCount(clearCount, strength) {
  if (clearCount <= 1) return clearCount;
  const progress = Math.min(1, Math.max(0, (strength - 1) / (maxSmoothing(clearCount) - 1)));
  return Math.max(2, Math.round(clearCount - (clearCount - 2) * progress));
}
function averageTrend(clears, intervals, strength, pointLimit = 1 / 0) {
  const width = Math.min(strength, clears.length), timeSums = [0], deathSums = [0], attemptSums = [0];
  clears.forEach((clear, index) => {
    timeSums.push(timeSums[index] + clear.timeSeconds), deathSums.push(deathSums[index] + (intervals[index]?.deaths || 0)), attemptSums.push(attemptSums[index] + (intervals[index]?.attempts || 0));
  });
  const pointCount = Math.min(pointLimit, trendPointCount(clears.length, strength));
  return Array.from({ length: pointCount }, (_, point) => {
    const center = pointCount <= 1 ? 0 : point * (clears.length - 1) / (pointCount - 1), windowStart = Math.round(center - (width - 1) / 2), start = Math.max(0, windowStart), end = Math.min(clears.length, windowStart + width), attempts = attemptSums[end] - attemptSums[start];
    return {
      timeSeconds: (timeSums[end] - timeSums[start]) / (end - start),
      deathRate: attempts ? (deathSums[end] - deathSums[start]) * 100 / attempts : 0,
      runStart: start + 1,
      runEnd: end
    };
  });
}
function chartViewport(total, state) {
  const zoom = Math.max(1, Math.min(Math.max(1, total - 1), state.zoom || 1)), span = total <= 1 ? 0 : (total - 1) / zoom, offset = Math.max(0, Math.min(total - 1 - span, state.offset || 0));
  return { zoom, span, offset, start: Math.max(0, total - 1 - span - offset) };
}
const EMPTY_OUTCOMES = [];
let liveAutologAttempt = null;
function getLiveChartTime(bossName) {
  const live = liveAutologAttempt;
  if (!live || live.bossName !== bossName || !Number.isFinite(live.seconds) || live.categoryKey !== selectedLogCategory && !(live.categoryKey === "DLC:shared" && selectedLogCategory.startsWith("DLC:"))) return null;
  const best = autologRows.find((boss) => boss.level === bossName)?.bestSeconds;
  return Number.isFinite(best) && live.seconds >= best ? live.seconds : null;
}
window.updateAutologLiveAttempt = (attempt) => {
  liveAutologAttempt = attempt, document.querySelector(".time-chart-content")?.updateLivePoint?.();
};
function getCachedTimeTrend(history, outcomes, strength) {
  let cached = timeTrendCache.get(history);
  if (!cached || cached.outcomes !== outcomes) {
    const clears = history.filter((attempt) => attempt.cleared), intervals = [];
    let deaths = 0, attempts = 0;
    for (const outcome of outcomes)
      attempts++, outcome.isDeath && deaths++, outcome.isClear && (intervals.push({ deaths, attempts }), deaths = 0, attempts = 0);
    intervals.length && attempts && (intervals[intervals.length - 1].deaths += deaths, intervals[intervals.length - 1].attempts += attempts), cached = { outcomes, clears, intervals, trends: /* @__PURE__ */ new Map() }, timeTrendCache.set(history, cached);
  }
  let trend = cached.trends.get(strength);
  return trend || (trend = averageTrend(cached.clears, cached.intervals, strength)), cached.trends.delete(strength), cached.trends.set(strength, trend), cached.trends.size > 4 && cached.trends.delete(cached.trends.keys().next().value), trend;
}
function deathBarPath(bars) {
  return bars.map((bar) => `M${bar.x},92v${-bar.height}h${bar.width}v${bar.height}Z`).join(" ");
}
function readDeathBars(svg) {
  if (!svg) return [];
  const layer = svg.querySelector(".death-animation-layer"), path = layer || svg.querySelector(".combined-death-bar");
  if (!path) return [];
  const scale = path.coordinateScale || 1;
  return (layer ? layer.barState : JSON.parse(path.dataset.bars || "[]")).map((bar) => ({ x: bar.x * scale, width: bar.width * scale, height: bar.height }));
}
function nearestChartPoint(svg, clientX) {
  const bounds = svg.getBoundingClientRect();
  if (!bounds.width) return null;
  const fraction = (clientX - bounds.left) / bounds.width, points = svg.hoverPoints ||= Array.from(svg.querySelectorAll("circle[data-point]"), (element) => ({
    element,
    fraction: Number(element.getAttribute("cx")) / svg.viewBox.baseVal.width
  }));
  if (!points.length) return null;
  let left = 0, right = points.length - 1;
  for (; right - left > 1; ) {
    const middle = left + right >> 1;
    points[middle].fraction <= fraction ? left = middle : right = middle;
  }
  return (Math.abs(points[left].fraction - fraction) <= Math.abs(points[right].fraction - fraction) ? points[left] : points[right]).element;
}
function timeChartThresholds(art) {
  return art.fRankTime ? generateRankTimes(art.fRankTime, {
    wrTime: art.wrTime,
    fallbackMultipliers: getLogCategoryData()?.rankMultipliers || defaultRankMultipliers
  }) : [];
}
function timeChartRankColor(thresholds, seconds) {
  const index = thresholds.findIndex((threshold) => seconds <= threshold);
  return ranksStyles[index < 0 ? ranks.length - 1 : index]?.background || "#8993a0";
}
function fitTimeChartRange(points, live) {
  let min = 1 / 0, max = -1 / 0;
  for (const point of points)
    min = Math.min(min, point.timeSeconds), max = Math.max(max, point.timeSeconds);
  const padding = Math.max((max - min) * 0.1, 0.25);
  let baseLow = Math.max(0, min - padding), baseHigh = max + padding;
  if (Math.ceil(baseLow * 2) > Math.floor(baseHigh * 2)) {
    const nearestSecond = Math.round(min + max) / 2;
    baseLow = Math.min(baseLow, nearestSecond), baseHigh = Math.max(baseHigh, nearestSecond);
  }
  const low = live !== null && live < baseLow ? Math.max(0, live - padding) : baseLow, high = live !== null && live > baseHigh ? Math.ceil((live + padding) / 5) * 5 : baseHigh;
  return { low, high, baseLow, baseHigh };
}
function timeAxisTicks(low, high) {
  const minimumStep = (high - low) / 5, magnitude = 10 ** Math.floor(Math.log10(Math.max(1, minimumStep))), step = minimumStep <= 0.5 ? 0.5 : [1, 2, 5, 10].find((value) => value * magnitude >= minimumStep) * magnitude, ticks = [];
  for (let second = Math.ceil(low / step) * step; second <= high; second += step) ticks.push(second);
  return ticks;
}
function drawTimeChart(history, art, limit, zoom = 1) {
  const outcomes = autologRows.find((boss) => boss.level === selectedBossName)?.outcomeHistory || EMPTY_OUTCOMES, averages = getCachedTimeTrend(history, outcomes, limit);
  if (!averages.length) return `<div class="history-empty">${t("autolog.no-clear-times")}</div>`;
  const key = `${selectedBossName}:trend`, zoomState = chartZoomLevels.get(key) || { zoom: 1, offset: 0 }, viewport = chartViewport(averages.length, { zoom, offset: zoomState.offset }), start = Math.floor(viewport.start), end = Math.min(averages.length, Math.ceil(viewport.start + viewport.span) + 1), visible = averages.slice(start, end);
  zoom = viewport.zoom, chartZoomLevels.set(key, { zoom, offset: viewport.offset });
  const thresholds = timeChartThresholds(art), rankColorForTime = (seconds) => timeChartRankColor(thresholds, seconds), live = getLiveChartTime(selectedBossName), { low, high, baseLow, baseHigh } = fitTimeChartRange(visible, live), range = Math.max(high - low, 0.1), y = (value) => 92 - (value - low) / range * 84, x = (index) => viewport.span === 0 ? 125 : 20 + (start + index - viewport.start) * 210 / viewport.span, markerCount = averages.length === 1 ? 1 : Math.ceil((averages.length - 1) / limit) + 1, markers = Array.from({ length: markerCount }, (_, index) => {
    const dataPosition = markerCount === 1 ? 0 : index * (averages.length - 1) / (markerCount - 1);
    if (dataPosition < viewport.start || dataPosition > viewport.start + viewport.span) return "";
    const position = dataPosition - start, left = Math.floor(position), right = Math.min(left + 1, visible.length - 1), fraction = position - left, time = visible[left].timeSeconds + (visible[right].timeSeconds - visible[left].timeSeconds) * fraction;
    return `<circle class="trend-marker" cx="${x(position)}" cy="${y(time)}" r="2.7" style="fill:${rankColorForTime(time)}" data-position="${dataPosition}"/>`;
  }).join(""), rankBands = thresholds.map((time, i) => {
    const lower = i === 0 ? low : Math.max(low, thresholds[i - 1]), upper = i === thresholds.length - 1 ? high : Math.min(high, time);
    if (upper <= lower) return null;
    const color = ranksStyles[i]?.background || "#8993a0", top = y(upper), height = y(lower) - top, label = height >= 5 ? `<text x="1" y="${top + height / 2}" dominant-baseline="middle" style="fill:${color}">${safeText(ranks[i] || "")}</text>` : "";
    return { fill: `<rect x="20" y="${top}" width="210" height="${height}" style="fill:${color}"/>`, label };
  }).filter(Boolean), timeAxis = timeAxisTicks(low, high).map((value) => `<g class="time-axis-mark"><line x1="20" y1="${y(value)}" x2="230" y2="${y(value)}"/><text x="249" y="${y(value) + 1.5}" text-anchor="end">${safeText(formatTime(value))}</text></g>`).join(""), segmentColors = [], rankPaths = /* @__PURE__ */ new Map();
  visible.slice(1).forEach((run, index) => {
    const previous = visible[index], color = rankColorForTime((previous.timeSeconds + run.timeSeconds) / 2);
    segmentColors[index] = color;
    const segments = rankPaths.get(color) || [];
    segments.push(`M${x(index)},${y(previous.timeSeconds)}L${x(index + 1)},${y(run.timeSeconds)}`), rankPaths.set(color, segments);
  });
  const runLines = [...rankPaths].map(([color, segments]) => `<path class="ranked-run-line" d="${segments.join(" ")}" style="stroke:${color}"/>`).join(""), barWidth = viewport.span === 0 ? 14 : 210 / viewport.span, deathBarData = visible.map((point, index) => {
    const left = Math.max(20, x(index) - barWidth / 2), right = Math.min(230, x(index) + barWidth / 2);
    if (right <= left || point.deathRate <= 0) return null;
    const height = point.deathRate * 0.84;
    return { x: left, width: right - left, height };
  }).filter(Boolean), deathBars = `<path class="combined-death-bar" data-bars="${safeText(JSON.stringify(deathBarData))}" d="${deathBarPath(deathBarData)}"/>`;
  return `<div class="history-chart-wrap">
        <div class="combined-chart-legend"><span>${t("autolog.clear-times")}</span><span>${t("autolog.death-bars")}</span><strong class="live-chart-time" hidden></strong></div>
        <div class="chart-controls"><span>${limit === 1 ? t("autolog.individual-clear-times") : tf("autolog.average-label", { count: limit })}</span><span><button class="chart-zoom" type="button" data-direction="out" aria-label="${t("autolog.zoom-out")}" ${zoom <= 1 ? "disabled" : ""}>−</button><button class="chart-zoom" type="button" data-direction="in" aria-label="${t("autolog.zoom-in")}" ${zoom >= Math.max(1, averages.length - 1) ? "disabled" : ""}>+</button></span></div>
        <div class="history-svg-wrap"><svg class="history-chart time-history-chart" data-low="${low}" data-high="${high}" data-base-low="${baseLow}" data-base-high="${baseHigh}" viewBox="0 0 250 100" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${t("autolog.average-aria")}">
            <defs>
                <clipPath id="time-plot-clip"><rect x="20" y="0" width="210" height="100"/></clipPath>
                <clipPath id="time-rank-clip"><rect x="20" y="8" width="210" height="84"/></clipPath>
            </defs>
            <g clip-path="url(#time-rank-clip)"><g class="rank-band-fill">${rankBands.map((band) => band.fill).join("")}</g></g>
            <g class="rank-band">${rankBands.map((band) => band.label).join("")}</g>
            ${timeAxis}<g class="time-plot" clip-path="url(#time-plot-clip)">${deathBars}${runLines}
            ${visible.map((a, i) => `<circle cx="${x(i)}" cy="${y(a.timeSeconds)}" r="0" data-point="${i}" data-next-color="${segmentColors[i] || rankColorForTime(a.timeSeconds)}" data-average="${a.timeSeconds}" data-run-start="${a.runStart}" data-run-end="${a.runEnd}" data-death-rate="${a.deathRate.toFixed(1)}"/>`).join("")}
            ${markers}</g><circle class="live-chart-point" cx="233" cy="92" r="2.7" visibility="hidden"><title></title></circle>
        </svg><div class="chart-hover-tooltip" hidden></div></div><div class="history-axis"><span>${tf("autolog.clears-range", { start: visible[0].runStart, end: visible[0].runEnd })}</span><span>${tf("autolog.clears-range", { start: visible[visible.length - 1].runStart, end: visible[visible.length - 1].runEnd })}</span></div>
    </div>`;
}
function sampleTrendAtX(points, x) {
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;
  let left = 0, right = points.length - 1;
  for (; right - left > 1; ) {
    const middle = left + right >> 1;
    points[middle].x <= x ? left = middle : right = middle;
  }
  const fraction = (x - points[left].x) / (points[right].x - points[left].x);
  return points[left].y + (points[right].y - points[left].y) * fraction;
}
function animationCoordinates(values) {
  const coordinates = [...new Set(values)].sort((a, b) => a - b);
  if (coordinates.length <= 2048) return coordinates;
  const left = coordinates[0], right = coordinates[coordinates.length - 1];
  return Array.from({ length: 2048 }, (_, index) => left + (right - left) * index / 2047);
}
function buildTrendTween(source, target) {
  return animationCoordinates([...source, ...target].map((point) => point.x)).map((x) => ({ x, fromY: sampleTrendAtX(source, x), toY: sampleTrendAtX(target, x) }));
}
function interpolateLiveTime(samples, time) {
  for (; samples.length > 1 && samples[1].at <= time; ) samples.shift();
  const first = samples[0], next = samples[1];
  return !next || time <= first.at ? first.seconds : first.seconds + (next.seconds - first.seconds) * (time - first.at) / (next.at - first.at);
}
function bindTimeChartControls(holder, history, art) {
  const key = `${holder.dataset.boss}:trend`, previousAnimation = chartAnimationFrames.get(key);
  previousAnimation && cancelAnimationFrame(previousAnimation), chartAnimationFrames.delete(key);
  let animationVersion = 0, navigationFrame = null, navigationTarget = null, navigationImmediate = !1, lastNavigationTime = 0, livePointFrame = null, verticalFrame = null;
  const liveSamples = [], liveDisplayDelay = 350, liveThresholds = timeChartThresholds(art);
  function stopLivePoint() {
    livePointFrame !== null && cancelAnimationFrame(livePointFrame), livePointFrame = null;
  }
  const stopNavigation = () => {
    navigationFrame !== null && cancelAnimationFrame(navigationFrame), navigationFrame = null, navigationTarget = null;
  };
  disposeTimeChart = () => {
    stopNavigation(), stopLivePoint(), verticalFrame !== null && cancelAnimationFrame(verticalFrame), animationVersion++;
    const frame = chartAnimationFrames.get(key);
    frame && cancelAnimationFrame(frame), chartAnimationFrames.delete(key);
  };
  const fitChart = () => {
    const svg = holder.querySelector(".time-history-chart");
    if (!svg) return;
    const bounds = svg.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const width = bounds.width / bounds.height * 100, previousWidth = svg.viewBox.baseVal.width, factor = width / previousWidth;
    if (Math.abs(factor - 1) < 1e-4) return;
    svg.querySelectorAll("[x], [cx], [x1], [x2], rect[width]").forEach((element) => {
      for (const attribute of ["x", "cx", "x1", "x2", "width"])
        element.hasAttribute(attribute) && element.setAttribute(attribute, Number(element.getAttribute(attribute)) * factor);
    }), svg.querySelectorAll("path.ranked-run-line, path.combined-death-bar").forEach((path) => {
      path.coordinateScale = (path.coordinateScale || 1) * factor, path.setAttribute("transform", `scale(${path.coordinateScale},1)`);
    });
    const animationLayer = svg.querySelector(".curve-animation-layer");
    animationLayer && (animationLayer.coordinateScale = (animationLayer.coordinateScale || 1) * factor);
    const deathLayer = svg.querySelector(".death-animation-layer");
    deathLayer && (deathLayer.coordinateScale = (deathLayer.coordinateScale || 1) * factor), svg.setAttribute("viewBox", `0 0 ${width} 100`);
  };
  timeChartResizeObserver?.disconnect(), timeChartResizeObserver = new ResizeObserver(fitChart), timeChartResizeObserver.observe(holder), fitChart();
  const getCounts = (stateOverride = null) => {
    const clearCount = history.filter((a) => a.cleared).length, total = Math.max(1, trendPointCount(clearCount, Number(holder.dataset.limit))), state = stateOverride || chartZoomLevels.get(key) || { zoom: 1, offset: 0 }, viewport = chartViewport(total, state);
    return { total, count: viewport.span + 1, ...viewport };
  };
  function paintLivePoint() {
    stopLivePoint();
    const svg = holder.querySelector(".time-history-chart");
    if (!svg) return;
    const point = svg.querySelector(".live-chart-point"), label = holder.querySelector(".live-chart-time"), seconds = getLiveChartTime(holder.dataset.boss);
    if (point.setAttribute("visibility", seconds === null ? "hidden" : "visible"), label.hidden = seconds === null, seconds === null) {
      liveSamples.length = 0;
      return;
    }
    liveSamples.length || liveSamples.push({ at: performance.now(), seconds });
    const low = Number(svg.dataset.low), high = Number(svg.dataset.high), range = Math.max(high - low, 0.1), paint = (displayed) => {
      point.setAttribute("cy", 92 - (displayed - low) * 84 / range), point.style.fill = timeChartRankColor(liveThresholds, displayed);
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches)
      liveSamples.splice(0, liveSamples.length - 1), paint(seconds);
    else {
      const frame = (now) => {
        paint(interpolateLiveTime(liveSamples, now - liveDisplayDelay)), livePointFrame = liveSamples.length > 1 ? requestAnimationFrame(frame) : null;
      };
      frame(performance.now());
    }
    label.textContent = `${t("autolog.live-attempt")}: ${formatTime(seconds)}`, point.querySelector("title").textContent = label.textContent;
  }
  function animateVerticalRange(svg, previous, animatePlot) {
    const low = Number(svg.dataset.low), high = Number(svg.dataset.high);
    if (!previous || low === previous.low && high === previous.high || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layers = [svg.querySelector(".rank-band-fill")];
    animatePlot && layers.push(svg.querySelector(".time-plot"));
    const labels = Array.from(svg.querySelectorAll(".time-axis-mark text, .rank-band text"), (element) => [element, Number(element.getAttribute("y"))]), grid = Array.from(svg.querySelectorAll(".time-axis-mark line"), (element) => [element, Number(element.getAttribute("y1"))]), livePoint = svg.querySelector(".live-chart-point"), markers = animatePlot ? [...svg.querySelectorAll(".trend-marker")] : [], started = performance.now();
    function frame(now) {
      const progress = Math.min(1, (now - started) / 260), eased = 1 - (1 - progress) ** 3, displayLow = previous.low + (low - previous.low) * eased, displayHigh = previous.high + (high - previous.high) * eased;
      svg.displayRange = { low: displayLow, high: displayHigh };
      const displaySpan = Math.max(displayHigh - displayLow, 0.1), scale = Math.max(high - low, 0.1) / displaySpan, shift = 92 * (1 - scale) - (low - displayLow) * 84 / displaySpan;
      for (const layer of layers) layer.setAttribute("transform", `translate(0,${shift}) scale(1,${scale})`);
      for (const [element, y] of labels) element.setAttribute("y", y * scale + shift);
      for (const [element, y] of grid)
        element.setAttribute("y1", y * scale + shift), element.setAttribute("y2", y * scale + shift);
      const cy = Number(livePoint.getAttribute("cy"));
      livePoint.setAttribute("transform", `translate(0,${cy * (scale - 1) + shift})`);
      for (const marker of markers) {
        const y = Number(marker.getAttribute("cy"));
        marker.setAttribute("transform", `translate(0,${y * (1 - 1 / scale)}) scale(1,${1 / scale})`);
      }
      verticalFrame = progress < 1 ? requestAnimationFrame(frame) : null;
    }
    frame(started);
  }
  const update = (next, animate = !1) => {
    animate && stopNavigation();
    const version = ++animationVersion, svg = holder.querySelector(".time-history-chart"), previousRange = svg?.displayRange || svg && { low: Number(svg.dataset.low), high: Number(svg.dataset.high) };
    verticalFrame !== null && cancelAnimationFrame(verticalFrame), verticalFrame = null;
    const oldCurve = svg?.querySelector(".curve-animation-layer"), startBars = animate ? readDeathBars(svg) : [], startMarkers = animate && svg ? Array.from(svg.querySelectorAll(".trend-marker"), (marker) => ({
      x: Number(marker.getAttribute("cx")),
      y: Number(marker.getAttribute("cy")),
      radius: Number(marker.getAttribute("r")),
      opacity: Number(marker.getAttribute("opacity") ?? 1),
      fill: marker.style.fill
    })).sort((a, b) => a.x - b.x) : [], startPoints = animate && oldCurve?.curveState ? oldCurve.curveState.map((point) => ({
      x: point.x * (oldCurve.coordinateScale || 1),
      y: point.y
    })) : animate && svg ? Array.from(svg.querySelectorAll("circle[data-point]"), (point) => ({
      x: Number(point.getAttribute("cx")),
      y: Number(point.getAttribute("cy"))
    })) : null, previousFrame = chartAnimationFrames.get(key);
    previousFrame && cancelAnimationFrame(previousFrame), chartAnimationFrames.delete(key), chartZoomLevels.set(key, next), holder.dataset.zoom = String(next.zoom), holder.innerHTML = drawTimeChart(history, art, Number(holder.dataset.limit), next.zoom), fitChart(), paintLivePoint();
    const newSvg = holder.querySelector(".time-history-chart");
    if (newSvg && animateVerticalRange(newSvg, previousRange, !startPoints?.length), !startPoints?.length) return;
    const points = Array.from(newSvg?.querySelectorAll("circle[data-point]") || []);
    if (!points.length) return;
    const targets = points.map((point) => ({ x: Number(point.getAttribute("cx")), y: Number(point.getAttribute("cy")), color: point.dataset.nextColor })), curveTween = buildTrendTween(startPoints, targets), lines = Array.from(newSvg.querySelectorAll(".ranked-run-line")), markers = Array.from(newSvg.querySelectorAll(".trend-marker")), markerTargets = markers.map((marker) => ({
      x: Number(marker.getAttribute("cx")),
      y: Number(marker.getAttribute("cy")),
      radius: 2.7,
      opacity: 1
    })), markerMatches = /* @__PURE__ */ new Map(), usedMarkers = /* @__PURE__ */ new Set();
    startMarkers.length <= markers.length ? startMarkers.forEach((marker, index) => {
      const target = Math.round(index * (markers.length - 1) / Math.max(1, startMarkers.length - 1));
      markerMatches.set(target, marker), usedMarkers.add(index);
    }) : markers.forEach((marker, index) => {
      const source = Math.round(index * (startMarkers.length - 1) / Math.max(1, markers.length - 1));
      markerMatches.set(index, startMarkers[source]), usedMarkers.add(source);
    });
    const nearest = (items, x) => items.reduce((best, item) => !best || Math.abs(item.x - x) < Math.abs(best.x - x) ? item : best, null), markerTransitions = markers.map((element, index) => {
      const target = markerTargets[index], source = markerMatches.get(index) || { ...nearest(startMarkers, target.x) || target, radius: 0, opacity: 0 };
      return { element, source, target, exiting: !1 };
    });
    startMarkers.forEach((source, index) => {
      if (usedMarkers.has(index)) return;
      const element = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      element.setAttribute("class", "trend-marker"), element.style.fill = source.fill, element.style.pointerEvents = "none", newSvg.appendChild(element), markerTransitions.push({
        element,
        source,
        target: { ...nearest(markerTargets, source.x) || source, radius: 0, opacity: 0 },
        exiting: !0
      });
    });
    const bars = Array.from(newSvg.querySelectorAll(".combined-death-bar")), targetBars = readDeathBars(newSvg), makeSvg = (tag, attributes) => {
      const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
      return Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value)), element;
    }, curveLayer = makeSvg("g", { class: "curve-animation-layer", "pointer-events": "none" }), plot = newSvg.querySelector(".time-plot") || newSvg;
    plot.insertBefore(curveLayer, lines[0] || points[0]), curveLayer.curveState = curveTween.map((point) => ({ x: point.x, y: point.fromY }));
    const curvePaths = /* @__PURE__ */ new Map();
    curveTween.slice(1).forEach((point, index) => {
      const middleX = (curveTween[index].x + point.x) / 2;
      let left = 0, right = targets.length - 1;
      for (; right - left > 1; ) {
        const middle = left + right >> 1;
        targets[middle].x <= middleX ? left = middle : right = middle;
      }
      const color = targets[left].color || "#8993a0";
      let group = curvePaths.get(color);
      if (!group) {
        const element = makeSvg("path", { class: "ranked-run-line" });
        element.style.stroke = color, curveLayer.appendChild(element), group = { element, segments: [] }, curvePaths.set(color, group);
      }
      group.segments.push(index);
    });
    const barLayer = makeSvg("g", { class: "death-animation-layer", "pointer-events": "none" });
    plot.insertBefore(barLayer, plot.firstChild);
    const barEdges = animationCoordinates([...startBars, ...targetBars].flatMap((bar) => [bar.x, bar.x + bar.width])), heightAt = (rects, x) => {
      let left = 0, right = rects.length;
      for (; left < right; ) {
        const middle = left + right >> 1;
        rects[middle].x <= x ? left = middle + 1 : right = middle;
      }
      const bar = rects[left - 1];
      return bar && x <= bar.x + bar.width ? bar.height : 0;
    }, barTween = barEdges.slice(1).map((right, index) => {
      const x = barEdges[index], middle = (x + right) / 2;
      return { x, width: right - x, from: heightAt(startBars, middle), to: heightAt(targetBars, middle) };
    });
    barLayer.barState = barTween.map((bar) => ({ x: bar.x, width: bar.width, height: bar.from }));
    const animatedBars = makeSvg("path", { class: "combined-death-bar" });
    barLayer.appendChild(animatedBars), [...lines, ...bars].forEach((element) => {
      element.style.visibility = "hidden";
    });
    const started = performance.now(), duration = 260;
    function frame(now) {
      if (version !== animationVersion || !holder.isConnected || holder.querySelector(".time-history-chart") !== newSvg) return;
      const progress = Math.min(1, (now - started) / duration), eased = 1 - Math.pow(1 - progress, 3);
      barTween.forEach(({ from, to }, index) => {
        barLayer.barState[index].height = from + (to - from) * eased;
      }), animatedBars.setAttribute("d", deathBarPath(barLayer.barState)), curveTween.forEach((point, index) => {
        curveLayer.curveState[index].y = point.fromY + (point.toY - point.fromY) * eased;
      }), curvePaths.forEach(({ element, segments }) => {
        let path = "";
        for (const index of segments) {
          const a = curveLayer.curveState[index], b = curveLayer.curveState[index + 1];
          path += `M${a.x},${a.y}L${b.x},${b.y} `;
        }
        element.setAttribute("d", path);
      }), markerTransitions.forEach(({ element, source, target, exiting }) => {
        element.setAttribute("cx", source.x + (target.x - source.x) * eased), element.setAttribute("cy", source.y + (target.y - source.y) * eased), element.setAttribute("r", source.radius + (target.radius - source.radius) * eased), element.setAttribute("opacity", source.opacity + (target.opacity - source.opacity) * eased), progress === 1 && exiting && element.remove();
      }), progress < 1 ? chartAnimationFrames.set(key, requestAnimationFrame(frame)) : (chartAnimationFrames.delete(key), curveLayer.remove(), barLayer.remove(), [...lines, ...bars].forEach((element) => {
        element.style.visibility = "";
      }));
    }
    frame(started);
  };
  holder.updateTrend = update, holder.updateLivePoint = () => {
    const svg = holder.querySelector(".time-history-chart");
    if (!svg) return;
    const seconds = getLiveChartTime(holder.dataset.boss);
    seconds !== null && (seconds < (liveSamples.at(-1)?.seconds ?? seconds) && (liveSamples.length = 0), liveSamples.push({ at: performance.now(), seconds }));
    const low = Number(svg.dataset.low), high = Number(svg.dataset.high), baseLow = Number(svg.dataset.baseLow), baseHigh = Number(svg.dataset.baseHigh), outside = seconds !== null && (seconds < low || seconds > high), canReset = (low < baseLow || high > baseHigh) && (seconds === null || seconds >= baseLow && seconds <= baseHigh);
    outside || canReset ? update(chartZoomLevels.get(key) || { zoom: 1, offset: 0 }, !0) : paintLivePoint();
  }, paintLivePoint();
  const navigate = (next, immediate = !1) => {
    const { total } = getCounts(), target = chartViewport(total, next);
    if (navigationTarget = { zoom: target.zoom, offset: target.offset }, navigationImmediate = immediate, navigationFrame !== null) return;
    lastNavigationTime = performance.now();
    const frame = (now) => {
      if (navigationFrame = null, !holder.isConnected || !navigationTarget) return;
      const current = chartZoomLevels.get(key) || { zoom: 1, offset: 0 }, target2 = navigationTarget, blend = navigationImmediate ? 1 : 1 - Math.exp(-Math.max(8, Math.min(64, now - lastNavigationTime)) / 65);
      lastNavigationTime = now;
      const zoom = Math.exp(Math.log(current.zoom) + (Math.log(target2.zoom) - Math.log(current.zoom)) * blend), offset = current.offset + (target2.offset - current.offset) * blend, done = Math.abs(Math.log(zoom / target2.zoom)) < 1e-4 && Math.abs(offset - target2.offset) < 1e-4;
      update(done ? target2 : { zoom, offset }), done ? navigationTarget = null : navigationFrame = requestAnimationFrame(frame);
    };
    navigationFrame = requestAnimationFrame(frame);
  };
  holder.addEventListener("click", (event) => {
    const button = event.target.closest(".chart-zoom");
    if (!button || button.disabled) return;
    const current = getCounts(navigationTarget), zoom = Math.max(1, Math.min(Math.max(1, current.total - 1), current.zoom * (button.dataset.direction === "in" ? 1.25 : 0.8))), nextSpan = (current.total - 1) / zoom, start = Math.max(0, Math.min(current.total - 1 - nextSpan, current.start + (current.span - nextSpan) / 2));
    navigate({ zoom, offset: current.total - 1 - nextSpan - start });
  }), holder.addEventListener("wheel", (event) => {
    if (!event.target.closest(".time-history-chart")) return;
    event.preventDefault();
    const current = getCounts(navigationTarget);
    if (current.total <= 1) return;
    const rect = holder.querySelector(".time-history-chart").getBoundingClientRect(), plotWidth = rect.width * 0.84, fraction = Math.min(1, Math.max(0, (event.clientX - rect.left - rect.width * 0.08) / plotWidth)), unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      const delta = (event.shiftKey ? event.deltaY : event.deltaX) * unit, start2 = Math.max(0, Math.min(current.total - 1 - current.span, current.start + delta / plotWidth * current.span));
      navigate({ zoom: current.zoom, offset: current.total - 1 - current.span - start2 });
      return;
    }
    const anchor = current.start + fraction * current.span, factor = Math.exp(-Math.max(-240, Math.min(240, event.deltaY * unit)) * 2e-3), zoom = Math.max(1, Math.min(Math.max(1, current.total - 1), current.zoom * factor)), nextSpan = (current.total - 1) / zoom, start = Math.max(0, Math.min(current.total - 1 - nextSpan, anchor - fraction * nextSpan));
    navigate({ zoom, offset: current.total - 1 - nextSpan - start });
  }, { passive: !1 });
  let drag = null;
  holder.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !event.target.closest(".time-history-chart")) return;
    stopNavigation();
    const { total, count, start, span, zoom } = getCounts();
    total <= count || (drag = { pointerId: event.pointerId, x: event.clientX, start, total, count, span, zoom }, holder.setPointerCapture(event.pointerId), holder.classList.add("is-panning"));
  }), holder.addEventListener("pointermove", (event) => {
    if (drag && drag.pointerId === event.pointerId) {
      const rect = holder.querySelector(".time-history-chart")?.getBoundingClientRect();
      if (!rect) return;
      const shift = -(event.clientX - drag.x) / (rect.width * 0.84) * drag.span, start = Math.min(drag.total - 1 - drag.span, Math.max(0, drag.start + shift));
      navigate({ zoom: drag.zoom, offset: drag.total - 1 - drag.span - start }, !0);
      return;
    }
    const svg = holder.querySelector(".time-history-chart"), tooltip = holder.querySelector(".chart-hover-tooltip");
    if (!svg || !tooltip || !event.target.closest(".time-history-chart")) return;
    const point = nearestChartPoint(svg, event.clientX);
    if (!point) return;
    tooltip.dataset.point !== point.dataset.point && (tooltip.innerHTML = `<strong>${t(Number(holder.dataset.limit) === 1 ? "autolog.individual-clear" : "autolog.average-time")}: ${safeText(formatTime(Number(point.dataset.average)))}</strong><span>${tf("autolog.clears-range", { start: point.dataset.runStart, end: point.dataset.runEnd })}</span><span>${tf(Number(holder.dataset.limit) === 1 ? "autolog.death-rate-value" : "autolog.average-death-rate", { percent: point.dataset.deathRate })}</span>`, tooltip.dataset.point = point.dataset.point), tooltip.hidden = !1;
    const box = holder.querySelector(".history-svg-wrap").getBoundingClientRect();
    tooltip.style.left = `${Math.min(box.width - tooltip.offsetWidth - 6, Math.max(6, event.clientX - box.left + 12))}px`, tooltip.style.top = `${Math.max(4, event.clientY - box.top - tooltip.offsetHeight - 8)}px`;
  });
  const stopPanning = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null, holder.classList.remove("is-panning");
    const tooltip = holder.querySelector(".chart-hover-tooltip");
    tooltip && !holder.matches(":hover") && (tooltip.hidden = !0);
  };
  holder.addEventListener("pointerup", stopPanning), holder.addEventListener("pointercancel", stopPanning), holder.addEventListener("pointerleave", () => {
    if (!drag) {
      const tooltip = holder.querySelector(".chart-hover-tooltip");
      tooltip && (tooltip.hidden = !0);
    }
  });
}
