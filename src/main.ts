import Phaser from 'phaser';
import { BootScene }    from '@ui/scenes/BootScene';
import { GameScene }    from '@ui/scenes/GameScene';
import { MenuScene }    from '@ui/scenes/MenuScene';
import { GameOverScene } from '@ui/scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 840,
  transparent: true,  // Let aurora show through
  scene: [BootScene, GameScene, MenuScene, GameOverScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
