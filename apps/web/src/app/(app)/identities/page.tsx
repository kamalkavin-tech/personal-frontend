import { VaultPage } from '@/components/vault/vault-page';

export const metadata = { title: 'Identity Vault — VaultX' };

export default function IdentitiesPage() {
  return <VaultPage type="identity" title="Identity Vault" description="Passports, licenses, PAN, Aadhaar and more" />;
}
