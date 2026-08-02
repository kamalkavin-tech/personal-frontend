import { VaultPage } from '@/components/vault/vault-page';

export const metadata = { title: 'Contacts — VaultX' };

export default function ContactsPage() {
  return <VaultPage type="contact" title="Emergency Contacts" description="Family, friends and emergency contacts" />;
}
