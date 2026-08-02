import type { VaultEntry, FileEntry, VaultType } from '@vaultx/shared';
import { encryptStringWithPassword, decryptStringWithPassword } from '@/lib/crypto';
import { decryptItemPayload, encryptItemPayload, decryptFileName, VaultItemPayload } from '@/lib/vault';

export interface ExportBundle {
  version: 2;
  exportedAt: string;
  app: 'vaultx';
  items: Array<{
    type: VaultType;
    payload: VaultItemPayload;
    folderId?: string | null;
    tags: string[];
    favorite: boolean;
    pinned: boolean;
    archived: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  files: Array<{ name: string; kind: string; size: number; createdAt: string }>;
}

export async function buildExportBundle(entries: VaultEntry[], files: FileEntry[], dek: CryptoKey): Promise<ExportBundle> {
  const items = [];
  for (const entry of entries) {
    try {
      const payload = await decryptItemPayload(entry, dek);
      items.push({
        type: entry.type as VaultType,
        payload,
        folderId: entry.folderId,
        tags: entry.tags,
        favorite: entry.favorite,
        pinned: entry.pinned,
        archived: entry.archived,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });
    } catch {
      /* skip unreadable */
    }
  }
  const fileNames = [];
  for (const file of files) {
    try {
      fileNames.push({ name: await decryptFileName(file, dek), kind: file.kind, size: file.size, createdAt: file.createdAt });
    } catch {
      /* skip */
    }
  }
  return { version: 2, exportedAt: new Date().toISOString(), app: 'vaultx', items, files: fileNames };
}

export async function exportPlainJson(bundle: ExportBundle): Promise<string> {
  return JSON.stringify(bundle, null, 2);
}

export async function exportEncryptedJson(bundle: ExportBundle, passphrase: string): Promise<string> {
  return encryptStringWithPassword(JSON.stringify(bundle), passphrase);
}

export async function importBundle(
  content: string,
  passphrase: string | undefined,
  dek: CryptoKey,
  createItem: (type: VaultType, enc: { encrypted: string; iv: string; title: string; folderId?: string | null; tags?: string[]; favorite?: boolean; pinned?: boolean; archived?: boolean }) => Promise<unknown>,
): Promise<{ items: number }> {
  let json = content;
  if (content.startsWith('vx1:')) {
    if (!passphrase) throw new Error('This backup is encrypted. Enter the passphrase you chose when exporting.');
    json = await decryptStringWithPassword(content, passphrase);
  }
  const bundle = JSON.parse(json) as ExportBundle;
  if (!bundle || bundle.app !== 'vaultx' || !Array.isArray(bundle.items)) throw new Error('Unsupported backup format');
  let count = 0;
  for (const item of bundle.items) {
    const enc = await encryptItemPayload(item.payload, dek);
    await createItem(item.type, { ...enc, folderId: null, tags: item.tags ?? [], favorite: item.favorite, pinned: item.pinned, archived: item.archived });
    count++;
  }
  return { items: count };
}

export function toPasswordsCsv(entries: VaultEntry[], payloads: Record<string, VaultItemPayload | null>): string {
  const rows = [['Title', 'Username', 'Email', 'URL', 'Password']];
  for (const entry of entries) {
    if (entry.type !== 'password' && entry.type !== 'login') continue;
    const p = payloads[entry._id];
    if (!p) continue;
    const f = p.fields;
    rows.push([
      p.title ?? '',
      (f.username as string) ?? '',
      (f.email as string) ?? '',
      (f.url as string) ?? (f.website as string) ?? '',
      (f.password as string) ?? '',
    ]);
  }
  return rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}
