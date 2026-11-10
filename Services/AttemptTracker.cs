using System;
using System.Linq;
using CupheadMusicPlayer.Engine;
using CupheadMusicPlayer.Engine.Memory;
using CupheadTrainingApp.Training;

namespace CupheadTrainingApp.Services
{
    public sealed class AttemptTracker : IDisposable
    {
        private readonly MemoryManager memory = new MemoryManager();
        private readonly RunDatabase database;

        private string activeBossName;
        private string activeSceneId;
        private float lastLevelTime;
        private bool endingHandled;
        private bool attemptFinished;
        private bool attemptHasProgress;
        private bool loadingObserved;
        private bool nonWinningEndingObserved;
        private bool versionWarningRaised;
        private bool clearArmed;
        private float platformingWinTime;
        private string recordingCategory;
        private bool loadoutRejected;
        private string loadoutStatus;

        public event Action<AttemptLoggedEvent> AttemptLogged;
        public event Action DeathLogged;
        public event Action<string> StatusChanged;
        public event Action<string> VersionWarning;

        public string LiveBossName => activeBossName;
        public float LiveLevelTime { get; private set; }
        public LiveAttemptInfo LiveAttempt { get; private set; }
        public sealed record LiveAttemptInfo(string BossName, string CategoryKey, float Seconds);

        public AttemptTracker(RunDatabase database)
        {
            this.database = database;
        }

