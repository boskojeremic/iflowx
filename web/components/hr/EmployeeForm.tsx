"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  mode: "create" | "edit";
  action: string;
  employee?: {
    id: string;
    employeeNo: string | null;
    firstName: string;
    lastName: string;
    fullName: string;
    gender: string | null;
    birthDate: string | null;
    hireDate: string | null;
    exitDate: string | null;
    employmentType: string;
    workerCategory: string | null;
    department: string | null;
    position: string | null;
    location: string | null;
    nationalId: string | null;
    isActive: boolean;
  };
};

export default function EmployeeForm({ mode, action, employee }: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(employee?.firstName ?? "");
  const [lastName, setLastName] = useState(employee?.lastName ?? "");
  const [loading, setLoading] = useState(false);

  const computedFullName = `${firstName} ${lastName}`.trim();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setLoading(true);

      const form = e.currentTarget;
      const formData = new FormData(form);

      const res = await fetch(action, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Save failed.");
      }

      toast.success(
        mode === "create"
          ? "Employee created successfully."
          : "Employee updated successfully."
      );

      router.push("/gen/hr/edb");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save employee."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {mode === "edit" && employee?.id ? (
        <input type="hidden" name="id" value={employee.id} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Employee No">
          <input
            name="employeeNo"
            defaultValue={employee?.employeeNo ?? ""}
            className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          />
        </Field>

        <Field label="National ID">
          <input
            name="nationalId"
            defaultValue={employee?.nationalId ?? ""}
            className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          />
        </Field>

        <Field label="First Name">
          <input
            name="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          />
        </Field>

        <Field label="Last Name">
          <input
            name="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          />
        </Field>

        <Field label="Full Name">
          <input
            name="fullName"
            value={computedFullName}
            readOnly
            className="h-11 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white/70"
          />
        </Field>

        <Field label="Gender">
          <select
            name="gender"
            defaultValue={employee?.gender ?? ""}
            className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          >
            <option value="">Select</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
            <option value="UNDISCLOSED">Undisclosed</option>
          </select>
        </Field>

        <Field label="Birth Date">
          <input
            type="date"
            name="birthDate"
            defaultValue={employee?.birthDate ?? ""}
            className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          />
        </Field>

        <Field label="Hire Date">
          <input
            type="date"
            name="hireDate"
            defaultValue={employee?.hireDate ?? ""}
            className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          />
        </Field>

        <Field label="Exit Date">
          <input
            type="date"
            name="exitDate"
            defaultValue={employee?.exitDate ?? ""}
            className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          />
        </Field>

        <Field label="Employment Type">
          <select
            name="employmentType"
            defaultValue={employee?.employmentType ?? "PERMANENT"}
            required
            className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          >
            <option value="PERMANENT">Permanent</option>
            <option value="CONTRACTOR">Contractor</option>
            <option value="TEMPORARY">Temporary</option>
            <option value="INTERN">Intern</option>
          </select>
        </Field>

        <Field label="Worker Category">
          <select
            name="workerCategory"
            defaultValue={employee?.workerCategory ?? ""}
            className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          >
            <option value="">Select</option>
            <option value="STAFF">Staff</option>
            <option value="WORKER">Worker</option>
            <option value="ENGINEER">Engineer</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="MANAGER">Manager</option>
            <option value="EXECUTIVE">Executive</option>
          </select>
        </Field>

        <Field label="Department">
          <input
            name="department"
            defaultValue={employee?.department ?? ""}
            className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          />
        </Field>

        <Field label="Position">
          <input
            name="position"
            defaultValue={employee?.position ?? ""}
            className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          />
        </Field>

        <Field label="Location">
          <input
            name="location"
            defaultValue={employee?.location ?? ""}
            className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          />
        </Field>

        <Field label="Status">
          <select
            name="isActive"
            defaultValue={employee?.isActive === false ? "false" : "true"}
            className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </Field>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-500/20 px-5 py-2 text-sm text-blue-300 transition hover:bg-blue-500/30 disabled:opacity-50"
        >
          {loading
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
            ? "Create Employee"
            : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-wide text-white/45">
        {label}
      </div>
      {children}
    </div>
  );
}