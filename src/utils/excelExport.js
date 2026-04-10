import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/**
 * Generate a professionally formatted Excel workbook.
 *
 * @param {Object} opts
 * @param {string}   opts.title       – Report title (e.g. "Order Report")
 * @param {string}   opts.sheetName   – Worksheet name (e.g. "Orders")
 * @param {string[]} opts.columns     – Column headers
 * @param {Object[]} opts.rows        – Array of objects keyed by column header
 * @param {number[]} [opts.currencyCols] – 0-based indices of currency columns
 * @param {number[]} [opts.statusCols]   – 0-based indices of status columns
 * @param {string}   [opts.filename]     – Output filename (without extension)
 * @param {Object}   [opts.summary]      – Key-value summary block below the table
 */
export async function exportFormattedExcel({
  title, sheetName, columns, rows, currencyCols = [], statusCols = [],
  filename = "report", summary,
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RG Medlink Admin";
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  const colCount = columns.length;

  /* ── ROW 1: Brand bar ── */
  const brandRow = ws.addRow(["RG Medlink Pharmacy"]);
  ws.mergeCells(1, 1, 1, colCount);
  const brandCell = brandRow.getCell(1);
  brandCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  brandCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  brandCell.alignment = { vertical: "middle", horizontal: "left" };
  brandRow.height = 36;

  /* ── ROW 2: Title + metadata ── */
  const titleRow = ws.addRow([`${title}  ·  Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}  ·  ${rows.length} records`]);
  ws.mergeCells(2, 1, 2, colCount);
  const titleCell = titleRow.getCell(1);
  titleCell.font = { name: "Calibri", size: 10, color: { argb: "FF64748B" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  titleRow.height = 24;

  /* ── ROW 3: Spacer ── */
  ws.addRow([]);

  /* ── ROW 4: Column headers ── */
  const headerRow = ws.addRow(columns);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      bottom: { style: "medium", color: { argb: "FF4338CA" } },
    };
  });

  /* ── DATA ROWS ── */
  const statusColors = {
    "Paid":       { font: "FF059669", fill: "FFECFDF5" },
    "Completed":  { font: "FF059669", fill: "FFECFDF5" },
    "Delivered":  { font: "FF059669", fill: "FFECFDF5" },
    "In Stock":   { font: "FF059669", fill: "FFECFDF5" },
    "Generated":  { font: "FF059669", fill: "FFECFDF5" },
    "Processing": { font: "FF3B82F6", fill: "FFEFF6FF" },
    "Shipped":    { font: "FF7C3AED", fill: "FFF5F3FF" },
    "Packed":     { font: "FF0D9488", fill: "FFF0FDFA" },
    "Pending":    { font: "FFD97706", fill: "FFFFFBEB" },
    "Created":    { font: "FF64748B", fill: "FFF1F5F9" },
    "Low Stock":  { font: "FFDC2626", fill: "FFFEF2F2" },
    "Failed":     { font: "FFDC2626", fill: "FFFEF2F2" },
    "Cancelled":  { font: "FFDC2626", fill: "FFFEF2F2" },
    "Unpaid":     { font: "FFDC2626", fill: "FFFEF2F2" },
  };

  const keys = columns;

  rows.forEach((row, idx) => {
    const values = keys.map(k => row[k]);
    const dataRow = ws.addRow(values);
    const isEven = idx % 2 === 0;

    dataRow.eachCell((cell, colNumber) => {
      const colIdx = colNumber - 1;
      cell.font = { name: "Calibri", size: 10, color: { argb: "FF1E293B" } };
      cell.alignment = { vertical: "middle", horizontal: "left" };

      // Alternate row shading
      if (!isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }

      // Light bottom border
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      // Currency columns
      if (currencyCols.includes(colIdx)) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
      }

      // Status columns
      if (statusCols.includes(colIdx)) {
        const val = String(cell.value);
        const sc = statusColors[val];
        if (sc) {
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: sc.font } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: sc.fill } };
        }
      }
    });
  });

  /* ── SUMMARY ROW (optional) ── */
  if (summary && Object.keys(summary).length) {
    ws.addRow([]);
    const summaryHeaderRow = ws.addRow(["Summary"]);
    ws.mergeCells(summaryHeaderRow.number, 1, summaryHeaderRow.number, colCount);
    const shCell = summaryHeaderRow.getCell(1);
    shCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0F172A" } };
    shCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    shCell.border = { bottom: { style: "medium", color: { argb: "FFE2E8F0" } } };

    Object.entries(summary).forEach(([key, value]) => {
      const sRow = ws.addRow([key, value]);
      sRow.getCell(1).font = { name: "Calibri", size: 10, color: { argb: "FF64748B" } };
      sRow.getCell(2).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
    });
  }

  /* ── COLUMN WIDTHS ── */
  ws.columns.forEach((col, i) => {
    let maxLen = columns[i].length;
    rows.forEach(r => {
      const val = String(r[columns[i]] ?? "");
      if (val.length > maxLen) maxLen = val.length;
    });
    col.width = Math.min(Math.max(maxLen + 4, 12), 40);
  });

  /* ── AUTO-FILTER on header row ── */
  ws.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: colCount },
  };

  /* ── SAVE ── */
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}
