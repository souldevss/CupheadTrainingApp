# Legacy (Cuphead 1.0) recording

Legacy has its own `legacy` key for clears, deaths, training bests, progress, projections, and backups. Existing 1.1+ records retain the `1-1` key.

The 1.0 and 1.1 memory signatures overlap, so a pointer signature alone must not enable Legacy loadout rules. `Engine/GameBuildVersion.cs` checks the running executable's Steam installation and its matching `appmanifest_268910.acf`. Only `MountedConfig.BetaKey = legacy` identifies the installed unpatched branch; `legacy-1.1.5` remains 1.1+. `UserConfig` is ignored because it can describe a pending branch switch. If the installed branch cannot be confirmed, the shared 32-bit reader defaults to 1.1+.

Legacy requires Lobber in slot 1, Roundabout in slot 2, and no super or charm. Forest Follies requires Peashooter alone. The 32-bit save/loadout layout and empty-slot normalization are shared with 1.1+.

WR references are a snapshot of myekul's `resources/vanilla.json`, with `resources/runViable.json` used for Wally Warbles, Sally Stageplay, and Cala Maria. Run-viable fallback values retain the source's whole-second precision.

Validation covers installed-branch classification, pending branch switches, loadout/category isolation, invalid equipment, truncated reads, report compatibility, and database import/deletion behavior. A running unpatched game is still needed to validate its complete clear/death lifecycle end to end.
