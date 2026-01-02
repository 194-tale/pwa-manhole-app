import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, updateSettings } from '../services/db/settingsDB';
import { getTotalStorageSize, getStorageQuota, formatBytes } from '../utils/storageSize';
import { downloadExportData, importFromFile } from '../services/export/exportData';
import { activatePremiumFeatures, deactivatePremiumFeatures, isPremiumEnabled } from '../services/license/licenseService';
import type { Settings, CompressionQuality } from '../types/settings';
import styles from './Settings.module.css';

function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [totalSize, setTotalSize] = useState<number>(0);
  const [storageQuota, setStorageQuota] = useState<{ usage: number; quota: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivatingLicense, setIsActivatingLicense] = useState(false);
  const [isDeactivatingLicense, setIsDeactivatingLicense] = useState(false);
  const [premiumEnabled, setPremiumEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 設定と容量情報を読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedSettings, size, quota, premiumStatus] = await Promise.all([
          getSettings(),
          getTotalStorageSize(),
          getStorageQuota(),
          isPremiumEnabled(),
        ]);
        setSettings(loadedSettings);
        setTotalSize(size);
        setStorageQuota(quota);
        setPremiumEnabled(premiumStatus);
        if (loadedSettings.premiumFeatures?.licenseKey) {
          setLicenseKey(loadedSettings.premiumFeatures.licenseKey);
        }
      } catch (err) {
        console.error('設定の読み込みエラー:', err);
        setError('設定の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 容量情報を更新
  const refreshStorageInfo = async () => {
    try {
      const [size, quota] = await Promise.all([
        getTotalStorageSize(),
        getStorageQuota(),
      ]);
      setTotalSize(size);
      setStorageQuota(quota);
    } catch (err) {
      console.error('容量情報の更新エラー:', err);
    }
  };

  // 圧縮品質を変更
  const handleQualityChange = async (quality: CompressionQuality) => {
    if (!settings) return;

    setSaving(true);
    setError(null);

    try {
      const updatedSettings: Settings = {
        ...settings,
        compressionQuality: quality,
      };
      await updateSettings(updatedSettings);
      setSettings(updatedSettings);
    } catch (err) {
      console.error('設定の更新エラー:', err);
      setError('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 使用率を計算
  const getUsageRate = (): number => {
    if (!storageQuota || storageQuota.quota === 0) return 0;
    return (storageQuota.usage / storageQuota.quota) * 100;
  };

  // 警告レベルを判定
  const getWarningLevel = (): 'none' | 'warning' | 'critical' => {
    const usageRate = getUsageRate();
    if (usageRate >= 90) return 'critical';
    if (usageRate >= 80) return 'warning';
    return 'none';
  };

  // 圧縮品質の説明を取得
  const getQualityDescription = (quality: CompressionQuality): string => {
    switch (quality) {
      case 'high':
        return '高品質（約2MB/枚）\n画質優先で保存します';
      case 'standard':
        return '標準（約1.5MB/枚）\nバランスの取れた設定です';
      case 'low':
        return '低容量（約500KB/枚）\n容量を節約します';
      default:
        return '';
    }
  };

  // データをエクスポート
  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      await downloadExportData();
    } catch (err) {
      console.error('エクスポートエラー:', err);
      setError(err instanceof Error ? err.message : 'データのエクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  };

  // データをインポート
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイル形式の確認
    if (!file.name.endsWith('.json')) {
      setError('JSONファイルを選択してください');
      return;
    }

    const confirmed = window.confirm(
      'データをインポートしますか？\n' +
      '現在のデータはすべて上書きされます。\n' +
      'この操作は取り消せません。'
    );
    if (!confirmed) {
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setImporting(true);
    setError(null);

    try {
      await importFromFile(file);
      // 成功メッセージ
      alert('データのインポートが完了しました。\nページを再読み込みします。');
      window.location.reload();
    } catch (err) {
      console.error('インポートエラー:', err);
      setError(err instanceof Error ? err.message : 'データのインポートに失敗しました');
    } finally {
      setImporting(false);
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ライセンスキーを有効化
  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      setError('ライセンスキーを入力してください');
      return;
    }

    setIsActivatingLicense(true);
    setError(null);

    try {
      await activatePremiumFeatures(licenseKey);
      const updatedSettings = await getSettings();
      setSettings(updatedSettings);
      setPremiumEnabled(true);
      alert('有料機能が有効化されました！');
    } catch (err) {
      console.error('ライセンス有効化エラー:', err);
      setError(err instanceof Error ? err.message : 'ライセンスキーの有効化に失敗しました');
    } finally {
      setIsActivatingLicense(false);
    }
  };

  // 有料機能を無効化
  const handleDeactivateLicense = async () => {
    const confirmed = window.confirm(
      '有料機能を無効化しますか？\n' +
      '無効化すると、有料機能が使用できなくなります。'
    );
    if (!confirmed) return;

    setIsDeactivatingLicense(true);
    setError(null);

    try {
      await deactivatePremiumFeatures();
      const updatedSettings = await getSettings();
      setSettings(updatedSettings);
      setPremiumEnabled(false);
      setLicenseKey('');
      alert('有料機能が無効化されました');
    } catch (err) {
      console.error('ライセンス無効化エラー:', err);
      setError(err instanceof Error ? err.message : 'ライセンスキーの無効化に失敗しました');
    } finally {
      setIsDeactivatingLicense(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>読み込み中...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>設定の読み込みに失敗しました</p>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            ← 戻る
          </button>
        </div>
      </div>
    );
  }

  const warningLevel = getWarningLevel();
  const usageRate = getUsageRate();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* ヘッダー */}
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            ← 戻る
          </button>
          <h1 className={styles.title}>設定</h1>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* ストレージ容量セクション */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>ストレージ容量</h2>
          
          <div className={styles.storageInfo}>
            <div className={styles.storageRow}>
              <span className={styles.storageLabel}>アプリ使用量:</span>
              <span className={styles.storageValue}>{formatBytes(totalSize)}</span>
            </div>
            
            {storageQuota && storageQuota.quota > 0 && (
              <>
                <div className={styles.storageRow}>
                  <span className={styles.storageLabel}>ブラウザ使用量:</span>
                  <span className={styles.storageValue}>
                    {formatBytes(storageQuota.usage)} / {formatBytes(storageQuota.quota)}
                  </span>
                </div>
                
                <div className={styles.progressContainer}>
                  <div className={styles.progressBar}>
                    <div
                      className={`${styles.progressFill} ${
                        warningLevel === 'critical' ? styles.progressCritical :
                        warningLevel === 'warning' ? styles.progressWarning :
                        styles.progressNormal
                      }`}
                      style={{ width: `${Math.min(usageRate, 100)}%` }}
                    />
                  </div>
                  <span className={styles.progressText}>
                    {usageRate.toFixed(1)}% 使用中
                  </span>
                </div>

                {warningLevel !== 'none' && (
                  <div className={`${styles.warning} ${
                    warningLevel === 'critical' ? styles.warningCritical : styles.warningWarning
                  }`}>
                    {warningLevel === 'critical' ? (
                      <p>⚠️ ストレージ容量が不足しています。不要な写真を削除してください。</p>
                    ) : (
                      <p>⚠️ ストレージ使用率が高いです。容量を確認してください。</p>
                    )}
                  </div>
                )}
              </>
            )}

            <button
              className={styles.refreshButton}
              onClick={refreshStorageInfo}
              disabled={saving}
            >
              🔄 容量情報を更新
            </button>
          </div>
        </section>

        {/* 画像圧縮品質セクション */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>画像圧縮品質</h2>
          <p className={styles.sectionDescription}>
            新しい写真を保存する際の圧縮品質を選択できます。
            <br />
            低容量を選択すると、同じ容量でより多くの写真を保存できます。
          </p>

          <div className={styles.qualityOptions}>
            {(['high', 'standard', 'low'] as CompressionQuality[]).map((quality) => (
              <label
                key={quality}
                className={`${styles.qualityOption} ${
                  settings.compressionQuality === quality ? styles.qualityOptionActive : ''
                }`}
              >
                <input
                  type="radio"
                  name="compressionQuality"
                  value={quality}
                  checked={settings.compressionQuality === quality}
                  onChange={() => handleQualityChange(quality)}
                  disabled={saving}
                />
                <div className={styles.qualityOptionContent}>
                  <div className={styles.qualityOptionHeader}>
                    <span className={styles.qualityOptionName}>
                      {quality === 'high' && '高品質'}
                      {quality === 'standard' && '標準'}
                      {quality === 'low' && '低容量'}
                    </span>
                    {settings.compressionQuality === quality && (
                      <span className={styles.qualityOptionCurrent}>現在の設定</span>
                    )}
                  </div>
                  <p className={styles.qualityOptionDescription}>
                    {getQualityDescription(quality)}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {saving && (
            <p className={styles.savingMessage}>保存中...</p>
          )}
        </section>

        {/* 有料機能セクション */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>有料機能</h2>
          <p className={styles.sectionDescription}>
            {premiumEnabled ? (
              <>
                ✅ <strong>有料機能が有効化されています</strong>
                <br />
                都道府県達成率表示、全国進捗マップ、検索機能などが利用できます。
              </>
            ) : (
              <>
                ライセンスキーを入力して有料機能を有効化できます。
                <br />
                友人用のフレンドコードも使用できます。
              </>
            )}
          </p>

          {premiumEnabled ? (
            <div className={styles.licenseStatus}>
              <div className={styles.licenseInfo}>
                <p>
                  <strong>ステータス:</strong> 有効
                  {settings.premiumFeatures?.purchasedAt && (
                    <>
                      <br />
                      <strong>有効化日:</strong>{' '}
                      {new Date(settings.premiumFeatures.purchasedAt).toLocaleDateString('ja-JP')}
                    </>
                  )}
                  {settings.premiumFeatures?.licenseKey && (
                    <>
                      <br />
                      <strong>ライセンスキー:</strong> {settings.premiumFeatures.licenseKey}
                    </>
                  )}
                </p>
              </div>
              <button
                className={styles.deactivateButton}
                onClick={handleDeactivateLicense}
                disabled={isDeactivatingLicense}
              >
                {isDeactivatingLicense ? '無効化中...' : '有料機能を無効化'}
              </button>
            </div>
          ) : (
            <div className={styles.licenseInput}>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="ライセンスキーまたはフレンドコードを入力"
                className={styles.licenseInputField}
                disabled={isActivatingLicense}
              />
              <button
                className={styles.activateButton}
                onClick={handleActivateLicense}
                disabled={isActivatingLicense || !licenseKey.trim()}
              >
                {isActivatingLicense ? '有効化中...' : '有料機能を有効化'}
              </button>
            </div>
          )}
        </section>

        {/* データ管理セクション */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>データ管理</h2>
          <p className={styles.sectionDescription}>
            データをエクスポートして別の端末に移行したり、バックアップとして保存できます。
            <br />
            <strong>【スマートフォンでの使い方】</strong>
            <br />
            • エクスポート: ボタンを押すと、クラウドストレージ（Google Drive、iCloud等）に保存するか、メールで送信できます。
            <br />
            • インポート: ボタンを押して、クラウドストレージやダウンロードフォルダからバックアップファイルを選択してください。
            <br />
            <strong>⚠️ インポート時は、既存のデータがすべて上書きされます。</strong>
          </p>

          <div className={styles.dataManagement}>
            <button
              className={styles.exportButton}
              onClick={handleExport}
              disabled={exporting || importing}
            >
              {exporting ? 'エクスポート中...' : '📥 データをエクスポート'}
            </button>

            <div className={styles.importContainer}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={importing || exporting}
                style={{ display: 'none' }}
              />
              <button
                className={styles.importButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={importing || exporting}
              >
                {importing ? 'インポート中...' : '📤 データをインポート'}
              </button>
            </div>
          </div>
        </section>

        {/* アプリ情報セクション */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>アプリ情報</h2>
          <div className={styles.appInfo}>
            <div className={styles.appInfoRow}>
              <span className={styles.appInfoLabel}>バージョン:</span>
              <span className={styles.appInfoValue}>{settings.version}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SettingsPage;

