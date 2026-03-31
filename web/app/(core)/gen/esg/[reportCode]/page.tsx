import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { powerBIReports } from "@/lib/powerbi-reports";
import PowerBIEmbed from "@/components/PowerBIEmbed";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tab?: string;
}>;

function normalizeCode(value: string) {
  return String(value || "").trim().toUpperCase();
}

function todayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function getCurrentTenantContext(email: string) {
  const membership = await db.membership.findFirst({
    where: {
      user: { email },
      status: "ACTIVE",
    },
    select: {
      tenantId: true,
      tenant: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return membership ?? null;
}

export default async function ESGReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportCode: string }>;
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const ctx = await getCurrentTenantContext(session.user.email);
  if (!ctx) redirect("/login");

  const tenantId = ctx.tenantId;

  const { reportCode } = await params;
  const sp = await searchParams;

  const activeTab = String(sp?.tab ?? "data-entry").toLowerCase();

  const moduleItem = await db.module.findFirst({
    where: {
      routePath: "/gen/esg",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });

  if (!moduleItem) notFound();

  const report = await db.reportDefinition.findFirst({
    where: {
      tenantId,
      code: normalizeCode(reportCode),
      isActive: true,
      ReportGroup: {
        is: {
          tenantId,
          moduleId: moduleItem.id,
        },
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      sortOrder: true,
      ReportGroup: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  if (!report) notFound();

  const tabs = [
    { key: "data-entry", label: "Data Entry" },
    { key: "calculations", label: "Calculations" },
    { key: "review-package", label: "Review Package" },
    { key: "dashboards", label: "Dashboards" },
    { key: "report-view", label: "Report View" },
  ];

  const tab = tabs.find((t) => t.key === activeTab)?.key ?? "data-entry";
  const currentDay = todayYmd();

  return (
    <div className="p-6 space-y-6 min-h-full overflow-y-auto">
      <div className="text-sm text-white/50">
        <Link href="/gen/esg" className="hover:text-white/80 transition">
          ESG Reports
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white/80">{report.name}</span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-3xl font-bold">{report.name}</div>
            <div className="mt-1 text-sm text-white/60">
              {report.description || "Report Workspace"}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/55">
              <div className="rounded-md border border-white/10 bg-black/20 px-3 py-1">
                Module: {moduleItem.name}
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 px-3 py-1">
                Group: {report.ReportGroup.name}
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 px-3 py-1">
                Code: {report.code}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/gen/esg"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Back To Reports
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <Link
              key={t.key}
              href={`/gen/esg/${report.code.toLowerCase()}?tab=${t.key}`}
              className={[
                "rounded-lg border px-4 py-2 text-sm transition",
                active
                  ? "bg-white/15 border-white/20"
                  : "bg-white/[0.04] border-white/10 hover:bg-white/10",
              ].join(" ")}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 min-h-[520px]">
        {tab === "dashboards" && (
          <div className="space-y-4">
            <div>
              <div className="text-xl font-semibold">Dashboards</div>
              <div className="mt-1 text-sm text-white/60">
                Interactive analytical dashboards.
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="font-medium">Power BI Dashboard</div>

              <div className="mt-4">
                <PowerBIEmbed
                  title={powerBIReports.esg.title}
                  reportUrl={powerBIReports.esg.url}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}