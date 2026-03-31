import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tab?: string;
  q?: string;
}>;

async function getCurrentTenantContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const membership = await db.membership.findFirst({
    where: {
      user: { email: session.user.email },
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

export default async function MeasurementPointsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await getCurrentTenantContext();

  if (!ctx) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
        No active tenant found for current user.
      </div>
    );
  }

  const sp = await searchParams;
  const tab = String(sp.tab || "").trim() || "home";
  const q = String(sp.q || "").trim();

  const isRegistry = tab === "registry";
  const isSearching = q.length > 0;
  const REGISTRY_INITIAL_LIMIT = 50;

  const points = isRegistry
    ? await db.measurementPoint.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(isSearching
  ? {
      OR: [
        { tagNo: { contains: q, mode: "insensitive" } },
        { descEn: { contains: q, mode: "insensitive" } },
        { descRu: { contains: q, mode: "insensitive" } },
        { sourceTag: { contains: q, mode: "insensitive" } },
        {
          mpSource: {
            is: {
              sourceName: { contains: q, mode: "insensitive" },
            },
          },
        },
      ],
    }
  : {}),
        },
        select: {
          id: true,
          tagNo: true,
          descEn: true,
          descRu: true,
          signalType: true,
          sourceTag: true,
          isActive: true,
          facility: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          asset: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          measurementUnit: {
            select: {
              unitTitle: true,
            },
          },
          mpSource: {
            select: {
              sourceName: true,
            },
          },
        },
        orderBy: [{ tagNo: "asc" }],
        ...(isSearching ? {} : { take: REGISTRY_INITIAL_LIMIT }),
      })
    : [];

  return (
    <div className="flex min-h-0 flex-col space-y-6 pb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Measurement Points</h1>
        <p className="mt-1 text-sm text-white/60">
          Master Data Admin Maintains Measurement Point Registry And Report Mapping
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/master-data/measurement-points"
          className={`rounded-xl border px-4 py-2 text-sm ${
            tab === "home"
              ? "border-blue-500/40 bg-blue-600 text-white"
              : "border-white/10 bg-black/20 text-white/80 hover:bg-white/[0.06]"
          }`}
        >
          Home
        </Link>

        <Link
          href="/master-data/measurement-points?tab=registry"
          className={`rounded-xl border px-4 py-2 text-sm ${
            tab === "registry"
              ? "border-blue-500/40 bg-blue-600 text-white"
              : "border-white/10 bg-black/20 text-white/80 hover:bg-white/[0.06]"
          }`}
        >
          Registry
        </Link>

        <Link
          href="/master-data/measurement-points/report-assignments"
          className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/80 hover:bg-white/[0.06]"
        >
          Report Assignments
        </Link>
      </div>

      {tab === "home" ? (
        <>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 text-xs uppercase tracking-wider text-white/40">
              Measurement Point Areas
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Link
                href="/master-data/measurement-points?tab=registry"
                className="rounded-xl border border-white/10 bg-black/20 p-5 transition hover:bg-white/[0.06]"
              >
                <div className="font-semibold">Registry</div>
                <div className="mt-2 text-sm text-white/65">
                  Browse And Maintain Measurement Point Registry Independent Of Facility Or Asset Completeness
                </div>
              </Link>

              <Link
                href="/master-data/measurement-points/report-assignments"
                className="rounded-xl border border-white/10 bg-black/20 p-5 transition hover:bg-white/[0.06]"
              >
                <div className="font-semibold">Report Assignments</div>
                <div className="mt-2 text-sm text-white/65">
                  Assign Measurement Points To Reports Using Dual-List Selection With Ordering
                </div>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-sm font-semibold">Scope</div>
            <div className="mt-2 text-sm text-white/65">
              Registry Is Used To Register And Maintain Measurement Points. Report Assignments
              Defines Which Measurement Points Belong To Which Reports.
            </div>
          </div>
        </>
      ) : (
        <>
          <form
            method="GET"
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <input type="hidden" name="tab" value="registry" />

            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-white/40">
                Registry Filters
              </div>

              <Link
                href="/master-data/measurement-points/new"
                className="rounded-xl border border-blue-500/30 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                New Measurement Point
              </Link>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
                  Search
                </label>
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Tag, description, source tag..."
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="rounded-xl border border-blue-500/30 bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500"
                >
                  Load Registry
                </button>
              </div>
            </div>
          </form>

          <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 pb-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Measurement Point Registry</div>
                <div className="mt-1 text-sm text-white/60">
                  {isSearching
                    ? "Search Results For Current Tenant"
                    : `Showing First ${REGISTRY_INITIAL_LIMIT} Measurement Points For Current Tenant`}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/80">
                Total: {points.length}
              </div>
            </div>

            {!isSearching && (
              <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Initial Registry Load Is Limited To {REGISTRY_INITIAL_LIMIT} Rows For Faster Performance.
                Use Search To Load Specific Measurement Points.
              </div>
            )}

            <div className="mb-2 max-h-[56vh] overflow-auto rounded-xl border border-white/10">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-[#08110f] text-left text-white/70">
                  <tr>
                    <th className="px-4 py-3">Tag No</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Facility</th>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Signal Type</th>
                    <th className="px-4 py-3">Source Tag</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {points.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-6 text-center text-white/50">
                        No measurement points found.
                      </td>
                    </tr>
                  ) : (
                    points.map((row) => (
                      <tr key={row.id} className="border-t border-white/5">
                        <td className="px-4 py-3 font-medium">{row.tagNo}</td>
                        <td className="px-4 py-3">
                          {row.descEn || row.descRu || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {row.facility ? `${row.facility.name} (${row.facility.code})` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {row.asset ? `${row.asset.name} (${row.asset.code})` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {row.measurementUnit?.unitTitle ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {row.mpSource?.sourceName ?? "—"}
                        </td>
                        <td className="px-4 py-3">{row.signalType ?? "—"}</td>
                        <td className="px-4 py-3">{row.sourceTag ?? "—"}</td>
                        <td className="px-4 py-3">{row.isActive ? "Yes" : "No"}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/master-data/measurement-points/edit/${row.id}`}
                            className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs hover:bg-white/[0.06]"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}