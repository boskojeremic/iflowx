export type GhgInvReportCode = "GHG_INV";

export type GhgInvKpiCard = {
  key: string;
  label: string;
  placeholder: string;
  bgClass: string;
};

export type GhgInvSection = {
  key: string;
  title: string;
  description: string;
};

export type GhgInvReportMeta = {
  code: GhgInvReportCode;
  title: string;
  shortTitle: string;
  docNo: string;
  summaryTitle: string;
  summaryText: string;
  chartTitle: string;
  notesTitle: string;
  notesText: string;
  kpis: GhgInvKpiCard[];
  sections: GhgInvSection[];
};

const defaultKpis: GhgInvKpiCard[] = [
  {
    key: "primary",
    label: "TOTAL EMISSIONS",
    placeholder: "—",
    bgClass: "bg-[#2748d8]",
  },
  {
    key: "secondary",
    label: "SCOPE 1",
    placeholder: "—",
    bgClass: "bg-[#159a63]",
  },
  {
    key: "reference",
    label: "SCOPE 2",
    placeholder: "—",
    bgClass: "bg-[#d97706]",
  },
  {
    key: "output",
    label: "INTENSITY",
    placeholder: "—",
    bgClass: "bg-[#c0067a]",
  },
];

function makeMeta(
  code: GhgInvReportCode,
  title: string,
  docNo: string,
  sections: GhgInvSection[],
  summaryText?: string
): GhgInvReportMeta {
  return {
    code,
    title,
    shortTitle: title,
    docNo,
    summaryTitle: "GHG EMISSIONS SUMMARY",
    summaryText:
      summaryText ??
      `${title} overview including emission sources, calculated outputs and reporting structure.`,
    chartTitle: "EMISSIONS TREND",
    notesTitle: "Notes / Commentary",
    notesText:
      "Reserved for emission explanations, deviations, assumptions and reporting remarks.",
    kpis: defaultKpis,
    sections,
  };
}

export const GHG_INV_REPORT_META: Record<GhgInvReportCode, GhgInvReportMeta> = {
  GHG_INV: makeMeta(
    "GHG_INV",
    "GHG EMISSIONS INVENTORY",
    "NOG-ESG-GHG-001",
    [
      {
        key: "manual",
        title: "MANUAL INPUTS",
        description:
          "Manually entered emission values and operational adjustments.",
      },
      {
        key: "scada",
        title: "SCADA INPUTS",
        description:
          "Automatically captured data from SCADA and monitoring systems.",
      },
      {
        key: "calculated",
        title: "CALCULATED EMISSIONS",
        description:
          "Calculated emissions based on applied methodologies and factors.",
      },
    ]
  ),
};