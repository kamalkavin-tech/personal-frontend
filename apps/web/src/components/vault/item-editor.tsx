'use client';

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Folder, VaultType, VaultEntry } from '@vaultx/shared';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ITEM_TYPE_DEFS, MOODS, FieldDef } from '@/lib/item-schemas';
import { VaultItemPayload, buildEmptyPayload, encryptItemPayload } from '@/lib/vault';
import { generatePassword, passwordStrength } from '@/lib/password';
import { Progress } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: VaultType;
  initial?: { entry: VaultEntry; payload: VaultItemPayload } | null;
  defaultFolderId?: string | null;
  folders: Folder[];
  dek: CryptoKey | null;
  onSave: (encrypted: { encrypted: string; iv: string; title: string; folderId?: string | null; tags?: string[] }, id?: string) => Promise<void>;
}

export function ItemEditor({ open, onOpenChange, type, initial, defaultFolderId, folders, dek, onSave }: Props) {
  const def = ITEM_TYPE_DEFS[type];
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<Record<string, string | string[]>>({});
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [folderId, setFolderId] = useState<string>('none');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial?.payload) {
        setTitle(initial.payload.title ?? '');
        setFields(initial.payload.fields ?? {});
        setNote(initial.payload.note ?? '');
        setTags(initial.payload.tags ?? []);
        setFolderId(initial.entry.folderId ?? 'none');
      } else {
        const empty = buildEmptyPayload(type);
        setTitle('');
        setFields(empty.fields);
        setNote('');
        setTags([]);
        setFolderId(defaultFolderId ?? 'none');
      }
    }
  }, [open, initial, type, defaultFolderId]);

  const setField = (key: string, value: string | string[]) => setFields((f) => ({ ...f, [key]: value }));

  const renderField = (field: FieldDef) => {
    const value = (fields[field.key] as string) ?? '';
    if (field.kind === 'select') {
      return (
        <Select value={value} onValueChange={(v) => setField(field.key, v)}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (field.kind === 'mood') {
      return (
        <div className="flex flex-wrap gap-1">
          {MOODS.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => setField(field.key, mood)}
              className={cn('rounded-lg p-2 text-xl transition-all hover:scale-110', value === mood && 'bg-primary/15 ring-2 ring-primary')}
            >
              {mood}
            </button>
          ))}
        </div>
      );
    }
    if (field.kind === 'textarea') {
      return <Textarea value={value} onChange={(e) => setField(field.key, e.target.value)} placeholder={field.placeholder} rows={field.key === 'content' ? 10 : 4} />;
    }
    return (
      <div className="relative">
        <Input
          type={field.kind === 'password' ? 'text' : field.kind === 'date' ? 'date' : 'text'}
          value={value}
          onChange={(e) => setField(field.key, e.target.value)}
          placeholder={field.placeholder}
        />
        {field.kind === 'password' && value && (
          <div className="mt-1.5 flex items-center gap-2">
            <Progress value={passwordStrength(value).percent} className="h-1.5 flex-1" />
            <span className="text-[10px] text-muted-foreground">{passwordStrength(value).label}</span>
          </div>
        )}
        {field.secret && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-7 w-7"
            title="Generate"
            onClick={() => setField(field.key, generatePassword({ length: 24 }).value)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!dek) return;
    setSaving(true);
    try {
      const payload: VaultItemPayload = { title: title.trim(), fields, note, tags };
      const encrypted = await encryptItemPayload(payload, dek);
      await onSave({ ...encrypted, folderId: folderId === 'none' ? null : folderId, tags }, initial?.entry._id);
      toast.success(initial ? 'Item updated' : 'Item saved');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit item' : `New ${def.type}`}</DialogTitle>
          <DialogDescription>Everything here is encrypted with your master password before it leaves this device.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give it a name…" autoFocus />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {def.fields.map((field) => (
              <div key={field.key} className={cn('space-y-2', field.span && 'sm:col-span-2')}>
                <Label>{field.label}</Label>
                {renderField(field)}
              </div>
            ))}
          </div>
          {def.supportsNote && (
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Optional notes…" />
            </div>
          )}
          {def.supportsTags && (
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap items-center gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">
                    {tag}
                    <button type="button" onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  onBlur={addTag}
                  placeholder="Add tag + Enter"
                  className="h-7 w-40 text-xs"
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Folder</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger>
                <SelectValue placeholder="No folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No folder</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder._id} value={folder._id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Encrypting…' : 'Save & encrypt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
