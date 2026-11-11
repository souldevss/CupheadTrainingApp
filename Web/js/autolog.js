activeCategory = getInitialCategory();
activeSubOption = getInitialSubOption();
saveCategorySelection();
let autologRows = [], selectedLogCategory = getSelectedCategoryKey();
["1-1", "legacy", "DLC:lobber", "DLC:charge"].includes(selectedLogCategory) || (selectedLogCategory = "1-1");
let selectedBossName = null, logView = "bosses", selectedDetailTab = "progress", selectedAverageWindow = 10, lastBossDetailSignature = null;
const chartZoomLevels = /* @__PURE__ */ new Map(), chartAnimationFrames = /* @__PURE__ */ new Map(), timeTrendCache = /* @__PURE__ */ new WeakMap();
let timeChartResizeObserver = null, disposeTimeChart = null, pendingSmoothingFrame = null;
window.stopAutologWork = function() {
  disposeTimeChart?.(), disposeTimeChart = null, timeChartResizeObserver?.disconnect(), timeChartResizeObserver = null;
  for (const frame of chartAnimationFrames.values()) cancelAnimationFrame(frame);
  chartAnimationFrames.clear(), pendingSmoothingFrame !== null && cancelAnimationFrame(pendingSmoothingFrame), pendingSmoothingFrame = null;
}, window.releaseAutologPage = function() {
  window.stopAutologWork(), document.getElementById("autolog-detail-view").replaceChildren(), document.getElementById("autolog-summary").replaceChildren(), document.getElementById("autolog-recent").replaceChildren(), document.getElementById("projection-splits").replaceChildren(), document.getElementById("projection-summary").replaceChildren(), document.getElementById("projection-target-result").replaceChildren(), autologRows = [], autologRecentRows = [], lastBossDetailSignature = null;
};
const bossArt = /* @__PURE__ */ new Map();
function getLogCategoryData() {
  const category = categories.find((category2) => category2.id === (selectedLogCategory.startsWith("DLC:") ? "DLC" : selectedLogCategory));
  return category?.subOptions?.find((option) => option.id === selectedLogCategory.split(":")[1]) || category;
}
function refreshBossArt() {
  bossArt.clear(), (getLogCategoryData()?.islands || []).flatMap((island) => island.levels).forEach((boss) => bossArt.set(boss.name, boss));
}
refreshBossArt();
function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}
function showBossDetail(name) {
  selectedBossName = name, lastBossDetailSignature = null, document.getElementById("autolog-list-view").hidden = !0;
  const detail = document.getElementById("autolog-detail-view");
  detail.hidden = !1, renderBossDetail();
}
function getTimeChartZoom(bossName) {
  return chartZoomLevels.get(`${bossName}:trend`)?.zoom || 1;
}
function renderBossDetail() {
  const boss = autologRows.find((r) => r.level === selectedBossName), detail = document.getElementById("autolog-detail-view");
  if (!boss || !detail) return;
  document.getElementById("autolog-list-view").hidden = !0, detail.hidden = !1;
  const history = boss.history || [], clearCount = history.filter((a) => a.cleared).length;
  selectedAverageWindow = Math.max(1, Math.min(selectedAverageWindow, maxSmoothing(clearCount)));
  const art = bossArt.get(boss.level) || {}, outcomeHistory = boss.outcomeHistory || [], attempts = outcomeHistory.map((outcome) => ({
    id: outcome.id,
    when: outcome.when,
    kind: outcome.isDeath ? "death" : "run",
    result: outcome.isDeath ? "Death" : outcome.isClear ? "Clear" : "Fail",
    time: outcome.isDeath ? null : formatTime(outcome.clearSeconds ?? outcome.failSeconds)
  })).reverse(), signature = JSON.stringify({ level: boss.level, attempts: boss.attempts, clears: boss.clears, deaths: boss.deaths, best: boss.best, totalPlaytime: boss.totalPlaytime, history, outcomeHistory, avg10: boss.avg10, avg20: boss.avg20, avg50: boss.avg50, selectedDetailTab, selectedAverageWindow, fRankTime: art.fRankTime });
  if (signature === lastBossDetailSignature) return;
  lastBossDetailSignature = signature, window.stopAutologWork(), detail.innerHTML = `<button class="detail-back" type="button" data-action="back">${t("autolog.back")}</button>
        <div class="boss-detail-heading"><div class="boss-detail-title"><p class="attempt-eyebrow">${t("autolog.boss-progress")}</p><div class="boss-detail-bossbar" style="background:${safeText(art.background || "#493576")};color:${safeText(art.color || "#ffffff")}"><h2>${safeText(cupheadDisplayName(boss.level))}</h2>${art.icon ? `<img src="${safeText(art.icon)}" alt="" loading="lazy">` : ""}</div><p>${tf("autolog.boss-attempts", { attempts: boss.attempts, clears: boss.clears })}</p></div>
        <div class="detail-tabs"><button class="is-active" type="button" data-detail-tab="progress">${t("autolog.progress")}</button><button type="button" data-detail-tab="attempts">${t("autolog.attempts")}</button></div></div>
        <div class="detail-tab-content" data-panel="progress" ${selectedDetailTab === "progress" ? "" : "hidden"}>
            <div class="improvement-cards"><div><span>${t("autolog.total-playtime")}</span><strong>${safeText(boss.totalPlaytime || "0s")}</strong></div><div><span>${t("autolog.best-clear")}</span><strong>${safeText(boss.best)}</strong></div><div><span>${t("autolog.total-deaths")}</span><strong>${boss.deaths}</strong></div><div><span>${t("autolog.avg-10")}</span><strong>${safeText(completeAverage(boss.avg10, boss.clears, 10))}</strong></div><div><span>${t("autolog.avg-20")}</span><strong>${safeText(completeAverage(boss.avg20, boss.clears, 20))}</strong></div><div><span>${t("autolog.avg-50")}</span><strong>${safeText(completeAverage(boss.avg50, boss.clears, 50))}</strong></div></div>
            <div class="history-chart-grid combined-history-grid">
                <article class="history-card time-history-card">
                    <div class="time-chart-heading">
                        <h3>${t("autolog.clear-times")}</h3>
                        ${clearCount ? `<label class="graph-color-setting"><input id="muted-graph-colors" type="checkbox"> ${t("ui.muted-graph-colors")}</label>` : ""}
                    </div>
                    <label class="average-slider-label" for="time-average-slider"><span>${t("autolog.average-window")}</span><output id="time-average-value">${selectedAverageWindow}</output></label>
                    <input id="time-average-slider" class="average-window-slider" type="range" min="1" max="${maxSmoothing(clearCount)}" step="1" value="${selectedAverageWindow}" aria-label="${t("autolog.average-window-aria")}">
                    <div class="average-slider-ends"><span>${t("autolog.individual-clears")}</span><span>${t("autolog.up-to-50-average")}</span></div>
                    <div class="time-chart-content" data-boss="${safeText(boss.level)}" data-limit="${selectedAverageWindow}" data-zoom="${getTimeChartZoom(boss.level)}">${drawTimeChart(history, art, selectedAverageWindow, getTimeChartZoom(boss.level))}</div>
                </article>

            </div>
        </div>
        <div class="detail-tab-content" data-panel="attempts" ${selectedDetailTab === "attempts" ? "" : "hidden"}>${renderAttempts(attempts, !1)}</div>`, detail.querySelectorAll(".time-chart-content").forEach((holder) => bindTimeChartControls(holder, history, art));
  const mutedColors = detail.querySelector("#muted-graph-colors");
  if (mutedColors) {
    const chart = mutedColors.closest(".time-history-card");
    mutedColors.checked = localStorage.getItem("cupheadMutedGraphs") === "true", chart.classList.toggle("muted-graphs", mutedColors.checked), mutedColors.addEventListener("change", () => {
      localStorage.setItem("cupheadMutedGraphs", String(mutedColors.checked)), chart.classList.toggle("muted-graphs", mutedColors.checked);
    });
  }
  const averageSlider = detail.querySelector("#time-average-slider");
  averageSlider?.addEventListener("input", () => {
    selectedAverageWindow = Number(averageSlider.value), detail.querySelector("#time-average-value").value = selectedAverageWindow, pendingSmoothingFrame === null && (pendingSmoothingFrame = requestAnimationFrame(() => {
      if (pendingSmoothingFrame = null, !averageSlider.isConnected) return;
      const chart = detail.querySelector(".time-chart-content");
      chart.dataset.limit = Number(averageSlider.value);
      const zoom = Number(averageSlider.value) === maxSmoothing(clearCount) ? { zoom: 1, offset: 0 } : chartZoomLevels.get(`${boss.level}:trend`) || { zoom: 1, offset: 0 };
      chart.updateTrend?.(zoom, !0);
    }));
  }), detail.querySelectorAll("[data-detail-tab]").forEach((b) => b.classList.toggle("is-active", b.dataset.detailTab === selectedDetailTab)), detail.querySelectorAll("[data-detail-tab]").forEach((button) => button.addEventListener("click", () => {
    selectedDetailTab = button.dataset.detailTab, detail.querySelectorAll("[data-detail-tab]").forEach((b) => b.classList.toggle("is-active", b === button)), detail.querySelectorAll("[data-panel]").forEach((panel) => panel.hidden = panel.dataset.panel !== button.dataset.detailTab);
  })), detail.querySelector('[data-action="back"]').addEventListener("click", () => {
    window.stopAutologWork(), selectedBossName = null, lastBossDetailSignature = null, selectedDetailTab = "progress", detail.hidden = !0, detail.replaceChildren(), document.getElementById("autolog-list-view").hidden = !1;
  }), bindAttemptDeletion(detail);
}
function bindAttemptDeletion(container) {
  container.querySelectorAll("[data-delete-run], [data-delete-death]").forEach((button) => button.addEventListener("click", () => {
    button.hasAttribute("data-delete-death") ? confirm(t("autolog.delete-death-confirm")) && window.cupheadHost?.deleteDeath(Number(button.dataset.deleteDeath)) : confirm(t("autolog.delete-attempt-confirm")) && window.cupheadHost?.deleteAttempt(Number(button.dataset.deleteRun));
  }));
}
function renderAttempts(attempts, includeBoss = !0) {
  return attempts.length ? `<div class="recent-attempt-list">${attempts.map((r) => {
    const isDeath = r.kind === "death", resultLabel = r.result === "Clear" ? t("result.clear") : r.result === "Fail" ? t("result.fail") : t("result.death");
    return `<article class="recent-attempt-card ${isDeath ? "is-death-event" : ""}">
        <span class="attempt-result ${isDeath ? "is-death" : r.result === "Clear" ? "is-clear" : "is-fail"}">${safeText(resultLabel)}</span>
        ${includeBoss ? `<button type="button" class="attempt-boss-link" data-boss="${safeText(r.level)}">${safeText(cupheadDisplayName(r.level))}</button>` : ""}
        <span class="attempt-detail"><small>${t("autolog.when")}</small><b>${safeText(r.when)}</b></span>${isDeath ? "" : `<span class="attempt-detail"><small>${t("autolog.clear-time")}</small><b>${safeText(r.time)}</b></span>`}
        ${Number.isFinite(Number(r.id)) ? `<button type="button" class="delete-run-button" data-delete-${isDeath ? "death" : "run"}="${r.id}" aria-label="${t(isDeath ? "autolog.delete-death-aria" : "autolog.delete-run-aria")}">${t("autolog.delete")}</button>` : ""}
    </article>`;
  }).join("")}</div>` : `<p class="attempt-empty">${t("autolog.no-attempts")}</p>`;
}
let autologRecentRows = [], overallProgressBosses;
window.receiveOverallProgress = function(bosses, categoryKey) {
  categoryKey === selectedLogCategory && (overallProgressBosses = bosses, logView === "overall" && renderOverallProgress(bosses));
}, window.renderAutologStats = function(rows, recent, categoryKey, totalPlaytime) {
  if (typeof totalPlaytime == "string" && (document.getElementById("autolog-total-playtime").textContent = totalPlaytime), categoryKey && categoryKey !== selectedLogCategory) return;
  const summary = document.getElementById("autolog-summary"), recentEl = document.getElementById("autolog-recent");
  if (!(!summary || !recentEl)) {
    if (autologRows = rows, autologRecentRows = recent, logView === "overall") {
      categoryKey ? window.cupheadHost?.postToHost({ cmd: "getOverallProgress" }) : renderOverallProgress(overallProgressBosses);
      return;
    }
    if (logView !== "recap") {
      if (logView === "projection") {
        renderRunProjection(rows, selectedLogCategory);
        return;
      }
      summary.innerHTML = rows.map((r) => {
        const art = bossArt.get(r.level) || {};
        return `<button class="boss-stat-card" type="button" data-boss="${safeText(r.level)}">
        <span class="boss-card-header" style="background:${safeText(art.background || "#493576")};color:${safeText(art.color || "#ffffff")}">
            <span class="boss-card-name">${safeText(cupheadDisplayName(r.level))}</span>
            ${art.icon ? `<img class="boss-card-icon" src="${safeText(art.icon)}" alt="" loading="lazy">` : ""}
        </span>
        <span class="boss-card-stats"><span><small>${t("autolog.attempts-label")}</small><b>${r.attempts}</b></span><span><small>${t("autolog.clears-label")}</small><b>${r.clears}</b></span><span><small>${t("autolog.deaths-label")}</small><b>${r.deaths}</b></span></span>
        <span class="boss-card-footer"><span>${t("autolog.playtime")}: <b>${safeText(r.totalPlaytime || "0s")}</b></span></span>
    </button>`;
      }).join(""), recentEl.innerHTML = renderAttempts(recent), summary.querySelectorAll(".boss-stat-card").forEach((button) => button.addEventListener("click", () => showBossDetail(button.dataset.boss))), recentEl.querySelectorAll(".attempt-boss-link").forEach((button) => button.addEventListener("click", () => showBossDetail(button.dataset.boss))), bindAttemptDeletion(recentEl), selectedBossName && (lastBossDetailSignature = null, renderBossDetail());
    }
  }
}, window.refreshAutologLanguage = function() {
  lastBossDetailSignature = null, window.renderAutologStats(autologRows, autologRecentRows), logView === "recap" && refreshRunRecap();
};
function selectLogView(view) {
  window.stopAutologWork(), logView = view, selectedBossName = null, lastBossDetailSignature = null;
  const detail = document.getElementById("autolog-detail-view");
  detail.hidden = !0, detail.replaceChildren(), document.getElementById("autolog-list-view").hidden = view !== "bosses", document.getElementById("overall-progress").hidden = view !== "overall", document.getElementById("run-projection").hidden = view !== "projection", document.getElementById("run-recap").hidden = view !== "recap", document.getElementById("category-tabs").hidden = view === "recap", document.getElementById("clear-all-attempts").hidden = view !== "bosses";
  for (const [id, active] of [["show-overall-progress", view === "overall"], ["show-boss-log", view === "bosses"], ["show-run-projection", view === "projection"], ["show-run-recap", view === "recap"]]) {
    const button = document.getElementById(id);
    button.classList.toggle("is-active", active), button.setAttribute("aria-pressed", String(active));
  }
  window.renderAutologStats(autologRows, autologRecentRows), view === "overall" && window.cupheadHost?.postToHost({ cmd: "getOverallProgress" }), (view === "projection" || view === "recap") && openRunRecap();
}
window.refreshRecapProjection = () => {
  logView === "projection" && renderRunProjection(autologRows, selectedLogCategory);
}, document.getElementById("show-boss-log").addEventListener("click", () => selectLogView("bosses")), document.getElementById("show-overall-progress").addEventListener("click", () => selectLogView(logView === "overall" ? "bosses" : "overall")), document.getElementById("show-run-projection").addEventListener("click", () => selectLogView("projection")), document.getElementById("show-run-recap").addEventListener("click", () => selectLogView("recap")), document.getElementById("clear-all-attempts").addEventListener("click", () => {
  confirm(t("autolog.delete-all-confirm")) && (window.stopAutologWork(), selectedBossName = null, document.getElementById("autolog-detail-view").hidden = !0, document.getElementById("autolog-detail-view").replaceChildren(), document.getElementById("autolog-list-view").hidden = !1, window.cupheadHost?.clearAttempts());
});
function renderLogCategoryControls() {
  renderCategoryControls({
    categories: categories.filter((category) => ["1-1", "legacy", "DLC"].includes(category.id)),
    onSelect: selectLogCategory
  });
}
function selectLogCategory(categoryId, subOption = null) {
  window.stopAutologWork(), activeCategory = categories.find((category) => category.id === categoryId), activeSubOption = categoryId === "DLC" ? getInitialSubOption(activeCategory, subOption) : null, selectedLogCategory = categoryId === "DLC" ? `DLC:${activeSubOption}` : categoryId, overallProgressBosses = void 0, overallViewport = void 0, saveCategorySelection(), selectedBossName = null, lastBossDetailSignature = null, document.getElementById("autolog-detail-view").hidden = !0, document.getElementById("autolog-detail-view").replaceChildren(), document.getElementById("autolog-list-view").hidden = logView !== "bosses", refreshBossArt(), renderLogCategoryControls(), window.renderAutologStats([], []), window.cupheadHost?.requestStats(selectedLogCategory);
}
activeCategory = categories.find((category) => category.id === (selectedLogCategory.startsWith("DLC:") ? "DLC" : selectedLogCategory)), activeSubOption = selectedLogCategory.split(":")[1] || null, updateReferenceTimes(), renderLogCategoryControls(), window.cupheadHost && window.cupheadHost.isDesktopApp ? window.cupheadHost.requestStats(selectedLogCategory) : (renderAutologStats([], []), document.getElementById("autolog-summary").innerHTML = `<p class='attempt-empty'>${t("autolog.no-live-stats")}</p>`);
