import { VaultPage } from '@/components/vault/vault-page';

export const metadata = { title: 'Payments — VaultX' };

export default function PaymentsPage() {
  return <VaultPage type="card" title="Payment Vault" description="Cards, bank accounts, UPI and subscriptions" />;
}
