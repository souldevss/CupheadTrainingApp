using System;
using System.Collections.Generic;

namespace CupheadTrainingLog.Training
{
    /// <summary>Training-table rank thresholds (mirrors data.js).</summary>
    public static class RankGrades
    {
        public static readonly string[] Ranks =
        {
            "WR", "S", "A++", "A+", "A", "A-", "B+", "B", "B-",
            "C+", "C", "C-", "D+", "D", "D-", "E+", "E", "E-", "F"
        };

        private const double DefaultWrToFRatio = 0.723;
        private const double RankTimeCurveExponent = 1.35;

        public static string GradeForTime(double timeSeconds, TrainingLevels.LevelDef level)
        {
            var thresholds = BuildThresholds(level.FRankSeconds, level.WrSeconds);
            if (thresholds.Count == 0)
                return "—";

            for (int i = 0; i < thresholds.Count; i++)
            {
                if (timeSeconds <= thresholds[i])
                    return Ranks[i];
            }

            return "F";
        }

        public static IReadOnlyList<double> BuildThresholds(double fRankTime, double? wrTime)
        {
            if (fRankTime <= 0)
                return Array.Empty<double>();

            if (wrTime.HasValue && wrTime.Value > 0 && wrTime.Value < fRankTime)
            {
                var anchored = new List<double>(Ranks.Length);
                for (int i = 0; i < Ranks.Length; i++)
                {
                    double progress = GetRankCurveProgress(i);
                    double wr = wrTime.Value;
                    anchored.Add(RoundTime(wr + (fRankTime - wr) * progress));
                }

                return anchored;
            }

            var multipliers = CreateDefaultMultipliers();
            var scaled = new List<double>(Ranks.Length);
            foreach (double m in multipliers)
                scaled.Add(RoundTime(fRankTime * m));
            return scaled;
        }

        private static double GetRankCurveProgress(int rankIndex)
        {
            if (Ranks.Length <= 1)
                return 1;
            double linear = rankIndex / (double)(Ranks.Length - 1);
            return Math.Pow(linear, RankTimeCurveExponent);
        }

        private static IReadOnlyList<double> CreateDefaultMultipliers()
        {
            var list = new List<double>(Ranks.Length);
            for (int i = 0; i < Ranks.Length; i++)
            {
                double progress = GetRankCurveProgress(i);
                list.Add(Math.Round(DefaultWrToFRatio + (1 - DefaultWrToFRatio) * progress, 4));
            }

            return list;
        }

        private static double RoundTime(double value)
            => Math.Round(value * 100) / 100;
    }
}
