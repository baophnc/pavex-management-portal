type Cell = string | number | null | undefined;

function escape(value: Cell) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Saves rows as a CSV that Excel opens with Vietnamese intact (UTF-8 with BOM). */
export function downloadCsv(filename: string, header: string[], rows: Cell[][]) {
  const body = [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿", body], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