        public void Tick()
        {
            LiveAttempt = null;
            if (!memory.HookProcess())
            {
                ResetAttempt();
                StatusChanged?.Invoke("Waiting for Cuphead…");
                return;
            }

            if (memory.Program == null || memory.Program.HasExited)
            {
                ResetAttempt();
                StatusChanged?.Invoke("Cuphead closed");
                return;
            }

            if (!memory.TryInitializeTrainingPointers())
            {
                StatusChanged?.Invoke("Waiting for game memory…");
                return;
            }

            PointerVersion version = MemoryManager.Version;
            if (version != PointerVersion.Steam115 && version != PointerVersion.SteamDLC)
            {
                if (!versionWarningRaised)
                {
                    versionWarningRaised = true;
                    string msg = version switch
                    {
                        PointerVersion.Steam120 => "Detected Cuphead 1.2.x pointers. This app targets 1.1 speedrun (1.1.x / Steam115). Logging may be wrong.",
                        _ => "Unsupported game build detected."
                    };
                    VersionWarning?.Invoke(msg);
                }
            }

            if (memory.Loading())
            {
                loadingObserved = true;
                StatusChanged?.Invoke("Loading…");
                return;
            }

            string scene;
            try { scene = memory.SceneName(); }
            catch
            {
                ResetAttempt();
                StatusChanged?.Invoke("Memory read error");
                return;
            }

            if (string.IsNullOrWhiteSpace(scene))
            {
                if (activeBossName != null && attemptHasProgress)
                    FinishAttempt(cleared: false, timeSeconds: lastLevelTime);

                ResetAttempt();
                StatusChanged?.Invoke("In menu / overworld");
                return;
            }

            // Run & Gun levels may reach results without the boss ending flag.
            // Freeze at victory without adding an offset;
            // the live LevelTime can continue increasing during results.
            if (scene == "scene_win" && activeBossName != null
                && TrainingLevels.TryGetByScene(activeSceneId, out var resultsLevel)
                && (resultsLevel.IsPlatforming || resultsLevel.IsMausoleum))
            {
                endingHandled = true;
                nonWinningEndingObserved = false;
                if (!attemptFinished && clearArmed && attemptHasProgress)
                {
                    // If the victory flag was missed between polls, freeze the
                    // last gameplay sample once, rather than read the results timer.
                    if (platformingWinTime <= 0) platformingWinTime = lastLevelTime;
                    if (float.IsFinite(platformingWinTime) && platformingWinTime > 0)
                    {
                        FinishAttempt(cleared: true, timeSeconds: platformingWinTime);
                        ReportAttemptStatus($"Clear logged — {activeBossName}");
                    }
                }
                return;
            }

            if (!TrainingLevels.TryGetByScene(scene, out var levelDef))
            {
                if (activeBossName != null && attemptHasProgress)
                    FinishAttempt(cleared: false, timeSeconds: lastLevelTime);

                ResetAttempt();
                StatusChanged?.Invoke($"Watching — {FriendlyScene(scene)}");
                return;
            }

            if (activeBossName == null)
            {
                activeBossName = levelDef.Name;
                activeSceneId = scene;
                lastLevelTime = 0;
                endingHandled = false;
                attemptFinished = false;
                attemptHasProgress = false;
                loadingObserved = false;
                nonWinningEndingObserved = false;
                clearArmed = false;
                platformingWinTime = 0;
                ResetLoadout();
                StatusChanged?.Invoke($"Attempt: {activeBossName}");
            }
            else if (!string.Equals(activeBossName, levelDef.Name, StringComparison.OrdinalIgnoreCase))
            {
                if (attemptHasProgress)
                    FinishAttempt(cleared: false, timeSeconds: lastLevelTime);
                activeBossName = levelDef.Name;
                activeSceneId = scene;
                lastLevelTime = 0;
                endingHandled = false;
                attemptFinished = false;
                attemptHasProgress = false;
                loadingObserved = false;
                nonWinningEndingObserved = false;
                clearArmed = false;
                platformingWinTime = 0;
                ResetLoadout();
            }
            else if (!string.Equals(activeSceneId, scene, StringComparison.OrdinalIgnoreCase))
            {
                // A loss observed inside a miniboss still counts when the game
                // returns to the board; a normal winning transition does not.
                if (!attemptFinished && !endingHandled && nonWinningEndingObserved)
                    RecordDeath();
                // Dice Palace moves between the board and minibosses. Their local
                // timers restart on entry without ending the overall boss run.
                activeSceneId = scene;
                lastLevelTime = 0;
                endingHandled = false;
                attemptFinished = false;
                attemptHasProgress = false;
                loadingObserved = false;
                nonWinningEndingObserved = false;
                clearArmed = false;
                platformingWinTime = 0;
            }

            float levelTime;
            try { levelTime = memory.LevelTime(); }
            catch { levelTime = 0; }

            LiveLevelTime = levelTime;

            bool ending;
            bool won;
            try
            {
                ending = memory.LevelEnding();
                won = memory.LevelWon();
            }
            catch
            {
                ending = false;
                won = false;
            }

            if (ending && !won)
                nonWinningEndingObserved = true;
            else if (ending && won)
                nonWinningEndingObserved = false;

            bool timerReset = DetectTimerReset(levelTime);
            if (timerReset)
            {
                // A timer reset during active play is a death. A reset after a
                // loading transition is Retry unless a non-winning end state
                // was observed before that transition.
                bool isDeath = !attemptFinished
                    && !endingHandled
                    && (nonWinningEndingObserved || (!loadingObserved && attemptHasProgress));
                if (isDeath)
                    RecordDeath();
                endingHandled = false;
                attemptFinished = false;
                attemptHasProgress = false;
                loadingObserved = false;
                nonWinningEndingObserved = false;
                clearArmed = false;
                platformingWinTime = 0;
                ResetLoadout();
            }
            else if (levelTime > 0.5f)
                attemptHasProgress = true;

            lastLevelTime = levelTime;
            ValidateLoadout(levelDef);

            // Require a fresh victory in the completion scene, not the won flag
            // left over while a defeated miniboss returns to the board.
            if (!ending || !won)
                clearArmed = true;
            bool canCompleteHere = levelDef.CompletionSceneId == null
                || string.Equals(scene, levelDef.CompletionSceneId, StringComparison.OrdinalIgnoreCase);
            if (!canCompleteHere && ending && won)
                endingHandled = true;

            bool victory = won && (ending || levelDef.IsPlatforming || levelDef.IsMausoleum);
            if (!endingHandled && victory && canCompleteHere && clearArmed)
            {
                if (levelDef.IsPlatforming && platformingWinTime <= 0 && float.IsFinite(levelTime))
                    platformingWinTime = levelTime;
                if (levelDef.IsPlatforming)
                {
                    if (platformingWinTime <= 0) return;
                    endingHandled = true;
                    FinishAttempt(cleared: true, timeSeconds: platformingWinTime);
                    ReportAttemptStatus($"Clear logged — {levelDef.Name}");
                }
                else
                {
                    float scoreTime = ReadScoringTime();
                    endingHandled = true;
                    if (scoreTime <= 0) scoreTime = levelTime;
                    FinishAttempt(cleared: true, timeSeconds: scoreTime);
                    ReportAttemptStatus($"Clear logged — {levelDef.Name}");
                }
            }
            else
            {
                if (canCompleteHere && !ending && !won && !attemptFinished && !endingHandled
                    && !loadoutRejected && recordingCategory != null && float.IsFinite(levelTime) && levelTime > 0)
                    LiveAttempt = new LiveAttemptInfo(activeBossName, recordingCategory, levelTime);
                ReportAttemptStatus($"{activeBossName} | {FormatTime(levelTime)}");
            }
        }

        private bool DetectTimerReset(float levelTime)
        {
            // A timer reset can be a death or a manual Retry. Classification is
            // handled separately from this reset check.
            if (lastLevelTime > 0.75f && levelTime < lastLevelTime - 0.75f && levelTime < 1.5f)
                return true;
            return false;
        }

