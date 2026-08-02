'use client';

import { useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { Copy, Eye, EyeOff, MoreHorizontal, Pencil, Pin, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { VaultEntry, VaultType } from '@vaultx/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TypeIcon } from '@/components/vault/type-icon';
import { timeAgo } from '@/lib/utils';
import { VaultItemPayload } from '@/lib/vault';

interface Props {
  entry: VaultEntry;
  title: string;
  subtitle?: string;
  payload?: VaultItemPayload | null;
  dek: CryptoKey | null;
  onEdit: (entry: VaultEntry) => void;
  onToggleFavorite: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function EntryCard({ entry, title, subtitle, payload, dek, onEdit, onToggleFavorite, onTogglePin, onToggleArchive, onDelete }: Props) {
  const [revealed, setRevealed] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const secretPreview = useMemo(() => {
    if (!payload) return undefined;
    const secretValue = Object.values(payload.fields).find((v) => typeof v === 'string' && v.length > 0 && entry.type !== 'note' && entry.type !== 'journal');
    return typeof secretValue === 'string' ? secretValue : undefined;
  }, [payload, entry.type]);

  const copy = async (text: string | undefined) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <TypeIcon type={entry.type as VaultType} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{title}</h3>
              {entry.favorite && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
              {entry.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </div>
            {subtitle ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p> : <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(entry.updatedAt)}</p>}
          </div>
        </div>

        {secretPreview && secretPreview !== title && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5">
            <code className="flex-1 truncate font-mono text-xs text-muted-foreground">
              {revealed ? secretPreview : '••••••••••••'}
            </code>
            <button onClick={() => setRevealed((r) => !r)} className="text-muted-foreground hover:text-foreground">
              {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => copy(secretPreview)} className="text-muted-foreground hover:text-foreground">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(entry)}>
                <Pencil className="h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleFavorite(entry._id)}>
                <Star className="h-4 w-4" /> {entry.favorite ? 'Remove favorite' : 'Mark favorite'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTogglePin(entry._id)}>
                <Pin className="h-4 w-4" /> {entry.pinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleArchive(entry._id)}>
                {entry.archived ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(entry._id)}>
                <Trash2 className="h-4 w-4" /> Move to trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {void isDark}
      </CardContent>
    </Card>
  );
}
