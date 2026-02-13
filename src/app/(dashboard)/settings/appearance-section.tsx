'use client';

import { useTheme } from '@/components/theme-provider';
import { useDensity } from '@/components/density-provider';
import { Label } from '@/components/ui/label';
import { Sun, Moon, Monitor, Rows3 } from 'lucide-react';
import type { Density } from '@/components/density-provider';

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { density, setDensity } = useDensity();

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium text-muted-foreground">Theme</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { value: 'light' as const, label: 'Light', icon: Sun },
            { value: 'dark' as const, label: 'Dark', icon: Moon },
            { value: 'system' as const, label: 'System', icon: Monitor },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                theme === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">System follows your device preference.</p>
      </div>
      <div>
        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Rows3 className="h-4 w-4" />
          Table density
        </Label>
        <select
          value={density}
          onChange={(e) => setDensity(e.target.value as Density)}
          className="mt-2 h-10 w-full max-w-xs rounded-xl border border-border bg-background px-3 text-sm"
        >
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
          <option value="spacious">Spacious</option>
        </select>
        <p className="mt-1.5 text-xs text-muted-foreground">Row spacing in tables and lists.</p>
      </div>
    </div>
  );
}
