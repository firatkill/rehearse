import 'server-only';
export function sanitizeUntrusted(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\uFEFF]/g,
      '',
    )
    .replace(/</g, '‹') // ‹  cannot open or close a tag
    .replace(/>/g, '›') // ›
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
