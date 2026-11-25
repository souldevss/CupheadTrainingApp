# Cuphead Training App

Practice tracker for Cuphead speedruns on Windows. Records clears, deaths, and playtime automatically, with graphs to follow your progress.

**[Download v1.4.0](https://github.com/souldevss/CupheadTrainingApp/releases/tag/v1.4.0)** · [Release notes](release-notes/v1.4.0.md) · [Web training table](https://souldevss.github.io/CupheadTrainingTable/)

> [!CAUTION]
> **Windows may block the app, even if an earlier version worked.**
> Releases are unsigned. SmartScreen can show an unknown-publisher warning, and Smart App Control can block the executable or its DLLs. This project does not currently have a trusted signing certificate.

> [!WARNING]
> **This project is fully vibe-coded with AI assistance.** Expect bugs, particularly on game versions and setups that have not been tested.

## Install

1. Download `CupheadTrainingApp-1.4.0-win-x64.zip` from the release page.
2. Extract the **whole ZIP** and open `CupheadTrainingApp.exe`.
3. Launch Cuphead. The watcher status shows when the app connects.

Requires 64-bit Windows and [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/). **.NET is included.** The app checks for updates on startup; use **Check for updates** at the top left to review and install a release.

## Inside the app

| Page | What it does |
| --- | --- |
| Training | Compare your PB or a chosen number of recent clears with rank targets. |
| Attempt Log | Boss cards, clear/death history, playtime, averages, and interactive progress graphs. |
| Time Table | Rank targets and reference videos. |
| Backups | Import or export your data. A local backup refreshes every 10 minutes. |
| How it Works | Rank explanations and the distribution curve. |

Supports **Legacy (1.0)**, **1.1+**, and **DLC**, with separate DLC Lobber/Spread and Charge/Spread histories. Legacy uses Lobber/Roundabout; 1.1+ uses Lobber/Spread. Forest Follies uses Peashooter, and Mausoleum has no equipment restriction.

## Your data

History stays in `%LocalAppData%\CupheadTrainingLog\training.db`. Automatic backups are in `%LocalAppData%\CupheadTrainingLog\Backups\cuphead-training-auto-backup.json`; interface settings are in the adjacent `WebView2` folder.

The automatic backup keeps one snapshot. Use **Backups → Export** to keep another copy or move your data to another PC. Importing merges history and skips duplicates.

## Build

Install the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0), then run from the folder containing `CupheadTrainingApp.csproj`:

```powershell
dotnet build .\CupheadTrainingApp.csproj -c Release
dotnet run --project .\CupheadTrainingApp.csproj -c Release
```

For a ZIP with .NET included, run `powershell -ExecutionPolicy Bypass -File .\scripts\Publish.ps1 -Version 1.4.0`. The ZIP and SHA-256 checksum appear in `artifacts/`. Releases are built automatically when a version tag is pushed with matching notes in `release-notes/`.

**To do:** Balance DLC times.

Built with C#, Windows Forms, SQLite, and WebView2. Based on [Cuphead Training Table](https://github.com/souldevss/CupheadTrainingTable). See [third-party credits](THIRD-PARTY-NOTICES.md).
