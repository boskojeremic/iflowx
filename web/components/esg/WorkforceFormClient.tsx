"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type FieldType =
  | "TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "PERCENT"
  | "BOOLEAN"
  | "DATE"
  | "DATETIME"
  | "ENUM"
  | "JSON";

type Section = {
  sectionCode: string;
  fields: Array<{
    id: string;
    code: string;
    label: string;
    sectionCode: string | null;
    fieldType: FieldType;
    unit: string | null;
    placeholder: string | null;
    helpText: string | null;
    enumOptions: unknown;
    sortOrder: number;
    isRequired: boolean;
    value: string;
  }>;
};

type Props = {
  snapshotId: string;
  canEdit: boolean;
  sections: Section[];
};

export default function WorkforceFormClient({
  snapshotId,
  canEdit,
  sections,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const initialValues = useMemo(() => {
    const obj: Record<string, string> = {};
    for (const section of sections) {
      for (const field of section.fields) {
        obj[field.code] = field.value ?? "";
      }
    }
    return obj;
  }, [sections]);

  const [values, setValues] = useState<Record<string, string>>(initialValues);

  function setFieldValue(code: string, value: string) {
    setValues((prev) => ({
      ...prev,
      [code]: value,
    }));
  }

  async function handleSave() {
    if (!canEdit || !snapshotId || loading) return;

    try {
      setLoading(true);

      const fields = Object.entries(values).map(([fieldCode, value]) => ({
        fieldCode,
        value,
      }));

      const res = await fetch("/api/esg/workforce/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snapshotId,
          fields,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save workforce values.");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to save workforce values.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canEdit || !snapshotId || loading}
          className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-sm text-white/50">
          No template fields configured for this report.
        </div>
      ) : (
        sections.map((section) => (
          <div
            key={section.sectionCode}
            className="rounded-xl border border-white/10 bg-black/20 p-4"
          >
            <div className="text-sm font-semibold uppercase tracking-wide text-white/60">
              {section.sectionCode.replaceAll("_", " ")}
            </div>

            <div className="mt-4 grid gap-4">
              {section.fields.map((field) => (
                <div key={field.id} className="grid gap-1">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-white/85">
                      {field.label}
                    </label>
                    {field.isRequired ? (
                      <span className="text-xs text-amber-300">*</span>
                    ) : null}
                    {field.unit ? (
                      <span className="text-xs text-white/45">[{field.unit}]</span>
                    ) : null}
                  </div>

                  {field.helpText ? (
                    <div className="text-xs text-white/40">{field.helpText}</div>
                  ) : null}

                  {field.fieldType === "LONG_TEXT" ? (
                    <textarea
                      value={values[field.code] ?? ""}
                      onChange={(e) => setFieldValue(field.code, e.target.value)}
                      placeholder={field.placeholder ?? ""}
                      disabled={!canEdit}
                      className="min-h-[110px] rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm disabled:opacity-70"
                    />
                  ) : field.fieldType === "BOOLEAN" ? (
                    <select
                      value={values[field.code] ?? ""}
                      onChange={(e) => setFieldValue(field.code, e.target.value)}
                      disabled={!canEdit}
                      className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm disabled:opacity-70"
                    >
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  ) : field.fieldType === "DATE" || field.fieldType === "DATETIME" ? (
                    <input
                      type="date"
                      value={values[field.code] ?? ""}
                      onChange={(e) => setFieldValue(field.code, e.target.value)}
                      disabled={!canEdit}
                      className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm disabled:opacity-70"
                    />
                  ) : field.fieldType === "NUMBER" || field.fieldType === "PERCENT" ? (
                    <input
                      type="number"
                      step="any"
                      value={values[field.code] ?? ""}
                      onChange={(e) => setFieldValue(field.code, e.target.value)}
                      placeholder={field.placeholder ?? ""}
                      disabled={!canEdit}
                      className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm disabled:opacity-70"
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[field.code] ?? ""}
                      onChange={(e) => setFieldValue(field.code, e.target.value)}
                      placeholder={field.placeholder ?? ""}
                      disabled={!canEdit}
                      className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm disabled:opacity-70"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}