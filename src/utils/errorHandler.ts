/**
 * エラーハンドリングユーティリティ
 */
export function logError(message: string, error: unknown): void {
  console.error(message, error);
  if (error instanceof Error) {
    console.error('エラー詳細:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  }
}

