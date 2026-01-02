/**
 * ストレージ容量管理ユーティリティ
 * IndexedDBの使用容量を計算・表示する
 */

import { getDatabase } from '../services/db/indexedDB';

/**
 * Blobのサイズを取得（バイト単位）
 */
export function getBlobSize(blob: Blob): number {
  return blob.size;
}

/**
 * バイト数を人間が読みやすい形式に変換
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * IndexedDBのimagesストアの合計サイズを計算
 */
export async function getTotalStorageSize(): Promise<number> {
  try {
    const db = await getDatabase();
    const images = await db.getAll('images');
    
    let totalSize = 0;
    for (const blob of images) {
      if (blob instanceof Blob) {
        totalSize += blob.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('ストレージサイズの計算エラー:', error);
    return 0;
  }
}

/**
 * 写真ごとのサイズを取得
 */
export async function getPhotoStorageSize(photoId: string): Promise<number> {
  try {
    const db = await getDatabase();
    const photoDB = await db.get('photos', photoId);
    
    if (!photoDB) return 0;
    
    const imageBlob = await db.get('images', photoDB.imageBlobId);
    const thumbnailBlob = await db.get('images', photoDB.thumbnailBlobId);
    
    let size = 0;
    if (imageBlob instanceof Blob) {
      size += imageBlob.size;
    }
    if (thumbnailBlob instanceof Blob) {
      size += thumbnailBlob.size;
    }
    
    return size;
  } catch (error) {
    console.error('写真サイズの計算エラー:', error);
    return 0;
  }
}

/**
 * ブラウザのストレージ容量制限を確認
 * 注意: ブラウザによっては正確に取得できない場合があります
 */
export async function getStorageQuota(): Promise<{ usage: number; quota: number } | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    } catch (error) {
      console.error('ストレージ容量の取得エラー:', error);
      return null;
    }
  }
  return null;
}

/**
 * ストレージ使用率を取得（0-1の範囲）
 */
export async function getStorageUsageRate(): Promise<number> {
  const quota = await getStorageQuota();
  if (!quota || quota.quota === 0) return 0;
  
  return quota.usage / quota.quota;
}

