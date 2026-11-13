(function () {
  const page = document.body.dataset.page;
  const links = [
    ["personal-times", "index.html", "nav.training", "Training"],
    ["time-table", "index2.html", "nav.time-table", "Time Table"],
    ["attempt-log", "autolog.html", "nav.attempt-log", "Attempt Log"],
    ["backups", "backups.html", "nav.backups", "Backups"]
  ];
  const title = '<div id="bigtitle">Cuphead Training App</div>';
  const template = document.createElement("template");
  template.innerHTML = `
    <div class="pages">
      ${page === "personal-times" ? `<div class="training-brand"><img src="assets/icons/app-logo.png" alt="" width="88" height="88">${title}</div>` : title}
      <a href="info.html" class="info-nav-btn${page === "info" ? " active-info" : ""}" data-i18n-aria-label="ui.info-aria" aria-label="How it works">&#9432;</a>
      <div class="header-preferences">
        <button id="lang-toggle-btn" class="lang-toggle-btn-inline" type="button" data-i18n-aria-label="ui.language-aria" aria-label="Toggle language">
          <img src="https://flagcdn.com/w40/us.png" srcset="https://flagcdn.com/w80/us.png 2x" alt="English" width="28" height="21">
        </button>
      </div>
    </div>
    <div class="nav-row"><div class="page-tabs">
      ${links.map(([id, href, key, label]) => `<a href="${href}"${id === page ? ' class="active"' : ""} data-i18n="${key}">${label}</a>`).join("")}
    </div></div>`;
  document.currentScript.before(template.content);
})();
