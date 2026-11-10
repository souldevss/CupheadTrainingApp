using System;
using System.Buffers.Binary;
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
                if (save == IntPtr.Zero) return false;
                int loadoutsOffset = Version == PointerVersion.SteamDLC ? 0x20 : 0x8;
                IntPtr loadouts = Program.Read<IntPtr>(save, loadoutsOffset);
                if (loadouts == IntPtr.Zero) return false;
                IntPtr player = Program.Read<IntPtr>(loadouts, header);
                if (player == IntPtr.Zero) return false;

                // Check the entire read before treating any zero as an empty slot.
                var equipment = new byte[4 * sizeof(int)];
                if (!WinAPI.ReadProcessMemory(Program.Handle, player + header, equipment, equipment.Length, out int bytesRead)
                    || bytesRead != equipment.Length) return false;
                return TryDecodeTrainingLoadout(equipment, Version == PointerVersion.Steam115, out loadout);
            }
            catch { return false; }
        }

        internal static bool TryDecodeTrainingLoadout(ReadOnlySpan<byte> equipment, bool legacy, out TrainingLoadout loadout)
        {
            loadout = null;
            if (equipment.Length != 4 * sizeof(int)) return false;
            int primary = BinaryPrimitives.ReadInt32LittleEndian(equipment);
            int secondary = BinaryPrimitives.ReadInt32LittleEndian(equipment[4..]);
            int super = BinaryPrimitives.ReadInt32LittleEndian(equipment[8..]);
            int charm = BinaryPrimitives.ReadInt32LittleEndian(equipment[12..]);
            // Some 1.1+ saves can have zero in an untouched Super or Charm slot.
            if (legacy && super == 0) super = TrainingLoadout.None;
            if (legacy && charm == 0) charm = TrainingLoadout.None;
            if (primary <= 0 || secondary <= 0 || super <= 0 || charm <= 0) return false;
            loadout = new TrainingLoadout(primary, secondary, super, charm);
            return true;
        }
    }

}
