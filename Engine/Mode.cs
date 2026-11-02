using System.ComponentModel;

namespace CupheadMusicPlayer.Engine
{
    public enum Mode
    {
        Any = -1,
        [Description("Simple")]
        Easy = 0,
        [Description("Regular")]
        Normal,
        [Description("Expert")]
        Hard,
        None
    }
}
