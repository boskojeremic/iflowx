export type FopReportCode =
  | "DOR"
  | "OIL"
  | "CND"
  | "DRG"
  | "LPG"
  | "PWG"
  | "SUL"
  | "RWG"
  | "BOE"
  | "FLA"
  | "OGG"
  | "WAT"
  | "EXT";

export type FopKpiCard = {
  key: string;
  label: string;
  placeholder: string;
  bgClass: string;
};

export type FopSection = {
  key: string;
  title: string;
  description: string;
};

export type FopReportMeta = {
  code: FopReportCode;
  title: string;
  shortTitle: string;
  docNo: string;
  summaryTitle: string;
  summaryText: string;
  chartTitle: string;
  notesTitle: string;
  notesText: string;
  kpis: FopKpiCard[];
  sections: FopSection[];
};

const defaultKpis: FopKpiCard[] = [
  {
    key: "primary",
    label: "PRIMARY KPI",
    placeholder: "—",
    bgClass: "bg-[#2748d8]",
  },
  {
    key: "secondary",
    label: "SECONDARY KPI",
    placeholder: "—",
    bgClass: "bg-[#159a63]",
  },
  {
    key: "reference",
    label: "REFERENCE KPI",
    placeholder: "—",
    bgClass: "bg-[#d97706]",
  },
  {
    key: "output",
    label: "OUTPUT KPI",
    placeholder: "—",
    bgClass: "bg-[#c0067a]",
  },
];

function makeMeta(
  code: FopReportCode,
  title: string,
  docNo: string,
  sections: FopSection[],
  summaryText?: string
): FopReportMeta {
  return {
    code,
    title,
    shortTitle: title,
    docNo,
    summaryTitle: "INPUT / OUTPUT SUMMARY",
    summaryText:
      summaryText ??
      `${title} template preview with report-specific sections, table placeholders and graphical placeholders.`,
    chartTitle: "DAILY TREND / PROFILE",
    notesTitle: "Notes / Commentary",
    notesText:
      "Reserved area for automatic narrative summary, validator comments, operating highlights and report-specific remarks.",
    kpis: defaultKpis,
    sections,
  };
}

