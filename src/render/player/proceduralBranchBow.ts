export const BRANCH_BOW_TEXTURE_KEY = 'bowbert-procedural-branch-bow';

export const BOWBERT_BRANCH_BOW_TUNING = {
  texture: {
    width: 360,
    height: 420,
    anchorX: 180,
    anchorY: 210,
    drawScale: 0.58
  },
  placement: {
    scale: 0.22,
    distance: 50,
    yDistance: 40,
    offsetX: 0,
    offsetY: -15,
    rotationOffsetDeg: -7,
    drawDistance: 5,
    releaseKick: 7,
    recoilDistance: 8,
    recoilY: 5
  }
} as const;

interface BranchBowDrawOptions {
  readonly draw: number;
  readonly recoil: number;
  readonly timeSeconds: number;
  readonly showArrow: boolean;
  readonly glow?: boolean;
}

type CanvasPoint = {
  readonly x: number;
  readonly y: number;
};

const LEAF_TIP_TOP = new Path2D('M-18 0 C-46 -30 -35 -61 5 -63 C22 -36 18 -15 -18 0Z');
const LEAF_TIP_BOTTOM = new Path2D('M-18 0 C-46 30 -35 61 5 63 C22 36 18 15 -18 0Z');
const ARROW_TAIL_TOP = new Path2D('M-136 0 C-169 -25 -190 -28 -213 -22 C-193 3 -167 9 -136 0Z');
const ARROW_TAIL_BOTTOM = new Path2D('M-136 0 C-169 25 -190 28 -213 22 C-193 -3 -167 -9 -136 0Z');
const ARROW_TAIL_TOP_MARK = new Path2D('M-139 0 C-160 -9 -181 -14 -204 -18');
const ARROW_TAIL_BOTTOM_MARK = new Path2D('M-139 0 C-160 9 -181 14 -204 18');
const BRANCH_LIMB = new Path2D('M48 -166 C132 -125 150 -55 98 0 C151 61 125 127 47 166');
const BRANCH_MARK_TOP = new Path2D('M92 -101 C70 -88 63 -70 71 -51');
const BRANCH_MARK_BOTTOM = new Path2D('M113 42 C88 55 80 76 90 99');
const BRANCH_GRIP = new Path2D('M79 -24 C101 -14 105 16 80 28');
const BOW_CHARGE_ARC = new Path2D('M64 -158 C142 -122 157 -58 105 0 C157 58 142 122 64 158');

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const setupStroke = (
  ctx: CanvasRenderingContext2D,
  width: number,
  color: string,
  alpha = 1
): void => {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
};

const strokePath = (
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  stroke = '#070707',
  strokeWidth = 8,
  alpha = 1
): void => {
  ctx.save();
  setupStroke(ctx, strokeWidth, stroke, alpha);
  ctx.stroke(path);
  ctx.restore();
};

const fillAndStrokePath = (
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  fill: string,
  stroke = '#070707',
  strokeWidth = 8,
  alpha = 1
): void => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fill(path);
  ctx.stroke(path);
  ctx.restore();
};

const cubicPath = (start: CanvasPoint, c1: CanvasPoint, c2: CanvasPoint, end: CanvasPoint): Path2D => {
  const path = new Path2D();
  path.moveTo(start.x, start.y);
  path.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
  return path;
};

