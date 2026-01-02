/**
 * PWAアイコン自動生成スクリプト
 * Node.jsで実行: node generate-icons.js
 * 
 * 注意: このスクリプトは、sharpパッケージを使用してアイコンを生成します。
 * インストール: npm install --save-dev sharp
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// アイコン設定
const iconConfig = {
  text: 'マンホール',
  bgColor: '#8b5cf6', // 紫
  textColor: '#ffffff', // 白
  sizes: [
    { size: 192, name: 'icon-192x192.png' },
    { size: 512, name: 'icon-512x512.png' },
    { size: 180, name: 'apple-touch-icon.png' }
  ]
};

async function generateIcons() {
  try {
    // sharpパッケージのチェック
    let sharp;
    try {
      sharp = (await import('sharp')).default;
    } catch (e) {
      console.error('❌ sharpパッケージが見つかりません。');
      console.log('📦 以下のコマンドでインストールしてください:');
      console.log('   npm install --save-dev sharp');
      console.log('\nまたは、ブラウザで generate-icons.html を開いてアイコンを生成してください。');
      process.exit(1);
    }

    const iconsDir = path.join(__dirname, 'public', 'icons');
    
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    console.log('🎨 PWAアイコンを生成しています...\n');

    for (const { size, name } of iconConfig.sizes) {
      // SVGを作成
      const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${size}" height="${size}" fill="${iconConfig.bgColor}"/>
          <text x="50%" y="50%" 
                font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
                font-size="${size * 0.4}" 
                font-weight="bold" 
                fill="${iconConfig.textColor}" 
                text-anchor="middle" 
                dominant-baseline="middle">${iconConfig.text}</text>
        </svg>
      `;

      // SVGをPNGに変換
      const pngBuffer = await sharp(Buffer.from(svg))
        .png()
        .toBuffer();

      // ファイルに保存
      const outputPath = path.join(iconsDir, name);
      fs.writeFileSync(outputPath, pngBuffer);
      
      console.log(`✅ ${name} (${size}x${size}px) を生成しました`);
    }

    console.log('\n✨ すべてのアイコンを生成しました！');
    console.log(`📁 保存先: ${iconsDir}`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

generateIcons();

