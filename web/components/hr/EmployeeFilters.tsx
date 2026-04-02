"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  q: string;
  status: string;
  type: string;
  gender: string;
  category: string;
  location: string;
  locationOptions: string[];
};

export default function EmployeeFilters({
  q,
  status,
  type,
  gender,
  category,
  location,
  locationOptions,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    if (value.trim()) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    router.replace(pathname);
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="grid gap-3 lg:grid-cols-[1.6fr_repeat(5,1fr)_auto]">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/45">
            Search
          </div>

          <form method="GET" action={pathname} className="mt-1">
            <div className="flex gap-2">
              <input type="hidden" name="status" value={status} />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="gender" value={gender} />
              <input type="hidden" name="category" value={category} />
              <input type="hidden" name="location" value={location} />

              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Employee No, name, department, position..."
                className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
              />
            </div>
          </form>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/45">
            Status
          </div>
          <select
            value={status}
            onChange={(e) => updateParam("status", e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/45">
            Type
          </div>
          <select
            value={type}
            onChange={(e) => updateParam("type", e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          >
            <option value="">All</option>
            <option value="PERMANENT">Permanent</option>
            <option value="CONTRACTOR">Contractor</option>
            <option value="TEMPORARY">Temporary</option>
            <option value="INTERN">Intern</option>
          </select>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/45">
            Gender
          </div>
          <select
            value={gender}
            onChange={(e) => updateParam("gender", e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          >
            <option value="">All</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
            <option value="UNDISCLOSED">Undisclosed</option>
          </select>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/45">
            Category
          </div>
          <select
            value={category}
            onChange={(e) => updateParam("category", e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          >
            <option value="">All</option>
            <option value="STAFF">Staff</option>
            <option value="WORKER">Worker</option>
            <option value="ENGINEER">Engineer</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="MANAGER">Manager</option>
            <option value="EXECUTIVE">Executive</option>
          </select>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/45">
            Location
          </div>
          <select
            value={location}
            onChange={(e) => updateParam("location", e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm"
          >
            <option value="">All</option>
            {locationOptions.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={clearAll}
            className="h-11 rounded-md border border-white/10 bg-white/[0.04] px-4 text-sm transition hover:bg-white/10"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}