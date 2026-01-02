/**
 * 画像圧縮品質の種類
 */
export type CompressionQuality = 'high' | 'standard' | 'low';

/**
 * アプリ設定の型定義
 */
export interface Settings {
  id: string;              // "app_settings"
  version: string;         // アプリバージョン
  compressionQuality: CompressionQuality; // 画像圧縮品質（デフォルト: 'standard'）
  lastBackupDate?: Date;   // 最後のバックアップ日（将来の有料版用）
  premiumFeatures?: {      // 有料版機能の有効化状態（将来用）
    enabled: boolean;
    purchasedAt?: Date;
    licenseKey?: string;   // ライセンスキー（保存用）
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 設定データ（IndexedDB保存用）
 * Date型はIndexedDBで直接保存できないため、ISO文字列として保存
 */
export interface SettingsDB {
  id: string;
  version: string;
  compressionQuality: CompressionQuality;
  lastBackupDate?: string; // ISO string
  premiumFeatures?: {
    enabled: boolean;
    purchasedAt?: string;  // ISO string
    licenseKey?: string;   // ライセンスキー
  };
  createdAt: string;       // ISO string
  updatedAt: string;       // ISO string
}

