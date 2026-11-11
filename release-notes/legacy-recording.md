# Legacy (Cuphead 1.0) recording

Legacy has its own `legacy` key for clears, deaths, training bests, progress, projections, and backups. Existing 1.1+ records retain the `1-1` key.

The 1.0 and 1.1 memory signatures overlap, so a pointer signature alone must not enable Legacy loadout rules. `Engine/GameBuildVersion.cs` reads metadata from the launched executable's `Cuphead_Data/Managed/Assembly-CSharp.dll`, without loading or executing the assembly. The base weapon class's cooldown field/methods distinguish patched 1.1+ from the pre-patch Legacy implementation. This check is performed once when attaching to the process and also works for copies outside Steam.

Steam directories, branch names and manifests are not consulted. If the assembly is unavailable or unrecognized, the version stays unknown and tracking waits instead of guessing the 1.1 equipment rules. Unknown builds are retried at most once per second until readable. The memory reader continues to identify pointer layouts independently, including DLC.

Legacy requires Lobber in slot 1, Roundabout in slot 2, and no super or charm. Forest Follies requires Peashooter alone. The 32-bit save/loadout layout and empty-slot normalization are shared with 1.1+.

WR references are a snapshot of myekul's `resources/vanilla.json`, with `resources/runViable.json` used for Wally Warbles, Sally Stageplay, and Cala Maria. Run-viable fallback values retain the source's whole-second precision.

Validation covers actual installed 1.1.5 metadata, the older Debug Mod reference assembly, portable-copy fixtures, conflicting manifests, malformed/missing assemblies, loadout/category isolation, invalid equipment, truncated reads, report compatibility, and database import/deletion behavior. The private preview was also confirmed working by an external tester on Legacy.
