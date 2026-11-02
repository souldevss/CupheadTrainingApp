using System;
using System.Diagnostics;

namespace CupheadMusicPlayer.Engine.Memory
{
    public class FindPointerSignature : IFindPointer
    {
        public PointerVersion Version { get; private set; }
        private readonly AutoDeref AutoDeref;
        private readonly string Signature;
        private readonly MemorySearcher Searcher;
        private readonly int[] Relative;
        private IntPtr BasePtr;
        private DateTime LastVerified;

        public FindPointerSignature(PointerVersion version, AutoDeref autoDeref, string signature, params int[] relative)
        {
            Version = version;
            AutoDeref = autoDeref;
            Signature = signature;
            BasePtr = IntPtr.Zero;
            Searcher = new MemorySearcher();
            LastVerified = DateTime.MaxValue;
            Relative = relative;
        }

        public bool FoundBaseAddress() => BasePtr != IntPtr.Zero;

        public void VerifyPointer(Process program, ref IntPtr pointer)
        {
            DateTime now = DateTime.Now;
            if (now <= LastVerified) return;

            bool isValid = Searcher.VerifySignature(program, BasePtr, Signature);
            LastVerified = now.AddSeconds(1);
            if (isValid)
            {
                int offset = CalculateRelative(program);
                IntPtr verify = ProgramPointer.DerefPointer(program, IntPtr.Add(BasePtr, offset), AutoDeref);
                if (verify != pointer) pointer = verify;
                return;
            }

            BasePtr = IntPtr.Zero;
            pointer = IntPtr.Zero;
        }

        public IntPtr FindPointer(Process program, string asmName)
            => ProgramPointer.DerefPointer(program, GetPointer(program, asmName), AutoDeref);

        private IntPtr GetPointer(Process program, string asmName)
        {
            if (string.IsNullOrEmpty(asmName))
            {
                Searcher.MemoryFilter = delegate (MemInfo info)
                {
                    return (uint)(info.State & 0x1000) != 0 && (uint)(info.Protect & 0x40) != 0 && (uint)(info.Protect & 0x100) == 0;
                };
            }
            else
            {
                Tuple<IntPtr, IntPtr> range = ProgramPointer.GetAddressRange(program, asmName);
                Searcher.MemoryFilter = delegate (MemInfo info)
                {
                    return (ulong)info.BaseAddress >= (ulong)range.Item1 && (ulong)info.BaseAddress <= (ulong)range.Item2 && (uint)(info.State & 0x1000) != 0 && (uint)(info.Protect & 0x20) != 0 && (uint)(info.Protect & 0x100) == 0;
                };
            }

            BasePtr = Searcher.FindSignature(program, Signature);
            if (BasePtr != IntPtr.Zero)
            {
                LastVerified = DateTime.Now.AddSeconds(5);
                int offset = CalculateRelative(program);
                return IntPtr.Add(BasePtr, offset);
            }
            return BasePtr;
        }

        private int CalculateRelative(Process program)
        {
            int maxIndex = Relative.Length - 1;
            if (Relative == null || maxIndex < 0) return 0;

            int offset = 0;
            for (int i = 0; i < maxIndex; i++)
            {
                offset += Relative[i];
                offset += program.Read<int>(IntPtr.Add(BasePtr, offset)) + 4;
            }
            return offset + Relative[maxIndex];
        }
    }
}
