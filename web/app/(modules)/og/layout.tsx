import Link from "next/link";

const OG_NAV = [
  { code: "OG-OPS", href: "/og/ops", label: "Field Operations" },
  { code: "OG-WELL", href: "/og/wells", label: "Well Production" },
  { code: "OG-GHG", href: "/og/ghg", label: "GHG MRV" },
  { code: "OG-CEMS", href: "/og/cems-qaqc", label: "CEMS QA/QC" },
  { code: "OG-ASSET", href: "/og/assets", label: "Asset Register" },
  { code: "OG-HSE", href: "/og/hse", label: "HSE (Incidents & CAPA)" },
  { code: "OG-SCM", href: "/og/scm", label: "Procurement & Logistics" },
];

export default function OGLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 280,
          borderRight: "1px solid rgba(255,255,255,0.08)",
          padding: 16,
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700 }}>Oil &amp; Gas Portal</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>IFlowX Suite</div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {OG_NAV.map((item) => (
            <Link
              key={item.code}
              href={item.href}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}