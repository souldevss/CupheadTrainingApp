using CupheadMusicPlayer.Engine.Memory;
using System;
using System.Diagnostics;

namespace CupheadMusicPlayer.Engine
{
    public partial class MemoryManager
    {
        //SlotSelectScreen.Awake()
        private static ProgramPointer PlayerData = new ProgramPointer(
            new FindPointerSignature(PointerVersion.Steam115, AutoDeref.Single, "FF50C083C4108887D8000000B8????????C600000FB687D800000085C0742E8B473883780C02", 13),
            new FindPointerSignature(PointerVersion.Steam120, AutoDeref.Single, "83C41083EC0C50E8????????83C41083EC0C6A00E8????????83C410E8????????E8????????8B4508C6403C00B8", 46),
            new FindPointerSignature(PointerVersion.SteamDLC, AutoDeref.Single, "55488BEC5657415641574883EC20488BF14883EC2049BB????????????????41FFD34883C42033C94883EC2049BB", 142)
        );
        //SceneLoader.Awake()
        private static ProgramPointer SceneLoader = new ProgramPointer(
            new FindPointerSignature(PointerVersion.Steam115, AutoDeref.Single, "558BEC5783EC048B7D0883EC0C57E8????????83C410B8????????8938D9EE83EC0883EC04D91C2457", 23),
            new FindPointerSignature(PointerVersion.SteamDLC, AutoDeref.Single, "55488BEC564883EC08488BF14883EC2049BB????????????????41FFD34883C42048B8????????????????488930660F57C0488BCE", 35)
        );
        //Level.Awake()
        private static ProgramPointer Level = new ProgramPointer(
            // 1.0 and 1.1 share this layout; the signature cannot distinguish them.
            new FindPointerSignature(PointerVersion.Steam115, AutoDeref.Single, "FF90????????83C4108BD08B45F8B9????????89118B978C", 15),
            new FindPointerSignature(PointerVersion.Steam120, AutoDeref.Single, "8B461C8987AC00000083EC0C578B07909090FF90C000000083C4108BC8B8", 30),
            new FindPointerSignature(PointerVersion.SteamDLC, AutoDeref.Single, "2C01000001000000EB1348B8????????????????48630089862C01000048B8????????????????4889304883EC20", 31)
        );

        private static PointerVersion detectedBaseVersion = PointerVersion.Unknown;
        private DateTime nextVersionCheckUtc;
        public static PointerVersion Version => PlayerData.Version == PointerVersion.Steam115
            ? detectedBaseVersion : PlayerData.Version;
        public Process Program { get; set; }
        public bool IsHooked { get; set; }
        public DateTime LastHooked { get; set; }

        public MemoryManager()
        {
            LastHooked = DateTime.MinValue;
        }

        public bool Loading()
        {
            //SceneLoader.doneAsyncLoading
            int offset = 0x3c;
            switch (PlayerData.Version)
            {
                case PointerVersion.Steam120: offset = 0x40; break;
                case PointerVersion.SteamDLC: offset = 0x78; break;
            }
            return !SceneLoader.Read<bool>(Program, 0x0, offset);
        }

        public string SceneName()
        {
            //SceneLoader.SceneName
            int offset = 0x8;
            switch (PlayerData.Version)
            {
                case PointerVersion.Steam120: offset = 0xc; break;
                case PointerVersion.SteamDLC: offset = 0x18; break;
            }
            return SceneLoader.Read(Program, offset, 0x0);
        }

        public float LevelTime()
        {
            //Level.Current.LevelTime
            switch (PlayerData.Version)
            {
                case PointerVersion.SteamDLC: return Level.Read<float>(Program, 0x0, 0x140);
                default: return Level.Read<float>(Program, -0x20, 0xa4);
            }
        }

        public float ScoringTime()
        {
            int offset = -0x20;
            switch (PlayerData.Version)
            {
                case PointerVersion.SteamDLC: offset = 0x0; break;
            }
            if (Level.Read<IntPtr>(Program, offset) != IntPtr.Zero)
            {
                //Level.ScoringData.time
                switch (PlayerData.Version)
                {
                    case PointerVersion.SteamDLC: return Level.Read<float>(Program, 0x20, 0x10);
                    default: return Level.Read<float>(Program, -0x4, 0x8);
                }
            }
            return 0f;
        }

        public bool LevelEnding()
        {
            //Level.Current.Ending
            switch (PlayerData.Version)
            {
                case PointerVersion.SteamDLC: return Level.Read<bool>(Program, 0x0, 0x145);
                default: return Level.Read<bool>(Program, -0x20, 0xa8);
            }
        }

        public bool LevelWon()
        {
            int offset = -0x20;
            switch (PlayerData.Version)
            {
                case PointerVersion.SteamDLC: offset = 0x0; break;
            }
            if (Level.Read<IntPtr>(Program, offset) != IntPtr.Zero)
            {
                //Level.Won
                switch (PlayerData.Version)
                {
                    case PointerVersion.SteamDLC: return Level.Read<bool>(Program, 0xd);
                    default: return Level.Read<bool>(Program, -0x17);
                }
            }
            return false;
        }

        private IntPtr CurrentSave()
        {
            //PlayerData._saveFiles[PlayerData._CurrentSaveFileIndex]
            IntPtr saves = PlayerData.Read<IntPtr>(Program, 0x3);
            int saveSlot = PlayerData.Read<int>(Program, -0x5);
            switch (PlayerData.Version)
            {
                case PointerVersion.SteamDLC: return Program.Read<IntPtr>(saves, 0x20 + (saveSlot * 8));
                default: return Program.Read<IntPtr>(saves, 0x10 + (saveSlot * 4));
            }
        }

        private void RefreshBaseVersion()
        {
            detectedBaseVersion = GameBuildVersion.ReadBaseVersion(Program);
            nextVersionCheckUtc = DateTime.UtcNow.AddSeconds(1);
        }

        public bool HookProcess()
        {
            IsHooked = Program != null && !Program.HasExited;
            if (!IsHooked && DateTime.Now > LastHooked.AddSeconds(1))
            {
                LastHooked = DateTime.Now;
                Process[] processes = Process.GetProcessesByName("Cuphead");
                Program = processes != null && processes.Length > 0 ? processes[0] : null;

                if (Program != null && !Program.HasExited)
                {
                    MemoryReader.Update64Bit(Program);
                    RefreshBaseVersion();
                    IsHooked = true;
                }
            }
            return IsHooked;
        }

        public void Dispose()
        {
            if (Program != null)
            {
                Program.Dispose();
            }
        }
    }
}
