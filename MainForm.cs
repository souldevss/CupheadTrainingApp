using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Text.Json;
using System.Windows.Forms;
using CupheadTrainingApp.Services;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace CupheadTrainingApp
{
    public sealed partial class MainForm : Form
    {
        private const string VirtualHost = "cuphead-training.local";

        private readonly RunDatabase database = new RunDatabase();
        private readonly AttemptTracker tracker;
        private readonly StatsReport.Cache statsReports;
        private readonly Timer pollTimer = new Timer();
        private readonly Timer memoryTrimTimer = new Timer { Interval = 3000 };
        private readonly WebView2 webView = new WebView2();

        private bool watching;
        private bool includeRecentActivity;
        private bool includeHistory;
        private bool publishStats = true;
        private string statsCategoryKey = "1-1";
        private string versionWarning;
        private string lastStatus = "Ready";
        private DateTime lastStatusPushUtc = DateTime.MinValue;
        private (bool Watching, string Status, string Warning, AttemptTracker.LiveAttemptInfo Live)? lastWatcherState;
        private static readonly JsonSerializerOptions BackupJsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };
        private static readonly JsonSerializerOptions WebJsonOptions = new(JsonSerializerDefaults.Web);
        private static readonly JsonSerializerOptions ImportJsonOptions = new() { PropertyNameCaseInsensitive = true };

        public MainForm()
        {
            tracker = new AttemptTracker(database);
            statsReports = new StatsReport.Cache(database);
            tracker.StatusChanged += s =>
            {
                lastStatus = s;
                var now = DateTime.UtcNow;
                if ((now - lastStatusPushUtc).TotalMilliseconds < 250)
                    return;
                lastStatusPushUtc = now;
                PushWatcherStatus();
            };
            tracker.VersionWarning += w =>
            {
                versionWarning = w;
                PushWatcherStatus();
            };
            tracker.AttemptLogged += OnAttemptLogged;
            tracker.DeathLogged += () =>
            {
                if (includeRecentActivity || includeHistory) PushStats();
                PushWatcherStatus();
            };

            Text = "Cuphead Training App";
            Icon = System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            var workArea = Screen.FromPoint(Cursor.Position).WorkingArea;
            MinimumSize = new Size(Math.Min(700, workArea.Width), Math.Min(480, workArea.Height));
            int width = Math.Clamp(Math.Min(1088, workArea.Height * 16 / 9), MinimumSize.Width, workArea.Width);
            int height = Math.Clamp(width * 9 / 16, MinimumSize.Height, workArea.Height);
            StartPosition = FormStartPosition.Manual;
            Bounds = new Rectangle(
                workArea.Left + (workArea.Width - width) / 2,
                workArea.Top + (workArea.Height - height) / 2,
                width, height);
            BackColor = Color.FromArgb(17, 9, 44);

            webView.Dock = DockStyle.Fill;
            Controls.Add(webView);
            Activated += (s, e) => { memoryTrimTimer.Stop(); SetWebViewMemoryTarget(false); };
            // Brief native popups/focus changes should not trigger a memory trim.
            Deactivate += (s, e) => memoryTrimTimer.Start();
            memoryTrimTimer.Tick += (s, e) =>
            {
                memoryTrimTimer.Stop();
                if (!ContainsFocus && ActiveForm != this) SetWebViewMemoryTarget(true);
            };

            pollTimer.Interval = 100;
            pollTimer.Tick += (s, e) =>
            {
                if (watching)
                    tracker.Tick();
            };

            // Start capturing automatically when the desktop app opens.
            watching = true;
            pollTimer.Start();

            Load += async (s, e) => await InitializeWebViewAsync();
            FormClosing += (s, e) =>
            {
                updateLifetime.Cancel();
                pollTimer.Stop();
                memoryTrimTimer.Stop();
                tracker.Dispose();
                database.Dispose();
            };
            FormClosed += (s, e) => memoryTrimTimer.Dispose();
        }

        private async System.Threading.Tasks.Task InitializeWebViewAsync()
        {
            string webRoot = Path.Combine(AppContext.BaseDirectory, "Web");
            string profile = Path.Combine(RunDatabase.DataDirectory, "WebView2");

            Directory.CreateDirectory(profile);
            var env = await CoreWebView2Environment.CreateAsync(null, profile);
            await webView.EnsureCoreWebView2Async(env);
#if DEVELOPER_BUILD
            using var developerScript = new StreamReader(typeof(MainForm).Assembly.GetManifestResourceStream("DeveloperRanks.js"));
            await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(await developerScript.ReadToEndAsync());
#endif
            SetWebViewMemoryTarget(ActiveForm != this);

            webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                VirtualHost,
                webRoot,
                CoreWebView2HostResourceAccessKind.Allow);

            webView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
            webView.CoreWebView2.NavigationCompleted += (s, e) =>
            {
                lastWatcherState = null;
                PushWatcherStatus();
                if (!e.IsSuccess || checkedForUpdates) return;
                checkedForUpdates = true;
                _ = CheckForUpdatesAsync(manual: false);
            };

            webView.Source = new Uri($"https://{VirtualHost}/app-shell.html?v=recent-pages");
        }

        private void SetWebViewMemoryTarget(bool inactive)
        {
            if (webView.IsDisposed || webView.CoreWebView2 == null) return;
            try
            {
                webView.CoreWebView2.MemoryUsageTargetLevel = inactive
                    ? CoreWebView2MemoryUsageTargetLevel.Low
                    : CoreWebView2MemoryUsageTargetLevel.Normal;
            }
            catch (NotImplementedException) { /* Older installed WebView runtime. */ }
            catch (System.Runtime.InteropServices.COMException) { /* Runtime unavailable while closing. */ }
        }

        private void CoreWebView2_WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                using var doc = JsonDocument.Parse(e.WebMessageAsJson);
                var root = doc.RootElement;
                if (!root.TryGetProperty("cmd", out var cmdProp))
                    return;

                string cmd = cmdProp.GetString();
                switch (cmd)
                {
                    case "setAppLanguage":
                        Text = root.TryGetProperty("portuguese", out var portuguese) && portuguese.GetBoolean()
                            ? "App de treino de Cuphead"
                            : "Cuphead Training App";
#if DEVELOPER_BUILD
                        Text += " [DEV]";
#endif
                        break;
                    case "checkForUpdates":
                        if (Uri.TryCreate(e.Source, UriKind.Absolute, out var source) &&
                            source.Scheme == Uri.UriSchemeHttps && source.Host == VirtualHost &&
                            source.AbsolutePath == "/app-shell.html")
                            _ = CheckForUpdatesAsync(manual: true);
                        break;
                    case "toggleWatching":
                        SetWatching(!watching);
                        break;
                    case "setWatching":
                        SetWatching(root.TryGetProperty("value", out var v) && v.GetBoolean());
                        break;
                    case "getWatcherState":
                        PushWatcherStatus();
                        break;
                    case "setStatsMode":
                        publishStats = !root.TryGetProperty("enabled", out var enabled) || enabled.GetBoolean();
                        includeRecentActivity = root.TryGetProperty("includeRecent", out var includeRecent) && includeRecent.GetBoolean();
                        includeHistory = root.TryGetProperty("includeHistory", out var withHistory) && withHistory.GetBoolean();
                        if (!includeHistory) statsReports.ReleaseHistory();
                        break;
                    case "getStats":
                        if (root.TryGetProperty("categoryKey", out var categoryElement) && categoryElement.GetString() is string category
                            && (category == "1-1" || category == "legacy" || category == "DLC:lobber" || category == "DLC:charge"))
                            statsCategoryKey = category;
                        if (root.TryGetProperty("includeRecent", out var requestedRecent))
                            includeRecentActivity = requestedRecent.GetBoolean();
                        if (root.TryGetProperty("includeHistory", out var requestedHistory))
                            includeHistory = requestedHistory.GetBoolean();
                        PushStats();
                        break;
                    case "getOverallProgress":
                        PostJson(statsReports.GetOverallJson(statsCategoryKey));
                        break;
                    case "getRecentAttempts":
                        if (root.TryGetProperty("categoryKey", out var recentCategory) && recentCategory.GetString() == statsCategoryKey
                            && root.TryGetProperty("offset", out var offsetElement) && offsetElement.TryGetInt32(out int offset)
                            && root.TryGetProperty("requestId", out var requestElement) && requestElement.TryGetInt32(out int requestId))
                            PostJson(StatsReport.RecentPageJson(database, statsCategoryKey, Math.Max(0, offset), requestId));
                        break;
                    case "getTrainingComparison":
                        if (root.TryGetProperty("count", out var countElement) && countElement.TryGetInt32(out int count))
                            PostJson(statsReports.GetTrainingComparisonJson(count));
                        break;
                    case "exportBackup":
                        PostJson(JsonSerializer.Serialize(new { type = "backupDatabase", database = database.ExportBackup() }, WebJsonOptions));
                        break;
                    case "autoBackup":
                        SaveAutomaticBackup(root);
                        break;
                    case "importBackup":
                        try
                        {
                            if (!root.TryGetProperty("database", out var backupJson))
                                throw new InvalidOperationException("The backup is missing attempt data.");
                            var backup = backupJson.Deserialize<RunDatabase.BackupPayload>(ImportJsonOptions);
                            database.ImportBackup(backup);
                            PostJson(JsonSerializer.Serialize(new { type = "backupImportComplete" }));
                            PushStats();
                        }
                        catch (Exception ex)
                        {
                            PostJson(JsonSerializer.Serialize(new { type = "backupImportError", message = ex.Message }));
                        }
                        break;
                    case "deleteAttempt":
                        if (root.TryGetProperty("id", out var attemptId) && attemptId.TryGetInt64(out long id))
                        {
                            database.DeleteAttempt(id);
                            PushStats();
                        }
                        break;
                    case "deleteDeath":
                        if (root.TryGetProperty("id", out var deathId) && deathId.TryGetInt64(out long deathEventId))
                        {
                            database.DeleteDeath(deathEventId);
                            PushStats();
                        }
                        break;
                    case "clearAllAttempts":
                        database.ClearAttempts();
                        PushStats();
                        break;
                }
            }
            catch
            {
                // ignore malformed host messages
            }
        }

        private void PushStats()
        {
            if (publishStats)
                PostJson(statsReports.GetJson(includeRecentActivity, includeHistory, statsCategoryKey));
        }

        private void OnAttemptLogged(AttemptTracker.AttemptLoggedEvent e)
        {
            if (e.Cleared)
            {
                PostJson(JsonSerializer.Serialize(new
                {
                    type = "applyClear",
                    bossName = e.BossName,
                    categoryKey = e.CategoryKey,
                    seconds = e.TimeSeconds
                }));
            }

            if (e.Cleared || includeRecentActivity || includeHistory) PushStats();
            PushWatcherStatus();
        }

        private void SaveAutomaticBackup(JsonElement message)
        {
            var localStorage = new Dictionary<string, string>();
            if (message.TryGetProperty("localStorage", out var storage) && storage.ValueKind == JsonValueKind.Object)
            {
                foreach (var entry in storage.EnumerateObject())
                    localStorage[entry.Name] = entry.Value.ValueKind == JsonValueKind.String ? entry.Value.GetString() ?? string.Empty : string.Empty;
            }

            var backup = new
            {
                format = "cuphead-training-table-backup",
                version = 1,
                exportedAt = DateTime.UtcNow.ToString("o"),
                localStorage,
                database = database.ExportBackup()
            };

            string directory = Path.Combine(RunDatabase.DataDirectory, "Backups");
            Directory.CreateDirectory(directory);
            string path = Path.Combine(directory, "cuphead-training-auto-backup.json");
            string temporaryPath = path + ".tmp";
            File.WriteAllText(temporaryPath, JsonSerializer.Serialize(backup, BackupJsonOptions));
            File.Move(temporaryPath, path, true);
        }

        private void PushWatcherStatus()
        {
            var live = watching ? tracker.LiveAttempt : null;
            var state = (watching, lastStatus, versionWarning, live);
            if (lastWatcherState == state) return;
            if (PostJson(JsonSerializer.Serialize(new
            {
                type = "watcherStatus",
                watching,
                status = lastStatus,
                warning = !string.IsNullOrEmpty(versionWarning),
                liveAttempt = live == null ? null : new { bossName = live.BossName, categoryKey = live.CategoryKey, seconds = live.Seconds }
            }))) lastWatcherState = state;
        }

        private void SetWatching(bool value)
        {
            watching = value;
            pollTimer.Enabled = value;
            PushWatcherStatus();
        }

        private bool PostJson(string json)
        {
            if (webView.CoreWebView2 == null)
                return false;
            try { webView.CoreWebView2.PostWebMessageAsJson(json); return true; }
            catch { return false; /* webview not ready */ }
        }
    }
}
