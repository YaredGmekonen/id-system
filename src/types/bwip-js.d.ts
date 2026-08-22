declare module 'bwip-js' {
  export interface ToCanvasOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    width?: number;
    includetext?: boolean;
    textxalign?: string;
    textsize?: number;
    [key: string]: any;
  }

  export function toCanvas(
    canvas: HTMLCanvasElement | string,
    options: ToCanvasOptions,
    callback?: (err?: Error | string, cvs?: HTMLCanvasElement) => void
  ): HTMLCanvasElement;

  export function toBuffer(
    options: ToCanvasOptions,
    callback: (err: string | Error, png: Buffer) => void
  ): void;
}
