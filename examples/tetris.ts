import * as muda from '@muda/muda';

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
  const gameplay = new muda.GamePlay(world, camera);
  const item = new muda.GraphicsItem(gameplay, pixels);
  item.draw();
}
