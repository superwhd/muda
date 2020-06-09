import * as muda from '@muda/muda';
import * as _ from 'lodash';

class Tetrio extends muda.GraphicsItemUnit {
  constructor(
    coords: Array<Array<number>>,
    color: muda.Color,
    center: muda.Coordinate = {x: 0, y: 0},
    position: muda.Coordinate = {x: 4, y: 0}
  ) {
    const pixels: muda.Pixel[] = [];
    for (const coord of coords) {
      pixels.push({position: {x: coord[0], y: coord[1]}, color});
    }
    super(pixels, position, 1);
    this.center = center;
  }
  // TODO(whd) The current rotation behavior is far from the standard
  rotate(times = 1): Tetrio {
    const rotated = this.clone();
    while (times--) {
      const pixels: muda.Pixel[] = [];
      for (const pixel of rotated.pixels) {
        pixels.push({
          position: {x: -pixel.position.y, y: pixel.position.x},
          color: pixel.color,
        });
      }
      rotated.pixels = pixels;
    }
    return rotated;
  }
  // TODO(whd) cleaner way to clone
  clone(): Tetrio {
    return _.cloneDeep(this);
  }
  center: muda.Coordinate;
}

class DeadTiles extends muda.GraphicsItemUnit {
  constructor() {
    super([], {x: 0, y: 0}, 1);
  }
  addTetrio(tetrio: Tetrio) {
    this.pixels = this.pixels.concat(
      tetrio.pixels.map(pixel => {
        return {
          position: {
            x: pixel.position.x + tetrio.position.x,
            y: pixel.position.y + tetrio.position.y,
          },
          color: 'gray',
        };
      })
    );
  }
  removeFullLines() {
    const linesToRemove = new Set<number>();
    const cnt = new Map<number, number>();
    for (const pixel of this.pixels) {
      const y = pixel.position.y;
      if (!cnt.has(y)) {
        cnt.set(y, 0);
      }
      cnt.set(y, cnt.get(y)! + 1);
    }
    for (const [key, value] of cnt) {
      if (value === 10) {
        linesToRemove.add(key);
      }
    }
    this.pixels = this.pixels.filter(pixel => {
      return !linesToRemove.has(pixel.position.y);
    });
    for (const pixel of this.pixels) {
      const y = pixel.position.y;
      for (const line of linesToRemove) {
        if (line > y) {
          ++pixel.position.y;
        }
      }
    }
  }
}

class TetrisHandler implements muda.Handler {
  constructor() {
    this.tetrios = [];
    // Square
    this.tetrios.push(
      new Tetrio(
        [
          [0, 0],
          [0, 1],
          [1, 0],
          [1, 1],
        ],
        'yellow'
      )
    );
    // Stick
    this.tetrios.push(
      new Tetrio(
        [
          [-1, 0],
          [0, 0],
          [1, 0],
          [2, 0],
        ],
        'cyan'
      )
    );
    // L
    this.tetrios.push(
      new Tetrio(
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [2, 1],
        ],
        'blue'
      )
    );
    // L2
    this.tetrios.push(
      new Tetrio(
        [
          [0, 1],
          [1, 1],
          [2, 0],
          [2, 1],
        ],
        'orange'
      )
    );
    // s
    this.tetrios.push(
      new Tetrio(
        [
          [0, 1],
          [1, 0],
          [1, 1],
          [2, 0],
        ],
        'green'
      )
    );
    // z
    this.tetrios.push(
      new Tetrio(
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [2, 1],
        ],
        'red'
      )
    );
    // T
    this.tetrios.push(
      new Tetrio(
        [
          [0, 1],
          [1, 0],
          [1, 1],
          [2, 1],
        ],
        'purple'
      )
    );
  }
  handle(gamePlay: muda.GamePlay): void {
    ++this.tick;
    if (this.tick % this.dropPeriod === 0) {
      this.handleImpl(gamePlay);
    }
  }

  handleImpl(gamePlay: muda.GamePlay) {
    if (this.gameOver) {
      return;
    }
    if (gamePlay.world.units.fallingTetrio === undefined) {
      gamePlay.world.units.fallingTetrio = this.getRandomTetrio();
    }
    const keyCode = gamePlay.keyboardController.consumeLatestKeyCode();
    let dx = 0,
      dy = 0;
    switch (keyCode) {
      case 'ArrowLeft':
        dx = -1;
        break;
      case 'ArrowRight':
        dx = 1;
        break;
      case 'ArrowDown':
        dy = 1;
        break;
    }
    let rotate = 0;
    if (keyCode === 'KeyZ') {
      rotate = 1;
    }
    if (keyCode === 'KeyX') {
      rotate = 3;
    }

    const fallingTetrio = gamePlay.world.units.fallingTetrio as Tetrio;
    const deadTiles = gamePlay.world.units.deadTiles as DeadTiles;
    deadTiles.removeFullLines();
    if (deadTiles.aabb().topLeft.y === 0) {
      delete gamePlay.world.units.fallingTetrio;
      this.gameOver = true;
    }
    const collides = (tetrio: Tetrio, dx: number, dy: number) => {
      return (
        this.collisionDetector.collidesBoundary(
          tetrio,
          {x: dx, y: dy},
          {x: 0, y: -1},
          {x: gamePlay.camera.width - 1, y: gamePlay.camera.height - 1}
        ) || this.collisionDetector.collides(tetrio, deadTiles, {x: dx, y: dy})
      );
    };
    if (!collides(fallingTetrio, dx, 0)) {
      fallingTetrio.position.x += dx;
    }
    if (rotate) {
      const rotated = fallingTetrio.rotate(rotate);
      if (!collides(rotated, 0, 0)) {
        gamePlay.world.units.fallingTetrio = rotated;
      }
    }
    if (this.tick % 30 === 0 || dy) {
      if (
        !this.collisionDetector.collides(fallingTetrio, deadTiles, {
          x: 0,
          y: 1,
        }) &&
        !this.collisionDetector.collidesBoundary(
          fallingTetrio,
          {x: 0, y: 1},
          {x: -1, y: -1},
          {x: gamePlay.camera.width, y: gamePlay.camera.height - 1}
        )
      ) {
        ++fallingTetrio.position.y;
      } else {
        deadTiles.addTetrio(fallingTetrio);
        delete gamePlay.world.units.fallingTetrio;
      }
    }
    gamePlay.keyboardController.keyDownSet.clear();
  }

  getRandomTetrio(): Tetrio {
    return this.tetrios[
      Math.floor(Math.random() * this.tetrios.length)
    ].clone();
  }
  tetrios: Tetrio[];
  gameOver = false;
  tick = 0;
  dropPeriod = 2;
  collisionDetector = new muda.SimpleCollisionDetector();
}

export function demo(nativeCanvas: HTMLCanvasElement) {
  const makeColor = function (color: string): muda.Color {
    return {
      toString() {
        return color;
      },
    };
  };
  const makePixel = function (
    position: muda.Coordinate,
    color: muda.Color
  ): muda.Pixel {
    return {
      position: position,
      color: color,
    };
  };
  const coor = function (x: number, y: number): muda.Coordinate {
    return {x: x, y: y};
  };
  const camera = new muda.DefaultCamera(
    nativeCanvas,
    new muda.SimpleDrawer('white'),
    1,
    25,
    10,
    20
  );
  const world = new muda.World();
  const gamePlay = new muda.GamePlay(
    world,
    camera,
    new TetrisHandler(),
    new muda.SimpleRenderer()
  );
  gamePlay.world.units.deadTiles = new DeadTiles();
  gamePlay.start();
}
