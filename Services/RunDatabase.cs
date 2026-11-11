using System;
using System.Collections.Generic;
using System.IO;
using Microsoft.Data.Sqlite;

namespace CupheadTrainingApp.Services
{
    public sealed class RunDatabase : IDisposable
    {
        private readonly SqliteConnection connection;
        public long Revision { get; private set; }

        internal static readonly string DataDirectory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
#if DEVELOPER_BUILD
            "CupheadTrainingLog-Developer");
#else
            "CupheadTrainingLog");
#endif

        public RunDatabase() : this(Path.Combine(DataDirectory, "training.db")) { }

        internal RunDatabase(string path)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path)));
            connection = new SqliteConnection($"Data Source={path}");
            connection.Open();
            EnsureSchema();
        }

        private void EnsureSchema()
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = @"
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boss_name TEXT NOT NULL,
  scene_id TEXT NOT NULL,
  cleared INTEGER NOT NULL,
  time_seconds REAL NOT NULL,
  deaths INTEGER NOT NULL,
  recorded_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS death_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boss_name TEXT NOT NULL,
  scene_id TEXT NOT NULL,
  recorded_at TEXT NOT NULL
);";
            cmd.ExecuteNonQuery();

            foreach (string categoryTable in new[] { "attempts", "death_events" })
            using (var columns = connection.CreateCommand())
            {
                columns.CommandText = $"PRAGMA table_info({categoryTable});";
                bool hasCategory = false;
                using (var reader = columns.ExecuteReader())
                    while (reader.Read()) hasCategory |= reader.GetString(1) == "category_key";
                if (!hasCategory)
                {
                    columns.CommandText = $"ALTER TABLE {categoryTable} ADD COLUMN category_key TEXT NULL;";
                    columns.ExecuteNonQuery();
                }
            }

            // Preserve deaths from older releases as standalone events. Older
            // rows stored a death total on the run, so their original timestamps
            // are approximate; new events are recorded at the actual death.
            using var migrate = connection.CreateCommand();
            migrate.CommandText = @"
WITH RECURSIVE seq(n) AS (
  SELECT 1 UNION ALL SELECT n + 1 FROM seq
  WHERE n < (SELECT COALESCE(MAX(deaths), 0) FROM attempts)
)
INSERT INTO death_events (boss_name, scene_id, recorded_at)
SELECT a.boss_name, a.scene_id, a.recorded_at
FROM attempts a JOIN seq ON seq.n <= a.deaths
WHERE a.deaths > 0;
UPDATE attempts SET deaths = 0 WHERE deaths > 0;";
            migrate.ExecuteNonQuery();

            // User-authorized acceptance of pre-loadout history. Persist the tags
            // so every consumer, including older category queries, sees the records.
            using var acceptHistory = connection.CreateCommand();
            acceptHistory.CommandText = @"UPDATE attempts SET category_key =
CASE WHEN scene_id IN ('scene_level_old_man', 'scene_level_snow_cult',
'scene_level_airplane', 'scene_level_flying_cowboy', 'scene_level_rum_runners',
'scene_level_saltbaker') OR boss_name IN ('Glumstone The Giant', 'Mortimer Freeze',
'The Howling Aces', 'Esther Winchester', 'Moonshine Mob', 'Chef Saltbaker')
THEN 'DLC:lobber' ELSE '1-1' END WHERE category_key IS NULL OR category_key = '';";
            acceptHistory.ExecuteNonQuery();
            acceptHistory.CommandText = acceptHistory.CommandText.Replace("UPDATE attempts", "UPDATE death_events");
            acceptHistory.ExecuteNonQuery();
            using var indexes = connection.CreateCommand();
            indexes.CommandText = @"CREATE INDEX IF NOT EXISTS attempts_category_boss ON attempts(category_key, boss_name, recorded_at, id);
