import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PREFECTURE_LIST } from '../types/prefecture';
import type { Prefecture } from '../types/prefecture';
import { getPrefectureById, initializePrefectures, updatePrefectureTotalManholes } from '../services/db/prefectureDB';
import { getPhotosByPrefectureId, updatePhoto } from '../services/db/photoDB';
import { isPremiumEnabled } from '../services/license/licenseService';
import type { Photo } from '../types/photo';
import AddPhotoModal from '../components/AddPhotoModal';
import styles from './PrefectureDetail.module.css';

function PrefectureDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [prefecture, setPrefecture] = useState<Prefecture | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [premiumEnabled, setPremiumEnabled] = useState(false);
  const [showManholesInput, setShowManholesInput] = useState(false);
  const [manholesInput, setManholesInput] = useState('');
  const [isSavingManholes, setIsSavingManholes] = useState(false);
  const [updatingFavoriteId, setUpdatingFavoriteId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        // IndexedDBを初期化（念のため）
        await initializePrefectures();
        
        // 有料機能の状態を確認
        const premium = await isPremiumEnabled();
        setPremiumEnabled(premium);
        
        // 都道府県情報をIndexedDBから取得
        const pref = await getPrefectureById(id);
        if (pref) {
          setPrefecture(pref);
          if (pref.totalManholes !== undefined) {
            setManholesInput(pref.totalManholes.toString());
          }
        } else {
          // IndexedDBにデータがない場合、静的データから取得
          const staticPref = PREFECTURE_LIST.find(p => p.id === id);
          if (staticPref) {
            setPrefecture({
              id: staticPref.id,
              name: staticPref.name,
              photoCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        // 写真一覧を取得
        try {
          const photoList = await getPhotosByPrefectureId(id);
          setPhotos(photoList);
        } catch (err) {
          console.error('写真の読み込みエラー:', err);
          // 写真の読み込みに失敗しても続行
        }
      } catch (error) {
        console.error('データの読み込みエラー:', error);
        // エラーが発生した場合、静的データから取得
        const staticPref = PREFECTURE_LIST.find(p => p.id === id);
        if (staticPref) {
          setPrefecture({
            id: staticPref.id,
            name: staticPref.name,
            photoCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // Blob URLのクリーンアップ
  useEffect(() => {
    return () => {
      photos.forEach(photo => {
        if (photo.imageUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(photo.imageUrl);
        }
        if (photo.thumbnailUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(photo.thumbnailUrl);
        }
      });
    };
  }, [photos]);

  // データを再読み込み（写真追加後に呼び出される）
  const reloadData = async () => {
    if (!id) return;
    setLoading(true);

    try {
      // 都道府県情報を再取得
      const pref = await getPrefectureById(id);
      if (pref) {
        setPrefecture(pref);
      }

      // 写真一覧を再取得
      const photoList = await getPhotosByPrefectureId(id);
      setPhotos(photoList);
    } catch (error) {
      console.error('データの再読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // お気に入りをトグル
  const handleToggleFavorite = async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation(); // 写真詳細への遷移を防ぐ
    
    setUpdatingFavoriteId(photo.id);
    try {
      const updatedPhoto: Photo = {
        ...photo,
        favorite: !photo.favorite,
      };
      await updatePhoto(updatedPhoto);
      // 写真一覧を更新
      const updatedPhotos = photos.map(p => 
        p.id === photo.id ? { ...p, favorite: !p.favorite } : p
      );
      setPhotos(updatedPhotos);
    } catch (error) {
      console.error('お気に入りの更新エラー:', error);
      alert('お気に入りの更新に失敗しました');
    } finally {
      setUpdatingFavoriteId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!prefecture) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>都道府県が見つかりません</p>
        <button onClick={() => navigate('/')}>← 一覧に戻る</button>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '1rem',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 4px 16px var(--shadow-color)',
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{
              padding: '0.5rem 1rem',
              background: `linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)`,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              boxShadow: `0 2px 8px var(--button-shadow)`,
            }}
          >
            ← 戻る
          </button>
        </div>
        <h1 style={{ 
          margin: '0 0 0.5rem 0',
          background: `linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: '2rem',
        }}>
          {prefecture.name}
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem 0' }}>写真数: {prefecture.photoCount}枚</p>
        
        {/* 有料機能: 達成率表示 */}
        {premiumEnabled && (
          <div className={styles.premiumSection}>
            <h2 className={styles.premiumTitle}>📊 達成率</h2>
            {prefecture.totalManholes !== undefined && prefecture.totalManholes > 0 ? (
              <div className={styles.progressInfo}>
                <div className={styles.progressStats}>
                  <span className={styles.progressLabel}>進捗:</span>
                  <span className={styles.progressValue}>
                    {prefecture.photoCount} / {prefecture.totalManholes} 枚
                  </span>
                </div>
                <div className={styles.progressBarContainer}>
                  <div 
                    className={styles.progressBar}
                    style={{ 
                      width: `${Math.min((prefecture.photoCount / prefecture.totalManholes) * 100, 100)}%` 
                    }}
                  />
                </div>
                <div className={styles.progressPercentage}>
                  {((prefecture.photoCount / prefecture.totalManholes) * 100).toFixed(1)}% 達成
                  {prefecture.photoCount >= prefecture.totalManholes && (
                    <span className={styles.completeBadge}>🎉 コンプ</span>
                  )}
                </div>
                {prefecture.manholesUpdatedAt && (
                  <p className={styles.updateDate}>
                    最終更新: {new Date(prefecture.manholesUpdatedAt).toLocaleString('ja-JP')}
                  </p>
                )}
                <button
                  className={styles.editManholesButton}
                  onClick={() => setShowManholesInput(!showManholesInput)}
                >
                  {showManholesInput ? 'キャンセル' : '📝 全マンホール数を編集'}
                </button>
              </div>
            ) : (
              <div className={styles.noManholesSet}>
                <p>全マンホール数が設定されていません</p>
                <button
                  className={styles.setManholesButton}
                  onClick={() => setShowManholesInput(!showManholesInput)}
                >
                  📝 全マンホール数を設定
                </button>
              </div>
            )}
            
            {/* 全マンホール数入力フォーム */}
            {showManholesInput && (
              <div className={styles.manholesInputForm}>
                <label className={styles.inputLabel}>
                  全マンホール数:
                  <input
                    type="number"
                    min="1"
                    value={manholesInput}
                    onChange={(e) => setManholesInput(e.target.value)}
                    placeholder="例: 10"
                    className={styles.numberInput}
                    disabled={isSavingManholes}
                  />
                </label>
                <div className={styles.inputActions}>
                  <button
                    className={styles.saveButton}
                    onClick={async () => {
                      const num = parseInt(manholesInput, 10);
                      if (isNaN(num) || num < 1) {
                        alert('1以上の数値を入力してください');
                        return;
                      }
                      if (!id) return;
                      
                      setIsSavingManholes(true);
                      try {
                        await updatePrefectureTotalManholes(id, num);
                        await reloadData();
                        setShowManholesInput(false);
                        alert('全マンホール数を更新しました');
                      } catch (err) {
                        console.error('更新エラー:', err);
                        alert('更新に失敗しました');
                      } finally {
                        setIsSavingManholes(false);
                      }
                    }}
                    disabled={isSavingManholes || !manholesInput.trim()}
                  >
                    {isSavingManholes ? '保存中...' : '💾 保存'}
                  </button>
                  <button
                    className={styles.cancelButton}
                    onClick={() => {
                      setShowManholesInput(false);
                      if (prefecture.totalManholes !== undefined) {
                        setManholesInput(prefecture.totalManholes.toString());
                      } else {
                        setManholesInput('');
                      }
                    }}
                    disabled={isSavingManholes}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* 写真追加ボタン */}
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '0.75rem 1.5rem',
            background: `linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)`,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: `0 2px 8px var(--button-shadow)`,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = `0 4px 12px var(--button-shadow-hover)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 2px 8px var(--button-shadow)`;
          }}
        >
          📷 写真を追加
        </button>
      
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid #eee' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-primary)' }}>写真一覧</h2>
          
          {photos.length === 0 ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              background: `linear-gradient(135deg, var(--card-gradient-start) 0%, var(--card-gradient-end) 100%)`,
              borderRadius: '12px',
              color: 'var(--text-secondary)',
            }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>まだ写真がありません</p>
              <p style={{ margin: '0', fontSize: '0.9rem' }}>
                上の「写真を追加」ボタンから写真を追加できます
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '1rem',
            }}>
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#f5f5f5',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px var(--shadow-color)',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => navigate(`/photo/${photo.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 16px var(--shadow-hover-color)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 8px var(--shadow-color)';
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.memo || '写真'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    {/* お気に入りボタン（左上） */}
                    {premiumEnabled && (
                      <button
                        onClick={(e) => handleToggleFavorite(photo, e)}
                        disabled={updatingFavoriteId === photo.id}
                        style={{
                          position: 'absolute',
                          top: '0.5rem',
                          left: '0.5rem',
                          background: photo.favorite 
                            ? 'rgba(255, 193, 7, 0.95)' 
                            : 'rgba(255, 255, 255, 0.9)',
                          border: photo.favorite 
                            ? '2px solid rgba(255, 193, 7, 1)' 
                            : '2px solid rgba(0, 0, 0, 0.2)',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                          transition: 'all 0.2s',
                          padding: 0,
                          zIndex: 10,
                        }}
                        onMouseEnter={(e) => {
                          if (!updatingFavoriteId) {
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
                        }}
                        title={photo.favorite ? 'お気に入りを解除' : 'お気に入りに追加'}
                      >
                        {photo.favorite ? '⭐' : '☆'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 写真追加モーダル */}
      {prefecture && (
        <AddPhotoModal
          prefectureId={prefecture.id}
          prefectureName={prefecture.name}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            // 写真追加後にデータを再読み込み
            reloadData();
          }}
        />
      )}
    </div>
  );
}

export default PrefectureDetail;
