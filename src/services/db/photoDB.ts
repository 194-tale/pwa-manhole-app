import { getDatabase } from './indexedDB';
import type { Photo, PhotoDB, PhotoInput, CropInfo } from '../../types/photo';
import { updatePrefecturePhotoCount } from './prefectureDB';

// UUIDを生成する関数（crypto.randomUUIDを使用、フォールバックで簡易UUID生成）
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // フォールバック: 簡易的なUUID生成
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Date型をISO文字列に変換
 */
function dateToISO(date: Date): string {
  return date.toISOString();
}

/**
 * ISO文字列をDate型に変換
 */
function isoToDate(iso: string): Date {
  return new Date(iso);
}

/**
 * PhotoDBをPhotoに変換（BlobからURLを生成）
 */
async function dbToPhoto(db: PhotoDB): Promise<Photo> {
  const dbInstance = await getDatabase();
  const imageBlob = await dbInstance.get('images', db.imageBlobId);
  const thumbnailBlob = await dbInstance.get('images', db.thumbnailBlobId);

  if (!imageBlob || !thumbnailBlob) {
    throw new Error('画像Blobが見つかりません');
  }

  // cropInfoの型変換（後方互換性のため）
  let cropInfo: CropInfo | undefined = undefined;
  if (db.cropInfo) {
    const crop = db.cropInfo as any;
    if ('size' in crop) {
      // 古い形式（size）から新しい形式（width, height）に変換
      cropInfo = {
        x: crop.x,
        y: crop.y,
        width: crop.size,
        height: crop.size,
      };
    } else if ('width' in crop && 'height' in crop) {
      // 新しい形式
      cropInfo = {
        x: crop.x,
        y: crop.y,
        width: crop.width,
        height: crop.height,
      };
    }
  }

  return {
    id: db.id,
    prefectureId: db.prefectureId,
    imageUrl: URL.createObjectURL(imageBlob),
    thumbnailUrl: URL.createObjectURL(thumbnailBlob),
    memo: db.memo,
    takenAt: isoToDate(db.takenAt),
    cropInfo,
    favorite: db.favorite || false,
    location: db.location,
    createdAt: isoToDate(db.createdAt),
    updatedAt: isoToDate(db.updatedAt),
  };
}

/**
 * PhotoをPhotoDBに変換（既存のBlobIDを使用）
 */
function photoToDB(photo: Photo, imageBlobId: string, thumbnailBlobId: string): PhotoDB {
  return {
    id: photo.id,
    prefectureId: photo.prefectureId,
    imageBlobId,
    thumbnailBlobId,
    memo: photo.memo,
    takenAt: dateToISO(photo.takenAt),
    cropInfo: photo.cropInfo,
    favorite: photo.favorite || false,
    location: photo.location,
    createdAt: dateToISO(photo.createdAt),
    updatedAt: dateToISO(photo.updatedAt),
  };
}

/**
 * すべての写真を取得
 */
export async function getAllPhotos(): Promise<Photo[]> {
  const db = await getDatabase();
  const photos = await db.getAll('photos');
  
  // 日付順（新しい順）でソート
  photos.sort((a, b) => {
    const dateA = new Date(a.takenAt).getTime();
    const dateB = new Date(b.takenAt).getTime();
    return dateB - dateA;
  });

  const result: Photo[] = [];
  for (const photoDB of photos) {
    try {
      const photo = await dbToPhoto(photoDB);
      result.push(photo);
    } catch (error) {
      console.error(`写真 ${photoDB.id} の変換エラー:`, error);
    }
  }
  return result;
}

/**
 * 都道府県IDで写真一覧を取得
 */
export async function getPhotosByPrefectureId(
  prefectureId: string
): Promise<Photo[]> {
  const db = await getDatabase();
  const photos = await db.getAllFromIndex('photos', 'prefectureId', prefectureId);
  
  // 日付順（新しい順）でソート
  photos.sort((a, b) => {
    const dateA = new Date(a.takenAt).getTime();
    const dateB = new Date(b.takenAt).getTime();
    return dateB - dateA;
  });

  const result: Photo[] = [];
  for (const photoDB of photos) {
    try {
      const photo = await dbToPhoto(photoDB);
      result.push(photo);
    } catch (error) {
      console.error(`写真 ${photoDB.id} の変換エラー:`, error);
    }
  }
  return result;
}

/**
 * 写真をIDで取得
 */
export async function getPhotoById(id: string): Promise<Photo | null> {
  const db = await getDatabase();
  const photoDB = await db.get('photos', id);
  if (!photoDB) {
    return null;
  }
  try {
    return await dbToPhoto(photoDB);
  } catch (error) {
    console.error(`写真 ${id} の変換エラー:`, error);
    return null;
  }
}

/**
 * 写真を作成
 */
export async function createPhoto(
  input: PhotoInput,
  imageBlob: Blob,
  thumbnailBlob: Blob
): Promise<Photo> {
  const db = await getDatabase();
  const now = new Date();
  const photoId = generateId();
  const imageBlobId = generateId();
  const thumbnailBlobId = generateId();

  // Blobを保存
  await db.put('images', imageBlob, imageBlobId);
  await db.put('images', thumbnailBlob, thumbnailBlobId);

  // 写真データを作成
  const photo: Photo = {
    id: photoId,
    prefectureId: input.prefectureId,
    imageUrl: '', // 後で設定
    thumbnailUrl: '', // 後で設定
    memo: input.memo || '',
    takenAt: input.takenAt || now,
    cropInfo: input.cropInfo,
    favorite: false,
    location: undefined,
    createdAt: now,
    updatedAt: now,
  };

  const photoDB = photoToDB(photo, imageBlobId, thumbnailBlobId);
  await db.put('photos', photoDB);

  // 都道府県の写真数を更新
  const allPhotos = await getPhotosByPrefectureId(input.prefectureId);
  const lastPhoto = allPhotos[0]; // 最新の写真
  await updatePrefecturePhotoCount(
    input.prefectureId,
    allPhotos.length,
    lastPhoto?.takenAt
  );

  // URLを生成して返す
  return await dbToPhoto(photoDB);
}

/**
 * 写真を更新
 */
export async function updatePhoto(photo: Photo): Promise<void> {
  const db = await getDatabase();
  const photoDB = await db.get('photos', photo.id);
  if (!photoDB) {
    throw new Error('写真が見つかりません');
  }

  // メモ、お気に入り、更新日時を更新（画像は更新しない）
  photoDB.memo = photo.memo;
  photoDB.favorite = photo.favorite || false;
  photoDB.updatedAt = dateToISO(new Date());
  
  await db.put('photos', photoDB);
}

/**
 * 写真を削除
 */
export async function deletePhoto(id: string): Promise<void> {
  const db = await getDatabase();
  const photoDB = await db.get('photos', id);
  if (!photoDB) {
    throw new Error('写真が見つかりません');
  }

  const prefectureId = photoDB.prefectureId;

  // Blobを削除
  await db.delete('images', photoDB.imageBlobId);
  await db.delete('images', photoDB.thumbnailBlobId);

  // 写真データを削除
  await db.delete('photos', id);

  // 都道府県の写真数を更新
  const allPhotos = await getPhotosByPrefectureId(prefectureId);
  const lastPhoto = allPhotos[0]; // 最新の写真
  await updatePrefecturePhotoCount(
    prefectureId,
    allPhotos.length,
    lastPhoto?.takenAt
  );
}

