const STYLE = `
  :root {
    color-scheme: dark;
    --bg: #07110c;
    --panel: #101c14;
    --panel-2: #14251a;
    --line: #2e4a37;
    --text: #f7f1d0;
    --muted: #b8c8ae;
    --accent: #ffd75d;
    --ok: #8eea7a;
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
  main { width: min(1320px, calc(100vw - 24px)); margin: 0 auto; padding: 22px 0 38px; }
  header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 18px;
    margin-bottom: 14px;
  }
  h1, h2 { margin: 0; letter-spacing: 0; }
  h1 { font-size: clamp(26px, 3vw, 42px); line-height: 1; }
  a { color: var(--accent); font-weight: 850; text-decoration: none; }
  .summary { color: var(--muted); max-width: 650px; text-align: right; line-height: 1.46; font-size: 14px; }
  .toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 14px; }
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
  .layout {
    display: grid;
    grid-template-columns: minmax(380px, 1.2fr) minmax(320px, .8fr);
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
    grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
    gap: 1px;
    background: var(--line);
  }
  .image-cell {
    min-height: 178px;
    display: grid;
    place-items: center;
    position: relative;
    overflow: hidden;
    background: #0a1510;
  }
  .image-cell img {
    max-width: 92%;
    max-height: 168px;
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
    min-height: 366px;
    padding: 12px;
    background: radial-gradient(circle at center 66%, rgba(255,215,93,.08), transparent 45%), #0a1610;
  }
  canvas {
    width: min(100%, 640px);
    max-height: 360px;
    border: 1px solid #223828;
    border-radius: 6px;
    background: #122219;
  }
  .controls {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    padding: 12px;
    border-top: 1px solid var(--line);
  }
  label {
    display: grid;
    gap: 5px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 800;
  }
  input[type="range"] { width: 100%; accent-color: var(--accent); }
  .facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding: 12px;
  }
  .fact {
    min-height: 54px;
    border: 1px solid #25402e;
    border-radius: 6px;
    background: var(--panel-2);
    padding: 8px;
  }
  .fact b { display: block; color: var(--accent); font-size: 11px; margin-bottom: 4px; }
  .fact span { font-size: 13px; overflow-wrap: anywhere; }
  pre {
    margin: 0;
    padding: 12px;
    overflow: auto;
    min-height: 310px;
    max-height: 470px;
    border-top: 1px solid var(--line);
    color: #dfe8d6;
    background: #08110c;
    font-size: 11px;
    line-height: 1.45;
  }
  .actions { padding: 0 12px 12px; margin: 0; }
  @media (max-width: 980px) {
    header, .layout { grid-template-columns: 1fr; }
    .summary { text-align: left; }
  }
  @media (max-width: 620px) {
    main { width: min(100vw - 12px, 1320px); padding-top: 12px; }
    .images, .controls, .facts { grid-template-columns: 1fr; }
  }
`;

const GAME_DEBUG = {
  bowbert: "dart-goober",
  "dart-goober": "dart-goober",
  "dart-tri-goober": "dart-tri-goober",
  "red-shroom": "red-shroom&variant=red",
  "purple-shroom": "red-shroom&variant=purple",
  kaboomlet: "kaboomlet",
  "slime-parent": "slime-parent",
  slime: "slime",
  "spooper-gooper": "spooper-gooper"
};

const PREVIEW_ORIGIN = { x: 300, y: 198 };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const installStyle = () => {
  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.append(style);
};

const drawEllipseShape = (ctx, width, height) => {
  ctx.beginPath();
  ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
};

