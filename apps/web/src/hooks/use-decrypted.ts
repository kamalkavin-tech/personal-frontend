'use client';

import { useEffect, useState, useMemo } from 'react';
import type { VaultEntry } from '@vaultx/shared';
import { decryptEntryTitle, decryptItemPayload, VaultItemPayload } from '@/lib/vault';

export function useDecryptedTitles(entries: VaultEntry[] | undefined, dek: CryptoKey | null): Record<string, string> {
  const [titles, setTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!dek || !entries?.length) {
      setTitles({});
      return;
    }
    let alive = true;
    Promise.all(
      entries.map(async (entry) => {
        try {
          return [entry._id, await decryptEntryTitle(entry, dek)] as const;
        } catch {
          return [entry._id, 'Locked'] as const;
        }
      }),
    ).then((pairs) => {
      if (alive) setTitles(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
  }, [entries, dek]);

  return titles;
}

export function useDecryptedPayloads(entries: VaultEntry[] | undefined, dek: CryptoKey | null): Record<string, VaultItemPayload | null> {
  const [payloads, setPayloads] = useState<Record<string, VaultItemPayload | null>>({});

  useEffect(() => {
    if (!dek || !entries?.length) {
      setPayloads({});
      return;
    }
    let alive = true;
    Promise.all(
      entries.map(async (entry) => {
        try {
          return [entry._id, await decryptItemPayload(entry, dek)] as const;
        } catch {
          return [entry._id, null] as const;
        }
      }),
    ).then((pairs) => {
      if (alive) setPayloads(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
  }, [entries, dek]);

  return payloads;
}

export function useMemoized<T>(value: T): T {
  return useMemo(() => value, [JSON.stringify(value)]);
}
