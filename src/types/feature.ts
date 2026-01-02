/**
 * 機能フラグの型定義
 * 無料版/有料版の機能切り分けに使用
 */
export interface FeatureFlags {
  // 都道府県達成率表示
  enablePrefectureProgress: boolean;
  // 全国マップ表示
  enableNationalMap: boolean;
  // 検索機能
  enableSearch: boolean;
  // 並び替え機能
  enableSort: boolean;
  // お気に入り機能
  enableFavorite: boolean;
  // データバックアップ
  enableBackup: boolean;
  // データインポート
  enableImport: boolean;
  // 統計情報表示
  enableStatistics: boolean;
}

/**
 * 機能フラグのデフォルト値（無料版）
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enablePrefectureProgress: false,
  enableNationalMap: false,
  enableSearch: false,
  enableSort: false,
  enableFavorite: false,
  enableBackup: false,
  enableImport: false,
  enableStatistics: false,
};

