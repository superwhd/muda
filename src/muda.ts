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
  // TODO(whd): decouple drawer from camera
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
  draw(camera: Camera, pixel: Pixel): void;
}

export class DefaultDrawer implements Drawer {
  draw(camera: Camera, pixel: Pixel): void {
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
  draw(camera: Camera): void;
  // The upper left corner coordinate of this Drawable
  position: Coordinate;
  layer: number;
}

export class GraphicsItem implements Drawable {
  constructor(pixels: Pixel[], position?: Coordinate, layer = 0) {
    this.pixels = pixels;
    this.layer = layer;
    if (position !== undefined) {
      this.position = position;
    }
  }
  draw(camera: Camera): void {
    for (const pixel of this.pixels) {
      camera.drawer.draw(camera, {
        position: {
          x: pixel.position.x + this.position.x,
          y: pixel.position.y + this.position.y,
        },
        color: pixel.color,
      });
    }
  }
  pixels: Pixel[] = new Array<Pixel>();
  position: Coordinate = {x: 0, y: 0};
  layer: number;
}

export interface Handler {
  handle(gamePlay: GamePlay): void;
}

export interface Renderer {
  render(gamePlay: GamePlay): void;
}

export class SimpleRenderer implements Renderer {
  render(gamePlay: GamePlay): void {
    // TODO(whd) more elegant way to clear
    const canvasSize = gamePlay.camera.nativeCanvasSize();
    gamePlay.camera.canvas
      .getContext('2d')!
      .clearRect(0, 0, canvasSize.width, canvasSize.height);
    const drawables = [...gamePlay.world.drawables];
    drawables.sort((d1, d2) => d1.layer - d2.layer);
    for (const drawable of drawables) {
      drawable.draw(gamePlay.camera);
    }
  }
}

export class KeyboardController {
  constructor(gamePlay: GamePlay) {
    this.keyDownSet = new Set<string>();
    this.gamePlay = gamePlay;
    this.gamePlay.camera.canvas.addEventListener(
      'keydown',
      (event: KeyboardEvent) => {
        this.keyDownSet.add(event.key);
      }
    );
  }
  // TODO(whd) keyDown should better return a number representing time
  keyDown(c: string): boolean {
    return this.keyDownSet.has(c);
  }
  readonly keyDownSet: Set<string>;
  readonly gamePlay: GamePlay;
}

export class GamePlay {
  constructor(
    world: World,
    camera: Camera,
    handler: Handler,
    renderer: Renderer
  ) {
    this.world = world;
    this.camera = camera;
    this.handler = handler;
    this.renderer = renderer;
    this.keyboardController = new KeyboardController(this);
  }

  start(): void {
    setInterval(() => {
      this.renderer.render(this);
      this.handler.handle(this);
    }, 1000.0 / this.fps);
  }

  readonly world: World;
  readonly camera: Camera;
  readonly handler: Handler;
  readonly renderer: Renderer;
  readonly keyboardController: KeyboardController;
  fps = 60;
}
