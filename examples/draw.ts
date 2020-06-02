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
  const coordSystem = new muda.DefaultCoordSystem(1, 100);
  const mudaCanvas = new muda.Canvas(nativeCanvas, coordSystem, muda.fillRect);
  const pixels: Array<muda.Pixel> = [
    makePixel(coor(0, 0), makeColor('red')),
    makePixel(coor(0, 1), makeColor('yellow')),
    makePixel(coor(1, 1), makeColor('blue')),
  ];
  const item = new muda.GraphicsItem(mudaCanvas, pixels);
  item.draw();
}
