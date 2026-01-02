import { openDB } from 'idb';
import type { IDBPDatabase, DBSchema } from 'idb';
import type { PrefectureDB } from '../../types/prefecture';
import type { PhotoDB } from '../../types/photo';
import type { SettingsDB } from '../../types/settings';

/**
 * IndexedDBスキーマ定義
 */
interface ManholeDB extends DBSchema {
  prefectures: {
    key: string; // Prefecture.id
    value: PrefectureDB;
    indexes: {};
  };
  photos: {
    key: string; // Photo.id
    value: PhotoDB;
    indexes: {
      prefectureId: string; // 都道府県IDでインデックス
      takenAt: string; // 撮影日時でインデックス
    };
  };
  settings: {
    key: string; // Settings.id
    value: SettingsDB;
    indexes: {};
  };
  images: {
    key: string; // Blob ID
    value: Blob;
    indexes: {};
  };
}

const DB_NAME = 'manhole-app';
const DB_VERSION = 1;

/**
 * IndexedDBを開く
 */
export async function openDatabase(): Promise<IDBPDatabase<ManholeDB>> {
  const db = await openDB<ManholeDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 都道府県テーブル
      if (!db.objectStoreNames.contains('prefectures')) {
        db.createObjectStore('prefectures', {
          keyPath: 'id',
        });
        // インデックスは不要（IDで直接アクセス）
      }

      // 写真テーブル
      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', {
          keyPath: 'id',
        });
        photoStore.createIndex('prefectureId', 'prefectureId');
        photoStore.createIndex('takenAt', 'takenAt');
        // 複合インデックスはidbライブラリでは直接サポートされていないため、
        // 単一のインデックスで対応（必要に応じて後で実装）
      }

      // 設定テーブル
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', {
          keyPath: 'id',
        });
      }

      // 画像Blob保存用テーブル（keyPathなし、明示的にIDを指定して保存）
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images');
      }
    },
  });

  return db;
}

/**
 * IndexedDBインスタンスを取得（シングルトン的な使用）
 */
let dbInstance: IDBPDatabase<ManholeDB> | null = null;

export async function getDatabase(): Promise<IDBPDatabase<ManholeDB>> {
  if (!dbInstance) {
    dbInstance = await openDatabase();
  }
  return dbInstance;
}

