import { getDatabase } from './indexedDB';
import type { Settings, SettingsDB } from '../../types/settings';

const SETTINGS_ID = 'app_settings';
const APP_VERSION = '1.0.0';

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
 * SettingsDBをSettingsに変換
 */
function dbToSettings(db: SettingsDB): Settings {
  return {
    ...db,
    compressionQuality: db.compressionQuality || 'standard', // 後方互換性のため
    lastBackupDate: db.lastBackupDate ? isoToDate(db.lastBackupDate) : undefined,
    premiumFeatures: db.premiumFeatures
      ? {
          ...db.premiumFeatures,
          purchasedAt: db.premiumFeatures.purchasedAt
            ? isoToDate(db.premiumFeatures.purchasedAt)
            : undefined,
        }
      : undefined,
    createdAt: isoToDate(db.createdAt),
    updatedAt: isoToDate(db.updatedAt),
  };
}

/**
 * SettingsをSettingsDBに変換
 */
function settingsToDB(settings: Settings): SettingsDB {
  return {
    ...settings,
    lastBackupDate: settings.lastBackupDate
      ? dateToISO(settings.lastBackupDate)
      : undefined,
    premiumFeatures: settings.premiumFeatures
      ? {
          ...settings.premiumFeatures,
          purchasedAt: settings.premiumFeatures.purchasedAt
            ? dateToISO(settings.premiumFeatures.purchasedAt)
            : undefined,
        }
      : undefined,
    createdAt: dateToISO(settings.createdAt),
    updatedAt: dateToISO(settings.updatedAt),
  };
}

/**
 * 設定を取得
 */
export async function getSettings(): Promise<Settings> {
  const db = await getDatabase();
  const settingsDB = await db.get('settings', SETTINGS_ID);
  
  if (settingsDB) {
    return dbToSettings(settingsDB);
  }

  // 初期設定を作成
  const now = new Date();
  const defaultSettings: Settings = {
    id: SETTINGS_ID,
    version: APP_VERSION,
    compressionQuality: 'standard',
    createdAt: now,
    updatedAt: now,
  };

  const defaultSettingsDB = settingsToDB(defaultSettings);
  await db.put('settings', defaultSettingsDB);
  
  return defaultSettings;
}

/**
 * 設定を更新
 */
export async function updateSettings(settings: Settings): Promise<void> {
  const db = await getDatabase();
  const settingsDB = settingsToDB({
    ...settings,
    updatedAt: new Date(),
  });
  await db.put('settings', settingsDB);
}

/**
 * バージョンを更新
 */
export async function updateVersion(version: string): Promise<void> {
  const settings = await getSettings();
  settings.version = version;
  await updateSettings(settings);
}

