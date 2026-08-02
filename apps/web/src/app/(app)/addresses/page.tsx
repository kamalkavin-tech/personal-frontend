import { VaultPage } from '@/components/vault/vault-page';

export const metadata = { title: 'Addresses — VaultX' };

export default function AddressesPage() {
  return <VaultPage type="address" title="Important Addresses" description="Home, office and frequently used addresses" />;
}
