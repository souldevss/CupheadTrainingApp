using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using CupheadTrainingApp.Training;

namespace CupheadTrainingApp.Services
{
    public static class StatsReport
    {
        // Retain only the latest report of each kind, rather than every category's history.
        public sealed class Cache
        {
            private readonly RunDatabase database;
            private (long Revision, bool Recent, bool History, string Category)? lastRequest;
            private (long Revision, string Category)? lastOverallRequest;
            private string report, overallReport;
            private (long Revision, int Count)? lastComparisonRequest;
            private string comparisonReport;

            public Cache(RunDatabase database) => this.database = database;

            public string GetTrainingComparisonJson(int count)
            {
                count = Math.Clamp(count, 1, 10000);
                var request = (database.Revision, count);
                if (lastComparisonRequest != request)
                {
                    comparisonReport = JsonSerializer.Serialize(new {
                        type = "trainingComparison", count, rows = database.GetTrainingAverages(count)
                    });
                    lastComparisonRequest = request;
                }
                return comparisonReport;
            }

            public void ReleaseHistory()
            {
                if (lastRequest?.History == true)
                {
                    lastRequest = null;
                    report = null;
                }
                lastOverallRequest = null;
                overallReport = null;
            }

            public string GetJson(bool recent, bool history, string category)
            {
                var request = (database.Revision, recent, history, recent || history ? category : null);
                if (lastRequest != request)
                {
                    report = ToJson(database, recent, history, category);
                    lastRequest = request;
                }
                return report;
            }

            public string GetOverallJson(string category)
            {
                var request = (database.Revision, category);
                if (lastOverallRequest != request)
                {
                    overallReport = OverallProgressJson(database, category);
                    lastOverallRequest = request;
                }
                return overallReport;
            }
        }

        public static string ToJson(RunDatabase database, bool includeRecentActivity, bool includeHistory, string categoryKey = "1-1")
        {
            if (!includeRecentActivity && !includeHistory)
                return JsonSerializer.Serialize(new { type = "statsPayload", categoryBests = database.GetCategoryBests() });

            var rows = new List<object>();
            var categoryStats = database.GetCategoryStats(categoryKey);
            var categoryHistory = includeHistory
                ? database.GetCategoryActivity(categoryKey).ToLookup(activity => activity.BossName) : null;
            var levels = categoryKey.StartsWith("DLC:", StringComparison.Ordinal)
                ? TrainingLevels.CategoryDlc
                : TrainingLevels.Category11;
            foreach (var level in levels)
            {
                var stats = categoryStats.TryGetValue(level.Name, out var existing) ? existing : new RunDatabase.BossStats();
                object avg10 = "—", avg20 = "—", avg50 = "—";
                object history = Array.Empty<object>();
                object outcomeHistory = Array.Empty<object>();
                if (includeHistory)
                {
                    var outcomes = categoryHistory[level.Name].ToArray();
                    var attempts = outcomes.Where(outcome => !outcome.IsDeath).OrderBy(attempt => attempt.Id).ToArray();
                    var recentClears = attempts.Reverse().Where(attempt => attempt.Cleared).Take(50)
                        .Select(attempt => attempt.TimeSeconds).ToList();
                    avg10 = FormatAverage(recentClears, 10);
                    avg20 = FormatAverage(recentClears, 20);
                    avg50 = FormatAverage(recentClears, 50);
                    history = attempts.Select(a => (object)new
                    {
                        id = a.Id,
                        timeSeconds = a.TimeSeconds,
                        cleared = a.Cleared,
                        when = a.RecordedAtUtc.ToLocalTime().ToString("g")
                    }).ToArray();
                    outcomeHistory = outcomes.Select(outcome => (object)new
                    {
                        id = outcome.Id,
                        when = outcome.RecordedAtUtc.ToLocalTime().ToString("g"),
                        isDeath = outcome.IsDeath,
                        isClear = outcome.Cleared,
                        clearSeconds = outcome.Cleared ? (double?)outcome.TimeSeconds : null,
                        failSeconds = !outcome.IsDeath && !outcome.Cleared ? (double?)outcome.TimeSeconds : null
                    }).ToArray();
                }
                var deaths = stats.Deaths;
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

            var recentActivity = includeRecentActivity ? database.GetRecentActivity(21, categoryKey) : new List<RunDatabase.ActivityRow>();
            var recent = recentActivity.Take(20).Select(RecentRow).ToArray();

            var totalPlaytime = FormatPlaytime(database.GetTotalPlaytimeSeconds());
            return JsonSerializer.Serialize(new { type = "statsPayload", rows, recent, recentHasMore = recentActivity.Count > 20, totalPlaytime,
                statsCategoryKey = categoryKey, categoryBests = database.GetCategoryBests() });
        }

        public static string RecentPageJson(RunDatabase database, string categoryKey, int offset, int requestId)
        {
            var activity = database.GetRecentActivity(21, categoryKey, offset);
            return JsonSerializer.Serialize(new { type = "recentAttemptsPage", categoryKey, offset, requestId,
                rows = activity.Take(20).Select(RecentRow).ToArray(), hasMore = activity.Count > 20 });
        }

        private static object RecentRow(RunDatabase.ActivityRow row) => new {
            id = row.Id, when = row.RecordedAtUtc.ToLocalTime().ToString("g"), level = row.BossName,
            kind = row.IsDeath ? "death" : "run", result = row.IsDeath ? "Death" : row.Cleared ? "Clear" : "Fail",
            time = row.IsDeath ? null : AttemptTracker.FormatTime(row.TimeSeconds)
        };

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
