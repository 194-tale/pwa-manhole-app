# ご当地マンホールアプリ

日本各地のご当地マンホールを撮影・管理するPWA（Progressive Web App）アプリケーション。

## 機能

- 📷 マンホール写真の撮影・保存
- 🗺️ 都道府県別の写真管理
- ✂️ サムネイル範囲の調整
- 📝 メモ機能
- ⭐ お気に入り機能（有料版）
- 🔍 検索機能（有料版）
- 📊 達成率表示（有料版）
- 💾 データのエクスポート/インポート
- 📱 PWA対応（オフライン動作、ホーム画面への追加）

## 技術スタック

- **フロントエンド**: React 19 + TypeScript
- **ビルドツール**: Vite
- **ルーティング**: React Router v7
- **データベース**: IndexedDB (idb)
- **PWA**: vite-plugin-pwa
- **画像処理**: Canvas API

## セットアップ

### 必要な環境

- Node.js 18以上
- npm または yarn

### インストール

```bash
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスします。

### ビルド

```bash
npm run build
```

`dist`フォルダにビルド結果が出力されます。

### プレビュー

```bash
npm run preview
```

ビルド結果をローカルでプレビューします。

## デプロイ

詳細は [DEPLOY.md](./DEPLOY.md) を参照してください。

### クイックデプロイ（Vercel推奨）

1. [Vercel](https://vercel.com)にアカウントを作成
2. GitHubリポジトリを接続
3. 自動的にデプロイされます

`vercel.json`が既に設定済みです。

## プロジェクト構成

```
pwa-manhole-app/
├── src/
│   ├── components/      # コンポーネント
│   ├── pages/          # ページコンポーネント
│   ├── services/       # ビジネスロジック
│   │   ├── db/        # IndexedDB操作
│   │   ├── image/     # 画像処理
│   │   ├── export/    # データエクスポート/インポート
│   │   └── license/   # ライセンス管理
│   ├── types/         # TypeScript型定義
│   └── utils/         # ユーティリティ
├── public/            # 静的ファイル
│   ├── icons/        # PWAアイコン
│   └── manifest.json # PWAマニフェスト
└── dist/             # ビルド出力（gitignore）
```

## ライセンス

このプロジェクトはプライベートプロジェクトです。
