/**
 * Report Export Utilities — PDF (branded) + CSV
 * Shared across all report pages.
 */
import jsPDF from "jspdf";
import "jspdf-autotable";

/* ─── CSV Export ─── */
export function exportCSV(filename, headers, rows) {
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── PDF Export (branded) ─── */
export async function exportPDF({
  title,
  subtitle = "",
  branding = {},
  kpis = [],
  tableHeaders = [],
  tableRows = [],
  filename = "report",
  orientation = "portrait",
}) {
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor = branding.primary_color || "#20364D";
  const accentColor = branding.accent_color || "#D4A843";
  const companyName = branding.brand_name || branding.legal_name || "Konekt";
  const now = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // ─── Helper: hex to RGB ───
  const hexToRgb = (hex) => {
    const h = hex.replace("#", "");
    return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
  };

  const [pr, pg, pb] = hexToRgb(primaryColor);
  const [ar, ag, ab] = hexToRgb(accentColor);

  let y = 10;

  // ─── Logo / Company Header ───
  if (branding.primary_logo_url) {
    try {
      const img = await loadImage(branding.primary_logo_url);
      doc.addImage(img, "PNG", 14, y, 30, 12);
    } catch {
      /* skip logo */
    }
  }
  doc.setFontSize(14);
  doc.setTextColor(pr, pg, pb);
  doc.setFont(undefined, "bold");
  doc.text(companyName, branding.primary_logo_url ? 48 : 14, y + 7);

  // Accent line
  y += 18;
  doc.setDrawColor(ar, ag, ab);
  doc.setLineWidth(0.8);
  doc.line(14, y, pageWidth - 14, y);

  // ─── Report Title ───
  y += 8;
  doc.setFontSize(16);
  doc.setTextColor(pr, pg, pb);
  doc.setFont(undefined, "bold");
  doc.text(title, 14, y);

  if (subtitle) {
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont(undefined, "normal");
    doc.text(subtitle, 14, y);
  }

  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text(`Generated: ${now}`, 14, y);

  // ─── KPI Cards ───
  if (kpis.length > 0) {
    y += 8;
    const cardW = Math.min(40, (pageWidth - 28 - (kpis.length - 1) * 4) / kpis.length);
    kpis.forEach((kpi, i) => {
      const x = 14 + i * (cardW + 4);
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(x, y, cardW, 16, 2, 2, "F");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.setFont(undefined, "normal");
      doc.text(kpi.label, x + 2, y + 5);
      doc.setFontSize(10);
      doc.setTextColor(pr, pg, pb);
      doc.setFont(undefined, "bold");
      doc.text(String(kpi.value), x + 2, y + 12);
    });
    y += 22;
  }

  // ─── Data Table ───
  if (tableHeaders.length > 0 && tableRows.length > 0) {
    y += 4;
    doc.autoTable({
      startY: y,
      head: [tableHeaders],
      body: tableRows,
      theme: "grid",
      headStyles: {
        fillColor: [pr, pg, pb],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14, right: 14 },
      styles: {
        cellPadding: 2.5,
        lineWidth: 0.1,
        lineColor: [226, 232, 240],
      },
    });
  }

  // ─── Footer (on all pages) ───
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const fh = doc.internal.pageSize.getHeight();
    doc.setDrawColor(ar, ag, ab);
    doc.setLineWidth(0.4);
    doc.line(14, fh - 16, pageWidth - 14, fh - 16);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.setFont(undefined, "normal");
    const footerLine1 = `${companyName}`;
    const footerLine2 = branding.support_email
      ? `${branding.support_email} | ${branding.support_phone || ""}`
      : "";
    doc.text(footerLine1, 14, fh - 11);
    if (footerLine2) doc.text(footerLine2, 14, fh - 7);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - 14, fh - 11, { align: "right" });
    doc.text(now, pageWidth - 14, fh - 7, { align: "right" });
  }

  doc.save(`${filename}.pdf`);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/* ─── Money formatter ─── */
export function fmtMoney(v) {
  const n = Number(v) || 0;
  if (n >= 1e6) return `TZS ${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `TZS ${(n / 1e3).toFixed(0)}K`;
  return `TZS ${n.toLocaleString()}`;
}

export function fmtMoneyRaw(v) {
  return `TZS ${(Number(v) || 0).toLocaleString()}`;
}
