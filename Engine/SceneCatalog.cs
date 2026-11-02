using System;
using System.Collections.Generic;
using System.Linq;

namespace CupheadMusicPlayer.Engine
{
    public enum SceneCategory
    {
        None = 0,
        Boss = 1,
        Dlc = 2,
        Misc = 4,
    }

    public static class SceneCatalog
    {
        public class SceneName
        {
            public string Name { get; set; }
            public List<string> SceneIds { get; set; } = new List<string>();
            public SceneCategory Category { get; set; } = SceneCategory.None;

            public bool Is(SceneCategory c) => (Category & c) == c;
            public override string ToString() => Name;
        }

        public static readonly List<SceneName> All = new List<SceneName>
        {
            // Isles
            new SceneName { Name = "Inkwell Isle 1", SceneIds = { "scene_map_world_1" } },
            new SceneName { Name = "Inkwell Isle 2", SceneIds = { "scene_map_world_2" } },
            new SceneName { Name = "Inkwell Isle 3", SceneIds = { "scene_map_world_3" } },
            new SceneName { Name = "Inkwell Hell", SceneIds = { "scene_map_world_4" } },
            new SceneName { Name = "Inkwell Isle 4 (DLC)", SceneIds = { "scene_map_world_DLC" } },

            // Run & Gun / Platforming
            new SceneName { Name = "Forest Follies", SceneIds = { "scene_level_platforming_1_1F" } },
            new SceneName { Name = "Treetop Trouble", SceneIds = { "scene_level_platforming_1_2F" } },
            new SceneName { Name = "Funfair Fever", SceneIds = { "scene_level_platforming_2_1F" } },
            new SceneName { Name = "Funhouse Frazzle", SceneIds = { "scene_level_platforming_2_2F" } },
            new SceneName { Name = "Perilous Piers", SceneIds = { "scene_level_platforming_3_1F" } },
            new SceneName { Name = "Rugged Ridge", SceneIds = { "scene_level_platforming_3_2F" } },

            // Bosses - Isle 1
            new SceneName { Name = "The Root Pack", SceneIds = { "scene_level_veggies" }, Category = SceneCategory.Boss },
            new SceneName { Name = "Goopy le Grande", SceneIds = { "scene_level_slime" }, Category = SceneCategory.Boss },
            new SceneName { Name = "Ribby & Croaks", SceneIds = { "scene_level_frogs" }, Category = SceneCategory.Boss },
            new SceneName { Name = "Cagney Carnation", SceneIds = { "scene_level_flower" }, Category = SceneCategory.Boss },

            // Bosses - Isle 2
            new SceneName { Name = "Baroness Von Bon Bon", SceneIds = { "scene_level_baroness" }, Category = SceneCategory.Boss },
            new SceneName { Name = "Wally Warbles", SceneIds = { "scene_level_flying_bird" }, Category = SceneCategory.Boss },
            new SceneName { Name = "Djimmi the Great", SceneIds = { "scene_level_flying_genie" }, Category = SceneCategory.Boss },
            new SceneName { Name = "Beppi the Clown", SceneIds = { "scene_level_clown" }, Category = SceneCategory.Boss },
            new SceneName { Name = "Grim Matchstick", SceneIds = { "scene_level_dragon" }, Category = SceneCategory.Boss },

            // Bosses - Isle 3
            new SceneName { Name = "Rumor Honeybottoms", SceneIds = { "scene_level_bee" }, Category = SceneCategory.Boss },
            new SceneName { Name = "Dr. Kahl's Robot", SceneIds = { "scene_level_robot" }, Category = SceneCategory.Boss },
            new SceneName { Name = "Sally Stageplay", SceneIds = { "scene_level_sally_stage_play" }, Category = SceneCategory.Boss },
            new SceneName { Name = "Werner Werman", SceneIds = { "scene_level_mouse" }, Category = SceneCategory.Boss },
            new SceneName { Name = "Captain Brineybeard", SceneIds = { "scene_level_pirate" }, Category = SceneCategory.Boss },
            new SceneName { Name = "Cala Maria", SceneIds = { "scene_level_flying_,mermaid" }, Category = SceneCategory.Boss },
            new SceneName { Name = "Phantom Express", SceneIds = { "scene_level_train" }, Category = SceneCategory.Boss },

            // Isle 4 / King Dice
            new SceneName { Name = "King Dice", SceneIds = {
                "scene_level_dice_palace_main", "scene_level_dice_palace_domino",
                "scene_level_dice_palace_chips", "scene_level_dice_palace_cigar",
                "scene_level_dice_palace_booze", "scene_level_dice_palace_roulette",
                "scene_level_dice_palace_rabbit", "scene_level_dice_palace_flying_horse",
                "scene_level_dice_palace_memory", "scene_level_dice_palace_eight_ball" },
                Category = SceneCategory.Boss },
            new SceneName { Name = "The Devil", SceneIds = { "scene_level_devil" }, Category = SceneCategory.Boss },

            // DLC bosses
            new SceneName { Name = "Glumstone the Giant", SceneIds = { "scene_level_old_man" }, Category = SceneCategory.Boss | SceneCategory.Dlc },
            new SceneName { Name = "Mortimer Freeze", SceneIds = { "scene_level_snow_cult" }, Category = SceneCategory.Boss | SceneCategory.Dlc },
            new SceneName { Name = "Howling Aces", SceneIds = { "scene_level_airplane" }, Category = SceneCategory.Boss | SceneCategory.Dlc },
            new SceneName { Name = "Esther Winchester", SceneIds = { "scene_level_flying_cowboy" }, Category = SceneCategory.Boss | SceneCategory.Dlc },
            new SceneName { Name = "Moonshine Mob", SceneIds = { "scene_level_rum_runners" }, Category = SceneCategory.Boss | SceneCategory.Dlc },
            new SceneName { Name = "Chef Saltbaker", SceneIds = { "scene_level_saltbaker" }, Category = SceneCategory.Boss | SceneCategory.Dlc },

            // Misc
            new SceneName { Name = "Title Screen", SceneIds = { "scene_slot_select" }, Category = SceneCategory.Misc },
            new SceneName { Name = "Scoreboard (Win)", SceneIds = { "scene_win" }, Category = SceneCategory.Misc },
            new SceneName { Name = "Shop", SceneIds = { "scene_shop" }, Category = SceneCategory.Misc },
            new SceneName { Name = "Shop (DLC)", SceneIds = { "scene_shop_dlc" }, Category = SceneCategory.Misc },
            new SceneName { Name = "Elder Kettle", SceneIds = { "scene_level_house_elder_kettle" }, Category = SceneCategory.Misc },
            new SceneName { Name = "Mausoleum", SceneIds = { "scene_level_mausoleum" }, Category = SceneCategory.Misc },
        };

        /// <summary>The scene entries belonging to a given preset category.</summary>
        public static List<SceneName> In(SceneCategory category)
            => All.Where(x => x.Is(category)).ToList();
    }
}
