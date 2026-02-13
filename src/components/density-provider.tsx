'use client';

import * as React from 'react';

export type Density = 'compact' | 'comfortable' | 'spacious';

type DensityProviderProps = {
  children: React.ReactNode;
  defaultDensity?: Density;
  storageKey?: string;
};

type DensityProviderState = {
  density: Density;
  setDensity: (density: Density) => void;
};

const DensityContext = React.createContext<DensityProviderState | undefined>(undefined);

export function DensityProvider({
  children,
  defaultDensity = 'compact',
  storageKey = 'density',
}: DensityProviderProps) {
  const [density, setDensityState] = React.useState<Density>(defaultDensity);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(storageKey) as Density | null;
    if (stored && ['compact', 'comfortable', 'spacious'].includes(stored)) {
      setDensityState(stored);
    }
  }, [storageKey]);

  React.useEffect(() => {
    if (!mounted || typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
    root.classList.add(`density-${density}`);
  }, [density, mounted]);

  const setDensity = React.useCallback(
    (value: Density) => {
      setDensityState(value);
      if (mounted) localStorage.setItem(storageKey, value);
    },
    [storageKey, mounted]
  );

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  const ctx = React.useContext(DensityContext);
  if (!ctx) throw new Error('useDensity must be used within DensityProvider');
  return ctx;
}
