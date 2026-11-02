using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using CupheadTrainingLog.Training;

namespace CupheadTrainingLog.Services
{
    public static class StatsReport
    {
        public static string ToJson(RunDatabase database, bool includeRecentActivity, bool includeHistory, string categoryKey = "1-1")
        {
            var rows = new List<object>();
            var levels = categoryKey.StartsWith("DLC:")
                ? new[] { TrainingLevels.Category11.First(level => level.IsPlatforming), TrainingLevels.Mausoleum }.Concat(TrainingLevels.DlcBosses)
                : TrainingLevels.Category11;
            foreach (var level in levels)
            {
                var stats = database.GetBossStats(level.Name, categoryKey);
                object avg10 = "—", avg20 = "—", avg50 = "—";
                object history = Array.Empty<object>();
                object deathRates = Array.Empty<object>();
                object outcomeHistory = Array.Empty<object>();
                if (includeHistory)
                {
                    avg10 = FormatAverage(database.GetRecentClearTimes(level.Name, 10, categoryKey), 10);
                    avg20 = FormatAverage(database.GetRecentClearTimes(level.Name, 20, categoryKey), 20);
                    avg50 = FormatAverage(database.GetRecentClearTimes(level.Name, 50, categoryKey), 50);
                    history = database.GetBossAttempts(level.Name, categoryKey).Select(a => (object)new
                    {
                        id = a.Id,
                        timeSeconds = a.TimeSeconds,
                        cleared = a.Cleared,
                        when = a.RecordedAtUtc.ToLocalTime().ToString("g")
                    }).ToArray();
                    var outcomes = database.GetBossOutcomeHistory(level.Name, categoryKey);
                    outcomeHistory = outcomes.Select(outcome => (object)new { isDeath = outcome.IsDeath, isClear = outcome.IsClear }).ToArray();
                    deathRates = Enumerable.Range(0, (outcomes.Count + 9) / 10).Select(bucket =>
                    {
                        var start = bucket * 10;
                        var count = Math.Min(10, outcomes.Count - start);
                        var deaths = outcomes.Skip(start).Take(count).Count(outcome => outcome.IsDeath);
                        return (object)new
                        {
                            startAttempt = start + 1,
                            endAttempt = start + count,
                            percent = count == 0 ? 0 : Math.Round(deaths * 100.0 / count, 1)
                        };
                    }).ToArray();
                }
                rows.Add(new
                {
                    level = level.Name,
                    attempts = stats.Attempts + database.GetBossDeathCount(level.Name, categoryKey),
                    clears = stats.Clears,
                    deaths = database.GetBossDeathCount(level.Name, categoryKey),
                    best = stats.BestClearSeconds is double b ? AttemptTracker.FormatTime(b) : "—",
                    bestSeconds = stats.BestClearSeconds,
                    totalPlaytime = AttemptTracker.FormatTime(stats.TotalPlaytimeSeconds),
                    avg10,
                    avg20,
                    avg50,
                    history,
                    deathRates,
                    outcomeHistory
                });
            }

            object recent = includeRecentActivity ? database.GetRecentActivity(60, categoryKey).Select(r => (object)new
                {
                    id = r.Id,
                    when = r.RecordedAtUtc.ToLocalTime().ToString("g"),
                    level = r.BossName,
                    kind = r.IsDeath ? "death" : "run",
                    result = r.IsDeath ? "Death" : r.Cleared ? "Clear" : "Fail",
                    time = r.IsDeath ? null : AttemptTracker.FormatTime(r.TimeSeconds)
                }).ToArray() : Array.Empty<object>();

            return JsonSerializer.Serialize(new { type = "statsPayload", rows, recent,
                statsCategoryKey = categoryKey, categoryBests = database.GetCategoryBests() });
        }

        private static string FormatAverage(List<double> values, int requiredCount)
        {
            return values.Count == requiredCount ? AttemptTracker.FormatTime(values.Average()) : "—";
        }
    }
}
