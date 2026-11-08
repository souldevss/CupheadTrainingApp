// Draws the time-distribution curve graph on the info page canvas

(function () {
    const rankColors = ranksStyles.map(style => style.background);
    document.querySelector(".info-ranks").innerHTML = ranks.map((rank, index) => {
        const { background, color } = ranksStyles[index];
        return '<span class="info-rank-badge" style="background:' + background + ';color:' + color + '">' + rank + '</span>';
    }).join("");

    const EXP = RANK_TIME_CURVE_EXPONENT;
    const N   = ranks.length - 1; // 18

    const canvas = document.getElementById("curve-graph");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");

    const W   = canvas.width;
    const H   = canvas.height;
    const PAD = { top: 28, right: 20, bottom: 48, left: 52 };
    const cw  = W - PAD.left - PAD.right;
    const ch  = H - PAD.top  - PAD.bottom;

    // coordinate helpers
    const gx = t => PAD.left + t * cw;
    const gy = v => PAD.top  + (1 - v) * ch;

    function redrawCurveGraph()
    {
        // Clear canvas before redrawing
        ctx.clearRect(0, 0, W, H);

        // ── background ───────────────────────────────────────────────────
        ctx.fillStyle = "rgba(17,9,44,0.0)";
        ctx.fillRect(0, 0, W, H);

        // ── grid lines ───────────────────────────────────────────────────
        ctx.strokeStyle = "rgba(103,78,167,0.25)";
        ctx.lineWidth   = 1;
        for (let g = 0; g <= 4; g++) {
            const v = g / 4;
            ctx.beginPath();
            ctx.moveTo(gx(0), gy(v));
            ctx.lineTo(gx(1), gy(v));
            ctx.stroke();
        }

        // ── linear reference (dashed) ────────────────────────────────────
        ctx.strokeStyle = "rgba(200,200,200,0.30)";
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        for (let px = 0; px <= cw; px++) {
            const t = px / cw;
            ctx.lineTo(gx(t), gy(t));
        }
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(200,200,200,0.45)";
        ctx.font      = "11px monospace";
        ctx.textAlign = "left";
        ctx.fillText("linear (exp=1)", gx(0.35) + 4, gy(0.35) - 7);

        // ── power curve (solid) ──────────────────────────────────────────
        ctx.strokeStyle = "#f1c232";
        ctx.lineWidth   = 2.5;
        ctx.beginPath();
        for (let px = 0; px <= cw; px++) {
            const t = px / cw;
            const v = Math.pow(t, EXP);
            if (px === 0) ctx.moveTo(gx(t), gy(v));
            else          ctx.lineTo(gx(t), gy(v));
        }
        ctx.stroke();

        ctx.fillStyle = "#f1c232";
        ctx.font      = "bold 12px monospace";
        ctx.textAlign = "left";
        ctx.fillText(t("info.distribution.graph-curve"), gx(0.38) + 4, gy(Math.pow(0.38, EXP)) - 8);

        // ── rank dots + tick marks ────────────────────────────────────────
        for (let i = 0; i <= N; i++) {
            const t  = i / N;
            const v  = Math.pow(t, EXP);
            const px = gx(t);
            const py = gy(v);

            // coloured dot on curve
            ctx.fillStyle   = rankColors[i];
            ctx.lineWidth   = 1;
            ctx.strokeStyle = "rgba(0,0,0,0.5)";
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // tick on x-axis
            ctx.strokeStyle = "rgba(255,255,255,0.25)";
            ctx.lineWidth   = 1;
            ctx.beginPath();
            ctx.moveTo(px, gy(0) + 2);
            ctx.lineTo(px, gy(0) + 6);
            ctx.stroke();

            // rank label (every other rank to avoid crowding)
            if (i % 2 === 0 || i === N) {
                ctx.fillStyle = rankColors[i];
                ctx.font      = "bold 9px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(ranks[i], px, gy(0) + 17);
            }
        }

        // ── axes ──────────────────────────────────────────────────────────
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth   = 1.5;
        ctx.beginPath(); ctx.moveTo(gx(0), gy(0)); ctx.lineTo(gx(1), gy(0)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gx(0), gy(0)); ctx.lineTo(gx(0), gy(1)); ctx.stroke();

        // ── y-axis labels ─────────────────────────────────────────────────
        ctx.fillStyle = "rgba(200,200,200,0.6)";
        ctx.font      = "10px sans-serif";
        ctx.textAlign = "right";
        const wrLabel = getActiveLanguage() === "pt-BR" ? "0% (WR)" : "0% (WR)";
        const fLabel  = getActiveLanguage() === "pt-BR" ? "100% (F)" : "100% (F)";
        [[0, wrLabel], [0.25, "25%"], [0.5, "50%"], [0.75, "75%"], [1, fLabel]].forEach(([v, lbl]) => {
            ctx.fillText(lbl, gx(0) - 5, gy(v) + 3);
        });

        // ── axis titles ───────────────────────────────────────────────────
        ctx.fillStyle = "rgba(200,200,200,0.55)";
        ctx.font      = "11px sans-serif";
        ctx.textAlign = "center";
        const xLabel = t("info.distribution.graph-x-axis");
        ctx.fillText(xLabel, gx(0.5), H - 4);

        ctx.save();
        ctx.translate(10, gy(0.5));
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center";
        const yLabel = t("info.distribution.graph-y-axis");
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();
    }

    // expose for language toggle
    window.redrawCurveGraph = redrawCurveGraph;

    // initial draw
    redrawCurveGraph();
})();
