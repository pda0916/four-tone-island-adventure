import Phaser from 'phaser';
import { ForestScene } from './scenes/ForestScene';
import './styles.css';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#bde4ef',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%', autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: true },
  input: { activePointers: 3 },
  scene: [ForestScene],
});

window.addEventListener('contextmenu', event => event.preventDefault());
window.addEventListener('beforeunload', () => game.destroy(true));
