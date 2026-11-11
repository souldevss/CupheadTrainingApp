using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using CupheadMusicPlayer.Engine.Memory;

namespace CupheadMusicPlayer.Engine
{
    internal static class GameBuildVersion
    {
        internal static PointerVersion ReadBaseVersion(Process program)
        {
            try { return ReadBaseVersion(program.MainModule.FileName); }
            catch (Exception error) when (error is Win32Exception || error is InvalidOperationException)
            {
                return PointerVersion.Unknown;
            }
        }

        // Read the launched game's own assembly, including portable/debug copies.
        // The overlapping 32-bit memory signatures do not identify the patch level.
        internal static PointerVersion ReadBaseVersion(string executable)
        {
            try
            {
                var game = new DirectoryInfo(Path.GetDirectoryName(executable));
                string dataDirectory = Path.Combine(game.FullName, Path.GetFileNameWithoutExtension(executable) + "_Data");
                string assembly = Path.Combine(dataDirectory, "Managed", "Assembly-CSharp.dll");
                var detected = ReadAssemblyBaseVersion(assembly);
                if (detected.HasValue) return detected.Value;
                if (!string.Equals(Path.GetFileName(dataDirectory), "Cuphead_Data", StringComparison.OrdinalIgnoreCase))
                {
                    detected = ReadAssemblyBaseVersion(Path.Combine(game.FullName, "Cuphead_Data", "Managed", "Assembly-CSharp.dll"));
                    if (detected.HasValue) return detected.Value;
                }
                return PointerVersion.Unknown;
            }
            catch (Exception error) when (error is IOException || error is UnauthorizedAccessException
                || error is ArgumentException)
            {
                return PointerVersion.Unknown;
            }
        }

        internal static PointerVersion? ReadAssemblyBaseVersion(string path)
        {
            try
            {
                using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
                using var pe = new PEReader(stream, PEStreamOptions.PrefetchMetadata);
                if (!pe.HasMetadata) return null;
                var metadata = pe.GetMetadataReader();
                foreach (var handle in metadata.TypeDefinitions)
                {
                    var type = metadata.GetTypeDefinition(handle);
                    if (!metadata.StringComparer.Equals(type.Name, "AbstractLevelWeapon")) continue;
                    bool hasBasicWeapon = false, hasWeaponCoroutine = false, hasCooldown = false;
                    foreach (var methodHandle in type.GetMethods())
                    {
                        var name = metadata.GetMethodDefinition(methodHandle).Name;
                        hasBasicWeapon |= metadata.StringComparer.Equals(name, "BeginBasic");
                        hasWeaponCoroutine |= metadata.StringComparer.Equals(name, "fireWeapon_cr");
                        hasCooldown |= metadata.StringComparer.Equals(name, "ActivateCooldown")
                            || metadata.StringComparer.Equals(name, "shot_cooldown_cr");
                    }
                    foreach (var fieldHandle in type.GetFields())
                        hasCooldown |= metadata.StringComparer.Equals(metadata.GetFieldDefinition(fieldHandle).Name, "coolingDown");
                    // The rapid-swap cooldown was added in patch 1.1.3. Read metadata
                    // only: never load or execute the game's assemblies in this app.
                    if (hasBasicWeapon && hasWeaponCoroutine)
                        return hasCooldown ? PointerVersion.Steam115 : PointerVersion.Steam100;
                    return null;
                }
            }
            catch (Exception error) when (error is IOException || error is UnauthorizedAccessException
                || error is BadImageFormatException || error is InvalidOperationException || error is ArgumentException)
            {
                // Unrecognized files remain unknown; do not assign the wrong equipment rules.
            }
            return null;
        }
    }
}
