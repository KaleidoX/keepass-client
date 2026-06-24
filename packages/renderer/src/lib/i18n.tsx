import type { PropsWithChildren } from 'react';
import i18next, { type i18n as I18nInstance } from 'i18next';
import { I18nextProvider, useTranslation } from 'react-i18next';
import enUS from '@keepass/i18n/en-US';
import zhCN from '@keepass/i18n/zh-CN';

export type RendererLanguage = 'en-US' | 'zh-CN';

export function createRendererI18n(lng: RendererLanguage): I18nInstance {
  const instance = i18next.createInstance();

  void instance.init({
    lng,
    fallbackLng: 'en-US',
    resources: {
      'en-US': { translation: enUS },
      'zh-CN': { translation: zhCN }
    },
    interpolation: {
      escapeValue: false
    }
  });

  return instance;
}

export function I18nProvider({ children, i18n }: PropsWithChildren<{ i18n: I18nInstance }>) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export function useT() {
  return useTranslation();
}
