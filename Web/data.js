const ranks = [
  "WR",
  "S",
  "A++",
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "E+",
  "E",
  "E-",
  "F"
], ranksStyles = [
  { background: "#fffdf5", color: "#161219" },
  { background: "#fff8d7", color: "#805400" },
  { background: "#ffe99a", color: "#161219" },
  { background: "#ffd36e", color: "#161219" },
  { background: "#ffb65e", color: "#161219" },
  { background: "#f69861", color: "#161219" },
  { background: "#f48380", color: "#161219" },
  { background: "#ed73a0", color: "#161219" },
  { background: "#e27dbe", color: "#161219" },
  { background: "#d185db", color: "#161219" },
  { background: "#b18ae6", color: "#161219" },
  { background: "#968fe9", color: "#161219" },
  { background: "#829deb", color: "#161219" },
  { background: "#76b0e7", color: "#161219" },
  { background: "#67bfd8", color: "#161219" },
  { background: "#65c7b5", color: "#161219" },
  { background: "#78c47d", color: "#161219" },
  { background: "#92a63b", color: "#161219" },
  { background: "#746568", color: "#ffffff" }
], DEFAULT_WR_TO_F_RATIO = 0.723, RANK_TIME_CURVE_EXPONENT = 1.35;
function roundTime(value) {
  return Math.round(value * 100) / 100;
}
function roundMultiplier(value) {
  return Math.round(value * 1e4) / 1e4;
}
function getRankCurveProgress(rankIndex, rankCount = ranks.length) {
  if (rankCount <= 1) return 1;
  const linearProgress = rankIndex / (rankCount - 1);
  return Math.pow(linearProgress, RANK_TIME_CURVE_EXPONENT);
}
function createRankMultipliers(wrToFRatio = DEFAULT_WR_TO_F_RATIO) {
  return ranks.map((_, rankIndex) => {
    const progress = getRankCurveProgress(rankIndex);
    return roundMultiplier(wrToFRatio + (1 - wrToFRatio) * progress);
  });
}
const defaultRankMultipliers = createRankMultipliers();
function generateRankTimes(fRankTime, rankConfig = defaultRankMultipliers) {
  if (!Number.isFinite(fRankTime) || fRankTime <= 0) return [];
  if (Array.isArray(rankConfig))
    return rankConfig.map((multiplier) => roundTime(fRankTime * multiplier));
  const wrTime = typeof rankConfig == "number" ? rankConfig : rankConfig?.wrTime, fallbackMultipliers = Array.isArray(rankConfig?.fallbackMultipliers) ? rankConfig.fallbackMultipliers : defaultRankMultipliers;
  return !Number.isFinite(wrTime) || wrTime <= 0 || wrTime >= fRankTime ? fallbackMultipliers.map((multiplier) => roundTime(fRankTime * multiplier)) : ranks.map((_, rankIndex) => {
    const progress = getRankCurveProgress(rankIndex);
    return roundTime(wrTime + (fRankTime - wrTime) * progress);
  });
}
const totalsRowsStyles = [
  { name: "Inkwell Isle I", background: "#a7c8cf", color: "#20124d" },
  { name: "Inkwell Isle II", background: "#e7ad63", color: "#20124d" },
  { name: "Inkwell Isle III", background: "#8f7dc7", color: "#20124d" },
  { name: "Inkwell Hell", background: "#d64520", color: "#20124d" },
  { name: "Inkwell Isle 1", background: "#a7c8cf", color: "#20124d" },
  { name: "Inkwell Isle 4", background: "#74b9b0", color: "#20124d" },
  { name: "DLC Category", background: "#74b9b0", color: "#20124d" },
  { name: "Residual", background: "#999999", color: "#20124d" },
  { name: "Sob", background: "#1d595e", color: "#faeb69" }
], isleImages = /* @__PURE__ */ new Map([
  ["Inkwell Isle I", "ch-inkwell-isle-one.webp"],
  ["Inkwell Isle 1", "ch-inkwell-isle-one.webp"],
  ["Inkwell Isle II", "isle-two.jpg"],
  ["Inkwell Isle III", "isle-three.jpg"],
  ["Inkwell Hell", "hell.jpg"]
]);
function isleArtworkStyle(name, tone) {
  const file = isleImages.get(name);
  if (!file) return "";
  const tint = `color-mix(in srgb, ${tone} 72%, transparent)`;
  return `background-image:linear-gradient(${tint},${tint}),url('assets/Isles/${encodeURIComponent(file)}');`;
}
const islands = [
  {
    name: "Inkwell Isle I",
    color: "#a7c8cf",
    textcolor: "#20124d",
    levels: [
      { name: "Forest Follies", icon: "https://myekul.com/shared-assets/cuphead/images/runnguns/forestfollies.png", background: "#95BC7A", color: "#000000", wrTime: 32.63, wrUrl: "https://www.youtube.com/live/13ZSnTYvuGA?t=7173", wrPlayer: "SBDWolf", fRankTime: 42 },
      { name: "The Root Pack", icon: "https://myekul.com/shared-assets/cuphead/images/therootpack.png", background: "#DDA13A", color: "#000000", fRankTime: 43 },
      { name: "Ribby & Croaks", icon: "https://myekul.com/shared-assets/cuphead/images/ribbyandcroaks.png", background: "#8A8600", color: "#FFFFFF", fRankTime: 68 },
      { name: "Goopy Le Grande", icon: "https://myekul.com/shared-assets/cuphead/images/goopylegrande.png", background: "#5A88D8", color: "#000000", fRankTime: 42 },
      { name: "Hilda Berg", icon: "https://myekul.com/shared-assets/cuphead/images/hildaberg.png", background: "#B12A2A", color: "#FFD700", fRankTime: 90 },
      { name: "Cagney Carnation", icon: "https://myekul.com/shared-assets/cuphead/images/cagneycarnation.png", background: "#FFA500", color: "#000000", fRankTime: 65 }
    ]
  },
  {
    name: "Inkwell Isle II",
    color: "#e7ad63",
    textcolor: "#20124d",
    levels: [
      { name: "Baroness Von Bon Bon", icon: "https://myekul.com/shared-assets/cuphead/images/baronessvonbonbon.png", background: "#F57AB3", color: "#FFFFFF", fRankTime: 70 },
      { name: "Wally Warbles", icon: "https://myekul.com/shared-assets/cuphead/images/wallywarbles.png", background: "#0000CC", color: "#FFFFFF", fRankTime: 75 },
      { name: "Djimmi The Great", icon: "https://myekul.com/shared-assets/cuphead/images/djimmithegreat.png", background: "#C85D5D", color: "#4FFFD0", fRankTime: 92 },
      { name: "Beppi The Clown", icon: "https://myekul.com/shared-assets/cuphead/images/beppitheclown.png", background: "#A61919", color: "#FFFFFF", fRankTime: 65 },
      { name: "Grim Matchstick", icon: "https://myekul.com/shared-assets/cuphead/images/grimmatchstick.png", background: "#9ACD32", color: "#000000", fRankTime: 78 }
    ]
  },
  {
    name: "Inkwell Isle III",
    color: "#8f7dc7",
    textcolor: "#20124d",
    levels: [
      { name: "Rumor Honeybottoms", icon: "https://myekul.com/shared-assets/cuphead/images/rumorhoneybottoms.png", background: "#F4C430", color: "#000000", fRankTime: 70 },
      { name: "Dr. Kahl's Robot", icon: "https://myekul.com/shared-assets/cuphead/images/drkahlsrobot.png", background: "#B0B0B0", color: "#000000", fRankTime: 65 },
      { name: "Sally Stageplay", icon: "https://myekul.com/shared-assets/cuphead/images/sallystageplay.png", background: "#2FB3B3", color: "#000000", fRankTime: 76 },
      { name: "Werner Werman", icon: "https://myekul.com/shared-assets/cuphead/images/wernerwerman.png", background: "#A65628", color: "#FFFFFF", fRankTime: 65.5 },
      { name: "Captain Brineybeard", icon: "https://myekul.com/shared-assets/cuphead/images/captainbrineybeard.png", background: "#E11D48", color: "#FFFFFF", fRankTime: 66 },
      { name: "Cala Maria", icon: "https://myekul.com/shared-assets/cuphead/images/calamaria.png", background: "#9AD0B3", color: "#4A3B69", fRankTime: 79 },
      { name: "Phantom Express", icon: "https://myekul.com/shared-assets/cuphead/images/phantomexpress.png", background: "#9370DB", color: "#FFFFFF", fRankTime: 86 }
    ]
  },
  {
    name: "Inkwell Hell",
    color: "#d64520",
    textcolor: "#20124d",
    levels: [
      { name: "King Dice", icon: "https://myekul.com/shared-assets/cuphead/images/kingdice.png", background: "#8A2BE2", color: "#FFFFFF", fRankTime: 142 },
      { name: "The Devil", icon: "https://myekul.com/shared-assets/cuphead/images/thedevil.png", background: "#000000", color: "#FFCC00", fRankTime: 87.5 }
    ]
  }
], lobberDlcIslands = [
  {
    name: "Inkwell Isle 1",
    color: "#a7c8cf",
    textcolor: "#20124d",
    levels: [
      { name: "Forest Follies", icon: "https://myekul.com/shared-assets/cuphead/images/runnguns/forestfollies.png", background: "#95BC7A", color: "#000000", wrTime: 33.27, wrUrl: "https://youtu.be/q6M5TBPLKps", wrPlayer: "GamerAttack27", fRankTime: 45 },
      { name: "Mausoleum", wrTime: 47.26, wrUrl: "https://youtu.be/ro73lUU8jjQ", wrPlayer: "ExclamationMarkYT", icon: "https://myekul.com/shared-assets/cuphead/images/other/mausoleum.png", background: "#6b5f8f", color: "#ffffff", fRankTime: 51 }
    ]
  },
  {
    name: "Inkwell Isle 4",
    color: "#74b9b0",
    textcolor: "#20124d",
    levels: [
      { name: "Glumstone The Giant", icon: "https://myekul.com/shared-assets/cuphead/images/glumstonethegiant.png", background: "#DEB887", color: "#000000", fRankTime: 60 },
      { name: "Mortimer Freeze", icon: "https://myekul.com/shared-assets/cuphead/images/mortimerfreeze.png", background: "#9400D3", color: "#00ced1", fRankTime: 60 },
      { name: "The Howling Aces", icon: "https://myekul.com/shared-assets/cuphead/images/thehowlingaces.png", background: "#DAA520", color: "#dc143c", fRankTime: 65.05 },
      { name: "Esther Winchester", icon: "https://myekul.com/shared-assets/cuphead/images/estherwinchester.png", background: "#D2691E", color: "#ffcf10", fRankTime: 75 },
      { name: "Moonshine Mob", icon: "https://myekul.com/shared-assets/cuphead/images/moonshinemob.png", background: "#008080", color: "#ffcf10", fRankTime: 58.08 },
      { name: "Chef Saltbaker", icon: "https://myekul.com/shared-assets/cuphead/images/chefsaltbaker.png", background: "#D3D3D3", color: "#000000", fRankTime: 105.02 }
    ]
  }
], version11Residual = { wrTime: 661.65, fRankTime: 695 }, lobberDlcResidual = { wrTime: 250.83, fRankTime: 270 }, chargeDlcIslands = [
  {
    name: "Inkwell Isle 1",
    color: "#a7c8cf",
    textcolor: "#20124d",
    levels: [
      { name: "Forest Follies", icon: "https://myekul.com/shared-assets/cuphead/images/runnguns/forestfollies.png", background: "#95BC7A", color: "#000000", wrTime: 33.27, wrUrl: "https://youtu.be/q6M5TBPLKps", wrPlayer: "GamerAttack27", fRankTime: 45 },
      { name: "Mausoleum", wrTime: 47.26, wrUrl: "https://youtu.be/ro73lUU8jjQ", wrPlayer: "ExclamationMarkYT", icon: "https://myekul.com/shared-assets/cuphead/images/other/mausoleum.png", background: "#6b5f8f", color: "#ffffff", fRankTime: 51 }
    ]
  },
  {
    name: "Inkwell Isle 4",
    color: "#74b9b0",
    textcolor: "#20124d",
    levels: [
      { name: "Glumstone The Giant", icon: "https://myekul.com/shared-assets/cuphead/images/glumstonethegiant.png", background: "#DEB887", color: "#000000", fRankTime: 60 },
      { name: "Mortimer Freeze", icon: "https://myekul.com/shared-assets/cuphead/images/mortimerfreeze.png", background: "#9400D3", color: "#00ced1", fRankTime: 55 },
      { name: "The Howling Aces", icon: "https://myekul.com/shared-assets/cuphead/images/thehowlingaces.png", background: "#DAA520", color: "#dc143c", fRankTime: 61 },
      { name: "Esther Winchester", icon: "https://myekul.com/shared-assets/cuphead/images/estherwinchester.png", background: "#D2691E", color: "#ffcf10", fRankTime: 75 },
      { name: "Moonshine Mob", icon: "https://myekul.com/shared-assets/cuphead/images/moonshinemob.png", background: "#008080", color: "#ffcf10", fRankTime: 57 },
      { name: "Chef Saltbaker", icon: "https://myekul.com/shared-assets/cuphead/images/chefsaltbaker.png", background: "#D3D3D3", color: "#000000", fRankTime: 90 }
    ]
  }
], chargeDlcResidual = { wrTime: 263.32, fRankTime: 285 }, legacyFTimes = [42, 33, 44, 22, 80, 26, 33, 41, 60, 34, 35, 37, 20, 41, 36, 36, 45, 58, 100, 50];
let legacyLevelIndex = 0;
const legacyIslands = islands.map((island) => ({
  ...island,
  levels: island.levels.map((level) => {
    const { wrTime, wrUrl, wrPlayer, times, ...appearance } = level;
    return { ...appearance, fRankTime: legacyFTimes[legacyLevelIndex++] };
  })
})), speedrunCategories = [
  {
    id: "1-1",
    label: "1.1+",
    title: "1.1+ Category",
    islands,
    residual: version11Residual,
    rankMultipliers: [...defaultRankMultipliers]
  },
  {
    id: "legacy",
    label: "Legacy",
    title: "Legacy (1.0) Category",
    islands: legacyIslands,
    residual: { fRankTime: 680 },
    rankMultipliers: [...defaultRankMultipliers]
  },
  {
    id: "DLC",
    label: "DLC",
    title: "DLC Category",
    subOptions: [
      {
        id: "lobber",
        label: "Lobber",
        icon: "https://myekul.com/shared-assets/cuphead/images/inventory/weapon/lobber.png",
        islands: lobberDlcIslands,
        residual: lobberDlcResidual,
        rankMultipliers: [...defaultRankMultipliers]
      },
      {
        id: "charge",
        label: "Charge",
        icon: "https://myekul.com/shared-assets/cuphead/images/inventory/weapon/charge.png",
        islands: chargeDlcIslands,
        residual: chargeDlcResidual,
        rankMultipliers: [...defaultRankMultipliers]
      }
    ]
  }
];
function getDeveloperRankEditor() {
  if (location.origin === "https://cuphead-training.local") return window.parent.developerRankEditor;
}
function refreshDeveloperRankOverrides() {
  getDeveloperRankEditor()?.apply(speedrunCategories, generateRankTimes);
}
refreshDeveloperRankOverrides(), getDeveloperRankEditor() && window.addEventListener("storage", (event) => {
  event.key === getDeveloperRankEditor()?.storageKey && (refreshDeveloperRankOverrides(), typeof calculateRankMultipliers == "function" && calculateRankMultipliers(), typeof renderActivePage == "function" && renderActivePage());
});
