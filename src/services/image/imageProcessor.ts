/**
 * 画像処理サービス
 * 画像の圧縮、リサイズ、サムネイル生成を行う
 */

import type { CompressionQuality } from '../../types/settings';

const MAX_IMAGE_WIDTH_HIGH = 2000; // 高品質時の最大幅（px）
const MAX_IMAGE_WIDTH_STANDARD = 2000; // 標準時の最大幅（px）
const MAX_IMAGE_WIDTH_LOW = 1500; // 低容量時の最大幅（px）
const THUMBNAIL_SIZE = 300; // サムネイルサイズ（px）

/**
 * 圧縮品質に応じたJPEG品質を取得
 */
function getJpegQuality(quality: CompressionQuality): number {
  switch (quality) {
    case 'high':
      return 0.85; // 高品質
    case 'standard':
      return 0.7; // 標準（デフォルト）
    case 'low':
      return 0.6; // 低容量
    default:
      return 0.7;
  }
}

/**
 * 圧縮品質に応じた最大幅を取得
 */
function getMaxWidth(quality: CompressionQuality): number {
  switch (quality) {
    case 'high':
      return MAX_IMAGE_WIDTH_HIGH;
    case 'standard':
      return MAX_IMAGE_WIDTH_STANDARD;
    case 'low':
      return MAX_IMAGE_WIDTH_LOW;
    default:
      return MAX_IMAGE_WIDTH_STANDARD;
  }
}

/**
 * FileからImage要素を生成
 */
function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Canvasに画像を描画し、Blobを生成
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number = 0.7
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Blobの生成に失敗しました'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * 画像をリサイズ
 */
function resizeImage(
  img: HTMLImageElement,
  maxWidth: number
): { width: number; height: number } {
  let { width, height } = img;

  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  return { width, height };
}

/**
 * 画像を圧縮（メイン画像用）
 */
export async function compressImage(file: File, quality: CompressionQuality = 'standard'): Promise<Blob> {
  const img = await fileToImage(file);
  const maxWidth = getMaxWidth(quality);
  const { width, height } = resizeImage(img, maxWidth);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas contextの取得に失敗しました');
  }

  const jpegQuality = getJpegQuality(quality);
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, jpegQuality);

  // 元のオブジェクトURLを解放
  URL.revokeObjectURL(img.src);

  return blob;
}

/**
 * サムネイル画像を生成（クロップ情報付き）
 */
export async function generateThumbnail(
  file: File,
  cropInfo?: { x: number; y: number; size?: number; width?: number; height?: number }
): Promise<Blob> {
  const img = await fileToImage(file);
  
  // 元画像のサイズ（リサイズ前）
  const originalWidth = img.width;
  const originalHeight = img.height;

  // クロップ情報がある場合、それを使用。ない場合は中央クロップ
  let cropX: number;
  let cropY: number;
  let cropSize: number;

  if (cropInfo) {
    // 後方互換性: size形式とwidth/height形式の両方に対応
    if ('size' in cropInfo && cropInfo.size !== undefined) {
      // 旧形式（size）
      const shortSide = Math.min(originalWidth, originalHeight);
      cropSize = shortSide * cropInfo.size;
      cropX = originalWidth * cropInfo.x;
      cropY = originalHeight * cropInfo.y;
    } else if ('width' in cropInfo && 'height' in cropInfo) {
      // 新形式（width/height）
      const cropWidth = originalWidth * cropInfo.width!;
      const cropHeight = originalHeight * cropInfo.height!;
      // 選択範囲の中心から正方形を切り出す
      cropSize = Math.min(cropWidth, cropHeight);
      const centerX = originalWidth * cropInfo.x + cropWidth / 2;
      const centerY = originalHeight * cropInfo.y + cropHeight / 2;
      cropX = centerX - cropSize / 2;
      cropY = centerY - cropSize / 2;
      // 画像の範囲内に収める
      cropX = Math.max(0, Math.min(originalWidth - cropSize, cropX));
      cropY = Math.max(0, Math.min(originalHeight - cropSize, cropY));
    } else {
      // フォールバック
      cropSize = Math.min(originalWidth, originalHeight);
      cropX = (originalWidth - cropSize) / 2;
      cropY = (originalHeight - cropSize) / 2;
    }
  } else {
    // デフォルト：中央クロップ
    cropSize = Math.min(originalWidth, originalHeight);
    cropX = (originalWidth - cropSize) / 2;
    cropY = (originalHeight - cropSize) / 2;
  }

  const canvas = document.createElement('canvas');
  canvas.width = THUMBNAIL_SIZE;
  canvas.height = THUMBNAIL_SIZE;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas contextの取得に失敗しました');
  }

  // 画像を指定位置からクロップして描画
  ctx.drawImage(
    img,
    cropX, cropY, cropSize, cropSize,  // ソース（元画像から切り取り）
    0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE  // デスティネーション（Canvasに描画）
  );
  const blob = await canvasToBlob(canvas, 0.8);

  // 元のオブジェクトURLを解放
  URL.revokeObjectURL(img.src);

  return blob;
}

/**
 * 画像ファイルとサムネイルを同時に生成
 */
export async function processImage(
  file: File,
  cropInfo?: { x: number; y: number; size?: number; width?: number; height?: number },
  quality: CompressionQuality = 'standard'
): Promise<{ imageBlob: Blob; thumbnailBlob: Blob }> {
  const [imageBlob, thumbnailBlob] = await Promise.all([
    compressImage(file, quality),
    generateThumbnail(file, cropInfo),
  ]);

  return { imageBlob, thumbnailBlob };
}

