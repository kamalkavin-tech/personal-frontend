import { VaultPage } from '@/components/vault/vault-page';

export const metadata = { title: 'API Keys — VaultX' };

export default function ApiKeysPage() {
  return <VaultPage type="apiKey" title="API Keys" description="OpenAI, GitHub, AWS, Stripe and more" />;
}
