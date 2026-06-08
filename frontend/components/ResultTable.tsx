import type { ResultPayload } from "@/lib/types";

function isNum(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (isNum(v)) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return String(v);
}

function numericColumns(rows: unknown[][], colCount: number): boolean[] {
  return Array.from({ length: colCount }, (_, c) => {
    let sawNumber = false;
    for (const row of rows) {
      const v = row[c];
      if (v === null || v === undefined) continue;
      if (!isNum(v)) return false;
      sawNumber = true;
    }
    return sawNumber;
  });
}

export function ResultTable({ result }: { result: ResultPayload }) {
  const { columns, rows } = result;

  if (rows.length === 1 && columns.length === 1) {
    return (
      <div className="rounded-card border border-line bg-surface px-4 py-5">
        <div className="font-mono text-3xl font-medium tracking-tight text-ink">
          {formatCell(rows[0][0])}
        </div>
        <div className="mt-1 text-xs text-muted">{columns[0]}</div>
      </div>
    );
  }

  const numeric = numericColumns(rows, columns.length);

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="max-h-80 overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b border-line">
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={`whitespace-nowrap px-3 py-2 font-medium text-muted ${
                    numeric[i] ? "text-right" : "text-left"
                  }`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className="border-b border-line last:border-0 hover:bg-bg/60"
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`whitespace-nowrap px-3 py-2 font-mono ${
                      numeric[ci] ? "text-right tabular-nums" : "text-left"
                    } ${cell === null || cell === undefined ? "text-muted" : "text-ink"}`}
                  >
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-line px-3 py-1.5 text-xs text-muted">
        {rows.length} {rows.length === 1 ? "row" : "rows"}
      </div>
    </div>
  );
}
