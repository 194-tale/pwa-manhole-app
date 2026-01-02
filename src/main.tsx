import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/variables.css'
import App from './App.tsx'

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('root要素が見つかりません');
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  console.error('アプリのレンダリングエラー:', error);
  rootElement.innerHTML = `
    <div style="padding: 2rem; color: red;">
      <h1>エラーが発生しました</h1>
      <p>${error instanceof Error ? error.message : String(error)}</p>
      <p>コンソールを確認してください。</p>
    </div>
  `;
}
