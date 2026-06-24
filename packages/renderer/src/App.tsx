import { WelcomePanel } from '@keepass/ui';
import { useT } from './lib/i18n';

export function App() {
  const { t } = useT();

  return (
    <WelcomePanel
      title={t('welcome.title')}
      description={t('welcome.description')}
    />
  );
}
