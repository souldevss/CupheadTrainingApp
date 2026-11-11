(function() {
  const rankColors = ranksStyles.map((style) => style.background);
  document.querySelector(".info-ranks").innerHTML = ranks.map((rank, index) => {
    const { background, color } = ranksStyles[index];
    return '<span class="info-rank-badge" style="background:' + background + ";color:" + color + '">' + rank + "</span>";
  }).join("");
  const EXP = RANK_TIME_CURVE_EXPONENT, N = ranks.length - 1, canvas = document.getElementById("curve-graph");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d"), W = canvas.width, H = canvas.height, PAD = { top: 28, right: 20, bottom: 48, left: 52 }, cw = W - PAD.left - PAD.right, ch = H - PAD.top - PAD.bottom, gx = (t2) => PAD.left + t2 * cw, gy = (v) => PAD.top + (1 - v) * ch;
  function redrawCurveGraph() {
    ctx.clearRect(0, 0, W, H), ctx.fillStyle = "rgba(17,9,44,0.0)", ctx.fillRect(0, 0, W, H), ctx.strokeStyle = "rgba(103,78,167,0.25)", ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const v = g / 4;
      ctx.beginPath(), ctx.moveTo(gx(0), gy(v)), ctx.lineTo(gx(1), gy(v)), ctx.stroke();
    }
    ctx.strokeStyle = "rgba(200,200,200,0.30)", ctx.lineWidth = 1.5, ctx.setLineDash([6, 5]), ctx.beginPath();
    for (let px = 0; px <= cw; px++) {
      const t2 = px / cw;
      ctx.lineTo(gx(t2), gy(t2));
    }
    ctx.stroke(), ctx.setLineDash([]), ctx.fillStyle = "rgba(200,200,200,0.45)", ctx.font = "11px monospace", ctx.textAlign = "left", ctx.fillText("linear (exp=1)", gx(0.35) + 4, gy(0.35) - 7), ctx.strokeStyle = "#f1c232", ctx.lineWidth = 2.5, ctx.beginPath();
    for (let px = 0; px <= cw; px++) {
      const t2 = px / cw, v = Math.pow(t2, EXP);
      px === 0 ? ctx.moveTo(gx(t2), gy(v)) : ctx.lineTo(gx(t2), gy(v));
    }
    ctx.stroke(), ctx.fillStyle = "#f1c232", ctx.font = "bold 12px monospace", ctx.textAlign = "left", ctx.fillText(t("info.distribution.graph-curve"), gx(0.38) + 4, gy(Math.pow(0.38, EXP)) - 8);
    for (let i = 0; i <= N; i++) {
      const t2 = i / N, v = Math.pow(t2, EXP), px = gx(t2), py = gy(v);
      ctx.fillStyle = rankColors[i], ctx.lineWidth = 1, ctx.strokeStyle = "rgba(0,0,0,0.5)", ctx.beginPath(), ctx.arc(px, py, 4, 0, Math.PI * 2), ctx.fill(), ctx.stroke(), ctx.strokeStyle = "rgba(255,255,255,0.25)", ctx.lineWidth = 1, ctx.beginPath(), ctx.moveTo(px, gy(0) + 2), ctx.lineTo(px, gy(0) + 6), ctx.stroke(), (i % 2 === 0 || i === N) && (ctx.fillStyle = rankColors[i], ctx.font = "bold 9px sans-serif", ctx.textAlign = "center", ctx.fillText(ranks[i], px, gy(0) + 17));
    }
    ctx.strokeStyle = "rgba(255,255,255,0.5)", ctx.lineWidth = 1.5, ctx.beginPath(), ctx.moveTo(gx(0), gy(0)), ctx.lineTo(gx(1), gy(0)), ctx.stroke(), ctx.beginPath(), ctx.moveTo(gx(0), gy(0)), ctx.lineTo(gx(0), gy(1)), ctx.stroke(), ctx.fillStyle = "rgba(200,200,200,0.6)", ctx.font = "10px sans-serif", ctx.textAlign = "right";
    const wrLabel = (getActiveLanguage() === "pt-BR", "0% (WR)"), fLabel = (getActiveLanguage() === "pt-BR", "100% (F)");
    [[0, wrLabel], [0.25, "25%"], [0.5, "50%"], [0.75, "75%"], [1, fLabel]].forEach(([v, lbl]) => {
      ctx.fillText(lbl, gx(0) - 5, gy(v) + 3);
    }), ctx.fillStyle = "rgba(200,200,200,0.55)", ctx.font = "11px sans-serif", ctx.textAlign = "center";
    const xLabel = t("info.distribution.graph-x-axis");
    ctx.fillText(xLabel, gx(0.5), H - 4), ctx.save(), ctx.translate(10, gy(0.5)), ctx.rotate(-Math.PI / 2), ctx.textAlign = "center";
    const yLabel = t("info.distribution.graph-y-axis");
    ctx.fillText(yLabel, 0, 0), ctx.restore();
  }
  window.redrawCurveGraph = redrawCurveGraph, redrawCurveGraph();
})();
