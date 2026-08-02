import { VaultPage } from '@/components/vault/vault-page';

export const metadata = { title: 'Secret Vault — VaultX' };

export default function SecretsPage() {
  return <VaultPage type="secret" title="Secret Vault" description="Recovery codes, license keys, SSH keys, certificates" />;
}
