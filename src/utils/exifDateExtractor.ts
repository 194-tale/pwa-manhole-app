import exifr from 'exifr';

/**
 * 画像ファイルから撮影日時を取得
 * EXIF情報 > ファイルの更新日時 > 現在時刻 の順で取得を試みる
 */
export async function extractPhotoDate(file: File): Promise<Date> {
  try {
    // EXIF情報から撮影日時を取得
    const exifData = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate'],
    });

    if (exifData?.DateTimeOriginal) {
      const date = new Date(exifData.DateTimeOriginal);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    if (exifData?.CreateDate) {
      const date = new Date(exifData.CreateDate);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    if (exifData?.ModifyDate) {
      const date = new Date(exifData.ModifyDate);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  } catch (error) {
    console.warn('EXIF情報の読み取りに失敗:', error);
  }

  // EXIF情報が取得できない場合、ファイルの更新日時を使用
  if (file.lastModified) {
    return new Date(file.lastModified);
  }

  // それも取得できない場合、現在時刻を使用
  return new Date();
}

