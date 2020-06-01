// A 2D coordinate
export interface Coordinate {
  x: number;
  y: number;
}

export interface CoordSystem {
  gridToPixel(pos: Coordinate): Coordinate;
  pixelToNativePixel(pos: Coordinate): Coordinate;
  // The side length of a grid, in 'muda' pixels
  readonly gridSize: number;
  // The side length of a 'muda' pixel, in size of monitor/native pixels
  readonly pixelSize: number;
}

export class DefaultCoordSystem implements CoordSystem {
  constructor(gridSize: number, pixelSize: number) {
    this.gridSize = gridSize;
    this.pixelSize = pixelSize;
  }
  gridToPixel(pos: Coordinate): Coordinate {
    return {x: pos.x * this.gridSize, y: pos.y * this.gridSize};
  }
  pixelToNativePixel(pos: Coordinate): Coordinate {
    return {x: pos.x * this.pixelSize, y: pos.y * this.pixelSize};
  }
  gridSize: number;
  pixelSize: number;
}

type CanvasCtx = CanvasRenderingContext2D;

type DrawPixelFunction = (canvas: Canvas, pixel: Pixel) => void;

export function filledRect(canvas: Canvas, pixel: Pixel): void {
  const ctx = canvas.ctx;
  const coordSystem = canvas.coordSystem;
  const nativePos: Coordinate = coordSystem.pixelToNativePixel(pixel.position);
  ctx.fillStyle = pixel.color.rgba();
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
    this.htmlCanvas = htmlCanvas;
    this.ctx = this.htmlCanvas.getContext('2d')!;
    this.coordSystem = coordSystem;
    this.drawPixelFunc = drawPixelFunc;
  }
  drawPixel(pixel: Pixel): void {
    this.drawPixelFunc(this, pixel);
  }

  readonly htmlCanvas: HTMLCanvasElement;
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
  // A string like '#000000' that represents the color
  rgba(): string;
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
  pixels: Pixel[] = Array<Pixel>();
  readonly canvas: Canvas;
}
