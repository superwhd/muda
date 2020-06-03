import * as muda from '@muda/muda';

class Tetrio extends muda.GraphicsItem {
  constructor(
    coords: Array<Array<number>>,
    color: muda.Color,
    position: muda.Coordinate
  ) {
    const pixels: muda.Pixel[] = [];
    for (const coord of coords) {
      pixels.push({position: {x: coord[0], y: coord[1]}, color});
    }
    super(pixels, position, 1);
  }
}

class TetrisHandler implements muda.Handler {
  handle(gamePlay: muda.GamePlay): void {
    ++this.tick;
    if (this.tick % this.dropFrequency === 0) {
      for (const tetrio of gamePlay.world.drawables as Tetrio[]) {
        if (gamePlay.keyboardController.keyDown('d')) {
          ++tetrio.position.x;
        }
        ++tetrio.position.y;
      }
      gamePlay.keyboardController.keyDownSet.clear();
    }
  }
  tick = 0;
  dropFrequency = 30;
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
    new muda.DefaultDrawer(),
    1,
    25,
    10,
    20
  );
  const world = new muda.World();
  const pixels: Array<muda.Pixel> = [];
  for (let i = 0; i < camera.width; ++i) {
    for (let j = 0; j < camera.height; ++j) {
      pixels.push(
        makePixel(coor(i, j), makeColor((i + j) % 2 ? 'blue' : 'white'))
      );
    }
  }
  const gamePlay = new muda.GamePlay(
    world,
    camera,
    new TetrisHandler(),
    new muda.SimpleRenderer()
  );
  gamePlay.world.drawables.push(
    new Tetrio(
      [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ],
      'yellow',
      {x: 4, y: 0}
    )
  );
  gamePlay.start();
}
