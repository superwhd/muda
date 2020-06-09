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
    this.canvas.width = this.nativeCanvasSize().width;
    this.canvas.height = this.nativeCanvasSize().height;
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

export type Unit = Drawable & Collidable;

export class World {
  constructor() {}
  allDrawables(): Drawable[] {
    let res = new Array<Drawable>();
    for (const value of Object.values(this.units)) {
      if (value as Unit) {
        res.push(value as Drawable);
      } else {
        res = res.concat(value as Drawable[]);
      }
    }
    return res;
  }
  units: {[key: string]: Unit[] | Unit} = {};
}

interface Drawer {
  draw(camera: Camera, pixel: Pixel): void;
}

export class SimpleDrawer implements Drawer {
  constructor(borderColor: Color) {
    this.borderColor = borderColor;
  }
  draw(camera: Camera, pixel: Pixel): void {
    const ctx = camera.canvas.getContext('2d')!;
    const nativePos: Coordinate = camera.pixelToNativePixel(pixel.position);
    ctx.fillStyle = pixel.color.toString();
    ctx.fillRect(nativePos.x, nativePos.y, camera.pixelSize, camera.pixelSize);
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.borderColor.toString();
    ctx.strokeRect(
      nativePos.x + ctx.lineWidth / 2,
      nativePos.y + ctx.lineWidth / 2,
      camera.pixelSize - ctx.lineWidth,
      camera.pixelSize - ctx.lineWidth
    );
  }
  borderColor: Color;
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
  public pixels: Pixel[];
  public position: Coordinate = {x: 0, y: 0};
  public layer: number;
}

// TODO(whd) Consider layer?
export interface Collidable {
  // border() returns the coordinates of the object.
  // We say there is a collision as long as the border() overlaps with another Collidable's border()
  border(): Coordinate[];
  // aabb() returns the AABB of the object, represented by the up left cooridnate and the bottom right coordinate.
  aabb(): {topLeft: Coordinate; bottomRight: Coordinate};
}

export class GraphicsItemUnit extends GraphicsItem implements Unit {
  constructor(pixels: Pixel[], position?: Coordinate, layer = 0) {
    super(pixels, position, layer);
  }
  aabb(): {topLeft: Coordinate; bottomRight: Coordinate} {
    const border = this.border();
    if (!border.length) {
      // represents empty
      return {topLeft: {x: 1, y: 1}, bottomRight: {x: -1, y: -1}};
    }
    const topLeft = Object.assign([], border[0]);
    const bottomRight = Object.assign([], border[0]);
    for (const pos of border) {
      for (const field of ['x', 'y'] as (keyof Coordinate)[]) {
        topLeft[field] = Math.min(topLeft[field], pos[field]);
        bottomRight[field] = Math.max(bottomRight[field], pos[field]);
      }
    }
    return {topLeft, bottomRight};
  }
  border(): Coordinate[] {
    return this.pixels.map(pixel => {
      return {
        x: pixel.position.x + this.position.x,
        y: pixel.position.y + this.position.y,
      };
    });
  }
}

export interface CollisionDetector {
  collides(c1: Collidable, c2: Collidable): boolean;
  collides(
    c1: Collidable,
    c2: Collidable,
    d1: Coordinate,
    d2: Coordinate
  ): boolean;
  collidesBoundary(
    c: Collidable,
    d: Coordinate,
    topLeft: Coordinate,
    bottomRight: Coordinate
  ): boolean;
}

export class SimpleCollisionDetector implements CollisionDetector {
  collides(
    c1: Collidable,
    c2: Collidable,
    d1: Coordinate = {x: 0, y: 0},
    d2: Coordinate = {x: 0, y: 0}
  ): boolean {
    return this.quickTest(c1, c2, d1, d2) && this.borderOverlap(c1, c2, d1, d2);
  }
  collidesBoundary(
    c: Collidable,
    d: Coordinate,
    topLeft: Coordinate,
    bottomRight: Coordinate
  ): boolean {
    const aabb = c.aabb();
    for (const field of ['x', 'y'] as (keyof Coordinate)[]) {
      if (
        aabb.topLeft[field] + d[field] < topLeft[field] ||
        aabb.bottomRight[field] + d[field] > bottomRight[field]
      ) {
        return true;
      }
    }
    return false;
  }
  private quickTest(
    c1: Collidable,
    c2: Collidable,
    d1: Coordinate,
    d2: Coordinate
  ): boolean {
    // Check if c1.aabb() collides with c2.aabb()
    for (const field of ['x', 'y'] as (keyof Coordinate)[]) {
      const l = Math.max(
        c1.aabb().topLeft[field] + d1[field],
        c2.aabb().topLeft[field] + d2[field]
      );
      const r = Math.min(
        c1.aabb().bottomRight[field] + d1[field],
        c2.aabb().bottomRight[field] + d2[field]
      );
      if (l > r) {
        return false;
      }
    }
    return true;
  }
  private borderOverlap(
    c1: Collidable,
    c2: Collidable,
    d1: Coordinate,
    d2: Coordinate
  ): boolean {
    let border1 = c1.border();
    let border2 = c2.border();
    if (border1.length > border2.length) {
      [border1, border2] = [border2, border1];
      [d1, d2] = [d2, d1];
    }
    const borderSet1 = new Set<string>();
    for (const pos of border1) {
      borderSet1.add([pos.x + d1.x, pos.y + d1.y].toString());
    }
    for (const pos of border2) {
      if (borderSet1.has([pos.x + d2.x, pos.y + d2.y].toString())) {
        return true;
      }
    }
    return false;
  }
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
    const drawables = gamePlay.world.allDrawables();
    drawables.sort((d1, d2) => d1.layer - d2.layer);
    for (const drawable of drawables) {
      drawable.draw(gamePlay.camera);
    }
  }
}

// Use KeyEvent.code, not KeyEvent.key/KeyEvent.keyCode.
export class KeyboardController {
  constructor(gamePlay: GamePlay) {
    this.keyDownSet = new Set<string>();
    this.gamePlay = gamePlay;
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      this.keyDownSet.add(event.code);
      this.latestCode_ = event.code;
      event.code;
    });
  }
  // TODO(whd) keyDown should better return a number representing time
  keyDown(c: string): boolean {
    return this.keyDownSet.has(c);
  }
  consumeLatestKeyCode(): string {
    const code = this.latestCode_;
    this.latestCode_ = '';
    return code;
  }

  private latestCode_ = '';
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
