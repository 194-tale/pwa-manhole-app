import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAllPhotos } from '../services/db/photoDB';
import { getAllPrefectures } from '../services/db/prefectureDB';
import { isPremiumEnabled } from '../services/license/licenseService';
import { PREFECTURE_LIST } from '../types/prefecture';
import type { Photo } from '../types/photo';
import type { Prefecture } from '../types/prefecture';
import styles from './Search.module.css';

function Favorites() {
  const navigate = useNavigate();
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [prefecturesMap, setPrefecturesMap] = useState<Map<string, Prefecture>>(new Map());
  const [loading, setLoading] = useState(true);
  const [premiumEnabled, setPremiumEnabled] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [photos, prefectures, premium] = await Promise.all([
          getAllPhotos(),
          getAllPrefectures(),
          isPremiumEnabled(),
        ]);
        
        // お気に入りの写真だけをフィルター
        const favoritePhotos = photos.filter(photo => photo.favorite);
        setAllPhotos(favoritePhotos);
        
        const map = new Map<string, Prefecture>();
        prefectures.forEach(pref => {
          map.set(pref.id, pref);
        });
        setPrefecturesMap(map);
        setPremiumEnabled(premium);

        if (!premium) {
          // 有料機能が無効な場合、トップページにリダイレクト
          navigate('/');
          return;
        }
      } catch (err) {
        console.error('データの読み込みエラー:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  // 都道府県名を取得
  const getPrefectureName = (prefectureId: string): string => {
    const prefecture = prefecturesMap.get(prefectureId);
    return prefecture?.name || PREFECTURE_LIST.find(p => p.id === prefectureId)?.name || '不明';
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>読み込み中...</div>
      </div>
    );
  }

  if (!premiumEnabled) {
    return null; // リダイレクトされるので何も表示しない
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* ヘッダー */}
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            ← 戻る
          </button>
          <h1 className={styles.title}>⭐ お気に入りの写真</h1>
        </div>

        {/* お気に入り写真一覧 */}
        {allPhotos.length > 0 ? (
          <div className={styles.resultsSection}>
            <h2 className={styles.resultsTitle}>
              {allPhotos.length}件のお気に入り
            </h2>
            <div className={styles.photoGrid}>
              {allPhotos.map((photo) => (
                <Link
                  key={photo.id}
                  to={`/photo/${photo.id}`}
                  className={styles.photoCard}
                >
                  <img
                    src={photo.thumbnailUrl || photo.imageUrl}
                    alt={photo.memo || '写真'}
                    className={styles.photoThumbnail}
                  />
                  <div className={styles.photoInfo}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p className={styles.photoPrefecture}>
                        {getPrefectureName(photo.prefectureId)}
                      </p>
                      <span style={{ fontSize: '1.2rem' }}>⭐</span>
                    </div>
                    {photo.memo && (
                      <p className={styles.photoMemo}>{photo.memo}</p>
                    )}
                    {photo.takenAt && (
                      <p className={styles.photoDate}>
                        {new Date(photo.takenAt).toLocaleDateString('ja-JP')}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>⭐ お気に入りの写真がありません</p>
            <p className={styles.emptyStateHint}>
              写真一覧からお気に入りに追加してください
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Favorites;

