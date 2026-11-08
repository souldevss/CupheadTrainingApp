using System;
using System.Collections.Generic;

namespace CupheadTrainingApp.Services
{
    public static class BossNameNormalizer
    {
        private static readonly Dictionary<string, string> Aliases =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["Goopy le Grande"] = "Goopy Le Grande",
                ["Djimmi the Great"] = "Djimmi The Great",
                ["Beppi the Clown"] = "Beppi The Clown",
                ["Howling Aces"] = "The Howling Aces",
                ["Glumstone the Giant"] = "Glumstone The Giant",
            };

        public static string ToTrainingTableName(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
                return raw;
            return Aliases.TryGetValue(raw.Trim(), out var mapped) ? mapped : raw.Trim();
        }
    }
}
