/**
 * ライセンス管理サービス
 * フレンドコードと通常のライセンスキーの検証を行う
 */

import { getSettings, updateSettings } from '../db/settingsDB';
import type { Settings } from '../../types/settings';

/**
 * フレンドコード（友人用、無料で有効化）
 * 必要に応じて追加・変更可能
 */
const FRIEND_CODES = [
  'FRIEND2024',
  'SPECIAL_FRIEND',
  // ここに追加のフレンドコードを追加できます
];

/**
 * ライセンスキーを検証
 * @param licenseKey ユーザーが入力したライセンスキー
 * @returns 検証結果とメッセージ
 */
export async function validateLicenseKey(licenseKey: string): Promise<{
  valid: boolean;
  isFriendCode: boolean;
  message: string;
}> {
  const trimmedKey = licenseKey.trim().toUpperCase();

  // フレンドコードのチェック
  if (FRIEND_CODES.includes(trimmedKey)) {
    return {
      valid: true,
      isFriendCode: true,
      message: 'フレンドコードが認証されました。有料機能が有効化されます。',
    };
  }

  // 通常のライセンスキーの検証（将来的にAPI連携する場合）
  // 現在は、固定のライセンスキーフォーマットをチェック
  // 例: "MANHOLE-XXXX-XXXX-XXXX" 形式
  
  // 簡単な検証例（実際の実装では、ライセンスサーバーと連携）
  if (trimmedKey.startsWith('MANHOLE-') && trimmedKey.length === 21) {
    // ここで実際のライセンス検証APIを呼び出す
    // const isValid = await callLicenseVerificationAPI(trimmedKey);
    
    // 現在は、フォーマットが正しければ有効とする（デモ用）
    return {
      valid: true,
      isFriendCode: false,
      message: 'ライセンスキーが認証されました。有料機能が有効化されます。',
    };
  }

  return {
    valid: false,
    isFriendCode: false,
    message: '無効なライセンスキーです。正しいキーを入力してください。',
  };
}

/**
 * 有料機能を有効化
 */
export async function activatePremiumFeatures(licenseKey: string): Promise<void> {
  const validation = await validateLicenseKey(licenseKey);
  
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const settings = await getSettings();
  const now = new Date();
  const trimmedKey = licenseKey.trim().toUpperCase();

  const updatedSettings: Settings = {
    ...settings,
    premiumFeatures: {
      enabled: true,
      purchasedAt: validation.isFriendCode ? undefined : now, // フレンドコードの場合は購入日なし
      licenseKey: trimmedKey, // ライセンスキーを保存（オプション）
    },
    updatedAt: now,
  };

  await updateSettings(updatedSettings);
}

/**
 * 有料機能を無効化
 */
export async function deactivatePremiumFeatures(): Promise<void> {
  const settings = await getSettings();
  const now = new Date();

  const updatedSettings: Settings = {
    ...settings,
    premiumFeatures: undefined, // 有料機能を無効化する場合はundefinedにする
    updatedAt: now,
  };

  await updateSettings(updatedSettings);
}

/**
 * 有料機能が有効かどうかを確認
 */
export async function isPremiumEnabled(): Promise<boolean> {
  const settings = await getSettings();
  return settings.premiumFeatures?.enabled ?? false;
}

