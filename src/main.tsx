import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { LangProvider } from './i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import { asset } from './utils/assetUrl';
import './styles.css';

// 角色选择屏背景：CSS 无法读取 BASE_URL，由 JS 注入以适配单文件分发(file://)。
document.documentElement.style.setProperty(
  '--bg-char-select',
  `url("${asset('assets/backgrounds/stickman_battle_generated_sharp.jpg')}")`,
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LangProvider>
        <App />
      </LangProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
