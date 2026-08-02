import type { VaultEntry, VaultType } from '@vaultx/shared';
import { encryptString, decryptString, EncBlob } from '@/lib/crypto';

export interface VaultItemPayload {
  title: string;
  fields: Record<string, string | string[]>;
  note?: string;
  favorite?: boolean;
  tags?: string[];
}

export async function encryptItemPayload(payload: VaultItemPayload, dek: CryptoKey): Promise<{ encrypted: string; iv: string; title: string }> {
  const enc = await encryptString(JSON.stringify(payload), dek);
  const titleEnc = await encryptString(payload.title, dek);
  return {
    encrypted: enc.data,
    iv: enc.iv,
    title: JSON.stringify(titleEnc),
  };
}

export async function decryptItemPayload(entry: Pick<VaultEntry, 'encrypted' | 'iv'>, dek: CryptoKey): Promise<VaultItemPayload> {
  const json = await decryptString({ data: entry.encrypted, iv: entry.iv }, dek);
  return JSON.parse(json) as VaultItemPayload;
}

export async function decryptEntryTitle(entry: Pick<VaultEntry, 'title'>, dek: CryptoKey): Promise<string> {
  try {
    const blob = JSON.parse(entry.title) as EncBlob;
    return await decryptString(blob, dek);
  } catch {
    return entry.title;
  }
}

export async function encryptName(name: string, dek: CryptoKey): Promise<{ encryptedName: string; iv: string }> {
  const enc = await encryptString(name, dek);
  return { encryptedName: enc.data, iv: enc.iv };
}

export async function decryptFileName(file: { encryptedName: string; iv: string }, dek: CryptoKey): Promise<string> {
  return decryptString({ data: file.encryptedName, iv: file.iv }, dek);
}

export function buildEmptyPayload(type: VaultType): VaultItemPayload {
  const fields: Record<string, string | string[]> = {};
  switch (type) {
    case 'login':
      fields.website = '';
      fields.username = '';
      fields.email = '';
      fields.password = '';
      fields.otp = '';
      break;
    case 'password':
      fields.username = '';
      fields.email = '';
      fields.password = '';
      fields.url = '';
      break;
    case 'note':
      break;
    case 'card':
      fields.cardType = '';
      fields.cardholder = '';
      fields.number = '';
      fields.expiry = '';
      fields.cvv = '';
      fields.bank = '';
      break;
    case 'identity':
      fields.identityType = 'Passport';
      fields.fullName = '';
      fields.number = '';
      fields.dob = '';
      fields.issueDate = '';
      fields.expiry = '';
      fields.issuingCountry = '';
      break;
    case 'apiKey':
      fields.service = '';
      fields.key = '';
      fields.secret = '';
      fields.expiry = '';
      fields.scopes = '';
      break;
    case 'secret':
      fields.kind = 'Recovery codes';
      fields.value = '';
      break;
    case 'journal':
      fields.mood = '';
      fields.date = new Date().toISOString().slice(0, 10);
      break;
    case 'address':
      fields.label = '';
      fields.line1 = '';
      fields.line2 = '';
      fields.city = '';
      fields.state = '';
      fields.postal = '';
      fields.country = '';
      break;
    case 'contact':
      fields.relationship = '';
      fields.phone = '';
      fields.email = '';
      fields.address = '';
      break;
  }
  return { title: '', fields, note: '' };
}
