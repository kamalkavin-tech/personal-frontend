import { VaultPage } from '@/components/vault/vault-page';

export const metadata = { title: 'Passwords — VaultX' };

export default function PasswordsPage() {
  return <VaultPage type="password" title="Passwords" description="Website logins and account credentials" />;
}
