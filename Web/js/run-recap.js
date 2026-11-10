const recapSceneNames = {
    level_veggies: "The Root Pack", level_frogs: "Ribby & Croaks", level_slime: "Goopy Le Grande",
    level_flying_blimp: "Hilda Berg", level_flower: "Cagney Carnation", level_baroness: "Baroness Von Bon Bon",
    level_flying_bird: "Wally Warbles", level_flying_genie: "Djimmi The Great", level_clown: "Beppi The Clown",
    level_dragon: "Grim Matchstick", level_bee: "Rumor Honeybottoms", level_robot: "Dr. Kahl's Robot",
    level_sally_stage_play: "Sally Stageplay", level_mouse: "Werner Werman", level_pirate: "Captain Brineybeard",
    level_flying_mermaid: "Cala Maria", level_train: "Phantom Express", level_dice_palace_main: "King Dice",
    level_devil: "The Devil", level_saltbaker: "Chef Saltbaker", level_old_man: "Glumstone The Giant",
    level_snow_cult: "Mortimer Freeze", level_airplane: "The Howling Aces", level_flying_cowboy: "Esther Winchester",
    level_rum_runners: "Moonshine Mob", level_platforming_1_1f: "Forest Follies", level_mausoleum: "Mausoleum"
};

function parseRunRecap(text) {
    const file = JSON.parse(text.replace(/^\uFEFF/, ""));
    if (!Array.isArray(file?.attempts) || !file.attempts.length) throw new Error("Invalid Run Recap file");
    return file.attempts.map(attempt => {
        if (!Array.isArray(attempt?.scenes)) throw new Error("Invalid Run Recap attempt");
        return attempt.scenes.map(scene => {
            if (typeof scene?.name !== "string" || !scene.name.trim() || typeof scene.endTime !== "string") {
                throw new Error("Invalid Run Recap scene");
            }
            const endTime = scene.endTime === "00:00:00.000" ? 0 : parseProjectionTarget(scene.endTime);
            if (endTime === null) throw new Error("Invalid Run Recap time");
            const levelTime = Number(String(scene.levelTime ?? "").replace(",", "."));
            return { name: scene.name.toLowerCase(), endTime, levelTime: levelTime > 0 && Number.isFinite(levelTime) ? levelTime : null };
        });
    });
}

function recapFinish(attempt, boss) {
    if (boss === "level_saltbaker") return attempt.find(scene => scene.name === boss && scene.levelTime) || null;
    const last = attempt.at(-1);
    return last?.name === boss && last.levelTime ? last : null;
}

function recapHadRetry(attempt, finish) {
    const unfinished = new Set();
    for (let index = 0; index < attempt.length; index++) {
        const scene = attempt[index];
        if (!Object.hasOwn(recapSceneNames, scene.name)) continue;
        if (unfinished.has(scene.name)) return true;
        if (scene === finish) break;
        if (!scene.levelTime || attempt[index + 1]?.name !== "win") unfinished.add(scene.name);
    }
    return false;
}

function recapSceneLabel(scene) {
    if (scene === "win") return t("recap.scorecard");
    return Object.hasOwn(recapSceneNames, scene) ? cupheadDisplayName(recapSceneNames[scene]) : scene.replace(/_/g, " ");
}

function formatRecapTime(seconds) {
    const milliseconds = Math.round(seconds * 1000);
    const minutes = Math.floor(milliseconds / 60000);
    return `${minutes}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, "0")}.${String(milliseconds % 1000).padStart(3, "0")}`;
}

