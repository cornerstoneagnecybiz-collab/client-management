/**
 * Strip characters that Postgres TEXT/JSON cannot represent.
 *
 * Pasting from PDFs, Word, Excel, and rich emails often introduces:
 *  - NUL bytes (U+0000) — JSON-encoded as `\u0000`, rejected by Postgres with
 *    `22P05: unsupported Unicode escape sequence` / `\u0000 cannot be converted to text`.
 *  - Unpaired UTF-16 surrogates (U+D800..U+DFFF) — invalid UTF-8, rejected the same way.
 *
 * `String.trim()` does not remove any of these. Apply `sanitizeText` at the server-action
 * boundary before handing user-entered strings to Supabase/Postgres.
 *
 * Unpaired surrogates are replaced with U+FFFD (the Unicode replacement character) so the
 * surrounding content is preserved and visible to the user.
 */
export function sanitizeText(value: string): string;
export function sanitizeText(value: string | null | undefined): string | null;
export function sanitizeText(value: string | null | undefined): string | null {
  if (value == null) return null;
  return value
    .replace(/\u0000/g, '')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '\uFFFD')
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');
}
