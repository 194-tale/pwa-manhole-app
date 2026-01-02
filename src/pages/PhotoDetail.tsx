import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPhotoById, updatePhoto, deletePhoto } from '../services/db/photoDB';
import { getDatabase } from '../services/db/indexedDB';
import { processImage } from '../services/image/imageProcessor';
import { getSettings } from '../services/db/settingsDB';
import { PREFECTURE_LIST } from '../types/prefecture';
import type { Photo, CropInfo } from '../types/photo';
import type { CompressionQuality } from '../types/settings';
import ImageCropEditor from '../components/ImageCropEditor';
import styles from './PhotoDetail.module.css';

function PhotoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingCrop, setIsEditingCrop] = useState(false);
  const [memo, setMemo] = useState('');
  const [cropInfo, setCropInfo] = useState<CropInfo | undefined>(undefined);
  const [originalImageBlob, setOriginalImageBlob] = useState<Blob | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [compressionQuality, setCompressionQuality] = useState<CompressionQuality>('standard');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingCrop, setIsSavingCrop] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPhoto = async () => {
      if (!id) return;

      try {
        const [photoData, settings] = await Promise.all([
          getPhotoById(id),
          getSettings(),
        ]);
        if (photoData) {
          setPhoto(photoData);
          setMemo(photoData.memo);
          setCropInfo(photoData.cropInfo);
          setCompressionQuality(settings.compressionQuality);
          
          // 元画像のBlobを取得（サムネイル調整用）
          try {
            const db = await getDatabase();
            const photoDB = await db.get('photos', id);
            if (photoDB) {
              const imageBlob = await db.get('images', photoDB.imageBlobId);
              if (imageBlob instanceof Blob) {
                setOriginalImageBlob(imageBlob);
                // 元画像BlobからURLを生成
                const url = URL.createObjectURL(imageBlob);
                setOriginalImageUrl(url);
              }
            }
          } catch (blobError) {
            console.error('元画像の取得エラー:', blobError);
            // 元画像が取得できない場合は、imageUrlからBlobを取得を試みる
            try {
              const response = await fetch(photoData.imageUrl);
              if (response.ok) {
                const blob = await response.blob();
                setOriginalImageBlob(blob);
                const url = URL.createObjectURL(blob);
                setOriginalImageUrl(url);
              }
            } catch (fetchError) {
              console.error('画像URLからの取得エラー:', fetchError);
            }
          }
        } else {
          setError('写真が見つかりません');
        }
      } catch (err) {
        console.error('写真の読み込みエラー:', err);
        setError('写真の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadPhoto();
  }, [id]);

  // originalImageUrlのクリーンアップ（コンポーネントアンマウント時のみ）
  // 編集モードを終了してもoriginalImageUrlは保持（次回編集時に再利用可能）
  useEffect(() => {
    return () => {
      // コンポーネントがアンマウントされる時のみクリーンアップ
      if (originalImageUrl && originalImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(originalImageUrl);
      }
    };
  }, [originalImageUrl]);

  // メモを保存
  const handleSaveMemo = async () => {
    if (!photo) return;

    setIsSaving(true);
    setError(null);

    try {
      const updatedPhoto: Photo = {
        ...photo,
        memo: memo.trim(),
      };
      await updatePhoto(updatedPhoto);
      setPhoto(updatedPhoto);
      setIsEditing(false);
    } catch (err) {
      console.error('メモの保存エラー:', err);
      setError(err instanceof Error ? err.message : 'メモの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };


  // サムネイル調整を開始
  const handleStartCropEdit = async () => {
    if (!photo) return;
    
    // originalImageBlobがまだない場合は取得
    if (!originalImageBlob) {
      try {
        const db = await getDatabase();
        const photoDB = await db.get('photos', photo.id);
        if (photoDB) {
          const imageBlob = await db.get('images', photoDB.imageBlobId);
          if (imageBlob instanceof Blob) {
            setOriginalImageBlob(imageBlob);
            const url = URL.createObjectURL(imageBlob);
            setOriginalImageUrl(url);
          }
        }
      } catch (blobError) {
        console.error('元画像の取得エラー:', blobError);
        // フォールバック: imageUrlから取得
        try {
          const response = await fetch(photo.imageUrl);
          if (response.ok) {
            const blob = await response.blob();
            setOriginalImageBlob(blob);
            const url = URL.createObjectURL(blob);
            setOriginalImageUrl(url);
          }
        } catch (fetchError) {
          console.error('画像URLからの取得エラー:', fetchError);
          setError('元画像の取得に失敗しました');
          return;
        }
      }
    }
    
    // 既存のクロップ情報がある場合はそれを使用、ない場合は中央クロップをデフォルトに
    if (!cropInfo) {
      if (photo.cropInfo) {
        // 既存のCropInfo（size形式）からの移行対応
        const existing = photo.cropInfo as any;
        if ('size' in existing) {
          setCropInfo({
            x: existing.x,
            y: existing.y,
            width: existing.size,
            height: existing.size,
          });
        } else {
          setCropInfo(photo.cropInfo);
        }
      } else {
        setCropInfo({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
      }
    }
    setIsEditingCrop(true);
  };

  // サムネイル調整を保存
  const handleSaveCrop = async () => {
    if (!photo || !originalImageBlob || !cropInfo) return;

    setIsSavingCrop(true);
    setError(null);

    try {
      // 元画像BlobからFileオブジェクトを作成
      const file = new File([originalImageBlob], 'image.jpg', { type: 'image/jpeg' });
      
      // 新しいクロップ情報でサムネイルを再生成
      const { thumbnailBlob } = await processImage(file, cropInfo, compressionQuality);

      // 新しいサムネイルBlobをIndexedDBに保存
      const db = await getDatabase();
      const photoDB = await db.get('photos', photo.id);
      if (!photoDB) {
        throw new Error('写真データが見つかりません');
      }

      // 古いサムネイルBlobを削除
      await db.delete('images', photoDB.thumbnailBlobId);

      // 新しいサムネイルBlobを保存
      const newThumbnailBlobId = crypto.randomUUID();
      await db.put('images', thumbnailBlob, newThumbnailBlobId);

      // 写真データを更新
      photoDB.thumbnailBlobId = newThumbnailBlobId;
      photoDB.cropInfo = cropInfo;
      photoDB.updatedAt = new Date().toISOString();
      await db.put('photos', photoDB);

      // 写真データを再読み込み
      const updatedPhoto = await getPhotoById(photo.id);
      if (updatedPhoto) {
        setPhoto(updatedPhoto);
        setIsEditingCrop(false);
      }
    } catch (err) {
      console.error('サムネイルの保存エラー:', err);
      setError(err instanceof Error ? err.message : 'サムネイルの保存に失敗しました');
    } finally {
      setIsSavingCrop(false);
    }
  };

  // 写真を削除
  const handleDelete = async () => {
    if (!photo) return;

    const confirmed = window.confirm(
      'この写真を削除しますか？\nこの操作は取り消せません。'
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deletePhoto(photo.id);
      // 都道府県詳細ページに戻る
      navigate(`/prefecture/${photo.prefectureId}`);
    } catch (err) {
      console.error('写真の削除エラー:', err);
      setError(err instanceof Error ? err.message : '写真の削除に失敗しました');
      setIsDeleting(false);
    }
  };

  // 日付をフォーマット
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // 都道府県名を取得
  const getPrefectureName = () => {
    if (!photo) return '';
    const pref = PREFECTURE_LIST.find(p => p.id === photo.prefectureId);
    return pref?.name || '';
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error && !photo) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button
            className={styles.backButton}
            onClick={() => navigate(-1)}
          >
            ← 戻る
          </button>
        </div>
      </div>
    );
  }

  if (!photo) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>写真が見つかりません</p>
          <button
            className={styles.backButton}
            onClick={() => navigate(-1)}
          >
            ← 戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* ヘッダー */}
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => navigate(-1)}
          >
            ← 戻る
          </button>
          <div className={styles.headerInfo}>
            <h1 className={styles.prefectureName}>{getPrefectureName()}</h1>
            <p className={styles.date}>
              {formatDate(photo.takenAt)}
            </p>
          </div>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* 写真表示またはクロップエディタ */}
        {isEditingCrop && originalImageUrl ? (
          <div className={styles.cropSection}>
            <div className={styles.cropHeader}>
              <h2 className={styles.sectionTitle}>サムネイル範囲を調整</h2>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setIsEditingCrop(false);
                  // 元のクロップ情報に戻す
                  setCropInfo(photo.cropInfo);
                }}
                disabled={isSavingCrop}
              >
                キャンセル
              </button>
            </div>
            <ImageCropEditor
              imageUrl={originalImageUrl}
              onCropChange={setCropInfo}
              initialCrop={cropInfo || photo.cropInfo || { x: 0.25, y: 0.25, width: 0.5, height: 0.5 }}
              large={true}
            />
            <div className={styles.cropActions}>
              <button
                className={styles.saveButton}
                onClick={handleSaveCrop}
                disabled={isSavingCrop}
              >
                {isSavingCrop ? '保存中...' : '✓ サムネイルを保存'}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.imageContainer}>
            <img
              src={photo.imageUrl}
              alt={photo.memo || '写真'}
              className={styles.image}
            />
          </div>
        )}

        {/* サムネイル調整ボタン */}
        {!isEditingCrop && (
          <div className={styles.cropButtonSection}>
            <button
              className={styles.cropEditButton}
              onClick={handleStartCropEdit}
              disabled={!originalImageBlob}
            >
              ✂️ サムネイル範囲を調整
            </button>
          </div>
        )}

        {/* メモセクション */}
        <div className={styles.memoSection}>
          <div className={styles.memoHeader}>
            <h2 className={styles.sectionTitle}>メモ</h2>
            {!isEditing && (
              <button
                className={styles.editButton}
                onClick={() => setIsEditing(true)}
              >
                編集
              </button>
            )}
          </div>

          {isEditing ? (
            <div className={styles.memoEdit}>
              <textarea
                className={styles.memoTextarea}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="撮影場所やマンホールの特徴などをメモできます"
                rows={4}
                disabled={isSaving}
              />
              <div className={styles.memoActions}>
                <button
                  className={styles.cancelButton}
                  onClick={() => {
                    setMemo(photo.memo);
                    setIsEditing(false);
                    setError(null);
                  }}
                  disabled={isSaving}
                >
                  キャンセル
                </button>
                <button
                  className={styles.saveButton}
                  onClick={handleSaveMemo}
                  disabled={isSaving}
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.memoDisplay}>
              {photo.memo ? (
                <p className={styles.memoText}>{photo.memo}</p>
              ) : (
                <p className={styles.memoPlaceholder}>
                  メモがありません（編集ボタンから追加できます）
                </p>
              )}
            </div>
          )}
        </div>

        {/* 削除ボタン */}
        <div className={styles.deleteSection}>
          <button
            className={styles.deleteButton}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? '削除中...' : '🗑️ この写真を削除'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PhotoDetail;
