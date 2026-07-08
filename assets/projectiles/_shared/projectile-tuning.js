const STYLE = `
  :root {
    color-scheme: dark;
    --bg: #07110c;
    --panel: #101c14;
    --line: #2e4a37;
    --text: #f7f1d0;
    --muted: #b8c8ae;
    --accent: #ffd75d;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background:
      linear-gradient(rgba(255,255,255,.034) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.034) 1px, transparent 1px),
      var(--bg);
    background-size: 44px 44px;
    color: var(--text);
  }
  main { width: min(1280px, calc(100vw - 24px)); margin: 0 auto; padding: 22px 0 38px; }
  header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 18px;
    margin-bottom: 14px;
  }
  h1 { margin: 0; font-size: clamp(28px, 3vw, 44px); line-height: 1; letter-spacing: 0; }
  a { color: var(--accent); font-weight: 850; text-decoration: none; }
  .summary { color: var(--muted); max-width: 640px; text-align: right; line-height: 1.46; font-size: 14px; }
  .layout {
    display: grid;
    grid-template-columns: minmax(360px, 1.15fr) minmax(320px, .85fr);
    gap: 14px;
  }
  .panel {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: color-mix(in srgb, var(--panel) 94%, black);
    overflow: hidden;
  }
  .images {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(144px, 1fr));
    gap: 1px;
    background: var(--line);
  }
  .image-cell {
    min-height: 158px;
    display: grid;
    place-items: center;
    position: relative;
    overflow: hidden;
    background: #0a1510;
  }
  .image-cell img {
    max-width: 92%;
    max-height: 136px;
    object-fit: contain;
    filter: drop-shadow(0 7px 0 rgba(0,0,0,.16));
  }
  .label {
    position: absolute;
    left: 8px;
    top: 7px;
    padding: 3px 7px;
    border-radius: 4px;
    color: var(--accent);
    background: rgba(3,8,5,.78);
    font-size: 11px;
    font-weight: 900;
  }
  .canvas-wrap {
    display: grid;
    place-items: center;
    min-height: 430px;
    padding: 14px;
    background: radial-gradient(circle at center, rgba(255,215,93,.08), transparent 48%), #0a1610;
  }
  canvas {
    width: min(100%, 660px);
    max-height: 390px;
    border: 1px solid #223828;
    border-radius: 6px;
    background: #122219;
  }
  .toolbar, .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px;
    border-top: 1px solid var(--line);
  }
  button, select, input[type="range"] { font: inherit; }
  button, select {
    min-height: 36px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: #112017;
    color: var(--text);
  }
  button { padding: 0 12px; cursor: pointer; font-weight: 800; }
  button.active { border-color: var(--accent); color: #10140b; background: var(--accent); }
  label {
    display: grid;
    gap: 5px;
    min-width: 140px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 800;
  }
  input[type="range"] { width: 100%; accent-color: var(--accent); }
  pre {
    margin: 0;
    padding: 12px;
    min-height: 560px;
    max-height: 700px;
    overflow: auto;
    color: #dfe8d6;
    background: #08110c;
    font-size: 11px;
    line-height: 1.45;
  }
  @media (max-width: 920px) {
    header, .layout { grid-template-columns: 1fr; }
    .summary { text-align: left; }
  }
  @media (max-width: 620px) {
    main { width: min(100vw - 12px, 1280px); padding-top: 12px; }
  }
  .capture { background: transparent; }
  .capture main { width: 720px; padding: 0; }
  .capture header,
  .capture .images,
  .capture aside,
  .capture .toolbar,
  .capture .controls { display: none; }
  .capture .layout { display: block; }
  .capture .panel { border: 0; border-radius: 0; background: transparent; }
  .capture .canvas-wrap { min-height: 420px; padding: 0; background: transparent; }
  .capture canvas { width: 720px; height: 420px; max-height: none; border: 0; border-radius: 0; }
`;

const installStyle = () => {
  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.append(style);
};

const loadRig = () => fetch("./rig.json").then((response) => response.json());

const color = (hex) => hex ?? "#ffffff";

