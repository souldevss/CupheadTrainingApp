using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Text.RegularExpressions;
using CupheadMusicPlayer.Engine.Memory;

namespace CupheadMusicPlayer.Engine
{
    internal static class GameBuildVersion
    {
        internal static PointerVersion ReadInstalledBaseVersion(Process program)
        {
            try { return ReadInstalledBaseVersion(program.MainModule.FileName); }
            catch (Exception error) when (error is Win32Exception || error is InvalidOperationException)
            {
                return PointerVersion.Steam115;
            }
        }

        // Steam calls both 1.0 and 1.1 "legacy" branches. Only the exact
        // unpatched branch enables Legacy equipment rules; 1.1.5 must not.
        internal static PointerVersion ReadInstalledBaseVersion(string executable)
        {
            try
            {
                var game = new DirectoryInfo(Path.GetDirectoryName(executable));
                var common = game.Parent;
                if (!string.Equals(common?.Name, "common", StringComparison.OrdinalIgnoreCase)
                    || !string.Equals(common.Parent?.Name, "steamapps", StringComparison.OrdinalIgnoreCase))
                    return PointerVersion.Steam115;
                string manifest = File.ReadAllText(Path.Combine(common.Parent.FullName, "appmanifest_268910.acf"));
                return ClassifyInstalledBaseVersion(manifest, game.Name);
            }
            catch (Exception error) when (error is IOException || error is UnauthorizedAccessException
                || error is ArgumentException)
            {
                return PointerVersion.Steam115;
            }
        }

        internal static PointerVersion ClassifyInstalledBaseVersion(string manifest, string gameDirectory)
        {
            string install = Regex.Match(manifest, "\"installdir\"\\s*\"([^\"]+)\"").Groups[1].Value;
            // MountedConfig describes installed files; UserConfig may describe a pending switch.
            string mounted = Regex.Match(manifest, "\"MountedConfig\"\\s*\\{([^}]*)\\}").Groups[1].Value;
            string branch = Regex.Match(mounted, "\"BetaKey\"\\s*\"([^\"]+)\"").Groups[1].Value;
            return string.Equals(install, gameDirectory, StringComparison.OrdinalIgnoreCase)
                && string.Equals(branch, "legacy", StringComparison.OrdinalIgnoreCase)
                ? PointerVersion.Steam100 : PointerVersion.Steam115;
        }
    }
}
