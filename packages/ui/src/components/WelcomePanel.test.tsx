import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WelcomePanel } from './WelcomePanel';

describe('WelcomePanel', () => {
  it('renders title and description props', () => {
    render(
      <WelcomePanel
        title="Open a KeePass database"
        description="Choose a local .kdbx file to get started."
      />
    );

    expect(screen.getByRole('heading', { name: 'Open a KeePass database' })).toBeInTheDocument();
    expect(screen.getByText('Choose a local .kdbx file to get started.')).toBeInTheDocument();
  });
});
