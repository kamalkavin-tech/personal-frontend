'use client';

import { useState } from 'react';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import type { VaultEntry, VaultType } from '@vaultx/shared';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ITEM_TYPE_DEFS } from '@/lib/item-schemas';
import { VaultItemPayload } from '@/lib/vault';

interface Props {
  entry: VaultEntry | null;
  payload: VaultItemPayload | null;
  onClose: () => void;
}

export function ItemDetail({ entry, payload, onClose }: Props) {
  const [revealed, setRevealed] = useState(false);

  if (!entry || !payload) return null;
  const def = ITEM_TYPE_DEFS[entry.type as VaultType];

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{payload.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {def.fields.map((field) => {
            const value = payload.fields[field.key];
            const text = Array.isArray(value) ? value.join(', ') : (value ?? '');
            if (!text) return null;
            const isSecret = field.secret;
            return (
              <div key={field.key} className="rounded-lg border p-3">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</div>
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 break-all font-mono text-sm">
                    {isSecret && !revealed ? '••••••••••••' : text}
                  </span>
                  {isSecret && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRevealed((r) => !r)}>
                      {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(text)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          {payload.note && (
            <div className="rounded-lg border p-3">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</div>
              <p className="whitespace-pre-wrap text-sm">{payload.note}</p>
            </div>
          )}
          {payload.tags && payload.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {payload.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
