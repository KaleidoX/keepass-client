import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { I18nProvider, createRendererI18n, type RendererLanguage } from './lib/i18n';

const language: RendererLanguage = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider i18n={createRendererI18n(language)}>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
