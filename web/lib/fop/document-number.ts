export function getDayOfYear(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function getReportPrefix(reportCode: string) {
  const code = String(reportCode || "").toUpperCase();

  if (code.includes("CND") || code.includes("COND")) return "CND";
  if (code.includes("OIL")) return "OIL";

  return code.slice(0, 3) || "REP";
}

export function buildDocumentNumber(
  reportCode: string,
  reportDate: string,
  revision: number
) {
  const d = new Date(`${reportDate}T00:00:00`);
  const yy = String(d.getFullYear()).slice(-2);
  const ddd = String(getDayOfYear(reportDate)).padStart(3, "0");
  const rev = String(revision).padStart(2, "0");
  const prefix = getReportPrefix(reportCode);

  return `${yy}-${prefix}-${ddd}-${rev}`;
}