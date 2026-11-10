using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using CupheadTrainingApp.Training;

namespace CupheadTrainingApp.Services
{
    public static class StatsReport
    {
        public static string ToJson(RunDatabase database, bool includeRecentActivity, bool includeHistory, string categoryKey = "1-1")
        {
            if (!includeRecentActivity && !includeHistory)
                return JsonSerializer.Serialize(new { type = "statsPayload", categoryBests = database.GetCategoryBests() });

            var rows = new List<object>();
            var levels = categoryKey.StartsWith("DLC:")
                ? new[] { TrainingLevels.Category11.First(level => level.IsPlatforming), TrainingLevels.Mausoleum }.Concat(TrainingLevels.DlcBosses)
                : TrainingLevels.Category11;
            foreach (var level in levels)
            {
                var stats = database.GetBossStats(level.Name, categoryKey);
                object avg10 = "—", avg20 = "—", avg50 = "—";
                object history = Array.Empty<object>();
                object outcomeHistory = Array.Empty<object>();
                if (includeHistory)
                {
                    var recentClears = database.GetRecentClearTimes(level.Name, 50, categoryKey);
                    avg10 = FormatAverage(recentClears, 10);
                    avg20 = FormatAverage(recentClears, 20);
                    avg50 = FormatAverage(recentClears, 50);
                    history = database.GetBossAttempts(level.Name, categoryKey).Select(a => (object)new
                    {
                        id = a.Id,
                        timeSeconds = a.TimeSeconds,
                        cleared = a.Cleared,
                        when = a.RecordedAtUtc.ToLocalTime().ToString("g")
                    }).ToArray();
                    var outcomes = database.GetBossOutcomeHistory(level.Name, categoryKey);
                    outcomeHistory = outcomes.Select(outcome => (object)new
                    {
                        id = outcome.Id,
                        when = outcome.RecordedAtUtc.ToLocalTime().ToString("g"),
                        isDeath = outcome.IsDeath,
                        isClear = outcome.IsClear,
                        clearSeconds = outcome.IsClear ? (double?)outcome.TimeSeconds : null,
                        failSeconds = !outcome.IsDeath && !outcome.IsClear ? (double?)outcome.TimeSeconds : null
                    }).ToArray();
                }
                var deaths = database.GetBossDeathCount(level.Name, categoryKey);
                rows.Add(new
                {
                    level = level.Name,
                    attempts = stats.Attempts + deaths,
                    clears = stats.Clears,
                    deaths,
                    best = stats.BestClearSeconds is double b ? AttemptTracker.FormatTime(b) : "—",
                    bestSeconds = stats.BestClearSeconds,
                    totalPlaytime = FormatPlaytime(stats.TotalPlaytimeSeconds),
                    avg10,
                    avg20,
                    avg50,
                    history,
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

            var totalPlaytime = FormatPlaytime(database.GetTotalPlaytimeSeconds());
            return JsonSerializer.Serialize(new { type = "statsPayload", rows, recent, totalPlaytime,
                statsCategoryKey = categoryKey, categoryBests = database.GetCategoryBests() });
        }

        private static string FormatPlaytime(double seconds)
        {
            var duration = TimeSpan.FromSeconds(Math.Floor(Math.Max(0, seconds)));
            long hours = (long)duration.TotalHours;
            if (hours > 0)
                return $"{hours}h {duration.Minutes}m {duration.Seconds}s";
            if (duration.Minutes > 0)
                return $"{duration.Minutes}m {duration.Seconds}s";
            return $"{duration.Seconds}s";
        }

        private static string FormatAverage(List<double> values, int requiredCount)
        {
            return values.Count >= requiredCount ? AttemptTracker.FormatTime(values.Take(requiredCount).Average()) : "—";
        }

        internal static string OverallProgressJson(RunDatabase database, string categoryKey)
        {
            var improvementByBoss = database.ReadOverallOutcomes(categoryKey)
                .GroupBy(outcome => outcome.Boss)
                .ToDictionary(boss => boss.Key, boss =>
                {
                    var clears = new List<double>();
                    var intervals = new List<(int Deaths, int Attempts)>();
                    int attempts = 0, deaths = 0;
                    foreach (var outcome in boss)
                    {
                        attempts++;
                        if (outcome.IsDeath) deaths++;
                        if (outcome.ClearSeconds is not double seconds) continue;
                        clears.Add(seconds);
                        intervals.Add((deaths, attempts));
                        attempts = deaths = 0;
                    }
                    if (intervals.Count > 0 && attempts > 0)
                    {
                        var last = intervals[^1];
                        intervals[^1] = (last.Deaths + deaths, last.Attempts + attempts);
                    }
                    double baseline = clears.Count == 0 ? 1 : clears.Average();
                    return new
                    {
                        clears = clears.Select(seconds => (seconds / baseline - 1) * 100).ToArray(),
                        intervals = intervals.Select(interval => new { deaths = interval.Deaths, attempts = interval.Attempts })
                    };
                });

            return JsonSerializer.Serialize(new { type = "overallProgress", categoryKey, bosses = improvementByBoss });
        }
    }
}
