const recapSceneNames = {
  level_veggies: "The Root Pack",
  level_frogs: "Ribby & Croaks",
  level_slime: "Goopy Le Grande",
  level_flying_blimp: "Hilda Berg",
  level_flower: "Cagney Carnation",
  level_baroness: "Baroness Von Bon Bon",
  level_flying_bird: "Wally Warbles",
  level_flying_genie: "Djimmi The Great",
  level_clown: "Beppi The Clown",
  level_dragon: "Grim Matchstick",
  level_bee: "Rumor Honeybottoms",
  level_robot: "Dr. Kahl's Robot",
  level_sally_stage_play: "Sally Stageplay",
  level_mouse: "Werner Werman",
  level_pirate: "Captain Brineybeard",
  level_flying_mermaid: "Cala Maria",
  level_train: "Phantom Express",
  level_dice_palace_main: "King Dice",
  level_devil: "The Devil",
  level_saltbaker: "Chef Saltbaker",
  level_old_man: "Glumstone The Giant",
  level_snow_cult: "Mortimer Freeze",
  level_airplane: "The Howling Aces",
  level_flying_cowboy: "Esther Winchester",
  level_rum_runners: "Moonshine Mob",
  level_platforming_1_1f: "Forest Follies",
  level_mausoleum: "Mausoleum"
};
function parseRunRecap(text) {
  const file = JSON.parse(text.replace(/^\uFEFF/, ""));
  if (!Array.isArray(file?.attempts) || !file.attempts.length) throw new Error("Invalid Run Recap file");
  return file.attempts.map((attempt) => {
    if (!Array.isArray(attempt?.scenes)) throw new Error("Invalid Run Recap attempt");
    return attempt.scenes.map((scene) => {
      if (typeof scene?.name != "string" || !scene.name.trim() || typeof scene.endTime != "string")
        throw new Error("Invalid Run Recap scene");
      const endTime = scene.endTime === "00:00:00.000" ? 0 : parseProjectionTarget(scene.endTime);
      if (endTime === null) throw new Error("Invalid Run Recap time");
      const levelTime = Number(String(scene.levelTime ?? "").replace(",", "."));
      return { name: scene.name.toLowerCase(), endTime, levelTime: levelTime > 0 && Number.isFinite(levelTime) ? levelTime : null };
    });
  });
}
function recapFinish(attempt, boss) {
  if (boss === "level_saltbaker") return attempt.find((scene) => scene.name === boss && scene.levelTime) || null;
  const last = attempt.at(-1);
  return last?.name === boss && last.levelTime ? last : null;
}
function recapHadRetry(attempt, finish) {
  const unfinished = /* @__PURE__ */ new Set();
  for (let index = 0; index < attempt.length; index++) {
    const scene = attempt[index];
    if (Object.hasOwn(recapSceneNames, scene.name)) {
      if (unfinished.has(scene.name)) return !0;
      if (scene === finish) break;
      (!scene.levelTime || attempt[index + 1]?.name !== "win") && unfinished.add(scene.name);
    }
  }
  return !1;
}
function recapSceneLabel(scene) {
  return scene === "win" ? t("recap.scorecard") : Object.hasOwn(recapSceneNames, scene) ? cupheadDisplayName(recapSceneNames[scene]) : scene.replace(/_/g, " ");
}
function formatRecapTime(seconds) {
  const milliseconds = Math.round(seconds * 1e3);
  return `${Math.floor(milliseconds / 6e4)}:${String(Math.floor(milliseconds / 1e3) % 60).padStart(2, "0")}.${String(milliseconds % 1e3).padStart(3, "0")}`;
}
async function recapStorage(file) {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open("cuphead-run-recap", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files"), request.onsuccess = () => resolve(request.result), request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction("files", file ? "readwrite" : "readonly"), store = transaction.objectStore("files"), request = file ? store.put({ file, categoryKey: selectedLogCategory }, "current") : store.get("current");
      transaction.oncomplete = () => resolve(request.result), transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}
const recapFileInput = document.getElementById("recap-file"), recapDropZone = document.getElementById("recap-drop-zone"), recapPanel = document.getElementById("run-recap"), recapBossInput = document.getElementById("recap-final-boss"), recapCompareInput = document.getElementById("recap-compare"), recapAttemptInput = document.getElementById("recap-attempt"), recapAttemptDots = document.getElementById("recap-attempt-dots"), recapPrevious = document.getElementById("recap-previous"), recapNext = document.getElementById("recap-next"), recapTargetInput = document.getElementById("recap-target"), recapTargetResult = document.getElementById("recap-target-result");
let recapAttempts = [], recapName = "", recapOpened = !1, recapStatus = "", recapLoadVersion = 0, recapBestAttempt = [], recapProjectionCategory = null, recapProjectionSamples = null;
function recapProjectionHistory(categoryKey) {
  return categoryKey === "legacy" != (recapProjectionCategory === "legacy") ? null : recapProjectionSamples?.[categoryKey.startsWith("DLC:") ? "dlc" : "base"] || null;
}
function recapStatusText() {
  document.getElementById("recap-status").textContent = recapStatus ? tf(recapStatus, { name: recapName }) : "";
}
function summarizeRecapAttempt(scenes, finish) {
  const timing = { levels: 0, map: 0, scorecards: 0, cutscenes: 0, other: 0 }, clears = /* @__PURE__ */ new Map();
  let previousEnd = 0;
  for (let index = 0; index < scenes.length; index++) {
    const scene = scenes[index];
    let section = "other";
    if (scene.name === "win" ? section = "scorecards" : scene.name.startsWith("map") ? section = "map" : scene.name.startsWith("cutscene") ? section = "cutscenes" : scene.name.startsWith("level_") && (section = "levels"), timing[section] += Math.max(0, scene.endTime - previousEnd), previousEnd = scene.endTime, scene.levelTime && (scenes[index + 1]?.name === "win" || scene === finish) && clears.set(recapSceneLabel(scene.name), scene.levelTime), scene === finish) break;
  }
  return { timing, clears };
}
function renderRecapAttemptDots(selected) {
  const first = Math.max(1, Math.min(selected - 7, recapAttempts.length - 14)), last = Math.min(first + 14, recapAttempts.length);
  let dots = "";
  for (let index = first; index <= last; index++) {
    const finish = recapFinish(recapAttempts[index - 1], recapBossInput.value), label = `${t("recap.attempt")} ${index} · ${t(finish ? "recap.finished" : "recap.unfinished")}${finish ? ` · ${formatRecapTime(finish.endTime)}` : ""}`;
    dots += `<button type="button" class="recap-dot${finish ? " is-finished" : ""}" data-attempt="${index}" aria-label="${safeText(label)}" title="${safeText(label)}" aria-current="${index === selected}" tabindex="${index === selected ? 0 : -1}"></button>`;
  }
  recapAttemptDots.innerHTML = dots;
}
function renderRecapAttempt() {
  const index = recapAttemptInput.valueAsNumber;
  if (!Number.isInteger(index) || index < 1 || index > recapAttempts.length) return;
  renderRecapAttemptDots(index);
  const scenes = Number.isInteger(index) ? recapAttempts[index - 1] || [] : [], finish = recapFinish(scenes, recapBossInput.value), last = finish || scenes.at(-1), { timing, clears } = summarizeRecapAttempt(scenes, finish), baseline = recapCompareInput.value === "best" && recapBestAttempt.length ? summarizeRecapAttempt(recapBestAttempt, recapFinish(recapBestAttempt, recapBossInput.value)).clears : null;
  recapPrevious.disabled = !(index > 1), recapNext.disabled = !(index < recapAttempts.length), document.getElementById("recap-attempt-count").textContent = `/ ${recapAttempts.length.toLocaleString(getActiveLanguage())}`, document.getElementById("recap-attempt-header").innerHTML = `<div>
        <span class="recap-attempt-status ${finish ? "is-finished" : ""}">${t(finish ? "recap.finished" : "recap.unfinished")}</span>
        <div>${last ? safeText(recapSceneLabel(last.name)) : t("recap.no-scenes")}</div>
    </div><strong>${last ? formatRecapTime(last.endTime) : "—"}</strong>`;
  const baseIsles = categories.find((category) => category.id === "1-1").islands, dlcIsles = categories.find((category) => category.id === "DLC").subOptions[0].islands, layout = [{ ...baseIsles[0], levels: [
    ...baseIsles[0].levels,
    ...dlcIsles[0].levels.filter((boss) => !baseIsles[0].levels.some((base) => base.name === boss.name))
  ] }, dlcIsles[1], ...baseIsles.slice(1)];
  document.getElementById("recap-islands").innerHTML = layout.map((isle) => {
    const bosses = isle.levels.filter((boss) => clears.has(boss.name));
    if (!bosses.length) return "";
    const cells = bosses.map((boss) => {
      const seconds = clears.get(boss.name), reference = baseline?.get(boss.name), delta = reference === void 0 ? null : Math.round((seconds - reference) * 1e3) / 1e3, deltaLabel = delta === null ? "" : `<small class="${delta > 0 ? "recap-slower" : delta < 0 ? "recap-faster" : ""}">${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta).toFixed(3)}s</small>`;
      return `<div class="recap-split">
                <span class="icon-reveal projection-boss-chip" tabindex="0" role="img" aria-label="${safeText(cupheadDisplayName(boss.name))}" style="background:${safeText(boss.background)}">
                    <img src="${safeText(boss.icon)}" alt="" loading="lazy"><span class="icon-caption" aria-hidden="true">${safeText(cupheadDisplayName(boss.name))}</span>
                </span><strong>${formatRecapTime(seconds)}</strong>${deltaLabel}
            </div>`;
    }).join("");
    return `<article class="recap-island"><h3 class="isle-artwork" style="background-color:${isle.color};color:${isle.textcolor};${isleArtworkStyle(isle.name, isle.color)}">${safeText(cupheadDisplayName(isle.name))}</h3>${cells}</article>`;
  }).join("") || `<p>${t("recap.no-clears")}</p>`, document.getElementById("recap-breakdown").innerHTML = last ? `<h3>${t("recap.breakdown")}</h3><dl>${Object.entries(timing).map(([key, seconds]) => `<div><dt>${t(`recap.time-${key}`)}</dt><dd>${formatRecapTime(seconds)}</dd></div>`).join("")}</dl>` : "", document.getElementById("recap-scenes").innerHTML = scenes.map((scene) => `<tr>
        <td>${safeText(recapSceneLabel(scene.name))}</td><td>${formatRecapTime(scene.endTime)}</td>
        <td>${scene.levelTime === null ? "—" : formatRecapTime(scene.levelTime)}</td>
    </tr>`).join("") || `<tr><td colspan="3">${t("recap.no-scenes")}</td></tr>`;
}
function refreshRunRecap() {
  if (recapStatusText(), !recapAttempts.length) return;
  const finishes = recapAttempts.map((attempt) => recapFinish(attempt, recapBossInput.value));
  let bestIndex = -1;
  finishes.forEach((finish, index) => {
    finish && (bestIndex < 0 || finish.endTime < finishes[bestIndex].endTime) && (bestIndex = index);
  }), recapBestAttempt = recapAttempts[bestIndex] || [];
  const completed = finishes.filter(Boolean).length;
  document.getElementById("recap-summary").innerHTML = [
    ["recap.attempts", recapAttempts.length],
    ["recap.finished", completed],
    ["recap.unfinished", recapAttempts.length - completed]
  ].map(([label, count]) => `<div class="projection-metric"><span>${t(label)}</span><strong>${count.toLocaleString(getActiveLanguage())}</strong></div>`).join("");
  const lastScenes = /* @__PURE__ */ new Map();
  recapAttempts.forEach((attempt, index) => {
    if (finishes[index]) return;
    const last = attempt.at(-1), priorLevel = last?.name === "win" ? attempt.at(-2)?.name : null, label = priorLevel ? tf("recap.after-scorecard", { level: recapSceneLabel(priorLevel) }) : last ? recapSceneLabel(last.name) : t("recap.no-scenes");
    lastScenes.set(label, (lastScenes.get(label) || 0) + 1);
  }), document.getElementById("recap-resets").innerHTML = [...lastScenes].sort((a, b) => b[1] - a[1]).map(([label, count]) => `<li>${safeText(label)} <strong>· ${count.toLocaleString(getActiveLanguage())}</strong></li>`).join("") || `<li>${t("recap.no-unfinished")}</li>`, recapTargetResult.textContent = "", renderRecapAttempt();
}
function showRecapFile(file, attempts, categoryKey = selectedLogCategory) {
  recapAttempts = attempts, recapProjectionCategory = categoryKey, recapName = file.name;
  const hasDevilScene = attempts.some((attempt) => attempt.some((scene) => scene.name === "level_devil")), hasSaltbakerScene = attempts.some((attempt) => attempt.some((scene) => scene.name === "level_saltbaker")), sample = (boss, compatible) => {
    const outcomesByBoss = /* @__PURE__ */ new Map(), finishes = [];
    let runStarts = 0, firstTryFinishes = 0;
    function record(name, seconds) {
      outcomesByBoss.has(name) || outcomesByBoss.set(name, []), outcomesByBoss.get(name).push(seconds);
    }
    for (const [index, attempt] of (compatible ? attempts : []).entries()) {
      const finish = recapFinish(attempt, boss), { clears } = summarizeRecapAttempt(attempt, finish);
      for (const [name, seconds] of clears) record(name, seconds);
      if (attempt.length && (finish || index < attempts.length - 1) && (runStarts++, finish && !recapHadRetry(attempt, finish) && firstTryFinishes++), finish)
        finishes.push(finish.endTime);
      else if (index < attempts.length - 1) {
        const last = attempt.at(-1), name = last && Object.hasOwn(recapSceneNames, last.name) ? recapSceneNames[last.name] : null;
        name && !last.levelTime && !clears.has(name) && record(name, null);
      }
    }
    return { name: file.name, count: attempts.length, compatible, finishes, outcomesByBoss, runStarts, firstTryFinishes };
  };
  recapProjectionSamples = {
    base: sample("level_devil", !hasSaltbakerScene),
    dlc: sample("level_saltbaker", !hasDevilScene)
  };
  const hasDevil = attempts.some((attempt) => recapFinish(attempt, "level_devil")), hasSaltbaker = attempts.some((attempt) => recapFinish(attempt, "level_saltbaker"));
  recapBossInput.value = !hasDevil && hasSaltbaker ? "level_saltbaker" : "level_devil", recapAttemptInput.max = recapAttemptInput.value = attempts.length, recapStatus = "recap.loaded", document.getElementById("recap-data").hidden = !1, refreshRunRecap(), window.refreshRecapProjection?.();
}
async function openRunRecap() {
  if (recapOpened) return;
  recapOpened = !0;
  const version = recapLoadVersion;
  try {
    const saved = await recapStorage();
    if (!saved) return;
    const file = saved.file || saved, attempts = parseRunRecap(await file.text());
    version === recapLoadVersion && showRecapFile(file, attempts, saved.categoryKey || "1-1");
  } catch {
    version === recapLoadVersion && (recapStatus = "recap.restore-error", recapStatusText());
  }
}
async function importRecapFile(file) {
  if (!file || recapFileInput.disabled) return;
  const version = ++recapLoadVersion;
  recapFileInput.disabled = !0;
  try {
    if (!/\.rrc$/i.test(file.name) || file.size > 50 * 1024 * 1024) throw new Error("Unsupported file");
    const attempts = parseRunRecap(await file.text());
    if (version !== recapLoadVersion) return;
    showRecapFile(file, attempts);
    try {
      await recapStorage(file);
    } catch {
      recapStatus = "recap.save-error", recapStatusText();
    }
  } catch {
    recapStatus = "recap.invalid", recapStatusText();
  } finally {
    recapFileInput.value = "", recapFileInput.disabled = !1;
  }
}
recapFileInput.addEventListener("change", () => importRecapFile(recapFileInput.files[0]));
function isRecapFileDrag(event) {
  return !recapPanel.hidden && event.dataTransfer?.types.includes("Files");
}
document.addEventListener("dragover", (event) => {
  if (!isRecapFileDrag(event)) return;
  event.preventDefault();
  const canDrop = recapDropZone.contains(event.target) && !recapFileInput.disabled;
  event.dataTransfer.dropEffect = canDrop ? "copy" : "none", recapDropZone.classList.toggle("is-dragging", canDrop);
}), recapDropZone.addEventListener("dragleave", (event) => {
  recapDropZone.contains(event.relatedTarget) || recapDropZone.classList.remove("is-dragging");
}), document.addEventListener("drop", (event) => {
  if (!isRecapFileDrag(event) || (event.preventDefault(), recapDropZone.classList.remove("is-dragging"), !recapDropZone.contains(event.target) || recapFileInput.disabled)) return;
  const { files } = event.dataTransfer;
  files.length === 1 ? importRecapFile(files[0]) : (recapStatus = "recap.drop-one", recapStatusText());
}), recapBossInput.addEventListener("change", refreshRunRecap), recapAttemptInput.addEventListener("input", renderRecapAttempt), recapCompareInput.addEventListener("change", renderRecapAttempt);
function selectRecapDot(index) {
  index < 1 || index > recapAttempts.length || (recapAttemptInput.value = index, renderRecapAttempt(), recapAttemptDots.querySelector(`[data-attempt="${index}"]`)?.focus({ preventScroll: !0 }));
}
recapAttemptDots.addEventListener("click", (event) => {
  const dot = event.target.closest("[data-attempt]");
  dot && selectRecapDot(Number(dot.dataset.attempt));
}), recapAttemptDots.addEventListener("keydown", (event) => {
  event.key !== "ArrowLeft" && event.key !== "ArrowRight" || (event.preventDefault(), selectRecapDot(recapAttemptInput.valueAsNumber + (event.key === "ArrowLeft" ? -1 : 1)));
}), recapPrevious.addEventListener("click", () => {
  recapAttemptInput.stepDown(), renderRecapAttempt();
}), recapNext.addEventListener("click", () => {
  recapAttemptInput.stepUp(), renderRecapAttempt();
}), recapTargetInput.addEventListener("input", () => {
  recapTargetResult.textContent = "";
}), document.getElementById("recap-target-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const target = parseProjectionTarget(recapTargetInput.value);
  if (target === null) {
    recapTargetResult.textContent = t("projection.target-invalid");
    return;
  }
  const hits = recapAttempts.filter((attempt) => (recapFinish(attempt, recapBossInput.value)?.endTime ?? 1 / 0) <= target).length;
  recapTargetResult.textContent = tf("recap.target-result", { hits, count: recapAttempts.length });
});
