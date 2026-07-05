import Phaser from 'phaser';

interface KeyedTextureOptions {
  readonly threshold?: number;
}

export const createCornerKeyedTexture = (
  scene: Phaser.Scene,
  sourceKey: string,
  targetKey: string,
  options: KeyedTextureOptions = {}
): string => {
  if (scene.textures.exists(targetKey)) {
    return targetKey;
  }

  const sourceImage = scene.textures.get(sourceKey).getSourceImage() as CanvasImageSource & {
    width: number;
    height: number;
  };
  const width = sourceImage.width;
  const height = sourceImage.height;
  const texture = scene.textures.createCanvas(targetKey, width, height);

  if (!texture) {
    return sourceKey;
  }

  const context = texture.getContext();

  context.clearRect(0, 0, width, height);
  context.drawImage(sourceImage, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  const keyRed = data[0];
  const keyGreen = data[1];
  const keyBlue = data[2];
  const threshold = options.threshold ?? 42;
  const thresholdSquared = threshold * threshold;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] - keyRed;
    const green = data[index + 1] - keyGreen;
    const blue = data[index + 2] - keyBlue;

    if (red * red + green * green + blue * blue <= thresholdSquared) {
      data[index + 3] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);
  texture.refresh();

  return targetKey;
};
