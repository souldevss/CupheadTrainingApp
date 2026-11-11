(() => {
  const exportButton = document.getElementById("export-backup"), importButton = document.getElementById("import-backup"), fileInput = document.getElementById("backup-file"), status = document.getElementById("backup-status");
  if (!exportButton || !importButton || !fileInput) return;
  const host = window.cupheadHost;
  if (!host || !host.isDesktopApp) {
    exportButton.disabled = !0, importButton.disabled = !0, status && (status.textContent = t("backup.full-desktop"));
    return;
  }
  exportButton.addEventListener("click", () => {
    host.exportBackup() && status && (status.textContent = t("backup.preparing"));
  }), importButton.addEventListener("click", () => fileInput.click()), fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (fileInput.value = "", !file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(String(reader.result)), db = backup && backup.database, storage = backup && backup.localStorage;
        if (backup.format !== "cuphead-training-table-backup" || backup.version !== 1 || !db || !Array.isArray(db.attempts) || !Array.isArray(db.deaths) || !storage || typeof storage != "object" || Array.isArray(storage))
          throw new Error(t("backup.invalid"));
        if (!confirm(tf("backup.import-confirm", { runs: db.attempts.length, deaths: db.deaths.length })))
          return;
        window.pendingCupheadBackupStorage = storage, host.importBackup(db, storage), status && (status.textContent = t("backup.importing"));
      } catch (error) {
        alert(error.message || t("backup.read-error"));
      }
    }, reader.onerror = () => alert(t("backup.select-error")), reader.readAsText(file);
  });
})();
