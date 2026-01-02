import { useState, useRef, useEffect, useCallback } from 'react';
import type { CropInfo } from '../types/photo';
import styles from './ImageCropEditor.module.css';

interface ImageCropEditorProps {
  imageUrl: string;
  onCropChange: (cropInfo: CropInfo) => void;
  initialCrop?: CropInfo | { x: number; y: number; size: number }; // 後方互換性のため
  className?: string;
  large?: boolean; // 詳細画面用の大きなサイズ表示
}

function ImageCropEditor({
  imageUrl,
  onCropChange,
  initialCrop,
  className,
  large = false,
}: ImageCropEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [cropBox, setCropBox] = useState<CropInfo>(() => {
    if (initialCrop) {
      // 既存のCropInfo（size形式）からの移行対応
      if ('size' in initialCrop) {
        return {
          x: initialCrop.x,
          y: initialCrop.y,
          width: initialCrop.size,
          height: initialCrop.size,
        };
      }
      return initialCrop;
    }
    return { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize-top-left' | 'resize-top-right' | 'resize-bottom-left' | 'resize-bottom-right' | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, cropX: 0, cropY: 0, cropWidth: 0, cropHeight: 0 });
  const cropBoxRef = useRef(cropBox);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // 画像サイズを取得（画像ロード後）
  useEffect(() => {
    const handleImageLoad = () => {
      if (imageRef.current) {
        const img = imageRef.current;
        // 実際の表示サイズを取得
        const rect = img.getBoundingClientRect();
        setImageSize({ width: rect.width, height: rect.height });
      }
    };

    const handleResize = () => {
      handleImageLoad();
    };

    const img = imageRef.current;
    if (img) {
      if (img.complete) {
        handleImageLoad();
      } else {
        img.addEventListener('load', handleImageLoad);
      }
    }

    window.addEventListener('resize', handleResize);
    return () => {
      if (img) {
        img.removeEventListener('load', handleImageLoad);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [imageUrl]);

  // cropBoxRefを同期
  useEffect(() => {
    cropBoxRef.current = cropBox;
  }, [cropBox]);

  // 初期クロップ情報を設定
  useEffect(() => {
    if (initialCrop) {
      // 既存のCropInfo（size形式）からの移行対応
      const convertedCrop: CropInfo = 'size' in initialCrop
        ? {
            x: initialCrop.x,
            y: initialCrop.y,
            width: initialCrop.size,
            height: initialCrop.size,
          }
        : initialCrop;
      setCropBox(convertedCrop);
      cropBoxRef.current = convertedCrop;
    }
  }, [initialCrop]);

  // クロップ情報を親に通知（デバウンス付き）
  useEffect(() => {
    const timer = setTimeout(() => {
      onCropChange(cropBoxRef.current);
    }, 100);
    return () => clearTimeout(timer);
  }, [cropBox, onCropChange]);

  // ドラッグ開始（マウス）
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageRef.current) return;

    const target = e.target as HTMLElement;
    const rect = imageRef.current.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;

    // ハンドルの判定
    let mode: 'move' | 'resize-top-left' | 'resize-top-right' | 'resize-bottom-left' | 'resize-bottom-right' = 'move';
    if (target.classList.contains(styles.handle)) {
      if (target.classList.contains(styles.handleTopLeft)) mode = 'resize-top-left';
      else if (target.classList.contains(styles.handleTopRight)) mode = 'resize-top-right';
      else if (target.classList.contains(styles.handleBottomLeft)) mode = 'resize-bottom-left';
      else if (target.classList.contains(styles.handleBottomRight)) mode = 'resize-bottom-right';
    }

    setDragMode(mode);
    setIsDragging(true);
    
    // ドラッグ開始時の状態を保存
    dragStartRef.current = {
      x: relativeX,
      y: relativeY,
      cropX: cropBoxRef.current.x,
      cropY: cropBoxRef.current.y,
      cropWidth: cropBoxRef.current.width,
      cropHeight: cropBoxRef.current.height,
    };
  };

  // ドラッグ開始（タッチ）
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageRef.current || !e.touches[0]) return;

    const target = e.target as HTMLElement;
    const rect = imageRef.current.getBoundingClientRect();
    const relativeX = (e.touches[0].clientX - rect.left) / rect.width;
    const relativeY = (e.touches[0].clientY - rect.top) / rect.height;

    // ハンドルの判定
    let mode: 'move' | 'resize-top-left' | 'resize-top-right' | 'resize-bottom-left' | 'resize-bottom-right' = 'move';
    if (target.classList.contains(styles.handle)) {
      if (target.classList.contains(styles.handleTopLeft)) mode = 'resize-top-left';
      else if (target.classList.contains(styles.handleTopRight)) mode = 'resize-top-right';
      else if (target.classList.contains(styles.handleBottomLeft)) mode = 'resize-bottom-left';
      else if (target.classList.contains(styles.handleBottomRight)) mode = 'resize-bottom-right';
    }

    setDragMode(mode);
    setIsDragging(true);
    
    // ドラッグ開始時の状態を保存
    dragStartRef.current = {
      x: relativeX,
      y: relativeY,
      cropX: cropBoxRef.current.x,
      cropY: cropBoxRef.current.y,
      cropWidth: cropBoxRef.current.width,
      cropHeight: cropBoxRef.current.height,
    };
  };

  // ドラッグ中（マウス）
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragMode || !imageRef.current) return;

    e.preventDefault();
    const rect = imageRef.current.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;

    updateCropBox(dragMode, relativeX, relativeY);
  };

  // ドラッグ中（タッチ）
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !dragMode || !imageRef.current || !e.touches[0]) return;

    e.preventDefault();
    const rect = imageRef.current.getBoundingClientRect();
    const relativeX = (e.touches[0].clientX - rect.left) / rect.width;
    const relativeY = (e.touches[0].clientY - rect.top) / rect.height;

    updateCropBox(dragMode, relativeX, relativeY);
  };

  // クロップボックスの更新（移動またはリサイズ）
  const updateCropBox = useCallback((
    mode: 'move' | 'resize-top-left' | 'resize-top-right' | 'resize-bottom-left' | 'resize-bottom-right',
    relativeX: number,
    relativeY: number
  ) => {
    const start = dragStartRef.current;
    const deltaX = relativeX - start.x;
    const deltaY = relativeY - start.y;

    let newX = start.cropX;
    let newY = start.cropY;
    let newWidth = start.cropWidth;
    let newHeight = start.cropHeight;

    if (mode === 'move') {
      // 移動
      newX = Math.max(0, Math.min(1 - start.cropWidth, start.cropX + deltaX));
      newY = Math.max(0, Math.min(1 - start.cropHeight, start.cropY + deltaY));
    } else {
      // リサイズ
      const minSize = 0.1;

      if (mode === 'resize-top-left') {
        newWidth = Math.max(minSize, Math.min(1 - start.cropX, start.cropWidth - deltaX));
        newHeight = Math.max(minSize, Math.min(1 - start.cropY, start.cropHeight - deltaY));
        newX = Math.max(0, start.cropX + start.cropWidth - newWidth);
        newY = Math.max(0, start.cropY + start.cropHeight - newHeight);
      } else if (mode === 'resize-top-right') {
        newWidth = Math.max(minSize, Math.min(1 - start.cropX, start.cropWidth + deltaX));
        newHeight = Math.max(minSize, Math.min(1 - start.cropY, start.cropHeight - deltaY));
        newY = Math.max(0, start.cropY + start.cropHeight - newHeight);
      } else if (mode === 'resize-bottom-left') {
        newWidth = Math.max(minSize, Math.min(1 - start.cropX, start.cropWidth - deltaX));
        newHeight = Math.max(minSize, Math.min(1 - start.cropY, start.cropHeight + deltaY));
        newX = Math.max(0, start.cropX + start.cropWidth - newWidth);
      } else if (mode === 'resize-bottom-right') {
        newWidth = Math.max(minSize, Math.min(1 - start.cropX, start.cropWidth + deltaX));
        newHeight = Math.max(minSize, Math.min(1 - start.cropY, start.cropHeight + deltaY));
      }
    }

    setCropBox({ x: newX, y: newY, width: newWidth, height: newHeight });
  }, []);

  // ドラッグ終了
  const handleEnd = () => {
    setIsDragging(false);
    setDragMode(null);
  };

  // クロップボックスのスタイル計算
  const cropStyle = {
    left: `${cropBox.x * 100}%`,
    top: `${cropBox.y * 100}%`,
    width: `${cropBox.width * 100}%`,
    height: `${cropBox.height * 100}%`,
  };

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.label}>
        <span>サムネイル範囲を調整</span>
        <span className={styles.hint}>(ドラッグで移動・角の丸で拡大縮小)</span>
      </div>
      <div
        ref={containerRef}
        className={`${styles.imageContainer} ${large ? styles.large : ''}`}
        style={{
          width: imageSize.width > 0 ? `${imageSize.width}px` : 'auto',
          height: imageSize.height > 0 ? `${imageSize.height}px` : 'auto',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleEnd}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="クロップ対象"
          className={styles.image}
          style={{ maxWidth: '100%', maxHeight: large ? '70vh' : '400px' }}
        />
        <div
          className={styles.cropBox}
          style={cropStyle}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className={styles.cropBoxBorder} />
          <div className={styles.cropBoxHandles}>
            <div className={`${styles.handle} ${styles.handleTopLeft}`} />
            <div className={`${styles.handle} ${styles.handleTopRight}`} />
            <div className={`${styles.handle} ${styles.handleBottomLeft}`} />
            <div className={`${styles.handle} ${styles.handleBottomRight}`} />
          </div>
        </div>
      </div>
      <div className={styles.instructions}>
        <p>💡 ヒント: クロップボックスをドラッグして位置を調整、角の青い丸をドラッグしてサイズを変更できます</p>
      </div>
    </div>
  );
}

export default ImageCropEditor;
