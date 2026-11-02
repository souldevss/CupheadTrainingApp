using System.Collections.Generic;
using System.Linq;

namespace CupheadTrainingLog.Training
{
    /// <summary>1.1+ category levels from CupheadTrainingTable data.js (F-rank baselines).</summary>
    public static class TrainingLevels
    {
        public sealed class LevelDef
        {
            public string Name { get; init; }
            public double FRankSeconds { get; init; }
            public double? WrSeconds { get; init; }
            public IReadOnlyList<string> SceneIds { get; init; }
            // Multi-scene bosses are tracked throughout, but only finish here.
            public string CompletionSceneId { get; init; }
            public bool IsPlatforming { get; init; }
            public bool IsMausoleum { get; init; }
        }

        public static readonly IReadOnlyList<LevelDef> Category11 = new List<LevelDef>
        {
            new LevelDef { Name = "Forest Follies", IsPlatforming = true, FRankSeconds = 44, SceneIds = new[] { "scene_level_platforming_1_1F" } },
            new LevelDef { Name = "The Root Pack", FRankSeconds = 44.5, SceneIds = new[] { "scene_level_veggies" } },
            new LevelDef { Name = "Ribby & Croaks", FRankSeconds = 67, SceneIds = new[] { "scene_level_frogs" } },
            new LevelDef { Name = "Goopy Le Grande", FRankSeconds = 41, SceneIds = new[] { "scene_level_slime" } },
            new LevelDef { Name = "Hilda Berg", FRankSeconds = 87, SceneIds = new[] { "scene_level_flying_blimp" } },
            new LevelDef { Name = "Cagney Carnation", FRankSeconds = 50.5, SceneIds = new[] { "scene_level_flower" } },
            new LevelDef { Name = "Baroness Von Bon Bon", FRankSeconds = 57, SceneIds = new[] { "scene_level_baroness" } },
            new LevelDef { Name = "Wally Warbles", FRankSeconds = 69, SceneIds = new[] { "scene_level_flying_bird" } },
            new LevelDef { Name = "Djimmi The Great", FRankSeconds = 92, SceneIds = new[] { "scene_level_flying_genie" } },
            new LevelDef { Name = "Beppi The Clown", FRankSeconds = 73, SceneIds = new[] { "scene_level_clown" } },
            new LevelDef { Name = "Grim Matchstick", FRankSeconds = 69, SceneIds = new[] { "scene_level_dragon" } },
            new LevelDef { Name = "Rumor Honeybottoms", FRankSeconds = 66.5, SceneIds = new[] { "scene_level_bee" } },
            new LevelDef { Name = "Dr. Kahl's Robot", FRankSeconds = 67.5, SceneIds = new[] { "scene_level_robot" } },
            new LevelDef { Name = "Sally Stageplay", FRankSeconds = 68.5, SceneIds = new[] { "scene_level_sally_stage_play" } },
            new LevelDef { Name = "Werner Werman", FRankSeconds = 65.5, SceneIds = new[] { "scene_level_mouse" } },
            new LevelDef { Name = "Captain Brineybeard", FRankSeconds = 66, SceneIds = new[] { "scene_level_pirate" } },
            new LevelDef { Name = "Cala Maria", FRankSeconds = 77.5, SceneIds = new[] { "scene_level_flying_mermaid", "scene_level_flying_,mermaid" } },
            new LevelDef { Name = "Phantom Express", FRankSeconds = 93, SceneIds = new[] { "scene_level_train" } },
            new LevelDef
            {
                Name = "King Dice",
                CompletionSceneId = "scene_level_dice_palace_main",
                FRankSeconds = 142,
                SceneIds = new[]
                {
                    "scene_level_dice_palace_main", "scene_level_dice_palace_domino",
                    "scene_level_dice_palace_chips", "scene_level_dice_palace_cigar",
                    "scene_level_dice_palace_booze", "scene_level_dice_palace_roulette",
                    "scene_level_dice_palace_rabbit", "scene_level_dice_palace_flying_horse",
                    "scene_level_dice_palace_memory", "scene_level_dice_palace_flying_memory",
                    "scene_level_dice_palace_eight_ball"
                }
            },
            new LevelDef { Name = "The Devil", FRankSeconds = 87.5, SceneIds = new[] { "scene_level_devil" } },
        };

        /// <summary>DLC boss levels mapped from the Cuphead autosplitter's scene catalog.</summary>
        public static readonly IReadOnlyList<LevelDef> DlcBosses = new List<LevelDef>
        {
            new LevelDef { Name = "Glumstone The Giant", FRankSeconds = 60, SceneIds = new[] { "scene_level_old_man" } },
            new LevelDef { Name = "Mortimer Freeze", FRankSeconds = 60, SceneIds = new[] { "scene_level_snow_cult" } },
            new LevelDef { Name = "The Howling Aces", FRankSeconds = 65.05, SceneIds = new[] { "scene_level_airplane" } },
            new LevelDef { Name = "Esther Winchester", FRankSeconds = 75, SceneIds = new[] { "scene_level_flying_cowboy" } },
            new LevelDef { Name = "Moonshine Mob", FRankSeconds = 58.08, SceneIds = new[] { "scene_level_rum_runners" } },
            new LevelDef { Name = "Chef Saltbaker", FRankSeconds = 105.02, SceneIds = new[] { "scene_level_saltbaker" } },
        };

        public static readonly LevelDef Mausoleum = new LevelDef
        { Name = "Mausoleum", IsMausoleum = true, FRankSeconds = 51, SceneIds = new[] { "scene_level_mausoleum" } };
        public static readonly IReadOnlyList<LevelDef> AllBosses = new List<LevelDef>(Category11.Concat(DlcBosses).Append(Mausoleum));

        private static readonly Dictionary<string, LevelDef> ByScene =
            new Dictionary<string, LevelDef>(System.StringComparer.OrdinalIgnoreCase);

        static TrainingLevels()
        {
            foreach (var level in AllBosses)
            {
                foreach (var scene in level.SceneIds)
                    ByScene[scene] = level;
            }
        }

        public static bool TryGetByScene(string sceneId, out LevelDef level)
            => ByScene.TryGetValue(sceneId ?? string.Empty, out level);
    }
}
