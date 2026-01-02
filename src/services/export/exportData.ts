/**
 * データエクスポート機能
 * すべてのアプリデータをJSON形式でエクスポート
 */

import { getDatabase } from '../db/indexedDB';
import type { PhotoDB } from '../../types/photo';
import type { PrefectureDB } from '../../types/prefecture';
import type { SettingsDB } from '../../types/settings';

interface ExportData {
  version: string;
  exportedAt: string;
  photos: PhotoDB[];
  prefectures: PrefectureDB[];
  settings: SettingsDB;
  images: Array<{
    id: string;
    data: string; // Base64エンコードされたBlob
    type: string;
  }>;
}

const EXPORT_VERSION = '1.0.0';

/**
 * BlobをBase64文字列に変換
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Base64文字列をBlobに変換
 */
function base64ToBlob(base64: string, type: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
}

/**
 * すべてのアプリデータをエクスポート
 */
export async function exportAllData(): Promise<string> {
  try {
    const db = await getDatabase();
    
    // すべてのデータを取得
    const [photos, prefectures, settingsDB, imageBlobs] = await Promise.all([
      db.getAll('photos'),
      db.getAll('prefectures'),
      db.get('settings', 'app_settings'),
      db.getAll('images'),
    ]);

    // 画像BlobをBase64に変換
    const imagesData = await Promise.all(
      imageBlobs.map(async (blob, index) => {
        // IDを取得するため、keysを使用
        const keys = await db.getAllKeys('images');
        const id = keys[index];
        const base64 = await blobToBase64(blob as Blob);
        return {
          id: id as string,
          data: base64,
          type: (blob as Blob).type || 'image/jpeg',
        };
      })
    );

    const exportData: ExportData = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      photos,
      prefectures,
      settings: settingsDB || {
        id: 'app_settings',
        version: '1.0.0',
        compressionQuality: 'standard',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      images: imagesData,
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('データエクスポートエラー:', error);
    throw new Error('データのエクスポートに失敗しました');
  }
}

/**
 * エクスポートデータをダウンロード
 * モバイルブラウザでは共有機能も試行
 */
export async function downloadExportData(): Promise<void> {
  try {
    const data = await exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const fileName = `manhole-app-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    // モバイルブラウザ（iOS/Android）でShare APIが使える場合は共有を試行
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], fileName, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'ご当地マンホール データバックアップ',
            text: 'データバックアップファイル',
            files: [file],
          });
          return; // 共有成功したら終了
        }
      } catch (shareError: any) {
        // ユーザーが共有をキャンセルした場合は通常のダウンロードにフォールバック
        if (shareError.name !== 'AbortError') {
          console.warn('共有機能のエラー:', shareError);
          // 通常のダウンロードにフォールバック
        }
      }
    }
    
    // 通常のダウンロード（PCブラウザまたはShare APIが使えない場合）
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('ダウンロードエラー:', error);
    throw error;
  }
}

/**
 * エクスポートデータをインポート
 */
export async function importAllData(jsonData: string): Promise<void> {
  try {
    const importData: ExportData = JSON.parse(jsonData);
    
    // バージョンチェック（将来的な拡張用）
    if (!importData.version || !importData.photos || !importData.prefectures) {
      throw new Error('不正なデータ形式です');
    }

    const db = await getDatabase();
    const tx = db.transaction(['photos', 'prefectures', 'settings', 'images'], 'readwrite');

    // 既存データをクリア（オプション：確認後に実行）
    await tx.objectStore('photos').clear();
    await tx.objectStore('prefectures').clear();
    await tx.objectStore('settings').clear();
    await tx.objectStore('images').clear();

    // 画像Blobを復元して保存
    for (const imageData of importData.images) {
      const blob = base64ToBlob(imageData.data, imageData.type);
      await tx.objectStore('images').put(blob, imageData.id);
    }

    // 写真データを保存
    for (const photo of importData.photos) {
      await tx.objectStore('photos').put(photo);
    }

    // 都道府県データを保存
    for (const prefecture of importData.prefectures) {
      await tx.objectStore('prefectures').put(prefecture);
    }

    // 設定を保存
    if (importData.settings) {
      await tx.objectStore('settings').put(importData.settings);
    }

    await tx.done;
  } catch (error) {
    console.error('データインポートエラー:', error);
    throw new Error('データのインポートに失敗しました');
  }
}

/**
 * ファイルからデータをインポート
 */
export async function importFromFile(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = e.target?.result as string;
        await importAllData(jsonData);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsText(file);
  });
}

