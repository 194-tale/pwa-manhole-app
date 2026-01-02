import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAllPhotos } from '../services/db/photoDB';
import { getAllPrefectures } from '../services/db/prefectureDB';
import { isPremiumEnabled } from '../services/license/licenseService';
import { PREFECTURE_LIST } from '../types/prefecture';
import type { Photo } from '../types/photo';
import type { Prefecture } from '../types/prefecture';
import styles from './Search.module.css';

function Search() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Photo[]>([]);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [prefecturesMap, setPrefecturesMap] = useState<Map<string, Prefecture>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [premiumEnabled, setPremiumEnabled] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [photos, prefectures, premium] = await Promise.all([
          getAllPhotos(),
          getAllPrefectures(),
          isPremiumEnabled(),
        ]);
        
        setAllPhotos(photos);
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

  // 検索実行
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const query = searchQuery.trim().toLowerCase();

    const results = allPhotos.filter(photo => {
      // お気に入りフィルター
      if (showFavoritesOnly && !photo.favorite) {
        return false;
      }

      // メモで検索
      const memoMatch = photo.memo.toLowerCase().includes(query);
      
      // 都道府県名で検索
      const prefecture = prefecturesMap.get(photo.prefectureId);
      const prefectureName = prefecture?.name || '';
      const prefectureMatch = prefectureName.toLowerCase().includes(query);

      return memoMatch || prefectureMatch;
    });

    setSearchResults(results);
    setIsSearching(false);
  }, [allPhotos, prefecturesMap, searchQuery, showFavoritesOnly]);

  // お気に入りフィルター変更時に検索を再実行
  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    }
  }, [showFavoritesOnly, searchQuery, handleSearch]);

  // Enterキーで検索
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

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
          <h1 className={styles.title}>🔍 写真を検索</h1>
        </div>

        {/* 検索フォーム */}
        <div className={styles.searchForm}>
          <div className={styles.searchInputContainer}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="メモや都道府県名で検索..."
              className={styles.searchInput}
              autoFocus
            />
            <button
              onClick={handleSearch}
              className={styles.searchButton}
              disabled={isSearching}
            >
              {isSearching ? '検索中...' : '🔍 検索'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {premiumEnabled && (
              <button
                onClick={() => {
                  setShowFavoritesOnly(!showFavoritesOnly);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: showFavoritesOnly 
                    ? 'rgba(255, 193, 7, 0.2)' 
                    : 'rgba(0, 0, 0, 0.05)',
                  border: `1px solid ${showFavoritesOnly ? 'rgba(255, 193, 7, 0.5)' : 'rgba(0, 0, 0, 0.1)'}`,
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  color: showFavoritesOnly ? '#d97706' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: showFavoritesOnly ? 'bold' : 'normal',
                  transition: 'all 0.2s',
                }}
              >
                {showFavoritesOnly ? '⭐ お気に入りのみ' : '☆ すべて表示'}
              </button>
            )}
            {searchQuery.trim() && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className={styles.clearButton}
              >
                ✕ クリア
              </button>
            )}
          </div>
        </div>

        {/* 検索結果 */}
        {searchResults.length > 0 && (
          <div className={styles.resultsSection}>
            <h2 className={styles.resultsTitle}>
              検索結果: {searchResults.length}件
            </h2>
            <div className={styles.photoGrid}>
              {searchResults.map((photo) => (
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
                      {photo.favorite && (
                        <span style={{ fontSize: '1.2rem' }}>⭐</span>
                      )}
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
        )}

        {/* 検索結果なし */}
        {searchQuery.trim() && searchResults.length === 0 && !isSearching && (
          <div className={styles.noResults}>
            <p>検索結果が見つかりませんでした</p>
            <p className={styles.noResultsHint}>
              メモや都道府県名で検索してください
            </p>
          </div>
        )}

        {/* 検索前の状態 */}
        {!searchQuery.trim() && (
          <div className={styles.emptyState}>
            <p>🔍 メモや都道府県名で写真を検索できます</p>
            <p className={styles.emptyStateHint}>
              検索ボックスにキーワードを入力して検索ボタンを押してください
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Search;

