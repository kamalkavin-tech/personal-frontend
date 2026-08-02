import { VaultPage } from '@/components/vault/vault-page';

export const metadata = { title: 'Notes — VaultX' };

export default function NotesPage() {
  return <VaultPage type="note" title="Secure Notes" description="Markdown notes, pinned, tagged and searchable" />;
}
