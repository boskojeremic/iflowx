import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import EmployeeFilters from "@/components/hr/EmployeeFilters";
import EmployeeDeleteButton from "@/components/hr/EmployeeDeleteButton";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  type?: string;
  gender?: string;
  category?: string;
  location?: string;
  page?: string;
}>;

type Props = {
  params: Promise<{ reportCode: string }>;
  searchParams: SearchParams;
};

const PAGE_SIZE = 20;

function clean(value: string | undefined) {
  return String(value ?? "").trim();
}

export default async function HrReportPage({
  params,
  searchParams,
}: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) notFound();

  const { reportCode } = await params;
  const sp = await searchParams;

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      memberships: {
        where: { status: "ACTIVE" },
        orderBy: [{ createdAt: "desc" }],
        select: { tenantId: true },
      },
    },
  });

  const tenantId = user?.memberships?.[0]?.tenantId ?? null;
  if (!tenantId) notFound();

  const report = await db.reportDefinition.findFirst({
    where: {
      tenantId,
      code: reportCode.toUpperCase(),
      isActive: true,
    },
  });

  if (!report) notFound();

  const reportCodeSafe = report.code.toLowerCase();

  const q = clean(sp?.q);
  const status = clean(sp?.status).toUpperCase();
  const type = clean(sp?.type).toUpperCase();
  const gender = clean(sp?.gender).toUpperCase();
  const category = clean(sp?.category).toUpperCase();
  const location = clean(sp?.location);
  const page = Math.max(Number(sp?.page ?? "1") || 1, 1);

  const where: Prisma.EmployeeWhereInput = {
    tenantId,
  };

  if (q) {
    where.OR = [
      { employeeNo: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { fullName: { contains: q, mode: "insensitive" } },
    ];
  }

  if (status === "ACTIVE") where.isActive = true;
  if (status === "INACTIVE") where.isActive = false;
  if (type) where.employmentType = type as any;
  if (gender) where.gender = gender as any;
  if (category) where.workerCategory = category as any;
  if (location) where.location = location;

  const [employees, totalCount, locationOptions] = await Promise.all([
    db.employee.findMany({
      where,
      orderBy: [{ fullName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.employee.count({ where }),

    db.employee
      .findMany({
        where: { tenantId },
        select: { location: true },
        distinct: ["location"],
      })
      .then((rows) =>
        rows
          .map((r) => r.location)
          .filter((v): v is string => !!v)
          .sort()
      ),
  ]);

  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);

  function pageHref(nextPage: number) {
    const params2 = new URLSearchParams();

    if (q) params2.set("q", q);
    if (status) params2.set("status", status);
    if (type) params2.set("type", type);
    if (gender) params2.set("gender", gender);
    if (category) params2.set("category", category);
    if (location) params2.set("location", location);

    params2.set("page", String(nextPage));

    return `/gen/hr/${reportCodeSafe}?${params2.toString()}`;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-white text-2xl">Employees</h1>

      <EmployeeFilters
        q={q}
        status={status}
        type={type}
        gender={gender}
        category={category}
        location={location}
        locationOptions={locationOptions}
      />

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0b0f0d] text-white/70">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Location</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="border-t border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-2">{emp.fullName}</td>
                  <td className="px-3 py-2">{emp.employmentType}</td>
                  <td className="px-3 py-2">{emp.location ?? "—"}</td>
                  <td className="px-3 py-2">
                    {emp.isActive ? "ACTIVE" : "INACTIVE"}
                  </td>

                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/gen/hr/edb/edit/${emp.id}`}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </Link>

                      <EmployeeDeleteButton
                        id={emp.id}
                        fullName={emp.fullName}
                        isActive={emp.isActive}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-white/60">
        <div>
          Page {page} / {totalPages}
        </div>

        <div className="flex gap-2">
          <Link
            href={page > 1 ? pageHref(page - 1) : "#"}
            className="px-3 py-1 border border-white/10 rounded"
          >
            Prev
          </Link>

          <Link
            href={page < totalPages ? pageHref(page + 1) : "#"}
            className="px-3 py-1 border border-white/10 rounded"
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}