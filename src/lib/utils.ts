import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Supabase relation can be object or array; safely get .name (e.g. projects, vendors). */
export function relationNameFromRelation(rel: unknown, fallback = '—'): string {
  if (rel == null) return fallback;
  const p = rel as { name?: string } | { name?: string }[];
  const name = Array.isArray(p) ? p[0]?.name : p?.name;
  return name ?? fallback;
}

/** Supabase relation can be object or array; safely get project name. */
export function projectNameFromRelation(projects: unknown, fallback = '—'): string {
  return relationNameFromRelation(projects, fallback);
}
