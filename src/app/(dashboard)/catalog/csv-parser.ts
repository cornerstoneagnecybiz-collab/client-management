/**
 * Parse a single CSV line respecting double-quoted fields (commas inside quotes stay).
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

const CSV_HEADER_ALIASES = [
  'code', 'service_code', 'service code',
  'name', 'service_name', 'service name',
  'category', 'type', 'service_type', 'service type',
  'our_min', 'our_rate_min', 'our rate min',
  'our_max', 'our_rate_max', 'our rate max',
  'commission', 'default_client_rate', 'default client rate', 'client rate',
];

function looksLikeHeader(cells: string[]): boolean {
  const first = cells[0]?.toLowerCase().replace(/\s+/g, ' ') ?? '';
  return CSV_HEADER_ALIASES.some((h) => first.includes(h));
}

/** Column order: code, name, category, type, our_min, our_max, commission, default_client_rate */
const COL_COUNT = 8;

export type ParsedServiceRow = {
  service_code: string;
  service_name: string;
  category: string;
  service_type: string;
  our_rate_min: string;
  our_rate_max: string;
  commission: string;
  default_client_rate: string;
};

export function parseCsvToServices(csvText: string): ParsedServiceRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const rows: ParsedServiceRow[] = [];
  let start = 0;
  const firstCells = parseCsvLine(lines[0]);
  if (firstCells.length >= 2 && looksLikeHeader(firstCells)) {
    start = 1;
  }

  for (let i = start; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length < 1) continue;
    let code: string;
    let name: string;
    let category: string;
    let service_type: string;
    let our_rate_min: string;
    let our_rate_max: string;
    let commission: string;
    let default_client_rate: string;
    if (cells.length >= 8) {
      code = (cells[0] ?? '').trim();
      name = (cells[1] ?? '').trim();
      category = (cells[2] ?? '').trim();
      service_type = (cells[3] ?? '').trim();
      our_rate_min = (cells[4] ?? '').trim();
      our_rate_max = (cells[5] ?? '').trim();
      commission = (cells[6] ?? '').trim();
      default_client_rate = (cells[7] ?? '').trim();
    } else {
      code = '';
      name = (cells[0] ?? '').trim();
      category = (cells[1] ?? '').trim();
      service_type = (cells[2] ?? '').trim();
      our_rate_min = (cells[3] ?? '').trim();
      our_rate_max = (cells[4] ?? '').trim();
      commission = (cells[5] ?? '').trim();
      default_client_rate = (cells[6] ?? '').trim();
    }
    if (!name) continue;
    rows.push({
      service_code: code,
      service_name: name,
      category,
      service_type,
      our_rate_min,
      our_rate_max,
      commission,
      default_client_rate,
    });
  }
  return rows;
}

/** Header row for CSV bulk import; code is optional (auto-generated if omitted). */
export const CSV_HEADER_ROW = 'service_name,category,service_type,our_rate_min,our_rate_max,commission,default_client_rate';

export const CSV_EXAMPLE = `${CSV_HEADER_ROW}
Strategy Workshop,Consulting,workshop,50000,75000,0.1,80000
Hourly Advisory,Consulting,hourly,3000,5000,0.15,4500`;
