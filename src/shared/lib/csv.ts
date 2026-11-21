/** Downloads an Excel-compatible (BOM + `;`) CSV file in the browser. */
export function exportCSV(rows: Array<Array<string | number>>, filename = "seferhane-rapor") {
  const csv =
    "﻿" +
    rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }))
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
