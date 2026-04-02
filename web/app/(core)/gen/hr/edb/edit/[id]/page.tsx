import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import EmployeeForm from "@/components/hr/EmployeeForm";

type Props = {
  params: Promise<{ id: string }>;
};

function toDateInput(value: Date | null) {
  if (!value) return null;
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function EditEmployeePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) notFound();

  const { id } = await params;

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

  const employee = await db.employee.findFirst({
    where: {
      id,
      tenantId,
    },
    select: {
      id: true,
      employeeNo: true,
      firstName: true,
      lastName: true,
      fullName: true,
      gender: true,
      birthDate: true,
      hireDate: true,
      exitDate: true,
      employmentType: true,
      workerCategory: true,
      department: true,
      position: true,
      location: true,
      nationalId: true,
      isActive: true,
    },
  });

  if (!employee) notFound();

  return (
    <div className="space-y-6">
      <div className="text-sm text-white/50">
        <Link href="/gen/hr" className="transition hover:text-white/80">
          HR Reports
        </Link>
        <span className="mx-2">/</span>
        <Link href="/gen/hr/edb" className="transition hover:text-white/80">
          Employees Database
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white/80">Edit Employee</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Edit Employee
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Update employee master data.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <EmployeeForm
          mode="edit"
          action="/api/hr/employee/update"
          employee={{
            ...employee,
            birthDate: toDateInput(employee.birthDate),
            hireDate: toDateInput(employee.hireDate),
            exitDate: toDateInput(employee.exitDate),
          }}
        />
      </div>
    </div>
  );
}