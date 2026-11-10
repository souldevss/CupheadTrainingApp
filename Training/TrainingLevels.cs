using System.Collections.Generic;
using System.Linq;

namespace CupheadTrainingApp.Training
{
    /// <summary>1.1+ category levels from CupheadTrainingTable data.js (F-rank baselines).</summary>
    public static class TrainingLevels
    {
        public sealed class LevelDef
        {
            public string Name { get; init; }
            public IReadOnlyList<string> SceneIds { get; init; }
            // Multi-scene bosses are tracked throughout, but only finish here.
            public string CompletionSceneId { get; init; }
            public bool IsPlatforming { get; init; }
            public bool IsMausoleum { get; init; }
        }

        public static readonly IReadOnlyList<LevelDef> Category11 = new List<LevelDef>
        {
            new LevelDef { Name = "Forest Follies", IsPlatforming = true, SceneIds = new[] { "scene_level_platforming_1_1F" } },
            new LevelDef { Name = "The Root Pack", SceneIds = new[] { "scene_level_veggies" } },
            new LevelDef { Name = "Ribby & Croaks", SceneIds = new[] { "scene_level_frogs" } },
            new LevelDef { Name = "Goopy Le Grande", SceneIds = new[] { "scene_level_slime" } },
            new LevelDef { Name = "Hilda Berg", SceneIds = new[] { "scene_level_flying_blimp" } },
            new LevelDef { Name = "Cagney Carnation", SceneIds = new[] { "scene_level_flower" } },
            new LevelDef { Name = "Baroness Von Bon Bon", SceneIds = new[] { "scene_level_baroness" } },
            new LevelDef { Name = "Wally Warbles", SceneIds = new[] { "scene_level_flying_bird" } },
            new LevelDef { Name = "Djimmi The Great", SceneIds = new[] { "scene_level_flying_genie" } },
            new LevelDef { Name = "Beppi The Clown", SceneIds = new[] { "scene_level_clown" } },
            new LevelDef { Name = "Grim Matchstick", SceneIds = new[] { "scene_level_dragon" } },
            new LevelDef { Name = "Rumor Honeybottoms", SceneIds = new[] { "scene_level_bee" } },
            new LevelDef { Name = "Dr. Kahl's Robot", SceneIds = new[] { "scene_level_robot" } },
            new LevelDef { Name = "Sally Stageplay", SceneIds = new[] { "scene_level_sally_stage_play" } },
            new LevelDef { Name = "Werner Werman", SceneIds = new[] { "scene_level_mouse" } },
            new LevelDef { Name = "Captain Brineybeard", SceneIds = new[] { "scene_level_pirate" } },
            new LevelDef { Name = "Cala Maria", SceneIds = new[] { "scene_level_flying_mermaid", "scene_level_flying_,mermaid" } },
            new LevelDef { Name = "Phantom Express", SceneIds = new[] { "scene_level_train" } },
            new LevelDef
            {
                Name = "King Dice",
                CompletionSceneId = "scene_level_dice_palace_main",
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
            new LevelDef { Name = "The Devil", SceneIds = new[] { "scene_level_devil" } },
        };

        /// <summary>DLC boss levels mapped from the Cuphead autosplitter's scene catalog.</summary>
        public static readonly IReadOnlyList<LevelDef> DlcBosses = new List<LevelDef>
        {
            new LevelDef { Name = "Glumstone The Giant", SceneIds = new[] { "scene_level_old_man" } },
            new LevelDef { Name = "Mortimer Freeze", SceneIds = new[] { "scene_level_snow_cult" } },
            new LevelDef { Name = "The Howling Aces", SceneIds = new[] { "scene_level_airplane" } },
            new LevelDef { Name = "Esther Winchester", SceneIds = new[] { "scene_level_flying_cowboy" } },
            new LevelDef { Name = "Moonshine Mob", SceneIds = new[] { "scene_level_rum_runners" } },
            new LevelDef { Name = "Chef Saltbaker", SceneIds = new[] { "scene_level_saltbaker" } },
        };

        public static readonly LevelDef Mausoleum = new LevelDef
        { Name = "Mausoleum", IsMausoleum = true, SceneIds = new[] { "scene_level_mausoleum" } };
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
