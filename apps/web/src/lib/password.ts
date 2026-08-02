export interface GeneratedPassword {
  value: string;
  entropy: number;
}

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?';

export function generatePassword(opts: { length?: number; upper?: boolean; lower?: boolean; digits?: boolean; symbols?: boolean } = {}): GeneratedPassword {
  const length = Math.min(Math.max(opts.length ?? 20, 8), 128);
  const upper = opts.upper ?? true;
  const lower = opts.lower ?? true;
  const digits = opts.digits ?? true;
  const symbols = opts.symbols ?? true;

  let pool = '';
  if (upper) pool += UPPER;
  if (lower) pool += LOWER;
  if (digits) pool += DIGITS;
  if (symbols) pool += SYMBOLS;
  if (!pool) pool = LOWER + DIGITS;

  const random = new Uint32Array(length);
  crypto.getRandomValues(random);

  let value = '';
  for (let i = 0; i < length; i++) value += pool[random[i] % pool.length];

  const required: string[] = [];
  if (upper) required.push(UPPER[random[0] % UPPER.length]);
  if (lower) required.push(LOWER[random[1] % LOWER.length]);
  if (digits) required.push(DIGITS[random[2] % DIGITS.length]);
  if (symbols) required.push(SYMBOLS[random[3] % SYMBOLS.length]);

  const arr = value.split('');
  for (let i = 0; i < required.length; i++) arr[i] = required[i];
  arr.sort(() => 0.5 - Math.random());
  value = arr.join('');

  const entropy = Math.log2(pool.length) * length;
  return { value, entropy };
}

export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string; percent: number } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score: clamped, label: labels[clamped], percent: (clamped + 1) * 20 };
}

export function classifyFile(name: string, mime: string): 'image' | 'video' | 'document' | 'zip' | 'other' {
  const lower = name.toLowerCase();
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg|heic)$/.test(lower)) return 'image';
  if (mime.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|m4v)$/.test(lower)) return 'video';
  if (mime.includes('zip') || /\.(zip|rar|7z|tar|gz)$/.test(lower)) return 'zip';
  if (mime.startsWith('application/pdf') || /\.(pdf|docx?|xlsx?|pptx?|txt|rtf|csv|odt)$/.test(lower)) return 'document';
  return 'other';
}

export interface PasswordHealthResult {
  weak: Array<{ title: string; username?: string }>;
  duplicate: Array<{ title: string }>;
  reused: Array<{ title: string; count: number }>;
}

export function analyzePasswords(entries: Array<{ title: string; username?: string; password: string }>): PasswordHealthResult {
  const weak: Array<{ title: string; username?: string }> = [];
  const byValue = new Map<string, Array<{ title: string }>>();
  const allValues = new Set<string>();

  for (const entry of entries) {
    if (!entry.password) continue;
    if (passwordStrength(entry.password).score <= 1) weak.push({ title: entry.title, username: entry.username });
    const bucket = byValue.get(entry.password) ?? [];
    bucket.push({ title: entry.title });
    byValue.set(entry.password, bucket);
    allValues.add(entry.password);
  }

  const duplicate: Array<{ title: string }> = [];
  const reused: Array<{ title: string; count: number }> = [];
  for (const [password, titles] of byValue) {
    if (titles.length > 1) {
      duplicate.push(...titles);
      reused.push({ title: titles[0].title, count: titles.length });
    }
  }
  void allValues;
  return { weak, duplicate, reused };
}
