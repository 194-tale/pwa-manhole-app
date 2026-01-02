import { getDatabase } from './indexedDB';
import type { Prefecture, PrefectureDB } from '../../types/prefecture';
import { PREFECTURE_LIST } from '../../types/prefecture';

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
 * PrefectureDBをPrefectureに変換
 */
function dbToPrefecture(db: PrefectureDB): Prefecture {
  return {
    ...db,
    lastPhotoDate: db.lastPhotoDate ? isoToDate(db.lastPhotoDate) : undefined,
    manholesUpdatedAt: db.manholesUpdatedAt ? isoToDate(db.manholesUpdatedAt) : undefined,
    createdAt: isoToDate(db.createdAt),
    updatedAt: isoToDate(db.updatedAt),
  };
}

/**
 * PrefectureをPrefectureDBに変換
 */
function prefectureToDB(prefecture: Prefecture): PrefectureDB {
  return {
    ...prefecture,
    lastPhotoDate: prefecture.lastPhotoDate
      ? dateToISO(prefecture.lastPhotoDate)
      : undefined,
    manholesUpdatedAt: prefecture.manholesUpdatedAt
      ? dateToISO(prefecture.manholesUpdatedAt)
      : undefined,
    createdAt: dateToISO(prefecture.createdAt),
    updatedAt: dateToISO(prefecture.updatedAt),
  };
}

/**
 * すべての都道府県を取得
 */
export async function getAllPrefectures(): Promise<Prefecture[]> {
  const db = await getDatabase();
  const prefectures = await db.getAll('prefectures');
  return prefectures.map(dbToPrefecture);
}

/**
 * 都道府県をIDで取得
 */
export async function getPrefectureById(id: string): Promise<Prefecture | null> {
  const db = await getDatabase();
  const prefecture = await db.get('prefectures', id);
  return prefecture ? dbToPrefecture(prefecture) : null;
}

/**
 * 都道府県を作成または更新
 */
export async function upsertPrefecture(
  prefecture: Prefecture
): Promise<void> {
  const db = await getDatabase();
  const prefectureDB = prefectureToDB(prefecture);
  await db.put('prefectures', prefectureDB);
}

/**
 * 都道府県の写真数を更新
 */
export async function updatePrefecturePhotoCount(
  prefectureId: string,
  photoCount: number,
  lastPhotoDate?: Date
): Promise<void> {
  const prefecture = await getPrefectureById(prefectureId);
  if (prefecture) {
    prefecture.photoCount = photoCount;
    if (lastPhotoDate) {
      prefecture.lastPhotoDate = lastPhotoDate;
    }
    prefecture.updatedAt = new Date();
    await upsertPrefecture(prefecture);
  }
}

/**
 * 都道府県の全マンホール数を更新（有料機能）
 */
export async function updatePrefectureTotalManholes(
  prefectureId: string,
  totalManholes: number
): Promise<void> {
  const prefecture = await getPrefectureById(prefectureId);
  if (prefecture) {
    prefecture.totalManholes = totalManholes;
    prefecture.manholesUpdatedAt = new Date();
    prefecture.updatedAt = new Date();
    await upsertPrefecture(prefecture);
  }
}

/**
 * 都道府県データを初期化（47都道府県を作成）
 */
export async function initializePrefectures(): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getAll('prefectures');
  
  // 既に47都道府県すべてが存在する場合は初期化をスキップ
  if (existing.length >= PREFECTURE_LIST.length) {
    return;
  }

  const now = new Date();
  const prefectures: PrefectureDB[] = PREFECTURE_LIST.map((p) => ({
    id: p.id,
    name: p.name,
    photoCount: 0,
    createdAt: dateToISO(now),
    updatedAt: dateToISO(now),
  }));

  // 一括追加（putを使用：既存のキーは更新、新しいキーは追加）
  const tx = db.transaction('prefectures', 'readwrite');
  const promises = prefectures.map(prefecture => tx.store.put(prefecture));
  await Promise.all(promises);
  await tx.done;
}

