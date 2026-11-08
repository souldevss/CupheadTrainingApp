using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace CupheadTrainingApp.Services
{
    internal static class AppUpdates
    {
        private const string Repository = "souldevss/CupheadTrainingApp";
        private const string Executable = "CupheadTrainingApp.exe";
        private static readonly HttpClient Client = new HttpClient { Timeout = TimeSpan.FromMinutes(5) };

        internal static Version InstalledVersion { get; } = new Version(
            typeof(AppUpdates).Assembly.GetName().Version.ToString(3));

        internal sealed record Release(Version Version, string Notes);
        internal sealed record Update(Release Latest, string Changelog, string PackageName);

        static AppUpdates()
        {
            Client.DefaultRequestHeaders.UserAgent.ParseAdd("CupheadTrainingApp/" + InstalledVersion);
        }

        internal static async Task<Update> CheckAsync(CancellationToken cancellation)
        {
            const int pageSize = 100;
            var newer = new List<Release>();
            var installable = new HashSet<Version>();
            for (int page = 1; ; page++)
            {
                using var response = await Client.GetAsync(
                    $"https://api.github.com/repos/{Repository}/releases?per_page={pageSize}&page={page}", cancellation);
                response.EnsureSuccessStatusCode();
                using var releases = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellation));
                foreach (var release in releases.RootElement.EnumerateArray())
                {
                    string tag = release.GetProperty("tag_name").GetString();
                    if (release.GetProperty("draft").GetBoolean() || release.GetProperty("prerelease").GetBoolean() ||
                        !Regex.IsMatch(tag, @"^v\d+\.\d+\.\d+$") ||
                        !Version.TryParse(tag[1..], out var version) || version <= InstalledVersion)
                        continue;

                    newer.Add(new Release(version, release.GetProperty("body").GetString()));
                    string package = PackageName(version) + ".zip";
                    var assets = release.GetProperty("assets").EnumerateArray()
                        .Where(asset => asset.GetProperty("state").GetString() == "uploaded")
                        .Select(asset => asset.GetProperty("name").GetString()).ToHashSet(StringComparer.Ordinal);
                    if (assets.Contains(package) && assets.Contains(package + ".sha256"))
                        installable.Add(version);
                }
                if (releases.RootElement.GetArrayLength() < pageSize) break;
            }

            var latest = newer.Where(release => installable.Contains(release.Version))
                .OrderByDescending(release => release.Version).FirstOrDefault();
            if (latest == null) return null;

            var changelog = newer.Where(release => release.Version <= latest.Version)
                .OrderByDescending(release => release.Version)
                .Select(release => $"v{release.Version}\r\n{release.Notes?.Trim()}");
            return new Update(latest, string.Join("\r\n\r\n", changelog), PackageName(latest.Version));
        }

        internal static async Task DownloadAndLaunchInstallerAsync(Update update, string failureMessage, CancellationToken cancellation)
        {
            if (!string.Equals(Path.GetFileName(Environment.ProcessPath), Executable, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Start CupheadTrainingApp.exe to install an update.");

            string directory = Directory.CreateTempSubdirectory("CupheadTrainingApp-update-").FullName;
            try
            {
                string archiveName = update.PackageName + ".zip";
                string archive = Path.Combine(directory, archiveName);
                string download = $"https://github.com/{Repository}/releases/download/v{update.Latest.Version}/{archiveName}";
                string checksum = await Client.GetStringAsync(download + ".sha256", cancellation);
                var match = Regex.Match(checksum.Trim(), @"\A([a-fA-F0-9]{64})\s+" + Regex.Escape(archiveName) + @"\z");
                if (!match.Success) throw new InvalidDataException("The release checksum is invalid.");

                using (var response = await Client.GetAsync(download, HttpCompletionOption.ResponseHeadersRead, cancellation))
                {
                    response.EnsureSuccessStatusCode();
                    await using var file = File.Create(archive);
                    await response.Content.CopyToAsync(file, cancellation);
                }

                await Task.Run(async () =>
                {
                    await using var file = File.OpenRead(archive);
                    byte[] actual = await SHA256.HashDataAsync(file, cancellation);
                    if (!string.Equals(Convert.ToHexString(actual), match.Groups[1].Value, StringComparison.OrdinalIgnoreCase))
                        throw new InvalidDataException("The downloaded package did not match the published checksum.");

                    string unpacked = Path.Combine(directory, "package");
                    ZipFile.ExtractToDirectory(archive, unpacked);
                    string payload = Path.Combine(unpacked, update.PackageName);
                    string app = Path.Combine(payload, Executable);
                    if (!File.Exists(app) ||
                        FileVersionInfo.GetVersionInfo(app).ProductVersion?.Split('+')[0] != update.Latest.Version.ToString() ||
                        !File.Exists(Path.Combine(payload, "Web", "app-shell.html")) ||
                        !File.Exists(Path.Combine(payload, "e_sqlite3.dll")))
                        throw new InvalidDataException("The update package is incomplete or has the wrong version.");
                }, cancellation);

                cancellation.ThrowIfCancellationRequested();
                string script = Path.Combine(directory, "ApplyUpdate.ps1");
                using (var source = typeof(AppUpdates).Assembly.GetManifestResourceStream("ApplyUpdate.ps1"))
                using (var file = File.Create(script))
                    source.CopyTo(file);

                var start = new ProcessStartInfo(Path.Combine(Environment.SystemDirectory, "WindowsPowerShell", "v1.0", "powershell.exe"))
                {
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WorkingDirectory = Path.GetTempPath()
                };
                foreach (string argument in new[] { "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script })
                    start.ArgumentList.Add(argument);
                start.Environment["CUPHEAD_UPDATE_INSTALL"] = Path.GetDirectoryName(Environment.ProcessPath);
                start.Environment["CUPHEAD_UPDATE_PAYLOAD"] = Path.Combine(directory, "package", update.PackageName);
                start.Environment["CUPHEAD_UPDATE_PID"] = Environment.ProcessId.ToString();
                start.Environment["CUPHEAD_UPDATE_FAILURE"] = failureMessage;
                using var installer = Process.Start(start) ?? throw new IOException("The update installer could not start.");
            }
            catch
            {
                try { Directory.Delete(directory, recursive: true); }
                catch (IOException) { }
                catch (UnauthorizedAccessException) { }
                throw;
            }
        }

        private static string PackageName(Version version) => $"CupheadTrainingApp-{version}-win-x64";
    }
}
