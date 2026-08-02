'use client';

import { useState } from 'react';
import { Trash2, RotateCcw, XCircle, FolderLock } from 'lucide-react';
import { toast } from 'sonner';
import type { VaultEntry, VaultType } from '@vaultx/shared';
import { useAuth } from '@/context/auth-context';
import { useVaultEntries, useFiles, useVaultMutation } from '@/lib/queries';
import { useDecryptedTitles } from '@/hooks/use-decrypted';
import { useSearch } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TypeIcon } from '@/components/vault/type-icon';
import { timeAgo } from '@/lib/utils';

export default function TrashPage() {
  const { dek } = useAuth();
  const { query } = useSearch();
  const { data: entries } = useVaultEntries('all', { trash: true });
  const { data: files } = useFiles({ trash: true });
  const titles = useDecryptedTitles(entries, dek);
  const mutations = useVaultMutation();
  const [tab, setTab] = useState('items');

  const visibleEntries = (entries ?? []).filter((e) => !query || (titles[e._id] ?? '').toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Trash</h1>
          <p className="text-sm text-muted-foreground">Items stay here until you permanently delete them or empty the trash.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" onClick={() => mutations.emptyTrash.mutateAsync().then(() => toast.success('Vault trash emptied'))}>
            <Trash2 className="h-4 w-4" /> Empty items trash
          </Button>
          <Button variant="destructive" onClick={() => mutations.emptyFileTrash.mutateAsync().then(() => toast.success('File trash emptied'))}>
            <XCircle className="h-4 w-4" /> Empty file trash
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="items">Items ({entries?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="files">Files ({files?.length ?? 0})</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'items' && (
        <div className="space-y-2">
          {visibleEntries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">No items in trash.</CardContent>
            </Card>
          ) : (
            visibleEntries.map((entry) => (
              <Card key={entry._id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <TypeIcon type={entry.type as VaultType} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{titles[entry._id] ?? '…'}</p>
                    <p className="text-xs text-muted-foreground">Deleted {entry.deletedAt ? timeAgo(entry.deletedAt) : ''}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => mutations.restoreEntry.mutateAsync(entry._id).then(() => toast.success('Restored'))}>
                    <RotateCcw className="h-4 w-4" /> Restore
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => mutations.permanentDelete.mutateAsync(entry._id).then(() => toast.success('Deleted permanently'))}>
                    <XCircle className="h-4 w-4" /> Delete forever
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'files' && (
        <div className="space-y-2">
          {!files?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
                <FolderLock className="h-8 w-8 text-muted-foreground/50" />
                No files in trash.
              </CardContent>
            </Card>
          ) : (
            files.map((file) => (
              <Card key={file._id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <FolderLock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">Encrypted file {file._id.slice(-6)}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.kind} · {timeAgo(file.createdAt)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => mutations.restoreFile.mutateAsync(file._id).then(() => toast.success('Restored'))}>
                    <RotateCcw className="h-4 w-4" /> Restore
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => mutations.permanentDeleteFile.mutateAsync(file._id).then(() => toast.success('Deleted permanently'))}>
                    <XCircle className="h-4 w-4" /> Delete forever
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
