// A 2D coordinate
export interface Coordinate {
  x: number;
  y: number;
}

export interface Camera {
  worldPosToCamera(pos: Coordinate): Coordinate | null;
  gridToPixel(pos: Coordinate): Coordinate;
  pixelToNativePixel(pos: Coordinate): Coordinate;
  nativeCanvasSize(): {width: number; height: number};

  readonly canvas: HTMLCanvasElement;
  readonly drawer: Drawer;
  // The side length of a grid, in 'muda' pixels
  readonly gridSize: number;
  // The side length of a 'muda' pixel, in size of monitor/native pixels
  readonly pixelSize: number;
  // Canvas width by grid
  readonly width: number;
  // Canvas height by grid
  readonly height: number;
}

export class DefaultCamera implements Camera {
  constructor(
    canvas: HTMLCanvasElement,
    drawer: Drawer,
    gridSize: number,
    pixelSize: number,
    width: number,
    height: number
  ) {
    this.canvas = canvas;
    this.drawer = drawer;
    this.gridSize = gridSize;
    this.pixelSize = pixelSize;
    this.width = width;
    this.height = height;
  }
  worldPosToCamera(pos: Coordinate) {
    const copied = Object.assign({}, pos);
    pos.x -= this.offset.x;
    pos.y -= this.offset.y;
    if (pos.x < 0 || pos.x >= this.width || pos.y < 0 || pos.y >= this.height) {
      return null;
    }
    return copied;
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
  offset: Coordinate = {x: 0, y: 0};
  readonly drawer: Drawer;
  readonly canvas: HTMLCanvasElement;
  readonly gridSize: number;
  readonly pixelSize: number;
  readonly width: number;
  readonly height: number;
}

type CanvasCtx = CanvasRenderingContext2D;

export class World {
  constructor() {}
  drawables: Drawable[] = [];
}

interface Drawer {
  draw(world: World, camera: Camera, pixel: Pixel): void;
}

export class DefaultDrawer implements Drawer {
  draw(world: World, camera: Camera, pixel: Pixel): void {
    const ctx = camera.canvas.getContext('2d')!;
    const nativePos: Coordinate = camera.pixelToNativePixel(pixel.position);
    ctx.fillStyle = pixel.color.toString();
    ctx.fillRect(nativePos.x, nativePos.y, camera.pixelSize, camera.pixelSize);
  }
}

export interface Color {
  // A color string that's interpretable by JavaScript
  toString(): string;
}

export interface Pixel {
  position: Coordinate;
  color: Color;
}

export interface Drawable {
  draw(): void;
  readonly world: World;
  readonly camera: Camera;
  // The upper left corner coordinate of this Drawable
  position: Coordinate;
}

export class GraphicsItem implements Drawable {
  constructor(gameplay: GamePlay, pixels: Pixel[], position?: Coordinate) {
    this.world = gameplay.world;
    this.camera = gameplay.camera;
    this.pixels = pixels;
    if (position !== undefined) {
      this.position = position;
    }
  }
  draw(): void {
    for (const pixel of this.pixels) {
      this.camera.drawer.draw(this.world, this.camera, pixel);
    }
  }
  position: Coordinate = {x: 0, y: 0};
  pixels: Pixel[] = new Array<Pixel>();
  readonly world: World;
  readonly camera: Camera;
}

export class GamePlay {
  constructor(world: World, camera: Camera) {
    this.world = world;
    this.camera = camera;
  }
  readonly world: World;
  readonly camera: Camera;
}
