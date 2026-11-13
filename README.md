# Cuphead Training App

A Windows app for Cuphead speedrunners. Automatically record clears and deaths, compare your times with training targets, and see how you improve.

> [!CAUTION]
> **WINDOWS MAY BLOCK THE APP — INCLUDING AFTER AN UPDATE**
>
> Releases are currently **unsigned**. Windows SmartScreen may show an unknown-publisher warning, and **Smart App Control can prevent the app or its DLL from running entirely**, even if previous versions worked. An automatic update can install successfully and then be blocked when the app restarts.
>
> This can also begin when Smart App Control switches from **Evaluation** to **On**. Waiting a few minutes or downloading the same release again does **not** guarantee it will be allowed. Smart App Control has no per-app “allow anyway” exception. See [Microsoft’s Smart App Control FAQ](https://support.microsoft.com/en-gb/windows/security/threat-malware-protection/smart-app-control-frequently-asked-questions) for details.

> [!WARNING]
> **This project is vibe-coded.** It was built with AI assistance. If you are not OK with that, don't download. Expect bugs, especially on game builds or setups that haven’t been tested.

[Download for Windows](https://github.com/souldevss/CupheadTrainingApp/releases/latest) · [Web training table](https://souldevss.github.io/CupheadTrainingTable/)

## Get started

1. Download `CupheadTrainingApp-…-win-x64.zip` from Releases.
2. Extract the whole ZIP and open `CupheadTrainingApp.exe`.
3. Launch Cuphead and check the watcher status to see when it connects.

.NET is bundled. The app requires 64-bit Windows and the [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/). Windows may show a publisher warning because the releases are unsigned.

The app checks for updates on startup. You can also use **Backups → Check for updates** to read the changelog and install an update.

## What it tracks

- **Training** compares your PB or the average of your latest chosen number of clears with rank targets. **Time Table** shows targets and reference videos where available.
- **Attempt Log** records clears, deaths, and playtime. Boss pages show clear-time and death-rate trends. Use the boss sidebar to switch bosses or open **Overall Progress**. Recent and individual boss attempts use compact grids, loading 20 entries at a time.
- **Run Projection** estimates pace and first-try odds. Import a `.rrc` file in **Run Recap** to browse runs and add matching recap data to the projection.
- **Backups** imports or exports your history and settings. The app refreshes a local backup every ten minutes.

Tracking has separate Steam **Legacy (1.0)**, **1.1+**, and **DLC** categories. Legacy requires Lobber in the first slot and Roundabout in the second; 1.1+ uses Lobber/Spread. DLC keeps separate Lobber/Spread and Charge/Spread histories. Forest Follies uses Peashooter, and Mausoleum has no equipment restriction.

## Where your data lives

| Data | Path |
| --- | --- |
| Training history | `%LocalAppData%\CupheadTrainingLog\training.db` |
| Interface settings | `%LocalAppData%\CupheadTrainingLog\WebView2\` |
| Latest automatic backup | `%LocalAppData%\CupheadTrainingLog\Backups\cuphead-training-auto-backup.json` |

The automatic backup keeps one snapshot. Use **Backups → Export** for a copy you can keep or move to another PC.

## To do

- Balance DLC times

## Build from source

Install the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) and run these commands from the folder containing `CupheadTrainingApp.csproj`.

```powershell
dotnet build .\CupheadTrainingApp.csproj -c Release
dotnet run --project .\CupheadTrainingApp.csproj -c Release
```

Use `powershell -ExecutionPolicy Bypass -File .\scripts\Publish.ps1 -Version 1.3.1` to create a self-contained ZIP and checksum in `artifacts/`. GitHub Actions publishes a release when you push a new version tag with matching notes in `release-notes/`.

Built with C#, Windows Forms, SQLite, and WebView2. Based on the [Cuphead Training Table](https://github.com/souldevss/CupheadTrainingTable).