export const FOP_REPORT_META: Record<FopReportCode, FopReportMeta> = {
  DOR: makeMeta(
    "DOR",
    "DAILY OPERATIONS REPORT",
    "NOG-FOD-GEN-DOR-001",
    [
      {
        key: "production-by-product",
        title: "DAILY PRODUCTION BY PRODUCT",
        description:
          "Complete daily, monthly and yearly operational summary for the selected reporting day.",
      },
      {
        key: "operational-highlights",
        title: "OPERATIONAL HIGHLIGHTS",
        description:
          "General daily operational remarks, constraints, deviations and key notes.",
      },
    ]
  ),
  OIL: makeMeta(
    "OIL",
    "OIL DAILY PRODUCTION",
    "NOG-FOD-OIL-001",
    [
      {
        key: "manual",
        title: "MANUALLY ENTERED VALUES",
        description:
          "Manual tank, density and operator-entered values used in daily oil reporting.",
      },
      {
        key: "scada",
        title: "SCADA READING VALUES",
        description:
          "Automatically captured tags from field systems used for oil production reporting.",
      },
      {
        key: "calculated",
        title: "CALCULATED VALUES",
        description:
          "Calculated balances, corrected levels and final derived values.",
      },
    ]
  ),
  CND: makeMeta(
    "CND",
    "CONDENSATE DAILY PRODUCTION",
    "NOG-FOD-CND-001",
    [
      {
        key: "manual",
        title: "MANUALLY ENTERED VALUES",
        description:
          "Manual condensate entries, operator adjustments and supporting field values.",
      },
      {
        key: "scada",
        title: "SCADA READING VALUES",
        description:
          "SCADA-based condensate measurements for the selected reporting day.",
      },
      {
        key: "calculated",
        title: "CALCULATED VALUES",
        description:
          "Calculated condensate totals, balances and derived output values.",
      },
    ]
  ),
  DRG: makeMeta(
    "DRG",
    "DRY GAS DAILY PRODUCTION",
    "NOG-FOD-DRG-001",
    [
      {
        key: "manual",
        title: "MANUALLY ENTERED VALUES",
        description:
          "Manual dry gas values, field adjustments and operator-entered parameters.",
      },
      {
        key: "scada",
        title: "SCADA READING VALUES",
        description:
          "SCADA-derived dry gas measurements and related metering values.",
      },
      {
        key: "calculated",
        title: "CALCULATED VALUES",
        description:
          "Calculated dry gas totals, balances and report output values.",
      },
    ]
  ),
  LPG: makeMeta(
    "LPG",
    "LPG DAILY PRODUCTION",
    "NOG-FOD-LPG-001",
    [
      {
        key: "manual",
        title: "MANUALLY ENTERED VALUES",
        description:
          "Manual LPG daily entries and operator-entered production values.",
      },
      {
        key: "scada",
        title: "SCADA READING VALUES",
        description:
          "SCADA measurements and instrument readings for LPG reporting.",
      },
      {
        key: "calculated",
        title: "CALCULATED VALUES",
        description:
          "Calculated LPG production totals and final report outputs.",
      },
    ]
  ),
  PWG: makeMeta(
    "PWG",
    "DAILY POWER GENERATION",
    "NOG-FOD-PWG-001",
    [
      {
        key: "generator-inputs",
        title: "GENERATOR INPUT VALUES",
        description:
          "Daily generator inputs, operating hours and supporting manual entries.",
      },
      {
        key: "meter-readings",
        title: "METER / SCADA VALUES",
        description:
          "Metered and SCADA-imported power generation readings.",
      },
      {
        key: "calculated",
        title: "CALCULATED VALUES",
        description:
          "Calculated generation totals, specific indicators and report outputs.",
      },
    ]
  ),
  SUL: makeMeta(
    "SUL",
    "SULPHUR DAILY PRODUCTION",
    "NOG-FOD-SUL-001",
    [
      {
        key: "manual",
        title: "MANUALLY ENTERED VALUES",
        description:
          "Daily sulphur manual entries, operator notes and production adjustments.",
      },
      {
        key: "scada",
        title: "SCADA READING VALUES",
        description:
          "SCADA and field instrumentation values used in sulphur reporting.",
      },
      {
        key: "calculated",
        title: "CALCULATED VALUES",
        description:
          "Calculated sulphur balances, totals and final reporting values.",
      },
    ]
  ),
  RWG: makeMeta(
    "RWG",
    "RAW GAS DAILY PRODUCTION",
    "NOG-FOD-RWG-001",
    [
      {
        key: "manual",
        title: "MANUALLY ENTERED VALUES",
        description:
          "Manual raw gas entries and operator-entered adjustments.",
      },
      {
        key: "scada",
        title: "SCADA READING VALUES",
        description:
          "SCADA-imported raw gas readings for the selected day.",
      },
      {
        key: "calculated",
        title: "CALCULATED VALUES",
        description:
          "Calculated raw gas totals, balances and output indicators.",
      },
    ]
  ),
  BOE: makeMeta(
    "BOE",
    "DAILY BOE REPORT",
    "NOG-FOD-BOE-001",
    [
      {
        key: "boe-summary",
        title: "BOE CONVERSION SUMMARY",
        description:
          "Daily conversion summary of production streams into BOE values.",
      },
      {
        key: "reference-values",
        title: "REFERENCE VALUES",
        description:
          "Reference factors, conversion inputs and stream assumptions.",
      },
      {
        key: "calculated",
        title: "CALCULATED VALUES",
        description:
          "Calculated BOE totals and supporting derived figures.",
      },
    ]
  ),
  FLA: makeMeta(
    "FLA",
    "FLARING DAILY REPORT",
    "NOG-FOD-FLA-001",
    [
      {
        key: "manual",
        title: "MANUALLY ENTERED VALUES",
        description:
          "Manual flare-related entries, operating remarks and adjustment values.",
      },
      {
        key: "scada",
        title: "SCADA READING VALUES",
        description:
          "SCADA-imported flare values and supporting metering data.",
      },
      {
        key: "calculated",
        title: "CALCULATED VALUES",
        description:
          "Calculated flare totals, balances and reporting outputs.",
      },
    ]
  ),
  OGG: makeMeta(
    "OGG",
    "OIL & GAS GATHERING DAILY REPORT",
    "NOG-FOD-OGG-001",
    [
      {
        key: "gathering-inputs",
        title: "GATHERING INPUT VALUES",
        description:
          "Daily oil and gas gathering input values and operator-entered figures.",
      },
      {
        key: "transfer-readings",
        title: "TRANSFER / SCADA VALUES",
        description:
          "Transfer quantities and SCADA-imported readings for gathering operations.",
      },
      {
        key: "calculated",
        title: "CALCULATED VALUES",
        description:
          "Calculated gathering balances and final report output values.",
      },
    ]
  ),
  WAT: makeMeta(
    "WAT",
    "WATER DAILY REPORT",
    "NOG-FOD-WAT-001",
    [
      {
        key: "manual",
        title: "MANUALLY ENTERED VALUES",
        description:
          "Daily water-related manual entries and operator adjustments.",
      },
      {
        key: "scada",
        title: "SCADA READING VALUES",
        description:
          "SCADA-imported water readings and related field measurements.",
      },
      {
        key: "calculated",
        title: "CALCULATED VALUES",
        description:
          "Calculated water balances, totals and reporting outputs.",
      },
    ]
  ),
  EXT: makeMeta(
    "EXT",
    "EXTERNAL STREAMS",
    "NOG-FOD-EXT-001",
    [
      {
        key: "manual",
        title: "MANUALLY ENTERED VALUES",
        description:
          "Manual entries for external stream receipts, dispatches and adjustments.",
      },
      {
        key: "scada",
        title: "SCADA READING VALUES",
        description:
          "SCADA and metered values for external stream accounting.",
      },
      {
        key: "calculated",
        title: "CALCULATED VALUES",
        description:
          "Calculated external stream totals and final reporting outputs.",
      },
    ]
  ),
};