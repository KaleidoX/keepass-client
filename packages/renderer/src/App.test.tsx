import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { installKeePassAPIMock } from './lib/api.mock';
import { I18nProvider, createRendererI18n } from './lib/i18n';
import { useDatabaseStore } from './stores/databaseStore';

function resetDatabaseStore() {
  useDatabaseStore.setState({
    databaseId: null,
    entries: [],
    isLoading: false,
    error: null
  });
}

beforeEach(() => {
  resetDatabaseStore();
  delete window.keepassAPI;
});

describe('App', () => {
  it('renders the app shell', () => {
    render(
      <I18nProvider i18n={createRendererI18n('en-US')}>
        <App />
      </I18nProvider>
    );

    expect(screen.getByRole('heading', { name: 'Open a KeePass database' })).toBeInTheDocument();
  });

  it('closes the current database from the app shell', async () => {
    const closeDatabase = vi.fn().mockResolvedValue(undefined);
    installKeePassAPIMock({ closeDatabase });
    useDatabaseStore.setState({ databaseId: 'db-1', entries: [], isLoading: false, error: null });

    render(
      <I18nProvider i18n={createRendererI18n('en-US')}>
        <App />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close database' }));

    await waitFor(() => expect(closeDatabase).toHaveBeenCalledWith('db-1'));
  });

  it('shows an error when closing the current database fails', async () => {
    const closeDatabase = vi.fn().mockRejectedValue(new Error('close failed'));
    installKeePassAPIMock({ closeDatabase });
    useDatabaseStore.setState({ databaseId: 'db-1', entries: [], isLoading: false, error: null });

    render(
      <I18nProvider i18n={createRendererI18n('en-US')}>
        <App />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close database' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('close failed');
  });
});
