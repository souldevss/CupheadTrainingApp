(function () {
    if (location.origin !== "https://cuphead-training.local") return;

    if (location.pathname === "/backups.html") {
        document.addEventListener("DOMContentLoaded", () => {
            for (const code of document.querySelectorAll("code")) {
                code.textContent = code.textContent.replace("CupheadTrainingLog\Backups", "CupheadTrainingLog-Developer\Backups");
            }
        });
    }

    if (window !== window.top || location.pathname !== "/app-shell.html") return;

    const storageKey = "cupheadDeveloperFRanks";
    const targets = new WeakMap();
    const referenceTimes = new Map();

    function readOverrides() {
        try {
            return JSON.parse(localStorage.getItem(storageKey)) || {};
        } catch {
            return {};
        }
    }

    function apply(categories, generateRankTimes) {
        const overrides = readOverrides();
        const groups = new Map();

        function add(key, target, fallbackMultipliers) {
            if (!targets.has(target)) targets.set(target, { key, defaultTime: target.fRankTime });
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push({ target, fallbackMultipliers });
        }

        for (const category of categories) {
            for (const route of category.subOptions || [category]) {
                for (const island of route.islands) {
                    for (const level of island.levels) {
                        const shared = category.id === "DLC" && ["Forest Follies", "Mausoleum"].includes(level.name);
                        add(`${shared ? "dlc-shared" : route.id}/${level.name}`, level, route.rankMultipliers);
                    }
                }
                add(`${route.id}/residual`, route.residual, route.rankMultipliers);
            }
        }

        for (const [key, entries] of groups) {
            const reference = Math.max(0, ...entries.map(({ target }) => target.wrTime || 0));
            referenceTimes.set(key, Math.max(reference, referenceTimes.get(key) || 0));
            const override = overrides[key];
            for (const { target, fallbackMultipliers } of entries) {
                const nextTime = Number.isFinite(override) && override > reference
                    ? override : targets.get(target).defaultTime;
                if (target.fRankTime === nextTime) continue;
                target.fRankTime = nextTime;
                if (target.times) {
                    target.times = generateRankTimes(nextTime, { wrTime: target.wrTime, fallbackMultipliers });
                }
            }
        }
    }

    function parseRankTime(value) {
        const match = /^(?:(\d+):)?(\d+(?:[.,]\d{1,2})?)$/.exec(value);
        if (!match) return NaN;
        const seconds = Number(match[2].replace(",", "."));
        if (match[1] && seconds >= 60) return NaN;
        return Math.round((Number(match[1] || 0) * 60 + seconds) * 100) / 100;
    }

    function editCell(cell, target, name, rerender) {
        const { key, defaultTime } = targets.get(target);
        const doc = cell.ownerDocument;
        const button = doc.createElement("button");
        button.type = "button";
        button.className = "dev-rank-edit";
        button.textContent = cell.textContent.trim();
        button.title = `Edit ${name} F rank`;
        button.setAttribute("aria-label", `${button.title}, ${button.textContent}`);
        cell.replaceChildren(button);

        button.addEventListener("click", () => {
            const input = doc.createElement("input");
            input.type = "text";
            input.inputMode = "decimal";
            input.className = "dev-rank-input";
            input.value = button.textContent;
            input.setAttribute("aria-label", button.title);
            cell.replaceChildren(input);
            input.focus();
            input.select();

            input.addEventListener("blur", () => {
                if (cell.contains(input)) cell.replaceChildren(button);
            });
            input.addEventListener("input", () => input.setCustomValidity(""));
            input.addEventListener("keydown", event => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    cell.replaceChildren(button);
                    button.focus();
                }
                if (event.key !== "Enter") return;
                event.preventDefault();

                const value = input.value.trim();
                const seconds = parseRankTime(value);
                const reference = referenceTimes.get(key);
                if (value && (!Number.isFinite(seconds) || seconds <= reference)) {
                    input.setCustomValidity(`Enter a time above ${reference} s, or leave it blank to reset.`);
                    input.reportValidity();
                    return;
                }

                const overrides = readOverrides();
                if (!value || seconds === defaultTime) delete overrides[key];
                else overrides[key] = seconds;
                doc.defaultView.localStorage.setItem(storageKey, JSON.stringify(overrides));
                rerender();
            });
        });
    }

    function decorateTimeTable(table, totals, levels, residual, rerender) {
        const doc = table.ownerDocument;
        if (!doc.getElementById("dev-rank-tools")) {
            const tools = doc.createElement("div");
            tools.id = "dev-rank-tools";
            tools.innerHTML = "<span>DEV · Click an F cell to edit. Enter saves, Esc cancels. Clear the field and press Enter to reset.</span>";
            const exportButton = doc.createElement("button");
            exportButton.type = "button";
            exportButton.textContent = "Export F ranks";
            exportButton.addEventListener("click", () => {
                const view = doc.defaultView;
                const url = view.URL.createObjectURL(new Blob([JSON.stringify(readOverrides(), null, 2)], { type: "application/json" }));
                const link = doc.createElement("a");
                link.href = url;
                link.download = "cuphead-f-rank-overrides.json";
                link.click();
                view.setTimeout(() => view.URL.revokeObjectURL(url), 1000);
            });
            tools.append(exportButton);
            table.parentElement.before(tools);

            const style = doc.createElement("style");
            style.textContent = `
                #dev-rank-tools { display: flex; justify-content: center; align-items: center; flex-wrap: wrap;
                    gap: 8px; padding: 4px 8px 8px; color: #f4eefb; font: 12px system-ui; }
                #dev-rank-tools button { background: #382a4a; color: inherit; border: 1px solid #9786ac;
                    border-radius: 4px; padding: 4px 7px; cursor: pointer; }
                .dev-rank-edit { border: 0; background: transparent; color: inherit; font: inherit;
                    padding: 0; cursor: text; text-decoration: underline dotted; text-underline-offset: 3px; }
                .dev-rank-input { box-sizing: border-box; width: 100%; min-width: 0; background: #241a33;
                    color: white; border: 1px solid #cab4e0; border-radius: 3px; text-align: center; font: inherit; }
            `;
            doc.head.append(style);
        }

        table.querySelectorAll("tbody tr > td:last-child").forEach((cell, index) => {
            const boss = levels[index];
            if (targets.has(boss)) editCell(cell, boss, boss.name, rerender);
        });
        const residualCell = totals.querySelector("[data-rank-residual] > td:last-child");
        if (residualCell && targets.has(residual)) editCell(residualCell, residual, "Residual", rerender);
    }

    window.developerRankEditor = { apply, decorateTimeTable, storageKey };
})();
