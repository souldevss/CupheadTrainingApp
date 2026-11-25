(function () {
  document.querySelector(".info-ranks").innerHTML = ranks.map((rank,i)=>`<span class="info-rank-badge" style="background:${ranksStyles[i].background};color:${ranksStyles[i].color}">${rank}</span>`).join("");
  const svg = document.getElementById("curve-graph"), count = ranks.length-1, left = 58, right = 650, top = 24, bottom = 208, x = value=>left+value*(right-left), y = value=>bottom-value*(bottom-top);
  function redraw() {
    const curve = Array.from({length:121},(_,i)=>`${i ? "L" : "M"}${x(i/120)},${y(Math.pow(i/120,RANK_TIME_CURVE_EXPONENT))}`).join(" ");
    svg.innerHTML = `${[0,.25,.5,.75,1].map(value=>`<line class="info-grid" x1="${left}" x2="${right}" y1="${y(value)}" y2="${y(value)}"/><text x="${left-8}" y="${y(value)+4}" text-anchor="end">${Math.round(value*100)}%</text>`).join("")}
      <path class="info-linear" d="M${left},${bottom}L${right},${top}"/>
      <path class="info-curve" d="${curve}"/>
      ${ranks.map((rank,i)=>`<circle cx="${x(i/count)}" cy="${y(Math.pow(i/count,RANK_TIME_CURVE_EXPONENT))}" r="3.5" fill="${ranksStyles[i].background}"/>${i%2===0 ? `<text x="${x(i/count)}" y="${bottom+18}" text-anchor="middle" fill="${ranksStyles[i].background}">${rank}</text>` : ""}`).join("")}
      <text x="${(left+right)/2}" y="252" text-anchor="middle">${t("info.distribution.graph-x-axis")}</text>
      <text transform="translate(13,${(top+bottom)/2}) rotate(-90)" text-anchor="middle">${t("info.distribution.graph-y-axis")}</text>`;
  }
  window.redrawCurveGraph = redraw; redraw();
})();
