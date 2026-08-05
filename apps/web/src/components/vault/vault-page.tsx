'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FolderPlus, Plus, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import type { Folder, VaultEntry, VaultType } from '@vaultx/shared';
import { useAuth } from '@/context/auth-context';
import { useVaultEntries, useFolders, useVaultMutation } from '@/lib/queries';
import { useDecryptedTitles, useDecryptedPayloads } from '@/hooks/use-decrypted';
import { useSearch } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/misc';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TypeIcon } from '@/components/vault/type-icon';
import { EntryCard } from '@/components/vault/entry-card';
import { ItemEditor } from '@/components/vault/item-editor';
import { ItemDetail } from '@/components/vault/item-detail';
import { VaultItemPayload } from '@/lib/vault';
import { cn } from '@/lib/utils';

interface Props {
  type: VaultType;
  title: string;
  description?: string;
}

type View = 'all' | 'favorites' | 'archived';

const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const itemVariants = { hidden: { opacity: 0, y: 14, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1 } };

export function VaultPage({ type, title, description }: Props) {
  const { dek } = useAuth();
  const { query } = useSearch();
  const { data: entries, isLoading } = useVaultEntries(type);
  const { data: folders } = useFolders(type);
  const titles = useDecryptedTitles(entries, dek);
  const payloads = useDecryptedPayloads(entries, dek);
  const mutations = useVaultMutation();

  const [view, setView] = useState<View>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<{ entry: VaultEntry; payload: VaultItemPayload } | null>(null);
  const [detail, setDetail] = useState<{ entry: VaultEntry; payload: VaultItemPayload } | null>(null);
  const [folderDialog, setFolderDialog] = useState(false);
  const [folderName, setFolderName] = useState('');

  const searchable = useMemo(() => {
    const map: Record<string, string> = {};
    for (const entry of entries ?? []) {
      const payload = payloads[entry._id];
      const parts = [titles[entry._id] ?? '', ...(payload ? Object.values(payload.fields).map((v) => (Array.isArray(v) ? v.join(' ') : v)) : []), ...(payload?.tags ?? [])];
      map[entry._id] = parts.join(' ').toLowerCase();
    }
    return map;
  }, [entries, payloads, titles]);

  const filtered = useMemo(() => {
    const list = (entries ?? []).filter((entry) => {
      if (view === 'favorites' && !entry.favorite) return false;
      if (view === 'archived' && !entry.archived) return false;
      if (view === 'all' && entry.archived) return false;
      if (selectedFolder !== 'all' && entry.folderId !== selectedFolder) return false;
      const q = query.trim().toLowerCase();
      if (q && !searchable[entry._id]?.includes(q)) return false;
      return true;
    });
    return list.sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [entries, view, selectedFolder, query, searchable]);

  const handleSave = async (encrypted: { encrypted: string; iv: string; title: string; folderId?: string | null; tags?: string[] }, id?: string) => {
    if (id) {
      await mutations.updateEntry.mutateAsync({ id, patch: encrypted });
    } else {
      await mutations.createEntry.mutateAsync({ type, ...encrypted });
    }
  };

  const togglePatch = (entry: VaultEntry, patch: Partial<VaultEntry>) => mutations.updateEntry.mutateAsync({ id: entry._id, patch });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <TypeIcon type={type} />
          <div>
            <h1 className="text-gradient text-xl font-bold tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setFolderDialog(true)}>
            <FolderPlus className="h-4 w-4" /> New folder
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New {title.replace(/s$/, '').toLowerCase()}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedFolder('all')}
            className={cn('rounded-full px-3 py-1 text-xs font-medium transition-colors', selectedFolder === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent')}
          >
            All folders
          </button>
          {folders?.map((folder: Folder) => (
            <button
              key={folder._id}
              onClick={() => setSelectedFolder(folder._id)}
              className={cn('rounded-full px-3 py-1 text-xs font-medium transition-colors', selectedFolder === folder._id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent')}
            >
              <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: folder.color }} />
              {folder.name}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <SearchX className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">Nothing here yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {query ? 'No items match your search.' : 'Create your first encrypted item. It never leaves this device without being encrypted.'}
            </p>
            {!query && (
              <Button onClick={() => setEditorOpen(true)}>
                <Plus className="h-4 w-4" /> Create item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <motion.div layout variants={listVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <motion.div key={entry._id} layout variants={itemVariants}>
              <div onClick={() => setDetail({ entry, payload: payloads[entry._id] ?? { title: titles[entry._id] ?? '', fields: {}, tags: [] } })} className="cursor-pointer">
                <EntryCard
                  entry={entry}
                  title={titles[entry._id] ?? '…'}
                  payload={payloads[entry._id]}
                  dek={dek}
                  onEdit={(e) => {
                    setEditing({ entry: e, payload: payloads[e._id] ?? { title: titles[e._id] ?? '', fields: {}, tags: [] } });
                    setEditorOpen(true);
                  }}
                  onToggleFavorite={(id) => togglePatch(entry, { favorite: !entry.favorite })}
                  onTogglePin={(id) => togglePatch(entry, { pinned: !entry.pinned })}
                  onToggleArchive={(id) => togglePatch(entry, { archived: !entry.archived })}
                  onDelete={(id) => mutations.softDelete.mutateAsync(id).then(() => toast.success('Moved to trash'))}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <ItemEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        type={type}
        initial={editing}
        defaultFolderId={selectedFolder === 'all' ? null : selectedFolder}
        folders={folders ?? []}
        dek={dek}
        onSave={handleSave}
      />

      <ItemDetail entry={detail?.entry ?? null} payload={detail?.payload ?? null} onClose={() => setDetail(null)} />

      <Dialog open={folderDialog} onOpenChange={setFolderDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Folder name</Label>
            <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Work, Family, Banking…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialog(false)}>
              Cancel
            </Button>
            <Button
              disabled={!folderName.trim()}
              onClick={async () => {
                await mutations.createFolder.mutateAsync({ name: folderName.trim(), type });
                setFolderName('');
                setFolderDialog(false);
                toast.success('Folder created');
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
