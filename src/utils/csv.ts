// Minimal dependency-free CSV parser. Handles quoted fields (including
// embedded commas, newlines, and escaped "" quotes), which is the main
// thing a naive text.split(',') gets wrong for real-world exports from
// Excel/Google Sheets. Not a full RFC 4180 implementation, but covers the
// common cases those tools actually produce.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  // Normalize line endings so \r\n from Windows-exported CSVs doesn't leave
  // stray \r characters in the last field of each row.
  const input = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }
  }
  // Flush the last field/row if the file doesn't end with a trailing newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

export function rowsToObjects(rows: string[][]): { headers: string[]; records: Record<string, string>[] } {
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map(h => h.trim());
  const records = rows.slice(1).map(r => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
    return obj;
  });
  return { headers, records };
}

// Best-effort auto-match of a CSV header to one of our expected field keys —
// exact match first, then a loose "contains" match, so "Client Name" matches
// a "name" field and "Email Address" matches "email".
export function guessColumnMapping(headers: string[], expectedKeys: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedHeaders = new Set<string>();
  expectedKeys.forEach(key => {
    const keyLower = key.toLowerCase();
    let match = headers.find(h => !usedHeaders.has(h) && h.toLowerCase() === keyLower);
    if (!match) match = headers.find(h => !usedHeaders.has(h) && h.toLowerCase().replace(/[\s_-]/g, '').includes(keyLower.replace(/[\s_-]/g, '')));
    if (match) {
      mapping[key] = match;
      usedHeaders.add(match);
    }
  });
  return mapping;
}
