namespace CupheadMusicPlayer.Engine
{
    public sealed record TrainingLoadout(int Primary, int Secondary, int Super, int Charm)
    {
        // IDs verified against the installed Assembly-CSharp weapon/equipment enums.
        public const int Spread = 1456773649, Lobber = 1467024095, Charge = 1466416941, None = int.MaxValue;
        public const int Peashooter = 1456773641, ChaliceCharm = 1522153206;
        public string GetCategory(bool dlc, bool peashooterOnly = false)
        {
            if (peashooterOnly)
                return Super == None && Charm == None && ((Primary == Peashooter && Secondary == None)
                    || (Secondary == Peashooter && Primary == None)) ? (dlc ? "DLC:shared" : "1-1") : null;
            if (Super != None || Charm != (dlc ? ChaliceCharm : None)) return null;
            bool HasPair(int weapon) => (Primary == weapon && Secondary == Spread)
                || (Secondary == weapon && Primary == Spread);
            if (HasPair(Lobber)) return dlc ? "DLC:lobber" : "1-1";
            if (dlc && HasPair(Charge)) return "DLC:charge";
            return null;
        }
    }
}
