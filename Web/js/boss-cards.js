function renderBossCard(row) {
  const name = safeText(cupheadDisplayName(row.level)), asset = BOSS_CARD_ASSETS[row.level], art = bossArt.get(row.level) || {};
  return `<button class="boss-stat-card" type="button" data-boss="${safeText(row.level)}" style="--boss-card-bg:${safeText(art.background || '#6b5285')}">
    <span class="boss-card-information">
      <span><small>${t("autolog.clears-label")}</small><b>${row.clears}</b></span>
      <span><small>${t("autolog.deaths-label")}</small><b>${row.deaths}</b></span>
    </span>
    <span class="boss-card-identity">${asset ? `<img class="boss-card-portrait" src="${asset.src}" alt="" loading="lazy">` : ""}</span>
    <span class="boss-card-name">${name}</span>
      <span class="boss-paper-playtime"><small>${t("autolog.playtime")}</small><b>${safeText(row.totalPlaytime || "0s")}</b></span>
  </button>`;
}
