const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toB64(buffer: ArrayBuffer | Uint8Array<ArrayBuffer>): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toB64(bytes);
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function pbkdf2(password: string, salt: string, iterations: number): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey', 'deriveBits']);
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromB64(salt), iterations, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
}

async function hkdfExpand(ikm: ArrayBuffer, info: string, length = 32): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'HKDF', salt: new Uint8Array(0), info: encoder.encode(info), hash: 'SHA-256' }, key, length * 8);
}

export interface DerivedKeys {
  kek: CryptoKey;
  authKeyHex: string;
}

/** Derive the Key-Encryption-Key (for unwrapping the DEK) and an auth key (sent to the server). */
export async function deriveKeys(masterPassword: string, kekSalt: string, authSalt: string, iterations: number): Promise<DerivedKeys> {
  const master = await pbkdf2(masterPassword, authSalt, iterations);
  const [authBits, kekBits] = await Promise.all([hkdfExpand(master, 'vaultx-auth'), hkdfExpand(master, 'vaultx-kek')]);
  const kek = await crypto.subtle.importKey('raw', kekBits, 'AES-GCM', false, ['encrypt', 'decrypt']);
  return { kek, authKeyHex: bufToHex(authBits) };
}

export async function generateDEK(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toB64(bytes);
}

export async function importDEK(dek: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromB64(dek), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export interface EncBlob {
  data: string;
  iv: string;
}

export async function wrapDEK(dek: string, kek: CryptoKey): Promise<EncBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, fromB64(dek));
  return { data: toB64(enc), iv: toB64(iv) };
}

export async function unwrapDEK(wrapped: string, kek: CryptoKey): Promise<string> {
  const blob = JSON.parse(wrapped) as EncBlob;
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(blob.iv) }, kek, fromB64(blob.data));
  return toB64(dec);
}

export async function encryptString(plaintext: string, key: CryptoKey): Promise<EncBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  return { data: toB64(enc), iv: toB64(iv) };
}

export async function decryptString(blob: EncBlob, key: CryptoKey): Promise<string> {
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(blob.iv) }, key, fromB64(blob.data));
  return decoder.decode(dec);
}

export async function encryptBytes(bytes: ArrayBuffer, key: CryptoKey): Promise<{ data: ArrayBuffer; iv: Uint8Array<ArrayBuffer> }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  return { data: enc, iv };
}

export async function decryptBytes(data: ArrayBuffer, iv: Uint8Array<ArrayBuffer>, key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
}

export async function encryptStringWithPassword(plaintext: string, password: string, iterations = 310_000): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  const payload = new Uint8Array(4 + salt.length + 12 + enc.byteLength);
  const view = new DataView(payload.buffer);
  view.setUint32(0, iterations, false);
  payload.set(salt, 4);
  payload.set(iv, 4 + 16);
  payload.set(new Uint8Array(enc), 4 + 16 + 12);
  return `vx1:${toB64(payload)}`;
}

export async function decryptStringWithPassword(blob: string, password: string): Promise<string> {
  if (!blob.startsWith('vx1:')) throw new Error('Unsupported format');
  const payload = fromB64(blob.slice(4));
  const view = new DataView(payload.buffer);
  const iterations = view.getUint32(0, false);
  const salt = payload.slice(4, 4 + 16);
  const iv = payload.slice(4 + 16, 4 + 16 + 12);
  const data = payload.slice(4 + 16 + 12);
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return decoder.decode(dec);
}

export { toB64, fromB64 };
