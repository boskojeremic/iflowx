import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return membership ?? null;
}

async function updateMeasurementPoint(formData: FormData) {
  "use server";

  const ctx = await getCurrentTenantContext();
  if (!ctx) redirect("/master-data/measurement-points?tab=registry");

  const id = String(formData.get("id") || "").trim();
  const tagNo = String(formData.get("tagNo") || "").trim();
  const descEn = String(formData.get("descEn") || "").trim() || null;
  const descRu = String(formData.get("descRu") || "").trim() || null;
  const facilityId = String(formData.get("facilityId") || "").trim() || null;
  const assetId = String(formData.get("assetId") || "").trim() || null;
  const mpSourceId = Number(formData.get("mpSourceId") || 0);
  const measurementUnitId = String(formData.get("measurementUnitId") || "").trim();
  const mpDataTypeId = String(formData.get("mpDataTypeId") || "").trim();
  const measurementVariableId = String(formData.get("measurementVariableId") || "").trim();
  const mpTagTypeId = String(formData.get("mpTagTypeId") || "").trim();
  const signalType = String(formData.get("signalType") || "").trim() || null;
  const sourceTag = String(formData.get("sourceTag") || "").trim() || null;
  const isActive = String(formData.get("isActive") || "") === "on";

  if (!id || !tagNo || !mpSourceId) {
    redirect("/master-data/measurement-points?tab=registry");
  }

  const existing = await db.measurementPoint.findUnique({
    where: { id },
    select: {
      id: true,
      tenantId: true,
    },
  });

  if (!existing || existing.tenantId !== ctx.tenantId) {
    redirect("/master-data/measurement-points?tab=registry");
  }

  await db.measurementPoint.update({
    where: { id },
    data: {
      facilityId,
      assetId,
      updatedBy: ctx.user.email || "system",
      tagNo,
      mpSourceId,
      descEn,
      descRu,
      signalType,
      sourceTag,
      measurementUnitId: measurementUnitId ? Number(measurementUnitId) : null,
      mpDataTypeId: mpDataTypeId ? Number(mpDataTypeId) : null,
      measurementVariableId: measurementVariableId ? Number(measurementVariableId) : null,
      mpTagTypeId: mpTagTypeId ? Number(mpTagTypeId) : null,
      isActive,
    },
  });

  revalidatePath("/master-data/measurement-points?tab=registry");
  redirect("/master-data/measurement-points?tab=registry");
}

export default async function EditMeasurementPointPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentTenantContext();

  if (!ctx) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
        No active tenant found for current user.
      </div>
    );
  }

  const { id: rawId } = await params;
  const id = decodeURIComponent(String(rawId || "")).trim();

  const mp = id
    ? await db.measurementPoint.findUnique({
        where: { id },
        select: {
          id: true,
          tenantId: true,
          tagNo: true,
          descEn: true,
          descRu: true,
          facilityId: true,
          assetId: true,
          mpSourceId: true,
          measurementUnitId: true,
          mpDataTypeId: true,
          measurementVariableId: true,
          mpTagTypeId: true,
          signalType: true,
          sourceTag: true,
          isActive: true,
        },
      })
    : null;

  if (!mp) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
          Measurement point not found. Requested id: {id || "EMPTY"}
        </div>

        <Link
          href="/master-data/measurement-points?tab=registry"
          className="inline-flex rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm hover:bg-white/[0.06]"
        >
          Back
        </Link>
      </div>
    );
  }

  if (mp.tenantId !== ctx.tenantId) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
          Measurement point belongs to another tenant. Requested id: {id}
        </div>

        <Link
          href="/master-data/measurement-points?tab=registry"
          className="inline-flex rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm hover:bg-white/[0.06]"
        >
          Back
        </Link>
      </div>
    );
  }

  const [facilities, assets, mpSources, units, dataTypes, variables, tagTypes] =
    await Promise.all([
      db.facility.findMany({
        where: { tenantId: ctx.tenantId, isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: [{ name: "asc" }],
      }),
      db.asset.findMany({
        where: { tenantId: ctx.tenantId },
        select: { id: true, code: true, name: true },
        orderBy: [{ name: "asc" }],
      }),
      db.mpSource.findMany({
        orderBy: [{ sourceName: "asc" }],
      }),
      db.measurementUnit.findMany({
        orderBy: [{ unitTitle: "asc" }],
      }),
      db.mpDataType.findMany({
        orderBy: [{ dataTypeName: "asc" }],
      }),
      db.measurementVariable.findMany({
        orderBy: [{ variableName: "asc" }],
      }),
      db.mpTagType.findMany({
        orderBy: [{ tagTypeName: "asc" }],
      }),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Measurement Point</h1>
          <p className="mt-1 text-sm text-white/60">
            Update Registered Measurement Point
          </p>
        </div>

        <Link
          href="/master-data/measurement-points?tab=registry"
          className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm hover:bg-white/[0.06]"
        >
          Back
        </Link>
      </div>

      <form action={updateMeasurementPoint} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <input type="hidden" name="id" value={mp.id} />

        <div className="mb-4 text-xs uppercase tracking-wider text-white/40">
          Measurement Point Data
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
              Tag No *
            </label>
            <input
              name="tagNo"
              defaultValue={mp.tagNo}
              required
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
              MP Source *
            </label>
            <select
              name="mpSourceId"
              defaultValue={String(mp.mpSourceId)}
              required
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            >
              <option value="">Select Source</option>
              {mpSources.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.sourceName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
              Description EN
            </label>
            <input
              name="descEn"
              defaultValue={mp.descEn ?? ""}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
              Description RU
            </label>
            <input
              name="descRu"
              defaultValue={mp.descRu ?? ""}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
              Facility
            </label>
            <select
              name="facilityId"
              defaultValue={mp.facilityId ?? ""}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            >
              <option value="">No Facility</option>
              {facilities.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
              Asset
            </label>
            <select
              name="assetId"
              defaultValue={mp.assetId ?? ""}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            >
              <option value="">No Asset</option>
              {assets.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
              Measurement Unit
            </label>
            <select
              name="measurementUnitId"
              defaultValue={mp.measurementUnitId ? String(mp.measurementUnitId) : ""}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            >
              <option value="">Select Unit</option>
              {units.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.unitTitle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
              Data Type
            </label>
            <select
              name="mpDataTypeId"
              defaultValue={mp.mpDataTypeId ? String(mp.mpDataTypeId) : ""}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            >
              <option value="">Select Data Type</option>
              {dataTypes.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.dataTypeName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
              Measurement Variable
            </label>
            <select
              name="measurementVariableId"
              defaultValue={mp.measurementVariableId ? String(mp.measurementVariableId) : ""}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            >
              <option value="">Select Variable</option>
              {variables.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.variableName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
              MP Tag Type
            </label>
            <select
              name="mpTagTypeId"
              defaultValue={mp.mpTagTypeId ? String(mp.mpTagTypeId) : ""}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            >
              <option value="">Select Tag Type</option>
              {tagTypes.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.tagTypeName ?? "—"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
              Signal Type
            </label>
            <input
              name="signalType"
              defaultValue={mp.signalType ?? ""}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
              Source Tag
            </label>
            <input
              name="sourceTag"
              defaultValue={mp.sourceTag ?? ""}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
            />
          </div>

          <div className="flex items-center gap-3 pt-7">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              defaultChecked={mp.isActive}
              className="h-4 w-4"
            />
            <label htmlFor="isActive" className="text-sm text-white/80">
              Active
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="rounded-xl border border-blue-500/30 bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500"
          >
            Update Measurement Point
          </button>
        </div>
      </form>
    </div>
  );
}