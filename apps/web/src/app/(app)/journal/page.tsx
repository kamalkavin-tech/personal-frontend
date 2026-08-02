'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookHeart, CalendarDays, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Folder, VaultEntry } from '@vaultx/shared';
import { useAuth } from '@/context/auth-context';
import { useVaultEntries, useFolders, useVaultMutation } from '@/lib/queries';
import { useDecryptedPayloads, useDecryptedTitles } from '@/hooks/use-decrypted';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/misc';
import { ItemEditor } from '@/components/vault/item-editor';
import { ItemDetail } from '@/components/vault/item-detail';
import { VaultItemPayload } from '@/lib/vault';
import { formatDate } from '@/lib/utils';

export default function JournalPage() {
  const { dek } = useAuth();
  const { data: entries, isLoading } = useVaultEntries('journal');
  const { data: folders } = useFolders('journal');
  const titles = useDecryptedTitles(entries, dek);
  const payloads = useDecryptedPayloads(entries, dek);
  const mutations = useVaultMutation();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<{ entry: VaultEntry; payload: VaultItemPayload } | null>(null);
  const [detail, setDetail] = useState<{ entry: VaultEntry; payload: VaultItemPayload } | null>(null);

  const sorted = useMemo(() => {
    return (entries ?? []).slice().sort((a, b) => {
      const da = (payloads[a._id]?.fields?.date as string) ?? '';
      const db = (payloads[b._id]?.fields?.date as string) ?? '';
      return db.localeCompare(da) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [entries, payloads]);

  const handleSave = async (encrypted: { encrypted: string; iv: string; title: string; folderId?: string | null; tags?: string[] }, id?: string) => {
    if (id) {
      await mutations.updateEntry.mutateAsync({ id, patch: encrypted });
    } else {
      await mutations.createEntry.mutateAsync({ type: 'journal', ...encrypted });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Personal Journal</h1>
          <p className="text-sm text-muted-foreground">Private, encrypted daily entries with mood tracking.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New entry
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <BookHeart className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">Start writing</p>
            <p className="text-sm text-muted-foreground">Your journal entries are stored encrypted and only visible to you.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((entry) => {
            const payload = payloads[entry._id];
            const date = (payload?.fields?.date as string) ?? '';
            const mood = (payload?.fields?.mood as string) ?? '';
            const content = (payload?.fields?.content as string) ?? '';
            return (
              <motion.div key={entry._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div onClick={() => setDetail({ entry, payload: payload ?? { title: '', fields: {}, tags: [] } })} className="cursor-pointer">
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{mood || '📖'}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold">{titles[entry._id] ?? formatDate(date || entry.updatedAt)}</h3>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <CalendarDays className="h-3 w-3" />
                              {date ? formatDate(date) : formatDate(entry.updatedAt)}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <ItemEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        type="journal"
        initial={editing}
        folders={folders ?? []}
        dek={dek}
        onSave={handleSave}
      />
      <ItemDetail entry={detail?.entry ?? null} payload={detail?.payload ?? null} onClose={() => setDetail(null)} />
    </div>
  );
}
