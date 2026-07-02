(() => {
  const assetGroups = {
    backgrounds: [
      { key: 'bg', src: 'assets/cat_bg.jpg?v=4', required: true },
      { key: 'skyBg', src: 'assets/sky_bg.jpg?v=4', required: false },
      { key: 'bg3', src: 'assets/bg3_city.jpg?v=2', required: false },
      { key: 'bg4', src: 'assets/bg4_fortress.jpg?v=2', required: false },
      { key: 'bg5', src: 'assets/bg5_lava.jpg?v=2', required: false }
    ],
    player: [
      { key: 'hero', src: 'assets/cat_hero_sheet.png?v=3', required: true }
    ],
    bosses: [
      { key: 'boss', src: 'assets/cat_boss.png?v=3', required: false },
      { key: 'heliBoss', src: 'assets/heli_boss.png?v=3', required: false },
      { key: 'boss3', src: 'assets/boss3_mech.png?v=2', required: false },
      { key: 'boss4', src: 'assets/boss4_airship.png?v=2', required: false },
      { key: 'boss5', src: 'assets/boss5_tank.png?v=2', required: false }
    ],
    enemies: [
      { key: 'infantry', src: 'assets/enemy_infantry.png?v=1', required: false },
      { key: 'infantryWalk', src: 'assets/enemy_infantry_walk_sheet.png?v=1', required: false },
      { key: 'enemy1', src: 'assets/enemy1_mousetank.png?v=2', required: false },
      { key: 'enemy1Walk', src: 'assets/enemy1_mousetank_walk_sheet.png?v=1', required: false },
      { key: 'enemy2', src: 'assets/enemy2_paratrooper.png?v=2', required: false },
      { key: 'enemy2Hover', src: 'assets/enemy2_paratrooper_hover_sheet.png?v=1', required: false },
      { key: 'enemy3', src: 'assets/enemy3_rat.png?v=2', required: false },
      { key: 'enemy3Walk', src: 'assets/enemy3_rat_walk_sheet.png?v=1', required: false },
      { key: 'enemy4', src: 'assets/enemy4_skyknight.png?v=2', required: false },
      { key: 'enemy4Hover', src: 'assets/enemy4_skyknight_hover_sheet.png?v=1', required: false },
      { key: 'enemy5', src: 'assets/enemy5_flameguard.png?v=2', required: false },
      { key: 'enemy5Walk', src: 'assets/enemy5_flameguard_walk_sheet.png?v=1', required: false }
    ]
  };

  window.CAT_FLAG_ASSET_GROUPS = assetGroups;
  window.CAT_FLAG_ASSET_MANIFEST = Object.values(assetGroups).flat();
})();
