import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { REGION_GROUPS, PREFECTURE_LIST } from '../types/prefecture';
import type { Prefecture } from '../types/prefecture';
import { getHiddenPrefectureIds, hidePrefecture, showPrefecture } from '../utils/hiddenPrefectures';
import { getAllPrefectures, initializePrefectures } from '../services/db/prefectureDB';
import { isPremiumEnabled } from '../services/license/licenseService';
import styles from './PrefectureList.module.css';

function PrefectureList() {
  const navigate = useNavigate();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [showHiddenManager, setShowHiddenManager] = useState(false);
  const [prefecturesMap, setPrefecturesMap] = useState<Map<string, Prefecture>>(new Map());
  const [premiumEnabled, setPremiumEnabled] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    setHiddenIds(getHiddenPrefectureIds());
  }, []);

  // IndexedDBから都道府県データを読み込み（エラーが発生しても静的データで表示）
  useEffect(() => {
    const loadPrefectures = async () => {
      try {
        // IndexedDBを初期化（初回のみ）
        await initializePrefectures();
        
        // 都道府県データを取得
        const all = await getAllPrefectures();
        
        // Mapに変換して保存（高速検索用）
        const map = new Map<string, Prefecture>();
        all.forEach(pref => {
          map.set(pref.id, pref);
        });
        setPrefecturesMap(map);
      } catch (err) {
        console.error('都道府県データの読み込みエラー:', err);
        // エラーが発生しても、静的データで表示を続ける（空のMapを設定）
        setPrefecturesMap(new Map());
      }

      // 有料機能の状態を確認
      try {
        const premium = await isPremiumEnabled();
        setPremiumEnabled(premium);
      } catch (err) {
        console.error('有料機能の状態確認エラー:', err);
        setPremiumEnabled(false);
      }
    };

    // 非同期関数を実行（エラーが発生しても画面は表示される）
    loadPrefectures().catch(err => {
      console.error('都道府県データの読み込みで予期しないエラー:', err);
      setPrefecturesMap(new Map());
    });
  }, []);

  const handleExternalLink = () => {
    window.open('https://local.pokemon.jp/manhole/', '_blank');
  };

  const handleToggleHide = (prefectureId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const pref = PREFECTURE_LIST.find(p => p.id === prefectureId);
    const prefectureName = pref?.name || 'この都道府県';
    
    if (window.confirm(`${prefectureName}を非表示にしますか？\n後で「非表示管理」から表示できます。`)) {
      hidePrefecture(prefectureId);
      setHiddenIds(prev => [...prev, prefectureId]);
    }
  };

  // 非表示の都道府県を除外してフィルタリング
  // IndexedDBから取得した写真数を反映
  const filteredGroups = REGION_GROUPS.map(region => ({
    ...region,
    prefectures: region.prefectures
      .filter(pref => !hiddenIds.includes(pref.id))
      .map(pref => {
        // IndexedDBから取得したデータがあれば写真数を更新
        const dbData = prefecturesMap.get(pref.id);
        return {
          ...pref,
          photoCount: dbData?.photoCount ?? 0,
        };
      }),
  })).filter(region => region.prefectures.length > 0);

  return (
    <div style={{ 
      padding: '1rem',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <div className={styles.headerCard}>
        <div className={styles.headerRow}>
          <h1 className={styles.pageTitle}>
            ご当地マンホール
          </h1>
          
          {/* ハンバーガーメニューボタン（右端） */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={styles.menuButton}
            aria-label="メニュー"
          >
            <span className={styles.hamburger}>
              <span className={showMenu ? styles.hamburgerLineActive : styles.hamburgerLine}></span>
              <span className={showMenu ? styles.hamburgerLineActive : styles.hamburgerLine}></span>
              <span className={showMenu ? styles.hamburgerLineActive : styles.hamburgerLine}></span>
            </span>
          </button>
        </div>

        {/* ハンバーガーメニュー */}
        {showMenu && (
          <>
            <div 
              className={styles.menuOverlay}
              onClick={() => setShowMenu(false)}
            />
            <div className={styles.menu}>
              <button
                onClick={() => {
                  handleExternalLink();
                  setShowMenu(false);
                }}
                className={styles.menuItem}
              >
                <span className={styles.menuIcon}>🌐</span>
                <span className={styles.menuText}>公式サイトを開く</span>
              </button>
              {premiumEnabled && (
                <>
                  <button
                    onClick={() => {
                      navigate('/favorites');
                      setShowMenu(false);
                    }}
                    className={styles.menuItem}
                  >
                    <span className={styles.menuIcon}>⭐</span>
                    <span className={styles.menuText}>お気に入り</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/search');
                      setShowMenu(false);
                    }}
                    className={styles.menuItem}
                  >
                    <span className={styles.menuIcon}>🔍</span>
                    <span className={styles.menuText}>検索</span>
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setShowHiddenManager(!showHiddenManager);
                  setShowMenu(false);
                }}
                className={styles.menuItem}
                style={{
                  background: showHiddenManager ? 'rgba(255, 152, 0, 0.1)' : undefined,
                }}
              >
                <span className={styles.menuIcon}>👁️</span>
                <span className={styles.menuText}>
                  非表示管理 {hiddenIds.length > 0 && `(${hiddenIds.length})`}
                </span>
              </button>
              <button
                onClick={() => {
                  navigate('/settings');
                  setShowMenu(false);
                }}
                className={styles.menuItem}
              >
                <span className={styles.menuIcon}>⚙️</span>
                <span className={styles.menuText}>設定</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* 非表示管理モーダル */}
      {showHiddenManager && (
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 16px var(--shadow-color)',
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            非表示の都道府県を管理
          </h2>
          {hiddenIds.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>非表示の都道府県はありません</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
              {hiddenIds.map(id => {
                const pref = PREFECTURE_LIST.find(p => p.id === id);
                if (!pref) return null;
                return (
                  <div
                    key={id}
                    style={{
                      padding: '0.75rem',
                      background: 'rgba(255, 152, 0, 0.1)',
                      border: '1px solid rgba(255, 152, 0, 0.3)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{pref.name}</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        showPrefecture(id);
                        setHiddenIds(prev => prev.filter(prevId => prevId !== id));
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: 'rgba(255, 152, 0, 0.8)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      表示
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 地方別グループ分け表示 */}
      {filteredGroups.map((region) => (
        <div 
          key={region.name} 
          style={{ 
            marginBottom: '2rem',
            background: 'var(--card-bg)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 4px 16px var(--shadow-color)',
          }}
        >
          <h2 style={{ 
            fontSize: '1.3rem', 
            fontWeight: 'bold', 
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: `3px solid var(--bg-gradient-start)`,
            color: 'var(--text-primary)',
          }}>
            {region.name}
          </h2>
          <div className={styles.prefectureGrid}>
            {region.prefectures.map((pref) => {
              const dbData = prefecturesMap.get(pref.id);
              const photoCount = dbData?.photoCount ?? 0;
              const totalManholes = dbData?.totalManholes;
              const isComplete = premiumEnabled && totalManholes !== undefined && totalManholes > 0 && photoCount >= totalManholes;

              return (
                <div key={pref.id} style={{ position: 'relative' }}>
                  <Link
                    to={`/prefecture/${pref.id}`}
                    className={`${styles.prefectureCard} ${isComplete ? styles.prefectureCardComplete : ''}`}
                  >
                    <div className={styles.prefectureCardContent} style={{ paddingRight: '2.5rem' }}>
                      <span className={styles.prefectureName}>
                        {pref.name}
                      </span>
                      <span className={styles.prefectureCount}>
                        {photoCount}枚
                      </span>
                    </div>
                  </Link>
                  
                  {/* 非表示ボタン */}
                  <button
                    onClick={(e) => handleToggleHide(pref.id, e)}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      width: '28px',
                      height: '28px',
                      padding: '0',
                      margin: '0',
                      background: 'rgba(255, 255, 255, 0.9)',
                      color: '#666',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: '1',
                      zIndex: 10,
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ff4444';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.borderColor = '#ff4444';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.currentTarget.style.color = '#666';
                      e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="非表示にする"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default PrefectureList;

