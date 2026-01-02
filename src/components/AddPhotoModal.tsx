import { useState, useRef, useEffect } from 'react';
import { processImage } from '../services/image/imageProcessor';
import { createPhoto } from '../services/db/photoDB';
import { extractPhotoDate } from '../utils/exifDateExtractor';
import { getSettings } from '../services/db/settingsDB';
import type { PhotoInput, CropInfo } from '../types/photo';
import type { CompressionQuality } from '../types/settings';
import ImageCropEditor from './ImageCropEditor';
import styles from './AddPhotoModal.module.css';

interface AddPhotoModalProps {
  prefectureId: string;
  prefectureName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddPhotoModal({
  prefectureId,
  prefectureName,
  isOpen,
  onClose,
  onSuccess,
}: AddPhotoModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [cropInfo, setCropInfo] = useState<CropInfo>({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
  const [showCropEditor, setShowCropEditor] = useState(false);
  const [compressionQuality, setCompressionQuality] = useState<CompressionQuality>('standard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // 設定から圧縮品質を読み込み
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        setCompressionQuality(settings.compressionQuality);
      } catch (err) {
        console.error('設定の読み込みエラー:', err);
      }
    };
    loadSettings();
  }, []);

  // ファイル選択時の処理
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 画像ファイルかチェック
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // プレビュー用URLを生成
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // inputの値をリセット（同じファイルを再度選択できるように）
    if (event.target) {
      event.target.value = '';
    }
  };

  // カメラから撮影
  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  // ギャラリーから選択
  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  // モーダルを閉じる
  const handleClose = () => {
    if (isProcessing) return;
    
    // 状態をリセット
    setSelectedFile(null);
    setPreviewUrl(null);
    setMemo('');
    setCropInfo({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
    setShowCropEditor(false);
    setError(null);
    
    // プレビューURLを解放
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    onClose();
  };

  // 写真を保存
  const handleSave = async () => {
    if (!selectedFile) {
      setError('画像を選択してください');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // 画像処理（圧縮・サムネイル生成）と撮影日時の取得を並行処理
      const [processedImages, takenAt] = await Promise.all([
        processImage(selectedFile, cropInfo, compressionQuality),
        extractPhotoDate(selectedFile),
      ]);

      const { imageBlob, thumbnailBlob } = processedImages;

      // 写真データを作成
      const photoInput: PhotoInput = {
        prefectureId,
        imageFile: selectedFile,
        memo: memo.trim(),
        takenAt, // EXIF情報から取得した撮影日時
        cropInfo, // クロップ情報
      };

      // IndexedDBに保存
      await createPhoto(photoInput, imageBlob, thumbnailBlob);

      // 成功
      handleClose();
      onSuccess();
    } catch (err) {
      console.error('写真の保存エラー:', err);
      setError(
        err instanceof Error
          ? err.message
          : '写真の保存に失敗しました'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {prefectureName}の写真を追加
          </h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isProcessing}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          {/* ファイル選択 */}
          {!selectedFile ? (
            <div className={styles.fileSelection}>
              {/* カメラ用のinput（capture属性あり） */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              {/* ギャラリー用のinput（capture属性なし） */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                className={styles.actionButton}
                onClick={handleCameraClick}
              >
                📷 カメラで撮影
              </button>
              <button
                className={styles.actionButton}
                onClick={handleGalleryClick}
              >
                🖼️ ギャラリーから選択
              </button>
            </div>
          ) : (
            <>
              {/* プレビューまたはクロップエディタ */}
              {previewUrl && (
                <div className={styles.preview}>
                  {showCropEditor ? (
                    <ImageCropEditor
                      imageUrl={previewUrl}
                      onCropChange={setCropInfo}
                      initialCrop={cropInfo}
                    />
                  ) : (
                    <>
                      <img
                        src={previewUrl}
                        alt="プレビュー"
                        className={styles.previewImage}
                      />
                      <div className={styles.previewActions}>
                        <button
                          className={styles.changeButton}
                          onClick={() => {
                            setSelectedFile(null);
                            if (previewUrl) {
                              URL.revokeObjectURL(previewUrl);
                              setPreviewUrl(null);
                            }
                            setShowCropEditor(false);
                            galleryInputRef.current?.click();
                          }}
                          disabled={isProcessing}
                        >
                          画像を変更
                        </button>
                        <button
                          className={styles.cropButton}
                          onClick={() => setShowCropEditor(true)}
                          disabled={isProcessing}
                        >
                          ✂️ サムネイル範囲を調整
                        </button>
                      </div>
                    </>
                  )}
                  {showCropEditor && (
                    <button
                      className={styles.backToPreviewButton}
                      onClick={() => setShowCropEditor(false)}
                      disabled={isProcessing}
                    >
                      ← プレビューに戻る
                    </button>
                  )}
                </div>
              )}

              {/* メモ入力 */}
              <div className={styles.memoSection}>
                <label htmlFor="memo" className={styles.label}>
                  メモ（任意）
                </label>
                <textarea
                  id="memo"
                  className={styles.textarea}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="撮影場所やマンホールの特徴などをメモできます"
                  rows={4}
                  disabled={isProcessing}
                />
              </div>

              {/* アクションボタン */}
              <div className={styles.actions}>
                <button
                  className={styles.cancelButton}
                  onClick={handleClose}
                  disabled={isProcessing}
                >
                  キャンセル
                </button>
                <button
                  className={styles.saveButton}
                  onClick={handleSave}
                  disabled={isProcessing}
                >
                  {isProcessing ? '保存中...' : '保存'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddPhotoModal;

