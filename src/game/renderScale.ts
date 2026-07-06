import Phaser from 'phaser';

const MAX_RENDER_PIXEL_RATIO = 3;

export interface HiDpiViewport {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly renderWidth: number;
  readonly renderHeight: number;
  readonly pixelRatio: number;
}

type ResizableRenderer = Phaser.Renderer.WebGL.WebGLRenderer | Phaser.Renderer.Canvas.CanvasRenderer;

const getRenderPixelRatio = () => {
  if (typeof window === 'undefined') {
    return 1;
  }

  return Phaser.Math.Clamp(window.devicePixelRatio || 1, 1, MAX_RENDER_PIXEL_RATIO);
};

export const applyHiDpiCanvas = (scene: Phaser.Scene): HiDpiViewport => {
  const canvas = scene.game.canvas;
  const parent = canvas.parentElement;
  const cssWidth = Math.max(1, Math.round(parent?.clientWidth || scene.scale.width || canvas.clientWidth || 1));
  const cssHeight = Math.max(1, Math.round(parent?.clientHeight || scene.scale.height || canvas.clientHeight || 1));
  const pixelRatio = getRenderPixelRatio();
  const renderWidth = Math.max(1, Math.round(cssWidth * pixelRatio));
  const renderHeight = Math.max(1, Math.round(cssHeight * pixelRatio));

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  if (canvas.width !== renderWidth) {
    canvas.width = renderWidth;
  }

  if (canvas.height !== renderHeight) {
    canvas.height = renderHeight;
  }

  scene.scale.baseSize.setSize(renderWidth, renderHeight);
  scene.scale.displaySize.setSize(cssWidth, cssHeight);
  scene.scale.displayScale.set(renderWidth / cssWidth, renderHeight / cssHeight);
  scene.scale.updateBounds();

  const renderer = scene.game.renderer as ResizableRenderer;

  if (renderer.width !== renderWidth || renderer.height !== renderHeight) {
    renderer.resize(renderWidth, renderHeight);
  }

  return {
    cssWidth,
    cssHeight,
    renderWidth,
    renderHeight,
    pixelRatio
  };
};
