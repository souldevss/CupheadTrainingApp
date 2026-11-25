(function () {
  const page = document.body.dataset.page;
  const links = [
    ["personal-times", "index.html", "nav.training", "Training"],
    ["attempt-log", "autolog.html", "nav.attempt-log", "Attempt Log"],
    ["time-table", "index2.html", "nav.time-table", "Time Table"],
    ["backups", "backups.html", "nav.backups", "Backups"]
  ];
  const template = document.createElement("template");
  template.innerHTML = `
    <header class="app-header">
      <div id="category-tabs" class="category-tabs"${["personal-times", "time-table", "attempt-log"].includes(page) ? "" : ' aria-hidden="true"'}></div>
      <button id="check-for-updates" class="header-update" type="button" hidden data-i18n="ui.check-for-updates">Check for updates</button>
      <nav class="page-tabs" data-i18n-aria-label="ui.navigation" aria-label="Navigation">
        ${links.map(([id, href, key, label]) => `<a href="${href}"${id === page ? ' class="active"' : ""} data-i18n="${key}">${label}</a>`).join("")}
      </nav>
      <a href="info.html" class="info-nav-btn${page === "info" ? " active-info" : ""}" data-i18n-aria-label="ui.info-aria" aria-label="How it works">&#9432;</a>
      <div class="header-preferences">
        <button id="lang-toggle-btn" class="lang-toggle-btn-inline" type="button" data-i18n-aria-label="ui.language-aria" aria-label="Toggle language">
          <img src="assets/icons/us%20flag.png" alt="English" width="34" height="28">
        </button>
        <button id="mode-toggle-btn" class="mode-toggle-btn" type="button" aria-label="Switch to light mode"><img src="assets/icons/light%20mode.png" alt="" width="30" height="30"></button>
      </div>
    </header>`;
  document.currentScript.before(template.content);
})();
