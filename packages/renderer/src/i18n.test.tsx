import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider, createRendererI18n, useT } from './lib/i18n';

function TranslatedTitle() {
  const { t } = useT();

  return <h1>{t('welcome.title')}</h1>;
}

describe('renderer i18n', () => {
  it('renders welcome.title in English', () => {
    render(
      <I18nProvider i18n={createRendererI18n('en-US')}>
        <TranslatedTitle />
      </I18nProvider>
    );

    expect(screen.getByRole('heading', { name: 'Open a KeePass database' })).toBeInTheDocument();
  });
});
