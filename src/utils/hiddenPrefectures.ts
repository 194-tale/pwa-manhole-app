/**
 * 非表示都道府県の管理
 * localStorageを使用して非表示状態を保存
 */

const STORAGE_KEY = 'hidden-prefectures';

/**
 * 非表示の都道府県IDリストを取得
 */
export function getHiddenPrefectureIds(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as string[];
    }
  } catch (error) {
    console.error('非表示都道府県の読み込みエラー:', error);
  }
  return [];
}

/**
 * 都道府県を非表示にする
 */
export function hidePrefecture(prefectureId: string): void {
  const hidden = getHiddenPrefectureIds();
  if (!hidden.includes(prefectureId)) {
    hidden.push(prefectureId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden));
    } catch (error) {
      console.error('非表示都道府県の保存エラー:', error);
    }
  }
}

/**
 * 都道府県を再表示する
 */
export function showPrefecture(prefectureId: string): void {
  const hidden = getHiddenPrefectureIds();
  const filtered = hidden.filter(id => id !== prefectureId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('非表示都道府県の保存エラー:', error);
  }
}

/**
 * 都道府県が非表示かどうかを判定
 */
export function isPrefectureHidden(prefectureId: string): boolean {
  return getHiddenPrefectureIds().includes(prefectureId);
}

/**
 * 非表示の都道府県をすべて再表示する（リセット）
 */
export function resetHiddenPrefectures(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('非表示都道府県のリセットエラー:', error);
  }
}




