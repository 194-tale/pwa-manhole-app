/**
 * 都道府県の型定義
 */
export interface Prefecture {
  id: string;              // "01" (都道府県コード)
  name: string;            // "北海道"
  photoCount: number;      // 写真数（集計値、インデックス用）
  lastPhotoDate?: Date;    // 最後に撮影した日（最新の写真の撮影日）
  totalManholes?: number;  // 全マンホール数（有料機能、任意入力）
  manholesUpdatedAt?: Date; // 全マンホール数の更新日時（有料機能）
  createdAt: Date;         // 都道府県データ作成日
  updatedAt: Date;         // 最終更新日
}

/**
 * 都道府県データ（IndexedDB保存用）
 * Date型はIndexedDBで直接保存できないため、ISO文字列として保存
 */
export interface PrefectureDB {
  id: string;
  name: string;
  photoCount: number;
  lastPhotoDate?: string;  // ISO string
  totalManholes?: number;  // 全マンホール数（有料機能）
  manholesUpdatedAt?: string; // ISO string（有料機能）
  createdAt: string;       // ISO string
  updatedAt: string;       // ISO string
}

/**
 * 都道府県コードと名前のマッピング
 */
export const PREFECTURE_LIST: Array<{ id: string; name: string }> = [
  { id: '01', name: '北海道' },
  { id: '02', name: '青森県' },
  { id: '03', name: '岩手県' },
  { id: '04', name: '宮城県' },
  { id: '05', name: '秋田県' },
  { id: '06', name: '山形県' },
  { id: '07', name: '福島県' },
  { id: '08', name: '茨城県' },
  { id: '09', name: '栃木県' },
  { id: '10', name: '群馬県' },
  { id: '11', name: '埼玉県' },
  { id: '12', name: '千葉県' },
  { id: '13', name: '東京都' },
  { id: '14', name: '神奈川県' },
  { id: '15', name: '新潟県' },
  { id: '16', name: '富山県' },
  { id: '17', name: '石川県' },
  { id: '18', name: '福井県' },
  { id: '19', name: '山梨県' },
  { id: '20', name: '長野県' },
  { id: '21', name: '岐阜県' },
  { id: '22', name: '静岡県' },
  { id: '23', name: '愛知県' },
  { id: '24', name: '三重県' },
  { id: '25', name: '滋賀県' },
  { id: '26', name: '京都府' },
  { id: '27', name: '大阪府' },
  { id: '28', name: '兵庫県' },
  { id: '29', name: '奈良県' },
  { id: '30', name: '和歌山県' },
  { id: '31', name: '鳥取県' },
  { id: '32', name: '島根県' },
  { id: '33', name: '岡山県' },
  { id: '34', name: '広島県' },
  { id: '35', name: '山口県' },
  { id: '36', name: '徳島県' },
  { id: '37', name: '香川県' },
  { id: '38', name: '愛媛県' },
  { id: '39', name: '高知県' },
  { id: '40', name: '福岡県' },
  { id: '41', name: '佐賀県' },
  { id: '42', name: '長崎県' },
  { id: '43', name: '熊本県' },
  { id: '44', name: '大分県' },
  { id: '45', name: '宮崎県' },
  { id: '46', name: '鹿児島県' },
  { id: '47', name: '沖縄県' },
];

/**
 * 地方別グループ分け
 */
export interface RegionGroup {
  name: string;
  prefectures: Array<{ id: string; name: string }>;
}

export const REGION_GROUPS: RegionGroup[] = [
  {
    name: '北海道・東北',
    prefectures: [
      { id: '01', name: '北海道' },
      { id: '02', name: '青森県' },
      { id: '03', name: '岩手県' },
      { id: '04', name: '宮城県' },
      { id: '05', name: '秋田県' },
      { id: '06', name: '山形県' },
      { id: '07', name: '福島県' },
    ],
  },
  {
    name: '関東',
    prefectures: [
      { id: '08', name: '茨城県' },
      { id: '09', name: '栃木県' },
      { id: '10', name: '群馬県' },
      { id: '11', name: '埼玉県' },
      { id: '12', name: '千葉県' },
      { id: '13', name: '東京都' },
      { id: '14', name: '神奈川県' },
    ],
  },
  {
    name: '中部',
    prefectures: [
      { id: '15', name: '新潟県' },
      { id: '16', name: '富山県' },
      { id: '17', name: '石川県' },
      { id: '18', name: '福井県' },
      { id: '19', name: '山梨県' },
      { id: '20', name: '長野県' },
      { id: '21', name: '岐阜県' },
      { id: '22', name: '静岡県' },
      { id: '23', name: '愛知県' },
    ],
  },
  {
    name: '近畿',
    prefectures: [
      { id: '24', name: '三重県' },
      { id: '25', name: '滋賀県' },
      { id: '26', name: '京都府' },
      { id: '27', name: '大阪府' },
      { id: '28', name: '兵庫県' },
      { id: '29', name: '奈良県' },
      { id: '30', name: '和歌山県' },
    ],
  },
  {
    name: '中国・四国',
    prefectures: [
      { id: '31', name: '鳥取県' },
      { id: '32', name: '島根県' },
      { id: '33', name: '岡山県' },
      { id: '34', name: '広島県' },
      { id: '35', name: '山口県' },
      { id: '36', name: '徳島県' },
      { id: '37', name: '香川県' },
      { id: '38', name: '愛媛県' },
      { id: '39', name: '高知県' },
    ],
  },
  {
    name: '九州・沖縄',
    prefectures: [
      { id: '40', name: '福岡県' },
      { id: '41', name: '佐賀県' },
      { id: '42', name: '長崎県' },
      { id: '43', name: '熊本県' },
      { id: '44', name: '大分県' },
      { id: '45', name: '宮崎県' },
      { id: '46', name: '鹿児島県' },
      { id: '47', name: '沖縄県' },
    ],
  },
];