async function recapStorage(file) {
    const database = await new Promise((resolve, reject) => {
        const request = indexedDB.open("cuphead-run-recap", 1);
        request.onupgradeneeded = () => request.result.createObjectStore("files");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    try {
        return await new Promise((resolve, reject) => {
            const transaction = database.transaction("files", file ? "readwrite" : "readonly");
            const store = transaction.objectStore("files");
            const request = file ? store.put(file, "current") : store.get("current");
            transaction.oncomplete = () => resolve(request.result);
            transaction.onabort = () => reject(transaction.error);
        });
    } finally {
        database.close();
    }
}

const recapFileInput = document.getElementById("recap-file");
const recapDropZone = document.getElementById("recap-drop-zone");
const recapPanel = document.getElementById("run-recap");
const recapBossInput = document.getElementById("recap-final-boss");
const recapCompareInput = document.getElementById("recap-compare");
const recapAttemptInput = document.getElementById("recap-attempt");
const recapAttemptDots = document.getElementById("recap-attempt-dots");
const recapPrevious = document.getElementById("recap-previous");
const recapNext = document.getElementById("recap-next");
const recapTargetInput = document.getElementById("recap-target");
const recapTargetResult = document.getElementById("recap-target-result");
let recapAttempts = [];
let recapName = "";
let recapOpened = false;
let recapStatus = "";
let recapLoadVersion = 0;
let recapBestAttempt = [];
let recapProjectionCategory = null;
let recapProjectionSamples = null;

function recapProjectionHistory(categoryKey) {
    return recapProjectionSamples?.[categoryKey.startsWith("DLC:") ? "dlc" : "base"] || null;
}

function recapStatusText() {
    document.getElementById("recap-status").textContent = recapStatus ? tf(recapStatus, { name: recapName }) : "";
}

function summarizeRecapAttempt(scenes, finish) {
    const timing = { levels: 0, map: 0, scorecards: 0, cutscenes: 0, other: 0 };
    const clears = new Map();
    let previousEnd = 0;
    for (let index = 0; index < scenes.length; index++) {
        const scene = scenes[index];
        let section = "other";
        if (scene.name === "win") section = "scorecards";
        else if (scene.name.startsWith("map")) section = "map";
        else if (scene.name.startsWith("cutscene")) section = "cutscenes";
        else if (scene.name.startsWith("level_")) section = "levels";
        timing[section] += Math.max(0, scene.endTime - previousEnd);
        previousEnd = scene.endTime;
        if (scene.levelTime && (scenes[index + 1]?.name === "win" || scene === finish)) {
            clears.set(recapSceneLabel(scene.name), scene.levelTime);
        }
        if (scene === finish) break;
    }
    return { timing, clears };
}

function renderRecapAttemptDots(selected) {
    const first = Math.max(1, Math.min(selected - 7, recapAttempts.length - 14));
    const last = Math.min(first + 14, recapAttempts.length);
    let dots = "";
    for (let index = first; index <= last; index++) {
        const finish = recapFinish(recapAttempts[index - 1], recapBossInput.value);
        const label = `${t("recap.attempt")} ${index} · ${t(finish ? "recap.finished" : "recap.unfinished")}${finish ? ` · ${formatRecapTime(finish.endTime)}` : ""}`;
        dots += `<button type="button" class="recap-dot${finish ? " is-finished" : ""}" data-attempt="${index}" aria-label="${safeText(label)}" title="${safeText(label)}" aria-current="${index === selected}" tabindex="${index === selected ? 0 : -1}"></button>`;
    }
    recapAttemptDots.innerHTML = dots;
}

function renderRecapAttempt() {
    const index = recapAttemptInput.valueAsNumber;
    if (!Number.isInteger(index) || index < 1 || index > recapAttempts.length) return;
    renderRecapAttemptDots(index);
    const scenes = Number.isInteger(index) ? recapAttempts[index - 1] || [] : [];
    const finish = recapFinish(scenes, recapBossInput.value);
    const last = finish || scenes.at(-1);
    const { timing, clears } = summarizeRecapAttempt(scenes, finish);
    const baseline = recapCompareInput.value === "best" && recapBestAttempt.length
        ? summarizeRecapAttempt(recapBestAttempt, recapFinish(recapBestAttempt, recapBossInput.value)).clears : null;
    recapPrevious.disabled = !(index > 1);
    recapNext.disabled = !(index < recapAttempts.length);
    document.getElementById("recap-attempt-count").textContent = `/ ${recapAttempts.length.toLocaleString(getActiveLanguage())}`;
    document.getElementById("recap-attempt-header").innerHTML = `<div>
        <span class="recap-attempt-status ${finish ? "is-finished" : ""}">${t(finish ? "recap.finished" : "recap.unfinished")}</span>
        <div>${last ? safeText(recapSceneLabel(last.name)) : t("recap.no-scenes")}</div>
    </div><strong>${last ? formatRecapTime(last.endTime) : "—"}</strong>`;

    const baseIsles = categories.find(category => category.id === "1-1").islands;
    const dlcIsles = categories.find(category => category.id === "DLC").subOptions[0].islands;
    const firstIsle = { ...baseIsles[0], levels: [...baseIsles[0].levels,
        ...dlcIsles[0].levels.filter(boss => !baseIsles[0].levels.some(base => base.name === boss.name))] };
    const layout = [firstIsle, dlcIsles[1], ...baseIsles.slice(1)];
    document.getElementById("recap-islands").innerHTML = layout.map(isle => {
        const bosses = isle.levels.filter(boss => clears.has(boss.name));
        if (!bosses.length) return "";
        const cells = bosses.map(boss => {
            const seconds = clears.get(boss.name);
            const reference = baseline?.get(boss.name);
            const delta = reference === undefined ? null : Math.round((seconds - reference) * 1000) / 1000;
            const deltaLabel = delta === null ? "" : `<small class="${delta > 0 ? "recap-slower" : delta < 0 ? "recap-faster" : ""}">${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta).toFixed(3)}s</small>`;
            return `<div class="recap-split">
                <span class="icon-reveal projection-boss-chip" tabindex="0" role="img" aria-label="${safeText(cupheadDisplayName(boss.name))}" style="background:${safeText(boss.background)}">
                    <img src="${safeText(boss.icon)}" alt="" loading="lazy"><span class="icon-caption" aria-hidden="true">${safeText(cupheadDisplayName(boss.name))}</span>
                </span><strong>${formatRecapTime(seconds)}</strong>${deltaLabel}
            </div>`;
        }).join("");
        return `<article class="recap-island"><h3 class="isle-artwork" style="background-color:${isle.color};color:${isle.textcolor};${isleArtworkStyle(isle.name, isle.color)}">${safeText(cupheadDisplayName(isle.name))}</h3>${cells}</article>`;
    }).join("") || `<p>${t("recap.no-clears")}</p>`;

    document.getElementById("recap-breakdown").innerHTML = last ? `<h3>${t("recap.breakdown")}</h3><dl>${Object.entries(timing)
        .map(([key, seconds]) => `<div><dt>${t(`recap.time-${key}`)}</dt><dd>${formatRecapTime(seconds)}</dd></div>`).join("")}</dl>` : "";
    document.getElementById("recap-scenes").innerHTML = scenes.map(scene => `<tr>
        <td>${safeText(recapSceneLabel(scene.name))}</td><td>${formatRecapTime(scene.endTime)}</td>
        <td>${scene.levelTime === null ? "—" : formatRecapTime(scene.levelTime)}</td>
    </tr>`).join("") || `<tr><td colspan="3">${t("recap.no-scenes")}</td></tr>`;
}

function refreshRunRecap() {
    recapStatusText();
    if (!recapAttempts.length) return;
    const finishes = recapAttempts.map(attempt => recapFinish(attempt, recapBossInput.value));
    let bestIndex = -1;
    finishes.forEach((finish, index) => {
        if (finish && (bestIndex < 0 || finish.endTime < finishes[bestIndex].endTime)) bestIndex = index;
    });
    recapBestAttempt = recapAttempts[bestIndex] || [];
    const completed = finishes.filter(Boolean).length;
    document.getElementById("recap-summary").innerHTML = [
        ["recap.attempts", recapAttempts.length], ["recap.finished", completed], ["recap.unfinished", recapAttempts.length - completed]
    ].map(([label, count]) => `<div class="projection-metric"><span>${t(label)}</span><strong>${count.toLocaleString(getActiveLanguage())}</strong></div>`).join("");

    const lastScenes = new Map();
    recapAttempts.forEach((attempt, index) => {
        if (finishes[index]) return;
        const last = attempt.at(-1);
        const priorLevel = last?.name === "win" ? attempt.at(-2)?.name : null;
        const label = priorLevel ? tf("recap.after-scorecard", { level: recapSceneLabel(priorLevel) })
            : last ? recapSceneLabel(last.name) : t("recap.no-scenes");
        lastScenes.set(label, (lastScenes.get(label) || 0) + 1);
    });
    document.getElementById("recap-resets").innerHTML = [...lastScenes]
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => `<li>${safeText(label)} <strong>· ${count.toLocaleString(getActiveLanguage())}</strong></li>`).join("")
        || `<li>${t("recap.no-unfinished")}</li>`;
    recapTargetResult.textContent = "";
    renderRecapAttempt();
}

function showRecapFile(file, attempts) {
    recapAttempts = attempts;
    recapProjectionCategory = null;
    recapName = file.name;
    const hasDevilScene = attempts.some(attempt => attempt.some(scene => scene.name === "level_devil"));
    const hasSaltbakerScene = attempts.some(attempt => attempt.some(scene => scene.name === "level_saltbaker"));
    const sample = (boss, compatible) => {
        const outcomesByBoss = new Map();
        const finishes = [];
        let runStarts = 0, firstTryFinishes = 0;
        function record(name, seconds) {
            if (!outcomesByBoss.has(name)) outcomesByBoss.set(name, []);
            outcomesByBoss.get(name).push(seconds);
        }
        for (const [index, attempt] of (compatible ? attempts : []).entries()) {
            const finish = recapFinish(attempt, boss);
            const { clears } = summarizeRecapAttempt(attempt, finish);
            for (const [name, seconds] of clears) record(name, seconds);
            if (attempt.length && (finish || index < attempts.length - 1)) {
                runStarts++;
                if (finish && !recapHadRetry(attempt, finish)) firstTryFinishes++;
            }
            if (finish) {
                finishes.push(finish.endTime);
            } else if (index < attempts.length - 1) {
                // A later start confirms the unfinished attempt is no longer active.
                const last = attempt.at(-1);
                const name = last && Object.hasOwn(recapSceneNames, last.name) ? recapSceneNames[last.name] : null;
                if (name && !last.levelTime && !clears.has(name)) record(name, null);
            }
        }
        return { name: file.name, count: attempts.length, compatible, finishes, outcomesByBoss, runStarts, firstTryFinishes };
    };
    recapProjectionSamples = {
        base: sample("level_devil", !hasSaltbakerScene),
        dlc: sample("level_saltbaker", !hasDevilScene)
    };
    const hasDevil = attempts.some(attempt => recapFinish(attempt, "level_devil"));
    const hasSaltbaker = attempts.some(attempt => recapFinish(attempt, "level_saltbaker"));
    recapBossInput.value = !hasDevil && hasSaltbaker ? "level_saltbaker" : "level_devil";
    recapAttemptInput.max = recapAttemptInput.value = attempts.length;
    recapStatus = "recap.loaded";
    document.getElementById("recap-data").hidden = false;
    refreshRunRecap();
    window.refreshRecapProjection?.();
}

async function openRunRecap() {
    if (recapOpened) return;
    recapOpened = true;
    const version = recapLoadVersion;
    try {
        const file = await recapStorage();
        if (!file) return;
        const attempts = parseRunRecap(await file.text());
        if (version === recapLoadVersion) showRecapFile(file, attempts);
    } catch {
        if (version === recapLoadVersion) {
            recapStatus = "recap.restore-error";
            recapStatusText();
        }
    }
}

async function importRecapFile(file) {
    if (!file || recapFileInput.disabled) return;
    const version = ++recapLoadVersion;
    recapFileInput.disabled = true;
    try {
        if (!/\.rrc$/i.test(file.name) || file.size > 50 * 1024 * 1024) throw new Error("Unsupported file");
        const attempts = parseRunRecap(await file.text());
        if (version !== recapLoadVersion) return;
        showRecapFile(file, attempts);
        try { await recapStorage(file); }
        catch { recapStatus = "recap.save-error"; recapStatusText(); }
    } catch {
        recapStatus = "recap.invalid";
        recapStatusText();
    } finally {
        recapFileInput.value = "";
        recapFileInput.disabled = false;
    }
}

recapFileInput.addEventListener("change", () => importRecapFile(recapFileInput.files[0]));

function isRecapFileDrag(event) {
    return !recapPanel.hidden && event.dataTransfer?.types.includes("Files");
}

document.addEventListener("dragover", event => {
    if (!isRecapFileDrag(event)) return;
    event.preventDefault();
    const canDrop = recapDropZone.contains(event.target) && !recapFileInput.disabled;
    event.dataTransfer.dropEffect = canDrop ? "copy" : "none";
    recapDropZone.classList.toggle("is-dragging", canDrop);
});
recapDropZone.addEventListener("dragleave", event => {
    if (!recapDropZone.contains(event.relatedTarget)) recapDropZone.classList.remove("is-dragging");
});
document.addEventListener("drop", event => {
    if (!isRecapFileDrag(event)) return;
    event.preventDefault();
    recapDropZone.classList.remove("is-dragging");
    if (!recapDropZone.contains(event.target) || recapFileInput.disabled) return;
    const { files } = event.dataTransfer;
    if (files.length === 1) importRecapFile(files[0]);
    else {
        recapStatus = "recap.drop-one";
        recapStatusText();
    }
});

recapBossInput.addEventListener("change", refreshRunRecap);
recapAttemptInput.addEventListener("input", renderRecapAttempt);
recapCompareInput.addEventListener("change", renderRecapAttempt);
function selectRecapDot(index) {
    if (index < 1 || index > recapAttempts.length) return;
    recapAttemptInput.value = index;
    renderRecapAttempt();
    recapAttemptDots.querySelector(`[data-attempt="${index}"]`)?.focus({ preventScroll: true });
}
recapAttemptDots.addEventListener("click", event => {
    const dot = event.target.closest("[data-attempt]");
    if (dot) selectRecapDot(Number(dot.dataset.attempt));
});
recapAttemptDots.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    selectRecapDot(recapAttemptInput.valueAsNumber + (event.key === "ArrowLeft" ? -1 : 1));
});
recapPrevious.addEventListener("click", () => { recapAttemptInput.stepDown(); renderRecapAttempt(); });
recapNext.addEventListener("click", () => { recapAttemptInput.stepUp(); renderRecapAttempt(); });
recapTargetInput.addEventListener("input", () => { recapTargetResult.textContent = ""; });
document.getElementById("recap-target-form").addEventListener("submit", event => {
    event.preventDefault();
    const target = parseProjectionTarget(recapTargetInput.value);
    if (target === null) {
        recapTargetResult.textContent = t("projection.target-invalid");
        return;
    }
    const hits = recapAttempts.filter(attempt => (recapFinish(attempt, recapBossInput.value)?.endTime ?? Infinity) <= target).length;
    recapTargetResult.textContent = tf("recap.target-result", { hits, count: recapAttempts.length });
});