export const drawProceduralBranchBow = (
  ctx: CanvasRenderingContext2D,
  options: BranchBowDrawOptions
): void => {
  const { texture } = BOWBERT_BRANCH_BOW_TUNING;
  const draw = clamp(options.draw, 0, 1);
  const recoil = clamp(options.recoil, 0, 1);
  const fullDraw = clamp((draw - 0.82) / 0.18, 0, 1);

  ctx.clearRect(0, 0, texture.width, texture.height);
  ctx.save();
  ctx.translate(texture.anchorX + recoil * 8, texture.anchorY);
  ctx.scale(texture.drawScale, texture.drawScale);

  if (options.glow) {
    ctx.save();
    ctx.fillStyle = '#fff2ad';
    ctx.globalAlpha = 0.045 + draw * 0.075;
    ctx.beginPath();
    ctx.ellipse(28, 0, 178 + draw * 24, 214 + draw * 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawBranchLimb(ctx);
  drawBowChargeArc(ctx, draw, fullDraw, options.timeSeconds);
  drawBowString(ctx, draw, fullDraw);

  if (options.showArrow && draw > 0.08) {
    drawArrowProjectile(ctx, 124 - draw * 176, 1, 0.78 + draw * 0.08 + fullDraw * 0.02);
  }

  if (draw > 0) {
    const nockX = 60 - draw * 136;
    const readyPulse = fullDraw >= 1 ? 0.65 + Math.sin(options.timeSeconds * 18) * 0.35 : 0;

    ctx.save();
    ctx.globalAlpha = 0.38 + draw * 0.32 + fullDraw * 0.24;
    ctx.fillStyle = '#fff2ad';
    ctx.beginPath();
    ctx.arc(nockX, 1, 4 + draw * 5 + fullDraw * 2, 0, Math.PI * 2);
    ctx.fill();

    if (fullDraw > 0) {
      setupStroke(ctx, 4, '#fff2ad', 0.16 + fullDraw * 0.34 + readyPulse * 0.28);
      ctx.beginPath();
      ctx.arc(nockX, 1, 14 + fullDraw * 10 + readyPulse * 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (readyPulse > 0) {
      drawSparkle(ctx, nockX - 18, -14, 10 + readyPulse * 6, options.timeSeconds * 1.4, 0.62 + readyPulse * 0.32);
      drawSparkle(ctx, nockX + 11, 18, 7 + readyPulse * 4, -options.timeSeconds * 1.1, 0.42 + readyPulse * 0.28);
    }

    ctx.restore();
  }

  if (recoil > 0.08) {
    setupStroke(ctx, 6, '#fff2ad', 0.3 * recoil);
    ctx.beginPath();
    ctx.moveTo(-62, -30);
    ctx.bezierCurveTo(-28, -42, 28, -36, 78, -24);
    ctx.moveTo(-62, 30);
    ctx.bezierCurveTo(-28, 42, 28, 36, 78, 24);
    ctx.stroke();
  }

  drawBranchGrip(ctx);
  ctx.restore();
  ctx.globalAlpha = 1;
};

const drawBranchLimb = (ctx: CanvasRenderingContext2D): void => {
  strokePath(ctx, BRANCH_LIMB, '#070707', 24);
  strokePath(ctx, BRANCH_LIMB, '#9a6236', 11);
  strokePath(ctx, BRANCH_MARK_TOP, '#070707', 6);
  strokePath(ctx, BRANCH_MARK_BOTTOM, '#070707', 6);

  ctx.save();
  ctx.translate(48, -166);
  ctx.rotate((-18 * Math.PI) / 180);
  ctx.scale(0.74, 0.74);
  fillAndStrokePath(ctx, LEAF_TIP_TOP, '#67dc55', '#070707', 8);
  strokePath(ctx, new Path2D('M-15 -5 C-10 -25 -4 -43 5 -59'), '#1d421f', 4);
  ctx.restore();

  ctx.save();
  ctx.translate(47, 166);
  ctx.rotate((18 * Math.PI) / 180);
  ctx.scale(0.74, 0.74);
  fillAndStrokePath(ctx, LEAF_TIP_BOTTOM, '#67dc55', '#070707', 8);
  strokePath(ctx, new Path2D('M-15 5 C-10 25 -4 43 5 59'), '#1d421f', 4);
  ctx.restore();

  ctx.fillStyle = '#fff2ad';
  ctx.globalAlpha = 0.86;
  ctx.beginPath();
  ctx.arc(48, -166, 5, 0, Math.PI * 2);
  ctx.arc(47, 166, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
};

const drawBowChargeArc = (
  ctx: CanvasRenderingContext2D,
  draw: number,
  fullDraw: number,
  timeSeconds: number
): void => {
  if (draw <= 0.08) return;

  ctx.save();
  setupStroke(ctx, 7, '#fff2ad', 0.14 + draw * 0.32);
  ctx.setLineDash([70 + draw * 330, 430]);
  ctx.lineDashOffset = 210 - draw * 180;
  ctx.stroke(BOW_CHARGE_ARC);
  ctx.restore();

  if (draw < 1) return;

  ctx.save();
  setupStroke(ctx, 5, '#fff2ad', 0.16 + fullDraw * 0.34);
  ctx.setLineDash([42, 24]);
  ctx.lineDashOffset = -timeSeconds * 42;
  ctx.stroke(BOW_CHARGE_ARC);

  if (fullDraw >= 1) {
    drawSparkle(ctx, -60, -112, 10 + Math.sin(timeSeconds * 16) * 2, timeSeconds, 0.72);
    drawSparkle(ctx, -48, 102, 8 + Math.cos(timeSeconds * 14) * 2, -timeSeconds, 0.58);
  }

  ctx.restore();
};

const drawBowString = (ctx: CanvasRenderingContext2D, draw: number, fullDraw: number): void => {
  const stringX = 60 - draw * 136;
  const path = cubicPath({ x: 48, y: -166 }, { x: stringX, y: -64 }, { x: stringX, y: 64 }, { x: 47, y: 166 });

  if (draw > 0) {
    strokePath(ctx, path, '#fff2ad', 9 + draw * 8 + fullDraw * 2, 0.1 + draw * 0.32 + fullDraw * 0.16);
  }

  strokePath(ctx, path, '#fff2ad', 5.5);
};

const drawBranchGrip = (ctx: CanvasRenderingContext2D): void => {
  strokePath(ctx, BRANCH_GRIP, '#070707', 24);
  strokePath(ctx, BRANCH_GRIP, '#9a6236', 11);
  strokePath(ctx, new Path2D('M71 -23 L92 -16 M68 -2 L98 4 M72 21 L92 27'), '#fff2ad', 5.5);
};

const drawArrowProjectile = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  alpha = 1
): void => {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  setupStroke(ctx, 14, '#070707');
  ctx.beginPath();
  ctx.moveTo(-132, 0);
  ctx.lineTo(128, 0);
  ctx.moveTo(128, 0);
  ctx.lineTo(96, -22);
  ctx.moveTo(128, 0);
  ctx.lineTo(96, 22);
  ctx.stroke();

  setupStroke(ctx, 7, '#fff2ad');
  ctx.beginPath();
  ctx.moveTo(-132, 0);
  ctx.lineTo(128, 0);
  ctx.moveTo(128, 0);
  ctx.lineTo(96, -22);
  ctx.moveTo(128, 0);
  ctx.lineTo(96, 22);
  ctx.stroke();

  fillAndStrokePath(ctx, ARROW_TAIL_TOP, '#67dc55', '#070707', 8);
  fillAndStrokePath(ctx, ARROW_TAIL_BOTTOM, '#67dc55', '#070707', 8);
  strokePath(ctx, ARROW_TAIL_TOP_MARK, '#1d421f', 4);
  strokePath(ctx, ARROW_TAIL_BOTTOM_MARK, '#1d421f', 4);
  ctx.fillStyle = '#fff2ad';
  ctx.globalAlpha *= 0.86;
  ctx.beginPath();
  ctx.arc(-132, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawSparkle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  alpha: number
): void => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  setupStroke(ctx, 4, '#070707', alpha * 0.7);
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(size, 0);
  ctx.moveTo(0, -size);
  ctx.lineTo(0, size);
  ctx.stroke();
  setupStroke(ctx, 2, '#fff2ad', alpha);
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(size, 0);
  ctx.moveTo(0, -size);
  ctx.lineTo(0, size);
  ctx.stroke();
  ctx.restore();
};
