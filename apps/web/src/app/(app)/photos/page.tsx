import { FilesPage } from '@/components/files/files-page';

export const metadata = { title: 'Photo Vault — VaultX' };

export default function PhotosRoute() {
  return <FilesPage mode="photos" />;
}
