import * as muda from '@muda/muda';

export function drawDemo(nativeCanvas: HTMLCanvasElement) {
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
  const coordSystem = new muda.DefaultCoordSystem(1, 25, 10, 20);
  const mudaCanvas = new muda.Canvas(nativeCanvas, coordSystem, muda.fillRect);
  const pixels: Array<muda.Pixel> = [];
  for (let i = 0; i < mudaCanvas.width(); ++i) {
    for (let j = 0; j < mudaCanvas.height(); ++j) {
      pixels.push(
        makePixel(coor(i, j), makeColor((i + j) % 2 ? 'black' : 'white'))
      );
    }
  }
  const item = new muda.GraphicsItem(mudaCanvas, pixels);
  item.draw();
}
