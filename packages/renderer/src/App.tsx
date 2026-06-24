import { WelcomePanel } from '@keepass/ui';

export function App() {
  return (
    <WelcomePanel
      title="Open a KeePass database"
      description="Choose a local .kdbx file to get started."
    />
  );
}
