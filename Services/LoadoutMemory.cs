using System;
using CupheadMusicPlayer.Engine.Memory;

namespace CupheadMusicPlayer.Engine
{
    public partial class MemoryManager
    {
        public bool TryInitializeTrainingPointers()
        {
            // Resolving PlayerData selects the version. Version-dependent offsets
            // must not be read while ProgramPointer.Version still has its default.
            if (Program == null || PlayerData.GetPointer(Program) == IntPtr.Zero) return false;
            if (SceneLoader.GetPointer(Program) == IntPtr.Zero || Level.GetPointer(Program) == IntPtr.Zero) return false;
            return SceneLoader.Version == PlayerData.Version && Level.Version == PlayerData.Version;
        }

        // PlayerData.loadouts -> PlayerLoadouts.playerOne -> PlayerLoadout.
        // Mono places references first. In DLC, curseCharmPuzzleOrder and
        // usedChessBossZones precede loadouts (verified in the DLC assembly).
        public bool TryReadTrainingLoadout(out TrainingLoadout loadout)
        {
            loadout = null;
            if (Version != PointerVersion.Steam115 && Version != PointerVersion.SteamDLC) return false;
            try
            {
                int header = Version == PointerVersion.SteamDLC ? 0x10 : 0x8;
                IntPtr save = CurrentSave();
                int loadoutsOffset = Version == PointerVersion.SteamDLC ? 0x20 : 0x8;
                IntPtr loadouts = Program.Read<IntPtr>(save, loadoutsOffset);
                IntPtr player = Program.Read<IntPtr>(loadouts, header);
                if (save == IntPtr.Zero || loadouts == IntPtr.Zero || player == IntPtr.Zero) return false;
                int primary = Program.Read<int>(player, header);
                int secondary = Program.Read<int>(player, header + 4);
                int super = Program.Read<int>(player, header + 8);
                int charm = Program.Read<int>(player, header + 12);
                // A failed memory read yields zero. Never interpret that as None.
                if (primary <= 0 || secondary <= 0 || super <= 0 || charm <= 0) return false;
                loadout = new TrainingLoadout(primary, secondary, super, charm);
                return true;
            }
            catch { return false; }
        }
    }

}