const hexToRgba = (hex, alpha) => {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized.length === 3
    ? normalized.split("").map((item) => item + item).join("")
    : normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const drawGrid = (ctx) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "#122219";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.strokeStyle = "rgba(255,255,255,.045)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= ctx.canvas.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ctx.canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ctx.canvas.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ctx.canvas.width, y);
    ctx.stroke();
  }
};

const drawTriangle = (ctx, triangle, fill, alpha = 1) => {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(triangle.x ?? 0, triangle.y ?? 0);
  ctx.fillStyle = color(fill);
  ctx.beginPath();
  ctx.moveTo(triangle.points[0][0], triangle.points[0][1]);
  ctx.lineTo(triangle.points[1][0], triangle.points[1][1]);
  ctx.lineTo(triangle.points[2][0], triangle.points[2][1]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawRect = (ctx, rect, fill, alpha = 1) => {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color(fill);
  ctx.translate(rect.x, rect.y);
  ctx.fillRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height);
  ctx.restore();
};

const stableNoise = (seed) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const drawEllipse = (ctx, item, fill, alpha = 1) => {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color(fill);
  ctx.beginPath();
  ctx.ellipse(
    item.x ?? 0,
    item.y ?? 0,
    item.radiusX ?? item.radius ?? 4,
    item.radiusY ?? item.radius ?? 4,
    item.rotation ?? 0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
};

const drawBlobProjectile = (ctx, visual) => {
  const blobs = visual.blobs ?? [{ x: 0, y: 0, radiusX: 10, radiusY: 8 }];

  if (visual.outlineWidth) {
    for (const blob of blobs) {
      drawEllipse(
        ctx,
        {
          ...blob,
          radiusX: (blob.radiusX ?? blob.radius ?? 4) + visual.outlineWidth,
          radiusY: (blob.radiusY ?? blob.radius ?? 4) + visual.outlineWidth
        },
        visual.outline ?? "#000000",
        1
      );
    }
  }

  for (const blob of blobs) {
    drawEllipse(ctx, blob, visual.fill ?? "#050504", blob.alpha ?? 1);
  }

  if (visual.highlight) {
    drawEllipse(ctx, visual.highlight, visual.highlight.color, visual.highlight.alpha ?? 0.5);
  }
};

const drawProjectile = (ctx, rig, x, y, angle, scale = 1) => {
  const visual = rig.visual;
  ctx.save();
  ctx.translate(x, y);
  if (visual.rotation !== false) ctx.rotate(angle);
  ctx.scale(scale, scale);
  if (visual.kind === "blob") {
    drawBlobProjectile(ctx, visual);
    ctx.restore();
    return;
  }
  drawRect(ctx, visual.shaft, visual.shaft.color, visual.shaft.alpha ?? 1);
  if (visual.highlight) drawRect(ctx, visual.highlight, visual.highlight.color, visual.highlight.alpha ?? 1);
  drawTriangle(ctx, visual.head ?? visual.tip, (visual.head ?? visual.tip).color, (visual.head ?? visual.tip).alpha ?? 1);
  drawTriangle(ctx, visual.fletching, visual.fletching.color, visual.fletching.alpha ?? 1);
  ctx.restore();
};

const drawTrail = (ctx, rig, origin, angle, progress) => {
  if (progress <= 0) return;

  const trail = rig.trail ?? {};
  const length = 260 * progress;
  const points = trail.points ?? 7;
  const colorValue = trail.color ?? "#ffd06a";

  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.rotate(angle);

  if (trail.mode === "speck") {
    for (let index = 1; index < points; index += 1) {
      const p = index / Math.max(1, points - 1);
      const baseX = -length * (1 - index / points);
      const alpha = (trail.alphaMin ?? 0.1) + p * ((trail.alphaMax ?? 0.42) - (trail.alphaMin ?? 0.1));
      const specks = trail.specksPerPoint ?? 4;
      for (let speck = 0; speck < specks; speck += 1) {
        const seed = index * 31 + speck * 7;
        const x = baseX + (stableNoise(seed) - 0.5) * 24;
        const y = (stableNoise(seed + 13) - 0.5) * (trail.scatter ?? 10);
        const radius = 1.2 + stableNoise(seed + 29) * (trail.widthBase ?? 5) * 0.45;
        ctx.fillStyle = hexToRgba(colorValue, alpha * (0.45 + stableNoise(seed + 3) * 0.55));
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }

  for (let index = 1; index < points; index += 1) {
    const p = index / Math.max(1, points - 1);
    const x1 = -length * (1 - (index - 1) / points);
    const x2 = -length * (1 - index / points);
    ctx.strokeStyle = hexToRgba(colorValue, (trail.alphaMin ?? 0.08) + p * ((trail.alphaMax ?? 0.28) - (trail.alphaMin ?? 0.08)));
    ctx.lineWidth = (trail.widthBase ?? 7) * p;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, 0);
    ctx.lineTo(x2, 0);
    ctx.stroke();
  }

  ctx.restore();
};

const drawImpact = (ctx, rig, x, y, progress, mode) => {
  const impact = mode === "playerImpact"
    ? rig.impacts?.player
    : mode === "wallImpact"
      ? rig.impacts?.wall
      : rig.impacts?.boundary ?? rig.impacts?.wall;
  if (!impact) return;

  const radius = impact.radiusStart + (impact.radiusEnd - impact.radiusStart) * progress;
  const alpha = 1 - progress;
  ctx.save();

  if (impact.mode === "cloud") {
    const cloudOffsets = [
      [0, 0, 1],
      [-0.48, 0.12, 0.64],
      [0.44, -0.2, 0.58],
      [0.26, 0.46, 0.48],
      [-0.18, -0.44, 0.42]
    ];
    for (const [offsetX, offsetY, scale] of cloudOffsets) {
      ctx.fillStyle = hexToRgba(impact.color, alpha * (impact.fillAlpha ?? 0.74));
      ctx.beginPath();
      ctx.arc(x + offsetX * radius, y + offsetY * radius, radius * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    const speckColor = impact.speckColor ?? "#ffffff";
    for (let index = 0; index < 18; index += 1) {
      const theta = stableNoise(index + 4) * Math.PI * 2;
      const distance = radius * (0.25 + stableNoise(index + 11) * 1.08);
      ctx.fillStyle = hexToRgba(speckColor, alpha * (impact.speckAlpha ?? 0.36));
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(theta) * distance,
        y + Math.sin(theta) * distance,
        1 + stableNoise(index + 21) * 1.8,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  ctx.strokeStyle = hexToRgba(impact.color, alpha * (impact.strokeAlpha ?? 0.75));
  ctx.fillStyle = hexToRgba(impact.color, alpha * (impact.fillAlpha ?? 0.65));
  ctx.lineWidth = impact.strokeWidth ?? 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, impact.dotRadius ?? 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawPreview = (ctx, rig, controls, time) => {
  const mode = controls.mode.value;
  const scale = Number(controls.zoom.value);
  const angle = Number(controls.angle.value) * (Math.PI / 180);
  const progress = (Math.sin(time * 0.0018) + 1) / 2;
  const origin = {
    x: ctx.canvas.width / 2 + Math.cos(angle) * 70 * (progress - 0.5),
    y: ctx.canvas.height / 2 + Math.sin(angle) * 70 * (progress - 0.5)
  };

  drawGrid(ctx);

  if (mode === "trail" || mode === "flight") {
    drawTrail(ctx, rig, origin, angle, mode === "flight" ? 0.85 : progress);
  }

  drawProjectile(ctx, rig, origin.x, origin.y, angle, scale);

  if (mode === "boundaryImpact" || mode === "wallImpact" || mode === "playerImpact") {
    drawImpact(ctx, rig, origin.x + Math.cos(angle) * 72, origin.y + Math.sin(angle) * 72, progress, mode);
  }

  ctx.fillStyle = "rgba(5,10,7,.74)";
  ctx.fillRect(10, 10, 184, 42);
  ctx.fillStyle = "#ffd75d";
  ctx.font = "800 13px system-ui";
  ctx.fillText(`${mode} / ${Math.round(Number(controls.angle.value))}deg`, 20, 36);
};

const createImageCell = (label, src, alt) => {
  const cell = document.createElement("div");
  cell.className = "image-cell";
  cell.innerHTML = `<span class="label"></span><img alt="">`;
  cell.querySelector(".label").textContent = label;
  const image = cell.querySelector("img");
  image.src = src;
  image.alt = alt;
  return cell;
};

const renderPage = async () => {
  installStyle();
  const rig = await loadRig();
  const params = new URLSearchParams(window.location.search);
  if (params.get("capture") === "1") document.body.classList.add("capture");
  const title = document.body.dataset.assetName ?? rig.id;
  document.title = `${title} Projectile Tuning`;
  document.body.innerHTML = `
    <main>
      <header>
        <div>
          <h1>${title}</h1>
        </div>
        <div class="summary">
          Reads this folder's rig.json and previews runtime projectile shape, trail, and impact.
          <br><a href="../">projectiles</a>
          <span> / </span>
          <a href="../../../">game debug</a>
        </div>
      </header>
      <div class="layout">
        <section class="panel">
          <div class="images" id="images"></div>
          <div class="canvas-wrap"><canvas width="720" height="420"></canvas></div>
          <div class="toolbar">
            <button type="button" data-mode="flight" class="active">flight</button>
            <button type="button" data-mode="trail">trail</button>
            <button type="button" data-mode="boundaryImpact">boundary</button>
            <button type="button" data-mode="wallImpact">wall</button>
            <button type="button" data-mode="playerImpact">player hit</button>
          </div>
          <div class="controls">
            <label>angle<input data-control="angle" type="range" min="-180" max="180" step="1" value="0"></label>
            <label>zoom<input data-control="zoom" type="range" min="1" max="4" step="0.05" value="2.4"></label>
            <label>mode<select data-control="mode">
              <option value="flight">flight</option>
              <option value="trail">trail</option>
              <option value="boundaryImpact">boundary</option>
              <option value="wallImpact">wall</option>
              <option value="playerImpact">player hit</option>
            </select></label>
          </div>
        </section>
        <aside class="panel">
          <div class="toolbar" style="border-top:0">
            <button type="button" data-action="copy-rig">copy rig</button>
            <button type="button" data-action="copy-preview">copy preview</button>
          </div>
          <pre></pre>
        </aside>
      </div>
    </main>
  `;

  const images = document.querySelector("#images");
  for (const [index, source] of (rig.sourceReferences ?? []).entries()) {
    images.append(createImageCell(index === 0 ? "Reference" : `Source ${index + 1}`, source, source));
  }
  for (const [label, src] of Object.entries(rig.exports ?? {})) {
    if (label === "comparison") continue;
    images.append(createImageCell(label, src, label));
  }

  const controls = {
    angle: document.querySelector('[data-control="angle"]'),
    zoom: document.querySelector('[data-control="zoom"]'),
    mode: document.querySelector('[data-control="mode"]')
  };

  const captureMode = params.get("mode");
  if (captureMode && Array.from(controls.mode.options).some((option) => option.value === captureMode)) {
    controls.mode.value = captureMode;
  }

  const pre = document.querySelector("pre");
  const syncPre = () => {
    pre.textContent = JSON.stringify(
      {
        id: rig.id,
        preview: {
          mode: controls.mode.value,
          angle: Number(controls.angle.value),
          zoom: Number(controls.zoom.value)
        },
        rig
      },
      null,
      2
    );
  };

  for (const control of Object.values(controls)) {
    control.addEventListener("input", syncPre);
    control.addEventListener("change", syncPre);
  }

  for (const button of document.querySelectorAll("[data-mode]")) {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-mode]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      controls.mode.value = button.dataset.mode;
      syncPre();
    });
  }

  document.querySelector('[data-action="copy-rig"]').addEventListener("click", async () => {
    await navigator.clipboard.writeText(JSON.stringify(rig, null, 2));
  });
  document.querySelector('[data-action="copy-preview"]').addEventListener("click", async () => {
    await navigator.clipboard.writeText(pre.textContent);
  });

  syncPre();
  const ctx = document.querySelector("canvas").getContext("2d");
  const tick = (time) => {
    drawPreview(ctx, rig, controls, time);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

renderPage().catch((error) => {
  installStyle();
  document.body.innerHTML = `<main><h1>Tuning failed</h1><pre>${String(error.stack ?? error)}</pre></main>`;
});