        private float ReadScoringTime()
        {
            try
            {
                float time = memory.ScoringTime();
                return float.IsFinite(time) && time > 0 ? time : 0;
            }
            catch { return 0; }
        }

        private void RecordDeath()
        {
            if (loadoutRejected || recordingCategory == null) return;
            database.InsertDeath(
                BossNameNormalizer.ToTrainingTableName(activeBossName),
                activeSceneId ?? string.Empty,
                DateTime.UtcNow, recordingCategory);
            DeathLogged?.Invoke();
        }

        private void FinishAttempt(bool cleared, double timeSeconds)
        {
            if (string.IsNullOrEmpty(activeBossName) || attemptFinished)
                return;
            if (loadoutRejected || recordingCategory == null)
            {
                attemptFinished = true;
                return;
            }

            if (timeSeconds < 0)
                timeSeconds = 0;

            string bossName = BossNameNormalizer.ToTrainingTableName(activeBossName);

            database.InsertAttempt(
                bossName,
                activeSceneId ?? string.Empty,
                cleared,
                timeSeconds,
                DateTime.UtcNow,
                recordingCategory);

            // Keep the completed attempt attached to the current scene. Cuphead can
            // leave the victory state active for many polling ticks; logging again
            // is only allowed after the tracker observes the scene exit/reset.
            attemptFinished = true;

            AttemptLogged?.Invoke(new AttemptLoggedEvent
            {
                BossName = bossName,
                Cleared = cleared,
                TimeSeconds = timeSeconds,
                CategoryKey = recordingCategory
            });
        }

        private void ResetAttempt()
        {
            activeBossName = null;
            activeSceneId = null;
            lastLevelTime = 0;
            endingHandled = false;
            attemptFinished = false;
            attemptHasProgress = false;
            loadingObserved = false;
            nonWinningEndingObserved = false;
            clearArmed = false;
            platformingWinTime = 0;
            ResetLoadout();
            LiveLevelTime = 0;
        }

        private void ResetLoadout()
        {
            recordingCategory = null;
            loadoutRejected = false;
            loadoutStatus = null;
        }

        private void ValidateLoadout(TrainingLevels.LevelDef level)
        {
            if (loadoutRejected || attemptFinished) return;
            if (level.IsMausoleum)
            {
                recordingCategory = MemoryManager.Version == PointerVersion.SteamDLC ? "DLC:shared" : "1-1";
                return;
            }
            if (!memory.TryReadTrainingLoadout(out var loadout))
            {
                if (recordingCategory == null)
                    loadoutStatus = "Loadout unavailable — retry once equipment can be read";
                return;
            }
            loadoutStatus = null;
            bool dlc = TrainingLevels.DlcBosses.Any(boss => boss.Name == level.Name)
                || (level.IsPlatforming && MemoryManager.Version == PointerVersion.SteamDLC);
            string category = loadout.GetCategory(dlc, peashooterOnly: level.IsPlatforming);
            if (category == null || (recordingCategory != null && recordingCategory != category))
            {
                loadoutRejected = true;
                loadoutStatus = level.IsPlatforming ? "Run excluded — equip only Peashooter, no super or charm"
                    : dlc ? "Run excluded — equip Lobber/Spread or Charge/Spread, Chalice charm, no super"
                    : "Run excluded — equip Lobber/Spread, no super or charm";
                return;
            }
            recordingCategory = category;
        }

        private void ReportAttemptStatus(string status)
            => StatusChanged?.Invoke(loadoutStatus ?? status);

        private static string FriendlyScene(string scene)
        {
            if (scene.StartsWith("scene_level_", StringComparison.OrdinalIgnoreCase))
                return scene.Substring("scene_level_".Length).Replace('_', ' ');
            if (scene.StartsWith("scene_map_", StringComparison.OrdinalIgnoreCase))
                return scene.Substring("scene_map_".Length).Replace('_', ' ');
            return scene;
        }

        public static string FormatTime(double seconds)
        {
            if (seconds < 0)
                seconds = 0;
            var ts = TimeSpan.FromSeconds(seconds);
            if (ts.TotalHours >= 1)
                return ts.ToString(@"h\:mm\:ss\.ff");
            return ts.ToString(@"m\:ss\.ff");
        }

        public void Dispose()
        {
            memory.Dispose();
        }

        public sealed class AttemptLoggedEvent
        {
            public string CategoryKey { get; set; }
            public string BossName { get; set; }
            public bool Cleared { get; set; }
            public double TimeSeconds { get; set; }
        }
    }
}
