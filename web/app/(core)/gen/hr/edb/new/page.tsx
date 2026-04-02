import Link from "next/link";
import EmployeeForm from "@/components/hr/EmployeeForm";

export default function NewEmployeePage() {
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
        <span className="text-white/80">New Employee</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Add Employee
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Create a new employee record in the HR master database.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <EmployeeForm mode="create" action="/api/hr/employee/create" />
      </div>
    </div>
  );
}