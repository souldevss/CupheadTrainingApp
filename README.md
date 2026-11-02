# Cuphead Training Table

A Windows training companion for Cuphead speedrunners. Track clears and deaths automatically while you play, compare your times with training targets, and see your progress for each boss.

Built with C# / .NET 8, Windows Forms, SQLite, and a WebView2 interface. Based on [CupheadTrainingTable by souldevss](https://github.com/souldevss/CupheadTrainingTable).

## Download and run

1. Open this repository's **Releases** page and download the latest `CupheadTrainingTable-…-win-x64.zip`.
2. Extract the entire ZIP into a folder.
3. Open `CupheadTrainingLog.exe`. Keep the accompanying files and `Web` folder together.
4. Launch Cuphead. The app starts watching automatically; the watcher status shows whether it has connected.

The release includes the .NET runtime. It requires 64-bit Windows and the [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/). Install WebView2 if the interface does not open. Releases are unsigned, so Windows may show a publisher warning.

## Features

- **Automatic recording:** reads game memory to capture clear times and deaths. Retries are discarded rather than treated as deaths; King Dice miniboss victories are not individual King Dice clears.
- **Training dashboard:** personal bests, rank targets, totals, and rank distribution graphics.
- **Time table:** category-specific target times and linked reference videos where available.
- **Base game and DLC categories:** 1.1+, DLC Lobber/Spread, and DLC Charge/Spread, with category selection across the training, table, and log pages.
- **Loadout checks:** category rules account for weapons, charms, and supers, with special handling for Forest Follies and Mausoleum.
- **Boss history:** individual boss pages, clear and death history, total playtime, and deletion controls for incorrect entries.
- **Interactive progress graph:** clear times with death-rate bars, rank colors and target lines, nearest-point hover, zooming, and panning.
- **Animated Gaussian smoothing:** adjust a slider from individual clears to a broader improvement trend, with nearby runs weighted more strongly.
- **Backups:** export/import attempts, deaths, and settings; a local automatic backup is refreshed every ten minutes while the app is running.
- **English and Brazilian Portuguese**, compact mode, boss colors and icons, and interface sound effects.

## Supported game builds

Memory detection targets the Steam 1.1.x and DLC builds supported by the bundled pointer signatures. Other storefronts, patches, or mods may require additional signatures. A visible table does not by itself mean the watcher has connected to the game.

For category-based training, select the category matching your game and loadout. Forest Follies and Mausoleum are shared between the two DLC weapon categories; Forest Follies uses Peashooter, and Mausoleum has no equipment restriction.

## Your data

Data stays on your PC:

| Data | Location |
| --- | --- |
| Attempt and death database | `%LocalAppData%\CupheadTrainingLog\training.db` |
| Interface settings and WebView profile | `%LocalAppData%\CupheadTrainingLog\WebView2\` |
| Latest automatic backup | `%LocalAppData%\CupheadTrainingLog\Backups\cuphead-training-auto-backup.json` |

Use the export/import controls on the Info page to move your data between PCs. Import replaces the stored attempt/death data; export a copy first if you want to keep the current history. The automatic backup overwrites one local file, so keep separate exports for older snapshots.

Updating the app does not require deleting these folders. Personal databases, backups, browser profiles, and build output are excluded from the source repository.

## Build from source

Install the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) on Windows. From the folder containing `CupheadTrainingLog.App.csproj`:

```powershell
dotnet build .\CupheadTrainingLog.App.csproj -c Release
dotnet run --project .\CupheadTrainingLog.App.csproj -c Release
```

To make the same self-contained ZIP as the releases:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Publish.ps1 -Version 1.0.0
```

The ZIP and SHA-256 checksum appear in `artifacts/`. The script requires a fresh output directory for each version. All required source files are included here; the neighboring music-player project is not needed.

## Automatic builds and releases

GitHub Actions builds a Windows ZIP for pushes to `main`, pull requests, and manual workflow runs. These builds are downloadable from the workflow's **Artifacts** section.

To publish a versioned download on the repository's **Releases** page, push a version tag:

```powershell
git tag v1.0.1
git push origin v1.0.1
```

The workflow builds the app, creates a GitHub release with generated notes, and attaches the ZIP and checksum. Use a new version tag for each release. GitHub Pages cannot run the Windows memory-reading companion; Releases distributes the desktop app.

## Troubleshooting

- **MSB1011 / more than one project:** use the explicit `.csproj` commands above.
- **MSB1009 / project does not exist:** open a terminal in this repository's root folder, where the `.csproj` file is located.
- **Nothing is being recorded:** check the watcher status, game version, category, and equipment. The app must be able to read the running Cuphead process.
- **Missing graphics:** some icons and reference links require an internet connection.
- **High memory or CPU:** WebView2 runs multiple child processes. Graph interaction can still use substantial resources; this build is not advertised as a low-memory native interface.

When reporting a problem, include your app version, Windows and Cuphead versions, category, and reproduction steps. Only attach an exported history if you intend to share its contents.

## Credits

Thanks to the original [CupheadTrainingTable](https://github.com/souldevss/CupheadTrainingTable), the CupheadMusicPlayer memory engine, [myekul.com](https://myekul.com/), and the runners whose reference videos are linked in the table. See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for attribution. This is an unofficial project and is not affiliated with Studio MDHR.
