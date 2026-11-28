/** Serialize one spreadsheet cell while preserving the type of numeric values. */
export function escapeCSVCell(value: unknown, alwaysQuote = false): string {
  let text = String(value ?? '');
  if (typeof value === 'string') {
    const normalized = text.normalize('NFKC');
    if (/^[\s\p{Cc}\p{Cf}]*[=+@-]/u.test(normalized) || /^[\t\r\n]/.test(text)) {
      text = "'" + text;
    }
  }
  return alwaysQuote || /[,;"\t\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
