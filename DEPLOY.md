# デプロイ手順

このアプリはPWA（Progressive Web App）として動作します。以下のプラットフォームにデプロイできます。

## デプロイ方法

### 1. Vercel（推奨）

1. [Vercel](https://vercel.com)にアカウントを作成（GitHubアカウントでログイン可能）
2. プロジェクトをGitHubにプッシュ
3. Vercelで「New Project」を選択
4. GitHubリポジトリを選択
5. 設定：
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. 「Deploy」をクリック

**注意**: `vercel.json`が既に設定済みです。

### 2. Netlify

1. [Netlify](https://www.netlify.com)にアカウントを作成
2. プロジェクトをGitHubにプッシュ
3. Netlifyで「New site from Git」を選択
4. GitHubリポジトリを選択
5. 設定：
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. 「Deploy site」をクリック

**注意**: `netlify.toml`が既に設定済みです。

### 3. GitHub Pages

1. プロジェクトをGitHubにプッシュ
2. `package.json`に以下を追加：
   ```json
   "homepage": "https://yourusername.github.io/pwa-manhole-app",
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```
3. `npm install --save-dev gh-pages`
4. `npm run deploy`

## ビルド前の確認事項

1. **アイコンの確認**
   - `public/icons/icon-192x192.png` が存在すること
   - `public/icons/icon-512x512.png` が存在すること

2. **manifest.jsonの確認**
   - `public/manifest.json` が正しく設定されていること

3. **ビルドの実行**
   ```bash
   npm run build
   ```
   - `dist`フォルダが生成されることを確認

## デプロイ後の確認

1. **PWAとしてインストール可能か確認**
   - ブラウザのアドレスバーにインストールアイコンが表示されること
   - インストール後、スタンドアロンアプリとして動作すること

2. **オフライン動作の確認**
   - ネットワークを切断しても、アプリが動作すること（Service Workerが機能していること）

3. **HTTPSの確認**
   - PWAはHTTPSが必要です（localhostと127.0.0.1は例外）
   - デプロイ先がHTTPS対応であることを確認

## トラブルシューティング

### Service Workerが動作しない
- HTTPSでアクセスしているか確認
- ブラウザの開発者ツールでService Workerの状態を確認

### ルーティングが動作しない
- `vercel.json`または`netlify.toml`のリライト設定を確認
- すべてのルートが`index.html`にリダイレクトされることを確認

### アイコンが表示されない
- `public/icons/`フォルダにアイコンファイルが存在することを確認
- `manifest.json`のパスが正しいことを確認

