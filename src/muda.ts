// A 2D coordinate
export interface Coordinate {
  x: number;
  y: number;
}

export interface CoordSystem {
  gridToPixel(pos: Coordinate): Coordinate;
  pixelToNativePixel(pos: Coordinate): Coordinate;
  nativeCanvasSize(): {width: number; height: number};
  // The side length of a grid, in 'muda' pixels
  readonly gridSize: number;
  // The side length of a 'muda' pixel, in size of monitor/native pixels
  readonly pixelSize: number;
  // Canvas width by grid
  readonly width: number;
  // Canvas height by grid
  readonly height: number;
}

export class DefaultCoordSystem implements CoordSystem {
  constructor(
    gridSize: number,
    pixelSize: number,
    width: number,
    height: number
  ) {
    this.gridSize = gridSize;
    this.pixelSize = pixelSize;
    this.width = width;
    this.height = height;
  }
  gridToPixel(pos: Coordinate): Coordinate {
    return {x: pos.x * this.gridSize, y: pos.y * this.gridSize};
  }
  pixelToNativePixel(pos: Coordinate): Coordinate {
    return {x: pos.x * this.pixelSize, y: pos.y * this.pixelSize};
  }
  nativeCanvasSize() {
    return {
      width: this.width * this.gridSize * this.pixelSize,
      height: this.height * this.gridSize * this.pixelSize,
    };
  }
  readonly gridSize: number;
  readonly pixelSize: number;
  readonly width: number;
  readonly height: number;
}

type CanvasCtx = CanvasRenderingContext2D;

type DrawPixelFunction = (canvas: Canvas, pixel: Pixel) => void;

export function fillRect(canvas: Canvas, pixel: Pixel): void {
  const ctx = canvas.ctx;
  const coordSystem = canvas.coordSystem;
  const nativePos: Coordinate = coordSystem.pixelToNativePixel(pixel.position);
  ctx.fillStyle = pixel.color.toString();
  ctx.fillRect(
    nativePos.x,
    nativePos.y,
    coordSystem.pixelSize,
    coordSystem.pixelSize
  );
}

export class Canvas {
  constructor(
    htmlCanvas: HTMLCanvasElement,
    coordSystem: CoordSystem,
    drawPixelFunc: DrawPixelFunction
  ) {
    this.nativeCanvas = htmlCanvas;
    this.ctx = this.nativeCanvas.getContext('2d')!;
    this.coordSystem = coordSystem;
    this.drawPixelFunc = drawPixelFunc;

    const nativeCanvasSize = this.coordSystem.nativeCanvasSize();
    this.nativeCanvas.width = nativeCanvasSize.width;
    this.nativeCanvas.height = nativeCanvasSize.height;
  }
  drawPixel(pixel: Pixel): void {
    this.drawPixelFunc(this, pixel);
  }

  readonly nativeCanvas: HTMLCanvasElement;
  readonly ctx: CanvasCtx;
  readonly coordSystem: CoordSystem;
  readonly drawPixelFunc: DrawPixelFunction;
}

export interface Drawable {
  draw(): void;
  readonly canvas: Canvas;
  // The upper left corner coordinate of this Drawable
  position: Coordinate;
}

export interface Color {
  // A color string that's interpretable by JavaScript
  toString(): string;
}

export interface Pixel {
  position: Coordinate;
  color: Color;
}

export class GraphicsItem implements Drawable {
  constructor(canvas: Canvas, pixels: Pixel[], position?: Coordinate) {
    this.canvas = canvas;
    this.pixels = pixels;
    if (position !== undefined) {
      this.position = position;
    }
  }
  draw(): void {
    for (const pixel of this.pixels) {
      this.canvas.drawPixel(pixel);
    }
  }
  position: Coordinate = {x: 0, y: 0};
  pixels: Pixel[] = new Array<Pixel>();
  readonly canvas: Canvas;
}
