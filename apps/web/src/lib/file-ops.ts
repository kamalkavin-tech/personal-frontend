import type { FileEntry } from '@vaultx/shared';
import { api, API_URL } from '@/lib/api';
import { getAccessToken } from '@/lib/api';
import { decryptBytes, fromB64 } from '@/lib/crypto';
import { downloadBlob } from '@/lib/utils';

export interface DecryptedFile {
  blob: Blob;
  name: string;
  url: string;
}

export async function fetchDecryptedFile(entry: FileEntry, dek: CryptoKey): Promise<DecryptedFile> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/files/${entry._id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to download encrypted file');
  const buffer = await res.arrayBuffer();
  const decrypted = await decryptBytes(buffer, fromB64(entry.contentIv), dek);
  const blob = new Blob([decrypted], { type: entry.mime ?? 'application/octet-stream' });
  const name = await decryptName(entry, dek);
  return { blob, name, url: URL.createObjectURL(blob) };
}

async function decryptName(entry: FileEntry, dek: CryptoKey): Promise<string> {
  const { decryptString } = await import('@/lib/crypto');
  try {
    return await decryptString({ data: entry.encryptedName, iv: entry.iv }, dek);
  } catch {
    return `vault-file-${entry._id}`;
  }
}

export async function downloadDecryptedFile(entry: FileEntry, dek: CryptoKey): Promise<void> {
  const { blob, name } = await fetchDecryptedFile(entry, dek);
  downloadBlob(blob, name);
}

export function makeFileFormData(
  file: { name: string; type: string; size: number },
  encrypted: ArrayBuffer,
  iv: Uint8Array,
  encryptedName: { encryptedName: string; iv: string },
  opts: { kind: string; albumId?: string; tags?: string[]; favorite?: boolean },
): FormData {
  const form = new FormData();
  form.append('file', new File([encrypted], 'encrypted', { type: file.type }), 'encrypted');
  form.append('kind', opts.kind);
  form.append('encryptedName', encryptedName.encryptedName);
  form.append('iv', encryptedName.iv);
  form.append('contentIv', btoa(String.fromCharCode(...iv)));
  if (opts.albumId) form.append('albumId', opts.albumId);
  if (opts.favorite) form.append('favorite', 'true');
  if (opts.tags?.length) form.append('tags', opts.tags.join(','));
  return form;
}

export { api };
