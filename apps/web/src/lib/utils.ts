import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  const intervals: Array<[number, string]> = [
    [31536000, 'year'],
    [2592000, 'month'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
  ];
  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function initials(name?: string, email?: string): string {
  const source = name || email || '?';
  const parts = source.trim().split(/[\s@]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function generateDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = window.localStorage.getItem('vaultx_device_id');
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem('vaultx_device_id', id);
  }
  return id;
}

export function detectPlatform(): string {
  const ua = navigator.userAgent;
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  return 'Unknown';
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