CREATE INDEX IF NOT EXISTS deaths_category_boss ON death_events(category_key, boss_name, recorded_at, id);";
            indexes.ExecuteNonQuery();
        }

        public void InsertAttempt(string bossName, string sceneId, bool cleared, double timeSeconds, DateTime recordedAtUtc, string categoryKey = null)
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = @"
INSERT INTO attempts (boss_name, scene_id, cleared, time_seconds, deaths, recorded_at, category_key)
VALUES ($boss, $scene, $cleared, $time, 0, $at, $category);";
            cmd.Parameters.AddWithValue("$boss", bossName);
            cmd.Parameters.AddWithValue("$scene", sceneId);
            cmd.Parameters.AddWithValue("$cleared", cleared ? 1 : 0);
            cmd.Parameters.AddWithValue("$time", timeSeconds);
            cmd.Parameters.AddWithValue("$at", recordedAtUtc.ToString("o"));
            cmd.Parameters.AddWithValue("$category", (object)categoryKey ?? DBNull.Value);
            cmd.ExecuteNonQuery();
            Revision++;
        }

        public List<object> GetCategoryBests()
        {
            var bests = new List<object>();
            using var cmd = connection.CreateCommand();
            // The user explicitly accepts all legacy attempts as trusted.
            // Untagged DLC history defaults to L/S; explicit C/S tags stay intact.
            cmd.CommandText = @"WITH categorized AS (
SELECT boss_name, cleared, time_seconds, COALESCE(category_key,
CASE WHEN scene_id IN ('scene_level_old_man', 'scene_level_snow_cult',
'scene_level_airplane', 'scene_level_flying_cowboy', 'scene_level_rum_runners',
'scene_level_saltbaker') OR boss_name IN ('Glumstone The Giant', 'Mortimer Freeze',
'The Howling Aces', 'Esther Winchester', 'Moonshine Mob', 'Chef Saltbaker')
THEN 'DLC:lobber' ELSE '1-1' END) AS trusted_category FROM attempts)
SELECT boss_name, trusted_category, MIN(time_seconds) FROM categorized
WHERE cleared = 1 AND trusted_category IN ('1-1', 'legacy', 'DLC:lobber', 'DLC:charge', 'DLC:shared')
GROUP BY boss_name, trusted_category;";
            using var reader = cmd.ExecuteReader();
            while (reader.Read()) bests.Add(new { bossName = reader.GetString(0), categoryKey = reader.GetString(1), seconds = reader.GetDouble(2) });
            return bests;
        }

        public void InsertDeath(string bossName, string sceneId, DateTime recordedAtUtc, string categoryKey = null)
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = @"
INSERT INTO death_events (boss_name, scene_id, recorded_at, category_key)
VALUES ($boss, $scene, $at, $category);";
            cmd.Parameters.AddWithValue("$boss", bossName);
            cmd.Parameters.AddWithValue("$scene", sceneId);
            cmd.Parameters.AddWithValue("$at", recordedAtUtc.ToString("o"));
            cmd.Parameters.AddWithValue("$category", (object)categoryKey ?? DBNull.Value);
            cmd.ExecuteNonQuery();
            Revision++;
        }

        private static string CategoryFilter(string categoryKey) => categoryKey == null
            ? "1 = 1" : "category_key IN ($category, $shared)";

        private static void AddCategoryParameters(SqliteCommand command, string categoryKey)
        {
            command.Parameters.AddWithValue("$category", (object)categoryKey ?? DBNull.Value);
            command.Parameters.AddWithValue("$shared", categoryKey?.StartsWith("DLC:", StringComparison.Ordinal) == true
                ? "DLC:shared" : DBNull.Value);
        }

        public Dictionary<string, BossStats> GetCategoryStats(string categoryKey)
        {
            using var cmd = connection.CreateCommand();
            string filter = CategoryFilter(categoryKey);
            cmd.CommandText = $@"WITH activity AS (
  SELECT boss_name, 1 AS attempts, cleared, time_seconds, 0 AS deaths FROM attempts WHERE {filter}
  UNION ALL
  SELECT boss_name, 0, 0, 0.0, 1 FROM death_events WHERE {filter}
)
SELECT boss_name, SUM(attempts), SUM(cleared), SUM(deaths),
MIN(CASE WHEN cleared = 1 THEN time_seconds END), SUM(time_seconds)
FROM activity GROUP BY boss_name;";
            AddCategoryParameters(cmd, categoryKey);
            var result = new Dictionary<string, BossStats>(StringComparer.Ordinal);
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
                result.Add(reader.GetString(0), new BossStats
                {
                    Attempts = reader.GetInt32(1), Clears = reader.GetInt32(2), Deaths = reader.GetInt32(3),
                    BestClearSeconds = reader.IsDBNull(4) ? null : reader.GetDouble(4),
                    TotalPlaytimeSeconds = reader.GetDouble(5)
                });
            return result;
        }

        public List<ActivityRow> GetRecentActivity(int limit = 60, string categoryKey = null)
            => GetActivity(categoryKey, limit);

        public List<ActivityRow> GetCategoryActivity(string categoryKey)
            => GetActivity(categoryKey, null);

        private List<ActivityRow> GetActivity(string categoryKey, int? limit)
        {
            using var cmd = connection.CreateCommand();
            string filter = CategoryFilter(categoryKey);
            string order = limit.HasValue ? "recorded_at DESC, id DESC LIMIT $limit" : "recorded_at, kind, id";
            cmd.CommandText = $@"
SELECT id, kind, boss_name, cleared, time_seconds, recorded_at, category_key FROM (
  SELECT id, 0 AS kind, boss_name, cleared, time_seconds, recorded_at, category_key FROM attempts WHERE {filter}
  UNION ALL
  SELECT id, 1 AS kind, boss_name, 0, 0.0, recorded_at, category_key FROM death_events WHERE {filter}
) ORDER BY {order};";
            AddCategoryParameters(cmd, categoryKey);
            if (limit.HasValue) cmd.Parameters.AddWithValue("$limit", limit.Value);
            var rows = new List<ActivityRow>();
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
                rows.Add(new ActivityRow
                {
                    Id = reader.GetInt64(0), IsDeath = reader.GetInt32(1) == 1,
                    BossName = reader.GetString(2), Cleared = reader.GetInt32(3) == 1,
                    TimeSeconds = reader.GetDouble(4),
                    RecordedAtUtc = DateTime.Parse(reader.GetString(5), null, System.Globalization.DateTimeStyles.RoundtripKind),
                    CategoryKey = reader.IsDBNull(6) ? null : reader.GetString(6)
                });
            return rows;
        }

        public double GetTotalPlaytimeSeconds()
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = "SELECT COALESCE(SUM(time_seconds), 0) FROM attempts;";
            return Convert.ToDouble(cmd.ExecuteScalar());
        }

        internal IEnumerable<(string Boss, bool IsDeath, double? ClearSeconds)> ReadOverallOutcomes(string categoryKey)
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = @"
SELECT boss_name, kind, clear_seconds FROM (
  SELECT id, boss_name, 0 AS kind, CASE WHEN cleared = 1 AND time_seconds > 0 THEN time_seconds END AS clear_seconds, recorded_at
  FROM attempts WHERE category_key = $category OR ($category LIKE 'DLC:%' AND category_key = 'DLC:shared')
  UNION ALL
  SELECT id, boss_name, 1, NULL, recorded_at
  FROM death_events WHERE category_key = $category OR ($category LIKE 'DLC:%' AND category_key = 'DLC:shared')
)
ORDER BY recorded_at, kind, id;";
            cmd.Parameters.AddWithValue("$category", categoryKey);
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
                yield return (reader.GetString(0), reader.GetInt32(1) == 1, reader.IsDBNull(2) ? null : reader.GetDouble(2));
        }

        public bool DeleteAttempt(long id)
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = "DELETE FROM attempts WHERE id = $id;";
            cmd.Parameters.AddWithValue("$id", id);
            bool changed = cmd.ExecuteNonQuery() > 0;
            if (changed) Revision++;
            return changed;
        }

        public bool DeleteDeath(long id)
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = "DELETE FROM death_events WHERE id = $id;";
            cmd.Parameters.AddWithValue("$id", id);
            bool changed = cmd.ExecuteNonQuery() > 0;
            if (changed) Revision++;
            return changed;
        }

        public void ClearAttempts()
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = "DELETE FROM attempts; DELETE FROM death_events;";
            if (cmd.ExecuteNonQuery() > 0) Revision++;
        }

        public BackupPayload ExportBackup()
        {
            var payload = new BackupPayload();
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = "SELECT id, boss_name, scene_id, cleared, time_seconds, deaths, recorded_at, category_key FROM attempts ORDER BY id;";
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                    payload.Attempts.Add(new BackupAttempt
                    {
                        Id = reader.GetInt64(0), BossName = reader.GetString(1), SceneId = reader.GetString(2),
                        Cleared = reader.GetInt32(3) == 1, TimeSeconds = reader.GetDouble(4), Deaths = reader.GetInt32(5), RecordedAt = reader.GetString(6),
                        CategoryKey = reader.IsDBNull(7) ? null : reader.GetString(7)
                    });
            }
            using (var cmd = connection.CreateCommand())
            {
                cmd.CommandText = "SELECT id, boss_name, scene_id, recorded_at, category_key FROM death_events ORDER BY id;";
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                    payload.Deaths.Add(new BackupDeath
                    {
                        Id = reader.GetInt64(0), BossName = reader.GetString(1), SceneId = reader.GetString(2), RecordedAt = reader.GetString(3), CategoryKey = reader.IsDBNull(4) ? null : reader.GetString(4)
                    });
            }
            return payload;
        }

        // Import is additive and deduplicates exact matches so existing history is preserved.
        public void ImportBackup(BackupPayload payload)
        {
            if (payload?.Attempts == null || payload.Deaths == null)
                throw new ArgumentException("Backup is missing attempt or death data.", nameof(payload));

            using var transaction = connection.BeginTransaction();
            using var attemptCommand = connection.CreateCommand();
            attemptCommand.Transaction = transaction;
            attemptCommand.CommandText = @"INSERT INTO attempts (boss_name, scene_id, cleared, time_seconds, deaths, recorded_at, category_key)
SELECT $boss, $scene, $cleared, $time, $deaths, $at, $category
WHERE NOT EXISTS (SELECT 1 FROM attempts WHERE boss_name = $boss AND scene_id = $scene AND cleared = $cleared AND time_seconds = $time AND deaths = $deaths AND recorded_at = $at AND COALESCE(category_key, '') = COALESCE($category, ''));";
            foreach (var name in new[] { "$boss", "$scene", "$at", "$category" })
                attemptCommand.Parameters.Add(name, SqliteType.Text);
            attemptCommand.Parameters.Add("$cleared", SqliteType.Integer);
            attemptCommand.Parameters.Add("$time", SqliteType.Real);
            attemptCommand.Parameters.Add("$deaths", SqliteType.Integer);
            attemptCommand.Prepare();

            using var deathCommand = connection.CreateCommand();
            deathCommand.Transaction = transaction;
            deathCommand.CommandText = @"INSERT INTO death_events (boss_name, scene_id, recorded_at, category_key)
SELECT $boss, $scene, $at, $category
WHERE NOT EXISTS (SELECT 1 FROM death_events WHERE boss_name = $boss AND scene_id = $scene AND recorded_at = $at AND COALESCE(category_key,'') = COALESCE($category,''));";
            foreach (var name in new[] { "$boss", "$scene", "$at", "$category" })
                deathCommand.Parameters.Add(name, SqliteType.Text);
            deathCommand.Prepare();
            int inserted = 0;

            foreach (var attempt in payload.Attempts)
            {
                if (attempt == null || string.IsNullOrWhiteSpace(attempt.BossName) || attempt.RecordedAt == null || attempt.TimeSeconds < 0)
                    throw new ArgumentException("Backup contains an invalid attempt record.", nameof(payload));
                var cmd = attemptCommand;
                cmd.Parameters["$boss"].Value = attempt.BossName;
                cmd.Parameters["$scene"].Value = attempt.SceneId ?? string.Empty;
                cmd.Parameters["$cleared"].Value = attempt.Cleared ? 1 : 0;
                cmd.Parameters["$time"].Value = attempt.TimeSeconds;
                cmd.Parameters["$deaths"].Value = attempt.Deaths;
                cmd.Parameters["$at"].Value = attempt.RecordedAt;
                cmd.Parameters["$category"].Value = (object)attempt.CategoryKey ?? DBNull.Value;
                inserted += cmd.ExecuteNonQuery();
            }
            foreach (var death in payload.Deaths)
            {
                if (death == null || string.IsNullOrWhiteSpace(death.BossName) || death.RecordedAt == null)
                    throw new ArgumentException("Backup contains an invalid death record.", nameof(payload));
                var cmd = deathCommand;
                cmd.Parameters["$boss"].Value = death.BossName;
                cmd.Parameters["$scene"].Value = death.SceneId ?? string.Empty;
                cmd.Parameters["$at"].Value = death.RecordedAt;
                cmd.Parameters["$category"].Value = (object)death.CategoryKey ?? DBNull.Value;
                inserted += cmd.ExecuteNonQuery();
            }
            transaction.Commit();
            if (inserted > 0) Revision++;
        }

        public void Dispose()
        {
            connection.Dispose();
        }

        public sealed class ActivityRow
        {
            public string CategoryKey { get; set; }
            public long Id { get; set; }
            public bool IsDeath { get; set; }
            public string BossName { get; set; }
            public bool Cleared { get; set; }
            public double TimeSeconds { get; set; }
            public DateTime RecordedAtUtc { get; set; }
        }

        public sealed class BossStats
        {
            public int Attempts { get; set; }
            public int Clears { get; set; }
            public int Deaths { get; set; }
            public double? BestClearSeconds { get; set; }
            public double TotalPlaytimeSeconds { get; set; }
        }

        public sealed class BackupPayload
        {
            public List<BackupAttempt> Attempts { get; set; } = new List<BackupAttempt>();
            public List<BackupDeath> Deaths { get; set; } = new List<BackupDeath>();
        }

        public sealed class BackupAttempt
        {
            public string CategoryKey { get; set; }
            public long Id { get; set; }
            public string BossName { get; set; }
            public string SceneId { get; set; }
            public bool Cleared { get; set; }
            public double TimeSeconds { get; set; }
            public int Deaths { get; set; }
            public string RecordedAt { get; set; }
        }

        public sealed class BackupDeath
        {
            public string CategoryKey { get; set; }
            public long Id { get; set; }
            public string BossName { get; set; }
            public string SceneId { get; set; }
            public string RecordedAt { get; set; }
        }
    }
}
