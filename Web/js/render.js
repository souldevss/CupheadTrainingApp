function createBossCellMarkup(boss) {
  const iconMarkup = boss.icon ? `<img src="${boss.icon}" class="boss-icon" alt="" loading="lazy" decoding="async">` : "";
  return `
        <td class="boss" style="background: ${boss.background || "#ffffff"}; color: ${boss.color || "#000000"};">
            <div class="boss-content">
                ${iconMarkup}
                <span>${escapeAttribute(cupheadDisplayName(boss.name || ""))}</span>
            </div>
        </td>
    `;
}
function renderActivePage() {
  isPersonalTimesPage ? window.autoTrainingPage ? renderAutoTimesPage() : renderPersonalTimesPage() : renderTimeTablePage();
}
