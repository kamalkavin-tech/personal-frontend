'use client';

import { useRef, useState } from 'react';
import { CloudUpload, DatabaseBackup, Download, FileJson, KeyRound, Loader2, Lock, RotateCcw, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { VaultType } from '@vaultx/shared';
import { useAuth } from '@/context/auth-context';
import { useBackups, useVaultEntries, useFiles, useVaultMutation } from '@/lib/queries';
import { useDecryptedPayloads } from '@/hooks/use-decrypted';
import { api, API_URL, getAccessToken } from '@/lib/api';
import { buildExportBundle, exportPlainJson, exportEncryptedJson, importBundle, toPasswordsCsv } from '@/lib/backup';
import { downloadBlob, timeAgo, formatBytes } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/misc';

export default function BackupPage() {
  const { dek } = useAuth();
  const { data: backups, isLoading } = useBackups();
  const { data: entries } = useVaultEntries('all');
  const { data: files } = useFiles();
  const payloads = useDecryptedPayloads(entries, dek);
  const mutations = useVaultMutation();

  const [creating, setCreating] = useState(false);
  const [passDialog, setPassDialog] = useState<null | 'encrypted' | 'import'>(null);
  const [passphrase, setPassphrase] = useState('');
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createSnapshot = async () => {
    setCreating(true);
    try {
      const backup = await api.post<{ _id: string }>('/backup');
      toast.success('Encrypted snapshot created');
      void backup;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setCreating(false);
    }
  };

  const doClientExport = async (mode: 'plain' | 'csv' | 'encrypted') => {
    if (!dek) return;
    try {
      const bundle = await buildExportBundle(entries ?? [], files ?? [], dek);
      if (mode === 'plain') {
        const json = await exportPlainJson(bundle);
        downloadBlob(new Blob([json], { type: 'application/json' }), `vaultx-export-${Date.now()}.json`);
        toast.success('Plain JSON exported');
      } else if (mode === 'csv') {
        const csv = toPasswordsCsv(entries ?? [], payloads);
        downloadBlob(new Blob([csv], { type: 'text/csv' }), `vaultx-passwords-${Date.now()}.csv`);
        toast.success('Passwords exported to CSV');
      } else {
        setPassDialog('encrypted');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const confirmEncryptedExport = async () => {
    if (!dek) return;
    if (passphrase.length < 8) {
      toast.error('Passphrase must be at least 8 characters');
      return;
    }
    try {
      const bundle = await buildExportBundle(entries ?? [], files ?? [], dek);
      const content = await exportEncryptedJson(bundle, passphrase);
      downloadBlob(new Blob([content], { type: 'application/octet-stream' }), `vaultx-backup-encrypted-${Date.now()}.vaultx`);
      toast.success('Encrypted backup downloaded');
      setPassDialog(null);
      setPassphrase('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const doImport = async (file: File) => {
    if (!dek) return;
    const content = await file.text();
    if (content.startsWith('vx1:')) {
      setPassphrase('');
      setPassDialog('import');
      sessionStorage.setItem('vaultx_import_pending', content);
    } else {
      await runImport(content, undefined);
    }
  };

  const runImport = async (content: string, pass: string | undefined) => {
    if (!dek) return;
    try {
      const result = await importBundle(content, pass, dek, (type, enc) =>
        mutations.createEntry.mutateAsync({ type: type as VaultType, ...enc }),
      );
      toast.success(`Imported ${result.items} items`);
      setPassDialog(null);
      setPassphrase('');
      sessionStorage.removeItem('vaultx_import_pending');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    }
  };

  const confirmImport = () => {
    const content = sessionStorage.getItem('vaultx_import_pending');
    if (content) void runImport(content, passphrase);
  };

  const downloadSnapshot = async (id: string, filename: string) => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/backup/${id}/download`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Download failed');
      downloadBlob(await res.blob(), filename);
      toast.success('Snapshot downloaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Backup & Restore</h1>
        <p className="text-sm text-muted-foreground">Keep an encrypted copy of your vault. Your data is encrypted with your master password everywhere.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CloudUpload className="h-4 w-4 text-primary" /> Cloud snapshot
            </CardTitle>
            <CardDescription>Server-side encrypted snapshot of all your entries.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={createSnapshot} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />}
              {creating ? 'Creating…' : 'Create snapshot'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileJson className="h-4 w-4 text-primary" /> Export JSON
            </CardTitle>
            <CardDescription>Download all decrypted items as a JSON file.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => doClientExport('plain')}>
              <Download className="h-4 w-4" /> Export JSON
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-primary" /> Encrypted backup
            </CardTitle>
            <CardDescription>Export with a separate passphrase for extra safety.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => doClientExport('encrypted')}>
              <KeyRound className="h-4 w-4" /> Encrypted export
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Upload className="h-4 w-4 text-primary" /> Import / CSV
            </CardTitle>
            <CardDescription>Restore from export or download passwords as CSV.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Import backup
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => doClientExport('csv')}>
              <FileJson className="h-4 w-4" /> Export passwords CSV
            </Button>
            <input ref={fileInputRef} type="file" hidden accept=".json,.vaultx" onChange={(e) => e.target.files && doImport(e.target.files[0])} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Snapshots</CardTitle>
          <CardDescription>Download or restore a server-side encrypted snapshot. Restoring replaces your current entries.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : !backups?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No snapshots yet.</p>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div key={backup._id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                  <DatabaseBackup className="h-5 w-5 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{backup.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(backup.size)} · {timeAgo(backup.createdAt)}
                      {backup.restoredAt ? ` · restored ${timeAgo(backup.restoredAt)}` : ''}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => downloadSnapshot(backup._id, backup.filename)}>
                    <Download className="h-4 w-4" /> Download
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setRestoreTarget(backup._id)} disabled={restoring}>
                    <RotateCcw className="h-4 w-4" /> Restore
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => api.delete(`/backup/${backup._id}`).then(() => toast.success('Snapshot deleted'))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={passDialog !== null} onOpenChange={(open) => !open && setPassDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{passDialog === 'encrypted' ? 'Encrypt backup' : 'Decrypt backup'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{passDialog === 'encrypted' ? 'Passphrase for this backup' : 'Enter the passphrase used to encrypt this backup'}</Label>
            <Input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="••••••••" />
            {passDialog === 'encrypted' && <p className="text-xs text-muted-foreground">You'll need this passphrase to import the backup later. Don't lose it!</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPassDialog(null)}>
              Cancel
            </Button>
            <Button onClick={passDialog === 'encrypted' ? confirmEncryptedExport : confirmImport}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!restoreTarget} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              Restoring will replace all of your current vault items, folders and albums with the snapshot contents. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!restoreTarget) return;
                setRestoring(true);
                try {
                  const result = await api.post<{ restored: number }>(`/backup/${restoreTarget}/restore`);
                  toast.success(`Restored ${result.restored} items`);
                  await mutations.invalidateVault();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Restore failed');
                } finally {
                  setRestoring(false);
                  setRestoreTarget(null);
                }
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
