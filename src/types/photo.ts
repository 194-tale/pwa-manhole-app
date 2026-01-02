/**
 * 写真の型定義
 */
export interface Photo {
  id: string;              // UUID (crypto.randomUUID())
  prefectureId: string;    // "01" (都道府県ID、外部キー)
  imageUrl: string;        // Blob URLまたはIndexedDB内の参照
  thumbnailUrl: string;    // サムネイル画像URL（軽量化用）
  memo: string;            // ユーザーメモ
  takenAt: Date;           // 撮影日時（自動記録）
  cropInfo?: CropInfo;     // サムネイル用クロップ情報
  favorite?: boolean;      // お気に入りフラグ（有料機能）
  location?: {             // 位置情報（将来的な機能、現在は未使用）
    latitude: number;
    longitude: number;
  };
  createdAt: Date;         // 作成日時
  updatedAt: Date;         // 更新日時
}

/**
 * 写真データ（IndexedDB保存用）
 * Date型はIndexedDBで直接保存できないため、ISO文字列として保存
 * 画像はBlobとして別途保存し、参照IDを使用
 */
export interface PhotoDB {
  id: string;
  prefectureId: string;
  imageBlobId: string;     // IndexedDB内のBlob参照ID
  thumbnailBlobId: string; // サムネイルBlob参照ID
  memo: string;
  takenAt: string;         // ISO string
  cropInfo?: {             // サムネイル用クロップ情報
    x: number;
    y: number;
    size?: number;         // 後方互換性のため
    width?: number;
    height?: number;
  };
  favorite?: boolean;      // お気に入りフラグ（有料機能）
  location?: {
    latitude: number;
    longitude: number;
  };
  createdAt: string;       // ISO string
  updatedAt: string;       // ISO string
}

/**
 * クロップ情報（サムネイル用）
 */
export interface CropInfo {
  x: number;      // クロップ開始位置 X（元画像の幅に対する比率 0-1）
  y: number;      // クロップ開始位置 Y（元画像の高さに対する比率 0-1）
  width: number;  // クロップ幅（元画像の幅に対する比率 0-1）
  height: number; // クロップ高さ（元画像の高さに対する比率 0-1）
}

/**
 * 写真作成用の入力データ
 */
export interface PhotoInput {
  prefectureId: string;
  imageFile: File;
  memo?: string;
  takenAt?: Date;          // 指定がない場合は現在時刻
  cropInfo?: CropInfo;     // サムネイル用クロップ情報（任意）
}

