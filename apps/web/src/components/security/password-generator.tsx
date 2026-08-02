'use client';

import { useState } from 'react';
import { Copy, Dices, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { generatePassword, passwordStrength } from '@/lib/password';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox, Progress } from '@/components/ui/misc';
import { Card, CardContent } from '@/components/ui/card';

export function PasswordGenerator() {
  const [length, setLength] = useState(20);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [value, setValue] = useState('');
  const [copied, setCopied] = useState(false);

  const regenerate = () => setValue(generatePassword({ length, upper, lower, digits, symbols }).value);

  const strength = value ? passwordStrength(value) : null;

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success('Password copied');
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex gap-2">
          <Input readOnly value={value} placeholder="Generated password appears here" className="font-mono" onClick={() => value && copy()} />
          <Button variant="outline" onClick={regenerate} title="Generate">
            <Dices className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={copy} disabled={!value}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        {strength && (
          <div className="flex items-center gap-2">
            <Progress value={strength.percent} className="flex-1" />
            <span className="text-xs text-muted-foreground">{strength.label}</span>
          </div>
        )}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Length</Label>
            <span className="text-sm font-medium">{length}</span>
          </div>
          <input type="range" min={8} max={64} value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Uppercase (A-Z)', value: upper, set: setUpper },
            { label: 'Lowercase (a-z)', value: lower, set: setLower },
            { label: 'Digits (2-9)', value: digits, set: setDigits },
            { label: 'Symbols (!@#)', value: symbols, set: setSymbols },
          ].map((opt) => (
            <div key={opt.label} className="flex items-center gap-2">
              <Checkbox id={opt.label} checked={opt.value} onCheckedChange={(c) => opt.set(c === true)} />
              <label htmlFor={opt.label} className="text-xs">
                {opt.label}
              </label>
            </div>
          ))}
        </div>
        <Button variant="ghost" className="w-full" onClick={regenerate}>
          <RefreshCw className="h-4 w-4" /> Generate
        </Button>
      </CardContent>
    </Card>
  );
}