const drawCutEllipseShape = (ctx, width, height, config) => {
  const radiusX = width / 2;
  const radiusY = height / 2;
  const slope = config.cutSlope ?? 1.6;
  const offset = (config.cutOffset ?? -0.36) * radiusY;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(-radiusX * 1.4, slope * -radiusX + offset);
  ctx.lineTo(radiusX * 1.4, slope * radiusX + offset);
  ctx.lineTo(radiusX * 1.4, radiusY * 1.4);
  ctx.lineTo(-radiusX * 1.4, radiusY * 1.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawXShape = (ctx, width, height) => {
  const line = Math.max(7, Math.min(width, height) * 0.24);
  ctx.save();
  ctx.strokeStyle = "#050505";
  ctx.lineWidth = line;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-width * 0.32, -height * 0.3);
  ctx.lineTo(width * 0.32, height * 0.3);
  ctx.moveTo(width * 0.32, -height * 0.3);
  ctx.lineTo(-width * 0.32, height * 0.3);
  ctx.stroke();
  ctx.restore();
};

const drawSpiralShape = (ctx, width, height, time) => {
  const radius = Math.min(width, height) * 0.44;
  const phase = time * 0.006;
  ctx.save();
  ctx.strokeStyle = "#050505";
  ctx.lineWidth = Math.max(6, radius * 0.2);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let index = 0; index < 44; index += 1) {
    const progress = index / 43;
    const angle = progress * Math.PI * 2.65 + phase;
    const localRadius = radius * (0.16 + progress * 0.84);
    const x = Math.cos(angle) * localRadius;
    const y = Math.sin(angle) * localRadius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
};

const getEmotionConfig = (rig, emotion) =>
  rig.gaze?.emotions?.[emotion] ?? rig.gaze?.emotions?.default ?? {};

const drawEyes = (ctx, rig, emotion, aim, time) => {
  const eyes = rig.gaze?.eyes ?? {};
  const config = getEmotionConfig(rig, emotion);
  const { width, height } = rig.base.imageSize;

  ctx.fillStyle = "#050505";

  for (const key of ["left", "right"]) {
    const eye = eyes[key];
    if (!eye) continue;

    const isAttachedEye = rig.gaze?.mode === "attached-eye-pupils";
    const offsetBasis = isAttachedEye ? eye.outerRadius * width * 2 : width;
    const offsetX =
      clamp(aim.x, -1, 1) * offsetBasis * (rig.gaze?.pupilOffsetScale?.x ?? 0.014) +
      (config.pupilShiftX ?? 0) * offsetBasis;
    const offsetY =
      clamp(aim.y, -1, 1) * offsetBasis * (rig.gaze?.pupilOffsetScale?.y ?? 0.01) +
      (config.pupilShiftY ?? 0) * offsetBasis;
    const x = (eye.x - 0.5) * width + offsetX;
    const y = (eye.y - 0.5) * height + offsetY;
    const eyeScaleX = (config.eyeScaleX ?? 1) * (config.pupilScale ?? 1);
    const eyeScaleY = (config.eyeScaleY ?? 1) * (config.pupilScale ?? 1);
    const attachedPupilDiameter = isAttachedEye
      ? eye.outerRadius * width * 2 * eye.whiteRatio * eye.pupilRatio
      : 0;
    const w = isAttachedEye ? attachedPupilDiameter * eyeScaleX : eye.radiusX * width * eyeScaleX * 2;
    const h = isAttachedEye ? attachedPupilDiameter * eyeScaleY : eye.radiusY * height * eyeScaleY * 2;
    const mirrorTilt = key === "left" ? -1 : 1;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((eye.rotation ?? 0) + (config.eyeTiltAdd ?? 0) * mirrorTilt);

    if (config.shape === "spiral") {
      drawSpiralShape(ctx, w, h, time);
    } else if (config.shape === "x") {
      drawXShape(ctx, w, h);
    } else if (config.shape === "cut-ellipse") {
      drawCutEllipseShape(ctx, w, h, config);
    } else {
      drawEllipseShape(ctx, w, h);
    }

    ctx.restore();
  }
};

const drawShadow = (ctx, rig, air, zoom) => {
  const shadow = rig.base.shadow ?? { width: 70, height: 14, y: 22 };
  const alpha = clamp(0.28 - air / 260, 0.08, 0.28);
  ctx.save();
  ctx.fillStyle = `rgba(4, 12, 7, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(
    PREVIEW_ORIGIN.x,
    PREVIEW_ORIGIN.y + shadow.y + air * 0.42,
    (shadow.width * zoom) / 2,
    (shadow.height * zoom) / 2,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
};

const drawSporeBurstPreview = (ctx, rig, projectileImage, time, zoom) => {
  const spores = rig.spores ?? rig.projectiles?.spore;
  if (!spores) return;

  const color = rig.vfx?.sporeTrail?.trailColor ?? "#ff4d54";
  const width = rig.vfx?.sporeTrail?.trailWidth ?? spores.trailWidth ?? 14;
  const originY = spores.originOffsetY ?? spores.originOffset?.y ?? -30;
  const distance = spores.burstDistance ?? 180;
  const travel = 0.28 + ((time * 0.00042) % 1) * 0.72;
  const directions = [
    { x: -0.72, y: -0.7 },
    { x: 0.72, y: -0.7 },
    { x: -0.72, y: 0.7 },
    { x: 0.72, y: 0.7 }
  ];
  const origin = {
    x: PREVIEW_ORIGIN.x,
    y: PREVIEW_ORIGIN.y + originY * zoom * (rig.base.scale ?? 0.1) * 6
  };

  ctx.save();
  for (const direction of directions) {
    const end = {
      x: origin.x + direction.x * distance * travel * 0.72,
      y: origin.y + direction.y * distance * travel * 0.56
    };
    const tail = {
      x: end.x - direction.x * width * 4.3 * zoom,
      y: end.y - direction.y * width * 3.2 * zoom
    };

    const gradient = ctx.createLinearGradient(tail.x, tail.y, end.x, end.y);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.38, color);
    gradient.addColorStop(1, color);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.max(4, width * zoom * 0.45);
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.48;
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    if (projectileImage) {
      const size = Math.max(18, (spores.scale ?? 0.047) * 520 * zoom);
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(end.x, end.y);
      ctx.rotate(Math.atan2(direction.y, direction.x));
      ctx.drawImage(projectileImage, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else {
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(end.x, end.y, Math.max(5, width * zoom * 0.35), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
};

const drawVfx = (ctx, rig, motion, time, zoom, projectileImage) => {
  if (motion === "attack" && (rig.spores || rig.projectiles?.spore)) {
    drawSporeBurstPreview(ctx, rig, projectileImage, time, zoom);
  }

  if ((rig.id === "dart-goober" || rig.id === "dart-tri-goober") && motion === "attack") {
    const pulse = 0.5 + Math.sin(time * 0.011) * 0.5;
    const attack = rig.attack ?? {};
    ctx.save();
    ctx.fillStyle = `rgba(255, 211, 106, ${0.22 + pulse * 0.32})`;
    ctx.beginPath();
    ctx.arc(
      PREVIEW_ORIGIN.x + (attack.muzzleX ?? 27) * zoom,
      PREVIEW_ORIGIN.y + (attack.muzzleY ?? -20) * zoom,
      ((attack.muzzleRadius ?? 9) + pulse * 7) * zoom,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  if (rig.id === "kaboomlet" && motion === "attack") {
    const pulse = 0.5 + Math.sin(time * 0.009) * 0.5;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 110, 69, ${0.32 + pulse * 0.28})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(PREVIEW_ORIGIN.x, PREVIEW_ORIGIN.y + 10, 55 + pulse * 18, 34 + pulse * 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffd75d";
    ctx.beginPath();
    ctx.arc(PREVIEW_ORIGIN.x + 35, PREVIEW_ORIGIN.y - 64, 4 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if ((rig.id === "slime-parent" || rig.id === "slime") && motion === "jump") {
    ctx.save();
    ctx.fillStyle = "rgba(180, 244, 108, 0.5)";
    for (let index = 0; index < 5; index += 1) {
      const angle = (Math.PI * 2 * index) / 5 + time * 0.001;
      ctx.beginPath();
      ctx.arc(
        PREVIEW_ORIGIN.x + Math.cos(angle) * 48,
        PREVIEW_ORIGIN.y + 34 + Math.sin(angle) * 10,
        3.5 * zoom,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }

  if (rig.id === "spooper-gooper" && motion === "attack") {
    ctx.save();
    ctx.fillStyle = "rgba(5, 5, 5, 0.9)";
    for (let index = 0; index < 3; index += 1) {
      const x = PREVIEW_ORIGIN.x + 72 + index * 22;
      const y = PREVIEW_ORIGIN.y - 20 + (index - 1) * 20 + Math.sin(time * 0.005 + index) * 3;
      ctx.beginPath();
      ctx.arc(x, y, (10 - index) * zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

const drawPreview = (ctx, rig, image, projectileImage, controls, time) => {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const zoom = Number(controls.zoom.value);
  const motion = controls.motion.value;
  const emotion = controls.emotion.value;
  const aim = {
    x: Number(controls.aimX.value),
    y: Number(controls.aimY.value)
  };
  const motionData = rig.motion ?? {};
  const bob =
    (motionData.idleBob ?? motionData.hoverBob ?? 1.5) *
    Math.sin(time * 0.004 + rig.id.length);
  const jumpAmount = motion === "jump" ? 1 : 0;
  const attackAmount = motion === "attack" ? 1 : 0;
  const hitAmount = motion === "hit" ? 1 : 0;
  const walkAmount = motion === "walk" ? 1 : 0;
  const air = jumpAmount * (motionData.jumpHeight ?? motionData.hoverBob ?? 28);
  const baseSquash =
    Math.sin(time * 0.008) * (motionData.idleSquash ?? motionData.idleWobble ?? 0.018) +
    jumpAmount * -0.15 +
    attackAmount * (motionData.armedPulse ?? 0.07) * Math.sin(time * 0.012) +
    hitAmount * 0.1 +
    walkAmount * Math.sin(time * 0.01) * (motionData.chaseWobble ?? 0.05);
  const scaleX = 1 + baseSquash + hitAmount * (motionData.hitScaleX ?? 0.08);
  const scaleY = 1 - baseSquash - hitAmount * (motionData.hitScaleY ?? 0.05);
  const opacity = rig.id === "spooper-gooper" && motion === "jump"
    ? 0.66 + Math.sin(time * 0.005) * 0.22
    : 1;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#122219";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  drawShadow(ctx, rig, air, zoom);

  ctx.save();
  ctx.translate(PREVIEW_ORIGIN.x, PREVIEW_ORIGIN.y + (rig.base.offset?.y ?? 0) + bob - air);
  ctx.scale((rig.base.scale ?? 0.1) * zoom * scaleX, (rig.base.scale ?? 0.1) * zoom * scaleY);
  ctx.globalAlpha = opacity;
  ctx.drawImage(image, -rig.base.imageSize.width / 2, -rig.base.imageSize.height / 2);
  drawEyes(ctx, rig, emotion, aim, time);
  ctx.restore();

  if (controls.vfx.value === "on") {
    drawVfx(ctx, rig, motion, time, zoom, projectileImage);
  }

  ctx.fillStyle = "rgba(5,10,7,.74)";
  ctx.fillRect(10, 10, 170, 42);
  ctx.fillStyle = "#ffd75d";
  ctx.font = "800 13px system-ui";
  ctx.fillText(`${emotion} / ${motion}`, 20, 36);
};

const setSelectOptions = (select, options, preferred) => {
  select.replaceChildren();
  for (const option of options) {
    const element = document.createElement("option");
    element.value = option;
    element.textContent = option;
    select.append(element);
  }
  select.value = options.includes(preferred) ? preferred : options[0] ?? "default";
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
  const title = document.body.dataset.characterName ?? "Character";
  const rig = await fetch("./rig.json").then((response) => response.json());
  const baseImage = await loadImage(rig.base.image ?? "base.png");
  const projectileSrc = rig.projectiles?.spore?.image ?? rig.spores?.imageAsset ?? null;
  const projectileImage = projectileSrc ? await loadImage(projectileSrc).catch(() => null) : null;
  document.title = `${title} Runtime Tuning`;

  document.body.innerHTML = `
    <main>
      <header>
        <div>
          <h1>${title} Runtime Tuning</h1>
          <div class="toolbar">
            <button type="button" data-state="default" class="active">default</button>
            <button type="button" data-state="attack">attack</button>
            <button type="button" data-state="hit">hit</button>
            <button type="button" data-state="jump">jump</button>
          </div>
        </div>
        <div class="summary">
          Reads this folder's rig.json and base.png, then previews Bowbert runtime gaze, motion squash, and lightweight VFX.
          <br><a href="../../../refs/runtime-character-tuning.html">all characters</a>
          <span> / </span>
          <a data-game-link href="../../../">game debug</a>
        </div>
      </header>
      <div class="layout">
        <section class="panel">
          <div class="images" id="images"></div>
          <div class="canvas-wrap">
            <canvas width="600" height="360"></canvas>
          </div>
          <div class="controls">
            <label>gaze/state<select data-control="emotion"></select></label>
            <label>motion<select data-control="motion">
              <option value="idle">idle</option>
              <option value="walk">walk/chase</option>
              <option value="jump">jump/hover</option>
              <option value="attack">attack/armed</option>
              <option value="hit">hit</option>
            </select></label>
            <label>vfx<select data-control="vfx">
              <option value="on">on</option>
              <option value="off">off</option>
            </select></label>
            <label>aim x<input data-control="aimX" type="range" min="-1" max="1" step="0.01" value="1"></label>
            <label>aim y<input data-control="aimY" type="range" min="-1" max="1" step="0.01" value="0"></label>
            <label>zoom<input data-control="zoom" type="range" min="0.75" max="1.9" step="0.01" value="1.28"></label>
          </div>
        </section>
        <aside class="panel">
          <div class="facts">
            <div class="fact"><b>status</b><span>${rig.status ?? "unknown"}</span></div>
            <div class="fact"><b>behavior</b><span>${
              rig.behavior?.phaseLoop?.join(" -> ") ??
              rig.behavior?.attackType ??
              rig.prototype?.system ??
              rig.prototype?.systemPrecedent ??
              rig.prototype?.renderer ??
              "runtime"
            }</span></div>
            <div class="fact"><b>base scale</b><span>${rig.base.scale} / ${rig.base.imageSize.width}x${rig.base.imageSize.height}</span></div>
            <div class="fact"><b>hitbox</b><span>${rig.base.hitbox?.radius ?? "n/a"}</span></div>
          </div>
          <div class="toolbar actions">
            <button type="button" data-action="copy-rig">copy rig</button>
            <button type="button" data-action="copy-preview">copy preview</button>
          </div>
          <pre></pre>
        </aside>
      </div>
    </main>
  `;

  const debug = GAME_DEBUG[rig.id];
  if (debug) {
    document.querySelector("[data-game-link]").href = `../../../?encounter=${debug}`;
  }

  const images = document.querySelector("#images");
  images.append(createImageCell("Reference", rig.sourceReferences?.[0] ?? "source/reference-01.png", "locked reference"));
  images.append(createImageCell("Base", rig.base.image ?? "base.png", "base asset"));
  if (projectileSrc) {
    images.append(createImageCell("Projectile", projectileSrc, "projectile asset"));
  }
  images.append(createImageCell("Comparison", "comparison.png", "comparison"));

  const controls = {
    emotion: document.querySelector('[data-control="emotion"]'),
    motion: document.querySelector('[data-control="motion"]'),
    aimX: document.querySelector('[data-control="aimX"]'),
    aimY: document.querySelector('[data-control="aimY"]'),
    zoom: document.querySelector('[data-control="zoom"]'),
    vfx: document.querySelector('[data-control="vfx"]')
  };
  const emotionKeys = Object.keys(rig.gaze?.emotions ?? { default: {} });
  setSelectOptions(controls.emotion, emotionKeys.length ? emotionKeys : ["default"], "default");

  const pre = document.querySelector("pre");
  const syncPre = () => {
    pre.textContent = JSON.stringify(
      {
        id: rig.id,
        preview: {
          emotion: controls.emotion.value,
          motion: controls.motion.value,
          aimX: Number(controls.aimX.value),
          aimY: Number(controls.aimY.value),
          zoom: Number(controls.zoom.value),
          vfx: controls.vfx.value
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

  for (const button of document.querySelectorAll("[data-state]")) {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-state]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const state = button.dataset.state;

      if (Array.from(controls.emotion.options).some((option) => option.value === state)) {
        controls.emotion.value = state;
      }
      if (state === "jump") controls.motion.value = "jump";
      else if (state === "attack") controls.motion.value = "attack";
      else if (state === "hit") controls.motion.value = "hit";
      else controls.motion.value = "idle";
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
    drawPreview(ctx, rig, baseImage, projectileImage, controls, time);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

renderPage().catch((error) => {
  installStyle();
  document.body.innerHTML = `<main><h1>Tuning failed</h1><pre>${String(error.stack ?? error)}</pre></main>`;
});
