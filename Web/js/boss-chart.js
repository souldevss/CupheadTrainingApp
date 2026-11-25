// v1.0's curve transition: 260 ms, cubic ease-out, with interrupted motion retargeted.
const GRAPH_TRANSITION_MS = 260;
function graphTransitionProgress(started, now = performance.now()) {
  return 1 - Math.pow(1 - Math.min(1,Math.max(0,(now-started)/GRAPH_TRANSITION_MS)),3);
}
function maxSmoothing(count) { return count <= 1 ? 1 : Math.floor(count / 2) + 1; }
function trendPointCount(count, strength) {
  if (count <= 1) return count;
  return Math.max(2, Math.round(count - (count - 2) * Math.min(1, (strength - 1) / (maxSmoothing(count) - 1))));
}
function averageTrend(clears, intervals, strength, pointLimit = Infinity) {
  const width = Math.min(strength, clears.length), times = [0], deaths = [0], attempts = [0];
  clears.forEach((clear, i) => { times.push(times[i] + clear.timeSeconds); deaths.push(deaths[i] + (intervals[i]?.deaths || 0)); attempts.push(attempts[i] + (intervals[i]?.attempts || 0)); });
  const count = Math.min(pointLimit, trendPointCount(clears.length, strength));
  return Array.from({length:count}, (_, i) => {
    const position = count <= 1 ? 0 : i * (clears.length - 1) / (count - 1), first = Math.round(position - (width - 1) / 2), start = Math.max(0, first), end = Math.min(clears.length, first + width), total = attempts[end] - attempts[start];
    return {position, timeSeconds:(times[end] - times[start]) / (end - start), deathRate:total ? 100 * (deaths[end] - deaths[start]) / total : 0, runStart:start + 1, runEnd:end};
  });
}
function sampleTrendAtX(points, x) {
  if (x <= points[0].x) return points[0].y;
  if (x >= points.at(-1).x) return points.at(-1).y;
  let lo = 0, hi = points.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (points[mid].x <= x) lo = mid; else hi = mid; }
  return points[lo].y + (points[hi].y - points[lo].y) * (x - points[lo].x) / (points[hi].x - points[lo].x);
}
function plotSamples(points, budget = 500, field = "timeSeconds") {
  if (points.length <= budget) return points;
  const result = [points[0]], size = Math.ceil(points.length / (budget / 2));
  for (let start = 1; start < points.length - 1; start += size) {
    let low = start, high = start;
    for (let i = start; i < Math.min(points.length - 1, start + size); i++) { if (points[i][field] < points[low][field]) low = i; if (points[i][field] > points[high][field]) high = i; }
    for (const i of [...new Set([low, high])].sort((a,b) => a-b)) result.push(points[i]);
  }
  result.push(points.at(-1)); return result;
}
function getCachedTimeTrend(history, outcomes, strength) {
  let cache = timeTrendCache.get(history);
  if (!cache || cache.outcomes !== outcomes) {
    const clears = history.filter(row => row.cleared), intervals = []; let deaths = 0, attempts = 0;
    for (const outcome of outcomes) { attempts++; if (outcome.isDeath) deaths++; if (outcome.isClear) { intervals.push({deaths,attempts}); deaths = attempts = 0; } }
    if (intervals.length && attempts) { intervals.at(-1).deaths += deaths; intervals.at(-1).attempts += attempts; }
    cache = {outcomes,clears,intervals,trends:new Map()}; timeTrendCache.set(history,cache);
  }
  if (!cache.trends.has(strength)) { cache.trends.set(strength,averageTrend(cache.clears,cache.intervals,strength)); if (cache.trends.size > 4) cache.trends.delete(cache.trends.keys().next().value); }
  return cache.trends.get(strength);
}
function timeChartThresholds(art) { return art.fRankTime ? generateRankTimes(art.fRankTime,{wrTime:art.wrTime,fallbackMultipliers:getLogCategoryData()?.rankMultipliers || defaultRankMultipliers}) : []; }
function timeChartRankColor(thresholds, seconds) { const index = thresholds.findIndex(time => seconds <= time); return ranksStyles[index < 0 ? ranks.length - 1 : index]?.background || "#b8a3be"; }
function timeAxisTicks(low, high) {
  const minimum = (high - low) / 5, magnitude = 10 ** Math.floor(Math.log10(Math.max(1,minimum))), step = minimum <= .5 ? .5 : [1,2,5,10].find(n => n * magnitude >= minimum) * magnitude, result = [];
  for (let n = Math.ceil(low / step) * step; n <= high; n += step) result.push(n); return result;
}
let liveAutologAttempt = null;
function getLiveChartTime(name) {
  const live = liveAutologAttempt, best = autologRows.find(row => row.level === name)?.bestSeconds;
  if (!live || live.bossName !== name || !Number.isFinite(live.seconds) || !Number.isFinite(best) || live.seconds < best) return null;
  return live.categoryKey === selectedLogCategory || live.categoryKey === "DLC:shared" && selectedLogCategory.startsWith("DLC:") ? live.seconds : null;
}
window.updateAutologLiveAttempt = attempt => { liveAutologAttempt = attempt; document.querySelector(".time-chart-content")?.updateLivePoint?.(); };
function drawTimeChart(history) {
  if (!history.some(row => row.cleared)) return `<div class="history-empty">${t("autolog.no-clear-times")}</div>`;
  return `<div class="history-chart-wrap"><div class="combined-chart-legend"><span>${t("autolog.clear-times")}</span><span>${t("autolog.death-line")}</span><strong class="live-chart-time" hidden></strong></div>
    <div class="chart-controls"><span class="chart-average-description"></span><span><button class="chart-zoom" data-direction="out" type="button" aria-label="${t("autolog.zoom-out")}">−</button><button class="chart-zoom" data-direction="in" type="button" aria-label="${t("autolog.zoom-in")}">+</button></span></div>
    <div class="history-svg-wrap"><svg class="history-chart time-history-chart" role="img" aria-label="${t("autolog.average-aria")}"></svg><div class="chart-hover-tooltip" hidden></div></div><div class="history-axis"><span></span><span></span></div></div>`;
}
function bindTimeChartControls(holder, history, art) {
  const svg = holder.querySelector("svg"), tooltip = holder.querySelector(".chart-hover-tooltip"); if (!svg) return;
  const boss = selectedBossName, key = `${boss}:trend`, outcomes = autologRows.find(row => row.level === boss)?.outcomeHistory || [], clears = history.filter(row => row.cleared), thresholds = timeChartThresholds(art);
  let state = chartZoomLevels.get(key) || {zoom:1,offset:0}, timer = null, hoverTimer = null, dead = false, drag = null, geometry, shown = [], pointer, lastShapeKey, motion = null, displayedCurve = [], displayedDots = new Map();
  function mixCurve(points, transition, progress) {
    if (!transition || progress >= 1) return points;
    return points.map(point=>{const time=sampleTrendAtX(transition.times,point.position),death=sampleTrendAtX(transition.deaths,point.position);return {...point,timeSeconds:time+(point.timeSeconds-time)*progress,deathRate:death+(point.deathRate-death)*progress};});
  }
  function viewport() { const span = (clears.length - 1) / Math.max(1,state.zoom), offset = Math.max(0,Math.min(clears.length - 1 - span,state.offset)); return {span,start:clears.length - 1 - span - offset}; }
  function schedule() { if (timer === null && !dead) timer = setTimeout(() => {timer = null; render();},33); }
  function render() {
    if (dead || !holder.isConnected) return;
    const bounds = svg.getBoundingClientRect(); if (!bounds.width || !bounds.height) return;
    const width = bounds.width, height = bounds.height, left = 32, right = width - 48, top = 14, bottom = height - 18, strength = Number(holder.dataset.limit);
    let view = viewport();
    const trend = getCachedTimeTrend(history,outcomes,strength), start = Math.max(0,Math.floor(view.start)), end = Math.min(clears.length,Math.ceil(view.start + view.span) + 1);
    shown = trend.filter((point,i) => point.position >= view.start && point.position <= view.start + view.span || i > 0 && trend[i-1].position < view.start && point.position > view.start || i < trend.length-1 && point.position < view.start+view.span && trend[i+1].position > view.start+view.span);
    if (!shown.length) shown = trend;
    const visibleCurve = shown.map(point=>({x:point.position,y:point.timeSeconds})), from = sampleTrendAtX(visibleCurve,view.start), to = sampleTrendAtX(visibleCurve,view.start+view.span);
    let low = Math.min(from,to), high = Math.max(from,to);
    for (const point of shown) if (point.position >= view.start && point.position <= view.start+view.span) {low = Math.min(low,point.timeSeconds); high = Math.max(high,point.timeSeconds);}
    const live = getLiveChartTime(boss); if (live !== null) {low = Math.min(low,live);high = Math.max(high,live);}
    const padding = Math.max(.25,(high-low)*.1); low = Math.max(0,low-padding); high += padding;
    const shapeKey = `${strength}:${state.zoom}:${state.offset}`, now = performance.now();
    if (shapeKey !== lastShapeKey) {
      if (geometry && displayedCurve.length) {
        const previous = motion, previousProgress = previous ? graphTransitionProgress(previous.started,now) : 1;
        const fromLow = previous ? previous.low+(previous.targetLow-previous.low)*previousProgress : geometry.low, fromHigh = previous ? previous.high+(previous.targetHigh-previous.high)*previousProgress : geometry.high;
        const fromView = previous ? {start:previous.view.start+(previous.targetView.start-previous.view.start)*previousProgress,span:previous.view.span+(previous.targetView.span-previous.view.span)*previousProgress} : {...geometry.view};
        const fromCurve = previous ? mixCurve(previous.targetCurve,previous,previousProgress) : displayedCurve;
        const fromDots = previous ? new Map([...new Set([...previous.dots.keys(),...previous.targetDots])].map(index=>{const from=previous.dots.get(index)||0,target=previous.targetDots.has(index)?1.8:0;return [index,from+(target-from)*previousProgress];})) : new Map(displayedDots);
        motion = {started:now,low:fromLow,high:fromHigh,view:fromView,times:fromCurve.map(p=>({x:p.position,y:p.timeSeconds})),deaths:fromCurve.map(p=>({x:p.position,y:p.deathRate})),dots:fromDots,targetDots:new Set(),targetLow:low,targetHigh:high,targetView:{...view},targetCurve:plotSamples(shown)};
      }
      lastShapeKey = shapeKey;
    }
    const progress = motion ? graphTransitionProgress(motion.started,now) : 1;
    if (motion && progress < 1) {
      low = motion.low+(low-motion.low)*progress; high = motion.high+(high-motion.high)*progress;
      view = {start:motion.view.start+(view.start-motion.view.start)*progress,span:motion.view.span+(view.span-motion.view.span)*progress};
    }
    const x = index => view.span ? left + (index-view.start)/view.span*(right-left) : (left+right)/2, y = time => bottom - (time-low)/(high-low)*(bottom-top), dy = rate => bottom - rate/100*(bottom-top);
    geometry = {width,height,left,right,top,bottom,view,low,high,x,y};
    const samples = mixCurve(plotSamples(shown),motion,progress), paths = new Map();
    displayedCurve = samples;
    samples.slice(1).forEach((point,i) => { const previous = samples[i], color = timeChartRankColor(thresholds,(point.timeSeconds+previous.timeSeconds)/2), parts = paths.get(color) || []; parts.push(`M${x(previous.position)},${y(previous.timeSeconds)}L${x(point.position)},${y(point.timeSeconds)}`); paths.set(color,parts); });
    const dotStep = Math.max(1,Math.ceil((end-start)/Math.max(40,Math.floor((right-left)/4)))), dots = [], targetDots = new Set();
    for (let i=start;i<end;i+=dotStep)targetDots.add(i);
    if(motion)motion.targetDots=targetDots;
    displayedDots=new Map();
    for(const i of new Set([...targetDots,...(motion && progress<1?motion.dots.keys():[])])) {
      const target=targetDots.has(i)?1.8:0,from=motion?.dots.get(i)||0,radius=motion && progress<1?from+(target-from)*progress:target;
      if(radius<=.01)continue;
      displayedDots.set(i,radius);
      dots.push(`<circle class="attempt-dot" cx="${x(i)}" cy="${y(clears[i].timeSeconds)}" r="${radius}" style="fill:${timeChartRankColor(thresholds,clears[i].timeSeconds)}"/>`);
    }
    const deathPath = plotSamples(shown,500,"deathRate").map((point,i) => {
      const value = motion && progress < 1 ? sampleTrendAtX(motion.deaths,point.position)+(point.deathRate-sampleTrendAtX(motion.deaths,point.position))*progress : point.deathRate;
      return `${i ? "L" : "M"}${x(point.position)},${dy(value)}`;
    }).join("");
    svg.setAttribute("viewBox",`0 0 ${width} ${height}`);
    svg.innerHTML = `<defs><clipPath id="boss-plot-clip"><rect x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"/></clipPath></defs>${timeAxisTicks(low,high).map(time=>`<g class="time-axis-mark"><line x1="${left}" x2="${right}" y1="${y(time)}" y2="${y(time)}"/><text x="${width-3}" y="${y(time)+4}" text-anchor="end">${safeText(formatTime(time))}</text></g>`).join("")}
      <g clip-path="url(#boss-plot-clip)"><path class="death-rate-line" d="${deathPath}"/>${dots.join("")}${[...paths].map(([color,parts])=>`<path class="ranked-run-line" stroke="${color}" d="${parts.join(" ")}"/>`).join("")}</g><circle class="live-chart-point" r="3" visibility="hidden"/>`;
    holder.querySelector('[data-direction="out"]').disabled = state.zoom <= 1; holder.querySelector('[data-direction="in"]').disabled = state.zoom >= Math.max(1,clears.length-1);
    holder.querySelector(".chart-average-description").textContent = strength === 1 ? t("autolog.individual-clear-times") : tf("autolog.average-label",{count:strength});
    const labels = holder.querySelectorAll(".history-axis span"); labels[0].textContent = tf("autolog.clears-range",{start:start+1,end:start+1}); labels[1].textContent = tf("autolog.clears-range",{start:end,end});
    paintLive(); showHover();
    if (motion && progress < 1) schedule(); else motion = null;
  }
  function paintLive() {
    if (!geometry) return;
    const seconds = getLiveChartTime(boss), point = svg.querySelector(".live-chart-point"), label = holder.querySelector(".live-chart-time");
    label.hidden = seconds === null; point.setAttribute("visibility",seconds === null ? "hidden" : "visible"); if (seconds === null) return;
    if (seconds > geometry.high || seconds < geometry.low) {schedule(); return;}
    point.setAttribute("cx",geometry.right+7); point.setAttribute("cy",geometry.y(seconds)); point.style.fill = timeChartRankColor(thresholds,seconds); label.textContent = `${t("autolog.live-attempt")}: ${formatTime(seconds)}`;
  }
  function showHover() {
    if (!pointer || !geometry || drag) {tooltip.hidden = true;return;}
    const bounds = svg.getBoundingClientRect(), px = pointer.x-bounds.left;
    if (px < geometry.left || px > geometry.right) {tooltip.hidden = true;return;}
    const position = geometry.view.start+(px-geometry.left)/(geometry.right-geometry.left)*geometry.view.span;
    let lo = 0, hi = shown.length-1; while(hi-lo>1){const mid=(lo+hi)>>1;if(shown[mid].position<=position)lo=mid;else hi=mid;}
    const p = Math.abs(shown[lo].position-position)<=Math.abs(shown[hi].position-position)?shown[lo]:shown[hi];
    tooltip.textContent = `${formatTime(p.timeSeconds)} · ${tf("autolog.clears-range",{start:p.runStart,end:p.runEnd})} · ${tf("autolog.overall-deaths-percent",{percent:new Intl.NumberFormat(getActiveLanguage(),{style:"percent",maximumFractionDigits:1}).format(p.deathRate/100)})}`;
    tooltip.hidden = false; tooltip.style.left = Math.max(0,Math.min(bounds.width-tooltip.offsetWidth,px+8))+"px"; tooltip.style.top = Math.max(0,pointer.y-bounds.top-tooltip.offsetHeight-8)+"px";
  }
  function navigate(zoom,offset) { const max = Math.max(1,clears.length-1); state = {zoom:Math.max(1,Math.min(max,zoom)),offset}; const span=(clears.length-1)/state.zoom;state.offset=Math.max(0,Math.min(clears.length-1-span,state.offset));chartZoomLevels.set(key,state);schedule(); }
  function zoom(factor,anchor=.5) { const old=viewport(), next=Math.max(1,Math.min(Math.max(1,clears.length-1),state.zoom*factor)), span=(clears.length-1)/next; navigate(next,clears.length-1-span-(old.start+anchor*(old.span-span))); }
  holder.querySelectorAll("[data-direction]").forEach(button=>button.addEventListener("click",()=>zoom(button.dataset.direction==="in"?1.25:.8)));
  svg.addEventListener("wheel",event=>{if(clears.length<2)return;event.preventDefault();const bounds=svg.getBoundingClientRect();if(event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))navigate(state.zoom,state.offset-(event.shiftKey?event.deltaY:event.deltaX)/bounds.width*viewport().span);else zoom(Math.exp(-Math.max(-240,Math.min(240,event.deltaY))*.002),Math.max(0,Math.min(1,(event.clientX-bounds.left-geometry.left)/(geometry.right-geometry.left))));},{passive:false});
  svg.addEventListener("pointerdown",event=>{if(event.button!==0||state.zoom<=1)return;drag={id:event.pointerId,x:event.clientX,offset:state.offset};svg.setPointerCapture(event.pointerId);tooltip.hidden=true;});
  svg.addEventListener("pointermove",event=>{if(drag?.id===event.pointerId)navigate(state.zoom,drag.offset+(event.clientX-drag.x)/(geometry.right-geometry.left)*viewport().span);else{pointer={x:event.clientX,y:event.clientY};if(hoverTimer===null)hoverTimer=setTimeout(()=>{hoverTimer=null;showHover();},33);}});
  svg.addEventListener("lostpointercapture",()=>{drag=null;}); svg.addEventListener("pointerleave",()=>{pointer=null;tooltip.hidden=true;});
  holder.updateTrend = next=>{if(next)state=next;chartZoomLevels.set(key,state);schedule();}; holder.updateLivePoint=paintLive;
  timeChartResizeObserver?.disconnect(); timeChartResizeObserver=new ResizeObserver(schedule);timeChartResizeObserver.observe(holder);
  disposeTimeChart=()=>{dead=true;clearTimeout(timer);clearTimeout(hoverTimer);timeChartResizeObserver?.disconnect();}; render();
}
