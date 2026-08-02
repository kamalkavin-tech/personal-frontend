'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  FileArchive,
  FileText,
  Film,
  FolderPlus,
  ImageIcon,
  Loader2,
  Plus,
  Star,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import type { FileEntry, Album, FileKind } from '@vaultx/shared';
import { useAuth } from '@/context/auth-context';
import { useFiles, useAlbums, useVaultMutation } from '@/lib/queries';
import { useSearch } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/misc';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { encryptBytes } from '@/lib/crypto';
import { encryptName } from '@/lib/vault';
import { makeFileFormData, fetchDecryptedFile, downloadDecryptedFile, DecryptedFile } from '@/lib/file-ops';
import { classifyFile } from '@/lib/password';
import { cn, formatBytes, timeAgo } from '@/lib/utils';

interface Props {
  mode: 'files' | 'photos';
}

const KIND_TABS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'document', label: 'Documents' },
  { value: 'zip', label: 'ZIP' },
  { value: 'other', label: 'Other' },
];

export function FilesPage({ mode }: Props) {
  const { dek } = useAuth();
  const { query } = useSearch();
  const { data: entries, isLoading } = useFiles();
  const { data: albums } = useAlbums();
  const mutations = useVaultMutation();

  const [tab, setTab] = useState('all');
  const [albumFilter, setAlbumFilter] = useState('all');
  const [albumDialog, setAlbumDialog] = useState(false);
  const [albumName, setAlbumName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<FileEntry | null>(null);
  const [preview, setPreview] = useState<DecryptedFile | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const visible = (entries ?? []).filter((entry) => {
    if (mode === 'photos' && entry.kind !== 'image' && entry.kind !== 'video') return false;
    if (tab !== 'all' && entry.kind !== tab) return false;
    if (albumFilter !== 'all' && entry.albumId !== albumFilter) return false;
    const q = query.trim().toLowerCase();
    if (q && !(names[entry._id] ?? '').toLowerCase().includes(q)) return false;
    return true;
  });

  const decryptNames = useCallback(async () => {
    if (!dek || !entries) return;
    const { decryptString } = await import('@/lib/crypto');
    const map: Record<string, string> = {};
    await Promise.all(
      entries.map(async (entry) => {
        try {
          map[entry._id] = await decryptString({ data: entry.encryptedName, iv: entry.iv }, dek);
        } catch {
          map[entry._id] = `vault-file-${entry._id.slice(0, 6)}`;
        }
      }),
    );
    setNames(map);
  }, [entries, dek]);

  const decryptThumbs = useCallback(async () => {
    if (!dek || !entries) return;
    const imageEntries = entries.filter((e) => e.kind === 'image');
    const map: Record<string, string> = {};
    await Promise.all(
      imageEntries.map(async (entry) => {
        try {
          const dec = await fetchDecryptedFile(entry, dek);
          map[entry._id] = dec.url;
        } catch {
          /* skip */
        }
      }),
    );
    setThumbs(map);
  }, [entries, dek]);

  useEffect(() => {
    void decryptNames();
  }, [decryptNames]);

  useEffect(() => {
    void decryptThumbs();
    return () => {
      Object.values(thumbs).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [decryptThumbs]);

  const uploadFiles = async (files: FileList | File[]) => {
    if (!dek) return;
    setUploading(true);
    let count = 0;
    try {
      for (const file of Array.from(files)) {
        const kind = classifyFile(file.name, file.type);
        const buffer = await file.arrayBuffer();
        const enc = await encryptBytes(buffer, dek);
        const encName = await encryptName(file.name, dek);
        const form = makeFileFormData(file, enc.data, enc.iv, encName, { kind, albumId: albumFilter === 'all' ? undefined : albumFilter });
        await mutations.invalidateFiles();
        await apiUpload(form);
        count++;
      }
      toast.success(`Encrypted & uploaded ${count} file${count > 1 ? 's' : ''}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const apiUpload = async (form: FormData) => {
    const { api } = await import('@/lib/api');
    await api.upload('/files', form);
    await mutations.invalidateFiles();
  };

  const openPreview = async (entry: FileEntry) => {
    if (!dek) return;
    setSelected(entry);
    if (entry.kind === 'image' || entry.kind === 'video') {
      setPreviewLoading(true);
      try {
        setPreview(await fetchDecryptedFile(entry, dek));
      } catch {
        toast.error('Could not decrypt this file');
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const KindIcon = (kind: FileKind) => {
    if (kind === 'image') return <ImageIcon className="h-5 w-5" />;
    if (kind === 'video') return <Film className="h-5 w-5" />;
    if (kind === 'zip') return <FileArchive className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{mode === 'photos' ? 'Photo Vault' : 'File Vault'}</h1>
          <p className="text-sm text-muted-foreground">
            Files are encrypted with your master password before upload, decrypted locally on download.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'photos' && (
            <Button variant="outline" onClick={() => setAlbumDialog(true)}>
              <FolderPlus className="h-4 w-4" /> New album
            </Button>
          )}
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {uploading ? 'Encrypting…' : 'Upload'}
          </Button>
          <input ref={fileInputRef} type="file" multiple hidden onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
        </div>
      </div>

      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
        }}
      >
        <UploadCloud className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Drag & drop files here</p>
        <p className="text-xs text-muted-foreground">They&apos;re encrypted in your browser before anything is sent.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {KIND_TABS.filter((t) => (mode === 'photos' ? t.value === 'all' || t.value === 'image' || t.value === 'video' : true)).map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {mode === 'photos' && albums && albums.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setAlbumFilter('all')} className={cn('rounded-full px-3 py-1 text-xs font-medium', albumFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent')}>
              All albums
            </button>
            {albums.map((album) => (
              <button key={album._id} onClick={() => setAlbumFilter(album._id)} className={cn('rounded-full px-3 py-1 text-xs font-medium', albumFilter === album._id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent')}>
                {album.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">No {mode === 'photos' ? 'photos' : 'files'} here yet.</CardContent>
        </Card>
      ) : (
        <motion.div layout className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((entry) => (
            <motion.div key={entry._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="group cursor-pointer overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md" onClick={() => openPreview(entry)}>
                {thumbs[entry._id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbs[entry._id]} alt="" className="h-40 w-full object-cover" />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-muted/50 text-muted-foreground">{KindIcon(entry.kind)}</div>
                )}
                <div className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{names[entry._id] ?? '…'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(entry.size)} · {timeAgo(entry.createdAt)}
                    </p>
                  </div>
                  {entry.favorite && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />}
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={() => downloadDecryptedFile(entry, dek!).catch(() => toast.error('Download failed'))}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => mutations.deleteFile.mutateAsync(entry._id).then(() => toast.success('Moved to trash'))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{selected ? (names[selected._id] ?? 'File') : ''}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {previewLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : preview ? (
                preview.blob.type.startsWith('video') ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={preview.url} controls className="max-h-96 w-full rounded-lg bg-black" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview.url} alt={preview.name} className="max-h-96 w-full rounded-lg object-contain" />
                )
              ) : (
                <div className="flex h-40 items-center justify-center text-muted-foreground">
                  {KindIcon(selected.kind)} Preview not available
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Badge variant="secondary">{selected.kind}</Badge>
                <span className="text-muted-foreground">{formatBytes(selected.size)}</span>
                <span className="text-muted-foreground">{selected.mime}</span>
                <span className="text-muted-foreground">Uploaded {timeAgo(selected.createdAt)}</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => mutations.toggleFileFavorite.mutateAsync(selected!._id)}>
              <Star className={cn('h-4 w-4', selected?.favorite && 'fill-amber-400 text-amber-400')} /> {selected?.favorite ? 'Unfavorite' : 'Favorite'}
            </Button>
            <Button variant="outline" onClick={() => downloadDecryptedFile(selected!, dek!).catch(() => toast.error('Download failed'))}>
              <Download className="h-4 w-4" /> Download decrypted
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={albumDialog} onOpenChange={setAlbumDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New album</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Album name</Label>
            <Input value={albumName} onChange={(e) => setAlbumName(e.target.value)} placeholder="Trip, Family, Documents…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlbumDialog(false)}>
              Cancel
            </Button>
            <Button
              disabled={!albumName.trim()}
              onClick={async () => {
                const { api } = await import('@/lib/api');
                await api.post('/files/albums', { name: albumName.trim() });
                setAlbumName('');
                setAlbumDialog(false);
                await mutations.invalidateFiles();
                toast.success('Album created');
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
